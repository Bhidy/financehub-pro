"use client";

/**
 * ============================================================================
 * ADMIN GATE — the ONE authorization boundary for /admin/*
 * ============================================================================
 *
 * WHY THIS EXISTS
 * Each admin page carried its own copy of the check, and each was wrong in a
 * different way. Both defects surfaced to the owner as the same symptom:
 * "I open /admin and it just sends me to /login."
 *
 *   /admin/analytics  waited for auth to hydrate (correct), but on failure did
 *                     router.push('/login') with NO ?redirect=. So a signed-in
 *                     non-admin was bounced to a login form they were already
 *                     past — with nothing on screen explaining why — and an
 *                     admin who did sign in landed on /Funds, because
 *                     resolvePostAuthDestination() falls back to the default
 *                     destination when no return path was captured. Typing
 *                     /admin into the address bar leaves an empty referrer, so
 *                     nothing was ever captured, and the console was reachable
 *                     only by typing /admin a SECOND time after signing in.
 *
 *   /admin/users      destructured useAuth() WITHOUT isLoading and redirected
 *                     on `!isAuthenticated`. isAuthenticated is !!user, and
 *                     user is null on the first render while AuthProvider
 *                     restores the session from storage — so a hard load of
 *                     /admin/users redirected to /login EVERY time, for a real
 *                     admin too, before the session had a chance to exist.
 *
 * THE CONTRACT
 *   loading        render a spinner. Never decide during hydration.
 *   signed out     replace() to /login?redirect=<this path>. lib/post-login
 *                  honours an explicit redirect over the /Funds default, so
 *                  signing in returns the user to the console they asked for.
 *   not an admin   ask the SERVER before believing it (see below), then say so
 *                  on screen. A signed-in user is not helped by a login form —
 *                  they need to know which account they are on, what role it
 *                  has, and how to switch. Never bounce them.
 *   admin          render the console.
 *
 * WHY THE SERVER RE-CHECK
 * user.role comes from localStorage, stamped at login. Grant someone admin in
 * the database and their browser keeps saying "user" until they sign out and
 * back in — the API works, the UI refuses, and it looks like the grant failed.
 * /auth/me reads the role from the row on every call, so one request settles it.
 * (It is also why the cached role alone must never be the last word: that value
 * is editable in devtools. The data behind this console is protected server
 * side by require_admin — this check keeps the UI honest too.)
 *
 * Mounted once, in app/admin/layout.tsx, so every current and future page under
 * /admin inherits it. Pages must not re-implement the check.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { StartaLogo } from "@/components/brand/StartaLogo";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Where to send someone after they sign in from here.
 *
 * The fallback is /admin/users, the first console the rail offers — the same
 * destination bare /admin resolves to in middleware. It must not be a page
 * marked `hidden` in lib/admin-nav.ts: signing in only to land somewhere the
 * navigation no longer lists is how this went wrong before.
 */
function loginHref(pathname: string): string {
    return `/login?redirect=${encodeURIComponent(pathname || "/admin/users")}`;
}

function GateShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="admin-light min-h-screen bg-page flex items-center justify-center p-6">
            {children}
        </div>
    );
}

type ServerCheck = "idle" | "checking" | "settled";

export function AdminGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isLoading, logout, getToken, updateUser } = useAuth();
    const [serverCheck, setServerCheck] = useState<ServerCheck>("idle");
    // Ref, not the serverCheck state, guards "already asked". Putting serverCheck
    // in the effect's deps meant setServerCheck("checking") re-ran the effect,
    // whose cleanup then set cancelled=true on the very fetch it had just
    // started — the response arrived, the state never advanced, and the gate
    // span forever. A ref changes no dependency and cannot race itself.
    const askedServer = useRef(false);

    const isAdmin = user?.role === "admin";

    // Signed out — and only once the session has actually been restored.
    // Guarding on isLoading is the whole fix for /admin/users.
    useEffect(() => {
        if (isLoading) return;
        if (!isAuthenticated) router.replace(loginHref(pathname));
    }, [isLoading, isAuthenticated, pathname, router]);

    // Cached role says "not an admin" — confirm against the row before
    // believing it, so a fresh grant does not require a sign-out.
    useEffect(() => {
        if (isLoading || !isAuthenticated || isAdmin) return;
        if (askedServer.current) return;
        askedServer.current = true;

        const token = getToken();
        if (!token) {
            setServerCheck("settled");
            return;
        }

        let cancelled = false;
        setServerCheck("checking");

        fetch("/api/proxy/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        })
            .then((res) => (res.ok ? res.json().catch(() => null) : null))
            .then((fresh) => {
                if (cancelled) return;
                if (fresh?.role) updateUser({ role: fresh.role });
                setServerCheck("settled");
            })
            .catch(() => {
                // Offline or the backend is down: fall through to the denied
                // screen rather than spinning forever.
                if (!cancelled) setServerCheck("settled");
            });

        return () => {
            cancelled = true;
        };
    }, [isLoading, isAuthenticated, isAdmin, getToken, updateUser]);

    if (isLoading || !isAuthenticated || (!isAdmin && serverCheck !== "settled")) {
        return (
            <GateShell>
                <Loader2 className="w-7 h-7 animate-spin text-starta-teal" aria-label="Loading" />
            </GateShell>
        );
    }

    if (!isAdmin) {
        return (
            <GateShell>
                <div className="w-full max-w-md text-center">
                    <StartaLogo size="md" href="/" className="mb-10 justify-center w-full" />

                    <div className="bg-surface border border-border rounded-2xl p-8">
                        <span className="w-12 h-12 rounded-xl bg-starta-teal/10 text-starta-teal flex items-center justify-center mx-auto mb-5">
                            <ShieldAlert className="w-6 h-6" />
                        </span>

                        <h1 className="font-display text-xl font-bold text-main">
                            This account is not an administrator
                        </h1>

                        <p className="mt-3 text-sm text-muted leading-relaxed">
                            You are signed in, so there is nothing to log into here. The
                            console is restricted to accounts carrying the admin role.
                        </p>

                        {/* Stacked, not label-left/value-right: the whole point of
                            this panel is telling the operator WHICH account they
                            are on, and a long address truncated to "…@e…" answers
                            nothing. break-all over truncate, always. */}
                        <dl className="mt-6 rounded-xl border border-border divide-y divide-border text-left">
                            <div className="px-4 py-3">
                                <dt className="text-xs text-muted">Signed in as</dt>
                                <dd className="mt-1 text-sm text-main font-medium break-all">
                                    {user?.email}
                                </dd>
                            </div>
                            <div className="px-4 py-3">
                                <dt className="text-xs text-muted">Role</dt>
                                <dd className="mt-1 text-sm text-main font-mono">
                                    {user?.role ?? "user"}
                                </dd>
                            </div>
                        </dl>

                        <button
                            type="button"
                            onClick={() => {
                                logout();
                                router.replace(loginHref(pathname));
                            }}
                            className="mt-6 w-full h-11 rounded-xl bg-starta-teal text-white text-sm font-semibold hover:bg-starta-darkTeal transition-colors"
                        >
                            Sign in with a different account
                        </button>
                    </div>

                    <p className="mt-6 text-xs text-muted">
                        Grant the role with{" "}
                        <code className="font-mono text-main">promote_admin.py</code>, or the
                        “Admin — Grant Role” workflow.
                    </p>
                </div>
            </GateShell>
        );
    }

    return <>{children}</>;
}

export default AdminGate;
