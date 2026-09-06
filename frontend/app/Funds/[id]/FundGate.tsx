'use client';

/**
 * The fund analytics gate. It is now a thin adapter over the ONE gate
 * (components/gate/RegisterGate.tsx) rather than a second implementation.
 *
 * It keeps its own wording because that wording is specific and good — "unlock
 * the full analysis" is honest here, where a real body of derived analysis is
 * genuinely withheld. Elsewhere that sentence would be filler; see the writing
 * rule in lib/gate-i18n.ts.
 *
 * What changed underneath: the markup and CSS moved to the shared component and
 * public/assets/starta-gate.css, so the gate works on any surface instead of
 * only inside `.fund-premium`; the register and sign-in links now carry a
 * return path, so a visitor who signs up from here comes back to this fund
 * rather than landing on a generic page; and the page it sits on now declares
 * the gate in its structured data, which it never did.
 */

import RegisterGate from '@/components/gate/RegisterGate';
import type { FundLabels } from './fund-i18n';

export default function FundGate({ t, children, compact = false }: { t: FundLabels; children: React.ReactNode; compact?: boolean }) {
    const ax = t.ax;
    return (
        <RegisterGate
            compact={compact}
            copy={{
                title: ax.gateTitle,
                body: ax.gateBody,
                cta: ax.gateCta,
                signin: ax.gateSignin,
                compact: ax.gateCompact,
            }}
        >
            {children}
        </RegisterGate>
    );
}
