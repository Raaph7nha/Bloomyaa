import { create } from 'zustand';

interface Plant {
  id: number;
  nombre: string;
  nombre_cientifico?: string;
  descripcion: string;
  categoria: string;
  dificultad: string;
  luz: string;
  riego: string;
  imagen_url: string;
  [key: string]: any;
}

interface PlantState {
  plants: Plant[];
  allPlants: Plant[];
  isLoaded: boolean;
  loading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  searchQuery: string;
  scrollPosition: number;
  fetchPlants: (force?: boolean) => Promise<void>;
  setPlants: (plants: Plant[]) => void;
  setSearchQuery: (query: string) => void;
  setScrollPosition: (pos: number) => void;
}

export const usePlantStore = create<PlantState>((set, get) => ({
  plants: [],
  allPlants: [],
  isLoaded: false,
  loading: false,
  error: null,
  lastFetchTime: null,
  searchQuery: '',
  scrollPosition: 0,

  setPlants: (plants: Plant[]) => set({ plants }),
  setSearchQuery: (searchQuery: string) => set({ searchQuery }),
  setScrollPosition: (scrollPosition: number) => set({ scrollPosition }),

  fetchPlants: async (force = false) => {
    const { isLoaded, loading, lastFetchTime } = get();
    
    // Si ya está cargado y no ha pasado más de 10 minutos, no volver a pedir
    const tenMinutes = 10 * 60 * 1000;
    const now = Date.now();
    
    if (isLoaded && !force && lastFetchTime && (now - lastFetchTime < tenMinutes)) {
      return;
    }

    if (loading) return;

    set({ loading: true, error: null });
    try {
      const response = await fetch('/api/catalog');
      if (!response.ok) throw new Error('Error al cargar el catálogo');
      const data = await response.json();
      
      console.log('Catalog fetched successfully:', data.length, 'plants');
      set({ 
        plants: data, 
        allPlants: data,
        isLoaded: true, 
        loading: false, 
        lastFetchTime: now 
      });
    } catch (error: any) {
      console.error('Fetch error:', error);
      set({ error: error.message, loading: false });
    }
  },
}));
