import { Request, Response } from 'express';
import { pool } from '../db.ts';
import { logger } from '../utils/logger.ts';
import { transformPlantData } from './catalogController.ts';
import { generateAIPlantDescriptions } from '../services/aiService.ts';
import { pexelsService } from '../services/pexelsService.ts';
import { cloudinaryService } from '../services/cloudinaryService.ts';

/**
 * Identifica una planta usando Pl@ntNet API y enriquece con Perenual API
 */
export const identifyPlant = async (req: any, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
    }

    const plantnetKey = process.env.PLANTNET_API_KEY;
    const perenualKey = process.env.PERENUAL_API_KEY;

    if (!plantnetKey || !perenualKey) {
      logger.error('❌ Error: Faltan API Keys (PLANTNET_API_KEY o PERENUAL_API_KEY)');
      return res.status(400).json({ 
        error: 'Faltan las API Keys necesarias en el servidor. Configúralas en los ajustes (Settings).',
        missingKeys: true 
      });
    }

    // --- PASO 1: Identificación con Pl@ntNet ---
    logger.info('--- Iniciando Identificación con Pl@ntNet ---');
    
    const form = new FormData();
    try {
      const blob = new Blob([file.buffer], { type: file.mimetype });
      form.append('organs', 'leaf'); 
      form.append('images', blob, file.originalname);
    } catch (err: any) {
      logger.error({ message: '❌ Error al preparar FormData', error: err.message });
      return res.status(500).json({ error: 'Error al procesar la imagen para el escáner' });
    }

    logger.info(`--- Llamando a Pl@ntNet con Key: ${plantnetKey?.substring(0, 5)}... ---`);
    
    const plantnetRes = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${plantnetKey}`, {
      method: 'POST',
      headers: {
        'User-Agent': 'BloomyApp/1.0 (Plant Identification)',
        'Accept': 'application/json'
      },
      body: form
    });

    if (!plantnetRes.ok) {
      const status = plantnetRes.status;
      const text = await plantnetRes.text();
      logger.error({ message: `❌ Pl@ntNet API Falló [Status ${status}]`, body: text.substring(0, 500) });
      
      let errorMessage = 'Error al identificar la planta con Pl@ntNet';
      try {
        const errorData = JSON.parse(text);
        if (errorData.message) errorMessage += `: ${errorData.message}`;
      } catch (e) {
        // No es JSON, probablemente HTML de error
      }
      
      // Si es 403, devolvemos 400 (Bad Request/Configuration) para evitar que el proxy 
      // de la plataforma sobreescriba nuestro JSON con una página HTML de 403 Genérica.
      const clientStatus = status === 403 ? 400 : status;
      return res.status(clientStatus).json({ 
        error: errorMessage,
        externalStatus: status,
        isAuthError: status === 403
      });
    }

    const plantnetData = await plantnetRes.json();
    const matches = plantnetData.results || [];

    if (matches.length === 0 || matches[0].score < 0.1) {
      return res.status(404).json({ error: 'No se pudo identificar la planta con suficiente confianza. Intenta con una foto más clara.' });
    }

    // Tomar resultados: 3 para todos
    const maxResults = 3;
    const finalResults = [];

    for (const match of matches) {
      if (finalResults.length >= maxResults) break;

      const species = match.species || {};
      const scientificName = species.scientificNameWithoutAuthor || species.scientificName || 'Unknown Species';
      const commonName = (species.commonNames && species.commonNames.length > 0) ? species.commonNames[0] : scientificName;

      // Extraer imágenes de Pl@ntNet
      const plantnetImages = match.images?.map((img: any) => {
        if (img.url) {
          if (typeof img.url === 'object') return img.url.o || img.url.m || img.url.s;
          return img.url;
        }
        return null;
      }).filter(Boolean) || [];

      // --- PASO 2: Enriquecimiento con Perenual API ---
      logger.info(`--- Enriqueciendo datos para: ${scientificName} ---`);
      
      let enrichedData: any = null;
      try {
        const perenualRes = await fetch(`https://perenual.com/api/species-list?key=${perenualKey}&q=${encodeURIComponent(scientificName)}`, {
          headers: { 'User-Agent': 'BloomyApp/1.0' }
        });

        if (perenualRes.status === 429) {
          logger.warn(`Rate limit Perenual excedido al identificar ${scientificName}.`);
        } else if (perenualRes.ok) {
          const perenualData = await perenualRes.json();
          if (perenualData.data && perenualData.data.length > 0) {
            // Intentar buscar coincidencia exacta
            enrichedData = perenualData.data.find((p: any) => 
               p.scientific_name?.some((sn: string) => sn.toLowerCase().includes(scientificName.toLowerCase()))
            ) || perenualData.data[0];
          }
        }
      } catch (err) {
        logger.error({ message: `Error al consultar Perenual API para ${scientificName}`, error: err });
      }

      // --- PASO 3: Fallback de Imagen con Pexels ---
      let finalImageUrl = (enrichedData?.default_image?.original_url && !enrichedData.default_image.original_url.includes('upgrade_available')) 
        ? enrichedData.default_image.original_url 
        : (plantnetImages.length > 0 ? plantnetImages[0] : null);

      if (!finalImageUrl) {
        logger.info(`--- Buscando imagen de fallback en Pexels para: ${commonName} ---`);
        finalImageUrl = await pexelsService.getPlantImage(commonName);
      }

      finalResults.push({
        scientificName: scientificName,
        commonNames: species.commonNames || [commonName],
        family: species.family?.scientificNameWithoutAuthor || 'Desconocida',
        genus: species.genus?.scientificNameWithoutAuthor || 'Desconocido',
        score: match.score,
        images: finalImageUrl ? [finalImageUrl, ...plantnetImages] : plantnetImages,
        external_id: enrichedData?.id || null,
        perenualInfo: enrichedData || {
          id: null,
          common_name: commonName,
          watering: 'Average',
          sunlight: ['Full sun'],
          default_image: { original_url: finalImageUrl }
        }
      });
    }

    if (finalResults.length === 0) {
      return res.status(404).json({ error: 'No se encontraron coincidencias con imágenes disponibles. Intenta con otra foto.' });
    }

    logger.info(`--- Identificación completada. Enviando ${finalResults.length} resultados. ---`);
    res.json(finalResults);

  } catch (error) {
    logger.error({ message: 'Error crítico en identificación', error });
    // Usamos 400 para evitar que el proxy de la plataforma intercepte el error 500 con un HTML
    res.status(400).json({ error: 'Ocurrió un error interno al procesar la identificación' });
  }
};

