import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTicker, getStats, getAllTickers, type Ticker } from '@/lib/public-data';
import { SITE_URL, absUrl, symbolPath, symbolPathAr, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { ltrNum } from '@/lib/bidi';
import { METRIC_GROUPS, STOCKVS, t, type Lang, type Fmt, type Metric } from '@/content/stock-vs';

/**
 * /companies/vs/{A}-vs-{B} and /ar/companies/vs/{A}-vs-{B}
 *
 * Head-to-head comparison of two EGX companies. Lives under /companies (the
 * company hub) rather than /symbol because /symbol/[id]/[metric] already
 * matches three segments — /symbol/vs/{pair} would rely on Next resolving a
 * static segment ahead of a dynamic one, which is true but is a trap waiting
 * for the next person. /companies has no dynamic children, so there is nothing
 * to collide with.
 *
 * SAME-SECTOR ONLY. A bank's balance sheet is structurally many times an
 * industrial company's, and its return on assets a fraction of it; comparing
 * across sectors produces gaps that describe the industries, not the
 * businesses. Restricting to one sector also keeps the crawlable space finite:
 * 318 symbols is 50,403 unordered pairs, and most of them are comparisons
 * nobody makes.
 *
 * URL is canonical-ordered (alphabetical). B-vs-A permanently redirects to
 * A-vs-B so the pair has exactly one indexable URL.
 *
 * YMYL: no winner is declared anywhere. The Difference column is arithmetic —
 * a multiple or a gap in percentage points — and names which side is higher
 * without asserting that higher is better.
 */

export const PAIR_SEP = '-vs-';

/** Split on the literal separator, not a greedy regex: one EGX ticker is
 *  "EGS48271C018-EGP" and another "EGS385S1C012", so dashes are not delimiters. */
export function parsePair(pair: string): { a: string; b: string } | null {
    const raw = (pair || '').trim();
    const i = raw.indexOf(PAIR_SEP);
    if (i <= 0) return null;
    const rawA = raw.slice(0, i);
    const rawB = raw.slice(i + PAIR_SEP.length);
    // Check for a second separator BEFORE upper-casing: "A-vs-B-vs-C" would
    // otherwise become b="B-VS-C", which no longer matches the lowercase
    // separator and slips past the guard as a valid-looking pair.
    if (!rawA || !rawB || rawB.includes(PAIR_SEP)) return null;
    const a = rawA.toUpperCase();
    const b = rawB.toUpperCase();
    if (a === b) return null;
    return { a, b };
}

export const canonicalPair = (a: string, b: string): string =>
    a < b ? `${a}${PAIR_SEP}${b}` : `${b}${PAIR_SEP}${a}`;

const vsPath = (a: string, b: string, lang: Lang): string =>
    `${lang === 'ar' ? '/ar' : ''}/companies/vs/${canonicalPair(a, b)}`;

const num = (row: Record<string, unknown> | null, key: string): number | null => {
    if (!row) return null;
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
};

/* ── formatting ──────────────────────────────────────────────────────────── */

const compactMoney = (v: number, lang: Lang, currency: string): string => {
    const abs = Math.abs(v);
    const unit = (n: number, en: string, ar: string) =>
        `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })} ${lang === 'ar' ? ar : en}`;
    if (abs >= 1e9) return `${unit(v / 1e9, 'bn', 'مليار')} ${currency}`;
    if (abs >= 1e6) return `${unit(v / 1e6, 'm', 'مليون')} ${currency}`;
    return `${v.toLocaleString('en-EG', { maximumFractionDigits: 0 })} ${currency}`;
};

const compactNum = (v: number, lang: Lang): string => {
    const abs = Math.abs(v);
    const unit = (n: number, en: string, ar: string) =>
        `${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })} ${lang === 'ar' ? ar : en}`;
    if (abs >= 1e9) return unit(v / 1e9, 'bn', 'مليار');
    if (abs >= 1e6) return unit(v / 1e6, 'm', 'مليون');
    return v.toLocaleString('en-EG', { maximumFractionDigits: 0 });
};

function fmtValue(v: number | null, fmt: Fmt, lang: Lang, currency: string): string | null {
    if (v === null) return null;
    switch (fmt) {
        case 'price':
            return ltrNum(`${v.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`);
        case 'money':
            return ltrNum(compactMoney(v, lang, currency));
        case 'num':
            return ltrNum(compactNum(v, lang));
        case 'pct':
            return ltrNum(`${v.toFixed(2)}%`);
        case 'ratio':
            return ltrNum(v.toFixed(2));
    }
}

/**
 * The Difference cell. Arithmetic only: a multiple for size metrics, a gap in
 * percentage points for rates. It names the higher side; it never says better.
 */
function fmtDiff(
    a: number | null,
    b: number | null,
    metric: Metric,
    symA: string,
    symB: string,
    lang: Lang
): string | null {
    if (metric.diff === 'none' || a === null || b === null) return null;
    if (metric.diff === 'points') {
        const d = Math.abs(a - b);
        if (d < 0.005) return null;
        const higher = a > b ? symA : symB;
        return `${higher} ${ltrNum(`+${d.toFixed(2)} pp`)}`;
    }
    // ratio: both must be positive for a multiple to mean anything
    if (a <= 0 || b <= 0) return null;
    const mult = a > b ? a / b : b / a;
    if (!Number.isFinite(mult) || mult < 1.005) return null;
    const higher = a > b ? symA : symB;
    return `${higher} ${ltrNum(`${mult.toFixed(2)}×`)} ${t(STOCKVS.larger, lang)}`;
}

/* ── loading ─────────────────────────────────────────────────────────────── */

type Side = { symbol: string; ticker: Ticker; stats: Record<string, unknown> | null; name: string; path: string };
type Loaded =
    | { redirect: string }
    | { A: Side; B: Side; sector: string; rowCount: number };

/** A page needs enough populated rows to be a comparison rather than a stub. */
const MIN_ROWS = 8;

async function load(pairParam: string, lang: Lang): Promise<Loaded | null> {
    const parsed = parsePair(pairParam);
    if (!parsed) return null;

    const canonical = canonicalPair(parsed.a, parsed.b);
    if (canonical !== `${parsed.a}${PAIR_SEP}${parsed.b}`) {
        return { redirect: vsPath(parsed.a, parsed.b, lang) };
    }

    const [tickerA, tickerB] = await Promise.all([
        getTicker(parsed.a).catch(() => null),
        getTicker(parsed.b).catch(() => null),
    ]);
    if (!tickerA || !tickerB) return null;

    // Same sector, and never the index row.
    const secA = (tickerA.sector_name || '').trim();
    const secB = (tickerB.sector_name || '').trim();
    if (!secA || secA !== secB || secA === 'Index') return null;

    const [statsA, statsB] = await Promise.all([
        getStats(parsed.a).catch(() => null),
        getStats(parsed.b).catch(() => null),
    ]);

    const mk = (symbol: string, ticker: Ticker, stats: Record<string, unknown> | null): Side => ({
        symbol,
        ticker,
        stats,
        name: (lang === 'ar' ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol,
        path: encodeURI(lang === 'ar' ? symbolPathAr(symbol, ticker.name_ar) : symbolPath(symbol)),
    });

    const A = mk(parsed.a, tickerA, statsA);
    const B = mk(parsed.b, tickerB, statsB);

    // Count rows where at least one side has a figure — the page's own gate.
    let rowCount = 0;
    for (const g of METRIC_GROUPS) {
        for (const m of g.metrics) {
            const va = num(A.stats, m.key) ?? num(A.ticker as unknown as Record<string, unknown>, m.key);
            const vb = num(B.stats, m.key) ?? num(B.ticker as unknown as Record<string, unknown>, m.key);
            if (va !== null || vb !== null) rowCount++;
        }
    }
    if (rowCount < MIN_ROWS) return null;

    return { A, B, sector: secA, rowCount };
}

/* ── metadata ────────────────────────────────────────────────────────────── */

export async function stockVsMetadata(pairParam: string, lang: Lang): Promise<Metadata> {
    const loaded = await load(pairParam, lang);
    if (!loaded || 'redirect' in loaded) return {};
    const { A, B } = loaded;

    const pathEn = vsPath(A.symbol, B.symbol, 'en');
    const pathAr = vsPath(A.symbol, B.symbol, 'ar');
    const canonical = lang === 'ar' ? pathAr : pathEn;

    const title = t(STOCKVS.title(A.name, B.name, A.symbol, B.symbol), lang);
    let description = t(STOCKVS.description(A.name, B.name, A.symbol, B.symbol), lang);
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    return {
        title,
        description,
        alternates: { canonical, languages: { en: pathEn, ar: pathAr, 'x-default': pathAr } },
        openGraph: {
            ...OG_DEFAULTS,
            type: 'website',
            title: `${title} | Starta Markets`,
            description,
            url: canonical,
            locale: lang === 'ar' ? 'ar_EG' : 'en_US',
        },
    };
}

/* ── render ──────────────────────────────────────────────────────────────── */

export async function renderStockVs(pairParam: string, lang: Lang) {
    const isAr = lang === 'ar';
    const loaded = await load(pairParam, lang);
    if (!loaded) notFound();
    if ('redirect' in loaded) permanentRedirect(loaded.redirect);

    const { A, B, sector, rowCount } = loaded;
    const currency = A.ticker.currency || B.ticker.currency || 'EGP';

    // Sector peers for the related-pairs block, biggest first, excluding these two.
    let peers: Ticker[] = [];
    try {
        peers = (await getAllTickers())
            .filter(
                (x) =>
                    (x.sector_name || '').trim() === sector &&
                    x.symbol !== A.symbol &&
                    x.symbol !== B.symbol &&
                    typeof x.market_cap === 'number' &&
                    (x.market_cap as number) > 0
            )
            .sort((p, q) => (q.market_cap as number) - (p.market_cap as number))
            .slice(0, 6);
    } catch {
        peers = [];
    }

    const crumbs = [
        { href: isAr ? '/ar' : '/', url: isAr ? '/ar' : '/', label: isAr ? 'الرئيسية' : 'Home' },
        {
            href: isAr ? '/ar/companies' : '/companies',
            url: isAr ? '/ar/companies' : '/companies',
            label: isAr ? 'شركات البورصة المصرية' : 'EGX Companies',
        },
        { label: `${A.symbol} ${isAr ? 'مقابل' : 'vs'} ${B.symbol}` },
    ];

    const faq = STOCKVS.faq(A.name, B.name, sector);
    const headCls = `border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`;
    const valCls = `px-4 py-2.5 tabular-nums ${isAr ? 'text-left' : 'text-right'}`;

    const sideHead = (S: Side) => (
        <div className="flex-1 rounded-xl border border-border bg-surface p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-muted">{S.symbol}</div>
            <Link href={S.path} prefetch={false} className="mt-1 block text-base font-extrabold leading-snug text-starta-teal hover:underline">
                {S.name}
            </Link>
            <div className="mt-2 text-lg font-extrabold tabular-nums text-main">
                {fmtValue(S.ticker.last_price, 'price', lang, currency) ?? '—'}
            </div>
            {typeof S.ticker.change_percent === 'number' && (
                <div className={`text-sm font-bold tabular-nums ${(S.ticker.change_percent as number) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {ltrNum(`${(S.ticker.change_percent as number) >= 0 ? '+' : ''}${(S.ticker.change_percent as number).toFixed(2)}%`)}
                </div>
            )}
        </div>
    );

    return (
        <PublicPageShell lang={lang} altHref={vsPath(A.symbol, B.symbol, isAr ? 'en' : 'ar')} persistLang>
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'ItemList',
                    name: t(STOCKVS.h1(A.name, B.name), lang),
                    url: absUrl(vsPath(A.symbol, B.symbol, lang)),
                    numberOfItems: 2,
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: A.name, url: absUrl(A.path) },
                        { '@type': 'ListItem', position: 2, name: B.name, url: absUrl(B.path) },
                    ],
                }}
            />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: faq.map((x) => ({
                        '@type': 'Question',
                        name: t(x.q, lang),
                        acceptedAnswer: { '@type': 'Answer', text: t(x.a, lang) },
                    })),
                }}
            />
            <Breadcrumbs items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold leading-snug text-main sm:text-3xl">
                {t(STOCKVS.h1(A.name, B.name), lang)}
            </h1>
            <p className="mt-2 text-sm text-muted">{t(STOCKVS.subhead(sector), lang)}</p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                {sideHead(A)}
                {sideHead(B)}
            </div>

            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">
                {t(STOCKVS.intro(A.name, B.name, sector, rowCount), lang)}
            </p>

            {METRIC_GROUPS.map((g) => {
                const rows = g.metrics
                    .map((m) => {
                        const va = num(A.stats, m.key) ?? num(A.ticker as unknown as Record<string, unknown>, m.key);
                        const vb = num(B.stats, m.key) ?? num(B.ticker as unknown as Record<string, unknown>, m.key);
                        return { m, va, vb };
                    })
                    // A row where NEITHER company reports is not a comparison — drop it
                    // entirely rather than printing "— vs —".
                    .filter((r) => r.va !== null || r.vb !== null);
                if (rows.length === 0) return null;

                return (
                    <section key={g.id} className="mt-8">
                        <h2 className="text-lg font-extrabold tracking-tight text-main">{t(g.title, lang)}</h2>
                        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{t(g.blurb, lang)}</p>

                        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                            <table className="w-full min-w-[620px] text-sm">
                                <thead>
                                    <tr className={headCls}>
                                        <th scope="col" className="px-4 py-3">{t(STOCKVS.cols.metric, lang)}</th>
                                        <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>
                                            <span className="normal-case tracking-normal">{A.symbol}</span>
                                        </th>
                                        <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>
                                            <span className="normal-case tracking-normal">{B.symbol}</span>
                                        </th>
                                        <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>
                                            {t(STOCKVS.cols.diff, lang)}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(({ m, va, vb }) => {
                                        const av = fmtValue(va, m.fmt, lang, currency);
                                        const bv = fmtValue(vb, m.fmt, lang, currency);
                                        const diff = fmtDiff(va, vb, m, A.symbol, B.symbol, lang);
                                        return (
                                            <tr key={m.key} className="border-b border-border/60 last:border-0 align-top hover:bg-panel/40">
                                                <th scope="row" className={`px-4 py-2.5 font-semibold text-main ${isAr ? 'text-right' : 'text-left'}`}>
                                                    {t(m.label, lang)}
                                                    {m.note && (
                                                        <span className="mt-1 block text-xs font-normal leading-relaxed text-muted">
                                                            {t(m.note, lang)}
                                                        </span>
                                                    )}
                                                </th>
                                                <td className={`${valCls} ${av ? 'font-semibold text-main' : 'text-muted'}`}>
                                                    {av ?? '—'}
                                                </td>
                                                <td className={`${valCls} ${bv ? 'font-semibold text-main' : 'text-muted'}`}>
                                                    {bv ?? '—'}
                                                </td>
                                                <td className={`${valCls} text-xs text-muted`}>{diff ?? '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}

            <p className="mt-4 text-xs text-muted">{t(STOCKVS.sourceNote, lang)}</p>

            <section className="mt-10 max-w-3xl space-y-4">
                <h2 className="text-lg font-extrabold tracking-tight text-main">{t(STOCKVS.howToReadH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(STOCKVS.howToRead, lang)}</p>
                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">{t(STOCKVS.sameSectorH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(STOCKVS.sameSector, lang)}</p>
                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">{t(STOCKVS.limitsH2, lang)}</h2>
                <p className="text-sm leading-relaxed text-muted">{t(STOCKVS.limits, lang)}</p>
            </section>

            <section className="mt-10">
                <h2 className="text-lg font-extrabold tracking-tight text-main">
                    {isAr ? 'أسئلة شائعة' : 'Frequently asked'}
                </h2>
                <dl className="mt-3 space-y-3">
                    {faq.map((x) => (
                        <div key={t(x.q, lang)} className="rounded-xl border border-border bg-surface p-4">
                            <dt className="font-bold text-main">{t(x.q, lang)}</dt>
                            <dd className="mt-1.5 text-sm leading-relaxed text-muted">{t(x.a, lang)}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            {peers.length > 0 && (
                <nav aria-label={t(STOCKVS.otherPairs, lang)} className="mt-10 border-t border-border pt-5">
                    <h2 className="text-sm font-extrabold tracking-tight text-main">{t(STOCKVS.otherPairs, lang)}</h2>
                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                        {peers.map((p) => (
                            <li key={p.symbol}>
                                <Link href={vsPath(A.symbol, p.symbol, lang)} prefetch={false} className="text-starta-teal hover:underline">
                                    {A.symbol} {isAr ? 'مقابل' : 'vs'} {p.symbol}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}

            <nav aria-label={t(STOCKVS.companyPages, lang)} className="mt-6 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    <li>
                        <Link href={A.path} prefetch={false} className="text-starta-teal hover:underline">{A.name}</Link>
                    </li>
                    <li>
                        <Link href={B.path} prefetch={false} className="text-starta-teal hover:underline">{B.name}</Link>
                    </li>
                    <li>
                        <Link href={isAr ? '/ar/companies' : '/companies'} prefetch={false} className="text-starta-teal hover:underline">
                            {isAr ? 'كل شركات البورصة' : 'All EGX companies'}
                        </Link>
                    </li>
                </ul>
            </nav>

            <p className="mt-6 rounded-xl border border-border bg-panel/40 p-4 text-xs leading-relaxed text-muted">
                {t(STOCKVS.disclaimer, lang)}
            </p>
        </PublicPageShell>
    );
}
