import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// TradingView multi-timeframe technicals for an EGX symbol.
// Returns one object per timeframe (1D / 60 / 240 / 1W) plus a summary.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const result = await db.query(
            `SELECT timeframe, rsi, macd_macd, macd_signal, stoch_k, stoch_d,
                    cci20, adx, mom, recommend_all, recommend_ma, recommend_other,
                    ema50, ema200, sma50, sma200, updated_at
             FROM egx_technicals
             WHERE UPPER(symbol) = $1
             ORDER BY CASE timeframe
                 WHEN '60' THEN 1 WHEN '240' THEN 2 WHEN '1D' THEN 3 WHEN '1W' THEN 4 ELSE 5 END`,
            [symbol.toUpperCase()]
        );

        const label = (r: number | null) =>
            r == null ? 'neutral'
            : r >= 0.5 ? 'strong_buy' : r >= 0.1 ? 'buy'
            : r <= -0.5 ? 'strong_sell' : r <= -0.1 ? 'sell' : 'neutral';

        const timeframes = result.rows.map((r) => ({
            ...r,
            summary: label(r.recommend_all),
            ma_signal: label(r.recommend_ma),
            osc_signal: label(r.recommend_other),
        }));

        const daily = timeframes.find((t) => t.timeframe === '1D') || timeframes[0] || null;
        return NextResponse.json({
            symbol: symbol.toUpperCase(),
            source: 'tradingview',
            daily_summary: daily ? daily.summary : null,
            timeframes,
        });
    } catch (error) {
        console.error('Error fetching EGX technicals:', error);
        return NextResponse.json({ error: 'Failed to fetch technicals' }, { status: 500 });
    }
}
