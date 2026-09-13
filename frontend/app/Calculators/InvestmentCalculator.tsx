'use client';

/**
 * Investment Growth calculator — React reimplementation of the home-page
 * portfolio simulator's math (public/home.html): deterministic compound
 * growth, pv = pv·(1 + r/100) + monthly·12 per year. Amounts are in EGP.
 * SVG chart only — no chart library.
 *
 * VOLATILITY IS DELIBERATELY ABSENT (owner call, and the only coherent way to
 * honour it). This used to carry a volatility slider feeding a 400-iteration
 * Monte Carlo that printed a p10/p50/p90 worst/expected/best band. Dropping the
 * input while keeping the simulation would have drawn three identical figures
 * under the words "worst", "expected" and "best" — a financial display that
 * misstates its own certainty. The band went out with the input it measured;
 * what is left is one deterministic projection that says exactly what it is.
 */

import { useMemo, useState } from 'react';
import type { CalcLabels, Lang } from './calculators-i18n';
import { tpl } from './calculators-i18n';
import { formatInt, formatShort, formatYears } from './calc-shared';
import { ltrNum } from '@/lib/bidi';

type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

const PRESETS: Record<RiskProfile, { ret: number }> = {
    conservative: { ret: 8 },
    moderate: { ret: 12 },
    aggressive: { ret: 16 },
};

type YearPoint = { year: number; pv: number; invested: number; gains: number };

/** EXACT port of home.html calcGrowth(). */
function calcGrowth(initial: number, monthly: number, years: number, annRet: number): YearPoint[] {
    const data: YearPoint[] = [];
    let invested = initial;
    let pv = initial;
    for (let y = 0; y <= years; y++) {
        if (y > 0) {
            pv = pv * (1 + annRet / 100) + monthly * 12;
            invested += monthly * 12;
        }
        data.push({ year: y, pv, invested, gains: pv - invested });
    }
    return data;
}

/* ────────────────────────────── chart ─────────────────────────────── */

function GrowthChart({
    data,
    title,
    yearTickTpl,
}: {
    data: YearPoint[];
    title: string;
    yearTickTpl: string;
}) {
    const W = 600, H = 240, PL = 50, PT = 12, PB = 28, PR = 8;
    const cW = W - PL - PR;
    const cH = H - PT - PB;
    let maxVal = 0;
    for (const d of data) if (d.pv > maxVal) maxVal = d.pv;
    maxVal = maxVal * 1.1 || 1;
    const tx = (i: number) => PL + (i / (data.length - 1)) * cW;
    const ty = (v: number) => PT + cH - (v / maxVal) * cH;
    const base = H - PB;

    const pfPts = data.map((d, i) => `${tx(i)},${ty(d.pv)}`).join(' ');
    const invPts = data.map((d, i) => `${tx(i)},${ty(d.invested)}`).join(' ');
    const pfFill = `M${tx(0)},${ty(data[0].pv)} ${data.slice(1).map((d, i) => `L${tx(i + 1)},${ty(d.pv)}`).join(' ')} L${tx(data.length - 1)},${base} L${PL},${base} Z`;
    const invFill = `M${tx(0)},${ty(data[0].invested)} ${data.slice(1).map((d, i) => `L${tx(i + 1)},${ty(d.invested)}`).join(' ')} L${tx(data.length - 1)},${base} L${PL},${base} Z`;

    const step = Math.ceil(data.length / 6);
    const xlabels = data
        .filter((_, i) => i === 0 || i === data.length - 1 || i % step === 0)
        .map((d) => (
            <text key={`x${d.year}`} x={tx(d.year)} y={H - PB + 16} textAnchor="middle" fontSize={10} fill="var(--c-text-muted)">
                {tpl(yearTickTpl, { n: d.year })}
            </text>
        ));
    const ylabels = [0.25, 0.5, 0.75, 1.0].map((pct) => (
        <g key={`y${pct}`}>
            <line x1={PL} x2={W - PR} y1={ty(maxVal * pct)} y2={ty(maxVal * pct)} stroke="var(--c-border)" strokeWidth={1} />
            <text x={PL - 5} y={ty(maxVal * pct) + 3} textAnchor="end" fontSize={10} fill="var(--c-text-muted)">
                {formatShort(maxVal * pct)}
            </text>
        </g>
    ));

    return (
        <div dir="ltr" className="rounded-xl border border-border bg-panel/30 p-2">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={title} className="h-auto w-full">
                {ylabels}
                {xlabels}
                <path d={invFill} fill="#64748B" fillOpacity={0.12} />
                <path d={pfFill} fill="#14B8A6" fillOpacity={0.16} />
                <polyline points={invPts} fill="none" stroke="#64748B" strokeWidth={2} strokeDasharray="5,4" strokeLinejoin="round" />
                <polyline points={pfPts} fill="none" stroke="#14B8A6" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
        </div>
    );
}

/* ────────────────────────────── sliders ─────────────────────────────── */

function Slider({
    id,
    label,
    value,
    display,
    min,
    max,
    step,
    onChange,
    rtl,
}: {
    id: string;
    label: string;
    value: number;
    display: string;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
    rtl: boolean;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor={id} className="text-xs font-semibold text-muted">
                    {label}
                </label>
                <span dir="ltr" className="rounded-md border border-border bg-panel/50 px-2 py-0.5 text-xs font-bold tabular-nums text-starta-teal">
                    {display}
                </span>
            </div>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="starta-range"
                style={{
                    background: `linear-gradient(to ${rtl ? 'left' : 'right'}, #14B8A6 ${pct}%, var(--c-border) ${pct}%)`,
                }}
            />
        </div>
    );
}

/* ────────────────────────────── main component ─────────────────────────────── */

