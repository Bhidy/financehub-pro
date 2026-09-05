import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTicker, getTechnicals, getSeasonalitySymbols} from '@/lib/public-data';
import { SITE_URL, symbolFromArParam, canonicalRedirectTarget, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { symbolTabPath, symbolSiblings, symbolCrumbs } from '@/lib/symbol-nav';
import { TECHNICALS, COMMON, NAV, t, type Lang } from '@/content/symbol-pages-i18n';

/**
 * /symbol/{SYM}/technicals and /ar/symbol/{SYM}-{slug}/technicals —
 * server-rendered multi-timeframe technical analysis (RSI, MACD, ADX, moving
 * averages and TradingView-style buy/sell signals).
 *
 * Bilingual: the Arabic company tree previously had ONE page type against
 * English's eleven, on a site whose default language is Arabic. Copy lives in
 * content/symbol-pages-i18n.ts so the two languages cannot drift.
 *
 * Quality gate: no technicals rows means notFound(), never a placeholder
 * table — 297 of 318 EGX symbols have them, and the other 21 must not ship an
 * empty page.
 */

type TechnicalRow = Record<string, unknown>;

function num(row: TechnicalRow, key: string): number | null {
    const v = row[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}

function str(row: TechnicalRow, key: string): string | null {
    const v = row[key];
    if (typeof v !== 'string') return null;
    const tr = v.trim();
    return tr.length > 0 ? tr : null;
}

function toDate(v: unknown): Date | null {
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    if (typeof v === 'string') {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

type Signal = 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';

/** TradingView recommend_* score (-1..1) → signal bucket. Language-independent. */
function signalKey(r: number | null): Signal {
    if (r === null) return 'Neutral';
    if (r > 0.5) return 'Strong Buy';
    if (r > 0.1) return 'Buy';
    if (r < -0.5) return 'Strong Sell';
    if (r < -0.1) return 'Sell';
    return 'Neutral';
}

const signalClass = (k: Signal): string =>
    k === 'Strong Buy' || k === 'Buy' ? 'text-emerald-700' : k === 'Strong Sell' || k === 'Sell' ? 'text-red-600' : 'text-muted';

const signalText = (k: Signal, lang: Lang): string => t(TECHNICALS.signals[k], lang);

// Western digits in both languages, matching the rest of the site's numeric
// treatment on financial figures.
const fmt2 = (n: number | null): string =>
    n === null ? '—' : n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const timeframeText = (row: TechnicalRow, lang: Lang): string => {
    const tf = str(row, 'timeframe');
    return (tf && TECHNICALS.timeframes[tf] && t(TECHNICALS.timeframes[tf], lang)) || tf || '—';
};

export async function technicalsMetadata(id: string, lang: Lang): Promise<Metadata> {
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
    const pathEn = symbolTabPath(symbol, 'technicals', 'en');
    const pathAr = symbolTabPath(symbol, 'technicals', 'ar', ticker.name_ar);
    const canonical = encodeURI(lang === 'ar' ? pathAr : pathEn);

    const rows = await getTechnicals(symbol).catch(() => []);
    const daily = rows.find((r) => str(r, 'timeframe') === '1D');
    const signal = daily ? signalText(signalKey(num(daily, 'recommend_all')), lang) : null;

    const title = t(TECHNICALS.title(name, symbol), lang);
    let description = t(TECHNICALS.description(name, symbol, signal), lang);
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

export async function renderTechnicals(id: string, lang: Lang) {
    const isAr = lang === 'ar';
    const symbol = isAr ? symbolFromArParam(id) : (id || '').toUpperCase();
    if (!symbol) notFound();

    const ticker = await getTicker(symbol);
    if (!ticker) notFound();

    // Arabic URLs carry the company slug; a bare or stale form 308s to the
    // current canonical so a renamed company self-heals every indexed URL.
    if (isAr) {
        const canonicalPath = symbolTabPath(symbol, 'technicals', 'ar', ticker.name_ar);
        const target = canonicalRedirectTarget(`/ar/symbol/${id}/technicals`, canonicalPath);
        if (target) permanentRedirect(target);
    }

    const rows = await getTechnicals(symbol);
    if (rows.length === 0) notFound();

    const name = (isAr ? ticker.name_ar || ticker.name_en : ticker.name_en) || symbol;
    const leaf = t(NAV.technicals, lang);
    const crumbs = symbolCrumbs(symbol, name, leaf, lang, ticker.name_ar);
    // Seasonality only exists for symbols with enough history; ask the one
    // cached set rather than probing per page.
    const hasSeasonality = (await getSeasonalitySymbols()).has(symbol);
    const siblings = symbolSiblings(symbol, 'technicals', lang, ticker.name_ar, { seasonality: hasSeasonality });

    const asOf = rows.reduce<Date | null>((mx, r) => {
        const d = toDate(r['updated_at']);
        return d && (!mx || d > mx) ? d : mx;
    }, null);
    const asOfHuman = asOf
        ? asOf.toLocaleString(isAr ? 'ar-EG' : 'en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo',
          })
        : null;

    const daily = rows.find((r) => str(r, 'timeframe') === '1D');
    const dailySignal = daily ? signalText(signalKey(num(daily, 'recommend_all')), lang) : null;
    const faq = TECHNICALS.faq(name, symbol, dailySignal);

    const C = TECHNICALS.cols;

    return (
        <PublicPageShell lang={lang} altHref={encodeURI(symbolTabPath(symbol, 'technicals', isAr ? 'en' : 'ar', ticker.name_ar))} persistLang>
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
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
            <Breadcrumbs lang={lang} items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">{t(TECHNICALS.h1(name, symbol), lang)}</h1>

            <ul className="mt-4 space-y-1.5">
                {rows.map((r, i) => {
                    const k = signalKey(num(r, 'recommend_all'));
                    return (
                        <li key={str(r, 'timeframe') || i} className="text-sm text-muted">
                            <span className="font-semibold text-main">{timeframeText(r, lang)}:</span>{' '}
                            <span className={`font-bold ${signalClass(k)}`}>{signalText(k, lang)}</span>
                        </li>
                    );
                })}
            </ul>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[760px] text-sm">
                    <thead>
                        <tr className={`border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`}>
                            <th scope="col" className="px-4 py-3">{t(C.timeframe, lang)}</th>
                            <th scope="col" className="px-4 py-3">{t(C.overall, lang)}</th>
                            <th scope="col" className="px-4 py-3">{t(C.ma, lang)}</th>
                            <th scope="col" className="px-4 py-3">{t(C.osc, lang)}</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>RSI(14)</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>MACD</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>ADX</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>SMA50</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>SMA200</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => {
                            const overall = signalKey(num(r, 'recommend_all'));
                            const ma = signalKey(num(r, 'recommend_ma'));
                            const osc = signalKey(num(r, 'recommend_other'));
                            const cell = `px-4 py-2.5 tabular-nums text-main ${isAr ? 'text-left' : 'text-right'}`;
                            return (
                                <tr key={str(r, 'timeframe') || i} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <th scope="row" className={`px-4 py-2.5 font-semibold text-main ${isAr ? 'text-right' : 'text-left'}`}>
                                        {timeframeText(r, lang)}
                                    </th>
                                    <td className={`px-4 py-2.5 font-bold ${signalClass(overall)}`}>{signalText(overall, lang)}</td>
                                    <td className={`px-4 py-2.5 font-semibold ${signalClass(ma)}`}>{signalText(ma, lang)}</td>
                                    <td className={`px-4 py-2.5 font-semibold ${signalClass(osc)}`}>{signalText(osc, lang)}</td>
                                    <td className={cell}>{fmt2(num(r, 'rsi'))}</td>
                                    <td className={cell}>{fmt2(num(r, 'macd_macd'))}</td>
                                    <td className={cell}>{fmt2(num(r, 'adx'))}</td>
                                    <td className={cell}>{fmt2(num(r, 'sma50'))}</td>
                                    <td className={cell}>{fmt2(num(r, 'sma200'))}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs text-muted">
                {asOfHuman && <>{t(COMMON.asOf, lang)} {asOfHuman} {t(COMMON.cairoTime, lang)}. </>}
                {t(TECHNICALS.computedFrom, lang)}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{t(TECHNICALS.explainer, lang)}</p>

            <section className="mt-8">
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

            <p className="mt-4 text-xs text-muted">{t(TECHNICALS.disclaimer, lang)}</p>

            <nav aria-label={t(NAV.companyPages, lang)} className="mt-8 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                    {siblings.map((sib) => (
                        <li key={sib.href}>
                            <Link href={sib.href} prefetch={false} className="text-starta-darkTeal hover:underline">
                                {sib.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </PublicPageShell>
    );
}
