import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { SITE_URL, absUrl, newsPath, fundPath, symbolPath, slugify } from '@/lib/seo';
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
        ['/sectors', 'daily', '0.7'],
        ['/markets/movers', 'hourly', '0.7'],
        ['/about', 'monthly', '0.5'],
        ['/contact', 'monthly', '0.4'],
        ['/AiChat', 'weekly', '0.6'],
        ['/privacy', 'yearly', '0.2'],
        ['/terms', 'yearly', '0.2'],
    ];
    return hubs.map(([path, changefreq, priority]) => ({ loc: SITE_URL + path, changefreq, priority }));
}

async function companyEntries(): Promise<Entry[]> {
    // Sub-tab URLs are DATA-GATED: each sub-tab page notFound()s when its
    // dataset is empty, so the sitemap must only advertise URLs that resolve
    // (the post-deploy audit caught exactly this class of dead-URL defect
    // in the funds segment).
    const result = await db.query(
        `SELECT t.symbol,
                GREATEST(
                    COALESCE(t.last_updated, 'epoch'::timestamptz),
                    COALESCE(t.updated_at, 'epoch'::timestamptz)
                ) AS lastmod,
                EXISTS(SELECT 1 FROM egx_financials f WHERE UPPER(f.symbol) = t.symbol) AS has_fin,
                (EXISTS(SELECT 1 FROM dividend_history d WHERE UPPER(d.symbol) = t.symbol)
                 OR EXISTS(SELECT 1 FROM egx_dividends e WHERE UPPER(e.symbol) = t.symbol AND e.div_yield IS NOT NULL)) AS has_div,
                EXISTS(SELECT 1 FROM egx_technicals x WHERE UPPER(x.symbol) = t.symbol) AS has_tech,
                EXISTS(SELECT 1 FROM ohlc_data o WHERE UPPER(o.symbol) = t.symbol) AS has_hist
         FROM market_tickers t
         WHERE t.last_price IS NOT NULL
           AND COALESCE(t.sector_name,'') <> 'Index' -- EGX30 index row is not a company page
         ORDER BY t.symbol`
    );
    return result.rows.flatMap((r: any) => {
        const base = symbolPath(r.symbol);
        const entries: Entry[] = [
            { loc: absUrl(base), lastmod: r.lastmod, changefreq: 'daily', priority: '0.8' },
        ];
        if (r.has_fin) entries.push({ loc: absUrl(`${base}/financials`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_div) entries.push({ loc: absUrl(`${base}/dividends`), lastmod: r.lastmod, changefreq: 'weekly', priority: '0.6' });
        if (r.has_tech) entries.push({ loc: absUrl(`${base}/technicals`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        if (r.has_hist) entries.push({ loc: absUrl(`${base}/history`), lastmod: r.lastmod, changefreq: 'daily', priority: '0.5' });
        return entries;
    });
}

async function sectorEntries(): Promise<Entry[]> {
    const result = await db.query(
        `SELECT sector_name
         FROM market_tickers
         WHERE last_price IS NOT NULL AND sector_name IS NOT NULL AND sector_name <> ''
           AND sector_name <> 'Index'
         GROUP BY sector_name
         ORDER BY sector_name`
    );
    return result.rows.map((r: any) => ({
        loc: absUrl(`/sectors/${slugify(r.sector_name)}`),
        changefreq: 'daily',
        priority: '0.7',
    }));
}

async function fundEntries(): Promise<Entry[]> {
    // Numeric fund_ids only: the /Funds/[id] route resolves numeric ids, but
    // funds_view also carries legacy string ids (EGY_NEW_*, EGYAAIB*, ...)
    // whose URLs 404 — the post-deploy audit caught 152 dead URLs here.
    const result = await db.query(
        `SELECT fund_id, fund_name, fund_name_en, last_nav_date
         FROM funds_view
         WHERE fund_id::text ~ '^[0-9]+$'
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
    sectors: sectorEntries,
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
