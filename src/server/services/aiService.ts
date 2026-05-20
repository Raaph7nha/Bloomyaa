import Groq from 'groq-sdk';
import { logger } from '../utils/logger';

let groqClient: Groq | null = null;

const getGroqClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

export async function generateAIPlantDescriptions(plantData: {
  nombre: string;
  tipo: string;
  luz: string;
  riego: string;
  dificultad: string;
}) {
  const { nombre, tipo, luz, riego, dificultad } = plantData;

  try {
    const groq = getGroqClient();
    
    const prompt = `Genera dos descripciones para una planta basadas en los siguientes datos:

Nombre: ${nombre}
Tipo: ${tipo} (interior, exterior o mixta)
Luz: ${luz} (alta, media o baja)
Riego: ${riego} (alto, moderado o bajo)
Dificultad: ${dificultad}

---

### 🎯 Objetivo

Crear:

1. Una descripción corta para vista rápida (cards)
2. Una descripción detallada para vista completa (detalle de planta)

---

### ✨ Instrucciones generales

* Escribe en español
* Usa un tono natural, amigable y claro
* No uses lenguaje técnico complicado
* Evita repetir estructuras entre plantas
* Varía la redacción en cada respuesta

---

## 🟢 Descripción corta

* Extensión: 2 a 3 líneas
* Debe ser clara y rápida de leer
* Incluir:
  * tipo de planta
  * condiciones básicas (luz y riego)

---

## 🔵 Descripción detallada

* Extensión: 5 a 8 líneas
* Debe sentirse como una guía práctica
* Incluir de forma fluida:
  * descripción general de la planta
  * entorno ideal (interior/exterior)
  * recomendaciones de luz
  * recomendaciones de riego
  * consejos útiles o errores comunes

---

### ⚠️ Restricciones

* No inventar información fuera de los datos proporcionados
* No repetir frases exactamente iguales entre plantas
* Evitar frases genéricas repetidas como: "requiere luz media y riego moderado"

---

### 🎨 Estilo esperado

Natural, útil y cercano al usuario, como una app real de jardinería.

---

### 📦 Formato de salida

Responde SOLO en formato JSON válido:

{
"descripcion_corta": "...",
"descripcion_larga": "..."
}

No incluyas texto adicional fuera del JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from Groq');
    }

    return JSON.parse(content);

  } catch (error: any) {
    logger.error({ message: 'Error generating descriptions with Groq', error: error.message || error });
    
    // Fallback amigable
    return {
      descripcion_corta: `Una planta de ${tipo} ideal para ambientes de luz ${luz}.`,
      descripcion_larga: `La ${nombre} es perfecta para tu hogar. Prefiere estar en zonas de ${luz} y necesita un riego ${riego}. Es una opción excelente si buscas algo de dificultad ${dificultad}.`
    };
  }
}

export async function generateForumResponse(postContent: string) {
  try {
    const groq = getGroqClient();
    
    const prompt = `Actúa como un experto bot de jardinería para la aplicación Bloomy. 
Un usuario ha publicado un post pidiendo ayuda con sus plantas. Responde de manera útil, amigable y concisa.

Contenido del post: "${postContent}"

Instrucciones:
* Responde en español (máximo 3-4 párrafos cortos).
* Da consejos prácticos y soluciones posibles.
* Si el post no está claro, pide más detalles educadamente.
* Mantén un tono alentador.

Respuesta:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || "¡Hola! Soy el asistente de Bloomy. Parece que tienes problemas con tu planta. Asegúrate de revisar el riego y la luz que recibe. Si necesitas más ayuda, ¡aquí estamos!";
  } catch (error) {
    logger.error({ message: 'Error in AI forum response', error });
    return "¡Hola! Estoy analizando tu consulta. Como consejo general, revisa siempre el drenaje de la maceta y evita el sol directo si las hojas se ven quemadas. ¡Mucha suerte con tu planta!";
  }
}

export async function generateSmartPostDraft(plantName: string) {
  try {
    const groq = getGroqClient();
    
    const prompt = `Actúa como un entusiasta de las plantas y creador de contenido para la aplicación Bloomy. 
Un usuario ha subido una foto de una planta identificada como "${plantName}".
Genera un borrador de publicación para el foro de la comunidad.

Instrucciones:
* Idioma: Español.
* Tono: Natural, inspirador y útil.
* Contenido:
  1. Un título o frase inicial llamativa.
  2. Datos interesantes o cuidados clave para la "${plantName}".
  3. Una invitación a que otros compartan sus experiencias.
* Extensión: Máximo 2 párrafos cortos (unas 60-80 palabras).

Respuesta:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content || `¡Hola comunidad! Acabo de añadir esta hermosa ${plantName} a mi colección. ¿Alguien tiene algún consejo sobre sus cuidados?`;
  } catch (error) {
    logger.error({ message: 'Error in generateSmartPostDraft', error });
    return `¡Mirad qué maravilla! He descubierto esta ${plantName}. ¿Qué os parece? Me encantaría saber cómo cuidáis las vuestras.`;
  }
}

/**
 * Genera un post educativo diario
 */
export async function generateDailyAIPost() {
  try {
    const groq = getGroqClient();
    
    const prompt = `Actúa como un experto bot de educación botánica para Bloomy. 
Genera una publicación diaria educativa e interesante para el foro.
Debe ser uno de estos 3 tipos:
1. Dato curioso sobre una planta específica.
2. Tip de cuidado general (ej. luz, humedad, fertilización).
3. Recomendación de planta para principiantes.

Instrucciones:
* Idioma: Español.
* Tono: Informativo y amigable.
* Formato: Una frase inicial de impacto, seguida de la información detallada.
* Extensión: Máximo 2 párrafos (unas 60-80 palabras).

Respuesta:`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.9,
    });

    return completion.choices[0]?.message?.content;
  } catch (error) {
    logger.error({ message: 'Error generating daily AI post', error });
    return null;
  }
}

