'use client';

/**
 * Freemium gate — "free account unlocks all" (the chosen model). The server always
 * renders the children (so SSR/SEO see the analytics), then on the client, once auth
 * resolves, guests get a blurred preview + a "create free account" overlay. Logged-in
 * users see the full content untouched. No paid tier, no Stripe — pure auth check.
 */

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { FundLabels } from './fund-i18n';

function LockIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2.5" />
            <path strokeLinecap="round" d="M8 10V7a4 4 0 018 0v3" />
        </svg>
    );
}

export default function FundGate({ t, children }: { t: FundLabels; children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    // Unlock during SSR + hydration (isLoading) so content is always in the HTML;
    // only a resolved guest sees the gate. Avoids hiding content from logged-in users.
    const locked = !isLoading && !user;
    const ax = t.ax;

    if (!locked) return <>{children}</>;

    return (
        <div className="fund-gate">
            <div className="fund-gate-clip" aria-hidden="true">{children}</div>
            <div className="fund-gate-panel">
                <span className="fund-gate-lock"><LockIcon /></span>
                <h3 className="text-lg font-display font-bold tracking-[-0.02em] text-main sm:text-xl">{ax.gateTitle}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{ax.gateBody}</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <Link href="/register" className="fund-gate-cta">{ax.gateCta}</Link>
                    <Link href="/login" className="fund-gate-signin">{ax.gateSignin}</Link>
                </div>
            </div>
        </div>
    );
}
