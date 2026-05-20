import { Request, Response } from 'express';
import { pool } from '../db.ts';
import { logger } from '../utils/logger';
import { pexelsService } from '../services/pexelsService.ts';
import { cloudinaryService } from '../services/cloudinaryService.ts';

/**
 * Elimina plantas del catálogo local basándose en filtros
 * DELETE /api/admin/delete-plants
 */
export const deleteCatalogPlants = async (req: Request, res: Response) => {
  const { name, keyword } = req.query;

  if (!name && !keyword) {
    return res.status(400).json({ error: 'Se requiere al menos un filtro (nombre o palabra clave) para eliminar.' });
  }

  let query = 'DELETE FROM plants_catalog';
  const conditions: string[] = [];
  const values: any[] = [];

  if (name) {
    values.push(`%${name}%`);
    conditions.push(`nombre ILIKE $${values.length}`);
  }

  if (keyword) {
    values.push(`%${keyword}%`);
    conditions.push(`(nombre ILIKE $${values.length} OR descripcion ILIKE $${values.length} OR nombre_cientifico ILIKE $${values.length})`);
  }

  if (conditions.length === 0) {
    return res.status(400).json({ error: 'Filtros inválidos' });
  }

  query += ' WHERE ' + conditions.join(' AND ');
  query += ' RETURNING id';

  try {
    const result = await pool.query(query, values);
    res.json({
      success: true,
      message: `${result.rowCount || 0} plantas eliminadas del catálogo.`,
      deleted_count: result.rowCount || 0
    });
  } catch (error) {
    logger.error({ message: 'Error al eliminar plantas del catálogo', error });
    res.status(500).json({ error: 'Error interno del servidor al eliminar las plantas.' });
  }
};

/**
 * Lógica de transformación de datos de Perenual API
 * Normaliza valores de tipo, luz, riego y dificultad
 */
export const transformPlantData = (apiData: any) => {
  // 1. TIPO (indoor field)
  // true -> interior, false -> exterior, null -> mixta
  let tipo = "mixta";
  if (apiData.indoor === true) {
    tipo = "interior";
  } else if (apiData.indoor === false) {
    tipo = "exterior";
  }

  // 2. LUZ (sunlight array)
  // full sun -> alta, partial -> media, others -> baja
  const sunlightArr = Array.isArray(apiData.sunlight) ? apiData.sunlight.map((s: string) => s.toLowerCase()) : [];
  const sunlightStr = sunlightArr.join(' ');
  let luz = "baja";
  if (sunlightStr.includes("full sun")) {
    luz = "alta";
  } else if (sunlightStr.includes("partial") || sunlightStr.includes("indirect") || sunlightStr.includes("filtered")) {
    luz = "media";
  }

  // 3. RIEGO (watering field)
  // frequent -> alto, average -> moderado, minimum -> bajo
  const watering = (apiData.watering || "").toLowerCase();
  let riego = "moderado";
  if (watering === "frequent") {
    riego = "alto";
  } else if (watering === "average") {
    riego = "moderado";
  } else if (watering === "minimum" || watering === "none") {
    riego = "bajo";
  }

  // 4. DIFICULTAD (care_level field)
  // High/Hard -> difícil, Medium/Moderate -> media, Low/Easy -> fácil
  let dificultad = "media";
  const careLevel = (apiData.care_level || "").toLowerCase();
  if (careLevel.includes("high") || careLevel.includes("hard")) {
    dificultad = "difícil";
  } else if (careLevel.includes("low") || careLevel.includes("easy")) {
    dificultad = "fácil";
  } else if (careLevel.includes("medium") || careLevel.includes("moderate")) {
    dificultad = "media";
  } else {
    // Estimación si no existe care_level
    if (riego === "alto" && luz === "alta") dificultad = "difícil";
    else if (riego === "bajo") dificultad = "fácil";
  }

  // 5. DESCRIPCIÓN DINÁMICA
  const nombre = apiData.common_name || "Esta planta";
  const luzExplicacion = luz === "alta" ? "iluminación directa" : 
                        luz === "media" ? "iluminación indirecta" : 
                        "poca luz";
  
  const descripcion = `La ${nombre} es una planta de ${tipo} que requiere luz ${luz} y riego ${riego}. Es ideal para espacios con ${luzExplicacion} y tiene una dificultad de cuidado ${dificultad}.`;

  return { tipo, luz, riego, dificultad, descripcion };
};

