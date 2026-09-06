'use client';

/**
 * ============================================================================
 * THE PROMPT — one voice for five earned moments
 * ============================================================================
 *
 * Reads its decision from public/assets/starta-engage.js, which owns the budget
 * (one prompt per session, three a week, dismissal is forever) and decides
 * WHICH moment has been earned. This file only renders it.
 *
 * ══ WHY THE COPY DIFFERS PER SCENARIO, AND WHY THAT IS THE WHOLE POINT ══════
 * A generic "sign up for free!" is the same sentence to everyone, so it is
 * evidence of nothing and reads as an advert. Each line below states something
 * that is TRUE ABOUT THIS PERSON and that they can verify from their own
 * memory: you have been back to this fund three times; you were here yesterday;
 * you have just read this page properly. That is why it converts, and it is
 * also why it cannot be reused — a claim the reader knows is false costs more
 * than saying nothing.
 *
 * So: never write a variant here that the engine cannot actually prove.
 *
 * ══ IT NEVER BLOCKS ═════════════════════════════════════════════════════════
 * An inline bar in the flow of the page, at the end. No scrim, no fixed
 * position, no interception of a click. `starta-gate.css` is build-gated
 * against `.starta-invite` ever gaining fixed or absolute positioning, because
 * the moment this sits OVER an article it becomes the wall the whole strategy
 * exists to avoid.
 *
 * ══ AND IT IS INVISIBLE TO SEARCH AND TO ANSWER ENGINES ═════════════════════
 * It renders nothing until auth resolves in the browser, so it never enters the
 * server HTML. Nothing above it is removed, hidden or reordered. Googlebot,
 * GPTBot, ClaudeBot and PerplexityBot read exactly the document they read
 * before this existed.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStoredLang } from '@/hooks/useStoredLang';

type Scenario = 'repeat' | 'returning' | 'deep' | 'breadth' | 'exit';

declare global {
    interface Window {
        startaEngage?: {
            noteItem: (id: string) => void;
            pick: (opts?: { exit?: boolean }) => Scenario | null;
            recordPrompt: () => void;
            dismissForever: () => void;
            onExitIntent: (fn: () => void) => void;
            signedIn: () => boolean;
            stats: () => { distinct: number; viewsOfCurrent: number; returning: boolean };
        };
    }
}

/**
 * Every line names something the engine has actually observed. `n` is the
 * measured count, never a rounded-up flourish.
 */
const COPY: Record<'en' | 'ar', Record<Scenario, (n: number) => { title: string; body: string }> & { cta: string; dismiss: string }> = {
    en: {
        repeat: (n) => ({
            title: 'You keep coming back to this one',
            body: `That is the ${n}${n === 3 ? 'rd' : 'th'} time you have opened this page. A free account keeps it on a list, so you do not have to find it again.`,
        }),
        returning: () => ({
            title: 'Pick up where you left off',
            body: 'You were here before. A free account remembers what you were looking at, on this device and any other.',
        }),
        deep: () => ({
            title: 'Worth keeping?',
            body: 'You have read this one properly. A free account saves it, and saves the comparisons you build around it.',
        }),
        breadth: (n) => ({
            title: 'You are building a shortlist',
            body: `You have looked at ${n} of these. A free account keeps them together instead of leaving you to remember which was which.`,
        }),
        exit: () => ({
            title: 'Before you go',
            body: 'A free account keeps this page, and the watchlist and comparisons you build, waiting for your next visit.',
        }),
        cta: 'Create a free account',
        dismiss: 'Not now',
    },
    ar: {
        repeat: (n) => ({
            title: 'تعود إلى هذه الصفحة كثيرًا',
            body: `هذه المرة رقم ${n.toLocaleString('ar-EG')} التي تفتحها فيها. الحساب المجاني يحفظها في قائمة فلا تبحث عنها من جديد.`,
        }),
        returning: () => ({
            title: 'أكمل من حيث توقفت',
            body: 'سبق أن زرت الموقع. الحساب المجاني يتذكّر ما كنت تطالعه، على هذا الجهاز وعلى غيره.',
        }),
        deep: () => ({
            title: 'تحتفظ بها؟',
            body: 'قرأت هذه الصفحة باستفاضة. الحساب المجاني يحفظها، ويحفظ المقارنات التي تبنيها حولها.',
        }),
        breadth: (n) => ({
            title: 'أنت تبني قائمة مختصرة',
            body: `اطّلعت على ${n.toLocaleString('ar-EG')} منها. الحساب المجاني يجمعها معًا بدل أن تتذكر أيها كان أيها.`,
        }),
        exit: () => ({
            title: 'قبل أن تغادر',
            body: 'الحساب المجاني يحفظ هذه الصفحة، وقائمة المتابعة والمقارنات التي تبنيها، في انتظار زيارتك القادمة.',
        }),
        cta: 'أنشئ حسابًا مجانيًا',
        dismiss: 'ليس الآن',
    },
};

export interface EngagePromptProps {
    /** Stable identity for the thing on this page — `fund:123`, `symbol:COMI`. */
    itemId: string;
}

export default function EngagePrompt({ itemId }: EngagePromptProps) {
    const { user, isLoading } = useAuth();
    const lang = useStoredLang();
    const pathname = usePathname();
    const [scenario, setScenario] = useState<Scenario | null>(null);
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (isLoading || user) return;
        const engage = window.startaEngage;
        if (!engage) return;

        engage.noteItem(itemId);

        const offer = (opts?: { exit?: boolean }) => {
            if (scenario) return;
            const picked = engage.pick(opts);
            if (!picked) return;
            const stats = engage.stats();
            setCount(picked === 'repeat' ? stats.viewsOfCurrent : stats.distinct);
            setScenario(picked);
            // The budget is spent at the moment of SHOWING, not of deciding, so
            // an evaluation that renders nothing costs the visitor nothing.
            engage.recordPrompt();
        };

        // Re-evaluate on a slow tick rather than on scroll: dwell time is one of
        // the signals, so the decision has to be able to become true while the
        // page sits still. Ten seconds is invisible to the reader and cheap.
        const timer = window.setInterval(() => offer(), 10000);
        engage.onExitIntent(() => offer({ exit: true }));

        return () => window.clearInterval(timer);
    }, [itemId, isLoading, user, scenario]);

    if (!scenario) return null;

    const t = COPY[lang];
    const { title, body } = t[scenario](count);
    const back = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';

    return (
        <div className="starta-invite" role="complementary" aria-label={title}>
            <span className="starta-invite-text">
                <span className="starta-invite-title">{title}</span>
                <span className="starta-invite-body">{body}</span>
            </span>
            <Link href={`/register${back}`} className="starta-gate-cta">{t.cta}</Link>
            <button
                type="button"
                className="starta-invite-dismiss"
                onClick={() => {
                    // Dismissing ONE dismisses them all, permanently. A reader
                    // who has said no is not a reader to ask again in a
                    // different costume.
                    window.startaEngage?.dismissForever();
                    setScenario(null);
                }}
            >
                {t.dismiss}
            </button>
        </div>
    );
}
