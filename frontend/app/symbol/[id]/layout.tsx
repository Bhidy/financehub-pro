import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTicker, getStats, getCompanyProfile, getSectorPeers } from "@/lib/public-data";
import { symbolPath } from "@/lib/seo";
import SymbolSeoSection from "@/components/seo/SymbolSeoSection";

/**
 * Server layer for the (fully client-rendered) symbol page:
 *   - validates the symbol against market_tickers and 404s unknown ones
 *     (previously ANY invented ticker returned HTTP 200 — infinite soft-404s)
 *   - rich per-company metadata (name, live price, canonical, OG)
 *   - server-rendered About / key stats / peers / FAQ + JSON-LD below the app
 *     (crawlers and AI engines got a bare spinner before this)
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
        ? `EGP ${ticker.last_price.toLocaleString("en-EG", { maximumFractionDigits: 2 })}`
        : null;
    const description = [
        `${name} (EGX: ${symbol}) live share price`,
        price ? `${price}` : null,
        ticker.sector_name ? `${ticker.sector_name} sector` : null,
        "key statistics, financials, dividends, technicals and news — updated every 15 minutes during EGX trading hours.",
    ]
        .filter(Boolean)
        .join(" · ");
    const title = `${name} (${symbol}) Stock Price, Financials & News`;
    return {
        title,
        description,
        alternates: { canonical: symbolPath(symbol) },
        openGraph: {
            type: "website",
            title: `${title} | Starta Markets`,
            description,
            url: symbolPath(symbol),
        },
        twitter: { card: "summary_large_image", title: `${title} | Starta Markets`, description },
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

    const [stats, profile, peers] = await Promise.all([
        getStats(symbol).catch(() => null),
        getCompanyProfile(symbol).catch(() => null),
        ticker.sector_name ? getSectorPeers(ticker.sector_name, symbol, 6).catch(() => []) : Promise.resolve([]),
    ]);

    return (
        <>
            {children}
            <SymbolSeoSection ticker={ticker} stats={stats} profile={profile} peers={peers} />
        </>
    );
}
