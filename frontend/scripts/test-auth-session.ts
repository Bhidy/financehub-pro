/**
 * Regression tests for the auth session + error normalisation.
 *
 * Run standalone (the repo's convention for frontend tests — see
 * test-nav-gaps.ts) and wired into `npm run verify:all`:
 *
 *     npx tsx scripts/test-auth-session.ts
 *
 * Every case here pins a defect reproduced against production during the
 * registration audit, so a refactor cannot quietly reinstate it.
 */

import assert from "node:assert/strict";

import { normalizeApiError, normalizeEmail } from "../lib/auth-errors";
import authNav from "../lib/auth-nav.json";
import {
    isExpired,
    readSession,
    writeSession,
    clearSession,
    subscribeSession,
    SESSION_KEYS,
    type SessionUser,
} from "../lib/auth-session";

/** Build an unsigned JWT with the given payload — only `exp` is ever read. */
function jwt(payload: Record<string, unknown>): string {
    const b64 = (o: unknown) =>
        Buffer.from(JSON.stringify(o)).toString("base64url");
    return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.signature`;
}

let passed = 0;
function test(name: string, fn: () => void) {
    try {
        fn();
        passed += 1;
    } catch (error) {
        console.error(`\n❌ ${name}`);
        console.error(error);
        process.exit(1);
    }
}

// ── normalizeApiError ────────────────────────────────────────────────────
// THE defect: FastAPI answers a 422 with `detail` as an ARRAY of Pydantic
// error objects. It was passed straight into React state and rendered as
// {error} — "Objects are not valid as a React child" blanked the signup page.
// Reachable in production by typing "ahmed@gmail", which the browser's own
// type="email" check accepts (verified: validity.valid === true).

test("array detail collapses to a readable string, never an object", () => {
    const detail = [
        {
            type: "value_error",
            loc: ["body", "email"],
            msg: "value is not a valid email address: The part after the @-sign is not valid. It should have a period.",
            input: "ahmed@gmail",
        },
    ];
    const result = normalizeApiError(detail, "Registration failed");
    assert.equal(typeof result, "string");
    assert.ok(result.includes("not a valid email address"));
});

test("multiple validation errors are joined, not dropped", () => {
    const detail = [
        { msg: "Value error, Password must be at least 8 characters" },
        { msg: "field required" },
    ];
    const result = normalizeApiError(detail, "fallback");
    assert.ok(result.includes("Password must be at least 8 characters"));
    assert.ok(result.includes("field required"));
});

test("the 'Value error, ' prefix Pydantic adds is stripped", () => {
    const result = normalizeApiError([{ msg: "Value error, Password must be at least 8 characters" }], "fb");
    assert.equal(result, "Password must be at least 8 characters");
});

test("a plain string detail passes through", () => {
    assert.equal(normalizeApiError("Email already registered", "fb"), "Email already registered");
});

test("every unusable shape yields the translated fallback", () => {
    for (const detail of [undefined, null, "", "   ", [], {}, 42, [{ noMsg: true }]]) {
        const result = normalizeApiError(detail, "fallback copy");
        assert.equal(result, "fallback copy", `unexpected result for ${JSON.stringify(detail)}`);
    }
});

test("the result is ALWAYS a string — the property the crash depended on", () => {
    const shapes: unknown[] = [
        "text",
        [{ msg: "a" }],
        { msg: "b" },
        [{ loc: ["body"], ctx: { reason: "nested" } }],
        [[["deeply", "nested"]]],
        null,
    ];
    for (const shape of shapes) {
        assert.equal(typeof normalizeApiError(shape, "fb"), "string");
    }
});

// ── normalizeEmail ───────────────────────────────────────────────────────
// Defect: case-sensitive unique column + exact-match lookups meant
// "QA.Audit@x.com" and "qa.audit@x.com" became two accounts (ids 687/688).

test("emails are trimmed and lower-cased", () => {
    assert.equal(normalizeEmail("  Ahmed@Gmail.COM "), "ahmed@gmail.com");
});

test("normalising is idempotent", () => {
    const once = normalizeEmail(" Mixed@Case.Com ");
    assert.equal(normalizeEmail(once), once);
});

test("case variants collapse to one identity", () => {
    const variants = ["user@x.com", "User@X.com", "USER@X.COM", " user@x.com "];
    const canonical = new Set(variants.map(normalizeEmail));
    assert.equal(canonical.size, 1, "case variants must resolve to a single account");
});

// ── auth-nav contract ────────────────────────────────────────────────────
// The three nav renderers share this file; a missing key means one surface
// renders an empty label or a dead link.

test("the auth-nav contract is complete in BOTH languages", () => {
    for (const lang of ["en", "ar"] as const) {
        for (const key of ["signIn", "createAccount", "signOut", "account"] as const) {
            const value = authNav.labels[lang][key];
            assert.ok(value && value.trim(), `auth-nav.labels.${lang}.${key} is empty`);
        }
    }
});

test("Arabic labels are actually Arabic (not an untranslated copy)", () => {
    for (const key of ["signIn", "createAccount", "signOut", "account"] as const) {
        assert.notEqual(
            authNav.labels.ar[key],
            authNav.labels.en[key],
            `auth-nav.labels.ar.${key} is still the English string`
        );
        assert.ok(/[؀-ۿ]/.test(authNav.labels.ar[key]), `ar.${key} contains no Arabic`);
    }
});

test("account routes are same-origin relative paths", () => {
    for (const [name, href] of Object.entries(authNav.routes)) {
        assert.ok(/^\/(?![/\\])/.test(href), `route ${name} ("${href}") must be a relative path`);
    }
});

test("storage keys match the ones the app has always written", () => {
    // Changing these silently signs every existing visitor out.
    assert.equal(authNav.storage.token, "fh_auth_token");
    assert.equal(authNav.storage.user, "fh_user");
    assert.equal(authNav.storage.refresh, "fh_refresh_token");
});

// ── JWT expiry ───────────────────────────────────────────────────────────
// Defect: the session was read straight out of localStorage with NO expiry
// check, so a JWT that died weeks ago still rendered as "signed in" until some
// API call happened to 401.

test("an expired token is expired", () => {
    const past = Math.floor(Date.now() / 1000) - 60;
    assert.equal(isExpired(jwt({ sub: "a@b.com", exp: past })), true);
});

test("a live token is not expired", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    assert.equal(isExpired(jwt({ sub: "a@b.com", exp: future })), false);
});

test("a token expiring right now is treated as expired", () => {
    assert.equal(isExpired(jwt({ exp: Math.floor(Date.now() / 1000) })), true);
});

test("absent/garbage tokens never crash and never show a false session", () => {
    assert.equal(isExpired(null), true, "no token is not a session");
    assert.equal(isExpired(""), true, "empty token is not a session");
    // Unreadable `exp` fails OPEN by design: our backend always sets one, so an
    // undecodable claim means a decoding edge case, and signing a real user out
    // over that is worse than a redundant 401.
    assert.equal(isExpired("not-a-jwt"), false);
    assert.equal(isExpired("a.b.c"), false);
    assert.equal(isExpired(jwt({ sub: "a@b.com" })), false, "no exp claim");
});

test("base64url payloads decode without padding errors", () => {
    // Payload lengths that land on each base64 padding remainder; an unpadded
    // atob() throws, which would have been read as "unreadable → live".
    for (const pad of ["a", "ab", "abc", "abcd"]) {
        const future = Math.floor(Date.now() / 1000) + 3600;
        assert.equal(isExpired(jwt({ sub: `${pad}@x.com`, exp: future })), false, pad);
    }
});

test("a non-ASCII name in the payload decodes correctly", () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    assert.equal(isExpired(jwt({ sub: "محمد@example.com", exp: future })), false);
});

// ── THE SESSION OBSERVER CONTRACT ────────────────────────────────────────
// THE defect: contexts/AuthContext.tsx read the session once on mount and never
// subscribed, while components/seo/NavAuth.tsx did. Sign in with Google — which
// writes the session directly and then router.replace()s, so the provider is
// never remounted — and the nav showed the account while every RegisterGate /
// BlurGate on the page still asked the reader to create one, until F5. Sign-out
// was the inverse: NavAuth calls clearSession() itself, so the gates stayed OPEN
// for a visitor who had just left.
//
// The fix relies entirely on writeSession/clearSession broadcasting and
// subscribeSession delivering, in this tab AND from another one. That mechanism
// is pinned here; the wiring itself is source-gated in
// scripts/verify-route-aliases.mjs ("AuthContext subscribes to the session").

/** Minimal DOM for lib/auth-session.ts, which is browser-only by design. */
function installBrowserShim() {
    const store = new Map<string, string>();
    const target = new EventTarget();
    const win = {
        addEventListener: target.addEventListener.bind(target),
        removeEventListener: target.removeEventListener.bind(target),
        dispatchEvent: target.dispatchEvent.bind(target),
    };
    const storage = {
        getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
    };
    Object.assign(globalThis, { window: win, localStorage: storage });
    return {
        store,
        /** Simulate another tab writing the session (a real `storage` event). */
        fireStorage(key: string | null) {
            const event = new Event("storage");
            Object.defineProperty(event, "key", { value: key });
            target.dispatchEvent(event);
        },
        teardown() {
            delete (globalThis as Record<string, unknown>).window;
            delete (globalThis as Record<string, unknown>).localStorage;
        },
    };
}

const LIVE = jwt({ sub: "osama@example.com", exp: Math.floor(Date.now() / 1000) + 3600 });
const OSAMA: SessionUser = {
    id: 1, email: "osama@example.com", full_name: "Osama Test",
    phone: null, role: "user",
};

test("a sign-in written OUTSIDE the context reaches a subscriber (the Google path)", () => {
    const dom = installBrowserShim();
    try {
        let observed = 0;
        let seen: SessionUser | null = null;
        const unsubscribe = subscribeSession(() => {
            observed += 1;
            seen = readSession().user;
        });

        assert.equal(readSession().status, "none", "starts signed out");
        // Exactly what app/login/page.tsx does on the Google hand-off.
        writeSession(LIVE, OSAMA, LIVE);

        assert.equal(observed, 1, "the subscriber was not told about the sign-in");
        assert.equal(seen!.email, "osama@example.com");
        unsubscribe();
    } finally {
        dom.teardown();
    }
});

test("a sign-out written OUTSIDE the context reaches a subscriber (NavAuth's button)", () => {
    const dom = installBrowserShim();
    try {
        writeSession(LIVE, OSAMA, LIVE);
        assert.equal(readSession().status, "active");

        let seen: SessionUser | null = OSAMA;
        const unsubscribe = subscribeSession(() => { seen = readSession().user; });
        clearSession();
        assert.equal(seen, null, "gates would have stayed open after sign-out");
        unsubscribe();
    } finally {
        dom.teardown();
    }
});

test("a sign-in in ANOTHER tab reaches a subscriber", () => {
    const dom = installBrowserShim();
    try {
        let seen: SessionUser | null = null;
        const unsubscribe = subscribeSession(() => { seen = readSession().user; });

        // Another tab writes storage directly: no CustomEvent, only `storage`.
        dom.store.set(SESSION_KEYS.token, LIVE);
        dom.store.set(SESSION_KEYS.user, JSON.stringify(OSAMA));
        dom.fireStorage(SESSION_KEYS.token);

        assert.equal(seen!.email, "osama@example.com");
        unsubscribe();
    } finally {
        dom.teardown();
    }
});

test("unsubscribing actually detaches — no listener leak across route changes", () => {
    const dom = installBrowserShim();
    try {
        let observed = 0;
        subscribeSession(() => { observed += 1; })();   // subscribe, then unsubscribe
        writeSession(LIVE, OSAMA, LIVE);
        assert.equal(observed, 0, "listener survived its own teardown");
    } finally {
        dom.teardown();
    }
});

console.log(`\n✅ auth session/error assertions passed (${passed} cases)`);
