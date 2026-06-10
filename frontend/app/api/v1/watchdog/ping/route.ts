import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/watchdog/ping
 *
 * Vercel Cron endpoint (runs every hour via vercel.json "crons").
 * Completely independent of GitHub Actions — survives billing failures, outages,
 * or any GitHub-side issue that takes the Python watchdog dark.
 *
 * Logic:
 *   1. Read pipeline_heartbeat WHERE name='pipeline_watchdog'
 *   2. If last_run_at > STALE_THRESHOLD_MIN old (or never written) → POST Discord alert
 *   3. Always return 200 so Vercel doesn't retry-storm the DB
 *
 * Vercel only invokes this from its own infra (Authorization header check below).
 * The /api/v1/watchdog/status endpoint is the public read-only twin for external monitors.
 *
 * ENV required:
 *   DATABASE_URL          — Supabase connection string (already set)
 *   DISCORD_WEBHOOK_URL   — existing Discord webhook secret
 */

const STALE_THRESHOLD_MIN = 75;  // 2.5× the watchdog's 30-min cadence

/**
 * POST a Discord alert and VERIFY delivery by checking the HTTP status.
 * Returns true only on a 2xx response; logs res.status on failure; never throws.
 * (Mirrors frontend/app/api/cron/cert-check/route.ts — closes the H3
 * silent-alert-failure class: a dead/403 webhook no longer vanishes silently.)
 */
async function postDiscord(webhookUrl: string, ageMinutes: number | null): Promise<boolean> {
    const age = ageMinutes === null ? 'never ran' : `${ageMinutes} min ago`;
    const body = JSON.stringify({
        embeds: [{
            title: '🚨 PIPELINE WATCHDOG SILENT — GitHub Actions may be down',
            description: [
                `**Last heartbeat:** ${age} (threshold: ${STALE_THRESHOLD_MIN} min)`,
                '',
                '**Possible causes:**',
                '• GitHub Actions billing limit hit (spending cap = $0 on free plan)',
                '• Payment method failed — check **github.com/settings/billing**',
                '• GitHub Actions outage',
                '',
                '**Impact:** All data-pipeline monitoring is dark. EGX prices, charts,',
                'NAVs, and all scheduled jobs run unmonitored until GitHub Actions resumes.',
                '',
                '**Check live status:** https://startamarkets.com/api/v1/watchdog/status',
            ].join('\n'),
            color: 0xE74C3C,
        }],
    });

    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        if (!res.ok) {
            console.error(`[watchdog/ping] Discord webhook returned ${res.status} ${res.statusText}`);
            return false;
        }
        return true;
    } catch (err: any) {
        console.error('[watchdog/ping] Discord POST failed:', err?.message);
        return false;
    }
}

export async function GET(request: NextRequest) {
    // Vercel sets this header on cron invocations; reject external calls
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ''}` && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const checkedAt = new Date().toISOString();
    const discord = process.env.DISCORD_WEBHOOK_URL;

    try {
        const result = await db.query(
            `SELECT last_run_at FROM pipeline_heartbeat WHERE name = 'pipeline_watchdog' LIMIT 1`
        );

        const row = result.rows[0] ?? null;

        if (!row) {
            // Watchdog has never written a heartbeat
            const discordAlerted = discord ? await postDiscord(discord, null) : false;
            return NextResponse.json({ alerted: true, reason: 'no heartbeat on record', discord_alerted: discordAlerted, discord_configured: Boolean(discord), checked_at: checkedAt });
        }

        const ageMs = Date.now() - (row.last_run_at as Date).getTime();
        const ageMinutes = Math.round(ageMs / 60_000);

        if (ageMinutes > STALE_THRESHOLD_MIN) {
            const discordAlerted = discord ? await postDiscord(discord, ageMinutes) : false;
            console.warn(`[watchdog/ping] STALE: heartbeat ${ageMinutes}m old — Discord ${discordAlerted ? 'alerted' : 'alert FAILED/unconfigured'}`);
            return NextResponse.json({ alerted: true, age_minutes: ageMinutes, discord_alerted: discordAlerted, discord_configured: Boolean(discord), checked_at: checkedAt });
        }

        // All good — watchdog is alive
        return NextResponse.json({ alerted: false, age_minutes: ageMinutes, alive: true, checked_at: checkedAt });

    } catch (error: any) {
        console.error('[watchdog/ping ERROR]', error?.message);
        // DB error itself is a signal — alert if Discord is available.
        // postDiscord never throws (returns false on any failure), so no inner try/catch needed.
        const discordAlerted = discord ? await postDiscord(discord, null) : false;
        return NextResponse.json({ alerted: true, error: error?.message, discord_alerted: discordAlerted, discord_configured: Boolean(discord), checked_at: checkedAt });
    }
}
