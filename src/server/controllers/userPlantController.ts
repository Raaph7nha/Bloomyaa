import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.ts';
import { pool } from '../db.ts';
import { logger } from '../utils/logger.ts';

/**
 * Agrega una planta del catálogo al jardín del usuario con configuración inicial
 */
export const addUserPlant = async (req: AuthRequest, res: Response) => {
  const { plant_id, nombre_personalizado, frecuencia_riego_dias, frecuencia_fertilizacion_dias } = req.body;
  const userId = req.user?.id;

  if (!plant_id || !userId) {
    return res.status(400).json({ error: 'ID de planta y usuario son requeridos' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_plants 
       (user_id, plant_id, nombre_personalizado, frecuencia_riego_dias, frecuencia_fertilizacion_dias, ultima_fecha_riego, ultima_fertilizacion) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       ON CONFLICT (user_id, plant_id) DO UPDATE SET
         nombre_personalizado = COALESCE(EXCLUDED.nombre_personalizado, user_plants.nombre_personalizado),
         frecuencia_riego_dias = COALESCE(EXCLUDED.frecuencia_riego_dias, user_plants.frecuencia_riego_dias)
       RETURNING *`,
      [userId, plant_id, nombre_personalizado, frecuencia_riego_dias || 7, frecuencia_fertilizacion_dias || 30]
    );

    // Log inicial de riego y fertilización
    const userPlantId = result.rows[0].id;
    await pool.query(
      'INSERT INTO plant_logs (user_plant_id, tipo_evento, nota) VALUES ($1, $2, $3), ($1, $4, $5)',
      [userPlantId, 'riego', 'Añadida al jardín (Riego inicial)', 'fertilizante', 'Añadida al jardín (Fertilización inicial)']
    );

    res.status(201).json({
      message: 'Planta añadida a tu jardín',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error({ message: 'Error al añadir planta de usuario', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene las plantas del jardín del usuario con estado calculado
 */
export const getUserPlants = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const result = await pool.query(
      `SELECT up.id as user_plant_id, up.user_id, up.plant_id, up.nombre_personalizado, up.ultima_fecha_riego, 
              up.frecuencia_riego_dias, up.ultima_fertilizacion, up.frecuencia_fertilizacion_dias, up.fecha_agregado,
              c.nombre as nombre_original, c.nombre_cientifico, c.imagen_url, c.tipo, c.dificultad
       FROM user_plants up 
       JOIN plants_catalog c ON up.plant_id = c.id 
       WHERE up.user_id = $1 
       ORDER BY up.fecha_agregado DESC`,
      [userId]
    );

    const today = new Date();
    const plantsWithStatus = result.rows.map(plant => {
      // Fallback a fecha de agregado si no hay fecha de riego
      const baseDateWatering = plant.ultima_fecha_riego ? new Date(plant.ultima_fecha_riego) : new Date(plant.fecha_agregado);
      const lastWatering = isNaN(baseDateWatering.getTime()) ? today : baseDateWatering;
      
      const nextWatering = new Date(lastWatering);
      nextWatering.setDate(lastWatering.getDate() + (plant.frecuencia_riego_dias || 7));

      const baseDateFertilize = plant.ultima_fertilizacion ? new Date(plant.ultima_fertilizacion) : new Date(plant.fecha_agregado);
      const lastFertilize = isNaN(baseDateFertilize.getTime()) ? today : baseDateFertilize;
      
      const nextFertilize = new Date(lastFertilize);
      nextFertilize.setDate(lastFertilize.getDate() + (plant.frecuencia_fertilizacion_dias || 30));

      let status = 'Saludable';
      const daysDiff = Math.floor((today.getTime() - nextWatering.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff >= 2) {
        status = 'Atención urgente';
      } else if (daysDiff >= 0) {
        status = 'Necesita agua';
      }

      return {
        ...plant,
        next_watering: nextWatering,
        next_fertilizing: nextFertilize,
        status
      };
    });

    res.json(plantsWithStatus);
  } catch (error) {
    logger.error({ message: 'Error al obtener plantas del usuario', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Registra riego de una planta
 */
export const waterPlant = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { nota } = req.body;

  try {
    const check = await pool.query('SELECT id FROM user_plants WHERE id = $1 AND user_id = $2', [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Planta no encontrada' });

    await pool.query('UPDATE user_plants SET ultima_fecha_riego = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    await pool.query('INSERT INTO plant_logs (user_plant_id, tipo_evento, nota) VALUES ($1, $2, $3)', [id, 'riego', nota || 'Riego registrado']);

    res.json({ message: 'Riego registrado con éxito' });
  } catch (error) {
    logger.error({ message: 'Error al regar planta', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Registra fertilización de una planta
 */
export const fertilizePlant = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { nota } = req.body;

  try {
    const check = await pool.query('SELECT id FROM user_plants WHERE id = $1 AND user_id = $2', [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Planta no encontrada' });

    await pool.query('UPDATE user_plants SET ultima_fertilizacion = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    await pool.query('INSERT INTO plant_logs (user_plant_id, tipo_evento, nota) VALUES ($1, $2, $3)', [id, 'fertilizante', nota || 'Fertilización registrada']);

    res.json({ message: 'Fertilización registrada con éxito' });
  } catch (error) {
    logger.error({ message: 'Error al fertilizar planta', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene historial de eventos de una planta
 */
export const getPlantHistory = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const check = await pool.query('SELECT id FROM user_plants WHERE id = $1 AND user_id = $2', [id, userId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Planta no encontrada' });

    const result = await pool.query('SELECT * FROM plant_logs WHERE user_plant_id = $1 ORDER BY fecha DESC LIMIT 50', [id]);
    res.json(result.rows);
  } catch (error) {
    logger.error({ message: 'Error al obtener historial', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Elimina una planta del jardín del usuario
 */
export const removeUserPlant = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; 
  const userId = req.user?.id;

  logger.info({ message: 'Solicitud de eliminación de planta de usuario', userPlantId: id, userId });

  if (!id || id === 'undefined' || isNaN(Number(id))) {
     return res.status(400).json({ error: 'ID de planta de usuario inválido. Recibido: ' + id });
  }

  try {
    // Eliminar logs asociados explícitamente por seguridad, aunque tengamos CASCADE
    await pool.query('DELETE FROM plant_logs WHERE user_plant_id = $1', [Number(id)]);

    const result = await pool.query(
      'DELETE FROM user_plants WHERE id = $1 AND user_id = $2 RETURNING *',
      [Number(id), userId]
    );

    if (result.rows.length === 0) {
      logger.warn({ message: 'No se encontró la planta para el usuario', userPlantId: id, userId });
      return res.status(404).json({ error: 'Registro no encontrado o no autorizado' });
    }

    logger.info(`[UserPlantController] ÉXITO: Planta ${id} eliminada.`);
    res.json({ 
      success: true,
      message: 'Planta eliminada' 
    });
  } catch (error) {
    logger.error({ message: 'ERROR CRÍTICO al eliminar planta de usuario', error });
    res.status(500).json({ error: 'Error interno del servidor al procesar la eliminación' });
  }
};
