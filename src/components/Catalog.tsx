import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { PlantCard } from './PlantCard';
import { PlantCardSkeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { useQuery } from '@tanstack/react-query';
import { usePlantStore } from '../store/usePlantStore';

interface CatalogProps {
  userPlantIds: Set<number>;
  handleSelectPlant: (plant: any) => void;
  handleAddToGarden: (plantId: number) => void;
}

export function Catalog({ 
  userPlantIds, 
  handleSelectPlant, 
  handleAddToGarden 
}: CatalogProps) {
  // Access central store fields for search & scroll restoration
  const searchQuery = usePlantStore(state => state.searchQuery);

  const { data: plants, isLoading, error } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const response = await fetch('/api/catalog');
      if (!response.ok) throw new Error('Error al cargar el catálogo');
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  // Smooth scroll position restoration upon list render
  useEffect(() => {
    if (!isLoading && plants && plants.length > 0) {
      const savedScroll = usePlantStore.getState().scrollPosition;
      if (savedScroll > 0) {
        const timer = setTimeout(() => {
          const scrollContainer = document.querySelector('.main-content-scroll');
          if (scrollContainer) {
            scrollContainer.scrollTo({ top: savedScroll, behavior: 'auto' });
          }
        }, 80);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, plants]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-red-500 mb-4 opacity-50 text-4xl">⚠️</div>
        <h2 className="text-text-primary text-xl font-bold">Error al cargar el catálogo</h2>
        <p className="text-text-muted mt-2 max-w-xs mx-auto">{(error as Error).message}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {[...Array(12)].map((_, i) => (
          <PlantCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const basePlants = plants || [];

  // Client-side instant real-time filtering
  const filteredPlants = basePlants.filter((plant: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (plant.nombre || '').toLowerCase().includes(query) || 
      (plant.nombre_cientifico || '').toLowerCase().includes(query) ||
      (plant.descripcion || '').toLowerCase().includes(query) ||
      (plant.categoria || '').toLowerCase().includes(query)
    );
  });

  if (filteredPlants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in zoom-in duration-700">
        <div className="w-32 h-32 bg-primary/5 rounded-[48px] flex items-center justify-center mb-10 group relative border border-primary/10 shadow-soft">
          <Search className="w-12 h-12 text-primary/30 group-hover:scale-110 transition-transform" />
          <div className="absolute inset-0 bg-primary/5 rounded-[48px] animate-ping opacity-20" />
        </div>
        <h2 className="text-4xl font-serif font-black text-primary italic mb-4">Silencio en el Jardín</h2>
        <p className="text-muted-foreground max-w-xs mx-auto italic font-editorial text-lg leading-relaxed opacity-60">
          No logramos encontrar esa especie en nuestro herbolario digital. Prueba una búsqueda distinta.
        </p>
        <Button 
          onClick={() => {
            // Remove search from store
            usePlantStore.getState().setSearchQuery('');
            const searchInput = document.querySelector('input[placeholder*="Encuentra"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.value = '';
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }}
          className="mt-12 h-14 px-10 rounded-2xl bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-high transition-transform hover:scale-105"
        >
          Limpiar Búsqueda
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 lg:gap-8 min-h-[500px]">
      {filteredPlants.map((plant: any, index: number) => (
        <motion.div
          key={plant.id}
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5, 
            delay: Math.min(index * 0.04, 0.4),
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <PlantCard 
            plant={plant} 
            onClick={handleSelectPlant} 
            onAdd={handleAddToGarden}
            isAdded={userPlantIds.has(Number(plant.id))}
          />
        </motion.div>
      ))}
    </div>
  );
}
