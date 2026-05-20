import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware.ts';
import { pool } from '../db.ts';
import { logger } from '../utils/logger.ts';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { generateForumResponse, generateDailyAIPost } from '../services/aiService.ts';

// Configurar Cloudinary para posts
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'bloomy_posts',
    format: async (_req: any, _file: any) => 'png',
    public_id: (_req: any, _file: any) => `post_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  } as any,
});

export const uploadPostImage = multer({ storage: storage });

// Multer en memoria para análisis rápido
export const memoryUpload = multer({ storage: multer.memoryStorage() });

/**
 * Crear un nuevo post en el foro
 */
export const createPost = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { contenido, tipo } = req.body;
  const imagenUrl = (req as any).file?.path || null;

  if (!contenido) {
    return res.status(400).json({ error: 'El contenido es requerido' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO posts (user_id, contenido, imagen_url, tipo) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, contenido, imagenUrl, tipo || 'experiencia']
    );

    const newPost = result.rows[0];

    // IA responde automáticamente como comentario
    // Se ejecuta en segundo plano para no bloquear la respuesta al usuario
    (async () => {
      try {
        let aiPromptContext = contenido;
        
        // Si hay imagen, intentar identificarla para dar contexto a la IA
        if (imagenUrl) {
          try {
            const plantnetKey = process.env.PLANTNET_API_KEY;
            if (plantnetKey) {
              const form = new FormData();
              // Cloudinary URL -> Buffer o fetch
              const imgRes = await fetch(imagenUrl);
              const buffer = await imgRes.arrayBuffer();
              const blob = new Blob([buffer]);
              form.append('organs', 'leaf');
              form.append('images', blob, 'image.png');

              const plantnetRes = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${plantnetKey}`, {
                method: 'POST',
                body: form
              });

              if (plantnetRes.ok) {
                const data = await plantnetRes.json();
                if (data.results?.[0]) {
                  const species = data.results[0].species;
                  const plantName = species.commonNames?.[0] || species.scientificNameWithoutAuthor;
                  aiPromptContext = `(El usuario ha subido una foto identificada como ${plantName}) - Pregunta/Comentario: ${contenido}`;
                }
              }
            }
          } catch (err) {
            logger.error({ message: 'Error identificando imagen para contexto IA', error: err });
          }
        }

        const aiResponse = await generateForumResponse(aiPromptContext);
        await pool.query(
          'INSERT INTO comments (post_id, user_id, contenido, is_ai) VALUES ($1, NULL, $2, TRUE)',
          [newPost.id, aiResponse]
        );
      } catch (err) {
        logger.error({ message: 'Error generando respuesta de IA diferida', error: err });
      }
    })();

    res.status(201).json(newPost);
  } catch (error) {
    logger.error({ message: 'Error al crear post', error });
    res.status(500).json({ error: 'Error interno al crear el post' });
  }
};

/**
 * Verifica si se debe generar un post de IA hoy y lo crea si es necesario
 */
const checkAndGenerateAIPost = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkResult = await pool.query(
      "SELECT id FROM posts WHERE is_ai = TRUE AND created_at >= $1",
      [today]
    );

    if (checkResult.rows.length > 0) {
      return;
    }

    const content = await generateDailyAIPost();
    if (!content) return;

    const adminResult = await pool.query("SELECT id FROM users WHERE is_admin = TRUE LIMIT 1");
    const adminId = adminResult.rows[0]?.id || 1;

    await pool.query(
      "INSERT INTO posts (user_id, contenido, tipo, is_ai) VALUES ($1, $2, 'experiencia', TRUE)",
      [adminId, content]
    );
  } catch (error) {
    logger.error({ message: 'Error auto-generating AI post', error });
  }
};

/**
 * Utilidad para convertir una lista plana de comentarios en una estructura de árbol
 */
const buildCommentTree = (comments: any[]) => {
  const map: any = {};
  const root: any[] = [];

  comments.forEach(comment => {
    map[comment.id] = { ...comment, replies: [] };
  });

  comments.forEach(comment => {
    if (comment.parent_id && map[comment.parent_id]) {
      map[comment.parent_id].replies.push(map[comment.id]);
    } else {
      root.push(map[comment.id]);
    }
  });

  return root;
};

/**
 * Obtener todos los posts con información del usuario y comentarios (anidados)
 */
