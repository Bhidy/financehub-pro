import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /markets/largest-companies — EGX stocks ranked by market capitalisation.
 * Programmatic ranking (audit-verified: market_cap populated + EGP-denominated
 * fundamentals). Mechanical, cited "largest companies on the EGX" surface so
 * head queries and AI engines have a quotable top-N. Not a recommendation.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Largest EGX Companies by Market Cap',
    description:
        'The biggest companies on the Egyptian Exchange (EGX) ranked by market capitalisation — the largest Egyptian listed stocks with live prices, updated daily.',
    alternates: {
        canonical: '/markets/largest-companies',
        languages: { en: '/markets/largest-companies', ar: '/ar/markets/largest-companies', 'x-default': '/ar/markets/largest-companies' },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'Largest Companies on the EGX by Market Cap | Starta Markets',
        description: 'The biggest Egyptian Exchange stocks ranked by market capitalisation, updated daily.',
        url: '/markets/largest-companies',
    },
};

const fmtCap = (n: number | null): string => {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `EGP ${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `EGP ${(n / 1e6).toFixed(2)}M`;
    return `EGP ${n.toLocaleString('en-EG')}`;
};

export default async function LargestCompaniesPage() {
    const all = await getAllTickers();
    const ranked = all
        .filter((t) => t.market_cap !== null && Number.isFinite(t.market_cap) && (t.market_cap as number) > 0)
        .sort((a, b) => (b.market_cap as number) - (a.market_cap as number))
        .slice(0, 50);
    const asOf = ranked.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;
    const total = ranked.reduce((s, t) => s + (t.market_cap as number), 0);

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Largest companies on the Egyptian Exchange by market capitalisation',
        numberOfItems: ranked.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: ranked.slice(0, 25).map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name_en || t.symbol} (${t.symbol})`, url: SITE_URL + symbolPath(t.symbol) })),
    };
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'What is the largest company on the Egyptian Exchange?', acceptedAnswer: { '@type': 'Answer', text: ranked[0] ? `By market capitalisation, the largest company listed on the EGX is ${ranked[0].name_en || ranked[0].symbol} (${ranked[0].symbol}), at approximately ${fmtCap(ranked[0].market_cap)}${asOfHuman ? ` as of ${asOfHuman}` : ''}.` : 'The largest EGX companies by market capitalisation are ranked on this page, updated with our market data.' } },
            { '@type': 'Question', name: 'What is market capitalisation?', acceptedAnswer: { '@type': 'Answer', text: 'Market capitalisation is the total market value of a company’s listed shares — the share price multiplied by the number of shares outstanding. It is the most common measure of a listed company’s size.' } },
            { '@type': 'Question', name: 'Are these figures in Egyptian pounds?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Market capitalisation on this page is stated in Egyptian pounds (EGP), the reporting currency of the Egyptian Exchange. Figures update with our market data and are information, not a recommendation.' } },
        ],
    };

    return (
        <PublicPageShell lang="en" altHref="/ar/markets/largest-companies">
            <JsonLd data={itemList} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { url: '/companies', label: 'Companies' }, { label: 'Largest by Market Cap' }], SITE_URL)} />
            <Breadcrumbs lang="en" items={[{ href: '/', label: 'Home' }, { href: '/companies', label: 'Companies' }, { label: 'Largest by Market Cap' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Largest Companies on the EGX by Market Cap</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                The {ranked.length} biggest companies listed on the <strong>Egyptian Exchange (EGX)</strong> ranked by <strong>market capitalisation</strong> —
                the largest Egyptian stocks with live prices{asOfHuman && <>, as of {asOfHuman}</>}. The ranking is mechanical (market cap descending) and updates with our market data. It is information, not a recommendation.
            </p>
            <p className="mt-1 text-sm text-muted" dir="rtl" lang="ar">أكبر الشركات في البورصة المصرية حسب القيمة السوقية — مرتبة تنازليًا.</p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Sector</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-right">Market Cap</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranked.map((t, i) => (
                            <tr key={t.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted tabular-nums">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link href={symbolPath(t.symbol)} className="font-semibold text-main hover:text-starta-darkTeal">{t.name_en || t.symbol}</Link>
                                    <span className="ml-1.5 font-mono text-xs text-muted">{t.symbol}</span>
                                </td>
                                <td className="px-4 py-2.5 text-muted">{t.sector_name || '—'}</td>
                                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{t.last_price !== null ? `${t.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}${t.currency && t.currency !== 'EGP' ? ` ${t.currency}` : ''}` : '—'}</td>
                                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{fmtCap(t.market_cap)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-6 text-sm text-muted">
                Browse <Link href="/companies" className="font-semibold text-starta-darkTeal hover:underline">all EGX companies</Link>, the <Link href="/markets/egx30" className="font-semibold text-starta-darkTeal hover:underline">EGX 30 index</Link>, or the <Link href="/markets/top-dividend-yield" className="font-semibold text-starta-darkTeal hover:underline">highest dividend-yield stocks</Link>.
            </p>
            <p className="mt-4 text-xs text-muted">Source: Egyptian Exchange via TradingView. Market capitalisation is stated in EGP. Prices in EGP unless a currency code is shown.</p>
        </PublicPageShell>
    );
}
