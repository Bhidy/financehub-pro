import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-dynamic';

/**
 * Sitemap INDEX. Segmented child sitemaps live under /sitemaps/{name}.xml so
 * Search Console reports indexation per content type (companies vs funds vs
 * news vs learn) instead of one opaque number.
 *
 * lastmod is OBSERVED, not generated. Every segment previously reported
 * `new Date()` — so all ten children claimed to change on every single fetch.
 * A lastmod that always equals "now" carries no information, and search
 * engines learn to ignore it, which forfeits the freshness signal for the
 * whole site (Google Search Central: lastmod is used only when it is
 * "consistently and verifiably accurate"). Each segment now reports the real
 * max timestamp of the data it lists; content-driven segments report the
 * deploy time, which is genuinely when their contents last changed.
 */

/** Deploy time — the honest lastmod for segments whose contents are code/content,
 *  not data. Vercel exposes the commit SHA but not its date, so fall back to
 *  process start, which on serverless is the deploy's cold-boot. */
const DEPLOY_TIME = new Date();

/** One query per data family, all cheap MAX() scans, run in parallel and
 *  individually fault-tolerant: a single failed segment must degrade to "no
 *  lastmod" (a valid, honest sitemap) and never 500 the whole index. */
async function maxTimestamp(sql: string): Promise<Date | null> {
    try {
        const r = await db.query(sql);
        const v = r.rows?.[0]?.ts;
        if (!v) return null;
        const d = new Date(v);
        return Number.isFinite(d.getTime()) ? d : null;
    } catch {
        return null;
    }
}

export async function GET() {
    const [tickerTs, fundTs, newsTs] = await Promise.all([
        maxTimestamp(
            `SELECT GREATEST(MAX(last_updated), MAX(updated_at)) AS ts FROM market_tickers WHERE last_price IS NOT NULL`
        ),
        maxTimestamp(`SELECT MAX(last_nav_date) AS ts FROM funds_view`),
        maxTimestamp(`SELECT MAX(published_at) AS ts FROM market_news`),
    ]);

    // Never report a future timestamp — a clock-skewed or bad row would make
    // the whole index look fabricated.
    const clamp = (d: Date | null): Date | null => (d && d.getTime() <= Date.now() ? d : d ? new Date() : null);

    const SEGMENTS: Array<[string, Date | null]> = [
        ['core', DEPLOY_TIME],
        ['companies', clamp(tickerTs)],
        ['ar-companies', clamp(tickerTs)],
        ['metrics', clamp(tickerTs)],
        ['sectors', clamp(tickerTs)],
        ['funds', clamp(fundTs)],
        ['fund-categories', clamp(fundTs)],
        ['fund-providers', clamp(fundTs)],
        ['comparisons', clamp(fundTs)],
        ['learn', DEPLOY_TIME],
        ['glossary', DEPLOY_TIME],
        ['news', clamp(newsTs)],
    ];

    const items = SEGMENTS.map(([name, ts]) => {
        const lastmod = ts ? `\n    <lastmod>${ts.toISOString()}</lastmod>` : '';
        return `  <sitemap>\n    <loc>${SITE_URL}/sitemaps/${name}.xml</loc>${lastmod}\n  </sitemap>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
    return new NextResponse(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
    });
}
