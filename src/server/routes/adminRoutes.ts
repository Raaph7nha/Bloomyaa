import { Router } from 'express';
import { 
  importSmart, 
  refreshCatalog, 
  fixImages, 
  aiRegenerateAll, 
  aiGenerateMissing, 
  deletePlants 
} from '../controllers/adminController.ts';
import { imageAdminController } from '../controllers/imageAdminController.ts';
import { authenticateToken } from '../middleware/authMiddleware.ts';
import { isAdmin } from '../middleware/adminMiddleware.ts';

const router = Router();

// Middleware de protección global para rutas admin
router.use(authenticateToken as any);
router.use(isAdmin as any);

router.post('/import-smart', importSmart);
router.post('/refresh-catalog', refreshCatalog);
router.post('/fix-images', fixImages);

// New Image Repair Routes
router.get('/image-status', imageAdminController.getStatus);
router.post('/images/fix', imageAdminController.fixImages);
router.post('/images/reprocess', imageAdminController.reprocessImages);
router.post('/images/fix/:id', imageAdminController.fixSpecificImage);

router.post('/ai/regenerate-all', aiRegenerateAll);
router.post('/ai/generate-missing', aiGenerateMissing);
router.post('/delete-plants', deletePlants);

export default router;
