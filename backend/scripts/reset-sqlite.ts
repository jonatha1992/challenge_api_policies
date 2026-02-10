
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import dotenv from 'dotenv';
import { initializeDatabase } from '../src/config/database';

dotenv.config();

async function resetDb() {
    console.log('🗑️  Resetting SQLite database...');
    const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../database/dev.db');

    // Config DB_TYPE to ensure initializeDatabase uses SQLite
    process.env.DB_TYPE = 'sqlite';
    process.env.NODE_ENV = 'development';

    try {
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await db.exec('DROP TABLE IF EXISTS policies');
        await db.exec('DROP TABLE IF EXISTS operations');
        console.log('✅ Tables dropped');

        await db.close();

        console.log('🔄 Re-initializing database...');
        await initializeDatabase();
        console.log('✅ Database reset complete');

    } catch (error) {
        console.error('❌ Error resetting database:', error);
        process.exit(1);
    }
}

resetDb();
