'use client';

/**
 * ============================================================================
 * THE REGISTRATION GATE — one implementation for every React surface
 * ============================================================================
 *
 * Read REGISTRATION_STRATEGY.md before using this. The short version: it may
 * only wrap PERSONAL or DERIVED value. It may never wrap something a search
 * query asks for. Organic search is this site's only channel and the domain is
 * young; a gate over an indexed answer trades the channel for a sign-up.
 *
 * THREE PROPERTIES MAKE IT SAFE, AND ALL THREE ARE LOad-BEARING
 *
 *  1. THE SERVER ALWAYS RENDERS THE CHILDREN. `useAuth().isLoading` starts true
 *     and only clears in an effect, so during SSR — and during the hydrating
 *     client render — `locked` is false and this returns its children verbatim,
 *     no wrapper at all. The HTML is therefore identical for every visitor,
 *     which is also what the edge cache in middleware.ts requires: it serves one
 *     shared document per URL, so any per-user server branching would poison it
 *     for everyone.
 *
 *  2. THE CHILDREN ARE NEVER REMOVED. A locked visitor gets them clipped and
 *     blurred inside `.starta-gate-clip`, with a card on top. Nothing is
 *     withheld from the document.
 *
 *  3. BECAUSE OF (2), THE PAGE MUST DECLARE THE GATE. Content in the HTML that a
 *     person cannot read is cloaking unless it is declared with
 *     `isAccessibleForFree: false` — Google applies this to free registration
 *     walls exactly as to paid ones. Use `withGateDeclaration` from
 *     lib/paywall-jsonld.ts on the page's existing JSON-LD. The wrapper class
 *     below is the `cssSelector` that declaration names.
 *
 * The return path is preserved: a visitor who registers from a gate lands back
 * where they were, not on a generic dashboard.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStoredLang } from '@/hooks/useStoredLang';
import { GATE_LABELS, GATED_CLASS, type GateReason, type GateCopy } from '@/lib/gate-i18n';

function LockIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2.5" />
            <path strokeLinecap="round" d="M8 10V7a4 4 0 018 0v3" />
        </svg>
    );
}

export interface RegisterGateProps {
    /** Which capability is gated. Selects the copy; see lib/gate-i18n.ts. */
    reason?: GateReason;
    /**
     * Explicit copy, for a surface that already owns its wording — the fund
     * analytics gate does. Takes precedence over `reason`.
     */
    copy?: GateCopy;
    /** A narrow one-line variant for sidebars, where the panel would not fit. */
    compact?: boolean;
    children: React.ReactNode;
}

export default function RegisterGate({ reason, copy, compact = false, children }: RegisterGateProps) {
    const { user, isLoading } = useAuth();
    const lang = useStoredLang();
    const pathname = usePathname();

    // Unlocked during SSR and the hydrating render (isLoading), and for anyone
    // signed in. Only a RESOLVED guest sees a gate — see property (1) above.
    const locked = !isLoading && !user;
    if (!locked) return <>{children}</>;

    const t = copy ?? (reason ? GATE_LABELS[lang].reasons[reason] : undefined);
    if (!t) return <>{children}</>;

    // Come back to the page they were on, not to a dashboard. sanitizeReturnPath
    // in lib/post-login.ts validates this on arrival.
    const back = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
    const registerHref = `/register${back}`;
    const signinHref = `/login${back}`;

    return (
        <div className={`starta-gate ${GATED_CLASS}${compact ? ' starta-gate--compact' : ''}`}>
            {/* aria-hidden + pointer-events:none: a screen reader should not read
                out a wall of text its user cannot act on, and a keyboard user
                should not tab into it. The text stays in the DOM for crawlers,
                which is the whole reason the page must declare the gate. */}
            <div className="starta-gate-clip" aria-hidden="true">{children}</div>

            <div className="starta-gate-panel">
                <span className="starta-gate-lock"><LockIcon /></span>
                {compact ? (
                    <>
                        <p className="text-sm font-semibold text-main">{t.compact}</p>
                        <Link href={registerHref} className="starta-gate-cta mt-3">{t.cta}</Link>
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-display font-bold tracking-[-0.02em] text-main sm:text-xl">{t.title}</h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{t.body}</p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                            <Link href={registerHref} className="starta-gate-cta">{t.cta}</Link>
                            <Link href={signinHref} className="starta-gate-signin">{t.signin}</Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
