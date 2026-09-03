import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { getFund } from '@/lib/public-data';
import { idFromParam } from '@/lib/seo';

/**
 * Per-fund Open Graph card: the fund's own NAV and trailing return, not a
 * generic logo. A shared link then carries the figure someone is deciding on.
 * Every value is real or omitted — a card never shows a placeholder number.
 */
export const alt = 'Fund profile — Starta Markets';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const pct = (v: unknown): string | null =>
    typeof v === 'number' && Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : null;

export default async function FundOgImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const fundId = idFromParam(id);
    let fund: Record<string, unknown> | null = null;
    try {
        fund = fundId ? ((await getFund(fundId)) as unknown as Record<string, unknown>) : null;
    } catch {
        // fall through to the generic card
    }

    if (!fund) {
        return renderOgCard({
            eyebrow: 'EGX · MUTUAL FUND',
            title: 'Egyptian mutual funds',
            subtitle: 'NAVs, returns and fees',
            footnote: 'startamarkets.com',
        });
    }

    const name = (fund.fund_name_en as string) || (fund.fund_name as string) || `Fund ${fundId}`;
    const manager = (fund.manager_name_en as string) || (fund.issuer_en as string) || undefined;
    const nav = typeof fund.latest_nav === 'number' && Number.isFinite(fund.latest_nav) ? fund.latest_nav : null;
    const currency = (fund.currency as string) || 'EGP';
    const r1y = pct(fund.return_1y);
    const ytd = pct(fund.return_ytd);

    const stats = [
        nav !== null
            ? { label: 'Latest NAV', value: `${currency} ${nav.toLocaleString('en-EG', { maximumFractionDigits: 4 })}` }
            : null,
        r1y ? { label: '1-year return', value: r1y, tone: r1y.startsWith('-') ? ('down' as const) : ('up' as const) } : null,
        ytd ? { label: 'Year to date', value: ytd, tone: ytd.startsWith('-') ? ('down' as const) : ('up' as const) } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; tone?: 'up' | 'down' }>;

    const navDate = fund.last_nav_date ? new Date(String(fund.last_nav_date)) : null;

    return renderOgCard({
        eyebrow: 'EGX · MUTUAL FUND',
        title: name,
        subtitle: manager,
        stats,
        footnote:
            navDate && Number.isFinite(navDate.getTime())
                ? `NAV as of ${navDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'startamarkets.com',
    });
}
