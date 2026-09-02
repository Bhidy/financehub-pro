import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { normalizeEmail } from '@/lib/auth-errors';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const HF_API_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1/auth`;

/**
 * Login proxy (OAuth2 password grant — `username` carries the email).
 *
 * The `username` is lower-cased for the same reason the signup route lower-cases
 * the email: accounts are stored under a case-sensitive unique column, so a
 * visitor who registered as "Ahmed@Gmail.com" must still sign in when their
 * phone keyboard capitalises the first letter. Normalising BOTH sides of the
 * pair is what makes the account reachable.
 *
 * Passwords are never touched, logged, or re-encoded beyond the form encoding.
 */
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';
        const raw = await request.text();

        let body = raw;
        if (contentType.includes('application/x-www-form-urlencoded')) {
            const form = new URLSearchParams(raw);
            const username = form.get('username');
            if (username) {
                form.set('username', normalizeEmail(username));
                body = form.toString();
            }
        }

        const response = await fetch(`${HF_API_URL}/token`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000), // don't hang on a slow/sleeping backend (L-4)
            headers: {
                'Content-Type': contentType || 'application/x-www-form-urlencoded',
            },
            body,
        });

        if (!response.ok) {
            // Deliberately uniform: distinguishing "no such account" from "wrong
            // password" hands an attacker a free account-enumeration oracle.
            // The upstream body is read and discarded so the socket is drained.
            await response.text().catch(() => '');
            return NextResponse.json(
                { detail: 'Incorrect email or password' },
                { status: response.status === 422 ? 400 : response.status }
            );
        }

        return NextResponse.json(await response.json());
    } catch (error) {
        console.error('[Auth Route] Token request failed:', error);
        return NextResponse.json({ detail: 'Authentication failed' }, { status: 500 });
    }
}
