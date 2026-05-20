import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { logger } from './utils/logger';

dotenv.config();

const { Pool } = pg;

// Configuración del pool de conexión a PostgreSQL
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necesario para conexiones a Render/AWS
  }
});

// Función para inicializar la base de datos
export async function initDb() {
  try {
    // 1. Crear tablas base si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_pic_url TEXT,
        banner_image_url TEXT,
        username VARCHAR(100),
        bio TEXT,
        location TEXT,
        favorite_plants TEXT[],
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS plants_catalog (
        id SERIAL PRIMARY KEY,
        external_id INTEGER UNIQUE,
        nombre VARCHAR(255) UNIQUE NOT NULL,
        nombre_cientifico VARCHAR(255),
        familia VARCHAR(255),
        genero VARCHAR(255),
        descripcion TEXT,
        descripcion_corta TEXT,
        tipo VARCHAR(100),
        dificultad VARCHAR(100),
        luz VARCHAR(100),
        riego VARCHAR(100),
        imagen_url TEXT,
        ai_processed BOOLEAN DEFAULT FALSE,
        is_new BOOLEAN DEFAULT TRUE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_plants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plant_id INTEGER REFERENCES plants_catalog(id) ON DELETE CASCADE,
        nombre_personalizado VARCHAR(255),
        ultima_fecha_riego TIMESTAMP,
        frecuencia_riego_dias INTEGER DEFAULT 7,
        ultima_fertilizacion TIMESTAMP,
        frecuencia_fertilizacion_dias INTEGER DEFAULT 30,
        fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, plant_id)
      );

      CREATE TABLE IF NOT EXISTS plant_logs (
        id SERIAL PRIMARY KEY,
        user_plant_id INTEGER REFERENCES user_plants(id) ON DELETE CASCADE,
        tipo_evento VARCHAR(50) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        nota TEXT
      );

      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        contenido TEXT NOT NULL,
        imagen_url TEXT,
        tipo VARCHAR(50) DEFAULT 'experiencia',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        contenido TEXT NOT NULL,
        is_ai BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS post_likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS comment_likes (
        id SERIAL PRIMARY KEY,
        comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(comment_id, user_id)
      );
    `);

    // 2. Asegurar que las columnas existen (Manejo de migración manual)
    const columnsCheck = [
      { table: 'users', column: 'username', type: 'VARCHAR(100)' },
      { table: 'users', column: 'bio', type: 'TEXT' },
      { table: 'users', column: 'location', type: 'TEXT' },
      { table: 'users', column: 'favorite_plants', type: 'TEXT[]' },
      { table: 'users', column: 'banner_image_url', type: 'TEXT' },
      { table: 'posts', column: 'is_ai', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'plants_catalog', column: 'external_id', type: 'INTEGER UNIQUE' },
      { table: 'plants_catalog', column: 'nombre_cientifico', type: 'VARCHAR(255)' },
      { table: 'plants_catalog', column: 'descripcion_corta', type: 'TEXT' },
      { table: 'plants_catalog', column: 'familia', type: 'VARCHAR(255)' },
      { table: 'plants_catalog', column: 'genero', type: 'VARCHAR(255)' },
      { table: 'plants_catalog', column: 'dificultad', type: 'VARCHAR(100)' },
      { table: 'plants_catalog', column: 'luz', type: 'VARCHAR(100)' },
      { table: 'plants_catalog', column: 'riego', type: 'VARCHAR(100)' },
      { table: 'plants_catalog', column: 'imagen_url', type: 'TEXT' },
      { table: 'plants_catalog', column: 'image_source', type: 'VARCHAR(100)' },
      { table: 'plants_catalog', column: 'image_last_updated', type: 'TIMESTAMP' },
      { table: 'plants_catalog', column: 'image_validated', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'plants_catalog', column: 'ai_processed', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'plants_catalog', column: 'is_new', type: 'BOOLEAN DEFAULT TRUE' },
      { table: 'users', column: 'profile_pic_url', type: 'TEXT' },
      { table: 'user_plants', column: 'nombre_personalizado', type: 'VARCHAR(255)' },
      { table: 'user_plants', column: 'ultima_fecha_riego', type: 'TIMESTAMP' },
      { table: 'user_plants', column: 'frecuencia_riego_dias', type: 'INTEGER DEFAULT 7' },
      { table: 'user_plants', column: 'ultima_fertilizacion', type: 'TIMESTAMP' },
      { table: 'user_plants', column: 'frecuencia_fertilizacion_dias', type: 'INTEGER DEFAULT 30' },
      { table: 'posts', column: 'tipo', type: 'VARCHAR(50) DEFAULT \'experiencia\'' },
      { table: 'comments', column: 'is_ai', type: 'BOOLEAN DEFAULT FALSE' },
      { table: 'comments', column: 'parent_id', type: 'INTEGER REFERENCES comments(id) ON DELETE CASCADE' }
    ];

    for (const item of columnsCheck) {
      await pool.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.type};
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column ${item.column} already exists in ${item.table}.';
          END;
        END $$;
      `);
    }

    // 2.1. Asegurar restricciones UNIQUE para ON CONFLICT
    await pool.query(`
      DO $$
      BEGIN
        -- Limpiar duplicados en user_plants antes de aplicar el UNIQUE
        DELETE FROM user_plants a USING user_plants b
        WHERE a.id > b.id AND a.user_id = b.user_id AND a.plant_id = b.plant_id;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_plants_user_id_plant_id_key') THEN
          ALTER TABLE user_plants ADD CONSTRAINT user_plants_user_id_plant_id_key UNIQUE (user_id, plant_id);
        END IF;

        -- Limpiar duplicados en plants_catalog por nombre
        DELETE FROM plants_catalog a USING plants_catalog b
        WHERE a.id > b.id AND a.nombre = b.nombre;
        
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plants_catalog_nombre_key') THEN
          ALTER TABLE plants_catalog ADD CONSTRAINT plants_catalog_nombre_key UNIQUE (nombre);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plants_catalog_external_id_key') THEN
          -- Asegurar que external_id no tenga nulos duplicados si se intenta hacer UNIQUE
          -- (Postgres permite múltiples nulos en UNIQUE, pero borramos por seguridad si hay IDs reales repetidos)
          DELETE FROM plants_catalog a USING plants_catalog b
          WHERE a.id > b.id AND a.external_id = b.external_id AND a.external_id IS NOT NULL;
          
          ALTER TABLE plants_catalog ADD CONSTRAINT plants_catalog_external_id_key UNIQUE (external_id);
        END IF;

        -- Nuevo: UNIQUE por nombre_cientifico
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plants_catalog_nombre_cientifico_key') THEN
          -- Limpiar duplicados previos por nombre científico si existen
          DELETE FROM plants_catalog a USING plants_catalog b
          WHERE a.id > b.id AND a.nombre_cientifico = b.nombre_cientifico AND a.nombre_cientifico IS NOT NULL;

          ALTER TABLE plants_catalog ADD CONSTRAINT plants_catalog_nombre_cientifico_key UNIQUE (nombre_cientifico);
        END IF;
      EXCEPTION
        WHEN others THEN 
          RAISE NOTICE 'Error al aplicar restricciones: %', SQLERRM;
      END $$;
    `);

    logger.info('Database connected successfully.');

    // 3. Sembrar el usuario administrador si no existe
    const adminCheck = await pool.query("SELECT id FROM users WHERE email = 'admin'");
    if (adminCheck.rows.length === 0) {
      const hashedPw = await bcrypt.hash('123', 10);
      await pool.query(
        "INSERT INTO users (email, password, is_admin) VALUES ('admin', $1, TRUE)",
        [hashedPw]
      );
      logger.info('Usuario administrador creado: admin / 123');
    }

    const userCountResult = await pool.query("SELECT COUNT(*) FROM users");
    logger.info(`Usuarios encontrados: ${userCountResult.rows[0].count}`);

  } catch (error) {
    logger.error({ message: 'Error al inicializar la base de datos', error });
  }
}
