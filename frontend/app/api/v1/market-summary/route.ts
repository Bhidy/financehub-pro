import { NextResponse } from "next/server";
import { db } from "@/lib/db-server";

export const dynamic = "force-dynamic";

const EGX_TIME_ZONE = "Africa/Cairo";
const EGX_OPEN_MINUTES = 10 * 60;
const EGX_CLOSE_MINUTES = 14 * 60 + 30;
const EGX_TRADING_WEEKDAYS = new Set(["Sun", "Mon", "Tue", "Wed", "Thu"]);

const toNumber = (value: unknown, fallback = 0): number => {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const getEgxClock = (referenceDate: Date = new Date()): { weekday: string; minutes: number } => {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: EGX_TIME_ZONE,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(referenceDate);

    const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const weekday = getPart("weekday");
    const hour = Number(getPart("hour"));
    const minute = Number(getPart("minute"));

    const minutes = Number.isFinite(hour) && Number.isFinite(minute)
        ? hour * 60 + minute
        : -1;

    return { weekday, minutes };
};

const resolveEgxMarketStatus = (): "OPEN" | "CLOSED" => {
    const clock = getEgxClock();
    if (!EGX_TRADING_WEEKDAYS.has(clock.weekday)) return "CLOSED";
    if (clock.minutes < EGX_OPEN_MINUTES || clock.minutes >= EGX_CLOSE_MINUTES) return "CLOSED";
    return "OPEN";
};

export async function GET() {
    try {
        const [summaryResult, breadthResult, indexResult] = await Promise.all([
            db.query(`
                SELECT
                    COUNT(*) as total_stocks,
                    SUM(CASE WHEN change_percent > 0 THEN 1 ELSE 0 END) as advancing,
                    SUM(CASE WHEN change_percent < 0 THEN 1 ELSE 0 END) as declining,
                    SUM(CASE WHEN change_percent = 0 THEN 1 ELSE 0 END) as unchanged,
                    ROUND(SUM(volume)::numeric, 0) as total_volume,
                    ROUND(SUM(last_price * volume)::numeric, 0) as total_turnover
                FROM market_tickers
                WHERE last_price IS NOT NULL
                  AND market_code = 'EGX'
            `),
            // Breadth computed LIVE from market_tickers (TradingView). Was reading the
            // stale `market_breadth` table (frozen since 2025-12). new_highs/lows use
            // 52w bounds where TradingView provides them.
            db.query(`
                SELECT
                    SUM(CASE WHEN change_percent > 0 THEN volume ELSE 0 END) as advance_volume,
                    SUM(CASE WHEN change_percent < 0 THEN volume ELSE 0 END) as decline_volume,
                    COUNT(CASE WHEN high_52w IS NOT NULL AND last_price >= high_52w * 0.98 THEN 1 END) as new_highs,
                    COUNT(CASE WHEN low_52w IS NOT NULL AND last_price <= low_52w * 1.02 THEN 1 END) as new_lows
                FROM market_tickers
                WHERE last_price IS NOT NULL AND market_code = 'EGX'
            `),
            db.query(`
                SELECT
                    ROUND(SUM(last_price * volume) / NULLIF(SUM(volume), 0), 2) as weighted_price,
                    ROUND(SUM(change * volume) / NULLIF(SUM(volume), 0), 3) as weighted_change,
                    ROUND(SUM(change_percent * volume) / NULLIF(SUM(volume), 0), 2) as weighted_change_percent
                FROM market_tickers
                WHERE last_price IS NOT NULL
                  AND volume > 0
                  AND market_code = 'EGX'
            `),
        ]);

        const stats = summaryResult.rows[0] || {};
        const breadth = breadthResult.rows[0] || {};
        const index = indexResult.rows[0] || {};

        return NextResponse.json({
            market_status: resolveEgxMarketStatus(),
            market_code: "EGX",
            market_name: "Egyptian Exchange",

            index_value: toNumber(index.weighted_price),
            index_change: toNumber(index.weighted_change),
            index_change_percent: toNumber(index.weighted_change_percent),

            total_stocks: toNumber(stats.total_stocks),
            advancing: toNumber(stats.advancing),
            declining: toNumber(stats.declining),
            unchanged: toNumber(stats.unchanged),

            total_volume: toNumber(stats.total_volume),
            total_turnover: toNumber(stats.total_turnover),

            new_highs: toNumber(breadth.new_highs),
            new_lows: toNumber(breadth.new_lows),
            advance_volume: toNumber(breadth.advance_volume),
            decline_volume: toNumber(breadth.decline_volume),

            last_updated: new Date().toISOString(),
            timezone: EGX_TIME_ZONE,
            session: {
                opens_at: "10:00",
                closes_at: "14:30",
                days: ["Sun", "Mon", "Tue", "Wed", "Thu"],
            },
        });
    } catch (error: any) {
        console.error("[API /market-summary ERROR]", error?.message || error);
        return NextResponse.json({ error: error?.message || "market summary failed" }, { status: 500 });
    }
}
