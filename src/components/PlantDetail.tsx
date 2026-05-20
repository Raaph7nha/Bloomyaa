import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Dialog, 
  DialogContent, 
} from './ui/dialog';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { 
  Droplets, Sun, ShieldCheck, 
  Info, Sprout, Wind,
  ChevronLeft, History as HistoryIcon, Leaf, Loader2,
  Sparkles, Trash2, AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';

interface PlantDetailProps {
  plantId?: number;
  isOpen: boolean;
  onClose: () => void;
  onAddToGarden: (plantId: number) => void;
  onRemoveFromGarden?: (userPlantId: number) => void;
  isAdded?: boolean;
  fullPage?: boolean;
}

const getOptimizedUrl = (url: string | null) => {
  if (!url) return "/placeholder-plant.png";
  if (url.includes('cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/c_fill,g_auto,w_1000,f_auto,q_auto/${parts[1]}`;
    }
  }
  return url;
};

export function PlantDetail({ plantId: propPlantId, isOpen, onClose, onAddToGarden, onRemoveFromGarden, isAdded, fullPage }: PlantDetailProps) {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const plantId = propPlantId || Number(urlId);

  const [chatQuestion, setChatQuestion] = React.useState('');
  const [chatHistory, setChatHistory] = React.useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [chatLoading, setChatLoading] = React.useState(false);

  const { data: plant, isLoading: loadingPlant, error: plantError } = useQuery({
    queryKey: ['plant', plantId],
    queryFn: async () => {
      if (!plantId) return null;
      const token = localStorage.getItem('bloomy_token');
      const response = await fetch(`/api/catalog/${plantId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('No se pudo encontrar la planta');
      return response.json();
    },
    enabled: !!plantId && (isOpen || fullPage),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['plant-history', plant?.user_plant_id],
    queryFn: async () => {
      const token = localStorage.getItem('bloomy_token');
      const response = await fetch(`/api/user/plants/${plant.user_plant_id}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!plant?.user_plant_id && (isOpen || fullPage),
  });

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim() || chatLoading) return;

    const userMessage = chatQuestion.trim();
    setChatQuestion('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const token = localStorage.getItem('bloomy_token');
      const response = await fetch('/api/ai/plant-chat', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plantId: plant?.id, pregunta: userMessage })
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(prev => [...prev, { role: 'ai', text: data.respuesta }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', text: 'Lo siento, hubo un error al procesar tu pregunta.' }]);
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Lo siento, no puedo conectarme con el asistente en este momento.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loadingPlant) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-20 bg-background/50 rounded-[40px]">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
           <Loader2 className="w-12 h-12 text-primary/40" />
        </motion.div>
        <p className="mt-6 text-text-muted font-black uppercase tracking-[0.3em] text-[10px]">Sincronizando...</p>
      </div>
    );
  }

  if (plantError || !plant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-20 bg-background">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-serif font-black text-primary italic">Planta no encontrada</h2>
        <p className="text-text-muted mt-4 max-w-xs text-center font-editorial italic text-lg">No pudimos encontrar los secretos de esta especie en nuestro herbolario.</p>
        <Button 
          onClick={() => fullPage ? navigate('/') : onClose()} 
          className="mt-10 bg-primary text-white font-black uppercase tracking-widest text-xs px-10 py-6 rounded-2xl shadow-xl shadow-primary/20"
        >
          Volver
        </Button>
      </div>
    );
  }

  const nombre = plant.nombre_personalizado || plant.nombre;
  const descripcion = plant.descripcion;
  const dificultad = plant.dificultad;
  const luz = plant.luz;
  const riego = plant.riego;
  const imagen = plant.imagen_url;
  const nombreCientifico = plant.nombre_cientifico;

  const Content = (
    <div className={`flex flex-col lg:flex-row h-full ${fullPage ? 'min-h-screen pb-12' : 'max-h-[90vh] lg:h-[700px]'} overflow-hidden rounded-[40px] bg-card border-none shadow-2xl`}>
      
      {/* Image Section */}
      <div className={`lg:w-[45%] ${fullPage ? 'h-[50vh] lg:h-auto' : 'h-72 lg:h-full'} relative overflow-hidden bg-primary/5 group`}>
        {imagen ? (
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2 }}
            src={getOptimizedUrl(imagen)} 
            alt={nombre} 
            className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
            {...({ referrerPolicy: "no-referrer" } as any)}
            onError={(e: any) => {
              e.target.onerror = null;
              e.target.src = "/placeholder-plant.png";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-primary/10">
            <Sprout className="w-24 h-24 mb-4" />
          </div>
        )}
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        <div className="absolute top-6 left-6 z-20">
          <button 
            onClick={onClose}
            className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl text-white hover:bg-white/20 transition-all border border-white/20 flex items-center gap-3 font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl"
          >
            <ChevronLeft className="w-5 h-5" />
            Cerrar
          </button>
        </div>
        
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
          {plant.user_plant_id && (
             <div className="px-5 py-3 rounded-2xl backdrop-blur-xl border border-white/20 bg-emerald-500/80 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl">
               <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
               En tu jardín
             </div>
          )}
        </div>

        <div className="absolute bottom-10 left-10 lg:hidden">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/70 mb-3 ml-1">{nombreCientifico || 'NATURA'}</p>
            <h2 className="text-4xl font-serif font-black text-white italic leading-tight">{nombre}</h2>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-8 lg:p-16 overflow-y-auto custom-scrollbar flex flex-col bg-card relative">
        <div className="hidden lg:block mb-12">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mb-3 ml-1">{nombreCientifico || 'NATURA'}</p>
              <h1 className="text-5xl font-serif font-black text-text-primary leading-none italic">{nombre}</h1>
            </div>
            {plant.user_plant_id && onRemoveFromGarden && (
              <button
                onClick={() => onRemoveFromGarden(plant.user_plant_id!)}
                className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5 group"
              >
                <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-16">
          {/* Dashboard Summary for Garden Plants */}
          {plant.user_plant_id && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <CareDashboardItem 
                icon={<Droplets />} 
                label="Próximo Riego" 
                value={plant.next_watering ? new Date(plant.next_watering).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'Pendiente'}
                color="blue"
               />
               <CareDashboardItem 
                icon={<Leaf />} 
                label="Fertilización" 
                value={plant.next_fertilizing ? new Date(plant.next_fertilizing).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'Pronto'}
                color="emerald"
               />
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary/30 uppercase tracking-[0.3em] font-black text-[9px]">
               <Info className="w-4 h-4" />
               Información Botánica
            </div>
            <p className="text-xl text-text-secondary leading-relaxed italic font-editorial font-medium opacity-90">
              {descripcion}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <CareSpecItem icon={<Sun />} label="Iluminación" value={luz} />
            <CareSpecItem icon={<Droplets />} label="Riego" value={plant.user_plant_id ? `Cada ${plant.frecuencia_riego_dias} días` : riego} />
            <CareSpecItem icon={<ShieldCheck />} label="Dificultad" value={dificultad} />
            <CareSpecItem icon={<Sprout />} label="Familia" value={plant.familia || 'Variada'} />
          </div>

          <Separator className="opacity-5" />

          {/* AI Advisor Chat */}
          <div className="space-y-8">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[22px] bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                   <h3 className="text-xl font-serif font-black italic text-text-primary">Asistente Botánico</h3>
                   <p className="text-[10px] uppercase font-black tracking-widest text-text-muted mt-1">Chat de IA experto en {nombre}</p>
                </div>
             </div>

             <div className="bg-primary/5 rounded-[40px] p-8 border border-primary/5 shadow-inner">
                <div className="max-h-[400px] overflow-y-auto space-y-6 pr-4 custom-scrollbar mb-8">
                  {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                      <Wind className="w-10 h-10 mb-4 animate-pulse" />
                      <p className="text-sm italic font-medium max-w-xs font-editorial">
                        Pregunta sobre cuidados, plagas o curiosidades de esta planta.
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((msg, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-[28px] p-5 text-sm font-medium leading-relaxed font-editorial italic ${
                          msg.role === 'user' 
                            ? 'bg-primary text-white rounded-tr-none px-7' 
                            : 'bg-white text-primary rounded-tl-none border border-primary/5 shadow-xl'
                        }`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-[28px] rounded-tl-none p-5 px-7 border border-primary/5 shadow-xl">
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
                        </motion.div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleChatSubmit} className="relative flex gap-3">
                  <input 
                    type="text" 
                    value={chatQuestion}
                    onChange={(e) => setChatQuestion(e.target.value)}
                    placeholder="¿Cuál es el secreto de esta planta?"
                    className="flex-1 h-14 bg-white rounded-2xl px-6 border border-primary/5 focus:border-primary/20 outline-none font-medium transition-all shadow-sm italic font-editorial text-lg"
                  />
                  <Button 
                    type="submit"
                    disabled={!chatQuestion.trim() || chatLoading}
                    className="h-14 w-14 rounded-2xl p-0 bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
                  >
                    <Wind className="w-6 h-6 rotate-90" />
                  </Button>
                </form>
             </div>
          </div>

          {/* History */}
          {plant.user_plant_id && (
            <div className="space-y-8 pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-primary/30 uppercase tracking-[0.3em] font-black text-[9px]">
                  <HistoryIcon className="w-4 h-4" />
                  Cronología de Cuidados
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/20" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 bg-muted/20 rounded-[32px] italic text-text-muted font-editorial">
                    Aún no hay hitos en la vida de tu {nombre}.
                  </div>
                ) : (
                  history.slice(0, 5).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-6 p-6 bg-white rounded-[28px] border border-primary/5 hover:border-primary/10 transition-all group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        log.tipo_evento === 'riego' ? 'bg-blue-50 text-blue-500' : 'bg-green-50 text-green-500'
                      }`}>
                        {log.tipo_evento === 'riego' ? <Droplets className="w-6 h-6" /> : <Leaf className="w-6 h-6" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{log.tipo_evento}</p>
                        <p className="text-sm font-medium text-text-secondary truncate italic font-editorial">{log.nota || 'Cuidado regular'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                          {new Date(log.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-[10px] font-bold text-text-muted/40 uppercase mt-1">
                          {new Date(log.fecha).getHours()}:{new Date(log.fecha).getMinutes().toString().padStart(2, '0')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-8">
            {!plant.user_plant_id && !isAdded ? (
              <Button 
                onClick={() => onAddToGarden(Number(plant.id))}
                className="w-full h-20 rounded-[28px] font-black text-sm uppercase tracking-[0.3em] bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Adoptar Planta
              </Button>
            ) : (
              <Button 
                disabled={true}
                className="w-full h-20 rounded-[28px] font-black text-sm uppercase tracking-[0.3em] bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-3"
              >
                <ShieldCheck className="w-6 h-6" />
                Miembro del Jardín
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (fullPage) return (
    <>
      {Content}
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-none bg-card rounded-[40px] shadow-2xl scale-in">
        {Content}
      </DialogContent>
    </Dialog>
  );
}

function CareDashboardItem({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/10',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
    orange: 'bg-orange-500/10 text-orange-600 border-orange-500/10'
  };

  return (
    <div className={`p-6 rounded-[28px] border sm:flex items-center gap-5 ${colorMap[color] || 'bg-muted'}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-current opacity-10`} />
      <div className="absolute flex items-center justify-center w-14 h-14 pointer-events-none">
         {React.cloneElement(icon, { className: "w-7 h-7" })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
        <p className="text-xl font-serif font-black italic">{value}</p>
      </div>
    </div>
  );
}

function CareSpecItem({ icon, label, value }: { icon: any, label: string, value?: string }) {
  return (
    <div className="space-y-3">
      <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-text-muted/60">{label}</p>
        <p className="text-sm font-bold text-text-primary mt-1 truncate">{value || 'N/A'}</p>
      </div>
    </div>
  );
}
