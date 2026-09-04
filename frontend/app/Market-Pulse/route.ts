import { renderStaticHub, esc, jsonLdScript, hreflangLinks, langSeedScript } from '@/lib/static-hub';
import { getEgx30Index } from '@/lib/public-data';
import { SITE_URL } from '@/lib/seo';

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
 * KNOWN, DELIBERATE LIMITATION — the page's <h1> is `COMI`, the live ticker
 * placeholder, so the heading changes with whatever symbol was last selected.
 * That is a real SEO defect. Fixing it means demoting that <h1> to <h2> and
 * promoting the banner's exchange name, and measurement showed the swap
 * changes the rendered heading (no CSS pins a size for `.display`, so the tag
 * default applies: 32px/h1 vs 24px/h2). The designed page's appearance is not
 * negotiable, so this stays until the fix can be made visually neutral in the
 * stylesheet. Do not "fix" it by editing the tag.
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
    },
    ar: {
        title: 'البورصة المصرية اليوم — مؤشر EGX 30 والأسهم لحظة بلحظة | Starta Markets',
        desc: 'تابع اتجاه البورصة المصرية ومستوى مؤشر EGX 30 وأسعار الأسهم المقيدة والرسوم البيانية وأخبار السوق لحظة بلحظة.',
        home: 'الرئيسية',
        crumb: 'نبض السوق',
        asOf: (v: string) => `مؤشر EGX 30 حتى ${v} (توقيت القاهرة)`,
        locale: 'ar-EG',
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
        replacements: isAr
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
            : [],
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