/**
 * Importa plantas desde Perenual API al catálogo local
 * GET /api/catalog/import-plants
 */
export const importPlants = async (_req: Request, res: Response) => {
  const apiKey = process.env.PERENUAL_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'La API Key de Perenual (PERENUAL_API_KEY) no está configurada en el entorno.' });
  }

  try {
    logger.info('Iniciando importación masiva de plantas...');
    
    let allPlants: any[] = [];
    for (let page = 1; page <= 4; page++) {
      try {
        const response = await fetch(`https://perenual.com/api/species-list?key=${apiKey}&page=${page}`, {
          headers: { 'User-Agent': 'BloomyApp/1.0' }
        });
        
        if (response.status === 429) {
          logger.warn('Rate limit alcanzado en Perenual API (Import). Deteniendo.');
          break;
        }

        if (!response.ok) break;
        const data = await response.json();
        if (data && data.data) {
          allPlants = [...allPlants, ...data.data];
        }
      } catch (err) {
        break;
      }
    }

    if (allPlants.length === 0) {
      return res.status(404).json({ error: 'No se obtuvieron datos de la API externa' });
    }

    let insertadas = 0;
    let actualizadas = 0;

    for (const plant of allPlants) {
      const external_id = plant.id;
      const nombre = plant.common_name || (plant.scientific_name ? plant.scientific_name[0] : 'Planta Desconocida');
      
      // En la lista hay menos datos, pero usamos lo que hay
      // El helper se encargará de los fallbacks
      const { tipo, luz, riego, dificultad, descripcion } = transformPlantData(plant);
      const imagen_url = plant.default_image?.original_url || null;
      const nombre_cientifico = Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : null;

      try {
        const result = await pool.query(
          `INSERT INTO plants_catalog (external_id, nombre, nombre_cientifico, descripcion, tipo, dificultad, luz, riego, imagen_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (external_id) DO UPDATE SET
             nombre_cientifico = COALESCE(EXCLUDED.nombre_cientifico, plants_catalog.nombre_cientifico),
             descripcion = EXCLUDED.descripcion,
             tipo = EXCLUDED.tipo,
             dificultad = EXCLUDED.dificultad,
             luz = EXCLUDED.luz,
             riego = EXCLUDED.riego,
             imagen_url = COALESCE(plants_catalog.imagen_url, EXCLUDED.imagen_url)
           RETURNING id`,
          [external_id, nombre, nombre_cientifico, descripcion, tipo, dificultad, luz, riego, imagen_url]
        );

        if (result.rows.length > 0) insertadas++;
        else actualizadas++;
      } catch (err) {
        logger.error({ message: `Error procesando planta ${nombre}`, error: err });
      }
    }

    res.json({ total: allPlants.length, insertadas, actualizadas });
  } catch (error) {
    logger.error({ message: 'Error crítico en importación', error });
    res.status(500).json({ error: 'Fallo al procesar la importación.' });
  }
};

/**
 * Actualiza los datos de las plantas existentes usando el Details endpoint de Perenual
 * GET /api/catalog/refresh-plants
 */
