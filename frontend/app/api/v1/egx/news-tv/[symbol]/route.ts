import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import { sanitizeNewsText } from '@/lib/news-display';
import { scrubVendorNames, publicUrl, publicImageUrl, publicSourceName } from '@/lib/vendor-privacy';

export const dynamic = 'force-dynamic';

// TradingView-native per-symbol news for an EGX stock.
// PRIMARY: TradingView's live headlines endpoint (TV-identical breadth + freshness,
// works for small caps). ENRICHED + made never-fail by merging our market_news
// feed (which carries full article bodies + sentiment + images). Deduped by title.
// If TV is unreachable, we still serve market_news; if both are empty, [].
// Returns the market_news item shape the News tab already renders.
const TV_NEWS = 'https://news-headlines.tradingview.com/v2/headlines';

function normTitle(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 44);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const sym = symbol.toUpperCase().replace('.CA', '');
    const lang = new URL(request.url).searchParams.get('lang') === 'ar' ? 'ar' : 'en';

    // 1) Our enriched local feed (full bodies + sentiment + images).
    let local: any[] = [];
    try {
        const langClause = lang === 'ar'
            ? "AND (content_language = 'ar' OR source_section ILIKE '%/ar')"
            : "AND (content_language IS NULL OR content_language <> 'ar')";
        const r = await db.query(
            `SELECT id, headline, source, url, published_at, sentiment_score, article_body, image_url
             FROM market_news
             WHERE (symbol = $1 OR symbol = $2) ${langClause}
             ORDER BY published_at DESC NULLS LAST
             LIMIT 30`,
            [sym, `${sym}.CA`]
        );
        // EGRESS BOUNDARY. This feed is read straight by the symbol page's News
        // tab (a client component), so every field leaves here already clean:
        // text through the shared hygiene pass, supplier identity removed by
        // lib/vendor-privacy.ts. Before this, `source`, `url`, `image_url` and
        // `origin` were returned verbatim — 71 supplier strings in a single
        // 30-row response, rendered on every EGX symbol page.
        local = r.rows.map((x: any) => ({
            id: x.id,                       // enables the in-app article route /news/{id}
            headline: scrubVendorNames(sanitizeNewsText(x.headline)),
            source: publicSourceName(x.source),
            url: publicUrl(x.url),
            published_at: x.published_at,
            sentiment_score: x.sentiment_score != null ? Number(x.sentiment_score) : null,
            article_body: scrubVendorNames(sanitizeNewsText(x.article_body)) || null,
            image_url: publicImageUrl(x.image_url, x.id),
            origin: publicSourceName(x.source) || 'local',
        }));
    } catch (e) {
        console.warn('[news-tv] local feed query failed', e);
    }

    // 2) TradingView live headlines (TV-native). Time-boxed; failures fall back to local.
    let tv: any[] = [];
    try {
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 8000);
        const resp = await fetch(`${TV_NEWS}?client=overview&lang=${lang}&symbol=EGX:${sym}`, {
            headers: { Origin: 'https://www.tradingview.com', 'User-Agent': 'Mozilla/5.0' },
            signal: ctrl.signal,
            cache: 'no-store',
        });
        clearTimeout(to);
        if (resp.ok) {
            const j = await resp.json();
            // TradingView syndicates the same Egyptian wires we ingest, so a TV
            // item can carry the supplier as its `provider`. Same boundary rule.
            tv = (j.items || []).map((it: any) => ({
                id: null,                   // TV items have no in-app article -> link via `url`
                headline: scrubVendorNames(sanitizeNewsText(it.title)),
                source: publicSourceName(it.provider || it.source) || 'TradingView',
                url: it.storyPath ? `https://www.tradingview.com${it.storyPath}` : null,
                published_at: it.published ? new Date(it.published * 1000).toISOString() : null,
                sentiment_score: null,
                article_body: null,
                image_url: null,
                origin: 'tradingview',
            }));
        }
    } catch (e) {
        // TradingView unreachable -> rely on the local feed (never-fail).
    }

    // 3) Merge: rich local items first, then TV items whose title isn't already present.
    const seen = new Set(local.map((x) => normTitle(x.headline)).filter(Boolean));
    const merged = [...local];
    for (const t of tv) {
        const k = normTitle(t.headline);
        if (k && !seen.has(k)) {
            seen.add(k);
            merged.push(t);
        }
    }
    merged.sort((a, b) => {
        const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
        const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
        return tb - ta;
    });

    return NextResponse.json(merged.slice(0, 30), {
        headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=900' },
    });
}
