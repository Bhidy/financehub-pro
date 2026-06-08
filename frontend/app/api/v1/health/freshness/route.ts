import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/health/freshness  — L2 OFF-BOX data-freshness check
 * ================================================================
 * This is the centerpiece of defense-in-depth for the data platform. It runs on
 * Vercel and queries Supabase DIRECTLY (Vercel → Supabase), so it has ZERO
 * dependency on the Hetzner box. The on-box watchdog (scripts/pipeline_watchdog.py)
 * lives ON the box, so a TOTAL Hetzner outage (power, network, the runner dying)
 * is exactly the failure it structurally CANNOT report. This route can — it asks
 * the database "what is the newest row?" from a completely independent vantage.
 *
 * It computes REAL per-dataset freshness against TRADING-CALENDAR-AWARE SLAs
 * (the same thresholds + Sun–Thu EGX session logic as pipeline_watchdog.py
 * DATASETS, ported here so the two checks agree on what "stale" means), and
 * returns machine-readable JSON plus an HTTP status an external monitor can
 * alert on:
 *
 *   HTTP 200  → ok:true  (all CRITICAL datasets fresh)
 *   HTTP 503  → ok:false (a CRITICAL dataset is stale) + body contains "DATA_STALE"
 *   HTTP 500  → the check itself failed (DB unreachable) + body contains "CHECK_FAILED"
 *
 * The 503 + keyword design lets a free external uptime monitor (UptimeRobot)
 * alert on status-code OR keyword:
 *   https://uptimerobot.com → New Monitor → Keyword Monitor
 *     URL:     https://startamarkets.com/api/v1/health/freshness
 *     Keyword: DATA_STALE   → alert when keyword EXISTS  (and/or status != 200)
 *     Interval: 5 minutes
 * Because UptimeRobot polls this route, the high-frequency cadence does NOT need
 * a Vercel cron (Hobby crons are daily-only) — the monitor IS the scheduler.
 *
 * Response shape:
 *   { ok, checked_at, datasets: { <name>: { newest, age_minutes, sla, stale, critical, detail } }, stale: [names] }
 *
 * CRITICAL datasets (prices, charts) drive the 503 — they are the live-trading
 * core. Non-critical datasets (news, funds, technicals) still report `stale` per
 * dataset so the JSON tells the full story, but a delayed funds NAV alone must not
 * flap the external monitor / page anyone.
 */

// --------------------------------------------------------------------------- //
// EGX trading calendar — ported verbatim from scripts/pipeline_watchdog.py so
// the off-box check and the on-box watchdog agree on "is the market open / has a
// session closed". EGX trades Sun–Thu; Fri/Sat closed. Session window in UTC is
// kept WIDE [06:00, 13:15] to cover the harvester's `*/15 6-13` price cron and
// both EET/EEST mappings — being slightly wide only extends "prices expected
// fresh" a little, which is safe. MAINTAIN the holiday list yearly (a missing
// holiday at worst causes one benign extra alert on a closed day).
// JS getUTCDay(): Sun=0, Mon=1 … Fri=5, Sat=6  →  weekend = {Fri, Sat} = {5, 6}.
// (NOTE: this differs from Python weekday() Mon=0…Sat=5; the SET below is the
//  JS-correct Fri/Sat, so the calendar matches the watchdog despite the offset.)
// --------------------------------------------------------------------------- //
const WEEKEND_UTC_DAYS = new Set([5, 6]); // Fri, Sat (JS getUTCDay)
const EGX_HOLIDAYS = new Set<string>([
    // 2026 — best-effort; keep in lockstep with pipeline_watchdog.py EGX_HOLIDAYS.
    '2026-01-07', '2026-01-25', '2026-04-12', '2026-04-13', '2026-04-25',
    '2026-05-01', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-30',
    '2026-07-23', '2026-08-25', '2026-08-26', '2026-10-06',
]);
const SESSION_OPEN_MIN = 6 * 60;        // 06:00 UTC, in minutes-from-midnight
const SESSION_CLOSE_MIN = 13 * 60 + 15; // 13:15 UTC

/** UTC calendar date as 'YYYY-MM-DD'. */
function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** Is the given UTC date an EGX trading day (Sun–Thu, not a holiday)? */
function isTradingDay(d: Date): boolean {
    return !WEEKEND_UTC_DAYS.has(d.getUTCDay()) && !EGX_HOLIDAYS.has(isoDate(d));
}

/** Is the market open right now (trading day AND within the UTC session window)? */
function isMarketOpen(now: Date): boolean {
    if (!isTradingDay(now)) return false;
    const minOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
    return minOfDay >= SESSION_OPEN_MIN && minOfDay <= SESSION_CLOSE_MIN;
}

/** Midnight-UTC Date for a given UTC date (drops time-of-day). */
function utcMidnight(d: Date): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** UTC Date at this session's close (13:15) on the given date. */
function sessionClose(d: Date): Date {
    return new Date(Date.UTC(
        d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
        13, 15, 0, 0,
    ));
}