/**
 * Guarda una planta identificada en el catálogo y opcionalmente en el jardín del usuario
 */
export const saveIdentifiedPlant = async (req: Request, res: Response) => {
  const { 
    result,
    saveToGarden 
  } = req.body;
  
  if (!result) {
    return res.status(400).json({ error: 'Faltan los datos de la planta' });
  }

  const {
    scientificName: nombre_cientifico,
    family: familia,
    genus: genero,
    external_id,
    images,
    perenualInfo
  } = result;

  const nombre_comun = perenualInfo?.common_name || result.commonNames?.[0] || nombre_cientifico;
  const nombreFinal = nombre_comun.charAt(0).toUpperCase() + nombre_comun.slice(1);
  const { tipo, luz, riego, dificultad, descripcion: rawDesc } = transformPlantData(perenualInfo || {});
  
  // Generar descripción con IA si es posible
  let descripcion = rawDesc;
  let descripcion_corta = '';
  
  try {
    const aiData = await generateAIPlantDescriptions({
      nombre: nombreFinal,
      tipo,
      luz,
      riego,
      dificultad
    });
    descripcion = aiData.descripcion_larga || descripcion;
    descripcion_corta = aiData.descripcion_corta || '';
  } catch (err) {
    logger.error({ message: 'Error al generar descripción IA en guardado', error: err });
  }

    // Prioridad de imagen: Perenual (si es válida) -> Pl@ntNet -> Pexels (si no hay nada)
    let imagen_url = null;
    const perenualImg = perenualInfo?.default_image?.original_url;
    
    if (perenualImg && !perenualImg.includes('upgrade_available') && !perenualImg.includes('placeholder')) {
      imagen_url = perenualImg;
    } else if (images && images.length > 0) {
      imagen_url = images[0];
    }

    if (!imagen_url) {
      imagen_url = await pexelsService.getPlantImage(nombreFinal);
    }

    // MANDATORY: Upload to Cloudinary to ensure persistence and optimization
    let secureImageUrl = imagen_url;
    if (imagen_url && !imagen_url.includes('cloudinary.com')) {
      try {
        const cloudinaryUrl = await cloudinaryService.uploadImage(imagen_url, 'bloomy/identified_plants');
        if (cloudinaryUrl) {
          secureImageUrl = cloudinaryUrl;
        }
      } catch (err) {
        logger.error({ message: 'Error uploading identified plant image to Cloudinary', error: err });
      }
    }

    const userId = (req as any).user?.id;
    const perenualKey = process.env.PERENUAL_API_KEY;

    try {
      // Intentamos insertar o actualizar. 
      // Se prefiere ON CONFLICT (nombre_cientifico) para evitar duplicados de la misma especie
      const catalogRes = await pool.query(
        `INSERT INTO plants_catalog 
         (external_id, nombre, nombre_cientifico, familia, genero, descripcion, descripcion_corta, luz, riego, imagen_url, tipo, dificultad, ai_processed, image_validated, image_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true, $13)
         ON CONFLICT (nombre_cientifico) DO UPDATE SET
           external_id = COALESCE(plants_catalog.external_id, EXCLUDED.external_id),
           nombre = COALESCE(plants_catalog.nombre, EXCLUDED.nombre),
           familia = COALESCE(plants_catalog.familia, EXCLUDED.familia),
           genero = COALESCE(plants_catalog.genero, EXCLUDED.genero),
           descripcion = COALESCE(plants_catalog.descripcion, EXCLUDED.descripcion),
           descripcion_corta = COALESCE(plants_catalog.descripcion_corta, EXCLUDED.descripcion_corta),
           imagen_url = COALESCE(plants_catalog.imagen_url, EXCLUDED.imagen_url),
           tipo = COALESCE(plants_catalog.tipo, EXCLUDED.tipo),
           dificultad = COALESCE(plants_catalog.dificultad, EXCLUDED.dificultad),
           luz = COALESCE(plants_catalog.luz, EXCLUDED.luz),
           riego = COALESCE(plants_catalog.riego, EXCLUDED.riego),
           image_validated = true,
           ai_processed = true
         RETURNING id, imagen_url`,
        [external_id, nombreFinal, nombre_cientifico, familia, genero, descripcion, descripcion_corta, luz, riego, secureImageUrl, tipo, dificultad, perenualKey ? 'perenual' : 'plantnet']
      );

      const plantId = catalogRes.rows[0].id;
      const finalImageUrl = catalogRes.rows[0].imagen_url;

      if (saveToGarden && userId) {
        // Calcular frecuencias por defecto
        let waterDays = 7;
        if (riego === 'alto') waterDays = 3;
        if (riego === 'bajo') waterDays = 15;

        const userPlantRes = await pool.query(
          `INSERT INTO user_plants (user_id, plant_id, frecuencia_riego_dias, frecuencia_fertilizacion_dias, ultima_fecha_riego, ultima_fertilizacion, fecha_agregado) 
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           ON CONFLICT (user_id, plant_id) DO UPDATE SET 
             frecuencia_riego_dias = EXCLUDED.frecuencia_riego_dias,
             ultima_fecha_riego = COALESCE(user_plants.ultima_fecha_riego, EXCLUDED.ultima_fecha_riego)
           RETURNING id`,
          [userId, plantId, waterDays, 30]
        );
        
        logger.info(`[Identify] Planta vinculada a usuario: ID Relación ${userPlantRes.rows[0].id}`);
        
        // Log inicial
        await pool.query(
          'INSERT INTO plant_logs (user_plant_id, tipo_evento, nota) VALUES ($1, $2, $3), ($1, $4, $5)',
          [userPlantRes.rows[0].id, 'riego', 'Añadida al jardín vía escáner', 'fertilizante', 'Añadida al jardín vía escáner']
        );
      }

      res.json({ success: true, plantId, imagen_url: finalImageUrl });

  } catch (error) {
    logger.error({ message: 'Error al guardar planta identificada', error });
    // Usamos 400 para evitar que el proxy intercepte con HTML
    res.status(400).json({ error: 'Error al persistir la planta identificada' });
  }
};

