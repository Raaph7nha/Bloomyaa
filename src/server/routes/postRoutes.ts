import { Router } from 'express';
import { createPost, getPosts, getPostById, getUserPosts, addComment, uploadPostImage, updatePost, deletePost, deleteComment, togglePostLike, toggleCommentLike } from '../controllers/postController.ts';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/authMiddleware.ts';

const router = Router();

// Obtener todos los posts
router.get('/', optionalAuthenticateToken as any, getPosts);

// Obtener posts de usuario específico (Debe ir antes de /:id)
router.get('/user/:userId?', authenticateToken as any, getUserPosts);

// Obtener un post específico
router.get('/:id', getPostById);

// Crear post (requiere auth y subida de imagen opcional)
router.post('/', authenticateToken as any, uploadPostImage.single('image'), createPost);

// Agregar comentario
router.post('/comment', authenticateToken as any, addComment);

// Editar post
router.put('/:id', authenticateToken as any, updatePost);

// Eliminar post
router.delete('/:id', authenticateToken as any, deletePost);

// Eliminar comentario
router.delete('/comment/:id', authenticateToken as any, deleteComment);

// Likes
router.post('/:id/like', authenticateToken as any, togglePostLike);
router.post('/comment/:id/like', authenticateToken as any, toggleCommentLike);

export default router;
