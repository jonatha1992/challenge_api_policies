// Configuración de conexión a la base de datos
// Soporta tanto PostgreSQL (producción) como SQLite (desarrollo local)

import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Determinar qué tipo de base de datos usar
const useSQLite = process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'sqlite';

// Detectar si es Azure PostgreSQL (requiere SSL)
const isAzure = process.env.DB_HOST?.includes('postgres.database.azure.com');

// Configuración para PostgreSQL (producción/Azure)
export const pool = useSQLite ? null : new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'challenge_teknet',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: isAzure ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Configuración para SQLite (desarrollo local)
let sqliteDb: Database | null = null;

export const getSQLiteDb = async (): Promise<Database> => {
  if (!sqliteDb) {
    sqliteDb = await open({
      filename: process.env.SQLITE_DB_PATH || './database/dev.db',
      driver: sqlite3.Database,
    });
  }
  return sqliteDb;
};

/**
 * Función que inicializa y verifica la conexión a la base de datos.
 * Funciona tanto con PostgreSQL como con SQLite.
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (useSQLite) {
      // Inicializar SQLite
      const db = await getSQLiteDb();
      console.log('✅ Conexión exitosa a SQLite (desarrollo)');

      // Crear tablas básicas si no existen
      await db.exec(`
        CREATE TABLE IF NOT EXISTS operations (
          id TEXT PRIMARY KEY,
          correlation_id TEXT,
          filename TEXT,
          status TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS policies (
          id TEXT PRIMARY KEY,
          operation_id TEXT,
          policy_number TEXT,
          insured_value REAL,
          premium REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (operation_id) REFERENCES operations(id)
        );
      `);

      console.log('✅ Tablas de SQLite inicializadas');
    } else {
      // Inicializar PostgreSQL
      const client = await pool!.connect();
      const dbType = isAzure ? 'Azure PostgreSQL' : 'PostgreSQL';
      console.log(`✅ Conexión exitosa a ${dbType}`);

      // Verificar versión
      const result = await client.query('SELECT version()');
      console.log('📊 PostgreSQL versión:', result.rows[0].version.split(' ')[1]);

      client.release();
    }
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error);
    throw error;
  }
};
