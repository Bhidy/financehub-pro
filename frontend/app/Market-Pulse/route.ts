import { renderStaticHub, esc, escUrl, jsonLdScript, hreflangLinks, langSeedScript } from '@/lib/static-hub';
import { getEgx30Index, getMarketLists, getAllTickers, getLatestNews } from '@/lib/public-data';
import { SITE_URL, symbolPath, symbolPathAr } from '@/lib/seo';
import { canonicalNewsPath, newsLang, sanitizeNewsText } from '@/lib/news-display';

/**
 * /Market-Pulse — the designed watchlist + charting tool.
 *
 * This one is deliberately treated DIFFERENTLY from the other three hubs. It
 * is a tool, not a content page: its body is a personal watchlist, a chart and
 * a symbol drawer, all driven by localStorage and live quotes. Padding it with
 * prose to raise a word count would be writing for a crawler rather than for a
 * user, so it stays lean. What it gets instead is the thing it actually has
 * and was not exposing: real, quotable index data and honest markup.
 *
 * Fixed here:
 *  - the EGX 30 quote rendered as `--` to every crawler; the real value is now
 *    in the HTML, with an as-of timestamp.
 *  - zero structured data; it now carries the same Dataset shape /markets/egx30
 *    uses, so the index value is machine-readable for answer engines.
 *
 * THE LIVE-TICKER <h1> IS FIXED (2026-09-04). The note here used to say the swap
 * was blocked because "no CSS pins a size for `.display`, so the tag default
 * applies: 32px/h1 vs 24px/h2". That was wrong: the size never came from
 * `.display` at all — `market-pulse.css` line 520 pinned `.ticker-row h1` at
 * 1.42rem. Widening that selector to `h1, h2` made the swap pixel-identical, so
 * `#selectedSymbol` is now an <h2> and the document gets a real, stable <h1>
 * describing the page instead of whatever symbol was last selected.
 *
 * That <h1> is visually hidden (`.mp-a11y-title`) because the designed layout
 * has no slot for a title and its appearance is not negotiable. It is an
 * accessibility fix first: a screen reader announced this page as "COMI".
 */
export const dynamic = 'force-dynamic';

const PATH_EN = '/Market-Pulse';
const PATH_AR = '/ar/Market-Pulse';

const COPY = {
    en: {
        title: 'Market Pulse | Starta Markets',
        desc: 'Track EGX market direction, listed companies, charts and market news through Starta Market Pulse.',
        home: 'Home',
        crumb: 'Market Pulse',
        asOf: (v: string) => `EGX 30 as of ${v} (Cairo)`,
        locale: 'en-GB',
        h1: 'Egyptian Exchange market pulse — EGX 30 index, live share prices and watchlist',
    },
    ar: {
        title: 'البورصة المصرية اليوم — مؤشر EGX 30 والأسهم لحظة بلحظة | Starta Markets',
        desc: 'تابع اتجاه البورصة المصرية ومستوى مؤشر EGX 30 وأسعار الأسهم المقيدة والرسوم البيانية وأخبار السوق لحظة بلحظة.',
        home: 'الرئيسية',
        crumb: 'نبض السوق',
        asOf: (v: string) => `مؤشر EGX 30 حتى ${v} (توقيت القاهرة)`,
        locale: 'ar-EG',
        h1: 'نبض البورصة المصرية — مؤشر EGX 30 وأسعار الأسهم المباشرة وقائمة المتابعة',
    },
} as const;

const fmt = (n: number | null | undefined, d = 2): string =>
    n === null || n === undefined || !Number.isFinite(n) ? '--' : n.toLocaleString('en-EG', { maximumFractionDigits: d, minimumFractionDigits: d });

/**
 * Shared by both language routes. /ar/Market-Pulse used to 404 outright, so
 * the Arabic tree had no market URL at all on a site that defaults to Arabic —
 * the same gap that left /ar/Funds and /ar/Learn without a hub.
 */
