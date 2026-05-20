import { Router } from 'express';
import { addUserPlant, getUserPlants, removeUserPlant, waterPlant, fertilizePlant, getPlantHistory } from '../controllers/userPlantController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken as any);

router.post('/', addUserPlant as any);
router.get('/', getUserPlants as any);
router.delete('/:id', removeUserPlant as any);

// Rutas de cuidado
router.post('/:id/water', waterPlant as any);
router.post('/:id/fertilize', fertilizePlant as any);
router.get('/:id/history', getPlantHistory as any);

export default router;