/**
 * Escaneo rápido: Identifica, vincula al catálogo y guarda en el jardín en un solo paso.
 * Útil para apps que no requieren confirmación del usuario.
 */
export const scanPlant = async (req: any, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No se proporcionó imagen' });

    const plantnetKey = process.env.PLANTNET_API_KEY;
    if (!plantnetKey) return res.status(500).json({ error: 'Configuración de API incompleta' });

    // 1. Identificar (Tomamos el mejor resultado)
    const form = new FormData();
    const blob = new Blob([file.buffer], { type: file.mimetype });
    form.append('organs', 'leaf');
    form.append('images', blob, file.originalname);

    const plantnetRes = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${plantnetKey}`, {
      method: 'POST',
      body: form
    });

    if (!plantnetRes.ok) throw new Error('Fallo en identificación remota');

    const data = await plantnetRes.json();
    const bestMatch = data.results?.[0];

    if (!bestMatch || bestMatch.score < 0.1) {
      return res.status(404).json({ error: 'No se pudo identificar la planta con seguridad' });
    }

    // 2. Normalizar y preparar "result" para saveIdentifiedPlant logic
    const species = bestMatch.species || {};
    const scientificName = species.scientificNameWithoutAuthor || species.scientificName;
    
    // Llamamos internamente a la lógica de guardado
    // Simulamos req.body
    const mockReq = {
      body: {
        result: {
          scientificName,
          family: species.family?.scientificNameWithoutAuthor,
          genus: species.genus?.scientificNameWithoutAuthor,
          commonNames: species.commonNames,
          images: bestMatch.images?.map((i: any) => i.url?.o || i.url).filter(Boolean) || [],
          score: bestMatch.score
        },
        saveToGarden: true
      },
      user: req.user
    };

    // Usamos una versión interna que no envíe res.json directamente
    // O simplemente llamamos a saveIdentifiedPlant y manejamos la respuesta
    // Pero es mejor refactorizar un poco para reutilizar la lógica de persistencia
    
    await saveIdentifiedPlant(mockReq as any, res);

  } catch (error) {
    logger.error({ message: 'Error en scanPlant rápido', error });
    res.status(400).json({ error: 'Error en el proceso de escaneo rápido' });
  }
};
