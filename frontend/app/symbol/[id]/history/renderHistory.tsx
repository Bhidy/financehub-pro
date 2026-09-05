import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTicker, getHistoryStats, getRecentHistory, getSeasonalitySymbols} from '@/lib/public-data';
import { SITE_URL, symbolPath, absUrl, OG_DEFAULTS, symbolFromArParam, canonicalRedirectTarget } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import KeyTerms from '@/components/seo/KeyTerms';
import { symbolTabPath, symbolSiblings, symbolCrumbs } from '@/lib/symbol-nav';
import { HISTORY, NAV, t, type Lang } from '@/content/symbol-pages-i18n';

/**
 * /symbol/{SYM}/history — server-rendered daily price history: all-time
 * range summary + the last 60 OHLC sessions, with a Dataset JSON-LD block.
 * The parent layout 404s unknown symbols; this page adds a quality gate —
 * no recorded history means notFound(), never an empty table.
 */

// ISR: cache at the edge and revalidate in background — the audit found
// every SSR route shipped no-store (0% CDN hit, 1.0-1.5s TTFB). Pages are
// anonymous, so edge-caching is safe; value tuned to how fast the data moves.
export const revalidate = 900;

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

export async function historyMetadata(id: string, lang: Lang): Promise<Metadata> {
    const symbol = lang === 'ar' ? symbolFromArParam(id) : (id || '').toUpperCase();
    const ticker = symbol ? await getTicker(symbol) : null;
    if (!ticker) return {};
    const stats = await getHistoryStats(symbol);
    if (!stats) return {};

    const name = (lang === 'ar' ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const pathEn = encodeURI(symbolTabPath(symbol, 'history', 'en'));
    const pathAr = encodeURI(symbolTabPath(symbol, 'history', 'ar', ticker.name_ar));
    const path = lang === 'ar' ? pathAr : pathEn;
    const firstYear = isoDate(stats['first_date'])?.slice(0, 4) ?? null;
    const rowCount = num(stats, 'rows');

    const title = firstYear
        ? t(HISTORY.titleWithYear(name, symbol, String(firstYear)), lang)
        : t(HISTORY.title(name, symbol), lang);
    let description = `${name} (EGX: ${symbol}) daily stock price history${firstYear ? ` since ${firstYear}` : ''}: open, high, low, close & volume${
        rowCount !== null ? ` for ${rowCount.toLocaleString('en-EG')} trading days` : ''
    }, plus all-time high and low.`;
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    return {
        title,
        description,
        alternates: {
            // Language-aware — the Arabic page emitting the English
            // canonical would de-index itself in favour of its twin.
            canonical: path,
            languages: { en: pathEn, ar: pathAr, 'x-default': pathAr },
        },
        openGraph: {
            ...OG_DEFAULTS,
            type: 'website',
            title: `${title} | Starta Markets`,
            description,
            url: path,
        },
    };
}

export async function renderHistory(id: string, lang: Lang) {
    const isAr = lang === 'ar';
    const symbol = isAr ? symbolFromArParam(id) : (id || '').toUpperCase();
    const ticker = await getTicker(symbol);
    if (!ticker) notFound();

    // In parallel: these were four serial round trips, and the history pages
    // were the slowest tail of the site (5-15 s cold, measured 2026-09-05).
    const [stats, recent, seasonalSet] = await Promise.all([
        getHistoryStats(symbol),
        getRecentHistory(symbol, 60),
        getSeasonalitySymbols(),
    ]);
    // Quality gate: no recorded history → 404, never an empty shell page.
    if (!stats || recent.length === 0) notFound();

    const name = (lang === 'ar' ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const overviewPath = encodeURI(symbolTabPath(symbol, 'overview', lang, ticker.name_ar));
    const historyPath = `${overviewPath}/history`;

    const rowCount = num(stats, 'rows');
    const firstIso = isoDate(stats['first_date']);
    const lastIso = isoDate(stats['last_date']);
    const firstYear = firstIso?.slice(0, 4) ?? null;
    const allTimeLow = num(stats, 'all_time_low');
    const allTimeHigh = num(stats, 'all_time_high');

    const cards: Array<{ label: string; value: string }> = [
        ...(firstYear ? [{ label: t(HISTORY.stats.dataSince, lang), value: firstYear }] : []),
        ...(rowCount !== null ? [{ label: t(HISTORY.stats.tradingDays, lang), value: rowCount.toLocaleString('en-EG') }] : []),
        ...(allTimeHigh !== null ? [{ label: t(HISTORY.stats.allTimeHigh, lang), value: `${fmtPrice(allTimeHigh)} EGP` }] : []),
        ...(allTimeLow !== null ? [{ label: t(HISTORY.stats.allTimeLow, lang), value: `${fmtPrice(allTimeLow)} EGP` }] : []),
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

    // Seasonality only exists for symbols with enough history; ask the one
    // cached set rather than probing per page.
    const hasSeasonality = seasonalSet.has(symbol);
    const siblings = symbolSiblings(symbol, 'history', lang, ticker.name_ar, { seasonality: hasSeasonality });

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(symbolTabPath(symbol, 'history', isAr ? 'en' : 'ar', ticker.name_ar))} persistLang>
            <JsonLd data={datasetJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [
                        { url: lang === 'ar' ? '/ar' : '/', label: t(NAV.home, lang) },
                        { url: '/companies', label: t(NAV.companies, lang) },
                        { url: overviewPath, label: name },
                        { label: t(NAV.history, lang) },
                    ],
                    SITE_URL
                )}
            />
            <Breadcrumbs lang={lang}
                items={[
                    { href: '/', label: t(NAV.home, lang) },
                    { href: '/companies', label: t(NAV.companies, lang) },
                    { href: overviewPath, label: name },
                    { label: t(NAV.history, lang) },
                ]}
            />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {t(HISTORY.h1(name, symbol), lang)}
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

            <h2 className="mt-8 text-lg font-bold text-main">{t(HISTORY.recentHeading(recent.length), lang)}</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-left text-xs font-bold uppercase tracking-wide text-muted">
                            <th scope="col" className="px-4 py-3">{t(HISTORY.cols.date, lang)}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t(HISTORY.cols.open, lang)}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t(HISTORY.cols.high, lang)}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t(HISTORY.cols.low, lang)}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t(HISTORY.cols.close, lang)}</th>
                            <th scope="col" className="px-4 py-3 text-right">{t(HISTORY.cols.volume, lang)}</th>
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

            <KeyTerms slugs={['volatility', 'liquidity', 'free-float', 'circuit-breaker-egx']} lang={lang} />

            <p className="mt-4 text-sm text-muted">
                The full price history{firstIso ? ` back to ${humanDate(firstIso)}` : ''} is available on the{' '}
                <Link href={overviewPath} className="font-semibold text-starta-darkTeal hover:underline">
                    interactive {symbol} chart
                </Link>
                .
            </p>

            <p className="mt-2 text-xs text-muted">
                {t(HISTORY.sourceNote, lang)}{firstYear ? `; history back to ${firstYear}` : ''}. Prices in
                Egyptian pounds.
            </p>

            <nav aria-label={t(NAV.companyPages, lang)} className="mt-8 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    {siblings.map((s) => (
                        <li key={s.href}>
                            <Link href={s.href} className="text-starta-darkTeal hover:underline">
                                {s.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </PublicPageShell>
    );
}
