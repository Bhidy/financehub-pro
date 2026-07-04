import { getTicker, getStats, getCompanyProfile, getSectorPeers, getPerformance, getTechnicals, getSymbolNews } from '@/lib/public-data';
import SymbolSeoSection from '@/components/seo/SymbolSeoSection';
import SymbolPageClient from './SymbolPageClient';

/**
 * Server wrapper for the symbol OVERVIEW page: mounts the interactive client
 * app and appends the crawler-visible SEO section (About/stats/peers/FAQ).
 * The section lives HERE (not in layout.tsx) so the /financials, /dividends,
 * /technicals and /history sub-tab pages don't all duplicate it — identical
 * blocks on six URLs per symbol would be near-duplicate content.
 * Symbol validation + metadata stay in layout.tsx (shared by all sub-tabs).
 */

// ISR: the audit found every SSR route shipped no-store (0% CDN hit,
// 1.0-1.5s TTFB). This page is anonymous — edge-cache it and revalidate
// every 5 min (prices refresh every 15 min, so 5 min is well within
// tolerance and turns the highest-traffic template into a CDN hit).
export const revalidate = 300;

export default async function SymbolOverviewPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();

    let ticker = null;
    try {
        ticker = await getTicker(symbol);
    } catch {
        // DB unreachable: the client app fetches its own data — degrade.
    }
    if (!ticker) return <SymbolPageClient />;

    const [stats, profile, peers, perf, technicals, news] = await Promise.all([
        getStats(symbol).catch(() => null),
        getCompanyProfile(symbol).catch(() => null),
        ticker.sector_name
            ? getSectorPeers(ticker.sector_name, symbol, 6).catch(() => [])
            : Promise.resolve([]),
        getPerformance(symbol).catch(() => null),
        getTechnicals(symbol).catch(() => null),
        getSymbolNews(symbol, 5).catch(() => []),
    ]);

    return (
        <>
            <SymbolPageClient />
            <SymbolSeoSection
                ticker={ticker}
                stats={stats}
                profile={profile}
                peers={peers}
                perf={perf}
                technicals={technicals}
                news={news}
            />
        </>
    );
}
