'use client';

/**
 * Interactive investment calculator — a compact, single-column widget sized for the
 * profile sidebar (~20rem) and full-width on mobile. Projects a lump sum forward using
 * the fund's realized long-run CAGR (RF-free) via lib/fund-analytics.projectInvestment,
 * with a volatility-derived band. Recomputes instantly; the "not a guarantee" disclaimer
 * is always visible.
 */

import { useMemo, useState } from 'react';
import type { FundLabels } from './fund-i18n';
import { projectInvestment } from '@/lib/fund-analytics';
import { money, signedPct, interp } from './fund-format';

const HORIZONS = [1, 3, 5] as const;
const LBL = 'text-[0.62rem] uppercase tracking-[0.18em] text-muted';

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
        <section className="glass-premium rounded-[1.6rem] p-5" aria-label={ax.calcTitle}>
            <span className="section-tag">{ax.calcTag}</span>
            <h3 className="mt-2 text-base font-display font-bold tracking-[-0.02em] text-main">{ax.calcTitle}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{ax.calcSub}</p>

            <div className="mt-4 flex flex-col gap-4">
                <label className="block">
                    <span className={LBL}>{ax.calcAmount}</span>
                    <div className="calc-input mt-1.5">
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
                    <span className={LBL}>{ax.calcHorizon}</span>
                    <div className="calc-seg calc-seg--full mt-1.5" role="tablist" aria-label={ax.calcHorizon}>
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
            </div>

            {proj ? (
                <div className="mt-4 flex flex-col gap-2.5">
                    <div className="calc-stat calc-stat--accent">
                        <div className="calc-stat-label">{ax.calcProjected}</div>
                        <div className="calc-stat-value text-2xl">{money(proj.base, currency)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="calc-stat">
                            <div className="calc-stat-label">{ax.calcInvested}</div>
                            <div className="calc-stat-value text-base">{money(proj.invested, currency)}</div>
                        </div>
                        <div className="calc-stat">
                            <div className="calc-stat-label">{ax.calcGain}</div>
                            <div className={`calc-stat-value text-base ${proj.gain < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                {proj.gain >= 0 ? '+' : ''}{money(proj.gain, currency)}
                                <span className="ms-1 text-xs">({signedPct(proj.gainPct)})</span>
                            </div>
                        </div>
                    </div>
                    <div className="calc-stat">
                        <div className="calc-stat-label">{ax.calcRange}</div>
                        <div className="calc-stat-value text-sm tabular-nums">{money(proj.low, currency)} – {money(proj.high, currency)}</div>
                    </div>
                    <p className="text-[0.68rem] text-muted">{interp(ax.calcCagrNote, { v: proj.cagrUsed })}</p>
                </div>
            ) : (
                <p className="mt-4 text-sm text-muted">{ax.noData}</p>
            )}

            <p className="ax-note mt-4">{ax.calcDisclaimer}</p>
        </section>
    );
}
