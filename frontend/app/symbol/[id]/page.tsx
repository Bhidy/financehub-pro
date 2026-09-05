import { notFound } from 'next/navigation';
import { getTicker, getTickerAny, getStats, getCompanyProfile, getSectorPeers, getPerformance, getTechnicals, getSymbolNews } from '@/lib/public-data';
import ListingStatusNotice from '@/components/seo/ListingStatusNotice';
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
    let dbOk = true;
    try {
        ticker = await getTicker(symbol);
    } catch {
        // DB unreachable: the client app fetches its own data — degrade.
        dbOk = false;
    }
    if (!ticker) {
        // 'unavailable' is not 'unknown symbol'. A DB outage degrades to the
        // client app so a real company can never de-index itself; an UNKNOWN
        // symbol with the database up must be a hard 404. Serving the app shell
        // with a 200 here put 52 URLs — legacy Saudi numeric tickers and
        // codes that never existed — in Search Console's soft-404 list, the
        // exact class the Arabic page already refuses.
        if (!dbOk) return <SymbolPageClient />;
        // NOT LISTED, BUT REAL. The security master (lib/security-master.ts)
        // withholds publication from delisted securities (GTHE, delisted
        // 2019), duplicate aliases, rights/preferred lines and symbols no EGX
        // register confirms. Those keep a reachable page that states what the
        // symbol is before any vendor figure, and the layout marks it noindex.
        const any = await getTickerAny(symbol).catch(() => null);
        if (!any) notFound();
        return (
            <>
                <ListingStatusNotice symbol={symbol} security={any.listing} lang="en" />
                <SymbolPageClient />
            </>
        );
    }

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
