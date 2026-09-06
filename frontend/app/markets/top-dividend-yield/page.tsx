import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllTickers } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { rankByDividendYield, rankedAsOf } from '@/lib/market-rankings';

/**
 * /markets/top-dividend-yield — EGX stocks ranked by trailing dividend yield.
 * Programmatic wave 2 (audit-verified: dividend_yield populated on ~90/100
 * tickers). Mechanical ranking of live data, methodology stated inline.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Highest Dividend Yield EGX Stocks — Ranked',
    description:
        'Egyptian Exchange (EGX) stocks ranked by trailing dividend yield — the highest-yielding EGX shares with live prices, updated daily. Ranking is mechanical',
    alternates: {
        canonical: '/markets/top-dividend-yield',
        languages: { en: '/markets/top-dividend-yield', ar: '/ar/markets/top-dividend-yield', 'x-default': '/ar/markets/top-dividend-yield' },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'Highest Dividend Yield Stocks on the EGX | Starta Markets',
        description: 'EGX shares ranked by trailing dividend yield, updated daily.',
        url: '/markets/top-dividend-yield',
    },
};

// A trailing dividend yield above 100% is mathematically implausible (it would
// mean paying out more than the entire share price in a year) — such values are
// data artifacts (a special/return-of-capital distribution or a stale-price /
// units mismatch), not a repeatable yield. Excluding them keeps the ranking and
// its ItemList JSON-LD credible. Audit 2026-07-04: SAIB showed 761%, SEIGA 215%.

export default async function TopDividendYieldPage() {
    const all = await getAllTickers();
    const ranked = rankByDividendYield(all);
    const asOf = rankedAsOf(ranked);
    const asOfHuman = asOf ? new Date(asOf).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }) : null;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Highest dividend-yield stocks on the Egyptian Exchange',
        numberOfItems: ranked.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: ranked.slice(0, 25).map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: `${t.name_en || t.symbol} (${t.symbol})`, url: SITE_URL + symbolPath(t.symbol) })),
    };
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            { '@type': 'Question', name: 'What is dividend yield?', acceptedAnswer: { '@type': 'Answer', text: 'Dividend yield is the annual dividend per share divided by the current share price, expressed as a percentage — the cash income an investor receives for each pound invested at today’s price.' } },
            { '@type': 'Question', name: 'Is the highest-yield stock the best to buy?', acceptedAnswer: { '@type': 'Answer', text: 'Not necessarily. A very high yield can reflect a falling share price or an unsustainable payout. Yield should be weighed against the company’s earnings, payout ratio and prospects. This page is information, not investment advice.' } },
        ],
    };

    return (
        <PublicPageShell altHref="/ar/markets/top-dividend-yield">
            <JsonLd data={itemList} />
            <JsonLd data={faqJsonLd} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { url: '/markets', label: 'Market Data' }, { label: 'Top Dividend Yield' }], SITE_URL)} />
            <Breadcrumbs lang="en" items={[{ href: '/', label: 'Home' }, { href: '/markets', label: 'Market Data' }, { label: 'Top Dividend Yield' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Highest Dividend-Yield Stocks on the EGX</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {ranked.length} Egyptian Exchange stocks ranked by <strong>trailing dividend yield</strong> — the highest-yielding EGX shares with
                live prices{asOfHuman && <>, as of {asOfHuman}</>}. The ranking is mechanical (yield descending) and updates with our market data. It is information, not a recommendation.
            </p>
            <p className="mt-1 text-sm text-muted" dir="rtl" lang="ar">أعلى الأسهم توزيعًا للأرباح في البورصة المصرية — مرتبة حسب عائد التوزيع.</p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[600px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Sector</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-right">Dividend Yield</th>
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
                                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-emerald-700">{(t.dividend_yield as number).toLocaleString('en-EG', { maximumFractionDigits: 2 })}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-6 text-sm text-muted">
                See the <Link href="/markets/dividend-calendar" className="font-semibold text-starta-darkTeal hover:underline">EGX dividend calendar</Link> for upcoming ex-dates, the <Link href="/markets/largest-companies" className="font-semibold text-starta-darkTeal hover:underline">largest companies by market cap</Link>, the <Link href="/markets/lowest-pe-stocks" className="font-semibold text-starta-darkTeal hover:underline">lowest-P/E value stocks</Link>, or browse <Link href="/companies" className="font-semibold text-starta-darkTeal hover:underline">all EGX companies</Link>.
            </p>
            <p className="mt-4 text-xs text-muted">Source: Egyptian Exchange via TradingView. Dividend yield is trailing (last 12 months) over the current price. Yields above 100% are excluded as non-recurring or data artifacts (e.g. special distributions), not repeatable yields. Prices in EGP unless a currency code is shown.</p>
        </PublicPageShell>
    );
}
