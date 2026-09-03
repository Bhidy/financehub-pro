import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { getTicker } from '@/lib/public-data';

/**
 * Per-company Open Graph card carrying the live quote. Shared links to a
 * company page then show the price and the day's move rather than a logo.
 */
export const alt = 'EGX company — Starta Markets';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function SymbolOgImage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const symbol = (id || '').toUpperCase();
    let ticker: Awaited<ReturnType<typeof getTicker>> = null;
    try {
        ticker = await getTicker(symbol);
    } catch {
        // fall through to the generic card
    }

    if (!ticker) {
        return renderOgCard({
            eyebrow: 'EGX · LISTED COMPANY',
            title: symbol || 'Egyptian Exchange',
            subtitle: 'Price, financials and news',
            footnote: 'startamarkets.com',
        });
    }

    const currency = ticker.currency || 'EGP';
    const price =
        typeof ticker.last_price === 'number' && Number.isFinite(ticker.last_price)
            ? `${currency} ${ticker.last_price.toLocaleString('en-EG', { maximumFractionDigits: 2 })}`
            : null;
    const chg =
        typeof ticker.change_percent === 'number' && Number.isFinite(ticker.change_percent)
            ? `${ticker.change_percent >= 0 ? '+' : ''}${ticker.change_percent.toFixed(2)}%`
            : null;
    const mcap =
        typeof ticker.market_cap === 'number' && Number.isFinite(ticker.market_cap)
            ? `EGP ${(ticker.market_cap / 1e9).toFixed(2)}B`
            : null;

    const stats = [
        price ? { label: 'Last price', value: price } : null,
        chg ? { label: 'Change', value: chg, tone: chg.startsWith('-') ? ('down' as const) : ('up' as const) } : null,
        mcap ? { label: 'Market cap', value: mcap } : null,
    ].filter(Boolean) as Array<{ label: string; value: string; tone?: 'up' | 'down' }>;

    return renderOgCard({
        eyebrow: `EGX · ${ticker.sector_name || 'LISTED COMPANY'}`.toUpperCase(),
        title: ticker.name_en || symbol,
        subtitle: symbol,
        stats,
        footnote: 'startamarkets.com',
    });
}