export default function InvestmentCalculator({ L, lang }: { L: CalcLabels; lang: Lang }) {
    const I = L.inv;
    const rtl = lang === 'ar';
    const sym = L.currency.symbols.EGP; // fixed EGP (Egypt-first simulator)
    const money = (n: number) => `${formatInt(n)} ${sym}`;

    const [initial, setInitial] = useState(100_000);
    const [monthly, setMonthly] = useState(5_000);
    const [years, setYears] = useState(10);
    const [ret, setRet] = useState(12);

    const activeProfile: RiskProfile | null =
        (Object.keys(PRESETS) as RiskProfile[]).find((p) => PRESETS[p].ret === ret) ?? null;

    const applyPreset = (p: RiskProfile) => setRet(PRESETS[p].ret);

    const data = useMemo(() => calcGrowth(initial, monthly, years, ret), [initial, monthly, years, ret]);
    const last = data[data.length - 1];
    const retPct = last.invested > 0 ? (((last.pv - last.invested) / last.invested) * 100).toFixed(1) : '0.0';

    return (
        <div className="calc-fade">
            <header className="mb-6 text-center">
                <h2 className="text-xl font-extrabold tracking-tight text-main sm:text-2xl">{I.title}</h2>
                <p className="mx-auto mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{I.subtitle}</p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                {/* controls */}
                <section className="rounded-2xl border border-border bg-surface p-6 sm:p-7">
                    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{I.riskTitle}</h3>
                    <div className="mb-6 grid grid-cols-3 gap-2" role="group" aria-label={I.riskTitle}>
                        {(Object.keys(PRESETS) as RiskProfile[]).map((p) => (
                            <button
                                key={p}
                                type="button"
                                aria-pressed={activeProfile === p}
                                onClick={() => applyPreset(p)}
                                className={`rounded-xl border px-2 py-2.5 text-center transition-all duration-200 ${
                                    activeProfile === p
                                        ? 'border-starta-teal bg-starta-teal/10 text-starta-teal shadow-lg shadow-starta-teal/10'
                                        : 'border-border bg-panel/30 text-muted hover:border-starta-teal/40 hover:text-main'
                                }`}
                            >
                                <span className="block text-xs font-bold">{I.presets[p]}</span>
                                {/* The SENTENCE is Arabic on /ar, so it must not be
                                    forced dir="ltr" — that pushed the digits to the
                                    wrong end of it. The FIGURE is isolated instead
                                    (lib/bidi.ts), which is inert in English. */}
                                <span className="mt-0.5 block text-[10px] tabular-nums opacity-80">
                                    {tpl(I.presetMeta, { r: ltrNum(`${PRESETS[p].ret}%`) })}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="space-y-5">
                        <Slider id="inv-initial" label={I.inputs.initial} value={initial} display={money(initial)}
                            min={10_000} max={1_000_000} step={5_000} onChange={setInitial} rtl={rtl} />
                        <Slider id="inv-monthly" label={I.inputs.monthly} value={monthly} display={money(monthly)}
                            min={0} max={50_000} step={500} onChange={setMonthly} rtl={rtl} />
                        <Slider id="inv-years" label={I.inputs.years} value={years} display={formatYears(years, L.common)}
                            min={1} max={30} step={1} onChange={setYears} rtl={rtl} />
                        <Slider id="inv-return" label={I.inputs.expReturn} value={ret} display={`${ret}%`}
                            min={3} max={25} step={0.5} onChange={setRet} rtl={rtl} />
                    </div>
                </section>

                {/* results */}
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-starta-teal/40 bg-starta-teal/5 p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{I.stats.finalValue}</div>
                            <div dir="ltr" className="mt-1.5 text-lg font-extrabold tabular-nums tracking-tight text-starta-teal ltr:text-left rtl:text-right">
                                {money(last.pv)}
                            </div>
                            <div dir="ltr" className="mt-0.5 text-[11px] font-semibold tabular-nums text-starta-teal/80 ltr:text-left rtl:text-right">
                                {tpl(I.stats.totalReturnPct, { p: retPct })}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{I.stats.invested}</div>
                            <div dir="ltr" className="mt-1.5 text-lg font-extrabold tabular-nums tracking-tight text-main ltr:text-left rtl:text-right">
                                {money(last.invested)}
                            </div>
                            <div className="mt-0.5 text-[11px] text-muted">{tpl(I.stats.investedSub, { years: formatYears(years, L.common) })}</div>
                        </div>
                        <div className="rounded-2xl border border-border bg-surface p-4">
                            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{I.stats.gains}</div>
                            <div dir="ltr" className="mt-1.5 text-lg font-extrabold tabular-nums tracking-tight text-main ltr:text-left rtl:text-right">
                                {money(last.gains)}
                            </div>
                            <div className="mt-0.5 text-[11px] text-muted">{I.stats.gainsSub}</div>
                        </div>
                    </div>

                    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                        <h3 className="mb-3 text-sm font-extrabold tracking-tight text-main">{I.chart.title}</h3>
                        <GrowthChart data={data} title={I.chart.title} yearTickTpl={L.common.yearTick} />
                        <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
                            <span className="flex items-center gap-2">
                                <span aria-hidden className="inline-block h-1 w-5 rounded-full bg-starta-teal" />
                                {I.chart.legendPortfolio}
                            </span>
                            <span className="flex items-center gap-2">
                                <span aria-hidden className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-500" />
                                {I.chart.legendInvested}
                            </span>
                        </div>
                        {/* Re-homed from the Monte Carlo panel that used to close this
                            column. It is the line that stops a projection being read as
                            a promise, so it follows the chart rather than leaving with
                            the band. */}
                        <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted">
                            {I.disclaimer}
                        </p>
                    </section>

                </div>
            </div>
        </div>
    );
}
