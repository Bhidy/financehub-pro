import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
    getTicker,
    getStats,
    getFinancialYears,
    getSectorPeers,
    type Ticker,
    type FinancialYear,
} from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /symbol/{SYM}/{metric} — per-metric programmatic pages (StockAnalysis
 * pattern): market-cap, revenue, net-income, eps, dividend-yield, pe-ratio.
 *
 * QUALITY GATES (audit-critical — the sitemap lists ONLY gated URLs, so the
 * gate semantics here must stay in exact sync with metricGate() below):
 *   market-cap      → (ticker.market_cap ?? stats.market_cap) non-null
 *   revenue         → stats.revenue_ttm non-null OR ≥1 year with revenue
 *   net-income      → stats.net_income_ttm non-null OR ≥1 year with net_income
 *   eps             → stats.eps_ttm non-null OR ≥1 year with eps_diluted
 *   dividend-yield  → (yield non-null AND > 0) OR ≥1 year with dps
 *   pe-ratio        → (ticker.pe_ratio ?? stats.pe_ratio) non-null
 * Gate fail → notFound(); never an indexable empty shell (soft-404 bait).
 *
 * Routing note: the static sibling folders (financials/dividends/technicals/
 * history) win over this dynamic [metric] segment in the App Router, but we
 * defensively 404 those slugs anyway. Unknown metric slugs also 404.
 * The parent layout already validates the symbol and degrades on DB outages.
 */

// ISR: cache at the edge and revalidate in background — the audit found
// every SSR route shipped no-store (0% CDN hit, 1.0-1.5s TTFB). Pages are
// anonymous, so edge-caching is safe; value tuned to how fast the data moves.
export const revalidate = 300;

type Props = { params: Promise<{ id: string; metric: string }> };
type Stats = Record<string, number | string | null>;

const METRIC_SLUGS = ['market-cap', 'revenue', 'net-income', 'eps', 'dividend-yield', 'pe-ratio'] as const;
type MetricSlug = (typeof METRIC_SLUGS)[number];

/** Static sub-tab folders that must never be served by this dynamic segment. */
const RESERVED_SLUGS = new Set(['financials', 'dividends', 'technicals', 'history']);

const METRIC_LABEL: Record<MetricSlug, string> = {
    'market-cap': 'Market Cap',
    'revenue': 'Revenue',
    'net-income': 'Net Income',
    'eps': 'EPS',
    'dividend-yield': 'Dividend Yield',
    'pe-ratio': 'P/E Ratio',
};

/** 1–2 sentence textbook definitions, EGX-flavored. Factual, no hype. */
const METRIC_DEFINITION: Record<MetricSlug, string> = {
    'market-cap':
        'Market capitalization is the total market value of a company’s outstanding shares — the share price multiplied by the number of shares outstanding. It is the standard measure of a listed company’s size on the Egyptian Exchange (EGX).',
    'revenue':
        'Revenue (also called sales or turnover) is the total income a company generates from its core business before any costs or expenses are deducted. For EGX-listed companies it is reported in the annual income statement in Egyptian pounds.',
    'net-income':
        'Net income is the profit remaining after all operating costs, interest and taxes are deducted from revenue — the bottom line of the income statement. A negative figure means the company recorded a loss for that fiscal year.',
    'eps':
        'Earnings per share (EPS) is net income divided by the number of shares outstanding — the profit attributable to each share. Figures on this page are diluted EPS, in Egyptian pounds per share.',
    'dividend-yield':
        'Dividend yield is the annual dividend per share divided by the current share price, expressed as a percentage. It shows the cash income an EGX investor receives for each pound invested at today’s price.',
    'pe-ratio':
        'The price-to-earnings (P/E) ratio divides the share price by earnings per share, showing how much investors pay for each pound of annual profit. It is a core valuation yardstick for comparing companies within an EGX sector.',
};

/* ---------------------------------------------------------------- helpers */

