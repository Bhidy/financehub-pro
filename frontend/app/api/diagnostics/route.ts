import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public backend health probe used by useBackendHealth (AI chat widget online/offline dot).
 * Returns 200 when the database is reachable, 503 otherwise.
 *
 * SECURITY: this endpoint is unauthenticated, so it must NEVER expose the connection
 * string, host, project ref, schema, column names, or row data. Return only a status.
 */
export async function GET() {
    try {
        const health = await db.healthCheck();
        if (health?.ok) {
            return NextResponse.json({ status: 'ok' }, { status: 200 });
        }
        return NextResponse.json({ status: 'degraded' }, { status: 503 });
    } catch {
        return NextResponse.json({ status: 'error' }, { status: 503 });
    }
}