export const refreshPlants = async (_req: Request, res: Response) => {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key no configurada' });

  try {
    // 1. Obtener plantas con external_id
    const catalogRes = await pool.query('SELECT id, external_id, nombre FROM plants_catalog WHERE external_id IS NOT NULL');
    const plants = catalogRes.rows;

    logger.info(`Refrescando datos para ${plants.length} plantas...`);
    
    let actualizadas = 0;
    let errores = 0;

    // Procesar secuencialmente
    for (const p of plants) {
      try {
        const response = await fetch(`https://perenual.com/api/species/details/${p.external_id}?key=${apiKey}`);
        
        if (response.status === 429) {
          logger.warn('Rate limit alcanzado en Perenual API. Deteniendo proceso temprano.');
          break;
        }

        if (!response.ok) {
          logger.error(`Error al refrescar planta ${p.nombre} (ID: ${p.external_id}): ${response.statusText}`);
          errores++;
          continue;
        }

        const details = await response.json();
        const { tipo, luz, riego, dificultad, descripcion } = transformPlantData(details);
        const scientificName = Array.isArray(details.scientific_name) ? details.scientific_name[0] : (details.scientific_name || null);

        await pool.query(
          `UPDATE plants_catalog 
           SET tipo = $1, luz = $2, riego = $3, dificultad = $4, descripcion = $5, nombre_cientifico = $6
           WHERE id = $7`,
          [tipo, luz, riego, dificultad, descripcion, scientificName, p.id]
        );

        actualizadas++;
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        logger.error({ message: `Fallo en planta ${p.nombre}`, error: err });
        errores++;
      }
    }

    res.json({
      total_procesadas: plants.length,
      actualizadas_exitosamente: actualizadas,
      errores: errores
    });
  } catch (error) {
    logger.error({ message: 'Error al refrescar catálogo', error });
    res.status(500).json({ error: 'Error interno al refrescar plantas' });
  }
};

/**
 * Obtiene candidatos de plantas sin guardarlos (para procesamiento en frontend con AI)
 * GET /api/catalog/fetch-external-candidates?keywords=apple,berry
 */
export const fetchExternalCandidates = async (req: Request, res: Response) => {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key no configurada' });

  const queryKeywords = req.query.keywords as string;
  const fruitKeywords = ['fruit', 'berry', 'citrus', 'apple', 'mango', 'banana', 'orange', 'lemon', 'grape', 'cherry', 'pear', 'peach', 'plum'];
  
  const keywordsToUse = queryKeywords 
    ? queryKeywords.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0)
    : fruitKeywords;

  try {
    let candidates: any[] = [];
    const maxCandidates = 50;
    
    for (let page = 1; page <= 40; page++) {
      if (candidates.length >= maxCandidates) break;

      const response = await fetch(`https://perenual.com/api/species-list?key=${apiKey}&page=${page}`, {
        headers: { 'User-Agent': 'BloomyApp/1.0' }
      });

      if (response.status === 429) {
        logger.warn('Rate limit alcanzado en Perenual API (Candidates). Deteniendo.');
        break;
      }

      if (!response.ok) break;
      
      const data = await response.json();
      const apiPlants = data.data || [];

      for (const plant of apiPlants) {
        if (candidates.length >= maxCandidates) break;

        const commonName = (plant.common_name || "").toLowerCase();
        const scientificNames = (plant.scientific_name || []).map((s: string) => s.toLowerCase());
        
        const matchesKeywords = keywordsToUse.some(kw => 
          commonName.includes(kw) || scientificNames.some((sn: string) => sn.includes(kw))
        );

        if (!matchesKeywords) continue;

        // Verificar si ya existe para marcarlo como "existente"
        const checkRes = await pool.query('SELECT id FROM plants_catalog WHERE external_id = $1', [plant.id]);
        
        const { tipo, luz, riego, dificultad } = transformPlantData(plant);
        
        candidates.push({
          external_id: plant.id,
          nombre: plant.common_name,
          nombre_cientifico: Array.isArray(plant.scientific_name) ? plant.scientific_name[0] : null,
          tipo,
          luz,
          riego,
          dificultad,
          imagen_url: plant.default_image?.original_url || null,
          exists: checkRes.rows.length > 0
        });
      }
    }

    res.json({ candidates, keywords: keywordsToUse });
  } catch (error) {
    logger.error({ message: 'Error fetching candidates', error });
    res.status(500).json({ error: 'Fallo al obtener candidatos.' });
  }
};

/**
 * Inserta o actualiza un lote de plantas enriquecidas
 * POST /api/catalog/batch-import
 */
