/**
 * ============================================================================
 * CANONICAL CLIENT SESSION — the one reader/writer of the signed-in state
 * ============================================================================
 *
 * WHY THIS FILE EXISTS
 * The session lived as four bare `localStorage.getItem("fh_auth_token")` calls
 * scattered across AuthContext, the auth pages and home.html, and NOTHING ever
 * checked whether the token had expired: a visitor whose JWT died three weeks
 * ago still rendered as signed in until some API call happened to 401. Worse,
 * the nav renderers had no way to observe a sign-in, so registering in one tab
 * left every other surface showing "Create Account".
 *
 * Everything that needs to know "is someone signed in, and who" goes through
 * here. Storage keys and account routes come from lib/auth-nav.json so the
 * static-page renderer (public/assets/starta-auth-nav.js) reads the exact same
 * contract — the mirror is build-gated.
 *
 * NOTE ON TRUST: this is presentation state only. A tampered localStorage can
 * make the nav draw an avatar, and that is harmless — every protected resource
 * is authorised server-side against the signed JWT. Never gate anything that
 * matters on readSession() alone.
 */

import authNav from "./auth-nav.json";

export const SESSION_KEYS = authNav.storage;
export const ACCOUNT_ROUTES = authNav.routes;

/** Fired on this tab whenever the session changes; `storage` covers other tabs. */
export const SESSION_EVENT = "starta:session";

export interface SessionUser {
    id: number;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url?: string | null;
    role: string;
    subscription_status?: string | null;
    subscription_plan?: string | null;
}

export type SessionStatus =
    /** Access token present and unexpired. */
    | "active"
    /** Access token expired but a live refresh token can revive it. */
    | "stale"
    /** Nobody is signed in (or the stored session is unusable). */
    | "none";

export interface Session {
    status: SessionStatus;
    user: SessionUser | null;
    token: string | null;
}

const NO_SESSION: Session = { status: "none", user: null, token: null };

/**
 * Seconds-since-epoch expiry of a JWT, or null when the token is unreadable.
 *
 * Deliberately does NOT verify the signature: the client cannot (it has no
 * secret) and does not need to — this only decides what the nav draws. A forged
 * token still fails at the API.
 */
function jwtExpiry(token: string): number | null {
    try {
        const payload = token.split(".")[1];
        if (!payload) return null;
        // base64url → base64, then pad. atob rejects unpadded input.
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const decoded = JSON.parse(
            decodeURIComponent(
                atob(padded)
                    .split("")
                    .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
                    .join("")
            )
        );
        return typeof decoded?.exp === "number" ? decoded.exp : null;
    } catch {
        return null;
    }
}

/**
 * Exported for scripts/test-auth-session.ts — this is the behaviour that
 * decides whether a returning visitor is shown as signed in, and it is the one
 * check the old localStorage-only code never performed.
 *
 * A token with no readable `exp` is treated as live: our own backend always
 * sets one, so an unreadable claim means a decoding edge case, and signing a
 * real user out over that would be worse than a redundant 401.
 */
export function isExpired(token: string | null): boolean {
    if (!token) return true;
    const exp = jwtExpiry(token);
    if (exp === null) return false;
    return exp * 1000 <= Date.now();
}

/** The current session. Safe to call during SSR (returns "none"). */
export function readSession(): Session {
    if (typeof window === "undefined") return NO_SESSION;

    let token: string | null = null;
    let rawUser: string | null = null;
    let refresh: string | null = null;
    let avatar: string | null = null;
    try {
        token = localStorage.getItem(SESSION_KEYS.token);
        rawUser = localStorage.getItem(SESSION_KEYS.user);
        refresh = localStorage.getItem(SESSION_KEYS.refresh);
        avatar = localStorage.getItem(SESSION_KEYS.avatar);
    } catch {
        // Private mode / storage disabled — render as a signed-out visitor.
        return NO_SESSION;
    }

    if (!token || !rawUser) return NO_SESSION;

    let user: SessionUser;
    try {
        user = JSON.parse(rawUser) as SessionUser;
    } catch {
        clearSession();
        return NO_SESSION;
    }
    if (!user || typeof user.email !== "string") {
        clearSession();
        return NO_SESSION;
    }
    if (avatar) user.avatar_url = avatar;

    if (!isExpired(token)) return { status: "active", user, token };
    // Access token is dead. A live refresh token means the session is
    // recoverable, so keep the user visible and let AuthContext refresh it
    // rather than logging them out mid-visit.
    if (refresh && !isExpired(refresh)) return { status: "stale", user, token };

    clearSession();
    return NO_SESSION;
}

export function writeSession(
    token: string,
    user: SessionUser,
    refreshToken?: string | null
): void {
    try {
        localStorage.setItem(SESSION_KEYS.token, token);
        localStorage.setItem(SESSION_KEYS.user, JSON.stringify(user));
        if (refreshToken) localStorage.setItem(SESSION_KEYS.refresh, refreshToken);
    } catch {
        // Storage unavailable: the in-memory React state still carries the
        // session for this page view.
    }
    broadcastSession();
}

export function clearSession(): void {
    try {
        localStorage.removeItem(SESSION_KEYS.token);
        localStorage.removeItem(SESSION_KEYS.refresh);
        localStorage.removeItem(SESSION_KEYS.user);
        localStorage.removeItem(SESSION_KEYS.avatar);
        // Prevent chat-session cross-contamination between accounts.
        localStorage.removeItem("fh_chat_session");
    } catch {
        /* storage unavailable */
    }
    broadcastSession();
}

/** Tell every nav renderer on THIS tab to re-read the session. */
export function broadcastSession(): void {
    if (typeof window === "undefined") return;
    try {
        window.dispatchEvent(new CustomEvent(SESSION_EVENT));
    } catch {
        /* CustomEvent unavailable (very old browsers) */
    }
}

/**
 * Observe session changes from both this tab (SESSION_EVENT) and other tabs
 * (`storage`). Returns an unsubscribe function.
 */
export function subscribeSession(onChange: () => void): () => void {
    if (typeof window === "undefined") return () => undefined;
    const onStorage = (e: StorageEvent) => {
        if (e.key === null || e.key === SESSION_KEYS.token || e.key === SESSION_KEYS.user) {
            onChange();
        }
    };
    window.addEventListener(SESSION_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
        window.removeEventListener(SESSION_EVENT, onChange);
        window.removeEventListener("storage", onStorage);
    };
}

/** First name (or the local part of the email) for the nav's account pill. */
export function displayName(user: SessionUser | null): string {
    if (!user) return "";
    const full = (user.full_name || "").trim();
    if (full) return full.split(/\s+/)[0];
    return user.email.split("@")[0];
}

/** Single uppercase initial for the account avatar. */
export function displayInitial(user: SessionUser | null): string {
    const name = displayName(user);
    return name ? name.charAt(0).toUpperCase() : "?";
}
