'use client';

/**
 * ============================================================================
 * BLUR GATE — the fund page's pattern, made reusable
 * ============================================================================
 *
 * The owner's reference is the fund page: the analysis sits there, softly
 * blurred, with one calm card over it offering the free account that opens it.
 * It reads as part of the design because it IS the section, just veiled —
 * nothing is appended, nothing is inserted between blocks, and the page's
 * rhythm is untouched. That is the whole difference between this and the strip
 * that was rejected.
 *
 * ══ WHERE IT MAY BE USED, AND THE TEST THAT DECIDES ═════════════════════════
 * Only around a block that is NOT in the server-rendered HTML.
 *
 * That test is not a formality. When gated content IS in the HTML, a crawler
 * reads what a person cannot, and the page then has to declare it with
 * `isAccessibleForFree: false` or it is cloaking (see lib/paywall-jsonld.ts,
 * and the fund page, which does exactly that). When the block is client-only,
 * there is nothing to declare because there is nothing a crawler was ever
 * shown — the cost to search and to answer engines is exactly zero.
 *
 * Verified for the symbol page before using it there: neither the ownership
 * block nor the key-metrics block appears in the server response for
 * /symbol/COMI. The whole of SymbolPageClient is `"use client"` and the
 * indexable body comes from components/seo/SymbolSeoSection.tsx, which is
 * untouched and must stay that way.
 *
 * Before wrapping anything new:
 *     curl -s https://startamarkets.com/<path> | grep -c "<a phrase from it>"
 * If that is not 0, do not wrap it here.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStoredLang } from '@/hooks/useStoredLang';

function LockIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2.5" />
            <path strokeLinecap="round" d="M8 10V7a4 4 0 018 0v3" />
        </svg>
    );
}

const COPY = {
    en: {
        cta: 'Create a free account',
        signin: 'Sign in',
        ownership: {
            title: 'See who holds this company',
            body: 'Free float, shares outstanding and the ownership split — free with an account.',
        },
        technicals: {
            title: 'Open the technical read',
            body: 'Oscillator, moving-average and summary gauges across every timeframe — free with an account.',
        },
        forecasts: {
            title: 'See the earnings forecasts',
            body: 'Analyst estimates and the price target for this company — free with an account.',
        },
    },
    ar: {
        cta: 'أنشئ حسابًا مجانيًا',
        signin: 'تسجيل الدخول',
        ownership: {
            title: 'اعرف من يملك هذه الشركة',
            body: 'التداول الحر وعدد الأسهم وتوزيع الملكية — مجانًا مع الحساب.',
        },
        technicals: {
            title: 'افتح القراءة الفنية',
            body: 'مؤشرات التذبذب والمتوسطات المتحركة والملخص على كل الأطر الزمنية — مجانًا مع الحساب.',
        },
        forecasts: {
            title: 'اطّلع على توقعات الأرباح',
            body: 'تقديرات المحللين والسعر المستهدف لهذه الشركة — مجانًا مع الحساب.',
        },
    },
} as const;

export type BlurReason = 'ownership' | 'technicals' | 'forecasts';

export interface BlurGateProps {
    reason: BlurReason;
    /** Narrow slots get a tighter clip and a centred card. */
    compact?: boolean;
    children: React.ReactNode;
}

export default function BlurGate({ reason, compact = false, children }: BlurGateProps) {
    const { user, isLoading } = useAuth();
    const lang = useStoredLang();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Unlocked during SSR, during hydration, and for anyone signed in. Only a
    // RESOLVED guest ever sees the veil — the same rule the fund gate follows,
    // and what keeps the markup identical for every visitor.
    const locked = mounted && !isLoading && !user;
    if (!locked) return <>{children}</>;

    const t = COPY[lang];
    const c = t[reason];
    const back = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';

    return (
        <div className={`starta-gate${compact ? ' starta-gate--compact' : ''}`}>
            <div className="starta-gate-clip" aria-hidden="true">{children}</div>
            <div className="starta-gate-panel">
                <span className="starta-gate-lock"><LockIcon /></span>
                <h3 className="text-lg font-display font-bold tracking-[-0.02em] text-main">{c.title}</h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{c.body}</p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <Link href={`/register${back}`} className="starta-gate-cta">{t.cta}</Link>
                    <Link href={`/login${back}`} className="starta-gate-signin">{t.signin}</Link>
                </div>
            </div>
        </div>
    );
}
