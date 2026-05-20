import { pool } from '../db';
import { perenualService, PerenualPlant } from './perenualService';
import { plantNetService } from './plantNetService';
import { pexelsService } from './pexelsService';
import { cloudinaryService } from './cloudinaryService';
import { logger } from '../utils/logger';
import { transformPlantData } from '../controllers/catalogController';

export interface ImportResult {
  success: boolean;
  totalFetched: number;
  saved: number;
  skipped: number;
  imagesFixed: number;
  enriched: number;
  errors: string[];
  logs: string[];
}

export const importService = {
  /**
   * Main smart import logic
   */
  async smartImport(keywords: string[], maxPerKeyword: number = 20): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      totalFetched: 0,
      saved: 0,
      skipped: 0,
      imagesFixed: 0,
      enriched: 0,
      errors: [],
      logs: []
    };

    for (const kw of keywords) {
      const kwLog = `[IMPORT] keyword: ${kw}`;
      logger.info(kwLog);
      result.logs.push(kwLog);
      
      try {
        let kwFetched = 0;
        for (let page = 1; page <= 3; page++) {
          if (kwFetched >= maxPerKeyword) break;

          const pageLog = `[PAGE] ${page}`;
          logger.info(pageLog);
          result.logs.push(pageLog);

          const plants = await perenualService.searchPlants(kw, page);
          
          // Extra safety delay if we are going to multiple pages
          if (page > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          if (plants.length === 0) {
            result.logs.push(`  [INFO] No se encontraron más resultados para ${kw} en la página ${page}`);
            break;
          }

          result.totalFetched += plants.length;
          result.logs.push(`  [INFO] Encontradas ${plants.length} plantas en página ${page}`);

          for (const plant of plants) {
            if (kwFetched >= maxPerKeyword) break;

            const importInfo = await this.processSinglePlant(plant);
            
            if (importInfo.status === 'saved') {
              result.saved++;
              kwFetched++;
              const savedLog = `[SAVED] ${plant.common_name}`;
              result.logs.push(savedLog);
              
              if (importInfo.imagesFixed) {
                result.imagesFixed++;
                result.logs.push(`  [IMAGE] desde Pexels`);
              } else {
                result.logs.push(`  [IMAGE] desde Perenual`);
              }

              if (importInfo.enriched) {
                result.enriched++;
                result.logs.push(`  [ENRICHED] con PlantNet`);
              }
            } else if (importInfo.status === 'skipped') {
              result.skipped++;
              if (importInfo.message === 'Duplicate') {
                result.logs.push(`  [SKIPPED] duplicado: ${plant.common_name}`);
              } else {
                result.logs.push(`  [SKIPPED] ${importInfo.message}: ${plant.common_name}`);
              }
            } else if (importInfo.status === 'error') {
              result.errors.push(`${plant.common_name || plant.id}: ${importInfo.message}`);
              result.logs.push(`  [ERROR] ${plant.common_name}: ${importInfo.message}`);
            }

            // Rate limit protection: 1s delay
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Error desconocido';
        logger.error({ message: `[ImportService] Error in keyword: ${kw}`, error: errorMsg });
        result.errors.push(`Keyword ${kw}: ${errorMsg}`);
        result.logs.push(`[ERROR] Keyword "${kw}": ${errorMsg}`);
        
        // If it's an API Key error or Rate Limit, stop the whole import to avoid more errors
        if (errorMsg.includes('API_KEY') || errorMsg.includes('LIMITE')) {
           result.success = false;
           break;
        }
      }
    }

    return result;
  },

  /**
   * Process a single plant from Perenual
   */
  async processSinglePlant(plant: PerenualPlant) {
    const commonName = plant.common_name;
    const scientificName = plant.scientific_name?.[0];

    // A) Validation
    if (!commonName || !scientificName) {
      return { status: 'skipped', message: 'Missing names' };
    }

    // E) Avoid Duplicates
    const duplicateCheck = await pool.query(
      'SELECT id FROM plants_catalog WHERE nombre = $1 OR nombre_cientifico = $2',
      [commonName, scientificName]
    );
    if (duplicateCheck.rows.length > 0) {
      logger.debug(`[ImportService] Skipping duplicate: ${commonName}`);
      return { status: 'skipped', message: 'Duplicate' };
    }

    let enriched = false;
    let imagesFixed = false;
    let finalImageUrl: string | null = null;

    // B) Validation with PlantNet (Optional but requested)
    const plantNetInfo = await plantNetService.getSpeciesInfo(scientificName);
    if (plantNetInfo) {
      enriched = true;
      logger.debug(`[ImportService] Enriched with PlantNet: ${commonName}`);
    }

    // C & D) Image Flow
    let candidateUrl: string | null = plant.default_image?.original_url || plant.default_image?.regular_url || null;
    
    // Check if URL is alive
    let isUrlAlive = false;
    if (candidateUrl) {
      isUrlAlive = await perenualService.isImageValid(candidateUrl);
    }

    if (!isUrlAlive) {
      logger.info(`[ImportService] Perenual image dead for ${commonName}, trying Pexels...`);
      candidateUrl = await pexelsService.getPlantImage(commonName);
      if (candidateUrl) imagesFixed = true;
    }

    // Upload to Cloudinary if we have a URL
    if (candidateUrl) {
      try {
        const cloudinaryUrl = await cloudinaryService.uploadImage(candidateUrl, 'bloomy/plants');
        if (cloudinaryUrl) {
          finalImageUrl = cloudinaryUrl;
        } else {
          logger.warn(`[ImportService] Cloudinary upload failed for ${commonName}, using candidate directly`);
          finalImageUrl = candidateUrl;
        }
      } catch (err) {
        logger.error({ message: `[ImportService] Cloudinary error for ${commonName}`, error: err });
        finalImageUrl = candidateUrl;
      }
    }

    // G) Normalization and Save
    try {
      // Use standard transformation logic
      const { tipo, luz, riego, dificultad, descripcion } = transformPlantData(plant);
      
      await pool.query(
        `INSERT INTO plants_catalog 
         (nombre, nombre_cientifico, imagen_url, riego, luz, ai_processed, is_new, tipo, dificultad, descripcion) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [commonName, scientificName, finalImageUrl, riego, luz, false, true, tipo, dificultad, descripcion]
      );

      logger.info(`[ImportService] SAVED: ${commonName}`);
      return { status: 'saved', enriched, imagesFixed };
    } catch (err: any) {
      logger.error(`[ImportService] Error saving ${commonName}: ${err.message}`);
      return { status: 'error', message: err.message };
    }
  }
};