export async function renderMarketPulse(lang: 'en' | 'ar') {
    const t = COPY[lang];
    const isAr = lang === 'ar';
    let egx30: Record<string, unknown> | null = null;
    try {
        egx30 = (await getEgx30Index()) as unknown as Record<string, unknown>;
    } catch (error) {
        console.error('[hub:market-pulse] EGX30 query failed:', (error as Error).message);
    }

    const value = typeof egx30?.value === 'number' ? (egx30.value as number) : null;
    const changePct = typeof egx30?.changePercent === 'number' ? (egx30.changePercent as number) : null;
    const tsRaw = egx30?.timestamp ? Date.parse(String(egx30.timestamp)) : NaN;
    const ts = Number.isFinite(tsRaw) ? new Date(tsRaw) : null;

    const deltaText = changePct === null ? '--' : `${changePct >= 0 ? '+' : ''}${fmt(changePct)}%`;
    const asOf = ts
        ? ts.toLocaleString(t.locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' })
        : '';

    // Only fill the placeholders when there is a real number behind them.
    // Leaving `--` in place is honest; writing a fabricated quote is not.
    const injections = value === null
        ? []
        : [
              { id: 'indexValue', html: esc(fmt(value)), mode: 'replace' as const },
              { id: 'indexChange', html: esc(deltaText), mode: 'replace' as const },
              { id: 'overviewIndex', html: esc(fmt(value)), mode: 'replace' as const },
              { id: 'overviewDelta', html: esc(deltaText), mode: 'replace' as const },
              ...(asOf
                  ? [{ id: 'mpUpdated', html: esc(t.asOf(asOf)), mode: 'insert' as const }]
                  : []),
          ];

    // THE PAGE'S OWN CONTENT, PRE-RENDERED. The movers panel, the market tape,
    // the breadth line and the news panel are all filled by market-pulse.js
    // from the same tables read here; to a crawler the page was 165 words with
    // no company link at all — a HIGH thin-content finding on every audit
    // since the money pages were built. This renders the same rows, from the
    // same data, in the same markup the script writes on load (which then
    // overwrites them). No prose is added for a crawler's sake.
    try {
        const [lists, tickers, news] = await Promise.all([
            getMarketLists(10),
            getAllTickers(),
            getLatestNews(120),
        ]);
        const pct = (v: number | null | undefined) =>
            v === null || v === undefined || !Number.isFinite(v) ? '--' : `${v >= 0 ? '+' : ''}${fmt(v)}%`;
        const cls = (v: number | null | undefined) => (typeof v === 'number' && v < 0 ? 'negative' : 'positive');
        const href = (sym: string, nameAr: string | null | undefined) =>
            escUrl(encodeURI(isAr ? symbolPathAr(sym, nameAr) : symbolPath(sym)));
        const row = (x: { symbol: string; last_price: number | null; change_percent: number | null; name_ar?: string | null }) =>
            `<a class="mover-row" href="${href(x.symbol, x.name_ar)}">` +
            `<span style="display:flex;align-items:center;gap:.48rem;font-weight:600;color:var(--ink)">${esc(x.symbol)}</span>` +
            `<span class="tabular">${esc(fmt(x.last_price))}</span>` +
            `<strong class="tabular ${cls(x.change_percent)}">${esc(pct(x.change_percent))}</strong></a>`;
        const movers = [...lists.gainers.slice(0, 5), ...lists.losers.slice(0, 5)];
        if (movers.length) injections.push({ id: 'moverRows', html: movers.map(row).join(''), mode: 'insert' as const });

        const tape = lists.active.filter((x) => !/^EG[A-Z0-9]{10}$/.test(x.symbol)).slice(0, 9);
        if (tape.length) {
            injections.push({
                id: 'tickerTape',
                html: tape
                    .map(
                        (x) =>
                            `<span class="tape-entry"><strong><a href="${href(x.symbol, x.name_ar)}">${esc(x.symbol)}</a></strong>${esc(fmt(x.last_price))} <span class="${cls(x.change_percent)}">${esc(pct(x.change_percent))}</span></span>`
                    )
                    .join(''),
                mode: 'insert' as const,
            });
        }

        const adv = tickers.filter((x) => typeof x.change_percent === 'number' && x.change_percent > 0).length;
        const dec = tickers.filter((x) => typeof x.change_percent === 'number' && x.change_percent < 0).length;
        if (tickers.length) {
            injections.push({ id: 'totalStocks', html: esc(tickers.length.toLocaleString('en-EG')), mode: 'replace' as const });
            injections.push({ id: 'breadthCount', html: esc(`${adv.toLocaleString('en-EG')} / ${dec.toLocaleString('en-EG')}`), mode: 'replace' as const });
            const reading = isAr
                ? `${adv} سهماً مرتفعاً مقابل ${dec} منخفضاً من أصل ${tickers.length} ورقة مقيدة${value !== null ? `؛ مؤشر EGX 30 عند ${fmt(value)} (${pct(changePct)})` : ''}${asOf ? ` — حتى ${asOf}` : ''}.`
                : `${adv} advancers against ${dec} decliners across ${tickers.length} listed securities${value !== null ? `; EGX 30 at ${fmt(value)} (${pct(changePct)})` : ''}${asOf ? ` — as of ${asOf}` : ''}.`;
            injections.push({ id: 'marketReading', html: esc(reading), mode: 'insert' as const });
        }

        const items = news.filter((a) => newsLang(a) === lang).slice(0, 3);
        if (items.length) {
            injections.push({
                id: 'newsRows',
                html: items
                    .map((a) => {
                        const headline = sanitizeNewsText(a.headline);
                        const when = a.published_at ? new Date(a.published_at).toLocaleDateString(t.locale, { day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' }) : '';
                        return `<a class="news-card" href="${escUrl(encodeURI(canonicalNewsPath(a.id, a.headline, a.source_section)))}"><div class="news-copy"><h3>${esc(headline)}</h3><time>${esc(when)}</time></div></a>`;
                    })
                    .join(''),
                mode: 'insert' as const,
            });
        }
    } catch (error) {
        // A failed panel read leaves the shell as it was — never a broken page.
        console.error('[hub:market-pulse] panel pre-render failed:', (error as Error).message);
    }

    const dataset =
        value === null
            ? null
            : {
                  '@context': 'https://schema.org',
                  '@type': 'Dataset',
                  name: 'EGX 30 index level',
                  description: isAr
                      ? `المستوى الحالي لمؤشر EGX 30، المؤشر الرئيسي للبورصة المصرية${asOf ? `، حتى ${asOf} بتوقيت القاهرة` : ''}.`
                      : `Current level of the EGX 30, the Egyptian Exchange benchmark index${asOf ? `, as of ${asOf} Cairo time` : ''}.`,
                  isPartOf: { '@id': `${SITE_URL}/#website` },
                  creator: { '@id': `${SITE_URL}/#organization` },
                  ...(ts ? { dateModified: ts.toISOString() } : {}),
                  variableMeasured: [
                      { '@type': 'PropertyValue', name: 'EGX 30 index level', value, unitText: 'points' },
                      ...(changePct === null
                          ? []
                          : [{ '@type': 'PropertyValue', name: 'Daily change', value: changePct, unitText: 'PERCENT' }]),
                  ],
              };

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: t.home, item: `${SITE_URL}${isAr ? '/ar' : '/'}` },
            { '@type': 'ListItem', position: 2, name: t.crumb },
        ],
    };

    return renderStaticHub({
        file: 'market-pulse.html',
        lang,
        replacements: [
            // The real page heading. Anchored on a single-line, distinctive
            // element rather than on indentation — matching hand-formatted HTML
            // by exact bytes is how a replacement silently no-ops.
            {
                find: '<div class="grid-backdrop"></div>',
                replace: `<h1 class="mp-a11y-title">${esc(t.h1)}</h1><div class="grid-backdrop"></div>`,
            },
            ...(isAr
            ? [
                  { find: `<title>${COPY.en.title}</title>`, replace: `<title>${esc(t.title)}</title>` },
                  {
                      find: `<link rel="canonical" href="https://startamarkets.com${PATH_EN}">`,
                      replace: `<link rel="canonical" href="https://startamarkets.com${PATH_AR}">`,
                  },
                  {
                      find: `<meta property="og:url" content="https://startamarkets.com${PATH_EN}">`,
                      replace: `<meta property="og:url" content="https://startamarkets.com${PATH_AR}">`,
                  },
                  {
                      find: `<meta property="og:title" content="${COPY.en.title}">`,
                      replace: `<meta property="og:title" content="${esc(t.title)}">`,
                  },
                  { find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' },
                  {
                      find: `<meta name="description" content="${COPY.en.desc}">`,
                      replace: `<meta name="description" content="${esc(t.desc)}">`,
                  },
              ]
            : []),
        ],
        injections,
        head:
            (isAr ? langSeedScript('ar') : '') +
            hreflangLinks(PATH_EN, PATH_AR) +
            (dataset ? jsonLdScript(dataset) : '') +
            jsonLdScript(breadcrumb),
        // Intraday index data; 5 minutes matches the upstream refresh cadence.
        cacheSeconds: 300,
    });
}

export async function GET() {
    return renderMarketPulse('en');
}
