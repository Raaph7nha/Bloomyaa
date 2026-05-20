import { Request, Response } from 'express';
import { pool } from '../db.ts';
import { logger } from '../utils/logger';
import { pexelsService } from '../services/pexelsService.ts';
import { cloudinaryService } from '../services/cloudinaryService.ts';
import { generateAIPlantDescriptions } from '../services/aiService.ts';
import { transformPlantData } from './catalogController.ts';

import { importService } from '../services/importService';

/**
 * 1. Importación Inteligente (Rediseñada)
 * POST /api/admin/import-smart
 */
export const importSmart = async (req: Request, res: Response) => {
  const { keywords, maxPerKeyword = 20 } = req.body;

  if (!keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'Keywords deben ser un array de strings' });
  }

  try {
    logger.info({ message: 'Starting smart import workflow', keywords, maxPerKeyword });
    
    // El servicio ahora maneja todo: Perenual -> PlantNet -> Pexels -> Cloudinary -> DB
    const result = await importService.smartImport(keywords, maxPerKeyword);

    res.json(result);
  } catch (error: any) {
    logger.error({ message: 'Critical error in smartImport controller', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 2. Actualizar Catálogo
 * POST /api/admin/refresh-catalog
 */
export const refreshCatalog = async (_req: Request, res: Response) => {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key no configurada' });

  try {
    const plantsRes = await pool.query('SELECT id, external_id, nombre FROM plants_catalog WHERE external_id IS NOT NULL');
    const plants = plantsRes.rows;

    let saved = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const p of plants) {
      try {
        const response = await fetch(`https://perenual.com/api/species/details/${p.external_id}?key=${apiKey}`);
        if (response.status === 429) break;
        if (!response.ok) {
          skipped++;
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

        saved++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err: any) {
        errors.push(`Error refrescando ${p.nombre}: ${err.message}`);
      }
    }

    res.json({ success: true, processed: plants.length, saved, skipped, errors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 3. Reparar Imágenes
 * POST /api/admin/fix-images
 */
export const fixImages = async (_req: Request, res: Response) => {
  try {
    const plantsRes = await pool.query('SELECT id, nombre, imagen_url FROM plants_catalog');
    const plants = plantsRes.rows;

    let saved = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const p of plants) {
      const url = p.imagen_url || "";
      const isBroken = !url || url.includes('wasabisys') || url.includes('x-amz-') || url.includes('fallback');

      if (!isBroken) {
        skipped++;
        continue;
      }

      try {
        let newUrl = await pexelsService.getPlantImage(`${p.nombre} plant`);
        if (newUrl) {
          const cloudinaryUrl = await cloudinaryService.uploadImage(newUrl, 'bloomy/plants');
          if (cloudinaryUrl) {
            await pool.query('UPDATE plants_catalog SET imagen_url = $1 WHERE id = $2', [cloudinaryUrl, p.id]);
            saved++;
          } else {
            errors.push(`Cloudinary falló para ${p.nombre}`);
          }
        } else {
          errors.push(`Pexels no encontró imagen para ${p.nombre}`);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
      } catch (err: any) {
        errors.push(`Error reparando ${p.nombre}: ${err.message}`);
      }
    }

    res.json({ success: true, processed: plants.length, saved, skipped, errors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 4A. Generar todas las descripciones
 */
export const aiRegenerateAll = async (_req: Request, res: Response) => {
  try {
    const plantsRes = await pool.query('SELECT * FROM plants_catalog');
    const plants = plantsRes.rows;

    let saved = 0;
    let errors: string[] = [];

    for (const p of plants) {
      try {
        const aiData = await generateAIPlantDescriptions({
          nombre: p.nombre,
          tipo: p.tipo,
          luz: p.luz,
          riego: p.riego,
          dificultad: p.dificultad
        });

        await pool.query(
          'UPDATE plants_catalog SET descripcion = $1, descripcion_corta = $2, ai_processed = true WHERE id = $3',
          [aiData.descripcion_larga, aiData.descripcion_corta, p.id]
        );
        saved++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err: any) {
        errors.push(`Error IA para ${p.nombre}: ${err.message}`);
        if (err.message?.includes("rate_limit")) break;
      }
    }

    res.json({ success: true, processed: plants.length, saved, skipped: plants.length - saved, errors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 4B. Generar faltantes
 */
export const aiGenerateMissing = async (_req: Request, res: Response) => {
  try {
    const plantsRes = await pool.query('SELECT * FROM plants_catalog WHERE ai_processed = false OR descripcion IS NULL OR descripcion = \'\'');
    const plants = plantsRes.rows;

    let saved = 0;
    let errors: string[] = [];

    for (const p of plants) {
      try {
        const aiData = await generateAIPlantDescriptions({
          nombre: p.nombre,
          tipo: p.tipo,
          luz: p.luz,
          riego: p.riego,
          dificultad: p.dificultad
        });

        await pool.query(
          'UPDATE plants_catalog SET descripcion = $1, descripcion_corta = $2, ai_processed = true WHERE id = $3',
          [aiData.descripcion_larga, aiData.descripcion_corta, p.id]
        );
        saved++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err: any) {
        errors.push(`Error IA para ${p.nombre}: ${err.message}`);
        if (err.message?.includes("rate_limit")) break;
      }
    }

    res.json({ success: true, processed: plants.length, saved, skipped: plants.length - saved, errors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 5. Eliminar Plantas
 */
export const deletePlants = async (req: Request, res: Response) => {
  const { keywords } = req.body;
  if (!keywords) return res.status(400).json({ error: 'Keywords requeridas' });

  try {
    const kwList = keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    let totalDeleted = 0;

    for (const kw of kwList) {
      const result = await pool.query(
        'DELETE FROM plants_catalog WHERE nombre ILIKE $1 OR nombre_cientifico ILIKE $1',
        [`%${kw}%`]
      );
      totalDeleted += (result.rowCount || 0);
    }

    res.json({ success: true, processed: kwList.length, saved: 0, skipped: 0, deleted: totalDeleted, errors: [] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
