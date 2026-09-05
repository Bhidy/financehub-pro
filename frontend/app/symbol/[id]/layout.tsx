import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTicker, getTickerAny } from "@/lib/public-data";
import { symbolPath, symbolPathAr } from "@/lib/seo";
import { clampTitle } from '@/lib/seo';

/**
 * Server layer shared by the symbol overview AND its sub-tab pages
 * (/financials, /dividends, /technicals, /history):
 *   - validates the symbol against market_tickers and 404s unknown ones
 *     (previously ANY invented ticker returned HTTP 200 — infinite soft-404s)
 *   - default per-company metadata (sub-tab pages override title/canonical)
 * The crawler-visible SEO section renders from the overview page.tsx only —
 * NOT here — so sub-tabs don't duplicate it on six URLs per symbol.
 */

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

/**
 * DB-outage resilience: the client app fetches its own data, so if the DB is
 * unreachable we degrade to the plain client page instead of 500ing the whole
 * route. 'unavailable' ≠ 'unknown symbol' — only the latter is a 404.
 */
async function lookupTicker(symbol: string) {
    try {
        const ticker = await getTicker(symbol);
        if (ticker) return { ticker, dbOk: true, listed: true };
        // A real but non-listed symbol (delisted, alias, rights, unverified)
        // resolves through the identity lookup so its status page can render;
        // it is never indexed and its sub-tabs (which use getTicker) 404.
        const any = await getTickerAny(symbol);
        return { ticker: any, dbOk: true, listed: false };
    } catch {
        return { ticker: null, dbOk: false, listed: false };
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    const symbol = (id || "").toUpperCase();
    const { ticker, dbOk, listed } = symbol ? await lookupTicker(symbol) : { ticker: null, dbOk: true, listed: false };
    if (ticker && !listed) {
        // Reachable, honest, not indexed: a delisted or unverified line must
        // never rank as an "EGX stock".
        return { title: `${ticker.name_en || symbol} (${symbol}) — listing status`, robots: { index: false, follow: true } };
    }
    if (!ticker) {
        if (!dbOk) {
            return {
                title: `${symbol} — EGX Stock Price, Financials & News`,
                alternates: {
            canonical: symbolPath(symbol),
            // Degraded render (DB unreachable): the Arabic name is unknown, so
            // point at the bare Arabic URL. That form always resolves and 308s
            // to the slugged canonical once the DB is back.
            languages: {
                en: symbolPath(symbol),
                ar: `/ar${symbolPath(symbol)}`,
                'x-default': `/ar${symbolPath(symbol)}`,
            },
        },
            };
        }
        return { title: "Symbol not found", robots: { index: false } };
    }
    const name = ticker.name_en || symbol;
    const price = ticker.last_price !== null
        ? `${ticker.currency || "EGP"} ${ticker.last_price.toLocaleString("en-EG", { maximumFractionDigits: 2 })}`
        : null;
    // Compact SERP-friendly copy (audit flagged 105/222-char overruns on long
    // legal names): title ends at "Stock Price", description hard-capped ~160.
    let description = `${name} (EGX: ${symbol}): live price${price ? ` ${price}` : ""}, key stats, financials, dividends, technicals & news. Updated every 15 min in EGX hours.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;
    // The live price in the title. Search Console (3 months to 2026-09-05):
    // 13,175 impressions on these pages, 17 clicks — 0.13% at position 8.3.
    // The query is the price; the incumbents show it in the title, ours did
    // not. The page states the as-of time, so a cached SERP title is never a
    // claim of freshness the page does not qualify.
    // Price in the title (the query) unless the legal name makes it overflow —
    // then the price goes before the name does (audit: 150 TITLE_TOO_LONG).
    const withPrice = `${name} (${symbol}) Stock Price${price ? ` — ${price}` : ''}`;
    // Absolute title (no template suffix), so the budget is the full 60; a legal
    // name too long for even the priceless form yields to the symbol-based one.
    const title = clampTitle([withPrice, `${name} (${symbol}) Stock Price`, `${symbol} Stock Price${price ? ` — ${price}` : ''} — EGX`], 60);
    return {
        // absolute: the layout template appends the brand and pushed these to
        // 90+ characters; the company name and price are what the searcher reads.
        title: { absolute: title },
        description,
        alternates: {
            canonical: symbolPath(symbol),
            // Arabic twin page (306 AR company pages, reciprocal hreflang).
            languages: {
                en: symbolPath(symbol),
                ar: encodeURI(symbolPathAr(symbol, ticker?.name_ar)),
                'x-default': encodeURI(symbolPathAr(symbol, ticker?.name_ar)),
            },
        },
        openGraph: {
            type: "website",
            title: `${title} | Starta Markets`,
            description,
            url: symbolPath(symbol),
            images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Starta Markets" }],
        },
        twitter: {
            card: "summary_large_image",
            title: `${title} | Starta Markets`,
            description,
            images: ["/og-default.png"],
        },
    };
}

export default async function SymbolLayout({ params, children }: Props) {
    const { id } = await params;
    const symbol = (id || "").toUpperCase();
    const { ticker, dbOk } = symbol ? await lookupTicker(symbol) : { ticker: null, dbOk: true };
    if (!ticker) {
        if (!dbOk) return children; // DB down: degrade to the client app
        notFound();
    }
    return children;
}
