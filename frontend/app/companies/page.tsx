import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, symbolPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { SECURITY_MASTER_SOURCES } from '@/lib/security-master';

/**
 * /companies — the EGX listed-companies directory. Server-rendered full list
 * sorted by market cap: the hub that makes every /symbol page reachable in two
 * clicks from the homepage and targets the open "EGX listed companies" SERP.
 */

// force-dynamic: non-dynamic hub route — must NOT prerender at build
// (no DATABASE_URL at build). Vercel still edge-caches via next.config
// s-maxage header; freshness comes from per-request render.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'EGX Listed Companies — Egyptian Exchange Stocks',
    description:
        'Complete directory of companies listed on the Egyptian Exchange (EGX), sorted by market capitalization — live prices, sectors and market caps, updated daily.',
    alternates: { canonical: '/companies', languages: { en: '/companies', ar: '/ar/companies', 'x-default': '/ar/companies' } },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'EGX Listed Companies — All Egyptian Exchange Stocks | Starta Markets',
        description:
            'Complete directory of companies listed on the Egyptian Exchange (EGX) with live prices, sectors and market caps.',
        url: '/companies',
    },
};

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 1 })}B`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 1 })}M`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

export default async function CompaniesPage() {
    const tickers = await getAllTickers();
    const asOf = tickers.reduce<string | null>((mx, t) => {
        return t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx;
    }, null);
    const asOfHuman = asOf
        ? new Date(asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' })
        : null;

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        // numberOfItems must match the serialized list (audit: declaring 307
        // while emitting 100 is inconsistent) — this block covers the top 100.
        name: 'Egyptian Exchange (EGX) listed companies — top 100 by market cap',
        numberOfItems: Math.min(tickers.length, 100),
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: tickers.slice(0, 100).map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: `${t.name_en || t.symbol} (${t.symbol})`,
            url: SITE_URL + symbolPath(t.symbol),
        })),
    };

    return (
        <PublicPageShell altHref="/ar/companies">
            <JsonLd data={itemListJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { label: 'EGX Listed Companies' }],
                    SITE_URL
                )}
            />
            <Breadcrumbs lang="en" items={[{ href: '/', label: 'Home' }, { label: 'EGX Listed Companies' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Egyptian Exchange (EGX) Listed Companies</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {tickers.length} companies listed on the Egyptian Exchange — main and SME markets, as confirmed against
                EGX&rsquo;s own register of listed securities ({SECURITY_MASTER_SOURCES.egx_main_register?.captured_at}) —
                with their latest prices, sorted by market capitalization. Click any company for its full profile: price
                chart, key statistics, financial statements, dividends, technicals and news — in Arabic and English.
                {asOfHuman && <> Updated daily; prices as of {asOfHuman}.</>} A price is shown only when the quote is
                current; a company whose last quote is older than two weeks shows no price.
            </p>
            <p className="mt-1 text-sm text-muted" dir="rtl" lang="ar">
                دليل الشركات المدرجة في البورصة المصرية — الأسعار والقطاعات والقيمة السوقية، محدَّث يوميًا.
            </p>

            <nav aria-label="EGX rankings" className="mt-5 flex flex-wrap gap-2 text-sm">
                <Link href="/markets/largest-companies" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">Largest by market cap</Link>
                <Link href="/markets/top-dividend-yield" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">Highest dividend yield</Link>
                <Link href="/markets/lowest-pe-stocks" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">Lowest P/E</Link>
                <Link href="/markets/movers" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">Top movers</Link>
                <Link href="/markets/egx30" className="rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main hover:border-starta-teal/50 hover:text-starta-darkTeal">EGX 30 index</Link>
            </nav>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Symbol</th>
                            <th className="px-4 py-3">Sector</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-right">Change</th>
                            <th className="px-4 py-3 text-right">Market Cap (EGP)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickers.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={symbolPath(t.symbol)} className="font-semibold text-main hover:text-starta-darkTeal">
                                        {t.name_en || t.symbol}
                                    </Link>
                                    {t.name_ar && (
                                        <span className="block text-xs text-muted" dir="rtl" lang="ar">{t.name_ar}</span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-muted">
                                    <Link href={symbolPath(t.symbol)} className="hover:text-starta-darkTeal">{t.symbol}</Link>
                                </td>
                                <td className="px-4 py-2.5 text-muted" title={t.sector_name ? `TradingView classification: ${t.sector_name}` : undefined}>{t.official_sector_en || t.sector_name || '—'}</td>
                                <td className="px-4 py-2.5 text-right font-semibold">
                                    {t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-semibold ${
                                    t.change_percent === null ? 'text-muted' : t.change_percent >= 0 ? 'text-emerald-700' : 'text-red-600'
                                }`}>
                                    {t.change_percent !== null ? `${t.change_percent >= 0 ? '+' : ''}${t.change_percent.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right">{fmtCap(t.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-muted">
                Listing status and sector: the Egyptian Exchange&rsquo;s register of listed securities (main and SME markets).
                Prices: EGX feed via TradingView, refreshed every 15 minutes during EGX trading hours (Sunday–Thursday); a quote
                older than two weeks is withheld rather than shown as current. Market caps in Egyptian pounds. Prices are in EGP
                unless a currency code is shown (some EGX lines trade in USD).
            </p>
        </PublicPageShell>
    );
}
