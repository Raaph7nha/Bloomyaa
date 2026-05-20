import React, { useState, useEffect } from 'react';
import { Plant } from '../types';
import { Button } from './ui/button';
import { 
  Sprout, 
  Trash2, 
  Plus, 
  Loader2, 
  Droplets, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  Leaf,
  X
} from 'lucide-react';
import { Badge } from './ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { PlantCardSkeleton } from './ui/skeleton';

// SortType removed as it was unused

interface UserDashboardProps {
  token: string;
  onLogout: () => void;
  onSwitchView: (view: any) => void;
  onSelectPlant: (plant: Plant) => void;
  onPlantDeleted: () => void;
  onAuthError?: () => void;
}

export function UserDashboard({ token, onSwitchView, onSelectPlant, onPlantDeleted, onAuthError }: UserDashboardProps) {
  const [userPlants, setUserPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUserPlants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/plants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        onAuthError?.();
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setUserPlants(data);
    } catch (error) {
      console.error('Error fetching user plants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPlants();
  }, [token]);

  const handleAction = async (userPlantId: number, type: 'water' | 'fertilize', e: React.MouseEvent) => {
    e.stopPropagation();
    const actionKey = `${type}-${userPlantId}`;
    setActionLoading(actionKey);
    try {
      const endpoint = type === 'water' ? 'water' : 'fertilize';
      const response = await fetch(`/api/user/plants/${userPlantId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        // Recargar para ver el nuevo estado
        await fetchUserPlants();
      }
    } catch (error) {
      console.error(`Error performing ${type}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePlant = async (userPlantId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!userPlantId) {
      console.error('[Garden] Invalid plant ID');
      return;
    }

    if (!confirm('¿Seguro que quieres remover esta planta de tu jardín personal?')) return;
    
    setIsDeleting(userPlantId);
    try {
      const response = await fetch(`/api/user/plants/${userPlantId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));
        alert(`Error: ${responseData.error || 'No se pudo remover la planta'}`);
      } else {
        setUserPlants(prev => prev.filter(p => p.user_plant_id !== userPlantId));
        setSuccessMessage('¡Planta removida de tu jardín con éxito!');
        setTimeout(() => setSuccessMessage(null), 5000);
        onPlantDeleted();
      }
    } catch (error) {
      console.error('[Garden] Network error:', error);
      alert('Error de conexión al servidor.');
    } finally {
      setIsDeleting(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Atención urgente': return 'bg-red-500';
      case 'Necesita agua': return 'bg-yellow-400';
      default: return 'bg-primary';
    }
  };

  return (
    <div className="space-y-12">
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold border border-white/20"
          >
            <CheckCircle2 className="w-6 h-6" />
            {successMessage}
            <button onClick={() => setSuccessMessage(null)} className="ml-4 opacity-50 hover:opacity-100">
               <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-primary/10 pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-[180px] font-black text-primary/[0.03] select-none pointer-events-none -translate-y-1/2 translate-x-1/4 italic font-serif">
          Garden
        </div>
        
        <div className="relative z-10">
           <Badge className="mb-4 bg-primary text-white font-black text-[9px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg shadow-primary/20">Mi Selección</Badge>
           <h1 className="text-[28px] font-semibold text-text-primary mb-3">El Santuario</h1>
           <p className="text-text-secondary text-body italic max-w-sm">Cultivando {userPlants.length} especímenes bajo observación constante.</p>
        </div>
        
        <div className="flex gap-4 relative z-10">
          <Button 
            onClick={() => onSwitchView('calendar')}
            variant="ghost"
            className="h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest text-primary/60 hover:text-primary hover:bg-primary/5 transition-all hidden sm:flex"
          >
            <Calendar className="w-5 h-5 mr-3" />
            Cronograma
          </Button>
          <Button 
            onClick={() => onSwitchView('catalogue')}
            className="h-14 px-8 bg-primary text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5 mr-3" />
            Adquirir
          </Button>
        </div>
      </div>

      {/* Alertas Urgentes */}
      <div className="flex flex-col gap-6">
        {userPlants.some(p => p.status !== 'Saludable') && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-red-500/10 border border-red-500/20 rounded-[32px] flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center animate-pulse shadow-lg shadow-red-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-900">¡Tu atención es necesaria!</p>
                <p className="text-xs text-red-700 font-medium">Hay {userPlants.filter(p => p.status !== 'Saludable').length} plantas que necesitan hidratación urgente.</p>
              </div>
            </div>
            <button 
              onClick={() => onSwitchView('calendar')}
              className="text-xs-bold text-red-700 hover:underline"
            >
              Ver Calendario
            </button>
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
           {[...Array(6)].map((_, i) => <PlantCardSkeleton key={i} />)}
        </div>
      ) : userPlants.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-32 text-center glass rounded-[40px] border-none"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-[32px] flex items-center justify-center text-primary mb-8 animate-bounce">
            <Sprout className="w-12 h-12" />
          </div>
          <h3 className="text-3xl font-serif font-bold text-primary mb-4">Tu jardín está vacío</h3>
          <p className="text-muted-foreground mb-10 max-w-sm mx-auto italic leading-relaxed">
            Explora nuestro catálogo botánico o usa el escáner IA para empezar a llenar tu santuario.
          </p>
          <div className="flex gap-4">
             <Button onClick={() => onSwitchView('catalogue')} variant="outline" className="h-12 px-6 rounded-xl border-primary/20 text-primary">Ir al Catálogo</Button>
             <Button onClick={() => onSwitchView('scanner')} className="h-12 px-6 rounded-xl bg-primary text-white">Usar Escáner</Button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {userPlants.map((plant) => (
              <motion.div
                key={plant.user_plant_id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative"
              >
                <div 
                  onClick={() => onSelectPlant(plant)}
                  className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer group-hover:-translate-y-2 relative h-full flex flex-col"
                >
                  {/* Status Indicator */}
                  <div className={`absolute top-4 left-4 z-20 px-3 py-1 rounded-lg flex items-center gap-1.5 backdrop-blur-md border border-white/10 text-white text-[8px] font-black uppercase tracking-wider shadow-xl ${getStatusColor(plant.status)}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {plant.status}
                  </div>

                  <div className="h-[200px] relative flex items-center justify-center bg-muted">
                    {plant.imagen_url ? (
                      <img 
                        src={plant.imagen_url} 
                        alt={plant.nombre} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        {...({ referrerPolicy: "no-referrer" } as any)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?q=80&w=1000&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/10">
                        <Sprout className="w-16 h-16" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                      <button
                        onClick={(e) => handleDeletePlant(plant.user_plant_id!, e)}
                        disabled={isDeleting === plant.user_plant_id}
                        title="Eliminar de mi jardín"
                        className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white transition-all hover:bg-red-500 hover:text-white shadow-xl border border-white/20"
                      >
                        {isDeleting === plant.user_plant_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <div className="mb-4">
                      <h4 className="text-xl font-semibold text-text-primary mb-1 truncate">
                        {plant.nombre_personalizado || plant.nombre}
                      </h4>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-blue-500/70">
                          <Droplets className="w-3.5 h-3.5" />
                          <span className="text-xs-bold">Riego {plant.frecuencia_riego_dias}d</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-500/70">
                          <Leaf className="w-3.5 h-3.5" />
                          <span className="text-xs-bold">Nutrir {plant.frecuencia_fertilizacion_dias}d</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto flex gap-2">
                       <button 
                         onClick={(e) => handleAction(plant.user_plant_id!, 'water', e)}
                         disabled={actionLoading === `water-${plant.user_plant_id}`}
                         className="flex-1 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                       >
                         {actionLoading === `water-${plant.user_plant_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Droplets className="w-3.5 h-3.5" />}
                         Regar
                       </button>
                       <button 
                         onClick={(e) => handleAction(plant.user_plant_id!, 'fertilize', e)}
                         disabled={actionLoading === `fertilize-${plant.user_plant_id}`}
                         className="flex-1 h-10 rounded-xl bg-primary hover:opacity-90 text-white font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                       >
                         {actionLoading === `fertilize-${plant.user_plant_id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Leaf className="w-3.5 h-3.5" />}
                         Nutrir
                       </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
