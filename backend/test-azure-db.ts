#!/usr/bin/env node

/**
 * Script para probar la conexión a PostgreSQL de Azure
 * Útil para verificar la configuración de producción
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

async function testAzurePostgresConnection() {
    console.log('🔍 Probando conexión a Azure PostgreSQL...\n');

    // Configurar pool de conexiones PostgreSQL para Azure
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }, // Azure requiere SSL
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

    try {
        console.log('📍 Conectando a:', process.env.DB_HOST);

        // Intentar conectar
        const client = await pool.connect();
        console.log('✅ Conexión exitosa al servidor PostgreSQL de Azure');

        // Ejecutar consultas de verificación
        const versionResult = await client.query('SELECT version()');
        console.log('📊 Versión de PostgreSQL:', versionResult.rows[0].version.split(' ')[1]);

        const dbResult = await client.query('SELECT current_database()');
        console.log('📊 Base de datos actual:', dbResult.rows[0].current_database);

        const userResult = await client.query('SELECT current_user');
        console.log('👤 Usuario conectado:', userResult.rows[0].current_user);

        // Verificar si las tablas existen
        const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        if (tablesResult.rows.length > 0) {
            console.log('📋 Tablas existentes:', tablesResult.rows.map(r => r.table_name).join(', '));
        } else {
            console.log('📋 No hay tablas creadas aún. Ejecuta las migraciones.');
        }

        client.release();

        console.log('\n🎉 ¡Conexión a Azure PostgreSQL funcionando correctamente!');
        console.log('\n💡 Próximos pasos:');
        console.log('   - Ejecuta las migraciones: psql $DATABASE_URL -f database/migrations/001_create_tables.sql');
        console.log('   - Inicia el servidor: npm run dev');

        process.exit(0);

    } catch (error: any) {
        console.error('❌ Error al conectar a Azure PostgreSQL:');
        console.error('Detalles del error:', error.message);

        if (error.code === '28000') {
            console.log('\n🔧 Problema de autenticación:');
            console.log('- Verifica que las credenciales en .env sean correctas');
            console.log('- Asegúrate de que el usuario tenga permisos en la base de datos');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('\n🔧 Problema de conexión:');
            console.log('- Verifica que el servidor esté ejecutándose');
            console.log('- Confirma que el puerto 5432 esté abierto');
        } else if (error.message.includes('no pg_hba.conf entry')) {
            console.log('\n🔧 Problema de firewall:');
            console.log('- Tu IP no está permitida en el firewall de Azure PostgreSQL');
            console.log('- Ve al portal de Azure > PostgreSQL > Firewall > Agrega tu IP');
            console.log('- O configura "Allow access to Azure services" = Yes');
        }

        console.log('\n🔧 Verificaciones generales:');
        console.log('- Que las variables de entorno estén configuradas correctamente');
        console.log('- Que el servidor PostgreSQL esté disponible');
        console.log('- Que el firewall permita conexiones desde tu IP');

        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Verificar que las variables necesarias estén configuradas
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('❌ Variables de entorno faltantes:');
    console.log('   - DB_HOST: servidor PostgreSQL');
    console.log('   - DB_USER: usuario de la base de datos');
    console.log('   - DB_PASSWORD: contraseña del usuario');
    console.log('\n💡 Configura estas variables en el archivo .env');
    process.exit(1);
}

// Ejecutar la prueba
testAzurePostgresConnection();
