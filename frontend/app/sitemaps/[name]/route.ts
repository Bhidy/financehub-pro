import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { SITE_URL, absUrl, newsPath, fundPath, symbolPath } from '@/lib/seo';
import learnTopics from '@/content/learn-topics.generated';

export const dynamic = 'force-dynamic';

/**
 * Segmented child sitemaps: /sitemaps/{core|companies|funds|learn|news}.xml
 * Every <loc> is the canonical form (apex host, canonical casing, slugged
 * detail URLs) — the same builders the pages themselves use (lib/seo.ts).
 */

type Entry = { loc: string; lastmod?: string | null; changefreq?: string; priority?: string };

function render(entries: Entry[]): string {
    const body = entries
        .map((e) => {
            const parts = [`    <loc>${e.loc}</loc>`];
            if (e.lastmod) parts.push(`    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>`);
            if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
            if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
            return `  <url>\n${parts.join('\n')}\n  </url>`;
        })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

async function coreEntries(): Promise<Entry[]> {
    const hubs: Array<[string, string, string]> = [
        ['/', 'hourly', '1.0'],
        ['/News', 'hourly', '0.9'],
        ['/Funds', 'daily', '0.9'],
        ['/Funds/Compare', 'daily', '0.6'],
        ['/Market-Pulse', 'hourly', '0.9'],
        ['/Learn', 'weekly', '0.8'],
        ['/companies', 'daily', '0.9'],
        ['/about', 'monthly', '0.5'],
        ['/contact', 'monthly', '0.4'],
        ['/AiChat', 'weekly', '0.6'],
        ['/privacy', 'yearly', '0.2'],
        ['/terms', 'yearly', '0.2'],
    ];
    return hubs.map(([path, changefreq, priority]) => ({ loc: SITE_URL + path, changefreq, priority }));
}

async function companyEntries(): Promise<Entry[]> {
    const result = await db.query(
        `SELECT symbol, GREATEST(
             COALESCE(last_updated, 'epoch'::timestamptz),
             COALESCE(updated_at, 'epoch'::timestamptz)
         ) AS lastmod
         FROM market_tickers
         WHERE last_price IS NOT NULL
         ORDER BY symbol`
    );
    return result.rows.map((r: any) => ({
        loc: absUrl(symbolPath(r.symbol)),
        lastmod: r.lastmod,
        changefreq: 'daily',
        priority: '0.8',
    }));
}

async function fundEntries(): Promise<Entry[]> {
    const result = await db.query(
        `SELECT fund_id, fund_name, fund_name_en, last_nav_date
         FROM funds_view
         ORDER BY fund_id`
    );
    return result.rows.map((r: any) => ({
        loc: absUrl(fundPath(r.fund_id, r.fund_name_en, r.fund_name)),
        lastmod: r.last_nav_date,
        changefreq: 'daily',
        priority: '0.7',
    }));
}

async function learnEntries(): Promise<Entry[]> {
    // EN + AR pairs (reciprocal hreflang lives in the pages' metadata).
    return (learnTopics as Array<{ slug: string }>).flatMap((t) => [
        { loc: absUrl(`/Learn/${t.slug}`), changefreq: 'monthly', priority: '0.7' },
        { loc: absUrl(`/ar/Learn/${t.slug}`), changefreq: 'monthly', priority: '0.7' },
    ]);
}

async function newsEntries(): Promise<Entry[]> {
    // Full archive (well under the 50k/sitemap limit; revisit when we approach it).
    const result = await db.query(
        `SELECT id, headline, published_at
         FROM market_news
         ORDER BY published_at DESC
         LIMIT 45000`
    );
    return result.rows.map((r: any) => ({
        loc: absUrl(newsPath(r.id, r.headline)),
        lastmod: r.published_at,
        changefreq: 'never',
        priority: '0.5',
    }));
}

const BUILDERS: Record<string, () => Promise<Entry[]>> = {
    core: coreEntries,
    companies: companyEntries,
    funds: fundEntries,
    learn: learnEntries,
    news: newsEntries,
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ name: string }> }
) {
    const { name } = await params;
    const key = (name || '').replace(/\.xml$/, '');
    const builder = BUILDERS[key];
    if (!builder) {
        return new NextResponse('Not found', { status: 404 });
    }
    try {
        const entries = await builder();
        return new NextResponse(render(entries), {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error: any) {
        console.error(`[sitemap:${key}]`, error.message);
        return new NextResponse('Sitemap temporarily unavailable', { status: 503 });
    }
}
