/**
 * Post-authentication destination + OAuth hand-off helpers (client-side).
 *
 * Product contract (owner-specified):
 *  - Signing in from the home page (or from nowhere in particular) lands the
 *    user on /Funds — the platform's core surface, NOT the hidden chatbot.
 *  - Signing in after being sent from a specific page (fund profile, article…)
 *    returns the user to exactly that page.
 *
 * Mechanics: the auth pages remember the same-origin referrer (or an explicit
 * validated ?redirect=) in sessionStorage before authentication starts —
 * sessionStorage survives the round-trip to Google and back in the same tab.
 * The root layout's `auth-param-scrub` inline script stashes the callback's
 * token query params under HANDOFF_KEY and scrubs the URL before analytics can
 * record it; the auth pages read the stash back through readAuthHandoff().
 *
 * SECURITY: every navigation target passes sanitizeReturnPath — same-origin
 * relative paths only. Never feed a raw query/storage value to router.push:
 * "https://evil.com", "//evil.com" and "/\\evil.com" all hard-navigate off-site
 * (login CSRF → token planting + off-site bounce).
 */

const HANDOFF_KEY = 'starta-auth-handoff';
const RETURN_KEY = 'starta-return-to';
const DEFAULT_DESTINATION = '/Funds';

/** Accept only same-origin relative paths: "/x…" but never "//…" or "/\…". */
export function sanitizeReturnPath(raw: string | null | undefined): string | null {
    if (!raw) return null;
    return /^\/(?![/\\])/.test(raw) ? raw : null;
}

export type AuthHandoff = Partial<Record<
    'token' | 'refresh_token' | 'user' | 'google_auth' | 'redirect' | 'error' | 'checkout' | 'plan',
    string
>>;

/** Params the layout scrubber stashed before cleaning the URL (or null). */
export function readAuthHandoff(): AuthHandoff | null {
    try {
        const raw = sessionStorage.getItem(HANDOFF_KEY);
        return raw ? (JSON.parse(raw) as AuthHandoff) : null;
    } catch {
        return null;
    }
}

export function clearAuthHandoff(): void {
    try {
        sessionStorage.removeItem(HANDOFF_KEY);
    } catch { /* storage unavailable */ }
}

/**
 * Remember where the user should return after authenticating. Call once on
 * auth-page mount. An explicit validated ?redirect= wins; otherwise the
 * same-origin referrer is captured (excluding auth/system pages). Keeps the
 * earliest intent: the OAuth round-trip re-mounts the page with a cross-origin
 * (Google) referrer, which must not overwrite the original one.
 */
export function captureReturnPath(explicit?: string | null): void {
    try {
        const clean = sanitizeReturnPath(explicit);
        if (clean && clean !== DEFAULT_DESTINATION) {
            sessionStorage.setItem(RETURN_KEY, clean);
            return;
        }
        if (sessionStorage.getItem(RETURN_KEY)) return;
        if (!document.referrer) return;
        const ref = new URL(document.referrer);
        if (ref.origin !== window.location.origin) return;
        if (/^\/(login|register|forgot-password|api|AiChat)/.test(ref.pathname)) return;
        sessionStorage.setItem(RETURN_KEY, ref.pathname + ref.search);
    } catch { /* invalid referrer URL or storage unavailable */ }
}

/**
 * Resolve (and consume) the post-auth destination:
 * explicit non-default ?redirect= → remembered origin page → /Funds.
 * The server callback always sends redirect=/Funds as a generic default, so a
 * remembered specific page outranks it; any other explicit redirect wins.
 */
export function resolvePostAuthDestination(redirectParam?: string | null): string {
    const explicit = sanitizeReturnPath(redirectParam);
    let remembered: string | null = null;
    try {
        remembered = sanitizeReturnPath(sessionStorage.getItem(RETURN_KEY));
        sessionStorage.removeItem(RETURN_KEY);
    } catch { /* storage unavailable */ }
    if (explicit && explicit !== DEFAULT_DESTINATION) return explicit;
    return remembered || explicit || DEFAULT_DESTINATION;
}
