import { Router } from 'express';
import { getReminders } from '../controllers/reminderController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken as any, getReminders as any);

export default router;
