import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Per-symbol TradingView snapshot for the Market Pulse company overview.
// ONLY price-denominated or unitless fields are exposed here: the TV per-symbol
// endpoint returns monetary fundamentals (market cap, revenue) converted to USD,
// so those must come from /api/v1/egx/statistics (stock_stats_view, EGP) instead.
const FIELDS = [
    'price_52_week_high',
    'price_52_week_low',
    'average_volume_10d_calc',
    'number_of_employees',
    'industry',
    'close',
] as const;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    const sym = symbol?.trim().toUpperCase();
    if (!sym || !/^[A-Z0-9]{1,20}$/.test(sym)) {
        return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }

    const url = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(`EGX:${sym}`)}&fields=${FIELDS.join(',')}&no_404=true`;

    try {
        const res = await fetch(url, {
            cache: 'no-store',
            headers: { 'User-Agent': 'Mozilla/5.0 (StartaMarkets data service)' },
        });
        if (!res.ok) {
            return NextResponse.json(
                { error: `TradingView responded ${res.status}` },
                { status: 502 }
            );
        }
        const data = await res.json();
        return NextResponse.json(data, {
            headers: {
                // Edge-cache: ranges/volume move slowly; 10 min fresh, 30 min stale-while-revalidate
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: "TradingView fetch failed" },  // detail stays server-side (2026-08-15 audit)
            { status: 502 }
        );
    }
}
