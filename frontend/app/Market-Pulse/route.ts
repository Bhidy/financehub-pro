import { renderStaticHub, esc, jsonLdScript } from '@/lib/static-hub';
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

const fmt = (n: number | null | undefined, d = 2): string =>
    n === null || n === undefined || !Number.isFinite(n) ? '--' : n.toLocaleString('en-EG', { maximumFractionDigits: d, minimumFractionDigits: d });

export async function GET() {
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
        ? ts.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' })
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
                  ? [{ id: 'mpUpdated', html: `EGX 30 as of ${esc(asOf)} (Cairo)`, mode: 'insert' as const }]
                  : []),
          ];

    const dataset =
        value === null
            ? null
            : {
                  '@context': 'https://schema.org',
                  '@type': 'Dataset',
                  name: 'EGX 30 index level',
                  description: `Current level of the EGX 30, the Egyptian Exchange benchmark index${asOf ? `, as of ${asOf} Cairo time` : ''}.`,
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
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Market Pulse' },
        ],
    };

    return renderStaticHub({
        file: 'market-pulse.html',
        injections,
        head: (dataset ? jsonLdScript(dataset) : '') + jsonLdScript(breadcrumb),
        // Intraday index data; 5 minutes matches the upstream refresh cadence.
        cacheSeconds: 300,
    });
}
