"use client";

/**
 * ============================================================================
 * AUTH CONTEXT — React's view of the canonical client session
 * ============================================================================
 *
 * The session itself (storage keys, JWT expiry, cross-tab notification) lives in
 * lib/auth-session.ts, which the static-page nav renderer mirrors. This context
 * is the React binding on top of it, so a sign-in performed here is observed by
 * every nav on the page — including the vanilla one on the static HTML pages —
 * without a reload.
 *
 * Three defects this replaced:
 *  1. The session was read straight out of localStorage with no expiry check, so
 *     a long-dead JWT still rendered as "signed in" until some API call
 *     happened to 401.
 *  2. Errors were surfaced as `error.detail`, which for any 422 is an ARRAY of
 *     Pydantic error objects. It reached `{error}` in JSX and crashed the page
 *     with "Objects are not valid as a React child" — reachable in production by
 *     typing an address like `ahmed@gmail`, which the browser's own type="email"
 *     check accepts. Everything now goes through readApiError().
 *  3. This context READ the session once on mount and never again, so it was the
 *     only reader on the site that could not see a sign-in it had not performed
 *     itself. components/seo/NavAuth.tsx subscribes; this did not. The visible
 *     result: sign in with Google (app/login/page.tsx writes the session
 *     directly, then router.replace()s — a client-side navigation, so this
 *     provider is never remounted), and the nav showed the account while every
 *     RegisterGate / BlurGate on the destination page still asked the reader to
 *     create one. Only F5 cleared it. Sign-OUT was the same defect inverted:
 *     NavAuth calls clearSession() itself, so the gates stayed OPEN for a
 *     visitor who had just left. Fixed by subscribing — see SESSION OBSERVER.
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
    readSession,
    writeSession,
    clearSession,
    subscribeSession,
    SESSION_KEYS,
    type SessionUser,
} from "@/lib/auth-session";
import { readApiError, normalizeEmail } from "@/lib/auth-errors";

// ============================================================
// TYPES
// ============================================================

export type User = SessionUser;

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    getToken: () => string | null;
    updateUser: (userData: Partial<User>) => void;
}

interface RegisterData {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore the session on mount. readSession() validates the JWT's `exp`, so
    // an expired token no longer leaves a ghost signed-in UI.
    useEffect(() => {
        const session = readSession();
        setUser(session.user);
        setIsLoading(false);

        if (session.status === "none") return;

        // Legacy-session bridge + silent revival:
        //  - "stale": the access token has expired but a live refresh token can
        //    mint a new one, so do it before the user hits a 401.
        //  - "active" with no stored refresh token: a session from before
        //    refresh tokens existed; mint one so it survives expiry.
        let needsRefresh = session.status === "stale";
        try {
            needsRefresh ||= !localStorage.getItem(SESSION_KEYS.refresh);
        } catch {
            /* storage unavailable */
        }
        if (!needsRefresh) return;

        void fetch(`/api/proxy/auth/bootstrap-refresh`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.token}`,
                "Content-Type": "application/json",
            },
            credentials: "include",
        })
            .then((res) => (res.ok ? res.json().catch(() => null) : null))
            .then((data) => {
                if (!data?.access_token || !data?.user) {
                    // A stale session that cannot be revived is a dead session:
                    // sign out rather than leaving a nav that lies.
                    if (session.status === "stale") {
                        clearSession();
                        setUser(null);
                    }
                    return;
                }
                writeSession(data.access_token, data.user, data.refresh_token);
                setUser(data.user);
            })
            .catch(() => {
                // Network failure is not proof the session is dead — keep it and
                // let the next authenticated call decide.
            });
    }, []);

    /**
     * ── SESSION OBSERVER ────────────────────────────────────────────────────
     * The session is NOT owned by this provider. It is owned by
     * lib/auth-session.ts, and four other places write to it: the Google
     * hand-off in app/login/page.tsx, app/register/page.tsx, NavAuth's sign-out
     * button, and the vanilla renderer on the static HTML pages — none of which
     * go through login()/logout() here. Before this effect, every one of those
     * writes left React's copy of `user` stale until a full page load, which is
     * what made a signed-in reader keep seeing "create a free account" on the
     * gated blocks (defect 3 above).
     *
     * subscribeSession covers BOTH directions: the `starta:session` event for
     * this tab and `storage` for the others. It is the same subscription
     * components/seo/NavAuth.tsx uses, so the nav and the gates can no longer
     * disagree about who is signed in.
     *
     * `isLoading` is deliberately untouched here. RegisterGate's SSR contract
     * depends on it starting true and clearing exactly once, in the mount
     * effect above, so the server and the hydrating client render the children
     * unwrapped. A session change is not a loading state.
     *
     * A separate effect rather than merging into the restore above: that one
     * early-returns in three places, and a subscription whose teardown hung off
     * those returns would leak the listener. useSyncExternalStore is not usable
     * either — readSession() builds a fresh object on every call, so it has no
     * referentially stable snapshot.
     */
    useEffect(() => subscribeSession(() => setUser(readSession().user)), []);

    const getToken = useCallback((): string | null => readSession().token, []);

    const login = useCallback(
        async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
            try {
                const formData = new URLSearchParams();
                // Normalised so "Ahmed@Gmail.com" signs into the account created
                // as "ahmed@gmail.com" (see normalizeEmail).
                formData.append("username", normalizeEmail(email));
                formData.append("password", password);

                const response = await fetch(`/api/v1/auth/token`, {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: formData.toString(),
                    credentials: "include",
                });

                if (!response.ok) {
                    return { success: false, error: await readApiError(response, "Login failed") };
                }

                const data = await response.json();
                if (!data?.access_token || !data?.user) {
                    return { success: false, error: "Login failed" };
                }

                writeSession(data.access_token, data.user, data.refresh_token);
                setUser(data.user);
                return { success: true };
            } catch (error) {
                console.error("Login error:", error);
                return { success: false, error: "Login failed" };
            }
        },
        []
    );

    const register = useCallback(
        async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
            try {
                const response = await fetch(`/api/v1/auth/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...data, email: normalizeEmail(data.email) }),
                    credentials: "include",
                });

                if (!response.ok) {
                    return {
                        success: false,
                        error: await readApiError(response, "Registration failed"),
                    };
                }

                const result = await response.json();
                // A 200 with no token would silently "succeed" into a signed-out
                // session; treat it as the failure it is.
                if (!result?.access_token || !result?.user) {
                    return { success: false, error: "Registration failed" };
                }

                writeSession(result.access_token, result.user, result.refresh_token);
                setUser(result.user);
                return { success: true };
            } catch (error) {
                console.error("Registration error:", error);
                return { success: false, error: "Registration failed" };
            }
        },
        []
    );

    const logout = useCallback(() => {
        clearSession();
        setUser(null);
    }, []);

    const updateUser = useCallback((userData: Partial<User>) => {
        setUser((prev) => {
            if (!prev) return null;
            const updated = { ...prev, ...userData };
            try {
                localStorage.setItem(SESSION_KEYS.user, JSON.stringify(updated));
            } catch {
                /* storage unavailable */
            }
            return updated;
        });
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
                getToken,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================
// HOOK
// ============================================================

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
