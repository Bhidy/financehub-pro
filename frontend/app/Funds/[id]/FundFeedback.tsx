'use client';

/**
 * "Was this helpful?" widget. Records a yes/no + optional comment against the fund.
 * Writes go through the proven backend write path (/api/proxy → FastAPI asyncpg).
 * Open to everyone (no login). Best-effort: a failed/undeployed endpoint never blocks
 * the thank-you — we don't punish a user for our backend. Deduped per-fund via localStorage.
 */

import { useState, useSyncExternalStore } from 'react';
import type { FundLabels } from './fund-i18n';

type Choice = 'yes' | 'no';

const NOOP_SUBSCRIBE = () => () => {};

/** The app-wide per-visitor id (same localStorage key the AI-chat / guest hooks use).
 *  Sending it lets the backend de-dupe feedback per REAL visitor — without it the
 *  server sees only the Vercel proxy IP and different visitors overwrite each other. */
function deviceFp(): string {
    try {
        let fp = localStorage.getItem('fh_device_fp');
        if (!fp) {
            fp = `${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem('fh_device_fp', fp);
        }
        return fp;
    } catch { return ''; }
}

export default function FundFeedback({ fundId, t }: { fundId: string | number; t: FundLabels }) {
    const ax = t.ax;
    const storageKey = `fund_fb_${fundId}`;
    const [choice, setChoice] = useState<Choice | null>(null);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Read "already voted" from localStorage without a setState-in-effect. SSR-safe:
    // the server snapshot is false and the client reconciles after hydration.
    const alreadyVoted = useSyncExternalStore(
        NOOP_SUBSCRIBE,
        () => { try { return !!localStorage.getItem(storageKey); } catch { return false; } },
        () => false,
    );
    // Show the thank-you only when the user has finished (submitted) OR they voted on a
    // PRIOR visit (alreadyVoted with no in-progress choice). While a choice is active we
    // stay interactive so the optional comment box + Send are never skipped, even though
    // pick() records the vote to localStorage immediately.
    const done = submitted || (alreadyVoted && !choice);

    const send = (helpful: boolean, body: string) => {
        // Fire-and-forget; the UX does not depend on the response.
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const fp = deviceFp();
            if (fp) headers['X-Device-Fingerprint'] = fp; // proxy forwards → real per-visitor dedupe key
            fetch(`/api/proxy/funds/${encodeURIComponent(String(fundId))}/feedback`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ helpful, comment: body.slice(0, 500) }),
                keepalive: true,
            }).catch(() => { /* endpoint may be mid-deploy — ignore */ });
        } catch { /* ignore */ }
        try { localStorage.setItem(storageKey, helpful ? 'yes' : 'no'); } catch { /* ignore */ }
    };

    const pick = (c: Choice) => {
        setChoice(c);
        send(c === 'yes', ''); // record the vote immediately; comment is optional follow-up
    };
    const submitComment = () => {
        if (choice) send(choice === 'yes', comment);
        setSubmitted(true);
    };

    return (
        <section aria-label={ax.fbTitle}>
            <div className="glass-premium rounded-[1.6rem] p-5">
                {done ? (
                    <p className="text-sm font-semibold text-emerald-600">{ax.fbThanks}</p>
                ) : (
                    <>
                        <h3 className="text-base font-display font-bold tracking-[-0.02em] text-main">{ax.fbTitle}</h3>
                        <p className="mt-1 text-xs text-muted">{ax.fbSub}</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button type="button" className="fb-btn" data-active={choice === 'yes'} onClick={() => pick('yes')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 11v9m0-9l4-7a2 2 0 013 1.7V9h5a2 2 0 012 2.3l-1.3 6A2 2 0 0119 19H7" /></svg>
                                {ax.fbYes}
                            </button>
                            <button type="button" className="fb-btn" data-active={choice === 'no'} onClick={() => pick('no')}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 13V4m0 9l-4 7a2 2 0 01-3-1.7V15H5a2 2 0 01-2-2.3l1.3-6A2 2 0 016 5h11" /></svg>
                                {ax.fbNo}
                            </button>
                        </div>
                        {choice && (
                            <div className="mt-4 flex flex-col gap-2.5">
                                <input
                                    type="text" value={comment} maxLength={500}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={ax.fbCommentPlaceholder}
                                    className="fb-input"
                                    aria-label={ax.fbCommentPlaceholder}
                                />
                                <button type="button" className="fb-submit" onClick={submitComment}>{ax.fbSubmit}</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
