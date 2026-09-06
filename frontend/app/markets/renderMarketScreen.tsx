import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMarketLists, type Ticker } from '@/lib/public-data';
import { SITE_URL, symbolPath, symbolPathAr, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { findScreen, screenPath, MARKET_SCREENS, type MarketScreen } from '@/content/market-screens';
import { ltrNum } from '@/lib/bidi';
import { sectorAr } from '@/content/sector-names-ar';
import { HOME_PATH } from '@/lib/lang';

/**
 * MARKET SCREEN PAGES — /markets/{screen} and /ar/markets/{screen}.
 *
 * Six ranked views of the EGX, each answering a distinct query that
 * /markets/movers cannot: top gainers, top losers, most active, oversold,
 * overbought and most volatile. TradingView ships roughly thirty such screens
 * per country and stockanalysis.com twenty-four; this site had one URL for all
 * of it.
 *
 * Rankings are mechanical and the methodology is stated on the page. Nothing
 * here recommends a stock — the RSI and beta pages in particular carry an
 * explicit note that the reading describes past price behaviour.
 *
 * EGX-ONLY: getMarketLists carries the market gate in its WHERE clause.
 */

export const revalidate = 300;

type Row = Ticker & { rsi_14?: number | null; beta_1y?: number | null };

const fmtNum = (n: unknown, d = 2, lang: 'en' | 'ar' = 'en'): string =>
    typeof n === 'number' && Number.isFinite(n)
        ? n.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { maximumFractionDigits: d })
        : '—';

const fmtChange = (n: unknown): string =>
    typeof n === 'number' && Number.isFinite(n)
        ? ltrNum(`${n >= 0 ? '+' : ''}${n.toLocaleString('en-EG', { maximumFractionDigits: 2 })}%`)
        : '—';

const metricValue = (r: Row, s: MarketScreen, lang: 'en' | 'ar'): string => {
    if (s.metric === 'volume') return fmtNum(r.volume, 0, lang);
    if (s.metric === 'rsi') return fmtNum(r.rsi_14, 1, lang);
    if (s.metric === 'beta') return fmtNum(r.beta_1y, 2, lang);
    return fmtChange(r.change_percent);
};

const metricHeading = (s: MarketScreen, lang: 'en' | 'ar'): string => {
    const isAr = lang === 'ar';
    if (s.metric === 'volume') return isAr ? 'حجم التداول' : 'Volume';
    if (s.metric === 'rsi') return isAr ? 'مؤشر القوة النسبية' : 'RSI (14)';
    if (s.metric === 'beta') return isAr ? 'بيتا (سنة)' : 'Beta (1Y)';
    return isAr ? 'التغير' : 'Change';
};

