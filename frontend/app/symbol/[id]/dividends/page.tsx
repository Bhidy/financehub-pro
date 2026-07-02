import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicker, getDividendHistory, getDividendSummary } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /symbol/{SYM}/dividends — server-rendered dividend history + TradingView
 * summary. QUALITY GATE: no payment rows AND no summary yield → 404 (never an
 * indexable empty shell). The parent layout already 404s unknown symbols.
 *
 * Date semantics (do not mix up):
 *   - summary (egx_dividends) ex/payment dates are UNIX SECONDS → new Date(n*1000)
 *   - history (dividend_history) dates are ISO strings / pg Dates → isoDate()
 */

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };
type Row = Record<string, unknown>;

/** Finite number field, else null (rows arrive as Record<string, unknown>). */
function num(row: Row | null | undefined, key: string): number | null {
    if (!row) return null;
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/**
 * Normalize a date-ish value (pg DATE → Date at local midnight, timestamps/ISO
 * → strings) to plain YYYY-MM-DD, or null. Component extraction avoids UTC
 * off-by-one shifts on local-midnight Dates.
 */
function isoDate(v: unknown): string | null {
    if (v instanceof Date) {
        if (Number.isNaN(v.getTime())) return null;
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof v === 'string') {
        const m = /^(\d{4}-\d{2}-\d{2})/.exec(v.trim());
        if (m) return m[1];
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }
    return null;
}

/** UNIX-SECONDS summary field → YYYY-MM-DD, or null. */
function unixDate(row: Row | null | undefined, key: string): string | null {
    const n = num(row, key);
    if (n === null || n <= 0) return null;
    const d = new Date(n * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Per-share EGP amount, 2–4dp, null → '—' (never 'null'/'NaN'/0-for-null). */
function fmtAmount(n: number | null): string {
    if (n === null || !Number.isFinite(n)) return '—';
    return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function buildDescription(name: string, symbol: string, divYield: number | null): string {
    const yieldBit = divYield !== null ? ` Trailing yield ${divYield.toFixed(2)}%.` : '';
    let description = `${name} (${symbol}) dividend history on the Egyptian Exchange: per-share payouts in EGP, ex-dates and payment dates.${yieldBit} Source: EGX via TradingView.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;
    return description;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    if (!symbol) return {};
    const [ticker, history, summary] = await Promise.all([
        getTicker(symbol),
        getDividendHistory(symbol),
        getDividendSummary(symbol),
    ]);
    const divYield = num(summary, 'div_yield');
    // No ticker or no dividend data at all: the page body 404s — no metadata.
    if (!ticker || (history.length === 0 && divYield === null)) return {};
    const name = ticker.name_en || symbol;
    return {
        title: `${name} (${symbol}) Dividends & Yield`,
        description: buildDescription(name, symbol, divYield),
        alternates: { canonical: `${symbolPath(symbol)}/dividends` },
    };
}

export default async function DividendsPage({ params }: Props) {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    if (!symbol) notFound();
    const [ticker, history, summary] = await Promise.all([
        getTicker(symbol),
        getDividendHistory(symbol),
        getDividendSummary(symbol),
    ]);
    if (!ticker) notFound();
    const divYield = num(summary, 'div_yield');
    // QUALITY GATE (union of #132 + the phase-2 audit fix): 404 only when the
    // page has NOTHING real to show — no payment records, no positive trailing
    // yield, and no known payout amount (recent or upcoming). A zero yield with
    // no records is nothing (audit: those were 200ing and sitemapped at scale);
    // a known amount with a null/zero computed yield is real content (#132).
    const recentAmount = num(summary, 'amount_recent');
    const upcomingAmount = num(summary, 'amount_upcoming');
    if (history.length === 0 && !(divYield !== null && divYield > 0) && recentAmount === null && upcomingAmount === null) notFound();

    const name = ticker.name_en || symbol;
    const pagePath = `${symbolPath(symbol)}/dividends`;

    // Summary cards — render only what exists; a missing metric is omitted,
    // never shown as 0 (financial accuracy: fabricated zeros are Critical).
    const amountRecent = num(summary, 'amount_recent');
    const exDateRecent = unixDate(summary, 'ex_date_recent');
    const payoutRatio = num(summary, 'payout_ratio_ttm');
    const amountUpcoming = num(summary, 'amount_upcoming');
    const exDateUpcoming = unixDate(summary, 'ex_date_upcoming');
    const growthYears = num(summary, 'continuous_growth');

    const cards: Array<{ label: string; value: string; sub?: string }> = [];
    if (divYield !== null) {
        cards.push({ label: 'Trailing dividend yield', value: `${divYield.toFixed(2)}%` });
    }
    if (amountRecent !== null) {
        cards.push({
            label: 'Most recent dividend',
            value: `EGP ${fmtAmount(amountRecent)}`,
            ...(exDateRecent ? { sub: `Ex-date ${exDateRecent}` } : {}),
        });
    }
    if (payoutRatio !== null && payoutRatio > 0) {
        cards.push({ label: 'Payout ratio (TTM)', value: `${payoutRatio.toFixed(1)}%` });
    }
    if (amountUpcoming !== null || exDateUpcoming !== null) {
        cards.push({
            label: 'Upcoming dividend',
            value: amountUpcoming !== null ? `EGP ${fmtAmount(amountUpcoming)}` : 'Announced',
            ...(exDateUpcoming ? { sub: `Ex-date ${exDateUpcoming}` } : {}),
        });
    }
    if (growthYears !== null && growthYears > 0) {
        cards.push({
            label: 'Consecutive growth years',
            value: `${growthYears} ${growthYears === 1 ? 'year' : 'years'}`,
        });
    }

    const datasetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${name} dividend history`,
        description: buildDescription(name, symbol, divYield),
        url: absUrl(pagePath),
        creator: {
            '@id': `${SITE_URL}/#organization`,
            '@type': 'Organization',
            name: 'Starta Markets',
        },
        license: `${SITE_URL}/terms`,
    };

    const breadcrumbItems = [
        { href: '/', url: '/', label: 'Home' },
        { href: '/companies', url: '/companies', label: 'EGX Companies' },
        { href: symbolPath(symbol), url: symbolPath(symbol), label: name },
        { label: 'Dividends' },
    ];

    return (
        <PublicPageShell>
            <JsonLd data={breadcrumbJsonLd(breadcrumbItems, SITE_URL)} />
            <JsonLd data={datasetJsonLd} />
            <Breadcrumbs items={breadcrumbItems} />

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {name} ({symbol}) Dividend History
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
                Cash dividends paid by {name} on the Egyptian Exchange — per-share amounts in Egyptian
                pounds (EGP) with ex-dates, record dates and payment dates, alongside the current trailing
                yield and payout summary.
            </p>

            {cards.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {cards.map((c) => (
                        <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{c.label}</p>
                            <p className="mt-1 text-lg font-extrabold text-slate-900">{c.value}</p>
                            {c.sub && <p className="mt-0.5 text-xs text-slate-500">{c.sub}</p>}
                        </div>
                    ))}
                </div>
            )}

            {history.length > 0 ? (
                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[560px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Ex-date</th>
                                <th className="px-4 py-3 text-right">Dividend per share (EGP)</th>
                                <th className="px-4 py-3">Record date</th>
                                <th className="px-4 py-3">Payment date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((row, i) => (
                                <tr key={`${isoDate(row['ex_date']) ?? 'row'}-${i}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">{isoDate(row['ex_date']) ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-right text-slate-700">{fmtAmount(num(row, 'dividend_amount'))}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{isoDate(row['record_date']) ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{isoDate(row['pay_date']) ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="mt-6 text-sm text-slate-600">
                    Individual payment records are not yet available for {symbol}; the summary above reflects
                    the latest TradingView dividend data.
                </p>
            )}

            <p className="mt-4 text-xs text-slate-500">
                Source: Egyptian Exchange corporate actions; dividend summary via TradingView.
            </p>

            <nav aria-label={`More on ${symbol}`} className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-teal-700">
                <Link href={symbolPath(symbol)} className="hover:text-teal-600 hover:underline">
                    {symbol} Overview
                </Link>
                <Link href={`${symbolPath(symbol)}/financials`} className="hover:text-teal-600 hover:underline">
                    Financials
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
