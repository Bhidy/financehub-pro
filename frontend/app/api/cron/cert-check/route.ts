import { NextResponse } from 'next/server';
import tls from 'node:tls';

// Node's `tls` module requires the Node.js runtime (NOT the Edge runtime).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/cert-check
 *
 * Vercel Cron endpoint (DAILY — see frontend/vercel.json "crons").
 * Closes the HIDDEN-EXPIRY class of silent failure: a TLS certificate on the
 * backend host once expired 53 days unnoticed because nothing watched it.
 *
 * What it does:
 *   1. Opens a real TLS connection to the backend host (Node `tls.connect`),
 *      using SNI so the correct certificate is presented.
 *   2. Reads the peer certificate `valid_to` and computes days-to-expiry.
 *   3. If < WARN_DAYS days remain → POST a Discord alert and return 503.
 *   4. If the connection / handshake FAILS or TIMES OUT → that is itself a
 *      signal (the backend's :443 is unreachable), so it ALERTS and returns 503.
 *   5. Otherwise returns 200 with a clear JSON status.
 *
 * Independence: this runs on Vercel, querying the backend host directly. It has
 * ZERO dependency on the Hetzner GitHub Actions runner, so it still fires even
 * during a total runner/box outage.
 *
 * Discord delivery is VERIFIED (the webhook HTTP status is checked and surfaced
 * in the JSON), so a dead/403 webhook never silently swallows the alert.
 *
 * ENV required:
 *   DISCORD_WEBHOOK_URL — existing Discord webhook secret (already set on Vercel)
 *
 * Vercel-cron auth: if CRON_SECRET is set, Vercel sends it as a Bearer token and
 * external callers are rejected (matches frontend/app/api/v1/watchdog/ping).
 */

const BACKEND_HOST = 'starta.46-224-223-172.sslip.io';
const BACKEND_PORT = 443;
const WARN_DAYS = 14;            // alert when fewer than this many days remain
const CONNECT_TIMEOUT_MS = 10_000;

interface CertResult {
    valid_to: string;
    days_remaining: number;
    issuer: string | null;
    subject: string | null;
}

/**
 * Open a TLS connection and resolve the peer certificate's expiry.
 * Rejects (does NOT swallow) on connect error or timeout — the caller treats a
 * rejection as an alert-worthy signal.
 */
function fetchPeerCert(): Promise<CertResult> {
    return new Promise<CertResult>((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            try { socket.destroy(); } catch { /* already gone */ }
            fn();
        };

        const socket = tls.connect(
            {
                host: BACKEND_HOST,
                port: BACKEND_PORT,
                servername: BACKEND_HOST, // SNI — present the right vhost cert
                // We only inspect dates; do NOT abort the handshake on an
                // expired/invalid cert, otherwise we could not REPORT expiry.
                rejectUnauthorized: false,
            },
            () => {
                const cert = socket.getPeerCertificate();
                if (!cert || !cert.valid_to || Object.keys(cert).length === 0) {
                    finish(() => reject(new Error('No peer certificate returned')));
                    return;
                }
                const validTo = new Date(cert.valid_to);
                if (Number.isNaN(validTo.getTime())) {
                    finish(() => reject(new Error(`Unparseable valid_to: ${cert.valid_to}`)));
                    return;
                }
                const daysRemaining = Math.floor(
                    (validTo.getTime() - Date.now()) / 86_400_000,
                );
                finish(() => resolve({
                    valid_to: validTo.toISOString(),
                    days_remaining: daysRemaining,
                    issuer: cert.issuer?.O ?? cert.issuer?.CN ?? null,
                    subject: cert.subject?.CN ?? null,
                }));
            },
        );

        socket.setTimeout(CONNECT_TIMEOUT_MS, () => {
            finish(() => reject(new Error(`TLS connect timed out after ${CONNECT_TIMEOUT_MS}ms`)));
        });
        socket.on('error', (err: Error) => {
            finish(() => reject(err));
        });
    });
}

