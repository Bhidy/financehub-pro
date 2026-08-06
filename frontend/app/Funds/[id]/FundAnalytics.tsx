'use client';

/**
 * Presentational analytics sections for the fund profile — Scorecard, CAGR, Suitability,
 * Insights and Stress-test. All data is derived server-side (lib/fund-analytics.ts) and
 * passed in; these components only format + render. Enum→phrase mapping comes from
 * t.ax (fund-i18n) so everything stays bilingual/RTL with zero logic here.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { FundLabels } from './fund-i18n';
import type { ScoreResult, Score, SuitabilityResult, Insight, StressResult } from '@/lib/fund-analytics';
import { pct, signedPct, interp } from './fund-format';

const MICRO = 'text-[0.68rem] uppercase tracking-[0.22em] text-muted';

type Ax = FundLabels['ax'];

/* ------------------------------------------------- "how it's calculated" tip */

function InfoIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <path strokeLinecap="round" d="M12 11.2v4.8" />
            <circle cx="12" cy="7.8" r="0.4" fill="currentColor" stroke="none" />
        </svg>
    );
}

/** A small info button that toggles an accessible popover explaining a derived
 *  number. Closes on outside-click and Esc; RTL-safe via CSS logical props. */
function InfoTip({ label, title, children }: { label: string; title: string; children: ReactNode }) {
    const id = useId();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);
    // Only one tooltip open at a time — deterministic for mouse, keyboard AND
    // touch (a plain mousedown-outside check misses keyboard/touch activation).
    useEffect(() => {
        const onOther = (e: Event) => {
            if ((e as CustomEvent).detail !== id) setOpen(false);
        };
        document.addEventListener('ax-tip:open', onOther as EventListener);
        return () => document.removeEventListener('ax-tip:open', onOther as EventListener);
    }, [id]);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);
    const toggle = () =>
        setOpen((o) => {
            const next = !o;
            if (next) document.dispatchEvent(new CustomEvent('ax-tip:open', { detail: id }));
            return next;
        });
    return (
        <span className="ax-tip" ref={ref}>
            <button
                type="button"
                className="ax-tip-btn"
                aria-label={label}
                aria-expanded={open}
                onClick={toggle}
            >
                <InfoIcon />
            </button>
            {open && (
                <span className="ax-tip-pop" role="dialog" aria-label={title}>
                    <span className="ax-tip-title">{title}</span>
                    {children}
                </span>
            )}
        </span>
    );
}

/** Popover body for one score dimension — the method, plus (for Performance) the
 *  fully-reconcilable weighted-return breakdown with the real component numbers. */
function ScoreExplain({ s, ax }: { s: Score; ax: Ax }) {
    const body = (ax.explain as Record<string, string>)[s.key] ?? '';
    const parts = s.key === 'performance' ? s.breakdown ?? [] : [];
    return (
        <>
            <span className="ax-tip-body">{body}</span>
            {parts.length > 0 && (
                <>
                    <span className="ax-tip-body ax-tip-lead">{ax.explain.weightedReturn}</span>
                    <span className="ax-tip-calc">
                        {parts.map((p) => (
                            <span key={p.key} className="ax-tip-calc-row">
                                <span className="ax-tip-calc-label">{(ax.partLabels as Record<string, string>)[p.key] ?? p.key}</span>
                                <span className="ax-tip-calc-op"><b>{signedPct(p.value)}</b> × {p.weight}%</span>
                            </span>
                        ))}
                        {s.metric.value != null && (
                            <span className="ax-tip-calc-row ax-tip-calc-total">
                                <span className="ax-tip-calc-label">{ax.explainApprox}</span>
                                <span className="ax-tip-calc-op">≈ <b>{signedPct(s.metric.value)}</b></span>
                            </span>
                        )}
                    </span>
                </>
            )}
        </>
    );
}

/* ---------------------------------------------------------------- score ring */

