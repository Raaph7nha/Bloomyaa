import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.ts';
import { pool } from '../db.ts';
import { logger } from '../utils/logger.ts';

/**
 * Middleware para restringir acceso solo a administradores
 */
export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user || !user.is_admin) {
      // Map 403 to 401 to avoid proxy interception of 403 HTML pages
      return res.status(401).json({ error: 'Acceso denegado: Se requieren permisos de administrador' });
    }

    next();
  } catch (error) {
    logger.error({ message: 'Error en middleware isAdmin', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
