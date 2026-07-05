'use client';

/**
 * Presentational analytics sections for the fund profile — Scorecard, CAGR, Suitability,
 * Insights and Stress-test. All data is derived server-side (lib/fund-analytics.ts) and
 * passed in; these components only format + render. Enum→phrase mapping comes from
 * t.ax (fund-i18n) so everything stays bilingual/RTL with zero logic here.
 */

import type { FundLabels } from './fund-i18n';
import type { ScoreResult, Score, SuitabilityResult, Insight, StressResult } from '@/lib/fund-analytics';
import { pct, signedPct, interp } from './fund-format';

const SECTION = 'mt-8';
const MICRO = 'text-[0.68rem] uppercase tracking-[0.22em] text-muted';

type Ax = FundLabels['ax'];

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
        <section className={SECTION} aria-label={ax.scoreTitle}>
            <span className="section-tag">{ax.scoreTag}</span>
            <div className="glass-premium mt-3 rounded-[2rem] p-6 sm:p-8">
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
                                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-starta-teal">{ax.startaScore}</div>
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

/* ---------------------------------------------------------------- CAGR card */

export function CagrCard({ cagr, t }: { cagr: { value: string; years: number | null; sinceInception: string | null }; t: FundLabels }) {
    const ax = t.ax;
    return (
        <section className={SECTION} aria-label={ax.cagrTitle}>
            <div className="glass-premium cagr-card rounded-[2rem] p-6 sm:p-8">
                <div className="cagr-main">
                    <span className="section-tag">{ax.cagrTag}</span>
                    <h3 className="mt-3 text-base font-semibold text-main">{ax.cagrTitle}</h3>
                    <div className="cagr-value">{cagr.value}<span>/yr</span></div>
                    <p className="cagr-note">{ax.cagrNote}</p>
                </div>
                <div className="cagr-side">
                    {cagr.sinceInception && (
                        <div className="cagr-side-stat">
                            <div className={MICRO}>{ax.cagrSinceInception}</div>
                            <div className="mt-1 text-lg font-display font-bold tabular-nums text-starta-teal">{cagr.sinceInception}</div>
                        </div>
                    )}
                    {cagr.years != null && <div className="cagr-years">{interp(ax.cagrOverYears, { v: Math.round(cagr.years) })}</div>}
                </div>
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
        <section className={SECTION} aria-label={ax.suitTitle}>
            <span className="section-tag">{ax.suitTag}</span>
            <div className="glass-premium mt-3 rounded-[2rem] p-6 sm:p-8">
                <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main sm:text-2xl">{ax.suitTitle}</h2>
                <p className="mt-2 text-sm text-muted">{ax.suitSub}</p>

                <div className="mt-6 grid gap-7 lg:grid-cols-2">
                    <div>
                        <div className={MICRO}>{ax.horizonTitle}</div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            {suit.horizons.map((h) => (
                                <div key={h.key} className="horizon-card" data-status={h.status}>
                                    <span className="horizon-name">{(ax.horizons as Record<string, string>)[h.key]}</span>
                                    <span className="horizon-hint">{(ax.horizonHint as Record<string, string>)[h.key]}</span>
                                    <span className="horizon-status">{statusIcon(h.status)}{(ax.statuses as Record<string, string>)[h.status]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className={MICRO}>{ax.investorTitle}</div>
                        <div className="mt-3 space-y-4">
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
                </div>
            </div>
        </section>
    );
}

/* ----------------------------------------------------------------- Insights */

export function Insights({ insights, t }: { insights: Insight[]; t: FundLabels }) {
    if (!insights.length) return null;
    const ax = t.ax;
    return (
        <section className={SECTION} aria-label={ax.insightsTitle}>
            <span className="section-tag">{ax.insightsTag}</span>
            <div className="glass-premium mt-3 rounded-[2rem] p-6 sm:p-8">
                <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main sm:text-2xl">{ax.insightsTitle}</h2>
                <p className="mt-2 text-sm text-muted">{ax.insightsSub}</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
            </div>
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

    if (!stress.scenarios.length && !moveStats.length) return null;

    return (
        <section className={SECTION} aria-label={ax.stressTitle}>
            <span className="section-tag">{ax.stressTag}</span>
            <div className="glass-premium mt-3 rounded-[2rem] p-6 sm:p-8">
                <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main sm:text-2xl">{ax.stressTitle}</h2>
                <p className="mt-2 text-sm text-muted">{ax.stressSub}</p>

                {moveStats.length > 0 && (
                    <div className="mt-6">
                        <div className={MICRO}>{ax.moveTitle}</div>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {moveStats.map(([label, value, neg]) => (
                                <div key={label} className="summary-card rounded-[1.1rem] p-3.5">
                                    <div className="text-[0.62rem] uppercase tracking-[0.16em] text-muted">{label}</div>
                                    <div className={`mt-1.5 text-lg font-display font-bold tabular-nums ${neg ? 'text-red-500' : 'text-emerald-600'}`}>{signedPct(value as number)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {stress.scenarios.length > 0 && (
                    <div className="stress-list mt-6">
                        {stress.scenarios.map((s) => (
                            <div key={s.code} className="stress-row">
                                <span className="stress-name">{(ax.scenarios as Record<string, string>)[s.code]}</span>
                                <span className="stress-kind" data-kind={s.kind}>{s.kind === 'estimate' ? ax.estimate : ax.historical}</span>
                                <span className="stress-impact tabular-nums">{signedPct(s.impactPct)}</span>
                            </div>
                        ))}
                    </div>
                )}

                <p className="ax-note mt-5">{ax.stressDisclaimer}</p>
            </div>
        </section>
    );
}
