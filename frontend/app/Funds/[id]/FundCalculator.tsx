'use client';

/**
 * Interactive investment calculator. Projects a lump sum forward using the fund's
 * realized long-run CAGR (RF-free) via lib/fund-analytics.projectInvestment, with a
 * volatility-derived band. Recomputes instantly client-side. Illustrative only — the
 * disclaimer is always visible (past performance ≠ future returns).
 */

import { useMemo, useState } from 'react';
import type { FundLabels } from './fund-i18n';
import { projectInvestment } from '@/lib/fund-analytics';
import { money, signedPct, interp } from './fund-format';

const HORIZONS = [1, 3, 5] as const;

export default function FundCalculator({
    cagr, volatility, currency, t,
}: { cagr: number | null; volatility: number | null; currency: string; t: FundLabels }) {
    const ax = t.ax;
    const [amount, setAmount] = useState<number>(10_000);
    const [years, setYears] = useState<number>(3);

    const proj = useMemo(
        () => projectInvestment(amount, years, cagr, volatility),
        [amount, years, cagr, volatility],
    );

    const yearLabel = (y: number) => (y === 1 ? ax.calcYears1 : y === 3 ? ax.calcYears3 : ax.calcYears5);

    return (
        <section className="mt-8" aria-label={ax.calcTitle}>
            <span className="section-tag">{ax.calcTag}</span>
            <div className="glass-premium mt-3 rounded-[2rem] p-6 sm:p-8">
                <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main sm:text-2xl">{ax.calcTitle}</h2>
                <p className="mt-2 text-sm text-muted">{ax.calcSub}</p>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                    {/* Inputs */}
                    <div className="flex flex-col gap-5">
                        <label className="block">
                            <span className="text-[0.68rem] uppercase tracking-[0.2em] text-muted">{ax.calcAmount}</span>
                            <div className="calc-input mt-2">
                                <input
                                    type="number" inputMode="numeric" min={0} step={1000}
                                    value={Number.isFinite(amount) ? amount : ''}
                                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                                    aria-label={ax.calcAmount}
                                />
                                <span className="calc-input-suffix">{currency}</span>
                            </div>
                        </label>

                        <div>
                            <span className="text-[0.68rem] uppercase tracking-[0.2em] text-muted">{ax.calcHorizon}</span>
                            <div className="calc-seg mt-2" role="tablist" aria-label={ax.calcHorizon}>
                                {HORIZONS.map((y) => (
                                    <button
                                        key={y} type="button" role="tab" aria-selected={years === y}
                                        className="calc-seg-btn" data-active={years === y}
                                        onClick={() => setYears(y)}
                                    >
                                        {yearLabel(y)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {proj && <p className="text-xs text-muted">{interp(ax.calcCagrNote, { v: proj.cagrUsed })}</p>}
                    </div>

                    {/* Result */}
                    <div className="calc-result">
                        {proj ? (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="calc-stat">
                                        <div className="calc-stat-label">{ax.calcInvested}</div>
                                        <div className="calc-stat-value">{money(proj.invested, currency)}</div>
                                    </div>
                                    <div className="calc-stat calc-stat--accent">
                                        <div className="calc-stat-label">{ax.calcProjected}</div>
                                        <div className="calc-stat-value">{money(proj.base, currency)}</div>
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    <div className="calc-stat">
                                        <div className="calc-stat-label">{ax.calcGain}</div>
                                        <div className={`calc-stat-value ${proj.gain < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                            {proj.gain >= 0 ? '+' : ''}{money(proj.gain, currency)} <span className="text-sm">({signedPct(proj.gainPct)})</span>
                                        </div>
                                    </div>
                                    <div className="calc-stat">
                                        <div className="calc-stat-label">{ax.calcRange}</div>
                                        <div className="calc-stat-value text-base tabular-nums">{money(proj.low, currency)} – {money(proj.high, currency)}</div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-muted">{ax.noData}</p>
                        )}
                    </div>
                </div>

                <p className="ax-note mt-5">{ax.calcDisclaimer}</p>
            </div>
        </section>
    );
}
