import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.ts';
import { pool } from '../db.ts';
import { logger } from '../utils/logger.ts';

/**
 * Obtiene recordatorios (eventos) calculados para el calendario
 */
export const getReminders = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const result = await pool.query(
      `SELECT up.*, c.nombre as nombre_original 
       FROM user_plants up 
       JOIN plants_catalog c ON up.plant_id = c.id 
       WHERE up.user_id = $1`,
      [userId]
    );

    const events: any[] = [];
    const today = new Date();
    
    // Proyectar eventos para los próximos 60 días
    result.rows.forEach(plant => {
      const plantName = plant.nombre_personalizado || plant.nombre_original;
      
      // Eventos de Riego
      const lastWatering = new Date(plant.ultima_fecha_riego || plant.fecha_agregado);
      for (let i = 0; i < 10; i++) {
        const nextDate = new Date(lastWatering);
        nextDate.setDate(lastWatering.getDate() + (i * (plant.frecuencia_riego_dias || 7)));
        
        // Solo mostrar eventos desde hoy
        if (nextDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
          events.push({
            id: `water-${plant.id}-${i}`,
            title: `💧 Regar ${plantName}`,
            start: nextDate.toISOString().split('T')[0],
            backgroundColor: '#3b82f6', // blue-500
            borderColor: '#2563eb',
            allDay: true,
            extendedProps: { type: 'riego', plantId: plant.id }
          });
        }
      }

      // Eventos de Fertilización
      const lastFertilize = new Date(plant.ultima_fertilizacion || plant.fecha_agregado);
      for (let i = 0; i < 4; i++) {
        const nextDate = new Date(lastFertilize);
        nextDate.setDate(lastFertilize.getDate() + (i * (plant.frecuencia_fertilizacion_dias || 30)));
        
        if (nextDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
          events.push({
            id: `fert-${plant.id}-${i}`,
            title: `🌿 Fertilizar ${plantName}`,
            start: nextDate.toISOString().split('T')[0],
            backgroundColor: '#10b981', // green-500
            borderColor: '#059669',
            allDay: true,
            extendedProps: { type: 'fertilizante', plantId: plant.id }
          });
        }
      }
    });

    res.json(events);
  } catch (error) {
    logger.error({ message: 'Error al obtener recordatorios', error });
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
