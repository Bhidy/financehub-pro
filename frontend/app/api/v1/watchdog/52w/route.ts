import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export const dynamic = 'force-dynamic';

// 52-week-range sanity cross-check — content monitoring, not liveness.
//
// The June-2026 audit found Yahoo's EGX quotes frozen for 23 months while every
// freshness timestamp stayed green: liveness monitoring cannot catch a vendor
// serving stale CONTENT. This route compares TradingView's 52W bounds against
// bounds derived from our own candle store for three liquid symbols; a real
// divergence means one of the two sources has gone bad.
//
// TOLERANCE = 7% (not 1–2%): the candle series is split/dividend-adjusted while
// TV's bounds are raw — COMI structurally diverges ~5% on the low bound. A
// tighter tolerance would page on adjustment semantics, not actual breakage.
const SYMBOLS = ['COMI', 'SWDY', 'TMGH'];
const TOLERANCE = 0.07;
const MIN_BARS = 200;

interface SymbolCheck {
    symbol: string;
    tv_high: number | null;
    tv_low: number | null;
    candle_high: number | null;
    candle_low: number | null;
    bars: number;
    high_diff_pct: number | null;
    low_diff_pct: number | null;
    ok: boolean;
    detail: string;
}

async function tvBounds(symbol: string): Promise<{ high: number | null; low: number | null }> {
    const url = `https://scanner.tradingview.com/symbol?symbol=${encodeURIComponent(`EGX:${symbol}`)}&fields=price_52_week_high,price_52_week_low&no_404=true`;
    const res = await fetch(url, {
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (StartaMarkets data service)' },
        signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`TV ${res.status}`);
    const data = await res.json();
    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);
    return { high: num(data.price_52_week_high), low: num(data.price_52_week_low) };
}

export async function GET() {
    const checks: SymbolCheck[] = await Promise.all(SYMBOLS.map(async (symbol): Promise<SymbolCheck> => {
        const base: SymbolCheck = {
            symbol, tv_high: null, tv_low: null, candle_high: null, candle_low: null,
            bars: 0, high_diff_pct: null, low_diff_pct: null, ok: true, detail: '',
        };
        try {
            const [tv, candle] = await Promise.all([
                tvBounds(symbol),
                db.query(
                    `SELECT max(high)::float AS hi, min(low)::float AS lo, count(*)::int AS n
                     FROM ohlc_data
                     WHERE symbol = $1 AND date >= (CURRENT_DATE - INTERVAL '370 days')`,
                    [symbol],
                ),
            ]);
            const row = candle.rows[0] || {};
            base.tv_high = tv.high;
            base.tv_low = tv.low;
            base.candle_high = row.hi ?? null;
            base.candle_low = row.lo ?? null;
            base.bars = row.n ?? 0;

            if (base.bars < MIN_BARS) {
                // Thin candle history is its own defect, but the freshness route
                // owns candle coverage — don't double-page from here.
                base.detail = `only ${base.bars} bars in window (< ${MIN_BARS}) — comparison skipped`;
                return base;
            }
            if (base.tv_high == null || base.tv_low == null || !base.candle_high || !base.candle_low) {
                base.ok = false;
                base.detail = 'missing bounds from one side';
                return base;
            }
            base.high_diff_pct = Math.abs(base.tv_high - base.candle_high) / base.tv_high * 100;
            base.low_diff_pct = Math.abs(base.tv_low - base.candle_low) / base.tv_low * 100;
            base.ok = base.high_diff_pct <= TOLERANCE * 100 && base.low_diff_pct <= TOLERANCE * 100;
            base.detail = base.ok ? 'within tolerance' : `divergence beyond ${TOLERANCE * 100}%`;
        } catch (e: any) {
            base.ok = false;
            base.detail = `check failed: ${e?.message || e}`;
        }
        return base;
    }));

    const failing = checks.filter((c) => !c.ok);
    const ok = failing.length === 0;
    const body: Record<string, any> = {
        ok,
        checked_at: new Date().toISOString(),
        tolerance_pct: TOLERANCE * 100,
        checks,
    };
    if (!ok) {
        // Stable keyword for external keyword monitors (same pattern as
        // /api/v1/health/freshness's DATA_STALE).
        body.status_keyword = 'FIFTYTWOW_MISMATCH';
        body.message = `FIFTYTWOW_MISMATCH: ${failing.map((c) => c.symbol).join(', ')}`;
    }
    return NextResponse.json(body, {
        status: ok ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
    });
}
