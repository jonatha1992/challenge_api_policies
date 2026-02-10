// Configuración de conexión a la base de datos
// Soporta tanto PostgreSQL (producción) como SQLite (desarrollo local)

import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Determinar qué tipo de base de datos usar
export const useSQLite = process.env.NODE_ENV === 'development' && process.env.DB_TYPE === 'sqlite';

// Detectar si es Azure PostgreSQL (requiere SSL)
const isAzure = process.env.DB_HOST?.includes('postgres.database.azure.com');

// Configuración para PostgreSQL (producción/railway)
const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;

const connectionConfig = dbUrl
  ? {
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false } // Railway requiere SSL para conexiones externas
  }
  : {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'challenge_tekne',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: isAzure || process.env.DB_HOST?.includes('rlwy.net') ? { rejectUnauthorized: false } : undefined,
  };

export const pool = useSQLite ? null : new Pool({
  ...connectionConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Aumentado para conexiones remotas
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


// Wrapper unificado para consultas (abstrae PostgreSQL vs SQLite)
export const query = async (text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> => {
  if (useSQLite) {
    const db = await getSQLiteDb();

    // SQLite usa ? para parámetros, PostgreSQL usa $1, $2, etc.
    // Convertimos $n a ? para compatibilidad básica
    // NOTA: Esto es una conversión simple. Consultas complejas pueden requerir ajustes manuales.
    const sqliteText = text.replace(/\$\d+/g, '?');

    // SQLite no soporta ILIKE (es case-insensitive por defecto con LIKE para ASCII)
    const finalText = sqliteText.replace(/ILIKE/gi, 'LIKE').replace(/::int/gi, '').replace(/::float/gi, '');

    // Detectar si es una consulta de selección o modificación
    const isSelect = /^\s*SELECT/i.test(finalText) || /^\s*WITH/i.test(finalText);

    try {
      if (isSelect) {
        const rows = await db.all(finalText, params);
        return { rows, rowCount: rows.length };
      } else {
        const result = await db.run(finalText, params);
        // Para INSERT/UPDATE/DELETE
        return {
          rows: [],
          rowCount: result.changes || 0
        };
      }
    } catch (error) {
      console.error('SQLite Query Error:', error);
      console.error('SQL:', finalText);
      throw error;
    }
  } else {
    // PostgreSQL
    if (!pool) throw new Error('Database pool not initialized');
    const result = await pool.query(text, params);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  }
};

export const checkConnection = async (): Promise<{ connected: boolean; version?: string; error?: string }> => {
  try {
    if (useSQLite) {
      const db = await getSQLiteDb();
      const result = await db.get('SELECT sqlite_version() as version');
      return { connected: true, version: `SQLite ${result.version}` };
    } else {
      if (!pool) return { connected: false, error: 'Pool not initialized' };
      const client = await pool.connect();
      const result = await client.query('SELECT version()');
      client.release();
      return { connected: true, version: result.rows[0].version.split(' ')[1] };
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          endpoint TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED')),
          correlation_id TEXT NOT NULL,
          rows_inserted INTEGER DEFAULT 0,
          rows_rejected INTEGER DEFAULT 0,
          duration_ms INTEGER,
          error_summary TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_operations_correlation_id ON operations(correlation_id);

        CREATE TABLE IF NOT EXISTS policies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          policy_number TEXT NOT NULL UNIQUE,
          customer TEXT NOT NULL,
          policy_type TEXT NOT NULL CHECK (policy_type IN ('Property', 'Auto', 'Life', 'Health')),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          premium_usd DECIMAL(12,2) NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
          insured_value_usd DECIMAL(15,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          operation_id TEXT,
          FOREIGN KEY (operation_id) REFERENCES operations(id)
        );

        CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
        CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies(policy_number);
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

