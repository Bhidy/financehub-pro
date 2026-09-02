/**
 * ============================================================================
 * AUTH ERROR NORMALISATION (client-safe — no next/server import)
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * FastAPI's `detail` is not a string. A 400 raised by our own code sends
 * `{"detail": "Email already registered"}`, but a 422 from Pydantic sends an
 * ARRAY of error objects:
 *
 *   {"detail":[{"type":"value_error","loc":["body","email"],
 *               "msg":"value is not a valid email address: ...", ...}]}
 *
 * That array flowed unchanged through the proxy route into React state and was
 * rendered as `{error}` — "Objects are not valid as a React child", which blanks
 * the whole signup screen. It is reachable in production: `ahmed@gmail` passes
 * the browser's own `type="email"` check (validity.valid === true) and fails
 * Pydantic's, so a single mistyped address crashed the page.
 *
 * Everything that surfaces a backend auth error to a human goes through
 * `normalizeApiError`, which ALWAYS returns a plain string.
 *
 * Sibling file note: lib/api-error.ts is the SERVER-side counterpart (it builds
 * opaque NextResponse bodies for public data routes). Keep them apart — that
 * one imports next/server and cannot be pulled into a client component.
 */

/** One entry of FastAPI's 422 validation payload. */
interface ValidationDetail {
    msg?: unknown;
    loc?: unknown;
}

function isValidationDetail(value: unknown): value is ValidationDetail {
    return typeof value === "object" && value !== null;
}

/**
 * Pydantic prefixes value_error messages with "Value error, ". Strip it — the
 * user did not write the validator, and "Value error, Password must be at least
 * 8 characters" reads like a bug report rather than guidance.
 */
function cleanMessage(msg: string): string {
    return msg.replace(/^Value error,\s*/i, "").trim();
}

/**
 * Coerce any FastAPI `detail` (string | array | object | absent) into one
 * human-readable line.
 *
 * @param detail   the parsed `detail` field, whatever shape it arrived in
 * @param fallback copy to use when `detail` carries nothing usable — pass a
 *                 translated string so the message stays in the user's language
 */
export function normalizeApiError(detail: unknown, fallback: string): string {
    if (typeof detail === "string" && detail.trim()) return detail.trim();

    if (Array.isArray(detail)) {
        const messages = detail
            .filter(isValidationDetail)
            .map((entry) => (typeof entry.msg === "string" ? cleanMessage(entry.msg) : ""))
            .filter(Boolean);
        return messages.length ? messages.join(". ") : fallback;
    }

    if (isValidationDetail(detail) && typeof detail.msg === "string" && detail.msg.trim()) {
        return cleanMessage(detail.msg);
    }

    return fallback;
}

/**
 * Read an error response body and reduce it to one string. Never throws: a
 * non-JSON body (an HTML gateway error page, an empty 502) yields the fallback.
 */
export async function readApiError(response: Response, fallback: string): Promise<string> {
    const body = await response.json().catch(() => null);
    if (!body || typeof body !== "object") return fallback;
    return normalizeApiError((body as { detail?: unknown }).detail, fallback);
}

/**
 * Canonical email normalisation, applied at EVERY boundary that accepts one.
 *
 * WHY: `users.email` is a case-SENSITIVE unique column and lookups were exact
 * matches, so "Ahmed@Gmail.com" and "ahmed@gmail.com" registered as two
 * separate accounts (reproduced live: ids 687 and 688). The user who signed up
 * with a capital letter and later typed their address in lower case got
 * "Incorrect email or password" on their own account.
 */
export function normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
}
