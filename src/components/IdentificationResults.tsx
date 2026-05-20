import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ChevronLeft, 
  Loader2, Save, CheckCircle2,
  Sprout, Sparkles, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface IdentificationResultsProps {
  results: any[];
  token: string;
  onReset: () => void;
  onSaved: () => void;
}

const getOptimizedUrl = (url: string | null) => {
  if (!url) return "/placeholder-plant.png";
  if (url.includes('cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/c_fill,g_auto,w_600,f_auto,q_auto/${parts[1]}`;
    }
  }
  return url;
};

export function IdentificationResults({ results, token, onReset, onSaved }: IdentificationResultsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0); // Auto-select best match
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveResult = async () => {
    if (selectedIndex === null) return;
    
    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMessage(null);
    
    const result = results[selectedIndex];
    
    try {
      const response = await fetch('/api/plant/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          result,
          saveToGarden: true 
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la planta en tu jardín.');
      }

      setSaveStatus('success');
      setTimeout(onSaved, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con el servidor');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-12 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-[180px] font-black text-primary/[0.02] select-none pointer-events-none -translate-y-1/2 translate-x-1/4 italic font-serif">
          Savia
        </div>
        
        <div className="relative z-10 space-y-6">
          <button 
            onClick={onReset} 
            className="group flex items-center gap-3 text-primary/30 hover:text-primary transition-all font-black uppercase tracking-[0.3em] text-[10px]"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Nuevo Análisis
          </button>
          <div className="space-y-3">
            <h2 className="text-6xl font-serif font-black text-primary tracking-tighter leading-none italic">Revelación</h2>
            <p className="text-primary/40 text-lg font-editorial italic max-w-md">Especies identificadas en el umbral de nuestra biblioteca botánica.</p>
          </div>
        </div>
        
        <Badge className="bg-primary text-white border-none px-8 py-3 rounded-full font-black uppercase tracking-[0.2em] text-[10px] shadow-high relative z-10 group cursor-default h-fit">
          <Sparkles size={12} className="mr-2 inline group-hover:rotate-12 transition-transform" />
          {results.length} Hallazgos
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main results area */}
        <div className="lg:col-span-8 order-2 lg:order-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {results.map((result, index) => {
              const confidence = Math.round(result.score * 100);
              const perenual = result.perenualInfo || {};
              const isSelected = selectedIndex === index;
              
              let displayImage = perenual.default_image?.original_url;
              if (!displayImage || displayImage.includes('upgrade_available')) {
                displayImage = result.images?.[0] || "/placeholder-plant.png";
              }

              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedIndex(index)}
                  className={`group relative cursor-pointer rounded-[48px] overflow-hidden border transition-all duration-700 ${
                    isSelected ? 'border-primary shadow-high bg-background ring-1 ring-primary/20' : 'border-border/40 bg-muted/5 hover:shadow-soft grayscale hover:grayscale-0'
                  }`}
                >
                   {index === 0 && (
                     <div className="absolute top-6 left-6 z-10">
                        <Badge className="bg-accent text-white border-none px-4 py-2 flex items-center gap-2 font-black text-[9px] uppercase tracking-widest shadow-high">
                           <Sparkles size={12} className="animate-pulse" /> Máxima Savia
                        </Badge>
                     </div>
                   )}
                   
                   <div className="aspect-[4/5] relative overflow-hidden p-3 lg:p-4">
                      <div className="w-full h-full relative rounded-[36px] overflow-hidden shadow-soft">
                        <img 
                          src={getOptimizedUrl(displayImage)} 
                          alt={result.commonNames?.[0] || result.scientificName}
                          className={`w-full h-full object-cover transition-transform duration-[2s] ${isSelected ? 'scale-110' : 'group-hover:scale-110'}`}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                      </div>
                      
                      <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end transition-all duration-700 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                         <div className="bg-white/40 backdrop-blur-2xl px-6 py-4 rounded-[28px] border border-white/20 shadow-high">
                            <span className="text-white text-xl font-serif font-black italic">{confidence}%</span>
                            <span className="ml-2 text-[9px] uppercase font-black tracking-widest text-white/60">Esencia</span>
                         </div>
                      </div>
                   </div>

                   <div className="px-10 pb-10 pt-4 space-y-2">
                       <h4 className="text-3xl font-serif font-black text-primary truncate italic tracking-tighter">
                          {result.commonNames?.[0] || result.scientificName}
                       </h4>
                       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/30 truncate">
                          {result.scientificName}
                       </p>
                   </div>
                   
                   {isSelected && (
                     <motion.div 
                        layoutId="active-marker"
                        className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-high ring-8 ring-primary/5"
                     />
                   )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="lg:col-span-4 order-1 lg:order-2">
           <div className="sticky top-32">
              <AnimatePresence mode="wait">
                {selectedIndex !== null && (
                  <motion.div
                    key={selectedIndex}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className="p-12 bg-background rounded-[56px] border border-border/40 shadow-high relative overflow-hidden group"
                  >
                     <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.02] rounded-bl-[160px] pointer-events-none" />
                     
                     <div className="relative z-10 space-y-10">
                        <div className="flex flex-col items-center text-center gap-6">
                           <div className="w-24 h-24 bg-primary/5 rounded-[40px] flex items-center justify-center text-primary border border-primary/10 shadow-soft">
                              <Sprout size={48} className="translate-y-1" />
                           </div>
                           <div className="space-y-4">
                              <Badge className="bg-primary text-white border-none px-6 py-2 rounded-full font-black text-[9px] uppercase tracking-widest">Confirmación</Badge>
                              <h3 className="text-4xl font-serif font-black text-primary italic leading-tight tracking-tighter">
                                 {results[selectedIndex].commonNames?.[0] || results[selectedIndex].scientificName}
                              </h3>
                           </div>
                        </div>

                        <div className="p-8 bg-muted/10 rounded-[40px] border border-border/40 space-y-6">
                           <p className="text-secondary-foreground/60 text-sm italic font-editorial leading-relaxed text-center">
                              "Al integrar esta especie, Bloomy sincronizará su ciclo vital con tu bitácora personal."
                           </p>
                           <div className="h-px bg-primary/10" />
                           <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/30">Taxonomía</span>
                                 <span className="text-xs font-serif font-black text-primary italic">{results[selectedIndex].scientificName}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/30">Precisión AI</span>
                                 <span className="text-xs font-black text-accent">{Math.round(results[selectedIndex].score * 100)}%</span>
                              </div>
                           </div>
                        </div>

                        {saveStatus === 'success' ? (
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-emerald-500 text-white rounded-[40px] p-10 flex flex-col items-center justify-center text-center gap-4 shadow-high"
                          >
                             <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} />
                             </div>
                             <div>
                               <p className="text-2xl font-serif font-black italic">Especie Vinculada</p>
                               <p className="text-[10px] opacity-60 uppercase font-black tracking-widest mt-2">Accediendo al Jardín...</p>
                             </div>
                          </motion.div>
                        ) : saveStatus === 'error' ? (
                          <div className="p-8 bg-rose-50 text-rose-600 rounded-[40px] border border-rose-100 flex flex-col items-center gap-4">
                             <AlertCircle size={28} />
                             <p className="text-sm font-bold text-center leading-relaxed">{errorMessage}</p>
                             <button 
                               onClick={() => setSaveStatus('idle')}
                               className="text-[10px] uppercase font-black underline tracking-widest hover:text-rose-700"
                             >
                               Volver a intentar
                             </button>
                          </div>
                        ) : (
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleSaveResult(); }}
                            disabled={isSaving}
                            className="w-full h-24 bg-primary text-white rounded-[32px] font-black text-xs uppercase tracking-[0.4em] shadow-high hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 relative overflow-hidden group/save"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-8 h-8 animate-spin" />
                                Vinculando...
                              </>
                            ) : (
                              <>
                                <Save className="w-8 h-8 group-hover/save:-rotate-12 transition-transform" />
                                Adoptar Especie
                              </>
                            )}
                            {isSaving && (
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 3 }}
                                className="absolute bottom-0 left-0 h-2 bg-white/20"
                              />
                            )}
                          </Button>
                        )}
                        
                        <div className="text-center">
                           <p className="text-[8px] text-primary/20 uppercase font-black tracking-[0.4em]">
                              Savia AI Botanical Engine v2.0
                           </p>
                        </div>
                     </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
}
