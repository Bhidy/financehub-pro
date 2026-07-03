import type { Metadata } from 'next';
import Link from 'next/link';
import { getMovers, type Ticker } from '@/lib/public-data';
import { SITE_URL, symbolPath } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /markets/movers — today's EGX gainers, losers and most-active stocks.
 * Server-rendered, force-dynamic so every crawl sees fresh intraday numbers.
 * Deliberately NO ItemList JSON-LD: movers churn intraday, so a structured
 * listing would be stale the moment it was indexed — freshness > listing.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'EGX Movers Today — Top Gainers, Losers & Most Active Stocks',
    description:
        'The biggest EGX movers today — top gainers, losers and most active Egyptian Exchange stocks by volume. Refreshed every 15 minutes during trading hours.',
    alternates: { canonical: '/markets/movers' },
    openGraph: {
        type: 'website',
        title: 'EGX Movers Today — Top Gainers, Losers & Most Active Stocks | Starta Markets',
        description:
            'The biggest EGX movers today — top gainers, losers and most active Egyptian Exchange stocks by volume.',
        url: '/markets/movers',
    },
};

const fmtPrice = (n: number | null): string =>
    n !== null && Number.isFinite(n) ? n.toLocaleString('en-EG', { maximumFractionDigits: 2 }) : '—';

const fmtChange = (n: number | null): string =>
    n !== null && Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—';

const fmtVolume = (n: number | null): string =>
    n !== null && Number.isFinite(n) ? n.toLocaleString('en-EG', { maximumFractionDigits: 0 }) : '—';

function MoversTable({ rows, showVolume = false }: { rows: Ticker[]; showVolume?: boolean }) {
    if (rows.length === 0) {
        return <p className="mt-3 text-sm text-muted">No data available right now.</p>;
    }
    return (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className={`w-full ${showVolume ? 'min-w-[600px]' : 'min-w-[520px]'} text-sm`}>
                <thead>
                    <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3 text-right">Price</th>
                        <th className="px-4 py-3 text-right">Change %</th>
                        {showVolume && <th className="px-4 py-3 text-right">Volume</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((t) => (
                        <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                            <td className="px-4 py-2.5">
                                <Link href={symbolPath(t.symbol)} className="font-semibold text-main hover:text-starta-teal">
                                    {t.name_en || t.symbol}
                                </Link>
                                {t.name_ar && (
                                    <span className="block text-xs text-muted" dir="rtl" lang="ar">{t.name_ar}</span>
                                )}
                            </td>
                            <td className="px-4 py-2.5 font-mono font-semibold text-muted">
                                <Link href={symbolPath(t.symbol)} className="hover:text-starta-teal">{t.symbol}</Link>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold">{fmtPrice(t.last_price)}{t.last_price !== null && t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}</td>
                            <td className={`px-4 py-2.5 text-right font-semibold ${
                                t.change_percent === null ? 'text-muted' : t.change_percent >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                                {fmtChange(t.change_percent)}
                            </td>
                            {showVolume && <td className="px-4 py-2.5 text-right">{fmtVolume(t.volume)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default async function MoversPage() {
    const { gainers, losers, active } = await getMovers(10);
    const asOf = [...gainers, ...losers, ...active].reduce<string | null>((mx, t) => {
        return t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx;
    }, null);
    const asOfHuman = asOf
        ? new Date(asOf).toLocaleString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit', hour12: false,
              timeZone: 'Africa/Cairo',
          })
        : null;

    return (
        <PublicPageShell>
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { label: 'EGX Movers' }],
                    SITE_URL
                )}
            />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'EGX Movers' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                EGX Movers Today — Top Gainers, Losers &amp; Most Active
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                Today&apos;s biggest moves on the Egyptian Exchange: the top gaining and losing stocks by change
                percentage and the most actively traded companies by volume. Click any company for its full profile.
            </p>
            <p className="mt-2 text-sm text-muted">
                {asOfHuman && <>As of {asOfHuman} (Africa/Cairo time). </>}
                Prices refresh every 15 minutes during EGX trading hours (Sunday–Thursday).
            </p>
            <p className="mt-1 text-sm text-muted" dir="rtl" lang="ar">
                الأكثر ارتفاعًا وانخفاضًا ونشاطًا في البورصة المصرية اليوم.
            </p>

            <section className="mt-8">
                <h2 className="text-xl font-bold text-main">Top Gainers</h2>
                <MoversTable rows={gainers} />
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-bold text-main">Top Losers</h2>
                <MoversTable rows={losers} />
            </section>

            <section className="mt-8">
                <h2 className="text-xl font-bold text-main">Most Active by Volume</h2>
                <MoversTable rows={active} showVolume />
            </section>

            <p className="mt-6 text-sm text-muted">
                Browse the full <Link href="/companies" className="font-semibold text-starta-teal hover:underline">EGX listed companies directory</Link> or
                companies <Link href="/sectors" className="font-semibold text-starta-teal hover:underline">by sector</Link>.
            </p>

            <p className="mt-4 text-xs text-muted">
                Source: Egyptian Exchange via TradingView. Prices in Egyptian pounds.
            </p>
        </PublicPageShell>
    );
}
