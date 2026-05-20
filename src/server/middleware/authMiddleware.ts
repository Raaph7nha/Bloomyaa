import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'Bloomy';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    is_admin: boolean;
  };
  file?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  
  logger.debug({
    message: "Auth request",
    url: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      authorization: authHeader ? "HIDDEN" : undefined,
      cookie: req.headers.cookie ? "HIDDEN" : undefined
    }
  });

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('[AuthMiddleware] No token provided');
    return res.status(401).json({ error: 'Token de acceso no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      logger.error('[AuthMiddleware] Token verification failed: ' + err.message);
      // Map 403 to 401 to avoid proxy interception of 403 HTML pages
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
    logger.debug('[AuthMiddleware] Token verified for user: ' + user.email);
    req.user = user;
    next();
  });
};

export const optionalAuthenticateToken = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};
