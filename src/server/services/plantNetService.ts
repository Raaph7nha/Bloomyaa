import axios from 'axios';
import { logger } from '../utils/logger';

export const plantNetService = {
  /**
   * Search species by scientific name to validate and enrich
   */
  async getSpeciesInfo(scientificName: string): Promise<any | null> {
    const apiKey = process.env.PLANTNET_API_KEY;
    const baseUrl = 'https://my-api.plantnet.org/v2/species';

    if (!apiKey) {
      logger.warn('[PlantNetService] API Key is missing');
      return null;
    }

    try {
      logger.info(`[PlantNetService] Validating: ${scientificName}`);
      
      // Attempt search by scientific name
      const searchResponse = await axios.get(baseUrl, {
        params: {
          'api-key': apiKey,
          scientificName: scientificName,
          lang: 'es'
        }
      });

      const results = searchResponse.data || [];
      if (results.length > 0) {
        return results[0];
      }
      return null;
    } catch (error: any) {
      logger.error({ message: '[PlantNetService] Error validating species', error: error.message });
      return null;
    }
  }
};
