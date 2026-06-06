import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// TradingView-style Seasonals for an EGX symbol: average % return per calendar
// month, computed SERVER-SIDE from our own ohlc_data (daily closes). No external
// dependency -> always fresh, never-fail (as long as ohlc_data is fresh, which
// the existing chart pipeline + freshness monitor already guarantee).
//
// Method (matches TradingView's monthly seasonality):
//   1. month_close = last close of each calendar month
//   2. monthly return = (month_close - prev_month_close) / prev_month_close
//   3. group by calendar month (1..12): average return + positive rate + N years
// Default window = last 10 years (TradingView's window); ?years=N to override,
// ?years=0 for all history. Returns 12 rows (Jan..Dec) + metadata.

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    try {
        const { symbol } = await params;
        const sym = symbol.toUpperCase().replace('.CA', '');
        const yearsParam = Number(new URL(request.url).searchParams.get('years') ?? '10');
        const windowYears = Number.isFinite(yearsParam) && yearsParam > 0 ? Math.floor(yearsParam) : 0;

        // Window filter: last N years, or all history when windowYears === 0.
        const dateFilter = windowYears > 0
            ? `AND date::date >= (CURRENT_DATE - INTERVAL '${windowYears} years')`
            : '';

        const result = await db.query(
            `WITH monthly AS (
                 SELECT date_trunc('month', date::date) AS m,
                        (array_agg(close ORDER BY date DESC))[1] AS month_close
                 FROM ohlc_data
                 WHERE (symbol = $1 OR symbol = $2) AND close > 0 ${dateFilter}
                 GROUP BY 1
             ),
             ret AS (
                 SELECT m, month_close, LAG(month_close) OVER (ORDER BY m) AS prev_close
                 FROM monthly
             )
             SELECT EXTRACT(MONTH FROM m)::int AS month,
                    ROUND(AVG((month_close - prev_close) / prev_close * 100)::numeric, 2) AS avg_return,
                    ROUND((AVG(CASE WHEN month_close > prev_close THEN 1.0 ELSE 0.0 END) * 100)::numeric, 0) AS positive_rate,
                    ROUND(MAX(ABS((month_close - prev_close) / prev_close * 100))::numeric, 2) AS best_abs,
                    COUNT(*) AS years
             FROM ret
             WHERE prev_close IS NOT NULL AND prev_close > 0
             GROUP BY 1
             ORDER BY 1`,
            [sym, `${sym}.CA`]
        );

        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const byMonth = new Map<number, any>();
        for (const r of result.rows) byMonth.set(Number(r.month), r);

        const months = MONTHS.map((label, i) => {
            const r = byMonth.get(i + 1);
            return {
                month: i + 1,
                label,
                avg_return: r ? Number(r.avg_return) : null,
                positive_rate: r ? Number(r.positive_rate) : null,
                years: r ? Number(r.years) : 0,
            };
        });

        const withData = months.filter((m) => m.avg_return != null);
        const maxYears = months.reduce((mx, m) => Math.max(mx, m.years), 0);

        return NextResponse.json({
            symbol: sym,
            source: 'starta (computed from ohlc_data)',
            window_years: windowYears || 'all',
            years_covered: maxYears,
            available: withData.length >= 6 && maxYears >= 2,
            months,
        });
    } catch (error: any) {
        console.error('[API] /egx/seasonals error:', error?.message);
        return NextResponse.json({ error: 'Failed to compute seasonals' }, { status: 500 });
    }
}
