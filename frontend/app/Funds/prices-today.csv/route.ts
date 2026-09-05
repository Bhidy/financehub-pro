import { getAllFundsRanked } from '@/lib/public-data';
import { categoryOfFund } from '@/content/fund-categories';
import { fundCurrency, rankingEligibility } from '@/lib/fund-stats';
import { fundPath, SITE_URL } from '@/lib/seo';

/**
 * /Funds/prices-today.csv — the price list as a DOWNLOADABLE, CITABLE table.
 *
 * The roadmap's authority layer asks every first-party dataset for a stable
 * URL, a methodology, a source list, an update date and a downloadable table.
 * The price page had all but the last. This is the same rows the page renders
 * (getAllFundsRanked — one universe rule, one return engine), one line per
 * fund, with the as-of date per fund and the return source stated per row, so
 * a citing page can say exactly what it quotes. Header lines document the
 * provenance; nothing in the body is estimated.
 */
export const dynamic = 'force-dynamic';

const csv = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const num = (r: Record<string, unknown>, k: string): string => (typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? String(r[k]) : '');
const iso = (v: unknown): string => {
    const t = v ? Date.parse(String(v)) : NaN;
    return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : '';
};

export async function GET() {
    let funds: Array<Record<string, unknown>> = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[prices-today.csv] query failed:', (error as Error).message);
        return new Response('# data temporarily unavailable\n', { status: 503, headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store' } });
    }
    const asOf = funds.reduce<string>((mx, f) => (iso(f.last_nav_date) > mx ? iso(f.last_nav_date) : mx), '');
    const header = [
        `# Starta Markets — Egyptian mutual fund prices (${funds.length} publicly offered funds with a current NAV)`,
        `# as_of=${asOf} generated=${new Date().toISOString()} source=fund-manager disclosures via Mubasher price files and EIMA reports; returns computed by Starta (fund_metrics.py) — see ${SITE_URL}/methodology`,
        `# universe: NAV within 180 days and >=2 NAV points; returns_source=computed means the audited engine produced the figure, legacy means a disclosed figure the engine could not recompute; blank = not available (never 0)`,
        `# licence: free to cite with attribution to Starta Markets and the fund manager; not investment advice`,
        ['fund_id', 'name_en', 'name_ar', 'category', 'currency', 'latest_nav', 'nav_as_of', 'return_ytd_pct', 'return_1y_pct', 'return_3y_pct', 'returns_source', 'ranking_eligible', 'management_fee_pct', 'manager', 'url'].join(','),
    ];
    const rows = funds.map((f) => {
        const cat = categoryOfFund(f);
        const e = rankingEligibility(f);
        return [
            csv(f.fund_id),
            csv(f.fund_name_en),
            csv(f.fund_name),
            csv(cat?.key ?? ''),
            csv(fundCurrency(f)),
            num(f, 'latest_nav'),
            iso(f.last_nav_date),
            num(f, 'return_ytd'),
            num(f, 'return_1y'),
            num(f, 'return_3y'),
            csv(f.returns_source ?? ''),
            e.eligible ? 'true' : `false:${e.reason}`,
            num(f, 'fee_management'),
            csv((f.manager_name_en as string) || (f.issuer_en as string) || ''),
            csv(SITE_URL + fundPath(f.fund_id as number, f.fund_name_en as string | null, f.fund_name as string | null, 'en')),
        ].join(',');
    });
    // UTF-8 BOM so Excel opens the Arabic names correctly.
    const body = '﻿' + header.concat(rows).join('\n') + '\n';
    return new Response(body, {
        headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': `inline; filename="starta-egypt-fund-prices-${asOf || 'latest'}.csv"`,
            'cache-control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=3600',
            'x-robots-tag': 'noindex',
        },
    });
}
