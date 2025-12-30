import { Pool } from 'pg';

// Lazy pool initialization to avoid build-time errors
let pool: Pool | null = null;

function getPool(): Pool {
    if (pool) return pool;

    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not defined in environment variables');
    }

    // ENTERPRISE FIX: Remove sslmode from URL to prevent conflict with our SSL config
    // Supabase pooler requires SSL but we need to accept their certificate
    connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');

    console.log('[DB] Connecting to database...');

    pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }, // Accept Supabase self-signed cert
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

    return pool;
}

export const db = {
    query: (text: string, params?: any[]) => getPool().query(text, params),
};
