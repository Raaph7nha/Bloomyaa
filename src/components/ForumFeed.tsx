import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Plus, Send, 
  Sparkles, Clock, MoreVertical,
  Share2, Upload, X, Loader2,
  Edit, Trash2, Heart
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PostSkeleton } from './ui/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  likes_count: number;
  is_liked: boolean;
  replies?: Comment[];
}

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';
  if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} h`;
  if (diffInSeconds < 604800) return `hace ${Math.floor(diffInSeconds / 86400)} d`;
  
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

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
  likes_count: number;
  is_liked: boolean;
  comments: Comment[];
}

interface ForumFeedProps {
  token: string | null;
  user: any;
  onAuthRequired: () => void;
}

export const ForumFeed: React.FC<ForumFeedProps> = ({ token, user, onAuthRequired }) => {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<'ayuda' | 'experiencia'>('experiencia');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: posts = [], isLoading: loading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const response = await fetch('/api/posts', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Error fetching posts');
      return response.json();
    }
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onAuthRequired();
      return;
    }
    if (!newPostContent.trim()) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('contenido', newPostContent);
      formData.append('tipo', newPostType);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setNewPostContent('');
        setSelectedImage(null);
        setImagePreview(null);
        setShowCreateModal(false);
        queryClient.invalidateQueries({ queryKey: ['posts'] });
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16 py-12 px-6">
      {/* Header Forum */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border/40 pb-16 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 text-[240px] font-black text-primary/[0.02] select-none pointer-events-none italic font-serif">
          Savia
        </div>
        
        <div className="relative z-10 space-y-6">
          <Badge className="bg-primary text-white font-black text-[10px] uppercase tracking-[0.3em] px-6 py-2 rounded-full shadow-high border-none">Comunidad</Badge>
          <div className="space-y-4">
            <h2 className="text-7xl font-serif font-black text-primary tracking-tighter leading-none italic">Bitácora</h2>
            <p className="text-primary/40 text-lg font-editorial italic max-w-lg leading-relaxed">
              Un espacio para el asombro, el aprendizaje y la conexión entre guardianes de lo verde.
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => token ? setShowCreateModal(true) : onAuthRequired()}
          className="w-20 h-20 bg-primary text-white rounded-[32px] flex items-center justify-center shadow-high hover:scale-110 hover:-rotate-6 active:scale-95 transition-all relative z-10 group"
        >
          <Plus className="w-10 h-10 group-hover:rotate-90 transition-transform duration-500" />
        </button>
      </div>

      {/* Feed */}
      <div className="space-y-12">
        {loading ? (
          <div className="space-y-12">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : (
          posts.map((post: Post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              token={token} 
              user={user}
              onAuthRequired={onAuthRequired} 
              onPostUpdate={() => queryClient.invalidateQueries({ queryKey: ['posts'] })}
            />
          ))
        )}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isSubmitting && setShowCreateModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl bg-background rounded-[48px] shadow-2xl overflow-hidden p-10 border border-border/50"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif font-black text-primary italic">Nuevo Post</h3>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-text-secondary/60">Comparte tu botánica</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-muted rounded-2xl transition-all">
                  <X className="w-7 h-7 text-text-secondary" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-8">
                {/* Selector de tipo */}
                <div className="flex gap-3 p-1.5 bg-muted/50 rounded-3xl">
                  <button
                    type="button"
                    onClick={() => setNewPostType('experiencia')}
                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${newPostType === 'experiencia' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    Experiencia 🌿
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPostType('ayuda')}
                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${newPostType === 'ayuda' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    Ayuda IA 🤖
                  </button>
                </div>

                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={newPostType === 'ayuda' ? "¿Qué síntomas observas en tu planta? Bloomy IA analizará tu observación..." : "Cuenta tu historia vegetal..."}
                  className="w-full h-48 bg-muted/30 rounded-[32px] p-8 outline-none focus:ring-4 focus:ring-primary/5 transition-all text-base italic font-editorial resize-none"
                  required
                />

                {/* Subir imagen */}
                <div className="relative group">
                  {imagePreview ? (
                    <div className="relative rounded-[32px] overflow-hidden aspect-video shadow-xl border border-border/50">
                      <img src={imagePreview} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => { setSelectedImage(null); setImagePreview(null); }}
                        className="absolute top-4 right-4 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all backdrop-blur-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center py-12 bg-muted/10 border-2 border-dashed border-primary/20 rounded-[32px] cursor-pointer hover:bg-muted/20 hover:border-primary/40 transition-all group/upload">
                      <Upload className="w-12 h-12 text-primary/20 group-hover/upload:text-primary/40 transition-colors mb-4" />
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">Anexar Fotografía</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newPostContent.trim()}
                  className="w-full h-20 bg-primary text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale transition-all active:scale-95 translate-y-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      Publicar Crónica
                      <Send className="w-6 h-6 rotate-12" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CommentItem: React.FC<{
  comment: Comment;
  isAdmin: boolean;
  currentUser: any;
  token: string | null;
  onDelete: (id: number) => void;
  onReply: (parentId: number, text: string) => Promise<void>;
  onLikeToggle: (id: number, type: 'post' | 'comment') => void;
  level?: number;
}> = ({ comment, isAdmin, currentUser, token, onDelete, onReply, onLikeToggle, level = 0 }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDelete = isAdmin || (currentUser && !comment.is_ai && Number(currentUser.id) === Number(comment.user_id));
  const username = comment.user_username || (comment.user_email ? comment.user_email.split('@')[0] : 'Usuario');

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    await onReply(comment.id, replyText);
    setReplyText('');
    setShowReplyInput(false);
    setIsSubmitting(false);
  };

  return (
    <div className={`space-y-4 ${level > 0 ? 'ml-6 md:ml-10 pl-4 border-l border-primary/10' : ''}`}>
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`p-5 rounded-[24px] border transition-all relative group/comment ${comment.is_ai ? 'bg-primary/[0.03] border-primary/20 shadow-md shadow-primary/5' : 'bg-muted/5 border-border/40'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black italic shadow-inner ${comment.is_ai ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
              {comment.is_ai ? <Sparkles className="w-4 h-4" /> : (comment.user_avatar ? <img src={comment.user_avatar} className="w-full h-full object-cover rounded-xl" /> : username[0])}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`text-xs font-black tracking-tight italic font-serif ${comment.is_ai ? 'text-primary' : 'text-text'}`}>
                  {comment.is_ai ? 'Bloomy IA Expert' : username}
                </p>
                {canDelete && (
                  <button 
                    onClick={() => onDelete(comment.id)}
                    className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {comment.is_ai && <Badge className="mt-0.5 h-3.5 px-1.5 text-[6px] font-black tracking-widest bg-primary text-white border-none">INTELIGENCIA ARTIFICIAL</Badge>}
            </div>
          </div>
          <span className="text-[9px] uppercase font-black tracking-widest text-text-secondary/40">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>
        
        <p className={`text-sm leading-relaxed italic font-editorial ${comment.is_ai ? 'text-primary px-2 border-l-2 border-primary/20' : 'text-text-secondary pl-1'}`}>
          {comment.contenido}
        </p>

        <div className="mt-4 flex items-center gap-4">
          {!comment.is_ai && (
            <button 
              onClick={() => onLikeToggle(comment.id, 'comment')}
              className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all hover:scale-110 active:scale-95 ${comment.is_liked ? 'text-rose-500' : 'text-text-secondary/40 hover:text-rose-400'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${comment.is_liked ? 'fill-current' : ''}`} />
              {comment.likes_count > 0 && comment.likes_count}
            </button>
          )}

          {currentUser && !comment.is_ai && (
            <button 
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="text-[9px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary/70 flex items-center gap-1.5"
            >
              <MessageSquare className="w-3 h-3" />
              {showReplyInput ? 'Cancelar' : 'Responder'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {showReplyInput && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleReplySubmit}
              className="mt-4 flex gap-3 items-center overflow-hidden"
            >
              <input 
                type="text" 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Responde a ${username}...`}
                className="flex-1 h-10 bg-muted/40 rounded-xl px-4 text-xs outline-none focus:ring-2 focus:ring-primary/5 transition-all italic font-editorial"
                autoFocus
              />
              <button 
                type="submit"
                disabled={isSubmitting || !replyText.trim()}
                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Render children recursively */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem 
              key={reply.id} 
              comment={reply} 
              isAdmin={isAdmin} 
              currentUser={currentUser} 
              token={token}
              onDelete={onDelete} 
              onReply={onReply}
              onLikeToggle={onLikeToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PostCard: React.FC<{ 
  post: Post, 
  token: string | null, 
  user: any,
  onAuthRequired: () => void,
  onPostUpdate: () => void 
}> = ({ post, token, user, onAuthRequired, onPostUpdate }) => {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.contenido);
  const [isUpdating, setIsUpdating] = useState(false);

  const username = post.user_username || post.user_email.split('@')[0];
  const date = new Date(post.created_at).toLocaleDateString('es-ES', { 
    day: 'numeric', month: 'long'
  });

  const isOwner = user && Number(user.id) === Number(post.user_id);
  const isAdmin = user && user.is_admin;
  const canManage = isOwner || isAdmin;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ contenido: editContent })
      });

      if (response.ok) {
        setIsEditing(false);
        onPostUpdate();
      }
    } catch (error) {
      console.error('Error updating post:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onPostUpdate();
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Error de conexión al intentar eliminar la publicación');
    }
  };

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
        onPostUpdate(); // Recargar para ver el comentario real con ID
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      if (!customText) setIsSubmittingComment(false);
    }
  };

  const handleToggleLike = async (id: number, type: 'post' | 'comment') => {
    if (!token) {
      onAuthRequired();
      return;
    }

    try {
      const response = await fetch(`/api/posts/${type}/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onPostUpdate();
      }
    } catch (error) {
      console.error(`Error toggling ${type} like:`, error);
    }
  };

  const onReply = async (parentId: number, text: string) => {
    await handleAddComment(undefined, parentId, text);
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!token) return;
    if (!window.confirm('¿Eliminar este comentario?')) return;

    try {
      const response = await fetch(`/api/posts/comment/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onPostUpdate();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-background rounded-[48px] border border-border/40 p-10 lg:p-14 space-y-12 shadow-soft hover:shadow-high transition-all duration-1000 group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.01] rounded-bl-[200px] pointer-events-none" />
      
      {/* User Info */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 bg-background p-2 rounded-[28px] overflow-hidden shadow-high ring-1 ring-border/10">
             <div className="w-full h-full bg-primary text-white rounded-[20px] flex items-center justify-center overflow-hidden uppercase font-black text-3xl italic font-serif">
               {post.user_avatar ? <img src={post.user_avatar} className="w-full h-full object-cover" /> : username[0]}
             </div>
          </div>
          <div className="space-y-1">
            <h4 className="font-serif font-black text-primary text-2xl tracking-tight italic leading-none">{username}</h4>
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-primary/20" />
              <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/20">{date}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {post.tipo === 'ayuda' ? (
            <Badge className="bg-accent text-white font-black text-[9px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-full shadow-high border-none">
              Consulta 🔮
            </Badge>
          ) : (
            <Badge className="bg-primary text-white font-black text-[9px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-full shadow-high border-none">
              Crónica 🌿
            </Badge>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowActions(!showActions)}
              className={`p-3 hover:bg-muted rounded-2xl transition-all ${showActions ? 'text-primary bg-muted' : 'text-muted-foreground/20 hover:text-primary'}`}
            >
              <MoreVertical className="w-6 h-6" />
            </button>

            <AnimatePresence>
              {showActions && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowActions(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    {canManage ? (
                      <>
                        <button 
                          onClick={() => { setIsEditing(true); setShowActions(false); }}
                          className="w-full px-6 py-4 flex items-center gap-3 hover:bg-muted transition-colors text-xs font-bold text-text"
                        >
                          <Edit className="w-4 h-4 text-primary" />
                          Editar Post
                        </button>
                        <button 
                          onClick={() => { handleDelete(); setShowActions(false); }}
                          className="w-full px-6 py-4 flex items-center gap-3 hover:bg-muted transition-colors text-xs font-bold text-rose-500 border-t border-border/50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </>
                    ) : (
                      <button 
                        className="w-full px-6 py-4 flex items-center gap-3 hover:bg-muted transition-colors text-xs font-bold text-muted-foreground"
                        onClick={() => setShowActions(false)}
                      >
                        Sin acciones disponibles
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !isUpdating && setIsEditing(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl bg-background rounded-[48px] shadow-2xl p-10 border border-border/50"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Edit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-serif font-black text-primary italic">Editar Post</h3>
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/60">Actualiza tu crónica</p>
                  </div>
                </div>
                <button onClick={() => setIsEditing(false)} className="p-3 hover:bg-muted rounded-2xl transition-all">
                  <X className="w-7 h-7 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-8">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full h-48 bg-muted/30 rounded-[32px] p-8 outline-none focus:ring-4 focus:ring-primary/5 transition-all text-base italic font-editorial resize-none"
                  required
                />

                <div className="flex gap-4 p-2">
                   <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 h-16 rounded-[24px] font-black text-[10px] uppercase tracking-widest"
                    onClick={() => setIsEditing(false)}
                   >
                     Cancelar
                   </Button>
                   <Button 
                    type="submit" 
                    disabled={isUpdating || !editContent.trim()}
                    className="flex-1 h-16 bg-primary text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20"
                   >
                     {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar Cambios'}
                   </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="space-y-10 relative z-10">
        <p className="text-2xl leading-relaxed text-primary/80 whitespace-pre-wrap font-serif italic lg:pr-20">{post.contenido}</p>
        
        {post.imagen_url && (
          <div className="rounded-[44px] overflow-hidden border border-border/20 shadow-high aspect-video relative group/img cursor-zoom-in">
             <img src={post.imagen_url} className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-[2s]" loading="lazy" />
             <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-1000" />
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="pt-6 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleToggleLike(post.id, 'post')}
              className={`flex items-center gap-3 px-10 py-5 rounded-[28px] font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 ${post.is_liked ? 'bg-accent text-white shadow-high' : 'bg-accent/5 text-accent hover:bg-accent/10 border border-accent/10'}`}
            >
              <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
              {post.likes_count > 0 ? post.likes_count : 'Vibras'}
            </button>

            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-4 px-10 py-5 rounded-[28px] font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-500 ${showComments ? 'bg-primary text-white shadow-high' : 'bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10'}`}
            >
              <MessageSquare className="w-5 h-5" />
              {showComments ? 'Cerrar' : `Ecos (${post.comments?.length || 0})`}
            </button>
          </div>

          <button className="w-16 h-16 flex items-center justify-center text-primary/20 hover:text-primary hover:bg-primary/5 rounded-[28px] transition-all hover:scale-110">
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Comments Section */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-10 space-y-8">
                {/* Comment Input */}
                {token && (
                  <form onSubmit={handleAddComment} className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex-shrink-0 flex items-center justify-center text-lg font-serif italic">
                      {username[0]}
                    </div>
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Deja tu comentario botánico..."
                      className="flex-1 h-14 bg-muted/30 rounded-[22px] px-6 text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all italic font-editorial"
                    />
                    <button 
                      type="submit"
                      disabled={isSubmittingComment || !commentText.trim()}
                      className="w-14 h-14 bg-primary text-white rounded-[22px] flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                  </form>
                )}

                {/* Comments List */}
                <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <CommentItem 
                        key={comment.id}
                        comment={comment}
                        isAdmin={!!isAdmin}
                        currentUser={user}
                        token={token}
                        onDelete={handleDeleteComment}
                        onReply={onReply}
                        onLikeToggle={handleToggleLike}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground/20 mb-4 scale-75">
                         <MessageSquare className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-text-secondary/30 italic">Silencio en el jardín... Sé el primero en comentar.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

