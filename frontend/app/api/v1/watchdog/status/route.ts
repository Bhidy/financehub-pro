import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/watchdog/status
 *
 * Public health endpoint for the Pipeline Watchdog — reads the pipeline_heartbeat
 * table written by scripts/pipeline_watchdog.py every 30 min.
 *
 * This endpoint is the EXTERNAL monitoring escape hatch: it runs on Vercel
 * (completely independent of GitHub Actions billing), so if GitHub Actions goes
 * dark due to a billing failure or outage, this endpoint stays up and external
 * monitors (UptimeRobot, BetterUptime, StatusCake — all free) can detect the
 * silence and alert. Register it at: https://uptimerobot.com → New Monitor →
 * Keyword Monitor → URL: https://startamarkets.com/api/v1/watchdog/status
 * → keyword "alive":true → alert on keyword MISSING.
 *
 * Response:
 *   { alive, age_minutes, last_heartbeat, detail, checked_at }
 *   alive = true  → watchdog ran within the last 75 min (2.5× its 30-min schedule)
 *   alive = false → watchdog is silent; GitHub Actions may be down or billing failed
 *
 * HTTP 200 always (so monitors can do keyword checks, not status checks).
 * No CDN caching — this is a real-time liveness signal.
 */

const STALE_THRESHOLD_MIN = 75; // 2.5× the 30-min watchdog schedule

export async function GET() {
    const checkedAt = new Date().toISOString();

    try {
        const result = await db.query(
            `SELECT last_run_at, detail
             FROM pipeline_heartbeat
             WHERE name = 'pipeline_watchdog'
             LIMIT 1`
        );

        const row = result.rows[0] ?? null;

        if (!row) {
            return NextResponse.json({
                alive: false,
                age_minutes: null,
                last_heartbeat: null,
                detail: 'No heartbeat on record — watchdog has never run or table is empty.',
                checked_at: checkedAt,
            }, { headers: { 'Cache-Control': 'no-store' } });
        }

        const lastRunAt: Date = row.last_run_at;
        const ageMs = Date.now() - lastRunAt.getTime();
        const ageMinutes = Math.round(ageMs / 60_000);
        const alive = ageMinutes <= STALE_THRESHOLD_MIN;

        return NextResponse.json({
            alive,
            age_minutes: ageMinutes,
            last_heartbeat: lastRunAt.toISOString(),
            detail: row.detail ?? null,
            stale_threshold_minutes: STALE_THRESHOLD_MIN,
            checked_at: checkedAt,
        }, { headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        console.error('[API /watchdog/status ERROR]', error?.message);
        // Return a distinct payload so monitors can detect DB-down separately
        return NextResponse.json({
            alive: false,
            age_minutes: null,
            last_heartbeat: null,
            detail: `DB error: ${error?.message ?? 'unknown'}`,
            checked_at: checkedAt,
        }, {
            status: 200, // keep 200 so keyword monitors still fire on "alive":false
            headers: { 'Cache-Control': 'no-store' },
        });
    }
}
