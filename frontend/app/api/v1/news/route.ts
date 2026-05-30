import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';
import { sanitizeNewsText } from '@/lib/news-display';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const idParam = searchParams.get("id");
        const symbol = searchParams.get('symbol');
        const sourceCountry = searchParams.get('source_country');
        const sourceSection = searchParams.get('source_section');
        const language = searchParams.get('language'); // 'ar' | 'en' — filters by source_section suffix
        const days = parseInt(searchParams.get('days') || '0');
        const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100'), 1), 1000);
        const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
        const offset = (page - 1) * limit;
        const searchQuery = searchParams.get('q');
        const newsId = idParam ? parseInt(idParam, 10) : null;

        if (idParam && (!Number.isInteger(newsId) || (newsId ?? 0) <= 0)) {
            return NextResponse.json({ error: "Invalid id filter" }, { status: 400 });
        }

        const filters: string[] = [];
        const params: (string | number)[] = [];

        if (newsId) {
            params.push(newsId);
            filters.push(`id = $${params.length}`);
        }
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
        // Language filter: Arabic sections end with '/ar', English sections do not
        if (language === 'ar') {
            params.push('%/ar');
            filters.push(`source_section LIKE $${params.length}`);
        } else if (language === 'en') {
            params.push('%/ar');
            filters.push(`(source_section NOT LIKE $${params.length} OR source_section IS NULL)`);
        }
        if (searchQuery && searchQuery.trim() !== '') {
            params.push(`%${searchQuery.trim().toLowerCase()}%`);
            filters.push(`(LOWER(headline) LIKE $${params.length} OR LOWER(article_body) LIKE $${params.length} OR LOWER(symbol) LIKE $${params.length})`);
        }
        if (days > 0) {
            params.push(days);
            filters.push(`published_at >= NOW() - ($${params.length} * INTERVAL '1 day')`);
        }

        params.push(limit);
        const limitIndex = params.length;

        let offsetClause = '';
        if (offset > 0) {
            params.push(offset);
            offsetClause = `OFFSET $${params.length}`;
        }

        const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const result = await db.query(`
            SELECT id, symbol, headline, source, url, published_at, sentiment_score,
                   article_body, image_url, published_date_raw, source_section, source_country, external_id
            FROM market_news
            ${whereClause}
            ORDER BY published_at DESC
            LIMIT $${limitIndex}
            ${offsetClause}
        `, params);

        const sanitizedRows = result.rows.map((row) => ({
            ...row,
            headline: sanitizeNewsText(row.headline) || "Egypt Market Update",
            article_body: sanitizeNewsText(row.article_body) || null,
            source: null,
        }));

        return NextResponse.json(sanitizedRows);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown server error';
        console.error('[API /news ERROR]', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