/**
 * POST a Discord alert and VERIFY delivery by checking the HTTP status.
 * Returns true only on a 2xx response; never throws.
 */
async function postDiscord(webhookUrl: string, title: string, lines: string[]): Promise<boolean> {
    try {
        const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{ title, description: lines.join('\n'), color: 0xE74C3C }],
            }),
        });
        if (!res.ok) {
            console.error(`[cron/cert-check] Discord webhook returned ${res.status} ${res.statusText}`);
            return false;
        }
        return true;
    } catch (err: any) {
        console.error('[cron/cert-check] Discord POST failed:', err?.message);
        return false;
    }
}

export async function GET(request: Request) {
    // Vercel sets the Bearer token on cron invocations; reject external callers
    // only when CRON_SECRET is configured (mirrors watchdog/ping).
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
        }
    }

    const checkedAt = new Date().toISOString();
    const discord = process.env.DISCORD_WEBHOOK_URL;
    const noStore = { 'Cache-Control': 'no-store' };

    let cert: CertResult;
    try {
        cert = await fetchPeerCert();
    } catch (error: any) {
        // A connect/handshake failure to :443 is ITSELF a signal — alert on it.
        const msg = error?.message ?? 'unknown error';
        console.error('[cron/cert-check] connection failed:', msg);
        let alerted = false;
        if (discord) {
            alerted = await postDiscord(
                discord,
                '🚨 BACKEND TLS UNREACHABLE — cert check could not connect',
                [
                    `**Host:** \`${BACKEND_HOST}:${BACKEND_PORT}\``,
                    `**Error:** ${msg}`,
                    '',
                    'A failed TLS connection to the backend means either the host is',
                    'down, the port is blocked, or the certificate is broken. Investigate',
                    'immediately — this also blocks the daily certificate expiry check.',
                ],
            );
        }
        return NextResponse.json({
            ok: false,
            status: 'connect_failed',
            host: BACKEND_HOST,
            error: msg,
            discord_alerted: alerted,
            discord_configured: Boolean(discord),
            checked_at: checkedAt,
        }, { status: 503, headers: noStore });
    }

    const expiringSoon = cert.days_remaining < WARN_DAYS;

    if (expiringSoon) {
        let alerted = false;
        if (discord) {
            const expired = cert.days_remaining < 0;
            alerted = await postDiscord(
                discord,
                expired
                    ? '🚨 BACKEND TLS CERTIFICATE HAS EXPIRED'
                    : '⚠️ BACKEND TLS CERTIFICATE EXPIRING SOON',
                [
                    `**Host:** \`${BACKEND_HOST}\``,
                    `**Days remaining:** ${cert.days_remaining} (threshold: ${WARN_DAYS})`,
                    `**Valid until:** ${cert.valid_to}`,
                    cert.issuer ? `**Issuer:** ${cert.issuer}` : '',
                    '',
                    expired
                        ? 'The certificate is ALREADY EXPIRED — HTTPS to the backend is failing now.'
                        : 'Renew the certificate before it expires to avoid a silent backend outage.',
                ].filter(Boolean),
            );
        }
        return NextResponse.json({
            ok: false,
            status: cert.days_remaining < 0 ? 'expired' : 'expiring_soon',
            host: BACKEND_HOST,
            valid_to: cert.valid_to,
            days_remaining: cert.days_remaining,
            warn_days: WARN_DAYS,
            issuer: cert.issuer,
            subject: cert.subject,
            discord_alerted: alerted,
            discord_configured: Boolean(discord),
            checked_at: checkedAt,
        }, { status: 503, headers: noStore });
    }

    // Healthy — plenty of runway.
    return NextResponse.json({
        ok: true,
        status: 'ok',
        host: BACKEND_HOST,
        valid_to: cert.valid_to,
        days_remaining: cert.days_remaining,
        warn_days: WARN_DAYS,
        issuer: cert.issuer,
        subject: cert.subject,
        checked_at: checkedAt,
    }, { status: 200, headers: noStore });
}
