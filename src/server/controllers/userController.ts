import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.ts';
import { pool } from '../db.ts';
import { logger } from '../utils/logger.ts';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import bcrypt from 'bcryptjs';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'bloomy/users/profile',
    format: async (_req: any, _file: any) => 'png',
    public_id: (req: any, _file: any) => `profile_${(req as any).user?.id || Date.now()}`,
  } as any,
});

const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'bloomy/users/banners',
    format: async (_req: any, _file: any) => 'png',
    public_id: (req: any, _file: any) => `banner_${(req as any).user?.id || Date.now()}`,
  } as any,
});

export const uploadProfile = multer({ storage: profileStorage });
export const uploadBanner = multer({ storage: bannerStorage });

/**
 * Obtiene la información del perfil del usuario y estadísticas
 */
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  logger.info('[UserController] Fetching profile for userId: ' + userId);

  try {
    // Info del usuario
    const userResult = await pool.query(
      'SELECT email, username, created_at, profile_pic_url, banner_image_url, bio, location, favorite_plants, is_admin FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      logger.warn('[UserController] User not found during profile fetch: ' + userId);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Estadísticas: Conteo de plantas
    const plantCountResult = await pool.query(
      'SELECT COUNT(*) FROM user_plants WHERE user_id = $1',
      [userId]
    );

    // Estadísticas: Conteo de publicaciones
    const postCountResult = await pool.query(
      'SELECT COUNT(*) FROM posts WHERE user_id = $1',
      [userId]
    );

    const userData = userResult.rows[0];
    
    const profileData = {
      ...userData,
      is_premium: false,
      username: userData.username || userData.email.split('@')[0],
      plantCount: parseInt(plantCountResult.rows[0].count),
      postCount: parseInt(postCountResult.rows[0].count)
    };

    logger.info('[UserController] Profile fetched successfully for: ' + userData.email);
    res.json(profileData);
  } catch (error) {
    logger.error({ message: 'Error al obtener perfil', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene el estado detallado de la suscripción (Versión Gratuita)
 * GET /api/user/subscription
 */
export const getSubscriptionStatus = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  try {
    const userResult = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Límites de uso
    const usageResult = await pool.query(
      'SELECT COUNT(*) FROM user_plants WHERE user_id = $1',
      [userId]
    );
    const plantCount = parseInt(usageResult.rows[0].count);

    res.json({
      isPremium: false,
      premiumUntil: null,
      paymentStatus: null,
      limits: {
        plants: {
          current: plantCount,
          max: Infinity,
          isReached: false
        },
        aiConsultations: {
          max: 'unlimited'
        }
      }
    });

  } catch (error) {
    logger.error({ message: 'Error al obtener estado de suscripción', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene el perfil público de otro usuario
 */
export const getPublicUserProfile = async (req: any, res: Response) => {
  const { id } = req.params;
  
  try {
    const userResult = await pool.query(
      'SELECT id, username, created_at, profile_pic_url, banner_image_url, bio, location, favorite_plants FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const plantCountResult = await pool.query(
      'SELECT COUNT(*) FROM user_plants WHERE user_id = $1',
      [id]
    );

    const postCountResult = await pool.query(
      'SELECT COUNT(*) FROM posts WHERE user_id = $1',
      [id]
    );

    const userData = userResult.rows[0];
    res.json({
      ...userData,
      plantCount: parseInt(plantCountResult.rows[0].count),
      postCount: parseInt(postCountResult.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil público' });
  }
};

/**
 * Actualiza la foto de perfil del usuario
 */
export const updateProfilePic = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  logger.info('[UserController] Uploading profile pic for userId: ' + userId);
  logger.info({ message: 'Received file', file: req.file?.originalname });

  const imageUrl = (req as any).file?.path || (req as any).file?.secure_url;

  if (!imageUrl) {
    logger.warn('[UserController] No image URL generated by multer/cloudinary');
    return res.status(400).json({ error: 'No se pudo procesar la imagen' });
  }

  try {
    await pool.query(
      'UPDATE users SET profile_pic_url = $1 WHERE id = $2',
      [imageUrl, userId]
    );

    logger.info(`[UserController] Profile pic updated for userId: ${userId} to: ${imageUrl}`);
    res.json({ 
      message: 'Foto de perfil actualizada', 
      profile_pic_url: imageUrl 
    });
  } catch (error) {
    logger.error({ message: 'Error al actualizar foto de perfil', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualiza la foto de banner del usuario
 */
export const updateBannerPic = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const imageUrl = (req as any).file?.path || (req as any).file?.secure_url;

  if (!imageUrl) {
    return res.status(400).json({ error: 'No se pudo procesar la imagen' });
  }

  try {
    await pool.query(
      'UPDATE users SET banner_image_url = $1 WHERE id = $2',
      [imageUrl, userId]
    );

    res.json({ 
      message: 'Foto de portada actualizada', 
      banner_image_url: imageUrl 
    });
  } catch (error) {
    logger.error({ message: 'Error al actualizar banner', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualiza el perfil del usuario (username, password, bio, location, favorite_plants)
 */
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { username, password, bio, location, favorite_plants } = req.body;

  try {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET username = $1, bio = $2, location = $3, favorite_plants = $4, password = $5 WHERE id = $6',
        [username || null, bio || null, location || null, favorite_plants || null, hashedPassword, userId]
      );
    } else {
      await pool.query(
        'UPDATE users SET username = $1, bio = $2, location = $3, favorite_plants = $4 WHERE id = $5',
        [username || null, bio || null, location || null, favorite_plants || null, userId]
      );
    }

    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error) {
    logger.error({ message: 'Error al actualizar perfil', error });
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};
