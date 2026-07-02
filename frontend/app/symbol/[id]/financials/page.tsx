import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicker, getFinancialYears, type FinancialYear } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /symbol/{SYM}/financials — server-rendered annual financial statements
 * (egx_financials via TradingView). QUALITY GATE: a symbol with zero financial
 * rows 404s here instead of serving an indexable empty shell (soft-404 bait).
 * The parent layout already 404s unknown symbols and degrades on DB outages.
 */

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

/** Fiscal-year range across rows, null-safe (toNum can null a corrupt year). */
function yearRange(years: FinancialYear[]): { minYear: number | null; maxYear: number | null } {
    const ys = years
        .map((y) => y.fiscal_year)
        .filter((y): y is number => typeof y === 'number' && Number.isFinite(y));
    if (ys.length === 0) return { minYear: null, maxYear: null };
    return { minYear: Math.min(...ys), maxYear: Math.max(...ys) };
}

/**
 * EGP money formatter (companies-page style, 2dp, B/M abbreviations).
 * null → '—' — NEVER 0 or 'NaN' for missing financials.
 */
function fmtEgp(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 2 })}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 2 })}M`;
    return `${sign}${abs.toLocaleString('en-EG', { maximumFractionDigits: 2 })}`;
}

/** Per-share figures (EPS/DPS): plain 2–4dp numbers, null → '—'. */
function fmtPerShare(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/** Right-aligned numeric cell; negatives in red (losses must read as losses). */
function NumCell({ v, text }: { v: number | null; text: string }) {
    return (
        <td className={`px-4 py-2.5 text-right ${v !== null && v < 0 ? 'text-red-600' : 'text-slate-700'}`}>
            {text}
        </td>
    );
}

function buildDescription(name: string, minYear: number | null, maxYear: number | null): string {
    const range = minYear !== null && maxYear !== null ? `, ${minYear}–${maxYear}` : '';
    let description = `Annual income statement highlights for ${name}: revenue, net income, EPS, free cash flow, assets and debt${range}. Source: EGX filings via TradingView.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;
    return description;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    if (!symbol) return {};
    const [ticker, years] = await Promise.all([getTicker(symbol), getFinancialYears(symbol)]);
    // No ticker or no data: the page body 404s, so emit no indexable metadata.
    if (!ticker || years.length === 0) return {};
    const name = ticker.name_en || symbol;
    const { minYear, maxYear } = yearRange(years);
    const range = minYear !== null && maxYear !== null ? ` ${minYear}–${maxYear}` : '';
    return {
        title: `${name} (${symbol}) Financial Statements${range}`,
        description: buildDescription(name, minYear, maxYear),
        alternates: { canonical: `${symbolPath(symbol)}/financials` },
    };
}

export default async function FinancialsPage({ params }: Props) {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    if (!symbol) notFound();
    const [ticker, years] = await Promise.all([getTicker(symbol), getFinancialYears(symbol)]);
    if (!ticker) notFound();
    // QUALITY GATE: no financial rows → 404, never an empty indexable table.
    if (years.length === 0) notFound();

    const name = ticker.name_en || symbol;
    const { minYear, maxYear } = yearRange(years);
    const pagePath = `${symbolPath(symbol)}/financials`;

    const datasetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${name} (${symbol}) annual financial statements`,
        description: buildDescription(name, minYear, maxYear),
        url: absUrl(pagePath),
        creator: {
            '@id': `${SITE_URL}/#organization`,
            '@type': 'Organization',
            name: 'Starta Markets',
        },
        ...(minYear !== null && maxYear !== null ? { temporalCoverage: `${minYear}/${maxYear}` } : {}),
        license: `${SITE_URL}/terms`,
    };

    const breadcrumbItems = [
        { href: '/', url: '/', label: 'Home' },
        { href: '/companies', url: '/companies', label: 'EGX Companies' },
        { href: symbolPath(symbol), url: symbolPath(symbol), label: name },
        { label: 'Financials' },
    ];

    return (
        <PublicPageShell>
            <JsonLd data={breadcrumbJsonLd(breadcrumbItems, SITE_URL)} />
            <JsonLd data={datasetJsonLd} />
            <Breadcrumbs items={breadcrumbItems} />

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {name} ({symbol}) Financial Statements
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
                Annual financial statement highlights for {name}, in Egyptian pounds (EGP)
                {minYear !== null && maxYear !== null ? ` covering fiscal years ${minYear}–${maxYear}` : ''}.
                Figures are updated weekly from EGX filings via TradingView.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Fiscal year</th>
                            <th className="px-4 py-3 text-right">Revenue</th>
                            <th className="px-4 py-3 text-right">Net income</th>
                            <th className="px-4 py-3 text-right">EPS (diluted)</th>
                            <th className="px-4 py-3 text-right">Free cash flow</th>
                            <th className="px-4 py-3 text-right">Total assets</th>
                            <th className="px-4 py-3 text-right">Total debt</th>
                            <th className="px-4 py-3 text-right">DPS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {years.map((y, i) => (
                            <tr key={y.fiscal_year ?? `row-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                <td className="px-4 py-2.5 font-semibold text-slate-800">
                                    {typeof y.fiscal_year === 'number' && Number.isFinite(y.fiscal_year) ? y.fiscal_year : '—'}
                                </td>
                                <NumCell v={y.revenue} text={fmtEgp(y.revenue)} />
                                <NumCell v={y.net_income} text={fmtEgp(y.net_income)} />
                                <NumCell v={y.eps_diluted} text={fmtPerShare(y.eps_diluted)} />
                                <NumCell v={y.free_cash_flow} text={fmtEgp(y.free_cash_flow)} />
                                <NumCell v={y.total_assets} text={fmtEgp(y.total_assets)} />
                                <NumCell v={y.total_debt} text={fmtEgp(y.total_debt)} />
                                <NumCell v={y.dps} text={fmtPerShare(y.dps)} />
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-slate-500">
                All figures in EGP. Source: company disclosures to the Egyptian Exchange via TradingView; updated weekly.
            </p>

            <nav aria-label={`More on ${symbol}`} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-teal-700">
                <Link href={symbolPath(symbol)} className="hover:text-teal-600 hover:underline">
                    {symbol} Overview
                </Link>
                <Link href={`${symbolPath(symbol)}/dividends`} className="hover:text-teal-600 hover:underline">
                    Dividends
                </Link>
                <Link href={`${symbolPath(symbol)}/technicals`} className="hover:text-teal-600 hover:underline">
                    Technicals
                </Link>
                <Link href={`${symbolPath(symbol)}/history`} className="hover:text-teal-600 hover:underline">
                    Price History
                </Link>
            </nav>
        </PublicPageShell>
    );
}
