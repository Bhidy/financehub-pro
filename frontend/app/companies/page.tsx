import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, symbolPath } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /companies — the EGX listed-companies directory. Server-rendered full list
 * sorted by market cap: the hub that makes every /symbol page reachable in two
 * clicks from the homepage and targets the open "EGX listed companies" SERP.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'EGX Listed Companies — All Egyptian Exchange Stocks',
    description:
        'Complete directory of companies listed on the Egyptian Exchange (EGX), sorted by market capitalization — live prices, sectors and market caps, updated daily. الشركات المدرجة في البورصة المصرية.',
    alternates: { canonical: '/companies' },
    openGraph: {
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
        <PublicPageShell>
            <JsonLd data={itemListJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { label: 'EGX Listed Companies' }],
                    SITE_URL
                )}
            />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'EGX Listed Companies' }]} />

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Egyptian Exchange (EGX) Listed Companies</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
                All {tickers.length} companies listed on the Egyptian Exchange with live prices, sorted by market
                capitalization. Click any company for its full profile: price chart, key statistics, financial
                statements, dividends, technicals and news — in Arabic and English.
                {asOfHuman && <> Updated daily; prices as of {asOfHuman}.</>}
            </p>
            <p className="mt-1 text-sm text-slate-500" dir="rtl" lang="ar">
                دليل الشركات المدرجة في البورصة المصرية — الأسعار والقطاعات والقيمة السوقية، محدَّث يوميًا.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Symbol</th>
                            <th className="px-4 py-3">Sector</th>
                            <th className="px-4 py-3 text-right">Price (EGP)</th>
                            <th className="px-4 py-3 text-right">Change</th>
                            <th className="px-4 py-3 text-right">Market Cap (EGP)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickers.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={symbolPath(t.symbol)} className="font-semibold text-slate-800 hover:text-teal-600">
                                        {t.name_en || t.symbol}
                                    </Link>
                                    {t.name_ar && (
                                        <span className="block text-xs text-slate-400" dir="rtl" lang="ar">{t.name_ar}</span>
                                    )}
                                </td>
                                <td className="px-4 py-2.5 font-mono font-semibold text-slate-600">
                                    <Link href={symbolPath(t.symbol)} className="hover:text-teal-600">{t.symbol}</Link>
                                </td>
                                <td className="px-4 py-2.5 text-slate-500">{t.sector_name || '—'}</td>
                                <td className="px-4 py-2.5 text-right font-semibold">
                                    {t.last_price !== null ? t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 }) : '—'}
                                </td>
                                <td className={`px-4 py-2.5 text-right font-semibold ${
                                    t.change_percent === null ? 'text-slate-400' : t.change_percent >= 0 ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                    {t.change_percent !== null ? `${t.change_percent >= 0 ? '+' : ''}${t.change_percent.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%` : '—'}
                                </td>
                                <td className="px-4 py-2.5 text-right">{fmtCap(t.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-slate-500">
                Source: Egyptian Exchange via TradingView. Prices refresh every 15 minutes during EGX trading hours
                (Sunday–Thursday). Market caps in Egyptian pounds.
            </p>
        </PublicPageShell>
    );
}