export const getPosts = async (req: AuthRequest, res: Response) => {
  try {
    // Intentar generar post de IA si no hay uno hoy
    await checkAndGenerateAIPost();

    const userId = req.user?.id || 0;

    const query = `
      SELECT 
        p.*, 
        u.email as user_email, 
        u.username as user_username,
        u.profile_pic_url as user_avatar,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
        (SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1)) as is_liked,
        (
          SELECT json_agg(comment_data)
          FROM (
            SELECT c.*, cu.username as user_username, cu.profile_pic_url as user_avatar,
            (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as likes_count,
            (SELECT EXISTS(SELECT 1 FROM comment_likes WHERE comment_id = c.id AND user_id = $1)) as is_liked
            FROM comments c
            LEFT JOIN users cu ON c.user_id = cu.id
            WHERE c.post_id = p.id
            ORDER BY c.created_at ASC
          ) as comment_data
        ) as raw_comments
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    
    // Procesar comentarios de cada post para convertirlos en árbol
    const posts = result.rows.map(post => {
      const rawComments = post.raw_comments || [];
      const comments = buildCommentTree(rawComments);
      delete post.raw_comments;
      return { ...post, comments };
    });

    res.json(posts);
  } catch (error) {
    logger.error({ message: 'Error al obtener posts', error });
    res.status(500).json({ error: 'Error al obtener las publicaciones' });
  }
};

/**
 * Obtener posts de un usuario específico (para el perfil)
 */
export const getUserPosts = async (req: AuthRequest, res: Response) => {
  const userId = req.params.userId || req.user?.id;

  try {
    const query = `
      SELECT p.*, u.email as user_email, u.username as user_username, u.profile_pic_url as user_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (error) {
    logger.error({ message: 'Error al obtener posts del usuario', error });
    res.status(500).json({ error: 'Error al obtener tus publicaciones' });
  }
};

/**
 * Obtener un post por ID
 */
export const getPostById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({ error: 'ID de publicación inválido o no proporcionado' });
  }

  try {
    const query = `
      SELECT 
        p.*, 
        u.email as user_email, 
        u.username as user_username,
        u.profile_pic_url as user_avatar,
        (
          SELECT json_agg(comment_data)
          FROM (
            SELECT c.*, cu.username as user_username, cu.profile_pic_url as user_avatar
            FROM comments c
            LEFT JOIN users cu ON c.user_id = cu.id
            WHERE c.post_id = p.id
            ORDER BY c.created_at ASC
          ) as comment_data
        ) as raw_comments
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const post = result.rows[0];
    const rawComments = post.raw_comments || [];
    const comments = buildCommentTree(rawComments);
    delete post.raw_comments;
    
    res.json({ ...post, comments });
  } catch (error) {
    logger.error({ message: 'Error detallado en getPostById', id, error });
    res.status(500).json({ error: 'Error al obtener la publicación de la base de datos' });
  }
};

/**
 * Agregar un comentario a un post (o respuesta a otro comentario)
 */
export const addComment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { post_id, contenido, parent_id } = req.body;

  if (!post_id || !contenido) {
    return res.status(400).json({ error: 'Post ID y contenido son requeridos' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO comments (post_id, user_id, contenido, parent_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [post_id, userId, contenido, parent_id || null]
    );
    
    // Obtener información del usuario para el comentario recién creado
    const commentWithUser = await pool.query(`
      SELECT c.*, u.username as user_username, u.profile_pic_url as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `, [result.rows[0].id]);

    res.status(201).json(commentWithUser.rows[0]);
  } catch (error) {
    logger.error({ message: 'Error al comentar', error });
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
};

/**
 * Actualizar un post
 */
export const updatePost = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.is_admin;
  const { id } = req.params;
  const { contenido } = req.body;

  if (!contenido) {
    return res.status(400).json({ error: 'El contenido es requerido' });
  }

  try {
    // Verificar propiedad o admin
    const postCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const postOwnerId = postCheck.rows[0].user_id;
    if (Number(postOwnerId) !== Number(userId) && !isAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para editar esta publicación' });
    }

    const result = await pool.query(
      'UPDATE posts SET contenido = $1 WHERE id = $2 RETURNING *',
      [contenido, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    logger.error({ message: 'Error al actualizar post', error });
    res.status(500).json({ error: 'Error al actualizar la publicación' });
  }
};

/**
 * Eliminar un post
 */
export const deletePost = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.is_admin;
  const { id } = req.params;

  try {
    logger.info({ message: 'Intentando eliminar post', postId: id, userId, isAdmin });
    
    // Verificar propiedad o admin
    const postCheck = await pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const postOwnerId = postCheck.rows[0].user_id;
    logger.debug({ message: 'Post ownership check', postOwnerId, requesterId: userId });

    if (Number(postOwnerId) !== Number(userId) && !isAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta publicación' });
    }

    // El borrado de comentarios suele ser automático por ON DELETE CASCADE, 
    // pero lo hacemos manual primero para asegurar que no haya bloqueos por FK si la restricción falló.
    await pool.query('DELETE FROM comments WHERE post_id = $1', [id]);
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);

    res.json({ message: 'Publicación eliminada correctamente' });
  } catch (error) {
    logger.error({ message: 'Error al eliminar post', error });
    res.status(500).json({ error: 'Error al eliminar la publicación' });
  }
};

/**
 * Eliminar un comentario
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const isAdmin = req.user?.is_admin;
  const { id } = req.params;

  try {
    const commentCheck = await pool.query('SELECT user_id FROM comments WHERE id = $1', [id]);
    
    if (commentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const commentOwnerId = commentCheck.rows[0].user_id;

    // Lógica de permisos:
    // 1. Si es admin, puede borrar cualquier cosa.
    // 2. Si no es admin:
    //    a. Si el comentario tiene dueño, solo el dueño puede borrarlo.
    //    b. Si el comentario NO tiene dueño (IA), solo el admin puede borrarlo.
    
    const isOwner = commentOwnerId && Number(commentOwnerId) === Number(userId);
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este comentario' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [id]);

    res.json({ message: 'Comentario eliminado correctamente' });
  } catch (error) {
    logger.error({ message: 'Error al eliminar comentario', error });
    res.status(500).json({ error: 'Error al eliminar el comentario' });
  }
};

/**
 * Toggle like en un post
 */
export const togglePostLike = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    const checkLike = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkLike.rows.length > 0) {
      await pool.query(
        'DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [id, userId]
      );
      res.json({ liked: false });
    } else {
      await pool.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    logger.error({ message: 'Error toggling post like', error });
    res.status(500).json({ error: 'Error al procesar el like' });
  }
};

/**
 * Toggle like en un comentario
 */
export const toggleCommentLike = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  try {
    const checkLike = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkLike.rows.length > 0) {
      await pool.query(
        'DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [id, userId]
      );
      res.json({ liked: false });
    } else {
      await pool.query(
        'INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );
      res.json({ liked: true });
    }
  } catch (error) {
    logger.error({ message: 'Error toggling comment like', error });
    res.status(500).json({ error: 'Error al procesar el like' });
  }
};
