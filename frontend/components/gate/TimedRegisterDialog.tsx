'use client';

/**
 * ============================================================================
 * THE TIMED INVITATION — one dialog, fifteen seconds in, on chosen pages only
 * ============================================================================
 *
 * WHAT THIS REPLACED, AND WHY
 * The previous attempt appended a bar into the page body. It was rejected on
 * sight, and correctly: this platform's pages are designed documents, and
 * injecting a strip of promotional furniture between their sections breaks the
 * composition no matter how tidy the strip is. A registration ask has to arrive
 * as its own layer, over the page, and then leave — not become a permanent
 * fixture inside a layout that was never drawn to hold it.
 *
 * THE RULES, ALL OF THEM DELIBERATE
 *   · Fifteen seconds of ACTIVE time on the page. Not on arrival: someone who
 *     landed from a search result has not been given the thing they came for
 *     yet, and interrupting then is how a bounce is manufactured.
 *   · NEVER on the home page. It is the front door and a shop window; a modal
 *     over it is the worst first impression a site can make.
 *   · Only on the pages listed in ELIGIBLE below — surfaces where somebody is
 *     researching rather than glancing.
 *   · Once per session, and once dismissed it does not come back that visit.
 *     Dismissed twice, it stops for a month.
 *   · Never for signed-in visitors, and never while any other gate dialog is
 *     already open.
 *   · The timer counts only while the tab is VISIBLE. Fifteen seconds in a
 *     background tab is not fifteen seconds of reading.
 *
 * ══ AND IT COSTS NOTHING IN SEARCH OR IN ANSWER ENGINES ═════════════════════
 * It renders nothing at all until the timer fires in a real browser, so it is
 * absent from the server HTML, from what Googlebot indexes, and from what
 * GPTBot, ClaudeBot and PerplexityBot read. No content is removed, hidden or
 * reordered to make room for it — it is a layer, not a section.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStoredLang } from '@/hooks/useStoredLang';

/** Active seconds on the page before it may appear. */
const DELAY_MS = 15000;
const SESSION_KEY = 'starta-timed-shown';
const SNOOZE_KEY = 'starta-timed-snooze';
const SNOOZE_COUNT_KEY = 'starta-timed-dismissals';
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Where it is allowed to appear. Research surfaces only.
 *
 * The home page is absent on purpose and must stay absent. So are /login,
 * /register and /settings — asking someone to register while they are signing
 * in is the kind of detail that makes a product feel unattended.
 */
const ELIGIBLE = [
    /^\/(ar\/)?Funds\/[^/]+$/,      // a specific fund
    /^\/(ar\/)?symbol\/[^/]+$/,     // a specific company
    /^\/(ar\/)?News\/[^/]+$/,       // a specific article
    /^\/(ar\/)?Market-Pulse$/,
    /^\/(ar\/)?Funds$/,
    // Learn topics and the calculators: someone reading an explainer or
    // modelling a plan is researching, which is the state this asks in.
    /^\/(ar\/)?Learn\/[^/]+$/,
    /^\/(ar\/)?Calculators$/,
    /^\/(ar\/)?RiskAssessment$/,
];

function eligible(pathname: string | null): boolean {
    if (!pathname) return false;
    // The front door, in both languages. Never.
    if (pathname === '/' || pathname === '/ar' || pathname === '/ar/') return false;
    return ELIGIBLE.some((re) => re.test(pathname));
}

const COPY = {
    en: {
        title: 'Keep what you find here',
        body: 'A free account keeps your watchlist beyond this browser, saves the funds and companies you are looking at, compares more than two at once, and tells you when a price reaches your level.',
        cta: 'Create a free account',
        signin: 'I already have one',
        dismiss: 'Not now',
        close: 'Close',
    },
    ar: {
        title: 'احتفظ بما تجده هنا',
        body: 'الحساب المجاني يحفظ قائمة متابعتك خارج هذا المتصفح، ويحتفظ بالصناديق والشركات التي تطالعها، ويقارن أكثر من اثنين معًا، ويخبرك عند بلوغ السعر المستوى الذي تحدده.',
        cta: 'أنشئ حسابًا مجانيًا',
        signin: 'لديّ حساب بالفعل',
        dismiss: 'ليس الآن',
        close: 'إغلاق',
    },
} as const;

function LockIcon() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="4" y="10" width="16" height="11" rx="2.5" />
            <path strokeLinecap="round" d="M8 10V7a4 4 0 018 0v3" />
        </svg>
    );
}

export default function TimedRegisterDialog() {
    const { user, isLoading } = useAuth();
    const lang = useStoredLang();
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const suppressed = useCallback(() => {
        try {
            if (sessionStorage.getItem(SESSION_KEY) === '1') return true;
            // A permanent "no" to any other prompt silences this too.
            if (localStorage.getItem('starta-invite-off') === '1') return true;
            const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
            return Number.isFinite(until) && until > Date.now();
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        if (isLoading || user) return;
        if (!eligible(pathname)) return;
        if (suppressed()) return;

        let elapsed = 0;
        const STEP = 1000;
        const timer = window.setInterval(() => {
            // Only count time the tab is actually in front of the reader.
            if (document.visibilityState !== 'visible') return;
            elapsed += STEP;
            if (elapsed < DELAY_MS) return;
            window.clearInterval(timer);
            // Never stack on top of another gate that is already asking.
            if (document.querySelector('.starta-gate-dialog-root')) return;
            try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* private mode */ }
            setOpen(true);
        }, STEP);

        return () => window.clearInterval(timer);
    }, [pathname, isLoading, user, suppressed]);

    // Escape closes it, like any dialog.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey, true);
        return () => document.removeEventListener('keydown', onKey, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const close = () => {
        setOpen(false);
        try {
            // Second refusal earns a month of silence. Asking a third time is
            // how a prompt turns into the reason someone stops visiting.
            const n = Number(localStorage.getItem(SNOOZE_COUNT_KEY) || 0) + 1;
            localStorage.setItem(SNOOZE_COUNT_KEY, String(n));
            if (n >= 2) localStorage.setItem(SNOOZE_KEY, String(Date.now() + MONTH_MS));
        } catch { /* private mode */ }
    };

    if (!open) return null;

    const t = COPY[lang];
    const back = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';

    return (
        <div className="starta-gate-dialog-root" role="dialog" aria-modal="true" aria-label={t.title}>
            <div className="starta-gate-dialog-scrim" onClick={close} />
            <div className="starta-gate-panel starta-gate-dialog">
                <button type="button" className="starta-gate-dialog-close" onClick={close} aria-label={t.close}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                </button>
                <span className="starta-gate-lock"><LockIcon /></span>
                <h3 className="starta-gate-dialog-title">{t.title}</h3>
                <p className="starta-gate-dialog-body">{t.body}</p>
                <div className="starta-gate-dialog-actions">
                    <button type="button" className="starta-gate-cta" onClick={() => router.push(`/register${back}`)}>
                        {t.cta}
                    </button>
                    <button type="button" className="starta-gate-signin" onClick={() => router.push(`/login${back}`)}>
                        {t.signin}
                    </button>
                </div>
                <button type="button" className="starta-invite-dismiss mt-1" onClick={close}>{t.dismiss}</button>
            </div>
        </div>
    );
}
