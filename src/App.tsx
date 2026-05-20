import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { PlantDetail } from './components/PlantDetail';
import { PostDetail } from './components/PostDetail';
import { AuthModal } from './components/AuthModal';
import { UserDashboard } from './components/UserDashboard';
import { UserProfile } from './components/UserProfile';
import { PlantScanner } from './components/PlantScanner';
import { CareCalendar } from './components/CareCalendar';
import { ForumFeed } from './components/ForumFeed';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { 
  Search, Sprout,
  LogIn, LogOut,  User, FolderHeart, Library, 
  ScanLine,
  Menu, X, ChevronRight, SlidersHorizontal,
  Calendar as CalendarIcon, CheckCircle2,
  Users
} from 'lucide-react';
import { Catalog } from './components/Catalog';
import { usePlantStore } from './store/usePlantStore';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';

import { GlobalLoader } from './components/GlobalLoader';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Zustand Store
  const { 
    fetchPlants: fetchCatalog,
    setSearchQuery: setStoreSearchQuery,
    setScrollPosition
  } = usePlantStore();
  
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Initial data fetch and app readiness
    const init = async () => {
      // Prefetch catalog query so that Catalog component loads instantly!
      queryClient.prefetchQuery({
        queryKey: ['catalog'],
        queryFn: async () => {
          const response = await fetch('/api/catalog');
          if (!response.ok) throw new Error('Error al cargar el catálogo');
          return response.json();
        },
      });
      await fetchCatalog();
      setTimeout(() => setAppReady(true), 800); // Small delay for smooth entry
    };
    init();
  }, [queryClient, fetchCatalog]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('search') || '');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync debounced search to URL query param and Zustand store
  useEffect(() => {
    if (location.pathname === '/') {
      const currentSearch = searchParams.get('search') || '';
      if (debouncedSearch !== currentSearch) {
        setSearchParams(
          debouncedSearch ? { search: debouncedSearch } : {},
          { replace: true }
        );
      }
    }
    setStoreSearchQuery(debouncedSearch);
  }, [debouncedSearch, location.pathname, setSearchParams, setStoreSearchQuery]);

  const handleScroll = (e: any) => {
    if (location.pathname === '/') {
      setScrollPosition(e.target.scrollTop);
    }
  };

  // Helper function to get current view based on path
  const currentView = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return 'catalogue';
    if (path === '/forum') return 'forum';
    if (path === '/scanner') return 'scanner';
    if (path === '/garden') return 'garden';
    if (path === '/calendar') return 'calendar';
    if (path === '/profile') return 'profile';
    if (path.startsWith('/plant/')) return 'details';
    return 'catalogue';
  }, [location.pathname]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estado de autenticación
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userPlantIds, setUserPlantIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const savedUser = localStorage.getItem('bloomy_user');
    const savedToken = localStorage.getItem('bloomy_token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const fetchUserPlantIds = async () => {
    if (!token) {
      setUserPlantIds(new Set());
      return;
    }
    try {
      const response = await fetch('/api/user/plants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setUserPlantIds(new Set(data.map((p: any) => p.plant_id)));
      }
    } catch (error) {
      console.error('Error fetching user plants:', error);
    }
  };

  useEffect(() => { fetchUserPlantIds(); }, [token]);

  const handleUserUpdate = (updatedData: any) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('bloomy_user', JSON.stringify(newUser));
  };

  const handleAuthSuccess = (newToken: string, userData: any) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('bloomy_token', newToken);
    localStorage.setItem('bloomy_user', JSON.stringify(userData));
    navigate('/garden');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('bloomy_token');
    localStorage.removeItem('bloomy_user');
    navigate('/', { replace: true });
  };

  const handleAddToGarden = async (plantId: number) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const response = await fetch('/api/user/plants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plant_id: plantId })
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al añadir planta');
      }

      await fetchUserPlantIds();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleRemoveFromGarden = async (userPlantId: number) => {
    if (!token) return;
    if (!confirm('¿Seguro que quieres eliminar esta planta de tu jardín?')) return;

    try {
      const response = await fetch(`/api/user/plants/${userPlantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchUserPlantIds();
        setSuccessMessage('¡Planta removida de tu jardín!');
        setTimeout(() => setSuccessMessage(null), 5000);
        if (currentView === 'details') {
          navigate('/garden');
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar la planta');
      }
    } catch (error) {
      console.error('Error removing plant:', error);
      alert('Error de conexión');
    }
  };

  const handleSelectPlant = (plant: any) => {
    // If it comes from garden it has plant_id, if it comes from catalog it has id
    const targetId = plant.plant_id || plant.id;
    if (targetId) navigate(`/plant/${targetId}`);
  };

  return (
    <div className="flex h-screen bg-background font-sans overflow-hidden selection:bg-primary/20 selection:text-primary">
      <AnimatePresence>
        {!appReady && <GlobalLoader key="loader" />}
      </AnimatePresence>
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-primary text-primary-foreground px-8 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border border-white/20 whitespace-nowrap"
          >
            <CheckCircle2 className="w-5 h-5" />
            {successMessage}
            <button onClick={() => setSuccessMessage(null)} className="ml-4 opacity-50 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[320px] flex-col h-full bg-background border-r p-12 z-40 relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
        
        <div className="flex items-center gap-4 cursor-pointer group mb-12" onClick={() => { setSearchQuery(''); navigate('/'); }}>
          <div className="group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
            <div className="w-14 h-14 bg-primary text-white rounded-[24px] flex items-center justify-center shadow-soft overflow-hidden relative">
               <Sprout className="w-8 h-8 relative z-10" />
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-serif font-black text-primary tracking-tighter leading-none italic">Bloomy</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1.5 ml-0.5">Horticultura</p>
          </div>
        </div>

        <div className="flex-1 space-y-12 overflow-y-auto custom-scrollbar pr-2">
          <section>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/20 mb-8 ml-4">Botánica</p>
            <nav className="flex flex-col gap-2">
              <NavItem active={currentView === 'catalogue'} onClick={() => navigate('/')} icon={<Library className="w-5 h-5" />} label="Catálogo" />
              <NavItem active={currentView === 'forum'} onClick={() => navigate('/forum')} icon={<Users className="w-5 h-5" />} label="Comunidad" />
              <NavItem active={currentView === 'scanner'} onClick={() => navigate('/scanner')} icon={<ScanLine className="w-5 h-5" />} label="Visión IA" />
            </nav>
          </section>

          {(user || true) && ( 
            <section className={!user ? 'opacity-30 pointer-events-none' : ''}>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/20 mb-8 ml-4">Cultivo</p>
              <nav className="flex flex-col gap-2">
                <NavItem active={currentView === 'garden'} onClick={() => navigate('/garden')} icon={<FolderHeart className="w-5 h-5" />} label="Mi Jardín" />
                <NavItem active={currentView === 'calendar'} onClick={() => navigate('/calendar')} icon={<CalendarIcon className="w-5 h-5" />} label="Cuidado" />
                <NavItem active={currentView === 'profile'} onClick={() => navigate('/profile')} icon={<User className="w-5 h-5" />} label="Ajustes" />
              </nav>
            </section>
          )}
        </div>

        <div className="mt-12 pt-8 border-t border-border/40">
          {!user ? (
            <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 text-center space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2">Comienza hoy</p>
              <p className="text-xs text-muted-foreground italic mb-4">Regístrate para guardar tus plantas y recibir consejos personalizados.</p>
              <Button 
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full h-12 bg-primary text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Iniciar Sesión
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                onClick={() => navigate('/profile')}
                className="p-4 glass rounded-[24px] flex items-center gap-4 border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-500 cursor-pointer group"
              >
                <div className="w-12 h-12 bg-primary text-white rounded-[18px] flex items-center justify-center shadow-xl shadow-primary/20 overflow-hidden font-serif italic text-xl group-hover:scale-105 transition-transform">
                  {user.profile_pic_url ? (
                    <img src={user.profile_pic_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (user.email || "B")[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-primary truncate leading-none mb-1">{user.username || (user.email || "").split('@')[0]}</p>
                  <p className="text-[10px] text-muted-foreground/60 truncate uppercase tracking-widest font-black italic">Mi Jardín</p>
                </div>
              </div>
              <Button 
                onClick={handleLogout}
                variant="ghost"
                className="w-full h-12 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </Button>
            </div>
          )}
          <div className="mt-8 text-center">
            <p className="text-[10px] text-muted-foreground/30 font-black tracking-[0.3em] uppercase">Bloomy &copy; 2026</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Header / Global Navbar */}
        <header className="h-28 lg:h-36 px-6 lg:px-16 flex items-center justify-between gap-8 sticky top-0 glass-header z-50 border-none">
          <div className="flex items-center gap-4 lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-3 hover:bg-muted rounded-2xl transition-all active:scale-95">
              <Menu className="w-6 h-6 text-primary" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSearchQuery(''); navigate('/'); }}>
               <h1 className="text-3xl font-serif font-black text-primary tracking-tighter italic">Bloomy</h1>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-8 min-w-[280px]">
             <div className="flex flex-col">
               <h2 className="text-5xl font-serif font-black text-text-primary tracking-tighter italic leading-none">
                 {currentView === 'catalogue' ? 'Catálogo' : 
                  currentView === 'forum' ? 'Comunidad' : 
                  currentView === 'scanner' ? 'Visión IA' : 
                  currentView === 'garden' ? 'Jardín' : 
                  currentView === 'calendar' ? 'Cuidado' :
                  currentView === 'details' ? 'Especie' : 'Perfil'}
               </h2>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/30 mt-2 ml-1">Herbolario Digital</p>
             </div>
          </div>

          {/* Persistent Search Bar */}
          <div className="flex-1 max-w-2xl flex items-center gap-2 group relative">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/20 group-focus-within:text-accent transition-colors z-10">
              <Search className="w-full h-full" />
            </div>
            <input 
              type="text" 
              placeholder="Encuentra tu próxima compañera..." 
              className="w-full h-16 lg:h-20 pl-16 pr-16 bg-white/50 backdrop-blur-md border border-border shadow-soft rounded-[32px] outline-none focus:ring-4 focus:ring-primary/5 text-lg font-medium transition-all text-text-primary placeholder:text-muted-foreground/30 font-editorial italic"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (location.pathname !== '/') navigate('/');
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-muted rounded-full transition-colors"
                title="Limpiar búsqueda"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
             {/* Desktop Filters Trigger */}
             <button 
               onClick={() => setIsFilterOpen(!isFilterOpen)}
               className={`hidden sm:flex p-3 rounded-2xl transition-all ${isFilterOpen ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-muted/50 hover:bg-muted text-primary'}`}
             >
               <SlidersHorizontal className="w-5 h-5" />
             </button>
             
             {!user ? (
               <button 
                onClick={() => setIsAuthModalOpen(true)} 
                className="flex items-center gap-2 px-4 sm:px-8 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all border border-white/10"
               >
                 <LogIn className="w-4 h-4" />
                 <span>Entrar</span>
               </button>
             ) : (
               <button 
                onClick={() => navigate('/profile')}
                className="flex items-center gap-3 group px-2 py-1.5 hover:bg-muted/30 rounded-2xl transition-all"
               >
                 <div className="text-right hidden sm:block">
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">{user.username || user.email.split('@')[0]}</p>
                   <p className="text-[9px] text-text-secondary italic font-serif">Mi Perfil</p>
                 </div>
                 <div className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center overflow-hidden border border-primary/10 group-hover:border-primary/30 transition-all shadow-sm">
                    {user.profile_pic_url ? (
                      <img src={user.profile_pic_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-serif italic text-lg">{(user.username || user.email || 'B')[0].toUpperCase()}</span>
                    )}
                 </div>
               </button>
             )}
          </div>
        </header>

        {/* View Content */}
        <div 
          className="flex-1 overflow-y-auto px-6 lg:px-12 pb-12 custom-scrollbar main-content-scroll scroll-smooth"
          onScroll={handleScroll}
        >
          {/* Active Search/Filters Info */}
          <div className="pt-8 mb-6">
            <AnimatePresence mode="popLayout">
              {debouncedSearch && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4 flex-wrap"
                >
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Filtrado por:</p>
                  <div className="flex gap-2 flex-wrap">
                    {debouncedSearch && (
                      <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-none rounded-lg flex items-center gap-2">
                        "{debouncedSearch}"
                        <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                      </Badge>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Filters Bar (removed difficulty filters) */}
          <AnimatePresence>
            {isFilterOpen && currentView === 'catalogue' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-8"
              >
                <div className="p-6 glass rounded-3xl border-none space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium italic text-muted-foreground ml-1">Usa la barra de búsqueda superior para filtrar plantas por nombre, especie o descripción.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="w-full flex-1 flex flex-col relative z-20"
            >
              <Routes location={location}>
                <Route path="/" element={
                  <Catalog 
                    userPlantIds={userPlantIds}
                    handleSelectPlant={handleSelectPlant}
                    handleAddToGarden={handleAddToGarden}
                  />
                } />

                <Route path="/plant/:id" element={
                  <PlantDetail 
                    isOpen={true} 
                    onClose={() => navigate(-1)} 
                    onAddToGarden={handleAddToGarden}
                    onRemoveFromGarden={handleRemoveFromGarden}
                    isAdded={userPlantIds.has(Number(location.pathname.split('/').pop()))}
                    fullPage={true}
                  />
                } />

                <Route path="/post/:id" element={
                  <PostDetail 
                    token={token} 
                    user={user} 
                    onAuthRequired={() => setIsAuthModalOpen(true)} 
                  />
                } />

                <Route path="/garden" element={
                  token ? (
                    <UserDashboard 
                      token={token} 
                      onLogout={handleLogout} 
                      onSwitchView={(view) => navigate(`/${view === 'catalogue' ? '' : view}`)} 
                      onSelectPlant={handleSelectPlant} 
                      onPlantDeleted={fetchUserPlantIds} 
                      onAuthError={handleLogout}
                    />
                  ) : <Navigate to="/" />
                } />

                <Route path="/calendar" element={
                  token ? <CareCalendar token={token} onAuthError={handleLogout} /> : <Navigate to="/" />
                } />

                <Route path="/forum" element={
                  <ForumFeed 
                     token={token} 
                     user={user} 
                     onAuthRequired={() => setIsAuthModalOpen(true)} 
                  />
                } />

                <Route path="/scanner" element={
                  token ? (
                    <PlantScanner 
                      token={token} 
                      onPlantSaved={() => { fetchUserPlantIds(); fetchCatalog(); navigate('/garden'); }} 
                      onAuthError={handleLogout}
                    />
                  ) : (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
                      <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center mb-8">
                        <ScanLine className="w-12 h-12 text-primary" />
                      </div>
                      <h3 className="text-3xl font-serif font-bold text-primary mb-4">¿Qué planta es esa?</h3>
                      <p className="text-muted-foreground mb-10 leading-relaxed italic">Usa nuestra IA entrenada para identificar miles de especies con solo una foto. Regístrate para empezar a coleccionar.</p>
                      <Button onClick={() => setIsAuthModalOpen(true)} className="w-full h-14 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20">
                        Entrar para Identificar
                      </Button>
                    </div>
                  )
                } />

                <Route path="/profile" element={
                  token ? (
                    <UserProfile 
                      token={token} 
                      onLogout={handleLogout} 
                      onUserUpdate={handleUserUpdate} 
                      onRefreshCatalog={fetchCatalog} 
                      onAuthError={handleLogout}
                    />
                  ) : <Navigate to="/" />
                } />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-[85%] max-w-[320px] h-full bg-background p-8 flex flex-col gap-8 shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3" onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}>
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-primary leading-tight">Bloomy</h1>
                    <p className="text-[8px] uppercase tracking-widest font-bold text-muted-foreground">Cuidado de Plantas</p>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Bloomy</span>
                <Sprout className="w-5 h-5 text-primary" />
              </div>

              <nav className="flex flex-col gap-2 mt-4">
                <MobileNavItem active={currentView === 'catalogue'} onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }} icon={<Library className="w-5 h-5" />} label="Descubrir" />
                <MobileNavItem active={currentView === 'forum'} onClick={() => { navigate('/forum'); setIsMobileMenuOpen(false); }} icon={<Users className="w-5 h-5" />} label="Comunidad" />
                <MobileNavItem active={currentView === 'scanner'} onClick={() => { navigate('/scanner'); setIsMobileMenuOpen(false); }} icon={<ScanLine className="w-5 h-5" />} label="Escáner IA" />
                {user && (
                  <>
                    <MobileNavItem active={currentView === 'garden'} onClick={() => { navigate('/garden'); setIsMobileMenuOpen(false); }} icon={<FolderHeart className="w-5 h-5" />} label="Mi Jardín" />
                    <MobileNavItem active={currentView === 'calendar'} onClick={() => { navigate('/calendar'); setIsMobileMenuOpen(false); }} icon={<CalendarIcon className="w-5 h-5" />} label="Calendario" />
                    <MobileNavItem active={currentView === 'profile'} onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }} icon={<User className="w-5 h-5" />} label="Mi Perfil" />
                  </>
                )}
              </nav>

              <div className="mt-auto pt-8">
                {user ? (
                   <div className="p-6 bg-muted/20 rounded-[32px] border border-primary/5">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-primary text-white rounded-[22px] flex items-center justify-center shadow-xl shadow-primary/20 overflow-hidden text-xl italic font-serif">
                          {user.profile_pic_url ? <img src={user.profile_pic_url} className="w-full h-full object-cover" /> : user.email[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-lg font-black text-primary leading-none">{user.username || user.email.split('@')[0]}</p>
                          </div>
                          <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 italic">Mi Perfil</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }} 
                        className="w-full h-12 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest"
                      >
                        Gestionar Cuenta
                      </Button>
                      <Button 
                        onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }} 
                        variant="ghost"
                        className="w-full h-12 mt-2 rounded-2xl text-red-500 font-black text-[10px] uppercase tracking-widest"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                      </Button>
                   </div>
                ) : (
                  <Button onClick={() => { setIsAuthModalOpen(true); setIsMobileMenuOpen(false); }} className="w-full h-16 bg-primary text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all">Iniciar Sesión</Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals - Removed PlantDetail from here as it is now a full page */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string, key?: any }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-500 font-semibold group relative ${
        active 
          ? 'bg-primary text-white shadow-soft ring-4 ring-primary/5' 
          : 'bg-transparent text-muted-foreground/60 hover:bg-secondary/50 hover:text-primary active:scale-95'
      }`}
    >
      <span className={`transition-all duration-500 ${active ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110 group-hover:-rotate-6'}`}>{icon}</span>
      <span className="text-[15px] tracking-tight">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator" 
          className="absolute inset-0 bg-primary rounded-3xl -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string, key?: any }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between px-6 py-4 rounded-2xl transition-all font-semibold ${
        active ? 'bg-primary/5 text-primary shadow-[inset_0_0_0_1px_rgba(74,93,78,0.1)]' : 'text-text-secondary hover:bg-muted'
      }`}
    >
      <div className="flex items-center gap-4">
        {active ? <div className="text-primary">{icon}</div> : icon}
        <span className="text-base">{label}</span>
      </div>
      <ChevronRight className={`w-4 h-4 transition-transform ${active ? 'opacity-100 rotate-0 text-primary' : 'opacity-20'}`} />
    </button>
  );
}
