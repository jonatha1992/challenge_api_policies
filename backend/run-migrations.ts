#!/usr/bin/env node

/**
 * Script para ejecutar migraciones SQL en Azure PostgreSQL
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config();

async function runMigrations() {
    console.log('🚀 Ejecutando migraciones en Azure PostgreSQL...\n');

    // Configurar pool de conexiones PostgreSQL para Azure
    // Configurar pool de conexiones PostgreSQL
    const dbUrl = process.env.DATABASE_URL || process.env.DB_URL;

    const connectionConfig = dbUrl
        ? {
            connectionString: dbUrl,
            ssl: { rejectUnauthorized: false }
        }
        : {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: { rejectUnauthorized: false }, // Azure/Railway requieren SSL
        };

    const pool = new Pool({
        ...connectionConfig,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

    try {
        console.log('📍 Conectando a:', process.env.DB_HOST);

        // Intentar conectar
        const client = await pool.connect();
        console.log('✅ Conexión exitosa\n');

        // Leer archivo de migración
        const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '001_create_tables.sql');
        console.log('📄 Leyendo migración:', migrationPath);

        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
        console.log('✅ Migración cargada\n');

        // Ejecutar migración
        console.log('⚙️  Ejecutando migración...');
        await client.query(migrationSQL);
        console.log('✅ Migración ejecutada exitosamente\n');

        // Verificar tablas creadas
        const tablesResult = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📋 Tablas creadas:', tablesResult.rows.map(r => r.table_name).join(', '));

        // Verificar índices creados
        const indexesResult = await client.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
            ORDER BY indexname
        `);

        console.log('🔍 Índices creados:', indexesResult.rows.map(r => r.indexname).join(', '));

        client.release();

        console.log('\n🎉 ¡Migraciones completadas exitosamente!');
        console.log('\n💡 Próximo paso:');
        console.log('   - Inicia el servidor: npm run dev');

        process.exit(0);

    } catch (error: any) {
        console.error('❌ Error al ejecutar migraciones:');
        console.error('Detalles del error:', error.message);
        console.error('Stack:', error.stack);

        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Verificar que las variables necesarias estén configuradas
const hasDbUrl = (process.env.DB_URL && process.env.DB_URL.trim() !== '') ||
    (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');
const hasAllDbVars = process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD;

if (!hasDbUrl && !hasAllDbVars) {
    console.error('❌ Variables de entorno faltantes:');
    console.log('   Debe proporcionar DATABASE_URL/DB_URL o (DB_HOST, DB_USER, DB_PASSWORD)');
    process.exit(1);
}

// Ejecutar migraciones
runMigrations();

