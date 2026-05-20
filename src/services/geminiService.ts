export interface PlantDescription {
  descripcion_corta: string;
  descripcion_larga: string;
}

export const generatePlantDescriptions = async (plant: {
  nombre: string;
  tipo: string;
  luz: string;
  riego: string;
  dificultad: string;
}): Promise<PlantDescription> => {
  try {
    const token = localStorage.getItem('bloomy_token');
    
    const response = await fetch('/api/ai/generate-descriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(plant)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error en la petición de AI');
    }

    return await response.json();
  } catch (error: any) {
    console.error("Error generating plant descriptions with Groq API:", error);
    
    // Fallback descriptions
    return {
      descripcion_corta: `Una planta de ${plant.tipo} ideal para ambientes de luz ${plant.luz}.`,
      descripcion_larga: `La ${plant.nombre} es perfecta para tu hogar. Prefiere estar en zonas de ${plant.luz} y necesita un riego ${plant.riego}. Es una opción excelente si buscas algo de dificultad ${plant.dificultad}.`
    };
  }
};
