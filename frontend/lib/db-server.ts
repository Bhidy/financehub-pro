import { Pool, QueryResult } from 'pg';

/**
 * FinanceHub Pro - Enterprise Database Client
 * Features:
 * - Lazy pool initialization (avoids build-time errors)
 * - SSL support for Supabase
 * - Clear error logging
 * - Connection health diagnostics
 */

let pool: Pool | null = null;
let connectionAttempted = false;
let lastConnectionError: Error | null = null;

function getPool(): Pool {
    if (pool) return pool;

    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        const error = new Error(
            '[DB CRITICAL] DATABASE_URL is not defined. ' +
            'This variable must be set in the Vercel Dashboard for production.'
        );
        console.error(error.message);
        lastConnectionError = error;
        throw error;
    }

    // Remove sslmode from URL to prevent conflict with our SSL config
    connectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, '');

    console.log('[DB] Initializing connection pool...');
    connectionAttempted = true;

    pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }, // Accept Supabase/Neon certificates
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // 10s timeout (increased for cold starts)
    });

    // Log pool errors
    pool.on('error', (err) => {
        console.error('[DB POOL ERROR]', err.message);
        lastConnectionError = err;
    });

    pool.on('connect', () => {
        console.log('[DB] New client connected to pool.');
    });

    return pool;
}

// Enterprise query wrapper with error context
async function query(text: string, params?: any[]): Promise<QueryResult> {
    try {
        const result = await getPool().query(text, params);
        return result;
    } catch (error: any) {
        console.error('[DB QUERY ERROR]', {
            query: text.substring(0, 100) + '...',
            error: error.message,
            code: error.code,
        });
        throw error;
    }
}

// Health check for diagnostics API
async function healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
        await getPool().query('SELECT 1');
        return { ok: true, latencyMs: Date.now() - start };
    } catch (error: any) {
        return { ok: false, latencyMs: Date.now() - start, error: error.message };
    }
}

export const db = {
    query,
    healthCheck,
    getStatus: () => ({
        poolInitialized: !!pool,
        connectionAttempted,
        lastError: lastConnectionError?.message || null,
    }),
};
