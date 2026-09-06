'use client';

/**
 * ============================================================================
 * SAVE — the smallest registration driver, and the one that fires most often
 * ============================================================================
 *
 * The research behind the strategy is unambiguous about when people create an
 * account: after they have received value, not before, and in response to
 * something they were already trying to do. "Keep this" is that moment. The
 * reader is on a fund page because they are shortlisting; the button is not an
 * interruption, it is the next thing they wanted.
 *
 * ══ IT TAKES NOTHING AWAY ═══════════════════════════════════════════════════
 * This is the pattern the whole strategy is built on: ADD value that is born
 * behind an account, never fence off value that is already earning search
 * traffic. The fund page, the article and the company page under this button
 * are untouched and fully open. Nothing that was readable stops being readable.
 * Its own markup renders only after auth resolves in the browser, so it never
 * enters the server HTML and cannot dilute what a crawler or an answer engine
 * reads.
 *
 * ══ WHAT A GUEST SEES ═══════════════════════════════════════════════════════
 * The real button, in its real place, doing the real thing — and being asked to
 * register at the point of pressing it. Hiding the button from guests would
 * hide the reason to register; a visitor cannot want a feature they have never
 * seen. Pressing it opens the prompt with a return path, so signing up lands
 * them back here, and the item they were trying to keep is saved on arrival.
 *
 * The pending save survives the round trip in sessionStorage. Someone who
 * presses save, registers, and lands back on the page with nothing saved has
 * been made to do the work twice, which is exactly the experience that teaches
 * people not to bother next time.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStoredLang } from '@/hooks/useStoredLang';
import { listSaved, saveItem, unsaveItem, type SavedKind } from '@/lib/api';

const COPY = {
    en: {
        save: 'Save',
        saved: 'Saved',
        saving: 'Saving…',
        remove: 'Remove from saved',
        gateTitle: 'Keep this for later',
        gateBody: 'A free account keeps the funds, companies and articles you save, and has them waiting on your next visit.',
        gateCta: 'Create a free account',
        gateSignin: 'Sign in',
        failed: 'That did not save. Please try again.',
    },
    ar: {
        save: 'احفظ',
        saved: 'محفوظ',
        saving: 'جارٍ الحفظ…',
        remove: 'إزالة من المحفوظات',
        gateTitle: 'احتفظ به لوقت لاحق',
        gateBody: 'الحساب المجاني يحفظ ما تختاره من صناديق وشركات ومقالات، وتجده في انتظارك عند زيارتك القادمة.',
        gateCta: 'أنشئ حسابًا مجانيًا',
        gateSignin: 'تسجيل الدخول',
        failed: 'لم يتم الحفظ. برجاء المحاولة مرة أخرى.',
    },
} as const;

/** Survives the sign-up round trip so the press is not wasted. */
const PENDING_KEY = 'starta-pending-save';

function BookmarkIcon({ filled }: { filled: boolean }) {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    );
}

export interface SaveButtonProps {
    kind: SavedKind;
    refId: string;
    /** A short label for the thing, used only in the prompt. */
    label?: string;
    className?: string;
}

export default function SaveButton({ kind, refId, className = '' }: SaveButtonProps) {
    const { user, isLoading } = useAuth();
    const lang = useStoredLang();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [saved, setSaved] = useState(false);
    const [busy, setBusy] = useState(false);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState('');

    const t = COPY[lang];

    const persist = useCallback(async () => {
        setBusy(true); setError('');
        try {
            if (saved) {
                await unsaveItem(kind, refId);
                setSaved(false);
            } else {
                await saveItem(kind, refId);
                setSaved(true);
            }
        } catch {
            setError(t.failed);
        } finally {
            setBusy(false);
        }
    }, [kind, refId, saved, t.failed]);

    useEffect(() => { setMounted(true); }, []);

    // Reflect what the account already holds, and complete any save that was
    // interrupted by signing up.
    useEffect(() => {
        if (isLoading || !user) return;
        let alive = true;
        (async () => {
            try {
                const rows = await listSaved(kind);
                if (!alive) return;
                setSaved(rows.some((r) => String(r.ref_id) === String(refId)));
            } catch {
                /* a failed read must not make the button lie about being saved */
            }
            try {
                const pending = window.sessionStorage.getItem(PENDING_KEY);
                if (pending) {
                    const { kind: k, refId: r } = JSON.parse(pending);
                    window.sessionStorage.removeItem(PENDING_KEY);
                    if (k === kind && String(r) === String(refId)) {
                        await saveItem(kind, refId);
                        if (alive) setSaved(true);
                    }
                }
            } catch { /* ignore */ }
        })();
        return () => { alive = false; };
    }, [user, isLoading, kind, refId]);

    if (!mounted || isLoading) return null;

    const press = () => {
        if (user) { void persist(); return; }
        try {
            window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ kind, refId }));
        } catch { /* private mode: the press is simply not remembered */ }
        setAsking(true);
    };

    const back = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';

    return (
        <>
            <button
                type="button"
                onClick={press}
                disabled={busy}
                aria-pressed={saved}
                title={saved ? t.remove : t.save}
                className={
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 ' +
                    (saved
                        ? 'border-starta-teal text-starta-darkTeal dark:text-starta-accent bg-starta-teal/10'
                        : 'border-border text-muted hover:text-starta-teal hover:border-starta-teal/50') +
                    (className ? ` ${className}` : '')
                }
            >
                <BookmarkIcon filled={saved} />
                {busy ? t.saving : saved ? t.saved : t.save}
            </button>

            {error && <span className="ms-2 text-xs text-red-600 dark:text-red-400">{error}</span>}

            {asking && (
                <div className="starta-gate-dialog-root" role="dialog" aria-modal="true" aria-label={t.gateTitle}>
                    <div className="starta-gate-dialog-scrim" onClick={() => setAsking(false)} />
                    <div className="starta-gate-panel starta-gate-dialog">
                        <span className="starta-gate-lock"><BookmarkIcon filled /></span>
                        <h3 className="starta-gate-dialog-title">{t.gateTitle}</h3>
                        <p className="starta-gate-dialog-body">{t.gateBody}</p>
                        <div className="starta-gate-dialog-actions">
                            <button type="button" className="starta-gate-cta" onClick={() => router.push(`/register${back}`)}>
                                {t.gateCta}
                            </button>
                            <button type="button" className="starta-gate-signin" onClick={() => router.push(`/login${back}`)}>
                                {t.gateSignin}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