function ScoreRing({ value, tier }: { value: number; tier: string }) {
    const r = 52;
    const circ = 2 * Math.PI * r;
    const off = circ * (1 - Math.max(0, Math.min(100, value)) / 100);
    return (
        <div className="score-ring" data-tier={tier}>
            <svg viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
                <circle cx="64" cy="64" r={r} className="score-ring-track" />
                <circle
                    cx="64" cy="64" r={r} className="score-ring-fill"
                    strokeDasharray={circ} strokeDashoffset={off}
                    transform="rotate(-90 64 64)" strokeLinecap="round"
                />
            </svg>
            <div className="score-ring-center">
                <span className="score-ring-value">{value}</span>
                <span className="score-ring-max">/100</span>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------ metric mapping */

function metricText(metric: Score['metric'], ax: Ax): { label: string; value: string } {
    const label = (ax.metricLabels as Record<string, string>)[metric.kind] ?? '';
    // The diversification (category) score has no single number to cite — its
    // "estimate" basis is already stated in the row description, so show no metric.
    if (metric.kind === 'category') return { label: '', value: '' };
    if (metric.value == null) return { label, value: ax.noData };
    switch (metric.kind) {
        case 'annualizedReturn': return { label, value: signedPct(metric.value) };
        case 'volatility':
        case 'positivePeriods':
        case 'fee': return { label, value: pct(metric.value) };
        default: return { label, value: String(metric.value) };
    }
}

/* --------------------------------------------------------------- Scorecard */

export function Scorecard({ scores, t }: { scores: ScoreResult; t: FundLabels }) {
    const ax = t.ax;
    const confLabel = scores.confidence === 'high' ? ax.confHigh : scores.confidence === 'medium' ? ax.confMed : ax.confLow;
    return (
        <section aria-label={ax.scoreTitle}>
            <div className="glass-premium rounded-[2rem] p-6 sm:p-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main sm:text-2xl">{ax.scoreTitle}</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{ax.scoreSub}</p>
                    </div>
                    <span className="ax-chip" data-conf={scores.confidence}>{confLabel}</span>
                </div>

                <div className="mt-7 grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
                    {scores.overall !== null && (
                        <div className="flex flex-col items-center gap-3">
                            <ScoreRing value={scores.overall} tier={scores.overallTier ?? 'average'} />
                            <div className="text-center">
                                <div className="ax-label-tip text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-starta-teal">
                                    {ax.startaScore}
                                    <InfoTip label={ax.explainTitle} title={ax.startaScore}>
                                        <span className="ax-tip-body">{ax.explain.overall}</span>
                                    </InfoTip>
                                </div>
                                <div className="mt-1 text-sm font-semibold text-main">{(ax.tiers as Record<string, string>)[scores.overallTier ?? 'average']}</div>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-5">
                        {scores.scores.map((s) => {
                            const m = metricText(s.metric, ax);
                            const tier = s.tier ?? 'average';
                            return (
                                <div key={s.key} className="score-row">
                                    <div className="score-row-head">
                                        <span className="score-row-name">
                                            {(ax.dims as Record<string, string>)[s.key]}
                                            {s.estimated && <span className="ax-est" title={ax.dimDesc.diversification}>{ax.estimated}</span>}
                                            <InfoTip label={ax.explainTitle} title={(ax.dims as Record<string, string>)[s.key]}>
                                                <ScoreExplain s={s} ax={ax} />
                                            </InfoTip>
                                        </span>
                                        <span className="score-row-score">
                                            {s.value ?? '—'}<i>/100</i>
                                        </span>
                                    </div>
                                    <div className="score-bar">
                                        <span className="score-fill" data-tier={tier} style={{ width: `${s.value ?? 0}%` }} />
                                    </div>
                                    <div className="score-row-foot">
                                        <span className="score-row-desc">{(ax.dimDesc as Record<string, string>)[s.key]}</span>
                                        {m.value && <span className="score-row-metric">{m.label}: <b>{m.value}</b></span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <details className="ax-method mt-6">
                    <summary>{ax.methodology}</summary>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{ax.scoreSub} {ax.higherBetter}.</p>
                </details>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------- Suitability */

function CheckIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}
function MinusIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" d="M6 12h12" /></svg>;
}
function CrossIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /></svg>;
}

export function Suitability({ suit, t }: { suit: SuitabilityResult; t: FundLabels }) {
    const ax = t.ax;
    const statusIcon = (s: string) => (s === 'suitable' ? <CheckIcon /> : s === 'caution' ? <MinusIcon /> : <CrossIcon />);
    return (
        <section className="glass-premium rounded-[1.6rem] p-5" aria-label={ax.suitTitle}>
            <h3 className="text-base font-display font-bold tracking-[-0.02em] text-main">{ax.suitTitle}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{ax.suitSub}</p>

            <div className="mt-4">
                <div className={MICRO}>{ax.horizonTitle}</div>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                    {suit.horizons.map((h) => (
                        <div key={h.key} className="horizon-card" data-status={h.status}>
                            <span className="horizon-name">{(ax.horizons as Record<string, string>)[h.key]}</span>
                            <span className="horizon-hint">{(ax.horizonHint as Record<string, string>)[h.key]}</span>
                            <span className="horizon-status">{statusIcon(h.status)}{(ax.statuses as Record<string, string>)[h.status]}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-5">
                <div className={MICRO}>{ax.investorTitle}</div>
                <div className="mt-2.5 space-y-3">
                    {suit.investorMatch.map((m) => (
                        <div key={m.profile} className="match-row">
                            <div className="match-head">
                                <span className="text-sm font-semibold text-main">{(ax.profiles as Record<string, string>)[m.profile]}</span>
                                <span className="text-sm font-semibold tabular-nums text-main">{m.matchPct}% <span className="text-muted">{ax.matchSuffix}</span></span>
                            </div>
                            <div className="meter"><span className="meter-fill" data-profile={m.profile} style={{ width: `${m.matchPct}%` }} /></div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ----------------------------------------------------------------- Insights */

export function Insights({ insights, t }: { insights: Insight[]; t: FundLabels }) {
    const ax = t.ax;
    // The section shell always renders — zero insights degrades to an honest
    // empty note, never a vanished section (fixed page structure for every fund).
    return (
        <section className="glass-premium rounded-[1.6rem] p-5" aria-label={ax.insightsTitle}>
            <h3 className="text-base font-display font-bold tracking-[-0.02em] text-main">{ax.insightsTitle}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{ax.insightsSub}</p>
            {insights.length > 0 ? (
                <div className="mt-4 grid gap-3">
                    {insights.map((ins, i) => (
                        <div key={`${ins.code}-${i}`} className="insight-card" data-kind={ins.kind}>
                            <div className="insight-top">
                                <span className="insight-badge">{ins.kind === 'pro' ? ax.pro : ax.con}</span>
                                <span className="insight-impact" data-impact={ins.impact}>{(ax.impact as Record<string, string>)[ins.impact]}</span>
                            </div>
                            <p className="insight-text">{interp((ax.insightText as Record<string, string>)[ins.code] ?? '', { v: ins.value ?? '' })}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="ax-pending mt-4">{ax.noData}</p>
            )}
        </section>
    );
}

/* --------------------------------------------------------------- StressTest */

type Movement = { best: number | null; worst: number | null; avgGain: number | null; avgLoss: number | null; cadence: 'day' | 'week' | 'period' };

export function StressTest({ stress, movement, t }: { stress: StressResult; movement: Movement | null; t: FundLabels }) {
    const ax = t.ax;
    const cadence = movement ? (movement.cadence === 'day' ? ax.moveDaily : movement.cadence === 'week' ? ax.moveWeekly : ax.movePeriod) : ax.movePeriod;
    const moveStats = movement
        ? ([
              [interp(ax.moveBest, { p: cadence }), movement.best, false],
              [interp(ax.moveWorst, { p: cadence }), movement.worst, true],
              [interp(ax.moveAvgGain, { p: cadence }), movement.avgGain, false],
              [interp(ax.moveAvgLoss, { p: cadence }), movement.avgLoss, true],
          ] as Array<[string, number | null, boolean]>).filter((r) => r[1] !== null)
        : [];

    // Shell always renders; with neither movement stats nor scenarios it shows an
    // honest empty note instead of disappearing (fixed page structure).
    const empty = !stress.scenarios.length && !moveStats.length;

    return (
        <section className="glass-premium rounded-[1.6rem] p-5" aria-label={ax.stressTitle}>
            <h3 className="ax-label-tip text-base font-display font-bold tracking-[-0.02em] text-main">
                {ax.stressTitle}
                <InfoTip label={ax.explainTitle} title={ax.stressTitle}>
                    <span className="ax-tip-body">{ax.explain.stress}</span>
                </InfoTip>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{ax.stressSub}</p>

            {moveStats.length > 0 && (
                <div className="mt-4">
                    <div className={MICRO}>{ax.moveTitle}</div>
                    <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                        {moveStats.map(([label, value, neg]) => (
                            <div key={label} className="summary-card rounded-[1.1rem] p-3">
                                <div className="text-[0.6rem] uppercase tracking-[0.14em] text-muted">{label}</div>
                                <div className={`mt-1 text-base font-display font-bold tabular-nums ${neg ? 'text-red-500' : 'text-emerald-600'}`}>{signedPct(value as number)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stress.scenarios.length > 0 && (
                <div className="stress-list mt-4">
                    {stress.scenarios.map((s) => (
                        <div key={s.code} className="stress-row">
                            <span className="stress-name">{(ax.scenarios as Record<string, string>)[s.code]}</span>
                            <span className="stress-kind" data-kind={s.kind}>{s.kind === 'estimate' ? ax.estimate : ax.historical}</span>
                            <span className="stress-impact tabular-nums">{signedPct(s.impactPct)}</span>
                        </div>
                    ))}
                </div>
            )}

            {empty ? (
                <p className="ax-pending mt-4">{ax.noData}</p>
            ) : (
                <p className="ax-note mt-4">{ax.stressDisclaimer}</p>
            )}
        </section>
    );
}
