import React, { useState, useEffect } from 'react';
import { 
  X, Camera, MapPin, Leaf, User, MessageSquare, 
  Loader2, Check, AlertCircle, Plus, Trash2, Image as LucideImage
} from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  token: string;
  onUpdate: (data: any) => void;
}

export function EditProfileModal({ isOpen, onClose, profile, token, onUpdate }: EditProfileModalProps) {
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [favoritePlants, setFavoritePlants] = useState<string[]>(profile?.favorite_plants || []);
  const [newPlant, setNewPlant] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Image states
  const [profilePreview, setProfilePreview] = useState<string | null>(profile?.profile_pic_url);
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile?.banner_image_url);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername(profile?.username || '');
      setBio(profile?.bio || '');
      setLocation(profile?.location || '');
      setFavoritePlants(profile?.favorite_plants || []);
      setProfilePreview(profile?.profile_pic_url);
      setBannerPreview(profile?.banner_image_url);
    }
  }, [isOpen, profile]);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setProfilePreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploadingProfile(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/user/profile-pic', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ profile_pic_url: data.profile_pic_url });
      } else {
        setError('Error al subir foto de perfil');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const handleBannerImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploadingBanner(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/user/banner-pic', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        onUpdate({ banner_image_url: data.banner_image_url });
      } else {
        setError('Error al subir banner');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/user/update', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          bio,
          location,
          favorite_plants: favoritePlants,
          password: password || undefined
        })
      });

      if (res.ok) {
        onUpdate({
          username,
          bio,
          location,
          favorite_plants: favoritePlants
        });
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Error al actualizar perfil');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const addFavoritePlant = () => {
    if (newPlant && !favoritePlants.includes(newPlant)) {
      setFavoritePlants([...favoritePlants, newPlant]);
      setNewPlant('');
    }
  };

  const removeFavoritePlant = (plant: string) => {
    setFavoritePlants(favoritePlants.filter(p => p !== plant));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-background w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-2xl font-serif font-bold text-primary">Editar Perfil</h3>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-10">
            {/* Images Section */}
            <div className="space-y-6">
               <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Apariencia</label>
               
               {/* Banner Upload */}
               <div className="relative h-40 w-full rounded-[24px] overflow-hidden bg-muted group">
                 {bannerPreview ? (
                   <img src={bannerPreview} className="w-full h-full object-cover" alt="Banner Preview" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                     <LucideImage size={48} />
                   </div>
                 )}
                 <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white flex items-center gap-2">
                       <Camera size={24} />
                       <span className="text-sm font-bold">Cambiar Portada</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleBannerImageChange} />
                 </label>
                 {isUploadingBanner && (
                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                     <Loader2 className="w-10 h-10 animate-spin text-white" />
                   </div>
                 )}
               </div>

               {/* Profile Pic Upload */}
               <div className="relative -mt-16 ml-8 w-32 h-32 rounded-[32px] bg-background p-2 shadow-xl z-20 group">
                 <div className="w-full h-full bg-muted rounded-[24px] overflow-hidden relative">
                    {profilePreview ? (
                      <img src={profilePreview} className="w-full h-full object-cover" alt="Profile Preview" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <User size={32} />
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                       <Camera size={20} className="text-white" />
                       <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageChange} />
                    </label>
                 </div>
                 {isUploadingProfile && (
                   <div className="absolute inset-0 bg-black/40 rounded-[32px] flex items-center justify-center">
                     <Loader2 className="w-6 h-6 animate-spin text-white" />
                   </div>
                 )}
               </div>
            </div>

            {/* General Info */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Información General</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-4 flex items-center gap-1">
                    <User size={10} /> Nombre de Usuario
                  </label>
                  <input 
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full h-14 bg-muted/30 rounded-2xl px-6 outline-none focus:bg-white border-none shadow-inner transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-4 flex items-center gap-1">
                    <MapPin size={10} /> Ubicación
                  </label>
                  <input 
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Ej: Madrid, España"
                    className="w-full h-14 bg-muted/30 rounded-2xl px-6 outline-none focus:bg-white border-none shadow-inner transition-all font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                    <MessageSquare size={10} /> Biografía
                  </label>
                  <span className={`text-[10px] font-bold ${bio.length > 200 ? 'text-rose-500' : 'text-muted-foreground/40'}`}>
                    {bio.length}/200
                  </span>
                </div>
                <textarea 
                  value={bio}
                  onChange={e => setBio(e.target.value.slice(0, 200))}
                  placeholder="Cuenta algo sobre ti y tu pasión por las plantas..."
                  className="w-full h-32 bg-muted/30 rounded-[32px] p-6 outline-none focus:bg-white border-none shadow-inner transition-all font-medium resize-none text-sm leading-relaxed"
                />
              </div>
            </div>

            {/* Favorite Plants */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Plantas Favoritas</label>
              
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newPlant}
                  onChange={e => setNewPlant(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFavoritePlant())}
                  placeholder="Añadir especie favorita..."
                  className="flex-1 h-14 bg-muted/30 rounded-2xl px-6 outline-none border-none shadow-inner transition-all font-bold text-sm"
                />
                <Button 
                  type="button" 
                  onClick={addFavoritePlant}
                  className="h-14 w-14 rounded-2xl bg-primary text-white"
                >
                  <Plus />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {favoritePlants.map((plant, idx) => (
                  <motion.div 
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    key={plant + idx}
                    className="flex items-center gap-2 bg-primary/5 text-primary px-4 py-2 rounded-full border border-primary/10 shadow-sm"
                  >
                    <Leaf size={14} className="text-emerald-500" />
                    <span className="text-sm font-bold">{plant}</span>
                    <button 
                      type="button"
                      onClick={() => removeFavoritePlant(plant)}
                      className="ml-1 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="space-y-6">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Seguridad</label>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-4">Nueva Contraseña (opcional)</label>
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  className="w-full h-14 bg-muted/30 rounded-2xl px-6 outline-none focus:bg-white border-none shadow-inner transition-all font-bold"
                />
              </div>
            </div>
          </form>
        </div>

        {error && (
          <div className="px-8 py-3 bg-rose-50 text-rose-600 flex items-center gap-3 border-y border-rose-100">
            <AlertCircle size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{error}</span>
          </div>
        )}

        <div className="p-8 border-t border-border flex gap-4 bg-muted/20">
          <Button 
            type="submit"
            form="edit-profile-form"
            disabled={loading || isUploadingProfile || isUploadingBanner}
            className="flex-1 h-16 bg-primary text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Guardar Perfil</>}
          </Button>
          <Button 
            type="button"
            onClick={onClose}
            variant="ghost"
            className="px-10 h-16 rounded-[24px] font-black uppercase tracking-widest"
          >
            Cancelar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
