import { NextResponse } from 'next/server';

/**
 * Opaque error response for PUBLIC API routes.
 *
 * WHY (2026-08-15 security audit): every public fund route did
 *   `return NextResponse.json({ error: error.message }, { status: 500 })`
 * which forwards the verbatim Postgres driver message to anonymous callers.
 * pg error text carries table/column names, type names and query context —
 * a free schema map for anyone who can make a route throw.
 *
 * The detail still reaches us: it is logged server-side against a correlation
 * id that the caller also receives, so a user report ("I got ref a3f9c1…")
 * maps to an exact log line without ever exposing internals.
 */
export function apiError(scope: string, error: unknown, status = 500) {
    const ref = Math.random().toString(36).slice(2, 10);
    const detail = error instanceof Error ? error.message : String(error);
    // Server-side only — never serialised into the response body.
    console.error(`[API] ${scope} error ref=${ref}:`, detail);
    return NextResponse.json(
        { error: 'Internal server error', ref },
        { status }
    );
}

/**
 * Parse a caller-supplied `limit` into a bounded integer.
 *
 * WHY: `?limit=` was passed straight into SQL `LIMIT $2` with no parse and no
 * ceiling. Parameterised, so not injection — but a caller could request the
 * entire table, or send a non-numeric value and trip a Postgres type error
 * (which the old handler then echoed back verbatim).
 */
export function clampLimit(raw: string | null, fallback: number, max: number): number {
    const n = Number.parseInt(raw ?? '', 10);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    return Math.min(n, max);
}
