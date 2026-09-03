import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
    getTicker,
    getSeasonality,
    getSeasonalitySymbols,
    seasonalityIsPublishable,
    type Seasonality,
    type SeasonalMonth,
} from '@/lib/public-data';
import { SITE_URL, symbolFromArParam, canonicalRedirectTarget, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { symbolTabPath, symbolSiblings, symbolCrumbs } from '@/lib/symbol-nav';
import { SEASONALITY, COMMON, NAV, t, type Lang } from '@/content/symbol-pages-i18n';

/**
 * /symbol/{SYM}/seasonality and /ar/symbol/{SYM}-{slug}/seasonality —
 * the monthly return profile: average return, positive share and observation
 * count for all 12 calendar months.
 *
 * Quality gate: seasonalityIsPublishable() (>= 5 years of observations) or
 * notFound(). An average built on two Januaries is noise dressed as insight,
 * and shipping it for all 318 symbols would be 318 thin pages instead of ~192
 * substantial ones.
 *
 * YMYL: every framing string in the i18n block describes past months. This page
 * must never read as a forecast or a trading signal.
 */

const pct = (n: number | null): string =>
    n === null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;

const rate = (n: number | null): string => (n === null ? '—' : `${Math.round(n)}%`);

const toneClass = (n: number | null): string =>
    n === null ? 'text-muted' : n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-600' : 'text-muted';

const monthLabel = (m: SeasonalMonth, lang: Lang): string =>
    (SEASONALITY.months[m.label] && t(SEASONALITY.months[m.label], lang)) || m.label;

/** Months carrying data, for picking extremes. */
const withData = (s: Seasonality): SeasonalMonth[] =>
    s.months.filter((m) => m.avgReturn !== null);

function extremes(s: Seasonality) {
    const rows = withData(s);
    if (rows.length === 0) return { best: null, worst: null, steadiest: null };
    const byReturn = [...rows].sort((a, b) => (b.avgReturn as number) - (a.avgReturn as number));
    const steadiest = [...rows].sort(
        (a, b) =>
            (b.positiveRate ?? 0) - (a.positiveRate ?? 0) ||
            (b.avgReturn as number) - (a.avgReturn as number)
    )[0];
    return { best: byReturn[0], worst: byReturn[byReturn.length - 1], steadiest };
}

/** Resolve the symbol + ticker + seasonality once, or bail. Shared by both exports. */
async function load(id: string, lang: Lang) {
    const symbol = lang === 'ar' ? symbolFromArParam(id) : (id || '').toUpperCase();
    if (!symbol) return null;
    const ticker = await getTicker(symbol).catch(() => null);
    if (!ticker) return null;
    const seasonality = await getSeasonality(symbol).catch(() => null);
    if (!seasonalityIsPublishable(seasonality)) return null;
    return { symbol, ticker, seasonality: seasonality as Seasonality };
}

export async function seasonalityMetadata(id: string, lang: Lang): Promise<Metadata> {
    const loaded = await load(id, lang);
    if (!loaded) return {};
    const { symbol, ticker, seasonality } = loaded;

    const name = (lang === 'ar' ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const years = seasonality.yearsCovered;
    const { best } = extremes(seasonality);

    const pathEn = symbolTabPath(symbol, 'seasonality', 'en');
    const pathAr = symbolTabPath(symbol, 'seasonality', 'ar', ticker.name_ar);
    const canonical = encodeURI(lang === 'ar' ? pathAr : pathEn);

    const title = t(SEASONALITY.title(name, symbol, years), lang);
    let description = t(
        SEASONALITY.description(name, symbol, years, best ? monthLabel(best, lang) : null),
        lang
    );
    if (description.length > 160) description = `${description.slice(0, 157).trimEnd()}…`;

    return {
        title,
        description,
        alternates: {
            canonical,
            languages: { en: encodeURI(pathEn), ar: encodeURI(pathAr), 'x-default': encodeURI(pathAr) },
        },
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

export async function renderSeasonality(id: string, lang: Lang) {
    const isAr = lang === 'ar';
    const symbol = isAr ? symbolFromArParam(id) : (id || '').toUpperCase();
    if (!symbol) notFound();

    const ticker = await getTicker(symbol);
    if (!ticker) notFound();

    // Arabic URLs carry the company slug; a bare or stale form 308s to the
    // current canonical so a renamed company self-heals every indexed URL.
    if (isAr) {
        const canonicalPath = symbolTabPath(symbol, 'seasonality', 'ar', ticker.name_ar);
        const target = canonicalRedirectTarget(`/ar/symbol/${id}/seasonality`, canonicalPath);
        if (target) redirect(target);
    }

    const seasonality = await getSeasonality(symbol);
    if (!seasonalityIsPublishable(seasonality)) notFound();

    const name = (isAr ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const years = seasonality.yearsCovered;
    const leaf = t(NAV.seasonality, lang);
    const crumbs = symbolCrumbs(symbol, name, leaf, lang, ticker.name_ar);
    const siblings = symbolSiblings(symbol, 'seasonality', lang, ticker.name_ar);

    const { best, worst, steadiest } = extremes(seasonality);
    const rows = seasonality.months;
    // Bar scale: the largest absolute average, so the tallest bar fills its half.
    const maxAbs = Math.max(
        ...withData(seasonality).map((m) => Math.abs(m.avgReturn as number)),
        0.01
    );

    const C = SEASONALITY.cols;

    const highlights: Array<{ label: string; m: SeasonalMonth | null; value: string }> = [
        { label: t(SEASONALITY.strongest, lang), m: best, value: pct(best?.avgReturn ?? null) },
        { label: t(SEASONALITY.weakest, lang), m: worst, value: pct(worst?.avgReturn ?? null) },
        {
            label: t(SEASONALITY.mostConsistent, lang),
            m: steadiest,
            value: rate(steadiest?.positiveRate ?? null),
        },
    ];

    return (
        <PublicPageShell
            lang={lang}
            altHref={encodeURI(symbolTabPath(symbol, 'seasonality', isAr ? 'en' : 'ar', ticker.name_ar))}
            persistLang
        >
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'Dataset',
                    name: t(SEASONALITY.title(name, symbol, years), lang),
                    description: t(SEASONALITY.method(years), lang),
                    creator: { '@type': 'Organization', name: 'Starta Markets', url: SITE_URL },
                    isAccessibleForFree: true,
                    temporalCoverage: `P${years}Y`,
                    variableMeasured: [
                        t(C.avg, lang),
                        t(C.rate, lang),
                        t(C.years, lang),
                    ],
                }}
            />
            <Breadcrumbs items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">
                {t(SEASONALITY.h1(name, symbol), lang)}
            </h1>
            <p className="mt-2 text-sm text-muted">{t(SEASONALITY.windowNote(years), lang)}</p>

            {best && worst && (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
                    {t(
                        SEASONALITY.summary(
                            name,
                            years,
                            monthLabel(best, lang),
                            pct(best.avgReturn),
                            monthLabel(worst, lang),
                            pct(worst.avgReturn)
                        ),
                        lang
                    )}
                </p>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {highlights.map((h) => (
                    <div key={h.label} className="rounded-xl border border-border bg-surface p-4">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted">{h.label}</div>
                        <div className="mt-1.5 text-lg font-extrabold text-main">
                            {h.m ? monthLabel(h.m, lang) : '—'}
                        </div>
                        <div className={`text-sm font-bold tabular-nums ${toneClass(h.m?.avgReturn ?? null)}`}>
                            {h.value}
                        </div>
                    </div>
                ))}
            </div>

            {/*
              Diverging bars. dir="ltr" is deliberate and must stay: the chart's
              geometry is a fixed negative-left / positive-right axis, and letting
              it mirror under RTL would silently swap the two sides. The month
              labels inside are localized text and shape correctly regardless.
            */}
            <div className="mt-6 rounded-xl border border-border bg-surface p-4" dir="ltr">
                <ul className="space-y-1.5">
                    {rows.map((m) => {
                        const v = m.avgReturn;
                        const w = v === null ? 0 : (Math.abs(v) / maxAbs) * 100;
                        return (
                            <li key={m.month} className="flex items-center gap-3">
                                <span className="w-20 shrink-0 text-xs font-semibold text-muted">
                                    {monthLabel(m, lang)}
                                </span>
                                <span className="flex h-4 flex-1 items-stretch">
                                    <span className="flex flex-1 justify-end border-e border-border/70">
                                        {v !== null && v < 0 && (
                                            <span className="rounded-s bg-red-500/70" style={{ width: `${w}%` }} />
                                        )}
                                    </span>
                                    <span className="flex flex-1 justify-start">
                                        {v !== null && v > 0 && (
                                            <span className="rounded-e bg-emerald-500/70" style={{ width: `${w}%` }} />
                                        )}
                                    </span>
                                </span>
                                <span className={`w-20 shrink-0 text-end text-xs font-bold tabular-nums ${toneClass(v)}`}>
                                    {pct(v)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[520px] text-sm">
                    <caption className="sr-only">{t(SEASONALITY.h1(name, symbol), lang)}</caption>
                    <thead>
                        <tr className={`border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`}>
                            <th scope="col" className="px-4 py-3">{t(C.month, lang)}</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t(C.avg, lang)}</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t(C.rate, lang)}</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t(C.years, lang)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((m) => {
                            const cell = `px-4 py-2.5 tabular-nums ${isAr ? 'text-left' : 'text-right'}`;
                            return (
                                <tr key={m.month} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <th scope="row" className={`px-4 py-2.5 font-semibold text-main ${isAr ? 'text-right' : 'text-left'}`}>
                                        {monthLabel(m, lang)}
                                    </th>
                                    <td className={`${cell} font-bold ${toneClass(m.avgReturn)}`}>{pct(m.avgReturn)}</td>
                                    <td className={`${cell} text-main`}>{rate(m.positiveRate)}</td>
                                    <td className={`${cell} text-muted`}>{m.years || '—'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <section className="mt-8 max-w-3xl space-y-4">
                <h2 className="text-lg font-extrabold tracking-tight text-main">
                    {isAr ? 'كيف تقرأ هذه الأرقام' : 'How to read these numbers'}
                </h2>
                <p className="text-sm leading-relaxed text-muted">{t(SEASONALITY.howToRead, lang)}</p>
                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">
                    {isAr ? 'لماذا تتكرر بعض الأنماط' : 'Why some patterns recur'}
                </h2>
                <p className="text-sm leading-relaxed text-muted">{t(SEASONALITY.whyPatterns, lang)}</p>
                <h2 className="pt-2 text-lg font-extrabold tracking-tight text-main">
                    {isAr ? 'المنهجية' : 'Method'}
                </h2>
                <p className="text-sm leading-relaxed text-muted">{t(SEASONALITY.method(years), lang)}</p>
            </section>

            <p className="mt-6 rounded-xl border border-border bg-panel/40 p-4 text-xs leading-relaxed text-muted">
                {t(SEASONALITY.disclaimer, lang)} {t(COMMON.notAdvice, lang)}
            </p>

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
