import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTicker, getHistoryStats, getRecentHistory } from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /symbol/{SYM}/history — server-rendered daily price history: all-time
 * range summary + the last 60 OHLC sessions, with a Dataset JSON-LD block.
 * The parent layout 404s unknown symbols; this page adds a quality gate —
 * no recorded history means notFound(), never an empty table.
 */

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

type Row = Record<string, unknown>;

/** Finite number field, else null (rows arrive as Record<string, unknown>). */
function num(row: Row, key: string): number | null {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

/**
 * Normalize a date-ish value (pg DATE comes back as a Date at local midnight,
 * timestamps/ISO come back as strings) to a plain YYYY-MM-DD, or null.
 * Extracting components directly avoids UTC off-by-one shifts.
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

/** Human date ("2 July 2026") from a YYYY-MM-DD string, timezone-stable. */
function humanDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

/** Price to 2dp — 4dp for sub-1 penny-stock values where 2dp misleads. */
function fmtPrice(n: number | null): string {
    if (n === null) return '—';
    return n.toLocaleString('en-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: Math.abs(n) < 1 ? 4 : 2,
    });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    const ticker = symbol ? await getTicker(symbol) : null;
    if (!ticker) return {};
    const stats = await getHistoryStats(symbol);
    if (!stats) return {};

    const name = ticker.name_en || symbol;
    const path = `${symbolPath(symbol)}/history`;
    const firstYear = isoDate(stats['first_date'])?.slice(0, 4) ?? null;
    const rowCount = num(stats, 'rows');

    const title = firstYear
        ? `${name} (${symbol}) Price History — Daily OHLC since ${firstYear}`
        : `${name} (${symbol}) Price History — Daily OHLC`;
    let description = `${name} (EGX: ${symbol}) daily stock price history${firstYear ? ` since ${firstYear}` : ''}: open, high, low, close & volume${
        rowCount !== null ? ` for ${rowCount.toLocaleString('en-EG')} trading days` : ''
    }, plus all-time high and low.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    return {
        title,
        description,
        alternates: { canonical: path },
        openGraph: {
            type: 'website',
            title: `${title} | Starta Markets`,
            description,
            url: path,
        },
    };
}

export default async function HistoryPage({ params }: Props) {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    const ticker = await getTicker(symbol);
    if (!ticker) notFound();

    const stats = await getHistoryStats(symbol);
    const recent = await getRecentHistory(symbol, 60);
    // Quality gate: no recorded history → 404, never an empty shell page.
    if (!stats || recent.length === 0) notFound();

    const name = ticker.name_en || symbol;
    const overviewPath = symbolPath(symbol);
    const historyPath = `${overviewPath}/history`;

    const rowCount = num(stats, 'rows');
    const firstIso = isoDate(stats['first_date']);
    const lastIso = isoDate(stats['last_date']);
    const firstYear = firstIso?.slice(0, 4) ?? null;
    const allTimeLow = num(stats, 'all_time_low');
    const allTimeHigh = num(stats, 'all_time_high');

    const cards: Array<{ label: string; value: string }> = [
        ...(firstYear ? [{ label: 'Data since', value: firstYear }] : []),
        ...(rowCount !== null ? [{ label: 'Trading days recorded', value: rowCount.toLocaleString('en-EG') }] : []),
        ...(allTimeHigh !== null ? [{ label: 'All-time high', value: `${fmtPrice(allTimeHigh)} EGP` }] : []),
        ...(allTimeLow !== null ? [{ label: 'All-time low', value: `${fmtPrice(allTimeLow)} EGP` }] : []),
    ];

    const datasetJsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `${name} (${symbol}) daily price history`,
        description: `Daily open, high, low, close and volume for ${name} (${symbol}) on the Egyptian Exchange (EGX).`,
        url: absUrl(historyPath),
        ...(firstIso && lastIso ? { temporalCoverage: `${firstIso}/${lastIso}` } : {}),
        creator: { '@type': 'Organization', name: 'Starta Markets', url: SITE_URL },
        license: SITE_URL + '/terms',
    };

    const siblings = [
        { href: overviewPath, label: 'Overview' },
        { href: `${overviewPath}/financials`, label: 'Financials' },
        { href: `${overviewPath}/dividends`, label: 'Dividends' },
        { href: `${overviewPath}/technicals`, label: 'Technicals' },
    ];

    return (
        <PublicPageShell>
            <JsonLd data={datasetJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [
                        { url: '/', label: 'Home' },
                        { url: '/companies', label: 'EGX Companies' },
                        { url: overviewPath, label: name },
                        { label: 'Price History' },
                    ],
                    SITE_URL
                )}
            />
            <Breadcrumbs
                items={[
                    { href: '/', label: 'Home' },
                    { href: '/companies', label: 'EGX Companies' },
                    { href: overviewPath, label: name },
                    { label: 'Price History' },
                ]}
            />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {name} ({symbol}) Stock Price History
            </h1>

            {cards.length > 0 && (
                <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((c) => (
                        <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{c.label}</dt>
                            <dd className="mt-1 text-xl font-extrabold tabular-nums text-main">{c.value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            <h2 className="mt-8 text-lg font-bold text-main">Last {recent.length} trading sessions</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th scope="col" className="px-4 py-3">Date</th>
                            <th scope="col" className="px-4 py-3 text-right">Open</th>
                            <th scope="col" className="px-4 py-3 text-right">High</th>
                            <th scope="col" className="px-4 py-3 text-right">Low</th>
                            <th scope="col" className="px-4 py-3 text-right">Close</th>
                            <th scope="col" className="px-4 py-3 text-right">Volume</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.map((r, i) => {
                            const dateIso = isoDate(r['date']);
                            const volume = num(r, 'volume');
                            return (
                                <tr key={dateIso || i} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <th scope="row" className="px-4 py-2.5 text-left font-semibold text-main">
                                        {dateIso ? <time dateTime={dateIso}>{dateIso}</time> : '—'}
                                    </th>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmtPrice(num(r, 'open'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmtPrice(num(r, 'high'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-main">{fmtPrice(num(r, 'low'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-main">{fmtPrice(num(r, 'close'))}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                                        {volume !== null ? volume.toLocaleString('en-EG') : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-sm text-muted">
                The full price history{firstIso ? ` back to ${humanDate(firstIso)}` : ''} is available on the{' '}
                <Link href={overviewPath} className="font-semibold text-starta-teal hover:underline">
                    interactive {symbol} chart
                </Link>
                .
            </p>

            <p className="mt-2 text-xs text-muted">
                Daily OHLC from the Egyptian Exchange{firstYear ? `; history back to ${firstYear}` : ''}. Prices in
                Egyptian pounds.
            </p>

            <nav aria-label="Company pages" className="mt-8 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    {siblings.map((s) => (
                        <li key={s.href}>
                            <Link href={s.href} className="text-starta-teal hover:underline">
                                {s.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </PublicPageShell>
    );
}
