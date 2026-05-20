import { memo } from 'react';
import { motion } from 'motion/react';
import { Plus, Sprout, Check } from 'lucide-react';
import { Plant } from '../types';

interface PlantCardProps {
  plant: Plant;
  onClick: (plant: any) => void;
  onAdd: (plantId: number) => void;
  isAdded?: boolean;
}

const getOptimizedUrl = (url: string | null) => {
  if (!url) return "/placeholder-plant.png";
  if (url.includes('cloudinary.com')) {
    // Insert transformation parameters after /upload/
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/c_fill,g_auto,w_500,f_auto,q_auto/${parts[1]}`;
    }
  }
  return url;
};

export const PlantCard = memo(function PlantCard({ plant, onClick, onAdd, isAdded }: PlantCardProps) {
  return (
    <motion.div 
      className="bg-card rounded-[32px] overflow-hidden border border-border/10 shadow-soft hover:shadow-high transition-all duration-500 flex flex-col h-full active:scale-[0.98] group relative cursor-pointer"
      onClick={() => onClick(plant)}
    >
        <div className="relative h-[220px] lg:h-[280px] w-full overflow-hidden bg-muted">
          {plant.imagen_url ? (
            <img 
              src={getOptimizedUrl(plant.imagen_url)} 
              alt={plant.nombre} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
              loading="lazy"
              onError={(e: any) => {
                e.target.onerror = null;
                e.target.src = "/placeholder-plant.png";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary/10">
              <Sprout className="w-16 h-16" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="absolute top-4 right-4 z-20">
            <button 
              disabled={isAdded}
              onClick={(e) => { e.stopPropagation(); onAdd(Number(plant.id)); }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-md border ${
                isAdded 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : 'bg-white/80 text-primary border-white/20 hover:bg-white hover:scale-110'
              }`}
            >
              {isAdded ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="w-4 h-4 stroke-[3px]" /></motion.div>
              ) : (
                <Plus className="w-4 h-4 stroke-[3px]" />
              )}
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col flex-grow">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text-primary tracking-tight truncate leading-tight group-hover:text-primary transition-colors">
              {plant.nombre}
            </h3>
            <p className="text-[11px] font-medium tracking-wide text-text-muted mt-1 truncate italic font-serif">
              {plant.nombre_cientifico || 'Specie Botanica'}
            </p>
          </div>
          
          {plant.descripcion_corta && (
            <p className="text-xs text-text-secondary mt-3 line-clamp-2 leading-relaxed opacity-70 font-editorial italic">
              {plant.descripcion_corta}
            </p>
          )}
        </div>
      </motion.div>
  );
});