/** Finite-number accessor for the stock_stats_view row. */
function statNum(stats: Stats | null, key: string): number | null {
    const v = stats?.[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * EGP money formatter (financials-page style: 2dp, B/M abbreviations, bare —
 * the surrounding copy/provenance line declares EGP). null → '—', never NaN.
 */
function fmtEgp(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 2 })}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 2 })}M`;
    return `${sign}${abs.toLocaleString('en-EG', { maximumFractionDigits: 2 })}`;
}

/** "EGP 304.51B" — hero/meta variant with the currency spelled out. */
function fmtEgpFull(n: number | null): string {
    return n === null || !Number.isFinite(n) ? '—' : `EGP ${fmtEgp(n)}`;
}

/** Per-share figures (EPS/DPS): plain 2–4dp numbers, null → '—'. */
function fmtPerShare(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/** Percentages, 2dp: 4.25 → "4.25%". null → '—'. */
function fmtPct(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    return `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%`;
}

/** Plain 2dp number (P/E, prices). null → '—'. */
function fmtNum(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    return n.toLocaleString('en-EG', { maximumFractionDigits: 2 });
}

/** Share counts: B/M compact without a currency prefix. */
function fmtShares(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 2 })}B`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 2 })}M`;
    return n.toLocaleString('en-EG', { maximumFractionDigits: 0 });
}

type HistRow = { year: number; value: number; yoy: number | null };

/** Non-null history rows for one metric field, newest fiscal year first. */
function historyRows(years: FinancialYear[], pick: (y: FinancialYear) => number | null): Array<{ year: number; value: number }> {
    return years
        .filter((y) => typeof y.fiscal_year === 'number' && Number.isFinite(y.fiscal_year) && pick(y) !== null)
        .map((y) => ({ year: y.fiscal_year as number, value: pick(y) as number }))
        .sort((a, b) => b.year - a.year);
}

/**
 * YoY growth between CONSECUTIVE fiscal years only (a 2023→2021 gap must not
 * masquerade as one year of growth). Base of 0 → null. Uses |prev| so growth
 * off a loss year keeps the correct sign.
 */
function withYoY(rows: Array<{ year: number; value: number }>): HistRow[] {
    return rows.map((r, i) => {
        const prev = rows[i + 1];
        const yoy =
            prev && prev.year === r.year - 1 && prev.value !== 0
                ? ((r.value - prev.value) / Math.abs(prev.value)) * 100
                : null;
        return { ...r, yoy };
    });
}

function yearSpan(rows: Array<{ year: number }>): { min: number; max: number } | null {
    if (rows.length === 0) return null;
    return { min: rows[rows.length - 1].year, max: rows[0].year };
}

/** Right-aligned numeric cell; negatives in red (losses must read as losses). */
function NumCell({ v, text }: { v: number | null; text: string }) {
    return (
        <td className={`px-4 py-2.5 text-right ${v !== null && v < 0 ? 'text-red-600' : 'text-main'}`}>
            {text}
        </td>
    );
}

/* --------------------------------------------------------- quality gates */

/**
 * THE gate — single source of truth shared by generateMetadata, the page body
 * and the sibling-nav links. Must match the sitemap's per-metric conditions
 * EXACTLY (see file header). `??` not `||`: a literal 0 must not fall through
 * to a stale secondary source.
 */
function metricGate(slug: MetricSlug, ticker: Ticker, stats: Stats | null, years: FinancialYear[]): boolean {
    switch (slug) {
        case 'market-cap':
            return (ticker.market_cap ?? statNum(stats, 'market_cap')) !== null;
        case 'revenue':
            return statNum(stats, 'revenue_ttm') !== null || years.some((y) => y.revenue !== null);
        case 'net-income':
            return statNum(stats, 'net_income_ttm') !== null || years.some((y) => y.net_income !== null);
        case 'eps':
            return statNum(stats, 'eps_ttm') !== null || years.some((y) => y.eps_diluted !== null);
        case 'dividend-yield': {
            const dy = ticker.dividend_yield ?? statNum(stats, 'dividend_yield');
            return (dy !== null && dy > 0) || years.some((y) => y.dps !== null);
        }
        case 'pe-ratio':
            return (ticker.pe_ratio ?? statNum(stats, 'pe_ratio')) !== null;
    }
}

/* ----------------------------------------------------------- view model */

type PeersConfig = {
    heading: string;
    valueHeader: string;
    field: 'market_cap' | 'dividend_yield' | 'pe_ratio';
    fmt: (n: number | null) => string;
    /** dividend-yield: a peer only passes its own gate when yield > 0. */
    requirePositive: boolean;
    /** asc = cheapest P/E first; desc = biggest cap / highest yield first. */
    sort: 'asc' | 'desc';
};

type HistoryConfig = {
    heading: string;
    valueHeader: string;
    fmtValue: (n: number | null) => string;
    showYoY: boolean;
    /** net-income only: net margin % when revenue exists for that year. */
    showMargin: boolean;
    rows: HistRow[];
    note: string | null;
};

type MetricView = {
    label: string;
    definition: string;
    hero: { value: string; negative: boolean; sub: string | null; asOfLine: string | null; note: string | null };
    description: string;
    history: HistoryConfig | null;
    peers: PeersConfig | null;
    temporal: { min: number; max: number } | null;
};

function capDescription(d: string): string {
    return d.length > 160 ? `${d.slice(0, 157).trimEnd()}…` : d;
}

/** Builds everything metadata + body need for one metric. Gate NOT included — callers check metricGate() first. */
function buildView(slug: MetricSlug, ticker: Ticker, stats: Stats | null, years: FinancialYear[]): MetricView {
    const symbol = ticker.symbol.toUpperCase();
    const name = ticker.name_en || symbol;
    const label = METRIC_LABEL[slug];
    const definition = METRIC_DEFINITION[slug];
    const asOf = ticker.last_updated
        ? new Date(ticker.last_updated).toLocaleString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
          })
        : null;
    const asOfYear = ticker.last_updated ? new Date(ticker.last_updated).getFullYear() : new Date().getFullYear();
    const asOfLine = asOf ? `As of ${asOf} (Cairo time)` : null;

    switch (slug) {
        case 'market-cap': {
            const mcap = ticker.market_cap ?? statNum(stats, 'market_cap');
            const shares = statNum(stats, 'shares_outstanding');
            const price = ticker.last_price ?? statNum(stats, 'last_price');
            const cur = ticker.currency || 'EGP';
            return {
                label, definition,
                hero: {
                    value: fmtEgpFull(mcap),
                    negative: mcap !== null && mcap < 0,
                    sub: 'Market capitalization',
                    asOfLine,
                    note: shares !== null && price !== null
                        ? `Reflects ≈ ${fmtShares(shares)} shares outstanding × ${cur} ${fmtNum(price)} last price.`
                        : null,
                },
                description: capDescription(
                    `${name} (${symbol}) market cap is ${fmtEgpFull(mcap)} as of ${asOfYear} — EGX market capitalization with shares outstanding and sector peer comparison.`
                ),
                history: null,
                peers: {
                    heading: `${ticker.sector_name || 'Sector'} peers by market cap`,
                    valueHeader: 'Market cap',
                    field: 'market_cap',
                    fmt: fmtEgp,
                    requirePositive: false,
                    sort: 'desc',
                },
                temporal: null,
            };
        }
        case 'revenue': {
            const rows = withYoY(historyRows(years, (y) => y.revenue));
            const ttm = statNum(stats, 'revenue_ttm');
            const current = ttm ?? (rows[0]?.value ?? null);
            const tag = ttm !== null ? 'TTM' : rows[0] ? `FY ${rows[0].year}` : '';
            const span = yearSpan(rows);
            return {
                label, definition,
                hero: {
                    value: fmtEgpFull(current),
                    negative: current !== null && current < 0,
                    sub: ttm !== null ? 'Trailing 12 months (TTM)' : rows[0] ? `Fiscal year ${rows[0].year}` : null,
                    asOfLine: ttm !== null ? asOfLine : null,
                    note: null,
                },
                description: capDescription(
                    `${name} (${symbol}) revenue is ${fmtEgpFull(current)} (${tag}).${span ? ` Annual revenue history ${span.min}–${span.max} with YoY growth.` : ''} EGX filings via TradingView.`
                ),
                history: rows.length > 0
                    ? { heading: 'Revenue history', valueHeader: 'Revenue', fmtValue: fmtEgp, showYoY: true, showMargin: false, rows, note: null }
                    : null,
                peers: null,
                temporal: span,
            };
        }
        case 'net-income': {
            const rows = withYoY(historyRows(years, (y) => y.net_income));
            const ttm = statNum(stats, 'net_income_ttm');
            const current = ttm ?? (rows[0]?.value ?? null);
            const tag = ttm !== null ? 'TTM' : rows[0] ? `FY ${rows[0].year}` : '';
            const span = yearSpan(rows);
            return {
                label, definition,
                hero: {
                    value: fmtEgpFull(current),
                    negative: current !== null && current < 0,
                    sub: ttm !== null ? 'Trailing 12 months (TTM)' : rows[0] ? `Fiscal year ${rows[0].year}` : null,
                    asOfLine: ttm !== null ? asOfLine : null,
                    note: null,
                },
                description: capDescription(
                    `${name} (${symbol}) net income is ${fmtEgpFull(current)} (${tag}).${span ? ` Annual profit history ${span.min}–${span.max} with net margins and YoY growth.` : ''} EGX filings via TradingView.`
                ),
                history: rows.length > 0
                    ? { heading: 'Net income history', valueHeader: 'Net income', fmtValue: fmtEgp, showYoY: true, showMargin: true, rows, note: null }
                    : null,
                peers: null,
                temporal: span,
            };
        }
        case 'eps': {
            const rows = withYoY(historyRows(years, (y) => y.eps_diluted));
            const ttm = statNum(stats, 'eps_ttm');
            const current = ttm ?? (rows[0]?.value ?? null);
            const tag = ttm !== null ? 'TTM' : rows[0] ? `FY ${rows[0].year}` : '';
            const span = yearSpan(rows);
            return {
                label, definition,
                hero: {
                    value: current !== null ? `EGP ${fmtPerShare(current)}` : '—',
                    negative: current !== null && current < 0,
                    sub: ttm !== null ? 'Diluted EPS, trailing 12 months' : rows[0] ? `Diluted EPS, fiscal year ${rows[0].year}` : null,
                    asOfLine: ttm !== null ? asOfLine : null,
                    note: null,
                },
                description: capDescription(
                    `${name} (${symbol}) EPS is EGP ${fmtPerShare(current)} (diluted, ${tag}).${span ? ` Annual diluted EPS history ${span.min}–${span.max}.` : ''} EGX filings via TradingView.`
                ),
                history: rows.length > 0
                    ? {
                          heading: 'EPS history',
                          valueHeader: 'EPS (diluted)',
                          fmtValue: fmtPerShare,
                          showYoY: false,
                          showMargin: false,
                          rows,
                          note: 'Figures are diluted EPS, in EGP per share.',
                      }
                    : null,
                peers: null,
                temporal: span,
            };
        }
        case 'dividend-yield': {
            const dy = ticker.dividend_yield ?? statNum(stats, 'dividend_yield');
            const dps = statNum(stats, 'dps');
            const rows = withYoY(historyRows(years, (y) => y.dps));
            const span = yearSpan(rows);
            const hasYield = dy !== null && dy > 0;
            return {
                label, definition,
                hero: hasYield
                    ? {
                          value: fmtPct(dy),
                          negative: false,
                          sub: 'Trailing dividend yield',
                          asOfLine,
                          note: dps !== null ? `EGP ${fmtPerShare(dps)} dividend per share (trailing).` : null,
                      }
                    : {
                          value: rows[0] ? `EGP ${fmtPerShare(rows[0].value)}` : '—',
                          negative: false,
                          sub: rows[0] ? `Dividend per share, fiscal year ${rows[0].year}` : null,
                          asOfLine: null,
                          note: 'No trailing dividend yield is currently reported for this line.',
                      },
                description: capDescription(
                    hasYield
                        ? `${name} (${symbol}) dividend yield is ${fmtPct(dy)} as of ${asOfYear}${dps !== null ? `, paying EGP ${fmtPerShare(dps)} per share` : ''}. DPS history and EGX sector peer comparison.`
                        : `${name} (${symbol}) paid EGP ${fmtPerShare(rows[0]?.value ?? null)} per share in FY ${rows[0]?.year ?? ''}. Dividend per share history and EGX sector peer comparison.`
                ),
                history: rows.length > 0
                    ? {
                          heading: 'Dividend per share history',
                          valueHeader: 'DPS',
                          fmtValue: fmtPerShare,
                          showYoY: false,
                          showMargin: false,
                          rows,
                          note: 'Dividend per share (DPS), in EGP, by fiscal year.',
                      }
                    : null,
                peers: {
                    heading: `${ticker.sector_name || 'Sector'} peers by dividend yield`,
                    valueHeader: 'Dividend yield',
                    field: 'dividend_yield',
                    fmt: fmtPct,
                    requirePositive: true,
                    sort: 'desc',
                },
                temporal: span,
            };
        }
        case 'pe-ratio': {
            const pe = ticker.pe_ratio ?? statNum(stats, 'pe_ratio');
            const fpe = statNum(stats, 'forward_pe');
            return {
                label, definition,
                hero: {
                    value: fmtNum(pe),
                    negative: pe !== null && pe < 0,
                    sub: 'Trailing P/E (TTM earnings)',
                    asOfLine,
                    note: fpe !== null ? `Forward P/E: ${fmtNum(fpe)}.` : null,
                },
                description: capDescription(
                    `${name} (${symbol}) P/E ratio is ${fmtNum(pe)} (trailing)${fpe !== null ? `, forward P/E ${fmtNum(fpe)}` : ''} as of ${asOfYear}. Valuation vs same-sector EGX peers.`
                ),
                history: null,
                peers: {
                    heading: `${ticker.sector_name || 'Sector'} peers by P/E ratio`,
                    valueHeader: 'P/E ratio',
                    field: 'pe_ratio',
                    fmt: fmtNum,
                    requirePositive: false,
                    sort: 'asc',
                },
                temporal: null,
            };
        }
    }
}

/* ------------------------------------------------------------ data load */

/** Shared load for metadata + body (all getters are React.cache-wrapped). */
async function loadSymbolData(symbol: string) {
    // getTicker/getFinancialYears intentionally NOT caught: a DB outage must
    // 500 (crawler retries) — swallowing it into a 404 would deindex the URL.
    const [ticker, stats, years] = await Promise.all([
        getTicker(symbol),
        getStats(symbol),
        getFinancialYears(symbol),
    ]);
    return { ticker, stats, years };
}

/** Normalize + validate the metric route param. null → 404. */
function resolveMetric(raw: string): MetricSlug | null {
    const slug = (raw || '').toLowerCase();
    // Defensive: static folders win in the router, but never serve them here.
    if (RESERVED_SLUGS.has(slug)) return null;
    return (METRIC_SLUGS as readonly string[]).includes(slug) ? (slug as MetricSlug) : null;
}

/* -------------------------------------------------------------- metadata */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id, metric } = await params;
    const symbol = (id || '').toUpperCase();
    const slug = resolveMetric(metric);
    if (!symbol || !slug) return {};
    const { ticker, stats, years } = await loadSymbolData(symbol);
    // Gate fail or unknown symbol: the body 404s — emit no indexable metadata.
    if (!ticker || !metricGate(slug, ticker, stats, years)) return {};
    const name = ticker.name_en || symbol;
    const view = buildView(slug, ticker, stats, years);
    return {
        title: `${name} (${symbol}) ${view.label}`,
        description: view.description,
        alternates: { canonical: `${symbolPath(symbol)}/${slug}` },
    };
}

/* ------------------------------------------------------------------ page */

export default async function MetricPage({ params }: Props) {
    const { id, metric } = await params;
    const symbol = (id || '').toUpperCase();
    const slug = resolveMetric(metric);
    if (!symbol || !slug) notFound();
    const { ticker, stats, years } = await loadSymbolData(symbol);
    if (!ticker) notFound();
    // QUALITY GATE: no real data behind this metric → 404 (sitemap parity).
    if (!metricGate(slug, ticker, stats, years)) notFound();

    const name = ticker.name_en || symbol;
    const view = buildView(slug, ticker, stats, years);
    const pagePath = `${symbolPath(symbol)}/${slug}`;

    // Peers module (market-cap / dividend-yield / pe-ratio only). Decorative:
    // failures degrade to no table, never a 500.
    const peers: Ticker[] =
        view.peers && ticker.sector_name
            ? await getSectorPeers(ticker.sector_name, symbol, 6).catch(() => [])
            : [];

    let peerRows: Array<{ symbol: string; name: string; value: number | null; isSelf: boolean }> = [];
    if (view.peers) {
        const cfg = view.peers;
        const selfValue =
            cfg.field === 'market_cap'
                ? (ticker.market_cap ?? statNum(stats, 'market_cap'))
                : cfg.field === 'dividend_yield'
                  ? (ticker.dividend_yield ?? statNum(stats, 'dividend_yield'))
                  : (ticker.pe_ratio ?? statNum(stats, 'pe_ratio'));
        peerRows = peers
            // Only peers that would pass their OWN gate — never link a 404.
            .filter((p) => p[cfg.field] !== null && (!cfg.requirePositive || (p[cfg.field] as number) > 0))
            .map((p) => ({
                symbol: p.symbol.toUpperCase(),
                name: p.name_en || p.symbol.toUpperCase(),
                value: p[cfg.field],
                isSelf: false,
            }));
        if (peerRows.length > 0) {
            peerRows.push({ symbol, name, value: selfValue, isSelf: true });
            peerRows.sort((a, b) => {
                if (a.value === null) return 1;
                if (b.value === null) return -1;
                return cfg.sort === 'asc' ? a.value - b.value : b.value - a.value;
            });
        }
    }

    const datasetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        // Only claim "history" when the page actually carries a dated series
        // (metrics like market-cap are point-in-time snapshots).
        name: `${name} (${symbol}) ${view.label}${view.temporal ? ' history' : ''}`,
        description: view.description,
        url: absUrl(pagePath),
        creator: {
            '@id': `${SITE_URL}/#organization`,
            '@type': 'Organization',
            name: 'Starta Markets',
        },
        ...(view.temporal ? { temporalCoverage: `${view.temporal.min}/${view.temporal.max}` } : {}),
        license: `${SITE_URL}/terms`,
    };

    const breadcrumbItems = [
        { href: '/', url: '/', label: 'Home' },
        { href: '/companies', url: '/companies', label: 'EGX Companies' },
        { href: symbolPath(symbol), url: symbolPath(symbol), label: name },
        { label: view.label },
    ];

    // Sibling metric pages, gated with the SAME conditions — no internal 404s.
    const siblingMetrics = METRIC_SLUGS.filter((s) => s !== slug && metricGate(s, ticker, stats, years));
    // Yearly revenue lookup for the net-income margin column.
    const revenueByYear = new Map<number, number>();
    if (view.history?.showMargin) {
        for (const y of years) {
            if (typeof y.fiscal_year === 'number' && Number.isFinite(y.fiscal_year) && y.revenue !== null && y.revenue !== 0) {
                revenueByYear.set(y.fiscal_year, y.revenue);
            }
        }
    }

    return (
        <PublicPageShell>
            <JsonLd data={breadcrumbJsonLd(breadcrumbItems, SITE_URL)} />
            <JsonLd data={datasetJsonLd} />
            <Breadcrumbs items={breadcrumbItems} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {name} ({symbol}) {view.label}
            </h1>

            <div className="mt-6 max-w-md rounded-xl border border-border bg-surface p-6">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{view.label}</p>
                <p className={`mt-2 text-3xl font-extrabold sm:text-4xl ${view.hero.negative ? 'text-red-600' : 'text-main'}`}>
                    {view.hero.value}
                </p>
                {view.hero.sub && <p className="mt-1 text-sm font-semibold text-muted">{view.hero.sub}</p>}
                {view.hero.asOfLine && <p className="mt-1 text-xs text-muted">{view.hero.asOfLine}</p>}
                {view.hero.note && <p className="mt-3 text-sm text-muted">{view.hero.note}</p>}
            </div>

            <p className="mt-5 max-w-3xl leading-relaxed text-muted">{view.definition}</p>

            {view.history && (
                <section className="mt-8">
                    <h2 className="text-lg font-bold text-main">{view.history.heading}</h2>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                        <table className="w-full min-w-[420px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                                    <th className="px-4 py-3">Fiscal year</th>
                                    <th className="px-4 py-3 text-right">{view.history.valueHeader}</th>
                                    {view.history.showYoY && <th className="px-4 py-3 text-right">YoY growth</th>}
                                    {view.history.showMargin && <th className="px-4 py-3 text-right">Net margin</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {view.history.rows.map((r) => {
                                    const rev = revenueByYear.get(r.year);
                                    const margin = view.history!.showMargin && rev !== undefined ? (r.value / rev) * 100 : null;
                                    return (
                                        <tr key={r.year} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                            <td className="px-4 py-2.5 font-semibold text-main">{r.year}</td>
                                            <NumCell v={r.value} text={view.history!.fmtValue(r.value)} />
                                            {view.history!.showYoY && <NumCell v={r.yoy} text={fmtPct(r.yoy)} />}
                                            {view.history!.showMargin && <NumCell v={margin} text={fmtPct(margin)} />}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {view.history.note && <p className="mt-2 text-xs text-muted">{view.history.note}</p>}
                </section>
            )}

            {view.peers && peerRows.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-lg font-bold text-main">{view.peers.heading}</h2>
                    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                        <table className="w-full min-w-[420px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                                    <th className="px-4 py-3">Company</th>
                                    <th className="px-4 py-3 text-right">{view.peers.valueHeader}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {peerRows.map((row) => (
                                    <tr
                                        key={row.symbol}
                                        className={`border-b border-border/60 last:border-0 ${row.isSelf ? 'bg-teal-50/60' : 'hover:bg-panel/40'}`}
                                    >
                                        <td className="px-4 py-2.5">
                                            {row.isSelf ? (
                                                <span className="font-bold text-main">
                                                    {row.name} ({row.symbol})
                                                </span>
                                            ) : (
                                                <Link
                                                    href={`${symbolPath(row.symbol)}/${slug}`}
                                                    className="font-semibold text-teal-700 hover:text-starta-darkTeal hover:underline"
                                                >
                                                    {row.name} ({row.symbol})
                                                </Link>
                                            )}
                                        </td>
                                        <NumCell v={row.value} text={view.peers!.fmt(row.value)} />
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            <p className="mt-6 text-xs text-muted">
                All monetary figures in EGP. Source: Egyptian Exchange via TradingView; annual figures from company
                disclosures; updated weekly. Prices refresh every 15 minutes during EGX trading hours.
            </p>

            <nav aria-label={`More on ${symbol}`} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-teal-700">
                <Link href={symbolPath(symbol)} className="hover:text-starta-darkTeal hover:underline">
                    {symbol} Overview
                </Link>
                {siblingMetrics.map((s) => (
                    <Link key={s} href={`${symbolPath(symbol)}/${s}`} className="hover:text-starta-darkTeal hover:underline">
                        {METRIC_LABEL[s]}
                    </Link>
                ))}
                {years.length > 0 && (
                    <Link href={`${symbolPath(symbol)}/financials`} className="hover:text-starta-darkTeal hover:underline">
                        Financials
                    </Link>
                )}
                <Link href={`${symbolPath(symbol)}/dividends`} className="hover:text-starta-darkTeal hover:underline">
                    Dividends
                </Link>
                <Link href={`${symbolPath(symbol)}/technicals`} className="hover:text-starta-darkTeal hover:underline">
                    Technicals
                </Link>
                <Link href={`${symbolPath(symbol)}/history`} className="hover:text-starta-darkTeal hover:underline">
                    Price History
                </Link>
            </nav>
        </PublicPageShell>
    );
}
