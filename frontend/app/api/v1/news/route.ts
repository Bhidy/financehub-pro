import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const limit = parseInt(searchParams.get('limit') || '50');

        if (symbol) {
            // Filter by symbol
            const result = await db.query(`
                SELECT id, symbol, headline, source, url, published_at, sentiment_score 
                FROM market_news 
                WHERE symbol = $1
                ORDER BY published_at DESC 
                LIMIT $2
            `, [symbol, limit]);
            return NextResponse.json(result.rows);
        }

        // All news
        const result = await db.query(`
            SELECT id, symbol, headline, source, url, published_at, sentiment_score 
            FROM market_news 
            ORDER BY published_at DESC 
            LIMIT $1
        `, [limit]);

        return NextResponse.json(result.rows);
    } catch (error: any) {
        console.error('[API /news ERROR]', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
