'use client';

/**
 * ============================================================================
 * THE INVITATION — Tier 3 of the registration strategy
 * ============================================================================
 *
 * NOT A GATE. It hides nothing, blocks nothing and counts nothing down. After a
 * visitor has looked at several DISTINCT things over a rolling month, one
 * dismissible line appears in the flow of the page offering to keep them.
 * Dismiss it once and it never comes back.
 *
 * This is what stands in for a meter, deliberately. A meter is the one pattern
 * that can cost this site its rankings: the average visitor reads under two
 * items in a session, so a meter set anywhere they would actually reach it is a
 * meter that blocks search traffic. An invitation fires on the same signal —
 * demonstrated interest — and removes nothing to do it.
 *
 * ══ WHY IT BORROWS ITS RULE FROM A VANILLA SCRIPT ═══════════════════════════
 * The threshold, the rolling window, the distinct-item counting and the
 * dismissal all live in public/assets/starta-gate.js, because the same
 * invitation has to work on the static HTML hubs, which have no React. Keeping
 * the RULE in one file and letting each side render its own DOM is the pattern
 * the nav and the gate already use. What this component must not do is
 * re-implement the counting — two implementations of "how many is several"
 * would drift, and drift here means a visitor sees the line at four items on
 * one page and at six on another.
 *
 * ══ WHY IT RENDERS NOTHING ON THE SERVER ════════════════════════════════════
 * It reads localStorage, so it can only decide after mount. That is also what
 * keeps it invisible to crawlers: the line never enters the server HTML, so it
 * cannot dilute a page's indexable content or displace anything above it.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStoredLang } from '@/hooks/useStoredLang';
import { GATE_LABELS } from '@/lib/gate-i18n';

declare global {
    interface Window {
        startaGate?: {
            isSignedIn: () => boolean;
            noteVisit: (id: string) => void;
            shouldInvite: () => boolean;
            dismissInvite: () => void;
            inviteAfter: number;
        };
    }
}

export interface RegisterInviteProps {
    /**
     * A stable identity for the thing being read — a fund id, an article id, a
     * ticker. DISTINCT ids are what get counted, so re-reading one article five
     * times is one item and a refresh cannot manufacture a prompt.
     */
    itemId: string;
}

export default function RegisterInvite({ itemId }: RegisterInviteProps) {
    const { user, isLoading } = useAuth();
    const lang = useStoredLang();
    const pathname = usePathname();
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Wait for auth to resolve: counting a signed-in reader's visits would
        // arm the line for them the moment they ever signed out.
        if (isLoading || user) return;
        const gate = window.startaGate;
        if (!gate) return;
        gate.noteVisit(itemId);
        setShow(gate.shouldInvite());
    }, [itemId, isLoading, user]);

    if (!show) return null;

    const t = GATE_LABELS[lang].invite;
    const back = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';

    return (
        <div className="starta-invite">
            <span className="starta-invite-text">
                <span className="starta-invite-title">{t.title}</span>
                <span className="starta-invite-body">{t.body}</span>
            </span>
            <Link href={`/register${back}`} className="starta-gate-cta">{t.cta}</Link>
            <button
                type="button"
                className="starta-invite-dismiss"
                onClick={() => {
                    window.startaGate?.dismissInvite();
                    setShow(false);
                }}
            >
                {t.dismiss}
            </button>
        </div>
    );
}
