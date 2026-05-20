import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, ChevronLeft, MessageSquare, Clock, 
  Trash2, X, Send, Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Comment {
  id: number;
  contenido: string;
  user_id: number | null;
  user_email: string | null;
  user_username: string | null;
  user_avatar: string | null;
  is_ai: boolean;
  user_is_premium: boolean;
  created_at: string;
  parent_id: number | null;
  replies?: Comment[];
}

interface Post {
  id: number;
  user_id: number;
  user_email: string;
  user_avatar: string | null;
  contenido: string;
  imagen_url: string | null;
  tipo: 'ayuda' | 'experiencia';
  is_ai: boolean;
  user_username: string | null;
  user_is_premium: boolean;
  created_at: string;
  comments: Comment[];
}

interface PostDetailProps {
  token: string | null;
  user: any;
  onAuthRequired: () => void;
}

export const PostDetail: React.FC<PostDetailProps> = ({ token, user, onAuthRequired }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${id}`);
      if (!response.ok) throw new Error('No se pudo encontrar la publicación');
      const data = await response.json();
      setPost(data);
    } catch (err: any) {
      console.error('Error fetching post:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPost();
      window.scrollTo(0, 0);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary/20" />
        <p className="mt-4 text-text-secondary font-medium italic">Sincronizando con el ecosistema...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-background">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-6">
          <X className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-serif font-black text-primary italic mb-4">¡Vaya! Algo salió mal</h2>
        <p className="text-text-secondary italic mb-8 max-w-md">{error || 'No pudimos encontrar la publicación que buscas.'}</p>
        <Button 
          onClick={() => navigate('/forum')}
          className="bg-primary text-white rounded-full px-8 py-6 font-bold"
        >
          Volver al Foro
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 p-3 bg-primary/5 hover:bg-primary/10 rounded-2xl text-primary transition-all flex items-center gap-3 font-black text-[10px] uppercase tracking-widest px-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Volver
      </button>

      <PostCardView 
        post={post} 
        token={token} 
        user={user} 
        onAuthRequired={onAuthRequired} 
        onUpdate={fetchPost} 
      />
    </div>
  );
};

// Reutilizamos la lógica de PostCard pero la adaptamos para la vista de detalle
const PostCardView: React.FC<{
  post: Post;
  token: string | null;
  user: any;
  onAuthRequired: () => void;
  onUpdate: () => void;
}> = ({ post, token, user, onAuthRequired, onUpdate }) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const navigate = useNavigate();

  const username = post.user_username || post.user_email.split('@')[0];
  const date = new Date(post.created_at).toLocaleDateString('es-ES', { 
    day: 'numeric', month: 'long'
  });

  const handleAddComment = async (e?: React.FormEvent, parentId: number | null = null, customText?: string) => {
    if (e) e.preventDefault();
    if (!token) {
      onAuthRequired();
      return;
    }
    
    const text = customText || commentText;
    if (!text.trim()) return;

    try {
      if (!customText) setIsSubmittingComment(true);
      const response = await fetch('/api/posts/comment', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          post_id: post.id,
          contenido: text,
          parent_id: parentId
        })
      });

      if (response.ok) {
        if (!customText) setCommentText('');
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      if (!customText) setIsSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!token) return;
    if (!window.confirm('¿Eliminar esta publicación?')) return;

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        navigate('/forum');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  return (
    <div className="bg-card rounded-[48px] border border-border/40 p-8 lg:p-12 space-y-10 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.015] rounded-bl-[160px] pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-primary text-white rounded-[24px] flex items-center justify-center overflow-hidden shadow-2xl shadow-primary/20 uppercase font-black text-2xl italic font-serif">
            {post.user_avatar ? <img src={post.user_avatar} className="w-full h-full object-cover" /> : username[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-black text-primary text-xl tracking-tight italic font-serif leading-none">{username}</h4>
            </div>
            <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/40 flex items-center gap-1.5 pt-1">
              <Clock className="w-3.5 h-3.5" />
              {date}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={`${post.tipo === 'ayuda' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-primary shadow-primary/20'} text-white font-black text-[9px] uppercase tracking-[0.15em] px-5 py-2 rounded-full border-none`}>
            {post.tipo === 'ayuda' ? 'CONSULTA BOTÁNICA 🔮' : 'CRÓNICA VEGETAL 🌿'}
          </Badge>
          {(user?.is_admin || (user && user.id === post.user_id)) && (
            <button 
              onClick={handleDeletePost}
              className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-xl"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-8 relative z-10">
        <p className="text-xl leading-relaxed text-text whitespace-pre-wrap font-editorial italic lg:pr-16">{post.contenido}</p>
        
        {post.imagen_url && (
          <div className="rounded-[40px] overflow-hidden border border-border/50 shadow-2xl relative group">
             <img src={post.imagen_url} className="w-full h-auto object-cover transition-transform duration-[1.5s]" />
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="pt-10 border-t border-border/50">
        <h5 className="text-sm font-black uppercase tracking-[0.2em] text-primary mb-8 flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          Comentarios ({post.comments?.length || 0})
        </h5>

        {token && (
          <form onSubmit={handleAddComment} className="flex gap-4 items-center mb-12">
            <input 
              type="text" 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe tu observación..."
              className="flex-1 h-16 bg-muted/20 rounded-[28px] px-8 text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all italic font-editorial"
            />
            <button 
              type="submit"
              disabled={isSubmittingComment || !commentText.trim()}
              className="w-16 h-16 bg-primary text-white rounded-[28px] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="w-6 h-6" />
            </button>
          </form>
        )}

        <div className="space-y-8">
          {post.comments?.map(comment => (
            <CommentNode 
              key={comment.id} 
              comment={comment} 
              token={token}
              user={user}
              onUpdate={onUpdate}
              onReply={(pid, txt) => handleAddComment(undefined, pid, txt)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const CommentNode: React.FC<{
  comment: Comment;
  token: string | null;
  user: any;
  onUpdate: () => void;
  onReply: (parentId: number, text: string) => Promise<void>;
  level?: number;
}> = ({ comment, token, user, onUpdate, onReply, level = 0 }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const username = comment.user_username || (comment.user_email ? comment.user_email.split('@')[0] : 'Usuario');
  const isAdmin = user?.is_admin;
  const isOwner = user && Number(user.id) === Number(comment.user_id);
  const canDelete = isAdmin || isOwner;

  const handleDelete = async () => {
    if (!token || !window.confirm('¿Eliminar comentario?')) return;
    try {
      const res = await fetch(`/api/posts/comment/${comment.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setLoading(true);
    await onReply(comment.id, replyText);
    setReplyText('');
    setShowReply(false);
    setLoading(false);
  };

  return (
    <div className={`space-y-4 ${level > 0 ? 'ml-6 md:ml-12 pl-6 border-l-2 border-primary/5' : ''}`}>
      <div className={`p-6 rounded-[32px] border transition-all ${comment.is_ai ? 'bg-primary/[0.03] border-primary/10 shadow-lg shadow-primary/5' : 'bg-muted/10 border-border/40'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${comment.is_ai ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
               {comment.is_ai ? <Sparkles className="w-5 h-5" /> : (comment.user_avatar ? <img src={comment.user_avatar} className="w-full h-full object-cover rounded-xl" /> : username[0])}
             </div>
             <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black italic font-serif text-text-primary">
                    {comment.is_ai ? 'Bloomy IA Expert' : username}
                  </p>
                </div>
                {comment.is_ai && <Badge className="mt-1 h-4 px-2 text-[7px] bg-primary text-white border-none">INTELIGENCIA ARTIFICIAL</Badge>}
             </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black tracking-widest text-text-secondary/40">
              {formatRelativeTime(comment.created_at)}
            </span>
            {canDelete && (
              <button onClick={handleDelete} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className={`text-sm italic font-editorial leading-relaxed ${comment.is_ai ? 'text-primary' : 'text-text-secondary'}`}>
          {comment.contenido}
        </p>

        {token && !comment.is_ai && (
          <div className="mt-4">
            <button 
              onClick={() => setShowReply(!showReply)}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:scale-105 transition-all"
            >
              Responder
            </button>
          </div>
        )}

        <AnimatePresence>
          {showReply && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleReplySubmit}
              className="mt-4 flex gap-3 overflow-hidden"
            >
              <input 
                type="text" 
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Responde a ${username}...`}
                className="flex-1 h-12 bg-muted/40 rounded-2xl px-6 text-xs outline-none focus:ring-2 focus:ring-primary/5 transition-all italic font-editorial"
                autoFocus
              />
              <button disabled={loading || !replyText.trim()} className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {comment.replies?.map(reply => (
        <CommentNode key={reply.id} comment={reply} token={token} user={user} onUpdate={onUpdate} onReply={onReply} level={level + 1} />
      ))}
    </div>
  );
};

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'hace un momento';
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 84000) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};
