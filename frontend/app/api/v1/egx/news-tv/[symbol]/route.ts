import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// TradingView news headlines related to an EGX symbol (or market-wide).
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const sym = symbol.toUpperCase();
        const result = await db.query(
            `SELECT id, title, provider, source, published_at, story_path, related_symbols
             FROM egx_news
             WHERE related_symbols::text ILIKE $1 OR related_symbols::text ILIKE $2
             ORDER BY published_at DESC NULLS LAST
             LIMIT 25`,
            [`%EGX:${sym}%`, `%"${sym}"%`]
        );
        return NextResponse.json({ symbol: sym, source: 'tradingview', items: result.rows });
    } catch (error) {
        console.error('Error fetching EGX news (TV):', error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
