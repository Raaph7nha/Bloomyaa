import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { 
  User, LogOut, Loader2, Sparkles, Database, RefreshCcw, 
  BrainCircuit, Image as LucideImage, Users, Sprout, 
  Settings, Terminal, Activity, Info, AlertCircle, 
  CheckCircle2, MapPin, Leaf, Award, Star, Calendar, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from './ui/badge';
import { EditProfileModal } from './EditProfileModal';

interface UserProfileProps {
  token: string;
  onLogout: () => void;
  onUserUpdate: (userData: any) => void;
  onRefreshCatalog: () => void;
  onAuthError?: () => void;
}

export function UserProfile({ token, onLogout, onUserUpdate, onRefreshCatalog, onAuthError }: UserProfileProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userPlants, setUserPlants] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [adminLogs, setAdminLogs] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [imageStats, setImageStats] = useState<any>(null);
  const [repairProgress, setRepairProgress] = useState<{
    current: number;
    total: number;
    results: any[];
    isRunning: boolean;
  }>({ current: 0, total: 0, results: [], isRunning: false });
  
  // Smart Import State
  const [importKeywords, setImportKeywords] = useState('rosa, cactus, ficus, suculenta, monstera');
  const [importLimit, setImportLimit] = useState(25);
  const [deleteKeywords, setDeleteKeywords] = useState('');

  const [continuousProgress, setContinuousProgress] = useState<{
    total: number,
    procesadas: number,
    restantes: number,
    porcentaje: number,
    is_running: boolean
  } | null>(null);

  // Polling para progreso continuo (Solo si es ADMIN)
  useEffect(() => {
    if (!profile?.is_admin || !token) return;

    let interval: NodeJS.Timeout;
    const checkProgress = async () => {
      try {
        const res = await fetch('/api/ai/generation-progress', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setContinuousProgress(data);
        }
      } catch (error) {
        console.error('Error polling AI progress:', error);
      }
    };

    checkProgress();
    interval = setInterval(checkProgress, 5000);
    return () => clearInterval(interval);
  }, [token, profile?.is_admin]);

  const fetchImageStats = async () => {
    if (!profile?.is_admin || !token) return;
    try {
      const res = await fetch('/api/admin/image-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setImageStats(data);
      }
    } catch (error) {
      console.error('Error fetching image stats:', error);
    }
  };

  useEffect(() => {
    fetchImageStats();
  }, [token, profile?.is_admin]);

  const addLog = (msg: string) => {
    setAdminLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleImageRepairAction = async (endpoint: string, label: string) => {
    setAdminLoading(label);
    setAdminStatus(null);
    setAdminLogs([]);
    setRepairProgress(prev => ({ ...prev, isRunning: true, results: [], current: 0 }));
    addLog(`Iniciando reparación de imágenes: ${label.toUpperCase()}...`);

    const runBatch = async (offset: number = 0) => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ batchSize: 5, offset })
        });

        if (!res.ok) throw new Error('Error en el lote');
        const data = await res.json();
        
        if (data.results && data.results.length > 0) {
          setRepairProgress(prev => ({
            ...prev,
            current: offset + data.results.length,
            results: [...prev.results, ...data.results]
          }));
          
          data.results.forEach((r: any) => {
            const statusIcon = r.success ? '✔' : '❌';
            const sourceInfo = r.source ? `[${r.source}]` : '';
            addLog(`${statusIcon} ${r.nombre}: ${r.status} ${sourceInfo}`);
          });

          // Si hay más (esto depende de si el endpoint nos dice si hay más)
          // El endpoint reprocess-images devuelve nextOffset
          if (data.nextOffset !== undefined) {
             await runBatch(data.nextOffset);
          } else if (data.count > 0 && label === 'fix-images') {
             // Para fix-images seguimos pidiendo hasta que count sea 0
             await runBatch(0);
          } else {
             finishRepair();
          }
        } else {
          finishRepair();
        }
      } catch (err: any) {
        addLog(`ERROR LOTE: ${err.message}`);
        finishRepair(err.message);
      }
    };

    const finishRepair = (error?: string) => {
      setAdminLoading(null);
      setRepairProgress(prev => ({ ...prev, isRunning: false }));
      if (error) {
        setAdminStatus({ message: `Reparación interrumpida: ${error}`, type: 'error' });
      } else {
        setAdminStatus({ message: 'Reparación de imágenes finalizada correctamente.', type: 'success' });
      }
      fetchImageStats();
      onRefreshCatalog();
    };

    await runBatch(0);
  };

  const handleAdminAction = async (endpoint: string, label: string, options: RequestInit = {}) => {
    setAdminLoading(label);
    setAdminStatus(null);
    setAdminLogs([]);
    addLog(`Iniciando operación: ${label.toUpperCase()}...`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (response.status === 401) {
        onAuthError?.();
        return;
      }

      const data = await response.json();
      
      if (response.ok && (data.success || data.saved !== undefined)) {
        addLog(`Proceso finalizado.`);
        if (data.logs && Array.isArray(data.logs)) {
          data.logs.forEach((l: string) => addLog(l));
        }

        if (data.totalFetched !== undefined) addLog(`Total encontrados: ${data.totalFetched}`);
        addLog(`Guardados: ${data.saved || 0}`);
        addLog(`Omitidos/Duplicados: ${data.skipped || 0}`);
        if (data.enriched) addLog(`Enriquecidos con PlantNet: ${data.enriched}`);
        if (data.imagesFixed) addLog(`Imágenes corregidas (Pexels): ${data.imagesFixed}`);
        if (data.deleted) addLog(`Eliminados: ${data.deleted}`);
        
        let msg = 'Operación completada.';
        if (label === 'import-smart') msg = `Importación inteligente finalizada: ${data.saved} plantas guardadas.`;
        if (label === 'refresh-catalog') msg = `Catálogo actualizado: ${data.saved} plantas procesadas con éxito.`;
        if (label === 'fix-images') msg = `Reparación de imágenes finalizada: ${data.saved} reparadas.`;
        if (label === 'ai-regenerate') msg = `IA: ${data.saved} descripciones regeneradas por completo.`;
        if (label === 'ai-missing') msg = `IA: ${data.saved} descripciones faltantes completadas.`;
        if (label === 'delete-plants') msg = `Limpieza exitosa: ${data.deleted} plantas eliminadas del catálogo.`;

        setAdminStatus({ message: msg, type: 'success' });
        onRefreshCatalog();
      } else {
        throw new Error(data.error || 'Error desconocido en el servidor');
      }
    } catch (error: any) {
      console.error('Admin action error:', error);
      let errorMsg = error.message || 'Error de conexión';
      addLog(`ERROR: ${errorMsg}`);
      setAdminStatus({ message: errorMsg, type: 'error' });
    } finally {
      setAdminLoading(null);
    }
  };

  const handleUserUpdateInternal = (newData: any) => {
    setProfile((prev: any) => ({ ...prev, ...newData }));
    onUserUpdate(newData);
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const [profileRes, postsRes, plantsRes] = await Promise.all([
          fetch('/api/user/profile', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/posts/user', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/user/plants', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (profileRes.status === 401) {
          onAuthError?.();
          return;
        }

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
        }
        if (postsRes.ok) setUserPosts(await postsRes.json());
        if (plantsRes.ok) setUserPlants(await plantsRes.json());

      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isNew = profile?.created_at && (new Date().getTime() - new Date(profile.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;
  const isActive = (profile?.plantCount || 0) > 5 || userPosts.length > 3;
  const isExpert = (profile?.plantCount || 0) > 15 || profile?.is_admin;

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background rounded-[48px] border border-border/40 overflow-hidden relative shadow-high"
      >
        <div className="relative">
          {/* Banner */}
          <div className="h-72 sm:h-96 w-full relative group">
            {profile?.banner_image_url ? (
              <img src={profile.banner_image_url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Banner" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-primary/20 to-secondary/30 transition-colors duration-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            
            {/* Quick Stats Overlay - Desktop */}
            <div className="absolute top-10 right-12 hidden md:flex gap-6 z-20">
               <div className="bg-white/40 backdrop-blur-2xl px-8 py-5 rounded-[32px] flex flex-col items-center border border-white/20 shadow-soft">
                  <span className="text-3xl font-serif font-black text-primary">{profile?.plantCount || 0}</span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-primary/40 font-black mt-1">Especies</span>
               </div>
               <div className="bg-white/40 backdrop-blur-2xl px-8 py-5 rounded-[32px] flex flex-col items-center border border-white/20 shadow-soft">
                  <span className="text-3xl font-serif font-black text-primary">{profile?.postCount || userPosts.length}</span>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-primary/40 font-black mt-1">Vivencias</span>
               </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 w-full px-8 sm:px-16 translate-y-1/2 flex flex-col sm:flex-row items-end gap-8 sm:gap-12 z-30">
            <div className="relative group">
              <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-[56px] bg-background p-3 shadow-high overflow-hidden ring-1 ring-border/20">
                <div className="w-full h-full bg-muted rounded-[44px] overflow-hidden group relative">
                  {profile?.profile_pic_url ? (
                    <img src={profile.profile_pic_url} alt="Profile" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary/10 bg-muted">
                      <User className="w-20 h-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              {profile?.is_admin && (
                <div className="absolute -top-2 -right-2 bg-accent text-white p-3 rounded-[24px] shadow-high ring-8 ring-background">
                  <Award size={24} />
                </div>
              )}
            </div>

            <div className="flex-1 pb-6 flex flex-col sm:flex-row justify-between items-end sm:items-center w-full">
               <div className="space-y-2">
                  <h2 className="text-5xl sm:text-7xl font-serif font-black text-primary tracking-tighter italic leading-none transition-all">
                    {profile?.username}
                  </h2>
                  <div className="flex items-center gap-6 text-muted-foreground font-semibold text-sm">
                    {profile?.location && (
                      <span className="flex items-center gap-2"><MapPin size={16} className="text-accent" /> {profile.location}</span>
                    )}
                    <span className="flex items-center gap-2"><Calendar size={16} className="text-primary/30" /> Miembro desde May 2024</span>
                  </div>
               </div>

               <div className="flex gap-4 pt-6 sm:pt-0">
                  <Button 
                    onClick={() => setIsEditModalOpen(true)}
                    className="bg-primary text-white h-16 px-10 rounded-[28px] font-black text-[11px] uppercase tracking-[0.2em] shadow-high hover:scale-[1.05] active:scale-95 transition-all"
                  >
                    Personalizar Perfil
                  </Button>
               </div>
            </div>
          </div>
        </div>

        <div className="pt-32 sm:pt-48 px-8 sm:px-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
            
            <div className="lg:col-span-4 space-y-16">
               <section className="space-y-8">
                 <p className="text-[11px] uppercase font-black tracking-[0.3em] text-primary/20 ml-2">Historia</p>
                 <div className="prose prose-sm italic font-serif text-2xl leading-relaxed text-primary/70 opacity-80 decoration-accent/10 underline underline-offset-8">
                    {profile?.bio || 'Buscando el equilibrio entre el sol y la sombra. Cultivando momentos.'}
                 </div>
               </section>

               <section className="space-y-8">
                 <p className="text-[11px] uppercase font-black tracking-[0.3em] text-primary/20 ml-2">Reconocimientos</p>
                 <div className="flex flex-wrap gap-4">
                    {isNew && (
                      <div className="bg-secondary/50 text-secondary-foreground border border-primary/5 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-soft translate-y-0 hover:-translate-y-1 transition-all cursor-default">
                        <Star size={14} className="text-accent" fill="currentColor" /> Brote Nuevo
                      </div>
                    )}
                    {isActive && (
                      <div className="bg-primary text-white px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-high translate-y-0 hover:-translate-y-1 transition-all cursor-default">
                        <Leaf size={14} fill="currentColor" /> Jardinero Fiel
                      </div>
                    )}
                    {isExpert && (
                      <div className="bg-accent text-white px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-high translate-y-0 hover:-translate-y-1 transition-all cursor-default">
                        <Award size={14} fill="currentColor" /> Maestro de la Savia
                      </div>
                    )}
                 </div>
               </section>

               <Button 
                onClick={onLogout}
                variant="ghost"
                className="w-full justify-start h-14 rounded-[24px] text-rose-500 hover:bg-rose-50/50 hover:text-rose-600 font-black uppercase text-[10px] tracking-[0.2em] px-6 border border-transparent hover:border-rose-100 transition-all"
               >
                 <LogOut className="w-5 h-5 mr-4" /> Dejar el Jardín
               </Button>
            </div>

            <div className="lg:col-span-8 space-y-20">
               <section className="bg-muted/20 p-10 sm:p-14 rounded-[56px] border border-border/40 relative">
                 <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <Sprout size={120} className="text-primary rotate-12" />
                 </div>
                 
                 <div className="flex items-center justify-between mb-12 relative z-10">
                    <div className="space-y-1">
                      <h4 className="text-4xl font-serif font-black text-primary italic">Invernadero</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/30">Mis especies en custodia</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/garden')}
                      className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/20 hover:bg-primary hover:text-white px-6 h-10 rounded-full transition-all"
                    >
                      Ampliar
                    </Button>
                 </div>
                 
                 {userPlants.length > 0 ? (
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-8 relative z-10">
                      {userPlants.slice(0, 6).map((plant, index) => (
                        <div 
                          key={`preview-plant-v2-${plant.plant_id || plant.id || index}`} 
                          onClick={() => navigate(`/plant/${plant.plant_id || plant.id}`)}
                          className="group relative aspect-[4/5] rounded-[40px] overflow-hidden bg-background border border-border/20 cursor-pointer shadow-soft hover:shadow-high transition-all"
                        >
                           <img 
                            src={plant.imagen_url || "/placeholder-plant.png"} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                            alt={plant.nombre}
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                              <p className="text-white text-base font-serif font-bold italic leading-tight">{plant.nombre_personalizado || plant.nombre}</p>
                           </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="py-20 border-4 border-dashed border-primary/5 rounded-[48px] text-center bg-white/20">
                      <Sprout className="w-16 h-16 text-primary/10 mx-auto mb-6" />
                      <p className="text-lg font-serif italic text-primary/40">Tu santuario está a la espera de habitantes.</p>
                      <Button 
                        onClick={() => navigate('/')} 
                        className="mt-8 bg-primary text-white px-8 py-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-high"
                      >
                        Descubrir Semillas
                      </Button>
                   </div>
                 )}
               </section>

               <section className="p-10 border border-border rounded-[56px] bg-white/50">
                 <div className="flex items-center justify-between mb-12">
                    <div className="space-y-1">
                      <h4 className="text-4xl font-serif font-black text-primary italic">Bitácora</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/30">Relatos compartidos</p>
                    </div>
                  </div>

                 {userPosts.length > 0 ? (
                    <div className="space-y-8">
                      {userPosts.slice(0, 3).map((post, index) => (
                        <div 
                          key={`preview-post-v2-${post.id || index}`} 
                          onClick={() => navigate(`/post/${post.id}`)}
                          className="bg-background p-10 rounded-[44px] border border-border/40 hover:shadow-high transition-all duration-700 flex flex-col sm:flex-row gap-10 cursor-pointer group"
                        >
                           {post.imagen_url && (
                             <div className="w-full sm:w-32 h-64 sm:h-32 rounded-[32px] overflow-hidden shrink-0 shadow-soft">
                               <img src={post.imagen_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Post" />
                             </div>
                           )}
                           <div className="flex-1 min-w-0 flex flex-col justify-center gap-6">
                              <div className="flex items-center gap-6">
                                 <div className="bg-secondary/50 text-primary text-[9px] font-black uppercase px-4 py-2 border-none tracking-[0.2em] rounded-full">
                                   {post.tipo}
                                 </div>
                                 <span className="text-[11px] text-primary/20 font-black uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-xl font-serif text-primary/80 leading-relaxed line-clamp-2 italic">"{post.contenido}"</p>
                           </div>
                        </div>
                      ))}
                    </div>
                 ) : (
                   <div className="py-20 border-4 border-dashed border-primary/5 rounded-[48px] text-center outline-none">
                      <Users className="w-16 h-16 text-primary/10 mx-auto mb-6" />
                      <p className="text-lg font-serif italic text-primary/40">Tu voz aún no se ha escuchado en el jardín común.</p>
                      <Button 
                        onClick={() => navigate('/forum')} 
                        variant="ghost"
                        className="mt-8 text-primary font-black uppercase text-[10px] tracking-widest"
                      >
                        Unirse a la Charla
                      </Button>
                   </div>
                 )}
               </section>
            </div>
          </div>
        </div>

        <AnimatePresence>
            {isEditModalOpen && (
              <EditProfileModal 
                key="edit-profile-modal"
                isOpen={true} 
                onClose={() => setIsEditModalOpen(false)}
                profile={profile}
                token={token}
                onUpdate={handleUserUpdateInternal}
              />
            )}
          </AnimatePresence>

          {/* Admin Section - Modular SaaS Design */}
          {profile?.is_admin && (
            <div className="mt-16 pt-16 border-t border-primary/10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div className="flex items-center gap-6">
                  <div className="p-5 bg-primary text-white rounded-[32px] shadow-2xl shadow-primary/30">
                    <Settings size={32} />
                  </div>
                  <div>
                    <h3 className="text-4xl font-serif font-bold text-primary tracking-tight">Panel de Control Admin</h3>
                    <p className="text-sm text-muted-foreground font-medium mt-1 uppercase tracking-[0.15em]">SaaS Plant Management System</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-2xl border border-primary/10">
                  <Activity className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-[10px] uppercase font-black tracking-widest text-primary">Estado: Sistema Activo</span>
                </div>
              </div>

              {/* Monitor de Estado y Logs */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
                <div className="lg:col-span-8">
                   {adminStatus && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className={`p-6 rounded-[32px] border-2 flex items-start gap-5 mb-0 h-full ${
                         adminStatus.type === 'success' ? 'bg-green-50/50 border-green-100 text-green-800' : 
                         adminStatus.type === 'error' ? 'bg-red-50/50 border-red-100 text-red-800' : 
                         'bg-blue-50/50 border-blue-100 text-blue-800'
                       }`}
                     >
                       <div className={`mt-1 p-3 rounded-2xl ${
                         adminStatus.type === 'success' ? 'bg-green-100' : 
                         adminStatus.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                       }`}>
                         {adminStatus.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                         {adminStatus.type === 'error' && <AlertCircle className="w-6 h-6" />}
                         {adminStatus.type === 'info' && <Info className="w-6 h-6" />}
                       </div>
                       <div>
                         <h4 className="font-serif font-bold text-xl mb-1 capitalize">{adminStatus.type}</h4>
                         <p className="text-sm font-medium leading-relaxed">{adminStatus.message}</p>
                       </div>
                     </motion.div>
                   )}
                   
                   {!adminStatus && !adminLoading && (
                     <div className="p-10 border-2 border-dashed border-primary/10 rounded-[40px] flex flex-col items-center justify-center text-center opacity-40 h-full">
                       <Database className="w-12 h-12 mb-4 text-primary" />
                       <p className="text-sm font-bold uppercase tracking-widest text-primary">Listo para operar</p>
                       <p className="text-xs mt-2 italic">Selecciona una herramienta abajo para comenzar</p>
                     </div>
                   )}

                   {adminLoading && (
                     <div className="p-10 bg-primary/5 rounded-[40px] border border-primary/10 flex flex-col items-center justify-center text-center h-full">
                       <Loader2 className="w-12 h-12 mb-4 text-primary animate-spin" />
                       <p className="text-2xl font-serif font-bold text-primary mb-2 italic">Procesando solicitud...</p>
                       <p className="text-xs uppercase font-black tracking-widest text-primary/60">Operación: {adminLoading}</p>
                     </div>
                   )}
                </div>

                <div className="lg:col-span-4">
                  <div className="bg-black/90 text-zinc-400 p-6 rounded-[32px] h-full min-h-[200px] border border-white/5 font-mono text-[10px] shadow-2xl relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-emerald-500" />
                        <span className="uppercase font-black text-emerald-500 tracking-widest">Logs de Ejecución</span>
                      </div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    </div>
                    <div className="space-y-1.5 h-32 overflow-y-auto custom-scrollbar pr-2">
                       {adminLogs.length > 0 ? (
                         adminLogs.map((log, idx) => (
                           <div key={idx} className="flex gap-2">
                             <span className="text-zinc-600">[{idx+1}]</span>
                             <span className="text-zinc-300">{log}</span>
                           </div>
                         ))
                       ) : (
                         <span className="text-zinc-600 block italic py-4">Esperando actividad del sistema...</span>
                       )}
                    </div>
                    {/* Glass glare effect */}
                    <div className="absolute top-0 right-0 w-24 h-full bg-white/5 skew-x-12 translate-x-12 group-hover:translate-x-0 transition-transform duration-1000 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* MÓDULOS DE ADMINISTRACIÓN */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                
                {/* 1. IMPORTACIÓN INTELIGENTE CONSOLIDADA */}
                <div className="bg-white rounded-[48px] p-8 border border-primary/5 shadow-sm hover:shadow-2xl transition-all duration-700 group flex flex-col md:col-span-2 border-t-4 border-t-blue-400">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Sprout size={32} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-serif font-black text-primary">Importación Inteligente</h4>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">Multi-API Catalog Ingestion</p>
                    </div>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-3 italic">Keywords separated by commas</label>
                       <textarea 
                         value={importKeywords}
                         onChange={(e) => setImportKeywords(e.target.value)}
                         placeholder="Ej: rosa, cactus, ficus, suculenta, monstera..."
                         className="w-full h-24 bg-muted/20 rounded-2xl p-6 outline-none border border-transparent focus:border-blue-200 transition-all font-medium text-sm resize-none"
                       />
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-3">
                         <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground italic">Plants per keyword</label>
                         <span className="text-sm font-bold text-blue-600">{importLimit}</span>
                       </div>
                       <input 
                         type="range" 
                         min="1" 
                         max="100" 
                         value={importLimit}
                         onChange={(e) => setImportLimit(parseInt(e.target.value))}
                         className="w-full accent-blue-500"
                       />
                    </div>

                    <Button 
                      onClick={() => handleAdminAction('/api/admin/import-smart', 'import-smart', {
                        body: JSON.stringify({ 
                          keywords: importKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0),
                          maxPerKeyword: importLimit 
                        })
                      })}
                      disabled={!!adminLoading || !importKeywords}
                      className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[32px] font-black uppercase tracking-widest shadow-xl shadow-blue-200 group-hover:scale-[1.02] transition-all"
                    >
                      {adminLoading === 'import-smart' ? (
                        <div className="flex items-center gap-3">
                          <Loader2 className="animate-spin" />
                          Procesando Lote...
                        </div>
                      ) : 'Iniciar Importación de Lote'}
                    </Button>
                  </div>
                  <p className="mt-6 text-[10px] text-center text-muted-foreground font-medium italic border-t border-dashed border-primary/10 pt-4">
                    Integra Perenual (datos), PlantNet (validación), Pexels (fallback) y Cloudinary (alojamiento).
                  </p>
                </div>

                {/* 2 & 3: MANTENIMIENTO Y REPARACIÓN */}
                <div className="space-y-8">
                  {/* Actualizar Catálogo */}
                  <div className="bg-white rounded-[40px] p-8 border border-primary/5 shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
                     <div className="flex items-center gap-6 mb-6">
                        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:rotate-180 transition-transform duration-700">
                          <RefreshCcw size={28} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-serif font-bold text-primary">Actualizar Catálogo</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">Normaliza riego, luz y completa metadatos técnicos de todas las plantas existentes.</p>
                        </div>
                     </div>
                     <Button 
                        onClick={() => handleAdminAction('/api/admin/refresh-catalog', 'refresh-catalog')}
                        disabled={!!adminLoading}
                        className="w-full h-14 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-amber-200"
                     >
                       Sincronizar Maestro
                     </Button>
                  </div>

                  {/* Reparar Imágenes */}
                  <div className="bg-white rounded-[40px] p-8 border border-primary/5 shadow-sm hover:shadow-2xl transition-all duration-700 group relative overflow-hidden">
                     <div className="flex items-center gap-6 mb-6">
                        <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-600 group-hover:scale-110 transition-transform">
                          <LucideImage size={28} />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-serif font-bold text-primary">Gestión de Imágenes v2</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mt-1">Detecta URLs rotas, busca en Pexels y persiste en Cloudinary automáticamente.</p>
                        </div>
                     </div>
                     <Button 
                        onClick={() => handleImageRepairAction('/api/admin/images/fix', 'fix-images')}
                        disabled={!!adminLoading}
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-200"
                     >
                       Reparar Pendientes
                     </Button>
                     <Button 
                        onClick={() => handleImageRepairAction('/api/admin/images/reprocess', 'reprocess-images')}
                        disabled={!!adminLoading}
                        variant="outline"
                        className="w-full mt-4 h-12 border-pink-200 text-pink-600 hover:bg-pink-50 rounded-2xl font-black uppercase tracking-widest text-[10px]"
                     >
                        Reprocesar Catálogo Completo
                     </Button>

                     {repairProgress.isRunning && (
                        <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Progreso</span>
                            <span className="text-xs font-black text-primary">{Math.min(100, Math.round((repairProgress.current / (imageStats?.stats.total || 1)) * 100))}%</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (repairProgress.current / (imageStats?.stats.total || 1)) * 100)}%` }}
                              className="h-full bg-pink-500 rounded-full"
                            />
                          </div>
                        </div>
                     )}

                     {imageStats && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                           <div className="p-3 bg-muted/30 rounded-xl text-center">
                              <p className="text-xl font-black text-emerald-600">{imageStats.stats.validated}</p>
                              <p className="text-[8px] uppercase font-black text-muted-foreground">Validadas</p>
                           </div>
                           <div className="p-3 bg-muted/30 rounded-xl text-center">
                              <p className="text-xl font-black text-rose-500">{imageStats.stats.invalid_or_missing}</p>
                              <p className="text-[8px] uppercase font-black text-muted-foreground">Restantes</p>
                           </div>
                        </div>
                     )}
                  </div>
                </div>

                {/* 4. GESTIÓN IA DE DESCRIPCIONES */}
                <div className="bg-white rounded-[48px] p-8 border border-primary/5 shadow-sm hover:shadow-2xl transition-all duration-700 group border-l-4 border-l-indigo-500">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-indigo-50 rounded-[28px] flex items-center justify-center text-indigo-600 group-hover:rotate-12 transition-transform">
                      <BrainCircuit size={32} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-serif font-black text-primary">IA Content Engine</h4>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">LLaMA 3.1 & Groq SDK</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-8">
                    <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 flex gap-4">
                       <Sparkles className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                       <div className="text-sm text-indigo-900 leading-relaxed font-medium italic">
                         "Genera descripciones empáticas, claras y basadas en datos reales para maximizar la satisfacción del usuario."
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button 
                       onClick={() => handleAdminAction('/api/admin/ai/regenerate-all', 'ai-regenerate')}
                       disabled={!!adminLoading}
                       variant="outline"
                       className="h-20 rounded-3xl border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-xs uppercase text-center leading-tight tracking-widest"
                    >
                      Renovar Todas <br/> las Descripciones
                    </Button>
                    <Button 
                       onClick={() => handleAdminAction('/api/admin/ai/generate-missing', 'ai-missing')}
                       disabled={!!adminLoading}
                       className="h-20 rounded-3xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all font-bold text-xs uppercase text-center leading-tight tracking-widest shadow-xl shadow-indigo-100"
                    >
                      Completar Solo <br/> Nuevas / Faltantes
                    </Button>
                  </div>
                  
                  {continuousProgress && (
                    <div className="mt-6 p-4 bg-muted/20 rounded-2xl flex items-center justify-between text-[11px] font-bold text-primary/60 uppercase tracking-widest">
                       <span>Progreso Global IA:</span>
                       <span className="text-indigo-600">{continuousProgress.porcentaje}% Completado</span>
                    </div>
                  )}
                </div>

                {/* 5. ELIMINAR Y LIMPIEZA */}
                <div className="bg-white rounded-[48px] p-8 border border-primary/5 shadow-sm hover:shadow-2xl transition-all duration-700 group border-l-4 border-l-red-500">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-16 h-16 bg-red-50 rounded-[28px] flex items-center justify-center text-red-600 group-hover:scale-95 transition-transform">
                      <Trash2 size={32} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-serif font-black text-primary">Limpieza Masiva</h4>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">Database Integrity Guard</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-3 italic">Palabras clave para depuración (separadas por coma)</label>
                       <textarea 
                         value={deleteKeywords}
                         onChange={(e) => setDeleteKeywords(e.target.value)}
                         placeholder="Ej: mala hierba, pasto, desconocido, fake..."
                         className="w-full h-32 bg-muted/20 rounded-3xl p-6 outline-none border border-transparent focus:border-red-200 focus:bg-white transition-all font-medium text-sm resize-none"
                       />
                    </div>

                    <Button 
                      onClick={() => handleAdminAction('/api/admin/delete-plants', 'delete-plants', {
                        body: JSON.stringify({ keywords: deleteKeywords })
                      })}
                      disabled={!!adminLoading || !deleteKeywords}
                      className="w-full h-16 bg-red-600 hover:bg-red-700 text-white rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-red-200"
                    >
                      Ejecutar Purga Irreversible
                    </Button>
                  </div>
                  <p className="mt-4 text-[10px] text-center text-red-500 font-bold italic blink-fast">⚠️ ADVERTENCIA: Esta acción no se puede deshacer.</p>
                </div>

              </div>
            </div>
          )}

          {/* Footer Stats and Lists */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <StatCard label="Plantas en mi Jardín" value={profile?.plantCount?.toString() || "0"} />
            <StatCard label="Publicaciones" value={userPosts.length.toString()} />
          </div>

          {/* Listas Detalladas */}
          <div className="mt-16 space-y-16">
            {/* Mis Plantas */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Sprout className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-primary">Mis Plantas</h3>
              </div>
              
              {userPlants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {userPlants.map((plant, index) => (
                    <div 
                      key={`full-plant-${plant.plant_id || plant.id || index}`} 
                      onClick={() => navigate(`/plant/${plant.plant_id || plant.id}`)}
                      className="group relative aspect-square rounded-[32px] overflow-hidden border bg-muted/30 cursor-pointer hover:shadow-xl transition-all"
                    >
                       <img 
                        src={plant.imagen_url || "/placeholder-plant.png"} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <p className="text-white text-xs font-bold truncate">{plant.nombre_personalizado || plant.nombre}</p>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-sm">Aún no tienes plantas en tu jardín.</p>
              )}
            </section>

            {/* Mis Publicaciones */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-primary">Mis Publicaciones</h3>
              </div>

              {userPosts.length > 0 ? (
                <div className="space-y-4">
                  {userPosts.map((post, index) => (
                    <div 
                      key={`full-post-${post.id || index}`} 
                      onClick={() => navigate(`/post/${post.id}`)}
                      className="p-6 bg-muted/20 rounded-[32px] border border-primary/5 flex gap-4 cursor-pointer hover:bg-white hover:shadow-xl transition-all group"
                    >
                       {post.imagen_url && (
                         <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                           <img src={post.imagen_url} className="w-full h-full object-cover" />
                         </div>
                       )}
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <Badge variant={post.tipo === 'ayuda' ? 'destructive' : 'secondary'} className="text-[8px] uppercase tracking-widest px-2">
                               {post.tipo}
                             </Badge>
                             <span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm font-medium line-clamp-2">{post.contenido}</p>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic text-sm">No has publicado nada todavía.</p>
              )}
            </section>
          </div>
        </motion.div>
      </div>
    );
}

function StatCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/5 text-center transition-all hover:-translate-y-1 hover:shadow-xl hover:bg-white/50">
       <p className="text-3xl font-serif font-bold text-primary mb-1">{value}</p>
       <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em]">{label}</p>
    </div>
  );
}
