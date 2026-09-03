import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTicker, getStats, getSeasonalitySymbols} from '@/lib/public-data';
import { SITE_URL, absUrl, symbolFromArParam, canonicalRedirectTarget, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { symbolTabPath, symbolSiblings, symbolCrumbs } from '@/lib/symbol-nav';
import { STATISTICS, NAV, t, type Lang } from '@/content/symbol-pages-i18n';

/**
 * /symbol/{SYM}/statistics and /ar/symbol/{SYM}-{slug}/statistics.
 *
 * ADDITIVE, not a re-grouping of the overview. The overview shows the TTM
 * figures, which the view populates for only ~22-24% of EGX symbols. This page
 * leads with the FISCAL-YEAR set — revenue_fy 78%, net_income_fy 78%, eps_fy
 * 77%, total_assets/total_debt 76%, fcf_fy 74%, ebitda_fy 70% — plus growth
 * rates and balance-sheet totals that appear nowhere else on the site.
 *
 * NULL-TOLERANT AND GATED: a row with no reported value is omitted rather than
 * rendered as a zero or a dash, and a symbol with fewer than MIN_FIELDS real
 * figures 404s instead of publishing a near-empty table.
 */

const MIN_FIELDS = 8;

type Stats = Record<string, number | string | null> | null;

const n = (s: Stats, k: string): number | null => {
    const v = s?.[k];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
};

const fmt = (v: number | null, d = 2, lang: Lang = 'en'): string | null =>
    v === null ? null : v.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { maximumFractionDigits: d });

const money = (v: number | null, cur: string): string | null => {
    if (v === null) return null;
    const a = Math.abs(v);
    if (a >= 1e9) return `${cur} ${(v / 1e9).toLocaleString('en-EG', { maximumFractionDigits: 2 })}B`;
    if (a >= 1e6) return `${cur} ${(v / 1e6).toLocaleString('en-EG', { maximumFractionDigits: 2 })}M`;
    return `${cur} ${v.toLocaleString('en-EG', { maximumFractionDigits: 2 })}`;
};

const pct = (v: number | null): string | null =>
    v === null ? null : `${v.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%`;

type Group = { heading: string; rows: Array<[string, string]> };

/** Build the grouped table, dropping every row with no reported value. */
function buildGroups(stats: Stats, ticker: NonNullable<Awaited<ReturnType<typeof getTicker>>>, lang: Lang): Group[] {
    const R = STATISTICS.rows;
    const G = STATISTICS.groups;
    const cur = ticker.currency || 'EGP';
    // Fundamentals are reported in EGP even when a line trades in another
    // currency — the documented split on this platform.
    const rep = 'EGP';

    const raw: Array<[string, Array<[string, string | null]>]> = [
        [t(G.valuation, lang), [
            [t(R.marketCap, lang), money(ticker.market_cap ?? n(stats, 'market_cap'), rep)],
            [t(R.pe, lang), fmt(ticker.pe_ratio ?? n(stats, 'pe_ratio'), 2, lang)],
            [t(R.forwardPe, lang), fmt(n(stats, 'forward_pe'), 2, lang)],
            [t(R.pb, lang), fmt(ticker.pb_ratio ?? n(stats, 'pb_ratio'), 2, lang)],
            // >100% trailing yield is mathematically implausible and is a data
            // artefact, not a figure to publish.
            [t(R.divYield, lang), ((y) => (y !== null && y <= 100 ? pct(y) : null))(ticker.dividend_yield ?? n(stats, 'dividend_yield'))],
        ]],
        [t(G.income, lang), [
            [t(R.revenueFy, lang), money(n(stats, 'revenue_fy'), rep)],
            [t(R.netIncomeFy, lang), money(n(stats, 'net_income_fy'), rep)],
            [t(R.ebitdaFy, lang), money(n(stats, 'ebitda_fy'), rep)],
            [t(R.fcfFy, lang), money(n(stats, 'fcf_fy'), rep)],
            [t(R.profitMargin, lang), pct(n(stats, 'profit_margin'))],
        ]],
        [t(G.balance, lang), [
            [t(R.totalAssets, lang), money(n(stats, 'total_assets'), rep)],
            [t(R.totalDebt, lang), money(n(stats, 'total_debt'), rep)],
            [t(R.bookValue, lang), money(n(stats, 'book_value'), rep)],
        ]],
        [t(G.growth, lang), [
            [t(R.revenueGrowth, lang), pct(n(stats, 'revenue_growth'))],
            [t(R.profitGrowth, lang), pct(n(stats, 'profit_growth'))],
            [t(R.epsGrowth, lang), pct(n(stats, 'eps_growth'))],
        ]],
        [t(G.perShare, lang), [
            [t(R.epsFy, lang), fmt(n(stats, 'eps_fy'), 2, lang)],
            [t(R.bvps, lang), fmt(n(stats, 'bvps'), 2, lang)],
            [t(R.dps, lang), fmt(n(stats, 'dps'), 3, lang)],
            [t(R.roe, lang), pct(n(stats, 'roe'))],
            [t(R.roa, lang), pct(n(stats, 'roa'))],
        ]],
        [t(G.technical, lang), [
            [t(R.rsi, lang), fmt(n(stats, 'rsi_14'), 1, lang)],
            [t(R.ma50, lang), n(stats, 'ma_50d') !== null ? `${cur} ${fmt(n(stats, 'ma_50d'), 2, lang)}` : null],
            [t(R.ma200, lang), n(stats, 'ma_200d') !== null ? `${cur} ${fmt(n(stats, 'ma_200d'), 2, lang)}` : null],
            [t(R.beta, lang), fmt(n(stats, 'beta_1y'), 2, lang)],
        ]],
        [t(G.shares, lang), [
            [t(R.shares, lang), n(stats, 'shares_outstanding') !== null
                ? Number(n(stats, 'shares_outstanding')).toLocaleString('en-EG', { notation: 'compact', maximumFractionDigits: 2 })
                : null],
            [t(R.float, lang), pct(n(stats, 'float_shares_percent'))],
        ]],
    ];

    return raw
        .map(([heading, rows]) => ({
            heading,
            rows: rows.filter((r): r is [string, string] => r[1] !== null),
        }))
        .filter((g) => g.rows.length > 0);
}

