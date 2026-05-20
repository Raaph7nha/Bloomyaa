import { Router } from 'express';
import { 
  getUserProfile, 
  getPublicUserProfile, 
  updateProfilePic, 
  updateBannerPic, 
  updateUserProfile, 
  getSubscriptionStatus,
  uploadProfile, 
  uploadBanner 
} from '../controllers/userController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Rutas privadas (requieren auth)
router.get('/profile', authenticateToken as any, getUserProfile as any);
router.get('/subscription', authenticateToken as any, getSubscriptionStatus as any);
router.put('/update', authenticateToken as any, updateUserProfile as any);
router.post('/profile-pic', authenticateToken as any, uploadProfile.single('image'), updateProfilePic as any);
router.post('/banner-pic', authenticateToken as any, uploadBanner.single('image'), updateBannerPic as any);

// Rutas públicas
router.get('/profile/:id', getPublicUserProfile as any);

export default router;
