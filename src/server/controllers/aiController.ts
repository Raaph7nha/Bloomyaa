import { Request, Response } from 'express';
import Groq from 'groq-sdk';
import { pool } from '../db.ts';
import { generateAIPlantDescriptions } from '../services/aiService.ts';
import { logger } from '../utils/logger.ts';

let groqClient: Groq | null = null;
let isProcessingContinuous = false;

const getGroqClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

/**
 * Endpoint para iniciar el proceso continuo en segundo plano
 * POST /api/ai/start-continuous-generation
 */
export const startContinuousGeneration = async (_req: Request, res: Response) => {
  if (isProcessingContinuous) {
    return res.status(400).json({ error: 'Ya hay un proceso de generación en ejecución.' });
  }

  isProcessingContinuous = true;
  
  // Respondemos inmediatamente para no bloquear el frontend
  res.json({ message: 'Proceso continuo iniciado correctamente.' });

  // Iniciamos el loop en segundo plano
  runBackgroundLoop().finally(() => {
    isProcessingContinuous = false;
    logger.info('[Groq AI] Proceso continuo finalizado completamente.');
  });
};

const runBackgroundLoop = async () => {
  const BATCH_SIZE = 5;
  const DELAY_MS = 2000;

  logger.info('[Groq AI] Iniciando loop de generación continua...');

  try {
    let hasMore = true;

    while (hasMore) {
      // 1. Obtener candidatos (limitados a 5 por lote para control de flujo)
      const plantsQuery = await pool.query(`
        SELECT id, nombre, tipo, luz, riego, dificultad 
        FROM plants_catalog 
        WHERE ai_processed = false
        ORDER BY id ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `, [BATCH_SIZE]);

      const toProcess = plantsQuery.rows;
      if (toProcess.length === 0) {
        hasMore = false;
        break;
      }

      // getGroqClient() call removed as groq was unused here

      for (const plant of toProcess) {
        try {
          const aiData = await generateAIPlantDescriptions({
            nombre: plant.nombre,
            tipo: plant.tipo,
            luz: plant.luz,
            riego: plant.riego,
            dificultad: plant.dificultad
          });

          await pool.query(
            "UPDATE plants_catalog SET descripcion = $1, descripcion_corta = $2, ai_processed = true WHERE id = $3",
            [aiData.descripcion_larga, aiData.descripcion_corta, plant.id]
          );
          logger.info(`[Groq AI] ✅ Procesada: ${plant.nombre}`);
        } catch (err: any) {
          logger.error({ message: `[Groq AI] ❌ Error en ${plant.nombre}`, error: err.message || err });
          // Si es un error de cuota o similar, podríamos querer detener el loop
          if (err.message?.includes("rate_limit_exceeded") || err.message?.includes("credits_are_depleted")) {
            logger.warn('[Groq AI] Límite alcanzado. Deteniendo proceso continuo.');
            hasMore = false;
            break;
          }
        }
        
        // Delay corto entre plantas del mismo lote (opcional pero reduce picos)
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Delay entre lotes de 5 para respetar límites globales
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }
  } catch (error) {
    logger.error({ message: '[Groq AI] Error crítico en el loop continuo', error });
  }
};

/**
 * Obtiene el progreso global de la generación
 * GET /api/ai/generation-progress
 */
export const getGenerationProgress = async (_req: Request, res: Response) => {
  try {
    const totalRes = await pool.query('SELECT COUNT(*) FROM plants_catalog');
    const processedRes = await pool.query('SELECT COUNT(*) FROM plants_catalog WHERE ai_processed = true');

    const total = parseInt(totalRes.rows[0].count);
    const procesadas = parseInt(processedRes.rows[0].count);
    const restantes = total - procesadas;
    const porcentaje = total > 0 ? Math.round((procesadas / total) * 100) : 0;

    res.json({
      total,
      procesadas,
      restantes,
      porcentaje,
      is_running: isProcessingContinuous
    });
  } catch (error) {
    logger.error({ message: 'Error al obtener progreso', error });
    res.status(500).json({ error: 'Error al obtener progreso.' });
  }
};

export const generatePlantDescriptions = async (req: Request, res: Response) => {
  const { nombre, tipo, luz, riego, dificultad } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre de planta es requerido' });
  }

  try {
    const descriptions = await generateAIPlantDescriptions({
      nombre, tipo, luz, riego, dificultad
    });
    res.json(descriptions);
  } catch (error: any) {
    logger.error({ message: 'Error generating descriptions with Groq', error });
    
    // Fallback amigable
    res.json({
      descripcion_corta: `Una planta de ${tipo} ideal para ambientes de luz ${luz}.`,
      descripcion_larga: `La ${nombre} es perfecta para tu hogar. Prefiere estar en zonas de ${luz} y necesita un riego ${riego}. Es una opción excelente si buscas algo de dificultad ${dificultad}.`
    });
  }
};

/**
 * Obtiene candidatos para procesamiento por lotes
 * GET /api/ai/batch-candidates
 */
export const getBatchCandidatesGroq = async (_req: Request, res: Response) => {
  const BATCH_SIZE = 5;

  try {
    const plantsQuery = await pool.query(`
      SELECT id, nombre, tipo, luz, riego, dificultad, descripcion, descripcion_corta 
      FROM plants_catalog 
      WHERE ai_processed = false
      ORDER BY id ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    `, [BATCH_SIZE]);

    const countQuery = await pool.query(`
      SELECT COUNT(*) FROM plants_catalog 
      WHERE ai_processed = false
    `);

    res.json({
      candidates: plantsQuery.rows,
      totalRemaining: parseInt(countQuery.rows[0].count)
    });
  } catch (error) {
    logger.error({ message: 'Error fetching batch candidates', error });
    res.status(500).json({ error: 'Error al obtener candidatos.' });
  }
};

/**
 * Chat inteligente sobre una planta específica
 * POST /api/ai/plant-chat
 */
export const plantChat = async (req: Request, res: Response) => {
  const { plantId, pregunta } = req.body;

  if (!plantId || !pregunta) {
    return res.status(400).json({ error: 'plantId y pregunta son requeridos' });
  }

  try {
    const plantQuery = await pool.query('SELECT * FROM plants_catalog WHERE id = $1', [plantId]);
    const plant = plantQuery.rows[0];

    if (!plant) {
      return res.status(404).json({ error: 'Planta no encontrada' });
    }

    const { nombre, tipo, luz, riego, dificultad, descripcion } = plant;

    const prompt = `Actúa como un experto en cuidado de plantas. 

Responde la pregunta del usuario basándote en la siguiente información:

Nombre de la planta: ${nombre}
Tipo: ${tipo}
Luz: ${luz}
Riego: ${riego}
Dificultad: ${dificultad}
Descripción: ${descripcion || 'No hay descripción disponible'}

Instrucciones:
* Responde en español
* Usa un tono amigable y claro
* Da consejos prácticos
* No uses lenguaje técnico complicado

Restricciones:
* No inventes información fuera del contexto dado
* Si la pregunta no tiene relación con la planta, responde educadamente.

Pregunta del usuario: ${pregunta}`;

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const respuesta = completion.choices[0]?.message?.content || "Lo siento, no pude generar una respuesta.";
    res.json({ respuesta });

  } catch (error) {
    logger.error({ message: 'Error in plant chat', error });
    res.status(500).json({ error: 'Error al procesar el chat de la planta.' });
  }
};