export async function statisticsMetadata(id: string, lang: Lang): Promise<Metadata> {
    const symbol = lang === 'ar' ? symbolFromArParam(id) : (id || '').toUpperCase();
    if (!symbol) return {};
    let ticker: Awaited<ReturnType<typeof getTicker>> = null;
    try {
        ticker = await getTicker(symbol);
    } catch {
        return {};
    }
    if (!ticker) return {};

    const name = (lang === 'ar' ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const pathEn = encodeURI(symbolTabPath(symbol, 'statistics', 'en'));
    const pathAr = encodeURI(symbolTabPath(symbol, 'statistics', 'ar', ticker.name_ar));
    const canonical = lang === 'ar' ? pathAr : pathEn;
    const title = t(STATISTICS.title(name, symbol), lang);
    let description = t(STATISTICS.description(name, symbol), lang);
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

export async function renderStatistics(id: string, lang: Lang) {
    const isAr = lang === 'ar';
    const symbol = isAr ? symbolFromArParam(id) : (id || '').toUpperCase();
    if (!symbol) notFound();

    const ticker = await getTicker(symbol);
    if (!ticker) notFound();

    if (isAr) {
        const canonicalPath = symbolTabPath(symbol, 'statistics', 'ar', ticker.name_ar);
        const target = canonicalRedirectTarget(`/ar/symbol/${id}/statistics`, canonicalPath);
        if (target) redirect(target);
    }

    const stats = await getStats(symbol).catch(() => null);
    const groups = buildGroups(stats, ticker, lang);
    const fieldCount = groups.reduce((a, g) => a + g.rows.length, 0);
    // Quality gate: too few reported figures is a thin page, not a page.
    if (fieldCount < MIN_FIELDS) notFound();

    const name = (isAr ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const leaf = isAr ? 'أهم الإحصاءات' : 'Key Statistics';
    const crumbs = symbolCrumbs(symbol, name, leaf, lang, ticker.name_ar);
    // Seasonality only exists for symbols with enough history; ask the one
    // cached set rather than probing per page.
    const hasSeasonality = (await getSeasonalitySymbols()).has(symbol);
    const siblings = symbolSiblings(symbol, 'statistics', lang, ticker.name_ar, { seasonality: hasSeasonality });
    const pagePath = encodeURI(symbolTabPath(symbol, 'statistics', lang, ticker.name_ar));

    const dataset = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: t(STATISTICS.h1(name, symbol), lang),
        description: t(STATISTICS.description(name, symbol), lang),
        url: absUrl(pagePath),
        inLanguage: isAr ? 'ar-EG' : 'en',
        creator: { '@id': `${SITE_URL}/#organization` },
        // Only figures the page actually displays are asserted.
        variableMeasured: groups.flatMap((g) =>
            g.rows.map(([label, value]) => ({ '@type': 'PropertyValue', name: label, value }))
        ),
    };

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(symbolTabPath(symbol, 'statistics', isAr ? 'en' : 'ar', ticker.name_ar))} persistLang>
            <JsonLd data={dataset} />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold tracking-tight text-main sm:text-3xl">
                {t(STATISTICS.h1(name, symbol), lang)}
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">{t(STATISTICS.lede(name, fieldCount), lang)}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {groups.map((g) => (
                    <section key={g.heading} className="rounded-xl border border-border bg-surface p-4">
                        <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">{g.heading}</h2>
                        <dl className="mt-3 divide-y divide-border/60">
                            {g.rows.map(([label, value]) => (
                                <div key={label} className="flex items-baseline justify-between gap-4 py-2">
                                    <dt className="text-sm text-muted">{label}</dt>
                                    <dd dir="ltr" className="text-sm font-bold tabular-nums text-main">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted">{t(STATISTICS.sourceNote, lang)}</p>

            <nav aria-label={t(NAV.companyPages, lang)} className="mt-8 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    {siblings.map((sib) => (
                        <li key={sib.href}>
                            <Link href={sib.href} prefetch={false} className="text-starta-teal hover:underline">
                                {sib.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </PublicPageShell>
    );
}
