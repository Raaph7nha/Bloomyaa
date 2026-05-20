import { pool } from '../server/db.ts';
import dotenv from 'dotenv';
dotenv.config();

const groups = {
  FLORES: ['rose', 'daisy', 'lily', 'orchid', 'tulip', 'sunflower', 'hibiscus', 'jasmine'],
  FRUTAS: ['mango', 'orange', 'lemon', 'banana', 'apple', 'grape', 'strawberry', 'papaya'],
  TROPICALES: ['palm', 'bamboo', 'coconut', 'fern'], // Evitando duplicados de los otros grupos
  COMUNES: ['aloe', 'cactus', 'ficus', 'succulent']
};

const transformPlantData = (apiData: any) => {
  let tipo = apiData.indoor === true ? "interior" : (apiData.indoor === false ? "exterior" : "mixta");
  const sunlightStr = Array.isArray(apiData.sunlight) ? apiData.sunlight.join(' ').toLowerCase() : "";
  let luz = sunlightStr.includes("full sun") ? "alta" : (sunlightStr.includes("partial") ? "media" : "baja");
  const watering = (apiData.watering || "").toLowerCase();
  let riego = watering === "frequent" ? "alto" : (watering === "average" ? "moderado" : "bajo");
  const careLevel = (apiData.care_level || "").toLowerCase();
  let dificultad = careLevel.includes("high") ? "difícil" : (careLevel.includes("low") ? "fácil" : "media");
  
  const nombre = apiData.common_name || "Planta";
  const descripcion = `La ${nombre} es una planta de ${tipo} que requiere luz ${luz} y riego ${riego}.`;

  return { tipo, luz, riego, dificultad, descripcion };
};

async function runImport() {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) {
    console.error('PERENUAL_API_KEY no configurada');
    process.exit(1);
  }

  const allKeywords = Object.values(groups).flat();
  const maxTotal = 100;
  const limitPerKeyword = Math.floor(maxTotal / allKeywords.length) || 1;

  console.log(`🌿 Iniciando importación manual para ${allKeywords.length} palabras clave...`);

  let totalDone = 0;

  for (const kw of allKeywords) {
    if (totalDone >= maxTotal) break;
    
    try {
      const res = await fetch(`https://perenual.com/api/species-list?key=${apiKey}&q=${encodeURIComponent(kw)}`);
      if (!res.ok) continue;

      const data = await res.json();
      const plants = data.data || [];
      
      let kwDone = 0;
      for (const p of plants) {
        if (kwDone >= limitPerKeyword || totalDone >= maxTotal) break;

        const check = await pool.query('SELECT id FROM plants_catalog WHERE external_id = $1', [p.id]);
        if (check.rows.length > 0) continue;

        const { tipo, luz, riego, dificultad, descripcion } = transformPlantData(p);

        await pool.query(
          `INSERT INTO plants_catalog (external_id, nombre, nombre_cientifico, descripcion, tipo, dificultad, luz, riego, imagen_url) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            p.id, 
            p.common_name || kw, 
            p.scientific_name?.[0] || null, 
            descripcion, 
            tipo, 
            dificultad, 
            luz, 
            riego, 
            p.default_image?.original_url || null
          ]
        );

        kwDone++;
        totalDone++;
      }
      console.log(`✅ [${kw}]: +${kwDone}`);
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`Error en ${kw}:`, e);
    }
  }

  console.log(`\n✨ Importación finalizada. Total: ${totalDone} plantas.`);
  process.exit(0);
}

runImport();
