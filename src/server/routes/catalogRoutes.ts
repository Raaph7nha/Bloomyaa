import { Router } from 'express';
import { getCatalog, getCatalogPlantById, importPlants, refreshPlants, fetchExternalCandidates, batchImportPlants, fixExpiredImages, smartBatchImport } from '../controllers/catalogController';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/authMiddleware';
import { isAdmin } from '../middleware/adminMiddleware';

const router = Router();

router.get('/', getCatalog);
router.get('/fix-expired-images', authenticateToken as any, isAdmin as any, fixExpiredImages);
router.get('/import-plants', authenticateToken as any, isAdmin as any, importPlants);
router.get('/fetch-external-candidates', authenticateToken as any, isAdmin as any, fetchExternalCandidates);
router.post('/batch-import', authenticateToken as any, isAdmin as any, batchImportPlants);
router.post('/smart-import', authenticateToken as any, isAdmin as any, smartBatchImport);
router.get('/refresh-plants', authenticateToken as any, isAdmin as any, refreshPlants);
router.get('/:id', optionalAuthenticateToken as any, getCatalogPlantById as any);

export default router;
