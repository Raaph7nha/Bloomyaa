import { Router } from 'express';
import { 
  generatePlantDescriptions, 
  getBatchCandidatesGroq, 
  getGenerationProgress, 
  startContinuousGeneration,
  plantChat
} from '../controllers/aiController';
import { authenticateToken } from '../middleware/authMiddleware';
import { isAdmin } from '../middleware/adminMiddleware';

const router = Router();

// Endpoint para generar descripciones con AI (Protegido por token)
router.post('/generate-descriptions', authenticateToken as any, generatePlantDescriptions);

// Chat inteligente sobre una planta
router.post('/plant-chat', authenticateToken as any, plantChat);

// Endpoint para obtener candidatos antes del batch
router.get('/batch-candidates', authenticateToken as any, isAdmin as any, getBatchCandidatesGroq);

// Endpoint para progreso continuo
router.get('/generation-progress', authenticateToken as any, isAdmin as any, getGenerationProgress);

// Endpoint para iniciar generación continua
router.post('/start-continuous-generation', authenticateToken as any, isAdmin as any, startContinuousGeneration);

export default router;