export const batchImportPlants = async (req: Request, res: Response) => {
  const { plants } = req.body;

  if (!Array.isArray(plants)) {
    return res.status(400).json({ error: 'Se requiere un array de plantas' });
  }

  try {
    let insertadas = 0;
    let actualizadas = 0;

    for (const plant of plants) {
      try {
        const result = await pool.query(
          `INSERT INTO plants_catalog 
           (external_id, nombre, nombre_cientifico, descripcion, descripcion_corta, tipo, dificultad, luz, riego, imagen_url, ai_processed) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (external_id) DO UPDATE SET
             nombre = EXCLUDED.nombre,
             nombre_cientifico = COALESCE(EXCLUDED.nombre_cientifico, plants_catalog.nombre_cientifico),
             descripcion = EXCLUDED.descripcion,
             descripcion_corta = EXCLUDED.descripcion_corta,
             tipo = EXCLUDED.tipo,
             dificultad = EXCLUDED.dificultad,
             luz = EXCLUDED.luz,
             riego = EXCLUDED.riego,
             imagen_url = COALESCE(plants_catalog.imagen_url, EXCLUDED.imagen_url),
             ai_processed = COALESCE(EXCLUDED.ai_processed, plants_catalog.ai_processed)
           RETURNING (xmax = 0) AS inserted`,
          [
            plant.external_id, 
            plant.nombre, 
            plant.nombre_cientifico, 
            plant.descripcion, 
            plant.descripcion_corta,
            plant.tipo, 
            plant.dificultad, 
            plant.luz, 
            plant.riego, 
            plant.imagen_url,
            plant.ai_processed || false
          ]
        );

        if (result.rows[0].inserted) insertadas++;
        else actualizadas++;
      } catch (err) {
        logger.error({ message: 'Error en batch insert', error: err });
      }
    }

    res.json({ total: plants.length, insertadas, actualizadas });
  } catch (error) {
    logger.error({ message: 'Error en batch import', error });
    res.status(500).json({ error: 'Error al procesar el lote.' });
  }
};

/**
 * Obtiene todas las plantas del catálogo con soporte para filtros
 * Query params: name, tipo, dificultad
 */
