import { Pool } from 'pg';

// Lazy pool initialization to avoid build-time errors
let pool: Pool | null = null;

function getPool(): Pool {
    if (pool) return pool;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not defined in environment variables');
    }

    pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    return pool;
}

export const db = {
    query: (text: string, params?: any[]) => getPool().query(text, params),
};