export async function marketScreenMetadata(slug: string, lang: 'en' | 'ar'): Promise<Metadata> {
    const screen = findScreen(slug);
    if (!screen) return {};
    const isAr = lang === 'ar';
    const canonical = screenPath(screen, lang);
    const title = isAr ? screen.titleAr : screen.titleEn;
    const description = isAr ? screen.descAr : screen.descEn;
    return {
        title,
        description,
        alternates: {
            canonical,
            languages: {
                en: screenPath(screen, 'en'),
                ar: screenPath(screen, 'ar'),
                'x-default': screenPath(screen, 'ar'),
            },
        },
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

export async function renderMarketScreen(slug: string, lang: 'en' | 'ar') {
    const screen = findScreen(slug);
    if (!screen) notFound();
    const isAr = lang === 'ar';

    let lists: Awaited<ReturnType<typeof getMarketLists>> | null = null;
    try {
        lists = await getMarketLists(30);
    } catch (error) {
        console.error('[market-screen] query failed:', (error as Error).message);
        notFound();
    }
    const rows = (lists?.[screen.key] ?? []) as Row[];
    // Data gate: an under-populated screen is a thin page, not a page.
    if (rows.length < screen.minRows) notFound();

    const h1 = isAr ? screen.h1Ar : screen.h1En;
    const intro = isAr ? screen.introAr : screen.introEn;
    const linkFor = (r: Row) =>
        encodeURI(isAr ? symbolPathAr(r.symbol, r.name_ar) : symbolPath(r.symbol));

    // The parent is the market-data hub, not the movers page. /markets existed
    // only as a URL prefix until 2026-09-06 — both /markets and /ar/markets
    // 404'd — so these screens hung their trail off a sibling.
    const hub = isAr ? '/ar/markets' : '/markets';
    const crumbs = [
        { href: HOME_PATH, url: HOME_PATH, label: isAr ? 'الرئيسية' : 'Home' },
        { href: hub, url: hub, label: isAr ? 'بيانات السوق' : 'Market Data' },
        { label: h1 },
    ];

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: h1,
        numberOfItems: rows.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: rows.map((r, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: (isAr ? r.name_ar || r.name_en : r.name_en) || r.symbol,
            url: absUrl(isAr ? symbolPathAr(r.symbol, r.name_ar) : symbolPath(r.symbol)),
        })),
    };

    // SIBLINGS ARE DATA-GATED TOO. A screen 404s below its own minRows, and this
    // list linked every sibling unconditionally — so all twelve market pages
    // carried a live link to /markets/oversold-stocks, which is exactly such a
    // 404 today. Found by crawling the tree after the market-data hub shipped:
    // the hub applies the gate, these pages did not. Same rule, same rows.
    const siblings = MARKET_SCREENS.filter(
        (s) => s.slug !== screen.slug && (lists?.[s.key]?.length ?? 0) >= s.minRows,
    );

    return (
        <PublicPageShell lang={lang} altHref={screenPath(screen, isAr ? 'en' : 'ar')} persistLang>
            <JsonLd data={itemList} />
            <JsonLd data={breadcrumbJsonLd(crumbs.map((c) => ({ url: c.url, label: c.label })), SITE_URL)} />
            <Breadcrumbs lang={lang} items={crumbs.map((c) => ({ href: c.href, label: c.label }))} />

            <h1 className="text-2xl font-extrabold tracking-tight text-main sm:text-3xl">{h1}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">{intro}</p>
            <p className="mt-2 text-sm text-muted">
                {isAr
                    ? `${rows.length} سهماً مدرجاً في هذه القائمة، من أسهم البورصة المصرية فقط.`
                    : `${rows.length} Egyptian Exchange stocks in this list.`}
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[640px] text-sm">
                    <thead>
                        <tr className={`border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`}>
                            <th scope="col" className="px-4 py-3">#</th>
                            <th scope="col" className="px-4 py-3">{isAr ? 'الشركة' : 'Company'}</th>
                            <th scope="col" className="px-4 py-3">{isAr ? 'القطاع' : 'Sector'}</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{isAr ? 'السعر' : 'Price'}</th>
                            <th scope="col" className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{metricHeading(screen, lang)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => {
                            const chg = typeof r.change_percent === 'number' ? r.change_percent : null;
                            const tone =
                                screen.metric === 'change'
                                    ? chg === null
                                        ? 'text-main'
                                        : chg >= 0
                                          ? 'text-emerald-700'
                                          : 'text-red-600'
                                    : 'text-main';
                            return (
                                <tr key={r.symbol} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                    <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                                    <td className="px-4 py-2.5">
                                        <Link href={linkFor(r)} prefetch={false} className="font-semibold text-main hover:text-starta-darkTeal">
                                            {(isAr ? r.name_ar || r.name_en : r.name_en) || r.symbol}
                                        </Link>
                                        <span className="ms-2 text-xs text-muted" dir="ltr">{r.symbol}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-muted">{(isAr ? sectorAr(r.sector_name) : r.sector_name) || '—'}</td>
                                    <td className={`px-4 py-2.5 tabular-nums text-main ${isAr ? 'text-left' : 'text-right'}`}>
                                        {fmtNum(r.last_price, 2, lang)} <span className="text-xs text-muted">{r.currency || 'EGP'}</span>
                                    </td>
                                    <td className={`px-4 py-2.5 font-bold tabular-nums ${tone} ${isAr ? 'text-left' : 'text-right'}`}>
                                        {metricValue(r, screen, lang)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted">
                {isAr
                    ? 'الترتيب آلي بالكامل من بيانات البورصة المصرية عبر TradingView ولا يمثل توصية. الأداء السابق لا يضمن النتائج المستقبلية.'
                    : 'Rankings are computed mechanically from Egyptian Exchange data via TradingView and are not recommendations. Past performance does not guarantee future results.'}
            </p>

            <nav aria-label={isAr ? 'شاشات السوق' : 'Market screens'} className="mt-8 border-t border-border pt-5">
                <ul className="flex flex-wrap gap-2">
                    {siblings.map((s) => (
                        <li key={s.slug}>
                            <Link
                                href={screenPath(s, lang)}
                                prefetch={false}
                                className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-darkTeal"
                            >
                                {isAr ? s.h1Ar : s.h1En}
                            </Link>
                        </li>
                    ))}
                    <li>
                        <Link
                            href={isAr ? '/ar/markets/movers' : '/markets/movers'}
                            prefetch={false}
                            className="inline-block rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-main transition-colors hover:border-starta-teal hover:text-starta-darkTeal"
                        >
                            {isAr ? 'حركة السوق اليوم' : 'EGX movers today'}
                        </Link>
                    </li>
                </ul>
            </nav>
        </PublicPageShell>
    );
}
