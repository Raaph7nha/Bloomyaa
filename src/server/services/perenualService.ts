import axios from 'axios';
import { logger } from '../utils/logger';

export interface PerenualPlant {
  id: number;
  common_name: string;
  scientific_name: string[];
  other_name: string[];
  cycle: string;
  watering: string;
  sunlight: string[];
  default_image?: {
    original_url: string;
    regular_url: string;
    medium_url: string;
    small_url: string;
    thumbnail: string;
  } | null;
}

export const perenualService = {
  /**
   * Search plants by keyword
   */
  async searchPlants(keyword: string, page: number = 1): Promise<PerenualPlant[]> {
    const apiKey = process.env.PERENUAL_API_KEY?.trim();
    const baseUrl = 'https://perenual.com/api/species-list';

    if (!apiKey) {
      logger.error('[PerenualService] PERENUAL_API_KEY is not configured or empty');
      throw new Error('PERENUAL_API_KEY_MISSING');
    }

    logger.info(`[PerenualService] API Key trace: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)} (Length: ${apiKey.length})`);

    try {
      // Manual URL construction to ensure parameters are exactly as Perenual expects
      const encodedKeyword = encodeURIComponent(keyword.trim());
      const url = `${baseUrl}?key=${apiKey}&q=${encodedKeyword}&page=${page}`;
      
      logger.info(`[PerenualService] Requesting URL: ${baseUrl}?key=***&q=${keyword}&page=${page}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 15000 // Increased timeout
      });

      logger.info(`[PerenualService] Response Status: ${response.status}`);
      
      // Important: Perenual sometimes returns 200 with an error object
      if (response.data && response.data.error) {
        const err = response.data.error;
        const errMsg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
        logger.error(`[PerenualService] API Logical Error: ${errMsg}`);
        
        if (errMsg.toLowerCase().includes('key') || errMsg.toLowerCase().includes('unauthorized')) {
          throw new Error(`API PERENUAL RECHAZADA: ${errMsg}. Verifica tu API Key.`);
        }
        return [];
      }

      let plants = response.data.data || [];
      
      // FALLBACK: If "q" returns 0, try "search" just in case the API behavior changed or is different for this key
      if (plants.length === 0 && page === 1) {
        logger.info(`[PerenualService] Zero results with "q", trying "search" parameter as fallback...`);
        const fallbackUrl = `${baseUrl}?key=${apiKey}&search=${encodedKeyword}&page=${page}`;
        const fallbackResponse = await axios.get(fallbackUrl, {
           headers: { 'User-Agent': 'BloomyApp/1.0', 'Accept': 'application/json' },
           timeout: 10000
        });
        if (fallbackResponse.data && fallbackResponse.data.data && fallbackResponse.data.data.length > 0) {
           plants = fallbackResponse.data.data;
           logger.info(`[PerenualService] Fallback "search" worked! Found ${plants.length} plants.`);
        }
      }

      logger.info(`[PerenualService] Found ${plants.length} plants for "${keyword}" (Total on API: ${response.data.total || 'unknown'})`);
      
      if (plants.length === 0) {
        logger.debug(`[PerenualService] Empty response for ${keyword}. Response keys: ${Object.keys(response.data).join(', ')}`);
      }

      return plants;
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        const errorStatus = error.response.status;
        
        logger.error(`[PerenualService] Error Status: ${errorStatus}`);
        logger.error(`[PerenualService] Error Data: ${JSON.stringify(errorData)}`);
        
        if (errorStatus === 429) {
          throw new Error('LIMITE_ALCANZADO: Perenual ha bloqueado las peticiones por hoy (Rate Limit).');
        }
        
        if (errorStatus === 401 || errorStatus === 403) {
          throw new Error(`API_KEY_INVALIDA: La clave de Perenual no es válida (${errorStatus}).`);
        }

        throw new Error(`API_ERROR_${errorStatus}: ${errorData.message || 'Error en la API de Perenual'}`);
      } else {
        logger.error(`[PerenualService] Generic Error: ${error.message}`);
        throw error;
      }
    }
  },

  /**
   * Validate if an image URL is alive
   */
  async isImageValid(url: string): Promise<boolean> {
    if (!url) return false;
    try {
      const response = await axios.head(url, { timeout: 3000 });
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      return false;
    }
  }
};
