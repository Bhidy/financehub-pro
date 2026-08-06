'use client';

/**
 * Interactive investment calculator — a compact, single-column widget sized for the
 * profile sidebar (~20rem) and full-width on mobile. Projects a plan forward —
 * lump sum, monthly contribution, or both — using the fund's realized annualized
 * return (geometric mean over its full NAV history) via
 * lib/fund-analytics.projectInvestmentPlan, with a volatility-derived band.
 * Recomputes instantly; the "not a guarantee" disclaimer is always visible.
 */

import { useMemo, useState } from 'react';
import type { FundLabels } from './fund-i18n';
import { projectInvestmentPlan, type ProjectionRate } from '@/lib/fund-analytics';

type CagrBasis = ProjectionRate['basis'];
import { money, signedPct, interp } from './fund-format';

const LBL = 'text-[0.62rem] uppercase tracking-[0.18em] text-muted';
const MAX_YEARS = 30;

/** Arabic-correct year pluralization (1 سنة / 2 سنتان / 3–10 سنوات / 11+ سنة);
 *  English collapses to "1 year" / "n years" through the same label keys. */
function yearsLabel(n: number, ax: FundLabels['ax']) {
    if (n === 1) return ax.calcYears1;
    if (n === 2) return ax.calcYears2;
    if (n <= 10) return `${n} ${ax.calcYearsFew}`;
    return `${n} ${ax.calcYearsMany}`;
}

/** Human window label for the rate's basis, so the disclosure is never vague. */
function basisWindow(basis: CagrBasis | null | undefined, ax: FundLabels['ax']): string | null {
    if (basis === '5y') return `5 ${ax.calcYearsFew}`;
    if (basis === '3y') return `3 ${ax.calcYearsFew}`;
    if (basis === '1y') return ax.calcYears1;
    return null; // 'full' / 'inception' use the full-history wording
}

export default function FundCalculator({
    cagr, cagrBasis, volatility, currency, t,
}: {
    cagr: number | null;
    cagrBasis?: CagrBasis | null;
    volatility: number | null;
    currency: string;
    t: FundLabels;
}) {
    const ax = t.ax;
    // '' is allowed so the fields can be fully cleared while typing; math treats '' as 0.
    const [amount, setAmount] = useState<number | ''>(10_000);
    const [monthly, setMonthly] = useState<number | ''>(1_000);
    const [years, setYears] = useState<number>(5);

    const amountNum = Number(amount) || 0;
    const monthlyNum = Number(monthly) || 0;

    const proj = useMemo(
        () => projectInvestmentPlan(amountNum, monthlyNum, years, cagr, volatility),
        [amountNum, monthlyNum, years, cagr, volatility],
    );

    return (
        <section className="glass-premium rounded-[1.6rem] p-5" aria-label={ax.calcTitle}>
            <h3 className="text-base font-display font-bold tracking-[-0.02em] text-main">{ax.calcTitle}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{ax.calcSub}</p>

            <div className="mt-4 flex flex-col gap-4">
                <label className="block">
                    <span className={LBL}>{ax.calcAmount}</span>
                    <div className="calc-input mt-1.5">
                        <input
                            type="number" inputMode="numeric" min={0} step={1000}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                            aria-label={ax.calcAmount}
                        />
                        <span className="calc-input-suffix">{currency}</span>
                    </div>
                </label>

                <label className="block">
                    <span className={LBL}>{ax.calcMonthly}</span>
                    <div className="calc-input mt-1.5">
                        <input
                            type="number" inputMode="numeric" min={0} step={100}
                            value={monthly}
                            onChange={(e) => setMonthly(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                            aria-label={ax.calcMonthly}
                        />
                        <span className="calc-input-suffix">{currency}</span>
                    </div>
                </label>

                <div>
                    <div className="flex items-center justify-between">
                        <span className={LBL}>{ax.calcHorizon}</span>
                        <span className="text-xs font-bold text-main tabular-nums">{yearsLabel(years, ax)}</span>
                    </div>
                    <input
                        type="range" min={1} max={MAX_YEARS} step={1}
                        value={years}
                        onChange={(e) => setYears(Math.min(MAX_YEARS, Math.max(1, Number(e.target.value) || 1)))}
                        aria-label={ax.calcHorizon}
                        aria-valuetext={yearsLabel(years, ax)}
                        className="mt-2 w-full cursor-pointer"
                        style={{ accentColor: '#14B8A6' }}
                    />
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
                    <p className="text-[0.68rem] text-muted">
                        {(() => {
                            const w = basisWindow(cagrBasis, ax);
                            return w
                                ? interp(ax.calcCagrNoteWindow, { v: proj.cagrUsed, w })
                                : interp(ax.calcCagrNote, { v: proj.cagrUsed });
                        })()}
                    </p>
                </div>
            ) : (
                /* proj is null either because the fund has no usable history (cagr null)
                   or because both amounts are empty/zero — distinct messages. */
                <p className="mt-4 text-sm text-muted">{cagr === null ? ax.noData : ax.calcEnterAmounts}</p>
            )}

            <p className="ax-note mt-4">{ax.calcDisclaimer}</p>
        </section>
    );
}