/**
 * Most recent trading day whose close (13:15 UTC) is <= now, as 'YYYY-MM-DD'.
 * Mirror of pipeline_watchdog._last_completed_session_date.
 */
function lastCompletedSessionDate(now: Date): string {
    let d = utcMidnight(now);
    for (let i = 0; i < 14; i++) {
        if (isTradingDay(d) && sessionClose(d).getTime() <= now.getTime()) {
            return isoDate(d);
        }
        d = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    }
    return isoDate(now);
}

/**
 * How many trading sessions have CLOSED with a date strictly after the data's
 * date. Weekend/holiday-safe. Mirror of pipeline_watchdog._trading_days_missed.
 * `dataDateIso` is the data's own date ('YYYY-MM-DD', UTC).
 */
function tradingDaysMissed(dataDateIso: string | null, now: Date): number {
    if (!dataDateIso) return 999;
    let missed = 0;
    // start the day AFTER the data's date
    let d = new Date(new Date(dataDateIso + 'T00:00:00.000Z').getTime() + 24 * 60 * 60 * 1000);
    const nowMid = utcMidnight(now).getTime();
    let guard = 0;
    while (d.getTime() <= nowMid && guard < 400) {
        if (isTradingDay(d) && sessionClose(d).getTime() <= now.getTime()) missed++;
        d = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        guard++;
    }
    return missed;
}

// --------------------------------------------------------------------------- //
// What we guard. SLA kinds + thresholds are ported from pipeline_watchdog.py
// DATASETS (ground-truth columns verified against the live writers):
//   prices      market_tickers.last_updated  (written NOW() on every upsert)
//   charts      ohlc_data.date
//   news        egx_news.created_at
//   funds       mutual_funds.updated_at
//   technicals  egx_technicals.updated_at
//
//   kind 'intraday'      → only stale when market open AND age_min > thresholdMin
//   kind 'session_date'  → stale if max(date) < last completed session date
//   kind 'trading_daily' → stale if >= thresholdSessions trading sessions missed
//   kind 'wall_days'     → stale if age_hours > thresholdHours (spans weekends)
//
//   critical: true datasets drive the 503 / DATA_STALE keyword for the external
//   monitor. The rest still report per-dataset `stale` in the JSON.
// --------------------------------------------------------------------------- //
type Kind = 'intraday' | 'session_date' | 'trading_daily' | 'wall_days';

interface DatasetDef {
    name: string;
    table: string;
    col: string;
    filter?: string;
    kind: Kind;
    /** intraday: minutes; trading_daily: sessions; wall_days: hours. */
    threshold?: number;
    critical: boolean;
    /** human-readable SLA string for the response. */
    sla: string;
}

const DATASETS: DatasetDef[] = [
    { name: 'prices',     table: 'market_tickers',  col: 'last_updated', filter: "market_code = 'EGX'", kind: 'intraday',      threshold: 25, critical: true,  sla: '25m during open session (Sun–Thu 06:00–13:15 UTC)' },
    { name: 'charts',     table: 'ohlc_data',       col: 'date',                                       kind: 'session_date',                 critical: true,  sla: 'max(date) >= last completed EGX session' },
    { name: 'technicals', table: 'egx_technicals',  col: 'updated_at',                                  kind: 'trading_daily', threshold: 2,  critical: false, sla: '< 2 trading sessions missed' },
    { name: 'news',       table: 'egx_news',        col: 'created_at',                                  kind: 'wall_days',     threshold: 7 * 24, critical: false, sla: '7 days' },
    { name: 'funds',      table: 'mutual_funds',    col: 'updated_at',                                  kind: 'wall_days',     threshold: 5 * 24, critical: false, sla: '5 days' },
];

interface DatasetResult {
    newest: string | null;
    age_minutes: number | null;
    sla: string;
    stale: boolean;
    critical: boolean;
    detail: string;
}

