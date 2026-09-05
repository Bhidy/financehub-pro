import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, symbolPath, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /markets/lowest-pe-stocks — EGX stocks ranked by lowest trailing P/E ratio
 * (a mechanical "value screen"). Only positive P/E rows are ranked (a negative
 * P/E means the company is loss-making, which the ratio can't express). Info,
 * not a recommendation — a low P/E can signal value or distress.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Lowest P/E Stocks on the EGX — Ranked',
    description:
        'Egyptian Exchange (EGX) stocks ranked by the lowest trailing price-to-earnings (P/E) ratio',
    alternates: {
        canonical: '/markets/lowest-pe-stocks',
        languages: { en: '/markets/lowest-pe-stocks', ar: '/ar/markets/lowest-pe-stocks', 'x-default': '/ar/markets/lowest-pe-stocks' },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'Lowest P/E Stocks on the EGX — Ranked | Starta Markets',
        description: 'EGX shares ranked by lowest trailing P/E ratio, a mechanical value screen updated daily.',
        url: '/markets/lowest-pe-stocks',
    },
};

export default async function LowestPeStocksPage() {
    const all = await getAllTickers();
    const ranked = all
        .filter((t) => t.pe_ratio !== null && Number.isFinite(t.pe_ratio) && (t.pe_ratio as number) > 0)
        .sort((a, b) => (a.pe_ratio as number) - (b.pe_ratio as number))
        .slice(0, 50);
    const asOf = ranked.reduce<string | null>((mx, t) => (t.last_updated && (!mx || new Date(t.last_updated) > new Date(mx)) ? t.last_updated : mx), null);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Lowest P/E-ratio stocks on the Egyptian Exchange',
        numberOfItems: ranked.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: ranked.slice(0, 25).map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name_en || t.symbol} (${t.symbol})`, url: SITE_URL + symbolPath(t.symbol) })),
    };
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'What is the P/E ratio?', acceptedAnswer: { '@type': 'Answer', text: 'The price-to-earnings (P/E) ratio is the share price divided by earnings per share. It shows how much investors pay for each pound of a company’s annual profit — a lower multiple can mean a cheaper valuation.' } },
            { '@type': 'Question', name: 'Does a low P/E mean a stock is cheap?', acceptedAnswer: { '@type': 'Answer', text: 'Not always. A low P/E can reflect genuine value, or it can signal that the market expects earnings to fall, a cyclical peak, or company-specific risk. P/E should be read alongside growth, debt and sector. This page is a mechanical screen, not investment advice.' } },
            { '@type': 'Question', name: 'Why are loss-making companies excluded?', acceptedAnswer: { '@type': 'Answer', text: 'A company with negative earnings has a negative or undefined P/E that the ratio cannot meaningfully express, so only stocks with a positive trailing P/E are ranked here.' } },
        ],
    };

    return (
        <PublicPageShell lang="en" altHref="/ar/markets/lowest-pe-stocks">
            <JsonLd data={itemList} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { url: '/companies', label: 'Companies' }, { label: 'Lowest P/E' }], SITE_URL)} />
            <Breadcrumbs lang="en" items={[{ href: '/', label: 'Home' }, { href: '/companies', label: 'Companies' }, { label: 'Lowest P/E' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Lowest P/E Stocks on the EGX</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {ranked.length} Egyptian Exchange stocks ranked by <strong>lowest trailing P/E ratio</strong> — a mechanical value screen of the cheapest EGX
                shares by earnings multiple, with live prices{asOfHuman && <>, as of {asOfHuman}</>}. Only companies with positive earnings are shown. The ranking is mechanical (P/E ascending) — information, not a recommendation.
            </p>
            <p className="mt-1 text-sm text-muted" dir="rtl" lang="ar">أرخص أسهم البورصة المصرية حسب مكرر الربحية — مرتبة تصاعديًا.</p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Sector</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-right">P/E</th>
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
                                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-starta-darkTeal">{(t.pe_ratio as number).toLocaleString('en-EG', { maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-6 text-sm text-muted">
                See the <Link href="/markets/largest-companies" className="font-semibold text-starta-darkTeal hover:underline">largest EGX companies by market cap</Link>, the <Link href="/markets/top-dividend-yield" className="font-semibold text-starta-darkTeal hover:underline">highest dividend-yield stocks</Link>, or browse <Link href="/companies" className="font-semibold text-starta-darkTeal hover:underline">all EGX companies</Link>.
            </p>
            <p className="mt-4 text-xs text-muted">Source: Egyptian Exchange via TradingView. P/E is trailing (last 12 months) over the current price. Prices in EGP unless a currency code is shown.</p>
        </PublicPageShell>
    );
}
