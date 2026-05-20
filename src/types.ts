export interface Plant {
  id: string | number;
  nombre?: string;
  descripcion?: string;
  descripcion_corta?: string;
  tipo?: string;
  dificultad?: string;
  luz?: string;
  riego?: string;
  imagen_url?: string;
  nombre_cientifico?: string;
  is_new?: boolean;
  familia?: string;
  genero?: string;
  fecha_creacion?: string;
  
  // Legacy fields (for compatibility)
  name?: string;
  scientificName?: string;
  category?: string;
  image?: string;
  description?: string;
  care?: {
    water: string;
    light: string;
    soil: string;
    temperature: string;
    difficulty: string;
  };
  
  // User specific care data
  user_plant_id?: number;
  nombre_personalizado?: string;
  ultima_fecha_riego?: string;
  frecuencia_riego_dias?: number;
  ultima_fertilizacion?: string;
  frecuencia_fertilizacion_dias?: number;
  fecha_agregado?: string;
  next_watering?: string;
  next_fertilizing?: string;
  status?: 'Saludable' | 'Necesita agua' | 'Atención urgente';
}

export interface PlantLog {
  id: number;
  user_plant_id: number;
  tipo_evento: 'riego' | 'fertilizante' | 'poda';
  fecha: string;
  nota?: string;
}
