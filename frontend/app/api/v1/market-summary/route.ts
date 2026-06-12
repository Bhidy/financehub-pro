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

// Fetch the EGX30 index level from the TV scanner. We first attempt to read
// it from market_tickers (populated by the TV harvester cycle), and fall back
// to calling TradingView directly. Returns null on any failure so callers can
// gracefully handle missing index data.
async function fetchEgx30Index(): Promise<{ value: number; change: number; changePct: number } | null> {
    try {
        const resp = await fetch("https://scanner.tradingview.com/egypt/scan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (compatible; startamarkets/1.0)",
                "Origin": "https://www.tradingview.com",
            },
            body: JSON.stringify({
                columns: ["close", "change", "change_abs"],
                symbols: { tickers: ["EGX:EGX30"] },
            }),
            signal: AbortSignal.timeout(8000),
        });
        if (!resp.ok) return null;
        const payload = await resp.json() as { data?: Array<{ d: number[] }> };
        const row = payload.data?.[0]?.d;
        if (!row || row.length < 3) return null;
        return { value: row[0], changePct: row[1], change: row[2] };
    } catch {
        return null;
    }
}

export async function GET() {
    try {
        const [summaryResult, breadthResult, egx30Stored, egx30Live] = await Promise.all([
            db.query(`
                SELECT
                    COUNT(*) as total_stocks,
                    SUM(CASE WHEN change_percent > 0 THEN 1 ELSE 0 END) as advancing,
                    SUM(CASE WHEN change_percent < 0 THEN 1 ELSE 0 END) as declining,
                    SUM(CASE WHEN change_percent = 0 THEN 1 ELSE 0 END) as unchanged,
                    ROUND(SUM(volume)::numeric, 0) as total_volume,
                    ROUND(SUM(last_price * volume)::numeric, 0) as total_turnover,
                    MAX(updated_at) as data_as_of
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
            // EGX30 stored by TV harvester cycle (symbol='EGX30', market_code='EGX')
            db.query(`
                SELECT last_price, change, change_percent
                FROM market_tickers
                WHERE symbol = 'EGX30' AND market_code = 'EGX'
                LIMIT 1
            `),
            // Fallback: fetch EGX30 live from TradingView scanner (non-fatal if fails)
            fetchEgx30Index().catch(() => null),
        ]);

        const stats = summaryResult.rows[0] || {};
        const breadth = breadthResult.rows[0] || {};

        // EGX30 index — prefer DB row (harvester-populated), fall back to live TV fetch
        const storedEgx30 = egx30Stored.rows[0];
        const egx30 = storedEgx30
            ? {
                value: toNumber(storedEgx30.last_price),
                change: toNumber(storedEgx30.change),
                changePct: toNumber(storedEgx30.change_percent),
            }
            : egx30Live;

        const cacheHeaders = { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' };
        return NextResponse.json({
            market_status: resolveEgxMarketStatus(),
            market_code: "EGX",
            market_name: "Egyptian Exchange",

            index_value: egx30?.value ?? null,
            index_change: egx30?.change ?? null,
            index_change_percent: egx30?.changePct ?? null,

            total_stocks: toNumber(stats.total_stocks),
            advancing: toNumber(stats.advancing),
            declining: toNumber(stats.declining),
            unchanged: toNumber(stats.unchanged),

            total_volume: toNumber(stats.total_volume),
            total_turnover: toNumber(stats.total_turnover),
            // Σ(volume × last close) — an approximation, not exchange-reported traded value
            turnover_basis: "close_price_approximation",

            new_highs: toNumber(breadth.new_highs),
            new_lows: toNumber(breadth.new_lows),
            advance_volume: toNumber(breadth.advance_volume),
            decline_volume: toNumber(breadth.decline_volume),

            // The data's own as-of time (newest market_tickers write), NOT the
            // request time — turnover/volume describe that session, not "now".
            data_as_of: stats.data_as_of ?? null,
            last_updated: stats.data_as_of ?? new Date().toISOString(),
            timezone: EGX_TIME_ZONE,
            session: {
                opens_at: "10:00",
                closes_at: "14:30",
                days: ["Sun", "Mon", "Tue", "Wed", "Thu"],
            },
        }, { headers: cacheHeaders });
    } catch (error: any) {
        console.error("[API /market-summary ERROR]", error?.message || error);
        return NextResponse.json({ error: error?.message || "market summary failed" }, { status: 500 });
    }
}
