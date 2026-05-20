import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.ts';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'Bloomy';

/**
 * Registra un nuevo usuario en la base de datos
 */
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  logger.info('[AuthController] Register attempt for: ' + email);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    // Encriptar la contraseña (salts: 10)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar usuario en PostgreSQL
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, username, profile_pic_url, is_admin',
      [email, hashedPassword]
    );

    const newUser = result.rows[0];
    logger.info('[AuthController] Register success for: ' + email);

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      user: newUser
    });
  } catch (error: any) {
    // Manejo de error para email duplicado
    if (error.code === '23505') {
      logger.warn('[AuthController] Email already exists: ' + email);
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    logger.error({ message: 'Error en registro', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Valida credenciales y devuelve un token JWT
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  logger.info('[AuthController] Login attempt for: ' + email);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    // Buscar usuario por email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      logger.warn('[AuthController] User not found during login: ' + email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn('[AuthController] Invalid password for user: ' + email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token JWT
    logger.debug('[AuthController] Generating JWT for: ' + email);
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('[AuthController] Login success for: ' + email);
    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        profile_pic_url: user.profile_pic_url,
        is_admin: user.is_admin 
      }
    });
  } catch (error) {
    logger.error({ message: 'Error en login', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
