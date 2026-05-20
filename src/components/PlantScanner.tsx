import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { ScanLine, Loader2, X, Sprout, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { IdentificationResults } from './IdentificationResults';

interface IdentificationResult {
  scientificName: string;
  commonNames?: string[];
  family: string;
  genus: string;
  score: number;
  perenualInfo?: any;
}

interface PlantScannerProps {
  token: string;
  onPlantSaved: () => void;
  onAuthError?: () => void;
}

export function PlantScanner({ token, onPlantSaved, onAuthError }: PlantScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [results, setResults] = useState<IdentificationResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResults(null);
      setError(null);
    }
  };

  const handleIdentify = async () => {
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 5MB.');
      return;
    }

    setIsIdentifying(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('/api/plant/identify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = 'Error al identificar la planta';
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          if (errorData.missingKeys) {
            errorMessage = 'Faltan las API Keys en el servidor. Ve a Settings y configura PLANTNET_API_KEY y PERENUAL_API_KEY.';
          } else {
            errorMessage = errorData.error || errorMessage;
          }
          
          if (errorData.isAuthError) {
            errorMessage = 'Error de autorización con el servicio botánico. Verifica que la API Key de Pl@ntNet esté correctamente configurada en los ajustes.';
          }
          if (response.status === 401) {
            onAuthError?.();
          }
        } else {
          // Si no es JSON, capturamos el texto para depuración (probablemente HTML de un error 500/404/403)
          const errorText = await response.text();
          console.error('Error no-JSON del servidor:', errorText.substring(0, 500));
          console.error('Headers de respuesta:', Object.fromEntries(response.headers.entries()));
          errorMessage = `Error del servidor (${response.status}). Esto puede deberse a una configuración incorrecta de las API Keys o límites del servidor.`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setResults(data);
    } catch (err: any) {
      console.error('Catch en Identificación:', err);
      setError(err.message === 'Unexpected token <' || err.message.includes('valid JSON') 
        ? 'El servidor respondió con un error inesperado (HTML). Verifica la conexión.' 
        : err.message);
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <AnimatePresence mode="wait">
        {!results ? (
          <motion.div
            key="scanner-input"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="flex flex-col items-center"
          >
            <div className="text-center mb-16 relative">
               <div className="absolute -top-20 left-1/2 -translate-x-1/2 opacity-5 pointer-events-none">
                  <ScanLine size={180} className="text-primary rotate-12" />
               </div>
               <div className="relative z-10 space-y-6">
                  <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.3em] shadow-soft border border-primary/10">
                     <Sparkles size={14} strokeWidth={2.5} className="animate-pulse" />
                     Savia Visión IA
                  </div>
                  <h2 className="text-7xl font-serif font-black text-primary tracking-tighter leading-none italic">¿Qué especie es?</h2>
                  <p className="text-primary/40 text-lg font-editorial italic max-w-sm mx-auto leading-relaxed">
                    Captura la esencia de tu planta y deja que nuestra inteligencia botánica revele sus secretos.
                  </p>
               </div>
            </div>

            <div 
              className={`w-full max-w-4xl aspect-[16/9] lg:aspect-video rounded-[56px] border border-border/40 transition-all cursor-pointer relative group overflow-hidden shadow-high ${
                previewUrl ? 'bg-background' : 'bg-muted/10 hover:bg-muted/20'
              }`}
              onClick={() => !isIdentifying && fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <div className="w-full h-full p-4 lg:p-6 text-center">
                  <div className="w-full h-full relative rounded-[40px] overflow-hidden shadow-soft">
                     <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
                     {isIdentifying && (
                        <div className="absolute inset-0">
                          <motion.div 
                            initial={{ top: '0%' }}
                            animate={{ top: '100%' }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute left-0 right-0 h-1.5 bg-accent z-20 shadow-[0_0_25px_rgba(255,159,28,1)]"
                          />
                          <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm animate-pulse" />
                        </div>
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <div className="w-40 h-40 bg-background shadow-high rounded-[48px] flex items-center justify-center text-primary mb-10 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700 border border-border/20">
                    <ScanLine className="w-20 h-20" />
                  </div>
                  <h3 className="text-4xl font-serif font-black text-primary mb-3 italic">Captura la naturaleza</h3>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.4em]">Haz clic para subir una fotografía</p>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            <div className="mt-16 flex flex-col items-center w-full max-w-md gap-8">
              <Button
                onClick={(e) => { e.stopPropagation(); handleIdentify(); }}
                disabled={!selectedFile || isIdentifying}
                className="w-full h-24 bg-primary text-white text-xl font-black uppercase tracking-[0.3em] rounded-[32px] shadow-high hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 overflow-hidden relative group/btn"
              >
                {isIdentifying ? (
                  <>
                    <Loader2 className="w-8 h-8 mr-4 animate-spin" />
                    Analizando Savia...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-8 h-8 mr-4 group-hover/btn:rotate-12 transition-transform" />
                    Iniciar Escaneo
                  </>
                )}
                {isIdentifying && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute bottom-0 left-0 h-2 bg-white/20"
                  />
                )}
              </Button>

              {previewUrl && !isIdentifying && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleReset(); }} 
                  className="flex items-center gap-3 text-[11px] font-black text-rose-500/40 hover:text-rose-500 transition-all uppercase tracking-[0.3em] hover:scale-105"
                >
                  <X size={16} /> Descartar Captura
                </button>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mt-8 p-6 bg-rose-50 border border-rose-100 rounded-3xl flex items-start gap-4 max-w-md"
              >
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 text-rose-500 shadow-sm">
                   <AlertCircle size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Error de Proceso</p>
                   <p className="text-xs font-bold text-rose-700 leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}

            <div className="mt-20 grid grid-cols-3 gap-12 w-full max-w-3xl opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
               <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
                     <Sprout size={20} className="text-primary" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">Base de Datos<br/>Global</p>
               </div>
               <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
                     <ShieldCheck size={20} className="text-primary" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">Identificación<br/>Verificada</p>
               </div>
               <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center">
                     <Sparkles size={20} className="text-primary" />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-center">Resultados con<br/>Inteligencia Artificial</p>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <IdentificationResults 
              results={results} 
              token={token} 
              onReset={handleReset} 
              onSaved={onPlantSaved} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
