import axios from 'axios';
import { pool } from '../db';
import { logger } from '../utils/logger';
import { perenualService } from './perenualService';
import { pexelsService } from './pexelsService';
import { cloudinaryService } from './cloudinaryService';

export interface ImageRepairResult {
  plantId: number;
  nombre: string;
  success: boolean;
  source?: string;
  newUrl?: string;
  error?: string;
  status: 'valid' | 'repaired' | 'failed' | 'skipped';
}

export const imageRepairService = {
  /**
   * Validates if a URL is an accessible image
   */
  async validateImageUrl(url: string): Promise<boolean> {
    if (!url || typeof url !== 'string') return false;
    if (!url.startsWith('http')) return false;

    try {
      const response = await axios.get(url, { 
        timeout: 5000, 
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      const contentType = response.headers['content-type'] as string;
      return response.status === 200 && !!contentType && typeof contentType === 'string' && contentType.startsWith('image/');
    } catch (error) {
      return false;
    }
  },

  /**
   * Main pipeline to repair an image for a specific plant
   */
  async repairPlantImage(plantId: number, force: boolean = false): Promise<ImageRepairResult> {
    try {
      const plantRes = await pool.query(
        'SELECT id, nombre, nombre_cientifico, tipo, imagen_url, image_validated FROM plants_catalog WHERE id = $1',
        [plantId]
      );

      if (plantRes.rows.length === 0) {
        return { plantId, nombre: 'Unknown', success: false, error: 'Plant not found', status: 'failed' };
      }

      const plant = plantRes.rows[0];
      const currentUrl = plant.imagen_url;

      // 1. Validation
      if (!force && plant.image_validated && currentUrl && currentUrl.includes('cloudinary')) {
        const isValid = await this.validateImageUrl(currentUrl);
        if (isValid) {
          return { plantId, nombre: plant.nombre, success: true, newUrl: currentUrl, status: 'valid' };
        }
      }

      logger.info(`[ImageRepair] Attempting to repair image for ${plant.nombre} (ID: ${plantId})`);

      let foundUrl: string | null = null;
      let source: string = 'none';

      // 2. Try Perenual (if external_id exists or by scientific name)
      try {
        // We might need to search if external_id is missing
        const perenualPlants = await perenualService.searchPlants(plant.nombre_cientifico || plant.nombre);
        if (perenualPlants.length > 0) {
          const match = perenualPlants.find(p => 
            p.scientific_name?.some(sn => sn.toLowerCase() === (plant.nombre_cientifico || '').toLowerCase()) ||
            p.common_name?.toLowerCase() === plant.nombre.toLowerCase()
          ) || perenualPlants[0];

          if (match.default_image?.original_url) {
            const url = match.default_image.original_url;
            if (await this.validateImageUrl(url)) {
              foundUrl = url;
              source = 'perenual';
            }
          }
        }
      } catch (err) {
        logger.warn(`[ImageRepair] Perenual search failed for ${plant.nombre}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }

      // 3. Fallback to Pexels
      if (!foundUrl) {
        try {
          const queries = [
            plant.nombre_cientifico,
            plant.nombre,
            `${plant.nombre} ${plant.tipo || 'plant'}`
          ].filter(Boolean);

          for (const q of queries) {
            const pexelsUrl = await pexelsService.getPlantImage(q!);
            if (pexelsUrl && await this.validateImageUrl(pexelsUrl)) {
              foundUrl = pexelsUrl;
              source = 'pexels';
              break;
            }
          }
        } catch (err) {
          logger.warn(`[ImageRepair] Pexels search failed for ${plant.nombre}`);
        }
      }

      // 4. Upload to Cloudinary (MANDATORY)
      if (foundUrl) {
        const cloudinaryUrl = await cloudinaryService.uploadImage(foundUrl, 'bloomy/plants');
        if (cloudinaryUrl) {
          await pool.query(
            `UPDATE plants_catalog 
             SET imagen_url = $1, 
                 image_source = $2, 
                 image_last_updated = CURRENT_TIMESTAMP, 
                 image_validated = true 
             WHERE id = $3`,
            [cloudinaryUrl, source, plantId]
          );
          return { plantId, nombre: plant.nombre, success: true, newUrl: cloudinaryUrl, source, status: 'repaired' };
        }
      }

      // 5. If everything fails
      await pool.query(
        'UPDATE plants_catalog SET image_validated = false WHERE id = $1',
        [plantId]
      );
      return { plantId, nombre: plant.nombre, success: false, error: 'Could not find a valid image', status: 'failed' };

    } catch (error: any) {
      logger.error(`[ImageRepair] Error repairing plant ${plantId}: ${error.message}`);
      return { plantId, nombre: 'Error', success: false, error: error.message, status: 'failed' };
    }
  },

  /**
   * Repair batch of plants
   */
  async repairBatch(plantIds: number[], force: boolean = false): Promise<ImageRepairResult[]> {
    const results: ImageRepairResult[] = [];
    
    // Process sequentially or with limited concurrency to avoid IP bans/rate limits
    for (const id of plantIds) {
      const result = await this.repairPlantImage(id, force);
      results.push(result);
      // Small delay between plants to be respectful to APIs
      await new Promise(r => setTimeout(r, 500));
    }
    
    return results;
  }
};
