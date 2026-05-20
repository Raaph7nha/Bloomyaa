import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../utils/logger.ts';

export const cloudinaryService = {
  /**
   * Upload an image from a URL or local path to Cloudinary
   * @param imagePath URL or local path of the image
   * @param folder Destination folder in Cloudinary
   * @returns The secure URL of the uploaded image
   */
  async uploadImage(imagePath: string, folder: string = 'bloomy/plants'): Promise<string | null> {
    const cloudName = process.env.CLOUDINARY_CLOUD;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn('[CloudinaryService] Cloudinary keys not configured');
      return null;
    }

    // Configure Cloudinary on the fly
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    try {
      const result = await cloudinary.uploader.upload(imagePath, {
        folder: folder,
        resource_type: 'auto',
      });

      return result.secure_url;
    } catch (error) {
      logger.error({ message: '[CloudinaryService] Error uploading image', error });
      return null;
    }
  },

  /**
   * Get cloudinary instance for advanced usage
   */
  get instance() {
    return cloudinary;
  }
};
