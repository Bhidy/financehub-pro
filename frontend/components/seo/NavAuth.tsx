'use client';

/**
 * ============================================================================
 * NAV AUTH CONTROLS — the one React rendering of the session in the nav bar
 * ============================================================================
 *
 * WHY THIS COMPONENT EXISTS
 * The site had three nav renderers and only one of them knew about auth:
 *   - public/assets/starta-lang-boot.js painted "Sign In / Create Account"
 *     UNCONDITIONALLY onto all 13 static pages (including / and /Funds — the
 *     page a user lands on immediately after registering)
 *   - components/seo/PublicPageShell.tsx hardcoded the same two links
 *     server-side across ~40 App Router routes
 *   - components/SiteNav.tsx was auth-aware, but renders only inside the
 *     hidden chatbot page
 * So a freshly-registered user was told to "Create Account" on every page of
 * the site, and /settings — which works perfectly — had no inbound link at all.
 *
 * Both React renderers now mount THIS component; the static HTML pages get the
 * byte-identical markup from public/assets/starta-auth-nav.js. Labels, routes
 * and storage keys all come from lib/auth-nav.json, and the static mirror is
 * build-gated, so the three surfaces cannot drift apart again.
 *
 * SSR / HYDRATION CONTRACT
 * The server cannot know who the visitor is (the session lives in
 * localStorage), so the first paint is always the signed-out pair. That is
 * deliberate: it is the correct markup for crawlers and for genuinely
 * signed-out visitors, i.e. the overwhelming majority of requests, and it keeps
 * the server and client trees identical on the first render — swapping in the
 * account state during hydration would be a hydration mismatch. The signed-in
 * state is applied in an effect, one frame later, into the same-width slot so
 * nothing reflows.
 */

import { useEffect, useState } from 'react';
import authNav from '@/lib/auth-nav.json';
import {
    readSession,
    subscribeSession,
    displayName,
    displayInitial,
    type Session,
} from '@/lib/auth-session';

type Lang = 'en' | 'ar';

interface NavAuthProps {
    lang: Lang;
    /** Called after the session is cleared (e.g. to route the user home). */
    onSignOut?: () => void;
}

const SIGNED_OUT: Session = { status: 'none', user: null, token: null };

export default function NavAuth({ lang, onSignOut }: NavAuthProps) {
    // Always start signed-out so the client's first render matches the server's.
    const [session, setSession] = useState<Session>(SIGNED_OUT);
    const t = authNav.labels[lang] ?? authNav.labels.en;

    useEffect(() => {
        const sync = () => setSession(readSession());
        sync();
        // Re-reads on sign-in/out in this tab (starta:session) and in others
        // (storage), so registering in one tab updates every open surface.
        return subscribeSession(sync);
    }, []);

    const handleSignOut = () => {
        // Imported lazily so a signed-out page never pulls the writer path.
        void import('@/lib/auth-session').then(({ clearSession }) => {
            clearSession();
            setSession(SIGNED_OUT);
            onSignOut?.();
        });
    };

    if (session.status === 'none') {
        return (
            <div className="starta-auth-links" data-starta-auth="out">
                <a href={authNav.routes.signIn} className="starta-auth-link">
                    {t.signIn}
                </a>
                <a href={authNav.routes.createAccount} className="starta-auth-cta">
                    {t.createAccount}
                </a>
            </div>
        );
    }

    return (
        <div className="starta-auth-links" data-starta-auth="in">
            <a
                href={authNav.routes.account}
                className="starta-auth-account"
                title={session.user?.email ?? t.account}
            >
                <span className="starta-auth-avatar" aria-hidden="true">
                    {displayInitial(session.user)}
                </span>
                <span className="starta-auth-name">{displayName(session.user) || t.account}</span>
            </a>
            <button type="button" onClick={handleSignOut} className="starta-auth-signout">
                {t.signOut}
            </button>
        </div>
    );
}
