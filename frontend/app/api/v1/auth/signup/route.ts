import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { normalizeEmail } from '@/lib/auth-errors';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const HF_API_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1/auth`;

/**
 * Forward the visitor's address as the first X-Forwarded-For entry.
 *
 * This proxy calls the backend server-side, so without it every request arrives
 * from the same handful of serverless egress addresses and the VPS access logs
 * attribute the whole site's traffic to one client. Forwarding it is ordinary
 * reverse-proxy hygiene and makes those logs truthful.
 *
 * It is NOT a security signal and nothing is authorised on it: the header is
 * caller-supplied, and whether it survives the remaining hops depends on the
 * VPS's own proxy config. That is exactly why the backend's rate limits are
 * keyed on the account and on a global counter rather than on the address — an
 * address-keyed budget silently becomes a site-wide one the moment this chain
 * breaks, which took registration down once.
 */
function clientIp(request: NextRequest): string | null {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0].trim();
        if (first) return first;
    }
    return request.headers.get('x-real-ip');
}

/**
 * Signup proxy.
 *
 * This route is the one auth boundary that is deployable on its own (Vercel),
 * so it carries the normalisation rather than relying on the backend alone:
 *
 *  - EMAIL CASE. `users.email` is a case-SENSITIVE unique column and lookups
 *    are exact matches, so "Ahmed@Gmail.com" and "ahmed@gmail.com" registered
 *    as two separate accounts (reproduced live: ids 687 and 688) and the user
 *    who signed up with a capital could not sign back in with lower case.
 *    Lower-casing here fixes it for every client, including the native app.
 *  - FIELD ALLOW-LIST. The body was forwarded verbatim, so a caller could post
 *    `{"role":"admin"}` and rely on the backend to ignore it. Forward only the
 *    four fields registration actually collects.
 *  - NO LOGGING OF THE EMAIL. The previous handler console.log'd every signup
 *    address into Vercel's function logs — needless PII retention.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => null);
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ detail: 'Invalid request body' }, { status: 400 });
        }

        const { email, password, full_name, phone } = body as Record<string, unknown>;
        if (typeof email !== 'string' || typeof password !== 'string') {
            return NextResponse.json(
                { detail: 'Email and password are required' },
                { status: 400 }
            );
        }

        const payload = {
            email: normalizeEmail(email),
            password,
            full_name: typeof full_name === 'string' ? full_name.trim() : null,
            // Empty string is not a phone number — send null so the column stays
            // genuinely empty rather than holding "".
            phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        };

        const ip = clientIp(request);
        const response = await fetch(`${HF_API_URL}/signup`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000), // don't hang on a slow/sleeping backend (L-4)
            headers: {
                'Content-Type': 'application/json',
                ...(ip ? { 'X-Forwarded-For': ip } : {}),
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
            return NextResponse.json(
                { detail: result?.detail ?? 'Registration failed' },
                { status: response.status }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        // Never echo the thrown message: it can carry upstream URLs and infra
        // detail. The client shows its own translated copy.
        console.error('[Auth Route] Signup failed:', error);
        return NextResponse.json({ detail: 'Registration failed' }, { status: 500 });
    }
}