/** Coerce a pg-returned max() value (Date | string | null) to a Date | null. */
function toDate(v: any): Date | null {
    if (v === null || v === undefined) return null;
    if (v instanceof Date) return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Classify one dataset given its newest value. Mirror of pipeline_watchdog._classify
 * but split into stale(boolean) + detail(string). EMPTY (no rows) is treated as
 * stale — a core table with zero rows is at least as bad as a stale one.
 */
function classify(def: DatasetDef, raw: any, now: Date): DatasetResult {
    const base = { sla: def.sla, critical: def.critical };

    if (raw === null || raw === undefined) {
        return { ...base, newest: null, age_minutes: null, stale: true, detail: 'EMPTY — no rows' };
    }

    // session_date is a DATE, compared as a calendar date — no clock arithmetic.
    if (def.kind === 'session_date') {
        // raw may be a Date (UTC midnight) or 'YYYY-MM-DD' string.
        const dateIso = raw instanceof Date ? isoDate(raw) : String(raw).slice(0, 10);
        const expected = lastCompletedSessionDate(now);
        const stale = dateIso < expected;
        const newestDate = toDate(raw);
        const ageMin = newestDate ? Math.round((now.getTime() - newestDate.getTime()) / 60_000) : null;
        return {
            ...base,
            newest: dateIso,
            age_minutes: ageMin,
            stale,
            detail: `max date ${dateIso} (expected >= ${expected})`,
        };
    }

    const ts = toDate(raw);
    if (!ts) {
        return { ...base, newest: null, age_minutes: null, stale: true, detail: 'unparseable timestamp' };
    }
    const ageMs = now.getTime() - ts.getTime();
    const ageMin = Math.round(ageMs / 60_000);
    const ageH = ageMs / 3_600_000;
    const newestIso = ts.toISOString();

    if (def.kind === 'intraday') {
        if (!isMarketOpen(now)) {
            return { ...base, newest: newestIso, age_minutes: ageMin, stale: false,
                detail: `market closed (age ${ageH.toFixed(1)}h, not expected fresh)` };
        }
        const stale = ageMin > (def.threshold as number);
        return { ...base, newest: newestIso, age_minutes: ageMin, stale,
            detail: `age ${ageMin}m (SLA ${def.threshold}m, market open)` };
    }

    if (def.kind === 'trading_daily') {
        const missed = tradingDaysMissed(isoDate(ts), now);
        const stale = missed >= (def.threshold as number);
        return { ...base, newest: newestIso, age_minutes: ageMin, stale,
            detail: `${missed} session(s) missed (age ${ageH.toFixed(1)}h)` };
    }

    // wall_days
    const stale = ageH > (def.threshold as number);
    return { ...base, newest: newestIso, age_minutes: ageMin, stale,
        detail: `age ${(ageH / 24).toFixed(1)}d (SLA ${((def.threshold as number) / 24).toFixed(0)}d)` };
}

export async function GET() {
    const checkedAt = new Date().toISOString();
    const now = new Date();

    try {
        // One round-trip per dataset, run in parallel. Each query is a trivial
        // max() on an indexed column. A single dataset's query failing must NOT
        // sink the whole check — mark just that dataset as a failure and keep
        // going, so one bad table can't blind the monitor to the others.
        const datasets: Record<string, DatasetResult> = {};
        let anyQueryFailed = false;

        await Promise.all(
            DATASETS.map(async (def) => {
                const where = def.filter ? ` WHERE ${def.filter}` : '';
                const sql = `SELECT max(${def.col}) AS newest FROM ${def.table}${where}`;
                try {
                    const result = await db.query(sql);
                    const raw = result.rows[0]?.newest ?? null;
                    datasets[def.name] = classify(def, raw, now);
                } catch (e: any) {
                    anyQueryFailed = true;
                    // A failed query on a CRITICAL dataset must be treated as stale
                    // (fail-loud): we cannot prove it is fresh, so assume the worst.
                    datasets[def.name] = {
                        newest: null,
                        age_minutes: null,
                        sla: def.sla,
                        stale: def.critical,
                        critical: def.critical,
                        detail: `query failed: ${e?.message ?? 'unknown'}`,
                    };
                }
            }),
        );

        const staleNames = Object.keys(datasets).filter((n) => datasets[n].stale);
        const criticalStale = staleNames.filter((n) => datasets[n].critical);
        const ok = criticalStale.length === 0;

        const body: Record<string, any> = {
            ok,
            checked_at: checkedAt,
            datasets,
            stale: staleNames,
        };
        // Stable keyword for keyword-based external monitors. Present ONLY when a
        // CRITICAL dataset is stale, so "DATA_STALE" missing == healthy core feed.
        if (!ok) {
            body.status_keyword = 'DATA_STALE';
            body.message = `DATA_STALE: critical dataset(s) stale — ${criticalStale.join(', ')}`;
        }
        if (anyQueryFailed) {
            // Surface partial-failure without forcing 503 unless a critical one failed.
            body.partial_check = true;
        }

        return NextResponse.json(body, {
            // 503 lets a status-code monitor alert too (status != 200). The keyword
            // is the belt to that suspenders. EGX-aware SLAs mean weekends/holidays
            // do NOT trip this (intraday only fires when the market is open).
            status: ok ? 200 : 503,
            headers: { 'Cache-Control': 'no-store' },
        });

    } catch (error: any) {
        // The check ITSELF failed (e.g. pool init / DB totally unreachable). Distinct
        // from DATA_STALE: emit CHECK_FAILED + 500 so the monitor can tell "the
        // freshness probe is broken" apart from "the data is stale". Never throw.
        console.error('[API /health/freshness ERROR]', error?.message);
        return NextResponse.json({
            ok: false,
            checked_at: checkedAt,
            status_keyword: 'CHECK_FAILED',
            error: `CHECK_FAILED: ${error?.message ?? 'unknown'}`,
            datasets: {},
            stale: [],
        }, {
            status: 500,
            headers: { 'Cache-Control': 'no-store' },
        });
    }
}