export const getCatalog = async (req: Request, res: Response) => {
  const { name, search, tipo, dificultad } = req.query;
  const searchTerm = (search || name) as string;
  
  let query = 'SELECT * FROM plants_catalog';
  const conditions: string[] = [];
  const values: any[] = [];

  // Filtro por nombre o búsqueda flexible
  if (searchTerm) {
    values.push(`%${searchTerm}%`);
    conditions.push(`(nombre ILIKE $${values.length} OR nombre_cientifico ILIKE $${values.length} OR descripcion ILIKE $${values.length})`);
  }

  // Filtro por tipo (interior/exterior)
  if (tipo && tipo !== 'Todos') {
    values.push(tipo);
    conditions.push(`tipo ILIKE $${values.length}`);
  }

  // Filtro por dificultad (fácil, media, difícil)
  if (dificultad && dificultad !== 'Todos' && dificultad !== 'all') {
    values.push(dificultad);
    conditions.push(`dificultad ILIKE $${values.length}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY ai_processed DESC, nombre ASC';

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    logger.error({ message: 'Error al obtener el catálogo con filtros', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene el detalle de una planta del catálogo
 */
export const getCatalogPlantById = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const result = await pool.query('SELECT * FROM plants_catalog WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Planta no encontrada en el catálogo' });
    }
    
    let plant = result.rows[0];
    
    // Si el usuario está autenticado, verificar si tiene esta planta en su jardín
    if (userId) {
      const userPlantRes = await pool.query(
        `SELECT id, ultima_fecha_riego, ultima_fertilizacion, frecuencia_riego_dias, frecuencia_fertilizacion_dias, fecha_agregado, nombre_personalizado 
         FROM user_plants WHERE user_id = $1 AND plant_id = $2`,
        [userId, id]
      );
      
      if (userPlantRes.rows.length > 0) {
        const up = userPlantRes.rows[0];
        // Calcular estado similar a getUserPlants
        const today = new Date();
        const baseDate = up.ultima_fecha_riego ? new Date(up.ultima_fecha_riego) : new Date(up.fecha_agregado);
        const nextWatering = new Date(baseDate);
        nextWatering.setDate(baseDate.getDate() + (up.frecuencia_riego_dias || 7));
        
        const baseFertilize = up.ultima_fertilizacion ? new Date(up.ultima_fertilizacion) : new Date(up.fecha_agregado);
        const nextFertilize = new Date(baseFertilize);
        nextFertilize.setDate(baseFertilize.getDate() + (up.frecuencia_fertilizacion_dias || 30));

        let status = 'Saludable';
        const daysDiff = Math.floor((today.getTime() - nextWatering.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 2) status = 'Atención urgente';
        else if (daysDiff >= 0) status = 'Necesita agua';

        plant = {
          ...plant,
          user_plant_id: up.id,
          nombre_personalizado: up.nombre_personalizado,
          ultima_fecha_riego: up.ultima_fecha_riego,
          ultima_fertilizacion: up.ultima_fertilizacion,
          frecuencia_riego_dias: up.frecuencia_riego_dias,
          frecuencia_fertilizacion_dias: up.frecuencia_fertilizacion_dias,
          next_watering: nextWatering,
          next_fertilizing: nextFertilize,
          status
        };
      }
    }
    
    // Dynamic Fallback: if image is missing, try Pexels in realtime (will be cached)
    if (!plant.imagen_url) {
      const pexelsUrl = await pexelsService.getPlantImage(plant.nombre);
      if (pexelsUrl) {
        plant.imagen_url = pexelsUrl;
        // Optionally update DB to persist this result
        await pool.query('UPDATE plants_catalog SET imagen_url = $1 WHERE id = $2', [pexelsUrl, plant.id]);
      }
    }
    
    res.json(plant);
  } catch (error) {
    logger.error({ message: 'Error al obtener planta del catálogo', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * FIX EXPIRED IMAGES: Detecta y reemplaza imágenes inválidas, temporales o rotas.
 * Sube los resultados a Cloudinary para persistencia.
 * GET /api/catalog/fix-expired-images
 */
export const fixExpiredImages = async (_req: Request, res: Response) => {
  try {
    logger.info('🌿 [Admin] Iniciando reparación profunda de imágenes...');
    
    // 1. Obtener todas las plantas para revisar
    const result = await pool.query('SELECT id, nombre, imagen_url FROM plants_catalog');
    const plants = result.rows;
    
    let actualizadas = 0;
    let omitidas = 0;
    let fallidas = 0;
    const usedUrls = new Set<string>();
    
      // REJECT_KEYWORDS removed as it was unused

    for (let i = 0; i < plants.length; i++) {
      const plant = plants[i];
      const url = (plant.imagen_url || "").toLowerCase();
      
      // Criterios de invalidez
      const isInvalid = !url || 
                        url === "" || 
                        url.includes('wasabisys') || 
                        url.includes('x-amz-') || 
                        url.includes('fallback') ||
                        url.includes('placeholder') ||
                        usedUrls.has(url);

      if (!isInvalid) {
        omitUrls(url, usedUrls);
        omitidas++;
        continue;
      }

      logger.info(`🔄 (${i + 1}/${plants.length}) Procesando: ${plant.nombre}`);
      
      try {
        // A. Buscar en Pexels
        let newImageUrl = await pexelsService.getPlantImage(plant.nombre);
        
        // B. Si no hay imagen, intentar con palabras clave genéricas
        if (!newImageUrl) {
          logger.info(`[FixImages] Sin resultados para ${plant.nombre}, intentando genérico...`);
          newImageUrl = await pexelsService.getPlantImage('indoor plant');
        }

        if (newImageUrl) {
          // C. Subir a Cloudinary (Incluso si no es de Pexels, si tuviéramos una URL externa válida pero no persistente)
          const cloudinaryUrl = await cloudinaryService.uploadImage(newImageUrl, 'bloomy/plants');
          
          if (cloudinaryUrl) {
            await pool.query('UPDATE plants_catalog SET imagen_url = $1 WHERE id = $2', [cloudinaryUrl, plant.id]);
            usedUrls.add(cloudinaryUrl);
            actualizadas++;
            logger.info(`✅ Imagen arreglada y subida a Cloudinary para: ${plant.nombre}`);
          } else {
            fallidas++;
          }
        } else {
          logger.warn(`⚠️ No se encontró ninguna imagen para: ${plant.nombre}`);
          fallidas++;
        }
        
        // Delay para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err) {
        logger.error({ message: `Error reparando ${plant.nombre}`, error: err });
        fallidas++;
      }
    }

    res.json({
      total: plants.length,
      actualizadas,
      omitidas,
      fallidas
    });

  } catch (error) {
    logger.error({ message: '[FixImages] Error crítico', error });
    res.status(500).json({ error: 'Error interno en el proceso de reparación' });
  }
};

/**
 * Smart Batch Import: Busca y añade plantas basándose en grupos de palabras clave con límites.
 * POST /api/catalog/smart-import
 */
export const smartBatchImport = async (req: Request, res: Response) => {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key no configurada' });

  const { groups, maxTotal = 100 } = req.body;
  // groups: { FLORES: ['rose', ...], FRUTAS: [...] }

  try {
    const allKeywords = Object.values(groups as Record<string, string[]>).flat();
    const uniqueKeywords = Array.from(new Set(allKeywords));
    const limitPerKeyword = Math.floor(maxTotal / uniqueKeywords.length) || 1;

    logger.info(`🚀 Iniciando Smart Import para ${uniqueKeywords.length} palabras clave. Límite: ${maxTotal}`);
    
    let totalImportadas = 0;
    const report: any = {};

    for (const kw of uniqueKeywords) {
      if (totalImportadas >= maxTotal) break;

      try {
        const response = await fetch(`https://perenual.com/api/species-list?key=${apiKey}&q=${encodeURIComponent(kw)}`, {
          headers: { 'User-Agent': 'BloomyApp/1.0' }
        });

        if (response.status === 429) {
          logger.error({ message: 'Rate limit Perenual (Smart Import)', keyword: kw });
          break;
        }

        if (!response.ok) continue;

        const data = await response.json();
        const apiPlants = data.data || [];
        
        let kwImportadas = 0;
        for (const plant of apiPlants) {
          if (kwImportadas >= limitPerKeyword || totalImportadas >= maxTotal) break;

          // Evitar duplicados por external_id
          const check = await pool.query('SELECT id FROM plants_catalog WHERE external_id = $1', [plant.id]);
          if (check.rows.length > 0) continue;

          const { tipo, luz, riego, dificultad, descripcion } = transformPlantData(plant);
          
          await pool.query(
            `INSERT INTO plants_catalog (external_id, nombre, nombre_cientifico, descripcion, tipo, dificultad, luz, riego, imagen_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              plant.id, 
              plant.common_name || plant.scientific_name?.[0] || kw, 
              plant.scientific_name?.[0] || null, 
              descripcion, 
              tipo, 
              dificultad, 
              luz, 
              riego, 
              plant.default_image?.original_url || null
            ]
          );

          kwImportadas++;
          totalImportadas++;
        }
        report[kw] = kwImportadas;

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        logger.error({ message: `Error en keyword ${kw}`, error: err });
      }
    }

    res.json({ success: true, totalImportadas, report });
  } catch (error) {
    logger.error({ message: 'Error en smart import', error });
    res.status(500).json({ error: 'Fallo al procesar smart import' });
  }
};

/**
 * Agrega la URL a las usadas si no es local/cloudinary para evitar duplicidad de orígenes externos
 */
function omitUrls(url: string, usedSet: Set<string>) {
  if (url && !url.includes('res.cloudinary.com')) {
    usedSet.add(url);
  }
}
