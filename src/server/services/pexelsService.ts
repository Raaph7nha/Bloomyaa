import axios from 'axios';
import { logger } from '../utils/logger.ts';

// Simple in-memory cache
const cache = new Map<string, string | null>();

export const pexelsService = {
  /**
   * Search for a plant image on Pexels
   * @param plantName Name of the plant to search
   * @returns URL of the image or null if not found
   */
  async getPlantImage(plantName: string): Promise<string | null> {
    const apiKey = process.env.PEXELS_API_KEY;
    const searchUrl = 'https://api.pexels.com/v1/search';

    if (!apiKey) {
      logger.warn('[PexelsService] PEXELS_API_KEY is not defined');
      return null;
    }

    if (!plantName) {
      logger.warn('[PexelsService] plantName is null or undefined');
      return null;
    }

    const query = plantName.trim().toLowerCase();
    
    // Check cache
    if (cache.has(query)) {
      return cache.get(query) || null;
    }

    try {
      logger.info(`[PexelsService] Fetching image for: ${query}`);
      const response = await axios.get(searchUrl, {
        params: {
          query: `${query} plant`,
          per_page: 5,
          orientation: 'landscape'
        },
        headers: {
          Authorization: apiKey
        }
      });

      const photos = response.data.photos;
      if (photos && photos.length > 0) {
        const REJECT_KEYWORDS = ['sky', 'galaxy', 'person', 'people', 'human', 'landscape', 'space', 'universe', 'portrait', 'night', 'star'];
        
        // Find first photo that doesn't contain rejected keywords in its alt text
        const bestPhoto = photos.find((p: any) => {
          const alt = (p.alt || "").toLowerCase();
          return !REJECT_KEYWORDS.some(kw => alt.includes(kw));
        }) || photos[0]; // Fallback to first if all are bad (unlikely with 'plant' query)

        const imageUrl = bestPhoto.src.large || bestPhoto.src.medium;
        cache.set(query, imageUrl);
        return imageUrl;
      }

      // No results
      cache.set(query, null);
      return null;
    } catch (error: any) {
      logger.error({ message: `[PexelsService] Error fetching image for ${query}`, error: error.message });
      if (error.response?.status === 429) {
        logger.warn('[PexelsService] Rate limit exceeded');
      }
      return null;
    }
  },

  /**
   * Clear the cache if needed
   */
  clearCache() {
    cache.clear();
  }
};
