import { NextRequest, NextResponse } from 'next/server';
import { getSeasonality } from '@/lib/public-data';

// TradingView-style Seasonals for an EGX symbol: average % return per calendar
// month, computed SERVER-SIDE from our own ohlc_data (daily closes). No external
// dependency -> always fresh, never-fail (as long as ohlc_data is fresh, which
// the existing chart pipeline + freshness monitor already guarantee).
//
// The computation itself lives in lib/public-data#getSeasonality so that this
// endpoint and the /symbol/[id]/seasonality pages can never disagree about what
// a month's average return is. Default window = 10 years; ?years=N to override,
// ?years=0 for all history.

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const yearsParam = Number(new URL(request.url).searchParams.get('years') ?? '10');
        const s = await getSeasonality(symbol, yearsParam);

        return NextResponse.json({
            symbol: s.symbol,
            source: 'starta (computed from ohlc_data)',
            window_years: s.windowYears || 'all',
            years_covered: s.yearsCovered,
            available: s.available,
            months: s.months.map((m) => ({
                month: m.month,
                label: m.label,
                avg_return: m.avgReturn,
                positive_rate: m.positiveRate,
                years: m.years,
            })),
        });
    } catch (error: any) {
        console.error('[API] /egx/seasonals error:', error?.message);
        return NextResponse.json({ error: 'Failed to compute seasonals' }, { status: 500 });
    }
}
