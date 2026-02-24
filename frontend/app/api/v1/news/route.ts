import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol');
        const sourceCountry = searchParams.get('source_country');
        const sourceSection = searchParams.get('source_section');
        const days = parseInt(searchParams.get('days') || '0');
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100'), 1), 1000);

        const filters: string[] = [];
        const params: (string | number)[] = [];

        if (symbol) {
            params.push(symbol);
            filters.push(`symbol = $${params.length}`);
        }
        if (sourceCountry) {
            params.push(sourceCountry.toUpperCase());
            filters.push(`source_country = $${params.length}`);
        }
        if (sourceSection) {
            params.push(sourceSection);
            filters.push(`source_section = $${params.length}`);
        }
        if (days > 0) {
            params.push(days);
            filters.push(`published_at >= NOW() - ($${params.length} * INTERVAL '1 day')`);
        }

        params.push(limit);
        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const result = await db.query(`
            SELECT id, symbol, headline, source, url, published_at, sentiment_score,
                   article_body, image_url, published_date_raw, source_section, source_country, external_id
            FROM market_news
            ${whereClause}
            ORDER BY published_at DESC
            LIMIT $${params.length}
        `, params);

        return NextResponse.json(result.rows);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        console.error('[API /news ERROR]', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
