import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTicker } from "@/lib/public-data";
import { symbolPath } from "@/lib/seo";

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
        return { ticker: await getTicker(symbol), dbOk: true };
    } catch {
        return { ticker: null, dbOk: false };
    }
}

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    const symbol = (id || "").toUpperCase();
    const { ticker, dbOk } = symbol ? await lookupTicker(symbol) : { ticker: null, dbOk: true };
    if (!ticker) {
        if (!dbOk) {
            return {
                title: `${symbol} — EGX Stock Price, Financials & News`,
                alternates: { canonical: symbolPath(symbol) },
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
    const title = `${name} (${symbol}) Stock Price`;
    return {
        title,
        description,
        alternates: { canonical: symbolPath(symbol) },
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
