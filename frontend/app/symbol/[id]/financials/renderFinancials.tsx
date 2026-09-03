import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTicker, getFinancialYears, type FinancialYear } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl, symbolFromArParam, canonicalRedirectTarget } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { symbolTabPath, symbolSiblings, symbolCrumbs } from '@/lib/symbol-nav';
import { FINANCIALS, NAV, t, type Lang } from '@/content/symbol-pages-i18n';

/**
 * /symbol/{SYM}/financials — server-rendered annual financial statements
 * (egx_financials via TradingView). QUALITY GATE: a symbol with zero financial
 * rows 404s here instead of serving an indexable empty shell (soft-404 bait).
 * The parent layout already 404s unknown symbols and degrades on DB outages.
 */

// ISR: cache at the edge and revalidate in background — the audit found
// every SSR route shipped no-store (0% CDN hit, 1.0-1.5s TTFB). Pages are
// anonymous, so edge-caching is safe; value tuned to how fast the data moves.
export const revalidate = 3600;

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
        <td className={`px-4 py-2.5 text-right ${v !== null && v < 0 ? 'text-red-600' : 'text-main'}`}>
            {text}
        </td>
    );
}

function buildDescription(
    name: string,
    symbol: string,
    yearCount: number,
    minYear: number | null,
    maxYear: number | null,
    lang: Lang
): string {
    const range = minYear !== null && maxYear !== null ? `, ${minYear}–${maxYear}` : '';
    let description = t(FINANCIALS.description(name, symbol, yearCount), lang) + range;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;
    return description;
}

export async function financialsMetadata(id: string, lang: Lang): Promise<Metadata> {
    const symbol = lang === 'ar' ? symbolFromArParam(id) : (id || '').toUpperCase();
    if (!symbol) return {};
    const [ticker, years] = await Promise.all([getTicker(symbol), getFinancialYears(symbol)]);
    // No ticker or no data: the page body 404s, so emit no indexable metadata.
    if (!ticker || years.length === 0) return {};
    const name = (lang === 'ar' ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const { minYear, maxYear } = yearRange(years);
    const range = minYear !== null && maxYear !== null ? ` ${minYear}–${maxYear}` : '';
    return {
        title: `${t(FINANCIALS.title(name, symbol), lang)}${range}`,
        description: buildDescription(name, symbol, years.length, minYear, maxYear, lang),
        alternates: { canonical: `${symbolPath(symbol)}/financials` },
    };
}

export async function renderFinancials(id: string, lang: Lang) {
    const isAr = lang === 'ar';
    const symbol = isAr ? symbolFromArParam(id) : (id || '').toUpperCase();
    if (!symbol) notFound();
    const [ticker, years] = await Promise.all([getTicker(symbol), getFinancialYears(symbol)]);
    if (!ticker) notFound();
    // QUALITY GATE: no financial rows → 404, never an empty indexable table.
    if (years.length === 0) notFound();

    const name = (lang === 'ar' ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const { minYear, maxYear } = yearRange(years);
    const pagePath = `${symbolPath(symbol)}/financials`;

    const datasetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${name} (${symbol}) annual financial statements`,
        description: buildDescription(name, symbol, years.length, minYear, maxYear, lang),
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
        { href: '/', url: '/', label: t(NAV.home, lang) },
        { href: '/companies', url: '/companies', label: t(NAV.companies, lang) },
        { href: symbolPath(symbol), url: symbolPath(symbol), label: name },
        { label: t(NAV.financials, lang) },
    ];

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(symbolTabPath(symbol, 'financials', isAr ? 'en' : 'ar', ticker.name_ar))} persistLang>
            <JsonLd data={breadcrumbJsonLd(breadcrumbItems, SITE_URL)} />
            <JsonLd data={datasetJsonLd} />
            <Breadcrumbs items={breadcrumbItems} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {t(FINANCIALS.h1(name, symbol), lang)}
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                Annual financial statement highlights for {name}, in Egyptian pounds (EGP)
                {minYear !== null && maxYear !== null ? ` covering fiscal years ${minYear}–${maxYear}` : ''}.
                Figures are updated weekly from EGX filings via TradingView.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">{t(FINANCIALS.cols.year, lang)}</th>
                            <th className="px-4 py-3 text-right">{t(FINANCIALS.cols.revenue, lang)}</th>
                            <th className="px-4 py-3 text-right">{t(FINANCIALS.cols.netIncome, lang)}</th>
                            <th className="px-4 py-3 text-right">{t(FINANCIALS.cols.eps, lang)}</th>
                            <th className="px-4 py-3 text-right">{t(FINANCIALS.cols.fcf, lang)}</th>
                            <th className="px-4 py-3 text-right">{t(FINANCIALS.cols.assets, lang)}</th>
                            <th className="px-4 py-3 text-right">{t(FINANCIALS.cols.debt, lang)}</th>
                            <th className="px-4 py-3 text-right">{t(FINANCIALS.cols.dps, lang)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {years.map((y, i) => (
                            <tr key={y.fiscal_year ?? `row-${i}`} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 font-semibold text-main">
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

            <p className="mt-4 text-xs text-muted">
                {t(FINANCIALS.sourceNote, lang)}
            </p>

            <nav aria-label={`More on ${symbol}`} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-teal-700">
                <Link href={symbolPath(symbol)} className="hover:text-starta-teal hover:underline">
                    {symbol} Overview
                </Link>
                <Link href={`${symbolPath(symbol)}/dividends`} className="hover:text-starta-teal hover:underline">
                    Dividends
                </Link>
                <Link href={`${symbolPath(symbol)}/technicals`} className="hover:text-starta-teal hover:underline">
                    Technicals
                </Link>
                <Link href={`${symbolPath(symbol)}/history`} className="hover:text-starta-teal hover:underline">
                    Price History
                </Link>
            </nav>
        </PublicPageShell>
    );
}
