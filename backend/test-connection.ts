#!/usr/bin/env node

/**
 * Script para probar la conexión a la base de datos
 * Soporta tanto PostgreSQL como SQLite según la configuración
 */

import { pool, getSQLiteDb, initializeDatabase } from './src/config/database';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const useSQLite = process.env.DB_TYPE === 'sqlite';

async function testDatabaseConnection() {
    console.log('🔍 Probando conexión a la base de datos...\n');

    try {
        if (useSQLite) {
            console.log('📊 Usando SQLite para desarrollo local');
            await initializeDatabase();
            console.log('✅ SQLite inicializado correctamente');

            // Probar una consulta simple
            const db = await getSQLiteDb();
            const result = await db.get('SELECT sqlite_version() as version');
            console.log('📊 Versión de SQLite:', result.version);

            // Verificar tablas
            const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
            console.log('📋 Tablas existentes:', tables.map((t: any) => t.name).join(', '));

        } else {
            console.log('📊 Usando PostgreSQL');
            await initializeDatabase();

            // Ejecutar consultas adicionales de verificación
            const client = await pool!.connect();

            const dbResult = await client.query('SELECT current_database()');
            console.log('📊 Base de datos actual:', dbResult.rows[0].current_database);

            const userResult = await client.query('SELECT current_user');
            console.log('👤 Usuario conectado:', userResult.rows[0].current_user);

            client.release();
        }

        console.log('\n🎉 ¡Conexión a la base de datos funcionando correctamente!');

        if (useSQLite) {
            console.log('\n💡 Para usar PostgreSQL en producción:');
            console.log('   - Configura las variables DB_HOST, DB_USER, etc. en .env');
            console.log('   - Asegúrate de que el firewall de Azure permita tu IP');
            console.log('   - Cambia DB_TYPE=postgres en .env');
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:');
        console.error('Detalles del error:', error);

        if (useSQLite) {
            console.log('\n🔧 Verifica:');
            console.log('- Que tengas permisos de escritura en la carpeta database/');
            console.log('- Que el archivo SQLite no esté corrupto');
        } else {
            console.log('\n🔧 Verifica:');
            console.log('- Que el servidor PostgreSQL esté ejecutándose');
            console.log('- Que las credenciales en .env sean correctas');
            console.log('- Que el firewall permita conexiones al puerto 5432');
            console.log('- Que la base de datos exista');
            console.log('\n💡 Para desarrollo local, considera usar SQLite:');
            console.log('   - Agrega DB_TYPE=sqlite en .env');
        }

        process.exit(1);
    } finally {
        // Cerrar conexiones
        if (!useSQLite && pool) {
            await pool.end();
        }
    }
}

// Ejecutar la prueba
testDatabaseConnection();