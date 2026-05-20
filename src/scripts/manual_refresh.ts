import { pool } from '../server/db.ts';
import dotenv from 'dotenv';
dotenv.config();

const transformPlantData = (apiData: any) => {
  let tipo = apiData.indoor === true ? "interior" : (apiData.indoor === false ? "exterior" : "mixta");
  const sunlightStr = Array.isArray(apiData.sunlight) ? apiData.sunlight.join(' ').toLowerCase() : "";
  let luz = sunlightStr.includes("full sun") ? "alta" : (sunlightStr.includes("partial") ? "media" : "baja");
  const watering = (apiData.watering || "").toLowerCase();
  let riego = watering === "frequent" ? "alto" : (watering === "average" ? "moderado" : "bajo");
  const careLevel = (apiData.care_level || "").toLowerCase();
  let dificultad = careLevel.includes("high") ? "difícil" : (careLevel.includes("low") ? "fácil" : "media");
  
  const scientificName = Array.isArray(apiData.scientific_name) ? apiData.scientific_name[0] : (apiData.scientific_name || null);
  const nombre = apiData.common_name || "Planta";
  const descripcion = `La ${nombre} es una planta de ${tipo} que requiere luz ${luz} y riego ${riego}.`;

  return { tipo, luz, riego, dificultad, descripcion, scientificName };
};

async function runRefresh() {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) {
    console.error('PERENUAL_API_KEY no configurada');
    process.exit(1);
  }

  const catalogRes = await pool.query('SELECT id, external_id, nombre FROM plants_catalog WHERE external_id IS NOT NULL');
  const plants = catalogRes.rows;

  console.log(`🌿 Iniciando actualización de detalles para ${plants.length} plantas...`);

  let updated = 0;

  for (const p of plants) {
    try {
      const res = await fetch(`https://perenual.com/api/species/details/${p.external_id}?key=${apiKey}`);
      
      if (res.status === 429) {
        console.warn('Rate limit alcanzado. Deteniendo.');
        break;
      }

      if (!res.ok) {
        console.error(`Error en ${p.nombre}: ${res.statusText}`);
        continue;
      }

      const details = await res.json();
      const data = transformPlantData(details);

      await pool.query(
        `UPDATE plants_catalog 
         SET tipo = $1, luz = $2, riego = $3, dificultad = $4, descripcion = $5, nombre_cientifico = $6
         WHERE id = $7`,
        [data.tipo, data.luz, data.riego, data.dificultad, data.descripcion, data.scientificName, p.id]
      );

      updated++;
      console.log(`✅ Actualizada: ${p.nombre}`);
      await new Promise(r => setTimeout(r, 100)); // Pequeño delay
    } catch (e) {
      console.error(`Fallo en ${p.nombre}:`, e);
    }
  }

  console.log(`\n✨ Sincronización finalizada. Total actualizadas: ${updated}`);
  process.exit(0);
}

runRefresh();
