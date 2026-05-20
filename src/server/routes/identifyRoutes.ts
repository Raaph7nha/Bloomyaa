import { Router } from 'express';
import multer from 'multer';
import { identifyPlant, saveIdentifiedPlant, scanPlant } from '../controllers/identifyController.ts';
import { authenticateToken } from '../middleware/authMiddleware.ts';

const router = Router();

// Configurar multer para memoria (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

router.post('/identify', authenticateToken, upload.single('image'), identifyPlant);
router.post('/save', authenticateToken, saveIdentifiedPlant);
router.post('/scan', authenticateToken, upload.single('image'), scanPlant);

export default router;
