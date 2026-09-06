import type { Metadata } from 'next';
import Link from 'next/link';
import { getEgx30Index, getAllTickers, getMarketLists, getDividendCalendar, type Ticker } from '@/lib/public-data';
import { rankByMarketCap, rankByDividendYield, rankByLowestPe, rankedAsOf, fmtMarketCap, fmtYield, fmtPeRatio } from '@/lib/market-rankings';
import { MARKET_SCREENS, screenPath, type MarketScreen } from '@/content/market-screens';
import { HUB_ENTRIES, HUB_GROUPS, HUB_BROWSE, HUB_COPY, type HubGroupKey } from '@/content/market-hub';
import { SITE_URL, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { localizedHref } from '@/lib/localized-href';
import { HOME_PATH } from '@/lib/lang';
import { ltrNum } from '@/lib/bidi';

/**
 * /markets and /ar/markets — THE MARKET-DATA HUB.
 *
 * Both URLs returned a hard 404 while twelve market pages sat in the sitemap
 * with no parent between them and the homepage. This is that parent.
 *
 * IT IS NOT A MENU. A page whose whole content is a list of links to other
 * pages is a table of contents, and a table of contents is not worth a visit.
 * Every row states the answer its destination is about — today's biggest riser
 * and by how much, the largest company and its capitalisation, the highest
 * yield on the exchange — read from the SAME ranking functions the destination
 * pages use (lib/market-rankings.ts), so the hub can never advertise a leader
 * the page it links to does not show.
 *
 * A screen is listed only when it will actually render: the six dynamic screens
 * 404 below their own minRows threshold, and linking into that would be this
 * hub manufacturing dead ends on its way to fixing them.
 */

export const revalidate = 300;

export function marketsHubMetadata(lang: 'en' | 'ar'): Metadata {
    const isAr = lang === 'ar';
    const canonical = isAr ? '/ar/markets' : '/markets';
    const title = isAr
        ? 'بيانات البورصة المصرية — المؤشر والأكثر ارتفاعًا والقيمة السوقية والتوزيعات'
        : 'EGX Market Data — Index, Movers, Market Caps, Dividends & Valuation';
    const description = isAr
        ? 'كل بيانات البورصة المصرية في مكان واحد: مؤشر EGX 30، والأسهم الأكثر ارتفاعًا وانخفاضًا ونشاطًا، وأكبر الشركات بالقيمة السوقية، وأعلى عائد توزيعات، وأقل مكرر ربحية، ومواعيد التوزيعات.'
        : 'Every Egyptian Exchange market view in one place: the EGX 30 index, today’s gainers, losers and most active, the largest companies by market cap, highest dividend yields, lowest P/E ratios and the dividend calendar.';
    return {
        title: { absolute: title },
        description,
        alternates: { canonical, languages: { en: '/markets', ar: '/ar/markets', 'x-default': '/ar/markets' } },
        openGraph: {
            ...OG_DEFAULTS,
            type: 'website',
            title: `${title} | Starta Markets`,
            description,
            url: canonical,
            locale: isAr ? 'ar_EG' : 'en_US',
        },
    };
}

/** One row of the hub: a destination plus the figure it is about. */
type Row = {
    href: string;
    title: string;
    blurb: string;
    /** The destination's own headline figure, already formatted. */
    lead: string | null;
    /** Symbol or label the figure belongs to. */
    leadFor: string | null;
    /** Sign of the figure, when it is a price move. */
    tone: 'up' | 'down' | 'flat';
};

const fmtPct = (n: unknown): string =>
    typeof n === 'number' && Number.isFinite(n)
        ? ltrNum(`${n >= 0 ? '+' : ''}${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%`)
        : '—';

const fmtPlain = (n: unknown, d = 2): string =>
    typeof n === 'number' && Number.isFinite(n)
        ? ltrNum(n.toLocaleString('en-EG', { maximumFractionDigits: d }))
        : '—';

const nameOf = (t: Ticker | undefined, lang: 'en' | 'ar'): string | null =>
    t ? String((lang === 'ar' ? t.name_ar || t.name_en : t.name_en) || t.symbol || '') || null : null;

/** The extra column each dynamic screen ranks by, formatted for the hub. */
const screenLead = (s: MarketScreen, r: Ticker | undefined): string | null => {
    if (!r) return null;
    if (s.metric === 'volume') return fmtPlain(r.volume, 0);
    if (s.metric === 'rsi') return fmtPlain((r as Ticker & { rsi_14?: number | null }).rsi_14, 1);
    if (s.metric === 'beta') return fmtPlain((r as Ticker & { beta_1y?: number | null }).beta_1y, 2);
    return fmtPct(r.change_percent);
};

export async function renderMarketsHub(lang: 'en' | 'ar') {
    const isAr = lang === 'ar';
    const t = HUB_COPY[lang];

    const [egx30, tickers, lists, dividends] = await Promise.all([
        getEgx30Index().catch(() => null),
        getAllTickers().catch(() => [] as Ticker[]),
        getMarketLists(30).catch(() => null),
        getDividendCalendar().catch(() => ({ upcoming: [], recent: [] })),
    ]);

    // The SAME functions the destination pages call, so the leader named here
    // is the leader that page's first row shows.
    const byCap = rankByMarketCap(tickers);
    const byYield = rankByDividendYield(tickers);
    const byPe = rankByLowestPe(tickers);
    const asOf = rankedAsOf(byCap.length ? byCap : tickers);
    const asOfHuman = asOf
        ? new Date(asOf).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', {
              day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo',
          })
        : null;

    const leadByPath: Record<string, Pick<Row, 'lead' | 'leadFor' | 'tone'>> = {
        '/markets/movers': {
            lead: fmtPct(lists?.gainers?.[0]?.change_percent),
            leadFor: nameOf(lists?.gainers?.[0], lang),
            tone: (lists?.gainers?.[0]?.change_percent ?? 0) >= 0 ? 'up' : 'down',
        },
        '/markets/largest-companies': {
            lead: byCap[0] ? ltrNum(fmtMarketCap(byCap[0].market_cap, lang)) : null,
            leadFor: nameOf(byCap[0], lang),
            tone: 'flat',
        },
        '/markets/top-dividend-yield': {
            lead: byYield[0] ? ltrNum(fmtYield(byYield[0].dividend_yield)) : null,
            leadFor: nameOf(byYield[0], lang),
            tone: 'flat',
        },
        '/markets/lowest-pe-stocks': {
            lead: byPe[0] ? ltrNum(fmtPeRatio(byPe[0].pe_ratio)) : null,
            leadFor: nameOf(byPe[0], lang),
            tone: 'flat',
        },
        '/markets/dividend-calendar': {
            lead: dividends.upcoming.length ? ltrNum(String(dividends.upcoming.length)) : null,
            leadFor: dividends.upcoming.length ? (isAr ? 'توزيع قادم' : 'upcoming ex-dates') : null,
            tone: 'flat',
        },
    };

    const rows: Record<HubGroupKey, Row[]> = { session: [], value: [], technical: [] };

    for (const e of HUB_ENTRIES) {
        const copy = e[lang];
        rows[e.group].push({
            href: localizedHref(e.path, lang),
            title: copy.title,
            blurb: copy.blurb,
            ...(leadByPath[e.path] ?? { lead: null, leadFor: null, tone: 'flat' as const }),
        });
    }

    // A dynamic screen 404s below its own minRows, so it is listed only when it
    // will render. A hub that links its own dead ends is worse than no hub.
    for (const s of MARKET_SCREENS) {
        const list = lists?.[s.key] ?? [];
        if (list.length < s.minRows) continue;
        const group: HubGroupKey = s.metric === 'rsi' || s.metric === 'beta' ? 'technical' : 'session';
        rows[group].push({
            href: screenPath(s, lang),
            title: isAr ? s.h1Ar : s.h1En,
            blurb: isAr ? s.descAr : s.descEn,
            lead: screenLead(s, list[0]),
            leadFor: nameOf(list[0], lang),
            tone: s.metric === 'change' ? ((list[0]?.change_percent ?? 0) >= 0 ? 'up' : 'down') : 'flat',
        });
    }

    const allRows = ([] as Row[]).concat(rows.session, rows.value, rows.technical);
    const upPct = egx30?.changePercent ?? null;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: t.h1,
        numberOfItems: allRows.length + 1,
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: t.indexLabel, url: SITE_URL + localizedHref('/markets/egx30', lang) },
            ...allRows.map((r, i) => ({ '@type': 'ListItem', position: i + 2, name: r.title, url: SITE_URL + r.href })),
        ],
    };

    const crumbs = [{ href: HOME_PATH, label: isAr ? 'الرئيسية' : 'Home' }, { label: t.crumb }];

    return (
        <PublicPageShell lang={lang} altHref={isAr ? '/markets' : '/ar/markets'}>
            <JsonLd data={itemList} />
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: t.h1,
                    url: absUrl(isAr ? '/ar/markets' : '/markets'),
                    inLanguage: lang,
                    isPartOf: { '@id': `${SITE_URL}/#website` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd([{ url: HOME_PATH, label: isAr ? 'الرئيسية' : 'Home' }, { label: t.crumb }], SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">{t.h1}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                {isAr
                    ? `${ltrNum(String(allRows.length + 1))} صفحة بيانات للبورصة المصرية: قيمة المؤشر، وحركة الجلسة، وترتيب الشركات بالقيمة السوقية وعائد التوزيعات ومكرر الربحية، ومواعيد الأرباح. كل صفحة تُبنى آليًا من البيانات نفسها.`
                    : `${allRows.length + 1} data views of the Egyptian Exchange: the index level, today’s session, companies ranked by size, income and valuation, and the dividend calendar. Every page is built mechanically from the same market data.`}
            </p>

            {/* The market's headline number gets the page's one large surface —
                it is the figure every other page on this hub is relative to. */}
            {egx30?.value != null ? (
                <Link
                    href={localizedHref('/markets/egx30', lang)}
                    prefetch={false}
                    className="mt-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 rounded-2xl border border-border bg-panel/40 px-6 py-5 transition-colors hover:border-starta-teal/50"
                >
                    <span className="flex flex-col gap-1">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">{t.indexLabel}</span>
                        <span className="text-sm text-muted">{t.indexLink}</span>
                    </span>
                    <span className="flex items-baseline gap-3">
                        <span className="font-mono text-3xl font-bold text-main sm:text-4xl">
                            {ltrNum(egx30.value.toLocaleString('en-EG', { maximumFractionDigits: 2 }))}
                        </span>
                        <span
                            className={`font-mono text-base font-semibold ${
                                upPct === null ? 'text-muted' : upPct >= 0 ? 'text-emerald-700' : 'text-red-600'
                            }`}
                        >
                            {fmtPct(upPct)}
                        </span>
                    </span>
                </Link>
            ) : (
                <p className="mt-7 rounded-2xl border border-border bg-panel/40 px-6 py-5 text-sm text-muted">{t.empty}</p>
            )}

            {(Object.keys(HUB_GROUPS) as HubGroupKey[]).map((key) =>
                rows[key].length === 0 ? null : (
                    <section key={key} className="mt-10" aria-labelledby={`hub-${key}`}>
                        <h2 id={`hub-${key}`} className="text-lg font-bold text-main">
                            {HUB_GROUPS[key][lang]}
                        </h2>
                        <ul className="mt-3 divide-y divide-border/60 overflow-hidden rounded-xl border border-border bg-surface">
                            {rows[key].map((r) => (
                                <li key={r.href}>
                                    <Link
                                        href={r.href}
                                        prefetch={false}
                                        className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4 transition-colors hover:bg-panel/40"
                                    >
                                        <span className="flex min-w-[16rem] flex-1 flex-col gap-1">
                                            <span className="font-semibold text-main">{r.title}</span>
                                            <span className="text-sm leading-relaxed text-muted">{r.blurb}</span>
                                        </span>
                                        {r.lead && (
                                            <span className="flex items-baseline gap-2 whitespace-nowrap">
                                                {r.leadFor && <span className="max-w-[11rem] truncate text-xs text-muted sm:max-w-[20rem] lg:max-w-[26rem]">{r.leadFor}</span>}
                                                <span
                                                    className={`font-mono text-sm font-semibold ${
                                                        r.tone === 'up' ? 'text-emerald-700' : r.tone === 'down' ? 'text-red-600' : 'text-main'
                                                    }`}
                                                >
                                                    {r.lead}
                                                </span>
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ),
            )}

            <section className="mt-10" aria-labelledby="hub-browse">
                <h2 id="hub-browse" className="text-lg font-bold text-main">{t.browse}</h2>
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                    {HUB_BROWSE.map((b) => (
                        <li key={b.path}>
                            <Link
                                href={localizedHref(b.path, lang)}
                                prefetch={false}
                                className="inline-block rounded-full border border-border bg-surface px-3.5 py-1.5 font-semibold text-main transition-colors hover:border-starta-teal/50 hover:text-starta-darkTeal"
                            >
                                {b[lang]}
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <p className="mt-10 max-w-3xl text-sm leading-relaxed text-muted">
                {t.methodology}
                {asOfHuman ? ` ${t.asOf(asOfHuman)}` : ''}
            </p>
        </PublicPageShell>
    );
}
