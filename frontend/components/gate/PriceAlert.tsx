'use client';

/**
 * ============================================================================
 * PRICE ALERT — set a level, get told when it is reached
 * ============================================================================
 *
 * This is the first gated feature on the site that could NOT be built until the
 * thing behind it existed. `/user/alerts` had full CRUD for months and nothing
 * ever read the table it wrote to: no evaluator, no delivery. Putting a
 * registration gate in front of that would have taken an account from someone
 * on the specific promise that we would tell them when a share hit their level,
 * and then never told them — which is why the strategy deliberately left alerts
 * ungated until backend-core/app/services/alert_service.py existed.
 *
 * It exists now. The evaluator runs on the trading-session cron, refuses to
 * fire on a stale quote, claims each alert before sending so it goes once, and
 * emails the level, the price that crossed it and when that price was observed.
 * So the gate can finally be honest, and this is it.
 *
 * ══ WHY THIS IS A GATE AND NOT A LIMIT ══════════════════════════════════════
 * There is no free allowance here, and that is not stinginess. An alert has
 * nowhere to be delivered without an account — the promise IS the account. A
 * "first alert free" would have to invent a delivery channel for an anonymous
 * visitor, and there isn't one.
 *
 * ══ WHY IT COSTS NOTHING IN SEARCH ══════════════════════════════════════════
 * It renders nothing until auth resolves in the browser, so it never enters the
 * server HTML. The company page above it — price, statistics, profile, peers,
 * FAQ — is untouched and stays open, because that is what search sends people
 * to. See REGISTRATION_STRATEGY.md.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useStoredLang } from '@/hooks/useStoredLang';
import { GATE_LABELS } from '@/lib/gate-i18n';
import { createAlert } from '@/lib/api';

const COPY = {
    en: {
        heading: 'Tell me when it moves',
        lead: (symbol: string) => `Set a level on ${symbol} and we will email you once it is reached.`,
        above: 'Rises above',
        below: 'Falls below',
        placeholder: 'Price in EGP',
        submit: 'Set alert',
        saving: 'Setting…',
        done: (symbol: string, condition: string, price: string) =>
            `Done. We will email you when ${symbol} ${condition} ${price} EGP.`,
        invalid: 'Enter a price above zero.',
        failed: 'That did not save. Please try again.',
        once: 'You will be told once, then the alert retires.',
    },
    ar: {
        heading: 'أخبرني عند التحرّك',
        lead: (symbol: string) => `حدّد مستوى لسهم ${symbol} ونرسل إليك بريدًا فور بلوغه.`,
        above: 'يتجاوز',
        below: 'ينخفض دون',
        placeholder: 'السعر بالجنيه',
        submit: 'اضبط التنبيه',
        saving: 'جارٍ الضبط…',
        done: (symbol: string, condition: string, price: string) =>
            `تم. سنرسل إليك بريدًا عندما ${condition} ${symbol} ${price} جنيه.`,
        invalid: 'أدخل سعرًا أكبر من صفر.',
        failed: 'لم يتم الحفظ. برجاء المحاولة مرة أخرى.',
        once: 'سنخبرك مرة واحدة، ثم ينتهي التنبيه.',
    },
} as const;

export default function PriceAlert({ symbol }: { symbol: string }) {
    const { user, isLoading } = useAuth();
    const lang = useStoredLang();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
    const [price, setPrice] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState('');
    const [error, setError] = useState('');

    // Nothing renders on the server or during hydration — see the header.
    useEffect(() => { setMounted(true); }, []);
    if (!mounted || isLoading) return null;

    const t = COPY[lang];
    const g = GATE_LABELS[lang].reasons.alerts;

    if (!user) {
        const back = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
        return (
            <section className="starta-invite" aria-label={g.title}>
                <span className="starta-invite-text">
                    <span className="starta-invite-title">{g.title}</span>
                    <span className="starta-invite-body">{g.body}</span>
                </span>
                <Link href={`/register${back}`} className="starta-gate-cta">{g.cta}</Link>
                <Link href={`/login${back}`} className="starta-invite-dismiss">{g.signin}</Link>
            </section>
        );
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = Number(price);
        if (!Number.isFinite(value) || value <= 0) { setError(t.invalid); setDone(''); return; }
        setBusy(true); setError(''); setDone('');
        try {
            await createAlert(symbol, value, condition);
            setDone(t.done(symbol, condition === 'ABOVE' ? t.above : t.below, value.toLocaleString()));
            setPrice('');
        } catch {
            setError(t.failed);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-label={t.heading}>
            <h2 className="text-base font-bold text-main">{t.heading}</h2>
            <p className="mt-1 text-sm text-muted">{t.lead(symbol)}</p>

            <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-full border border-border p-1">
                    {(['ABOVE', 'BELOW'] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCondition(c)}
                            aria-pressed={condition === c}
                            className={
                                'px-4 py-2 rounded-full text-xs font-bold transition-colors ' +
                                (condition === c ? 'bg-starta-teal text-white' : 'text-muted hover:text-main')
                            }
                        >
                            {c === 'ABOVE' ? t.above : t.below}
                        </button>
                    ))}
                </div>
                {/* dir="ltr" and inputMode decimal: a price is a Latin-digit
                    figure and reads backwards inside an RTL field. */}
                <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    dir="ltr"
                    inputMode="decimal"
                    placeholder={t.placeholder}
                    aria-label={t.placeholder}
                    className="w-40 rounded-xl border border-border bg-page px-4 py-2.5 text-sm text-main outline-none focus:border-starta-teal focus:ring-1 focus:ring-starta-teal"
                />
                <button type="submit" disabled={busy} className="starta-gate-cta disabled:opacity-55">
                    {busy ? t.saving : t.submit}
                </button>
            </form>

            <p className="mt-3 text-xs text-muted">{t.once}</p>
            {done && <p role="status" className="mt-3 text-sm text-starta-darkTeal dark:text-starta-accent">{done}</p>}
            {error && <p role="status" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </section>
    );
}
