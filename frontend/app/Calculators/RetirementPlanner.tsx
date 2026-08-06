'use client';

/**
 * Retirement Planner — 5-step wizard (Personal → Income → Returns → Needs →
 * Results). Faithful React port of the standalone retirement-calculator tool:
 * the math (growingAnnuityFV incl. r≈g branch, the doCalculate pipeline, the
 * year-by-year table builder and the comparison-chart series) is preserved
 * EXACTLY; only the shell (validation UX, styling, i18n) is re-designed to the
 * Starta token system. Default currency is EGP (Egypt-first site).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CalcLabels, CurrencyCode } from './calculators-i18n';
import { tpl } from './calculators-i18n';
import {
    CURRENCY_CONFIG,
    CURRENCY_ORDER,
    formatPercent,
    formatShort,
    formatYears,
    growingAnnuityFV,
    moneyFormatters,
} from './calc-shared';

/* ────────────────────────────── types ─────────────────────────────── */

type FieldId =
    | 'currentAge'
    | 'retireAge'
    | 'lifeExpectancy'
    | 'currentMonthlySalary'
    | 'salaryIncrease'
    | 'savePercent'
    | 'currentSavings'
    | 'returnBefore'
    | 'returnAfter'
    | 'inflation'
    | 'retireMonthlySalary'
    | 'otherMonthlyIncome'
    | 'otherIncomeIncrease'
    | 'otherAssets';

type Values = Record<FieldId, string>;

/** Parsed model — mirrors the source tool's getInputs() (rates as fractions). */
type Inputs = {
    currentAge: number;
    retireAge: number;
    lifeExpectancy: number;
    currentSalary: number;
    salaryIncrease: number;
    currentSavings: number;
    savePercent: number;
    returnBefore: number;
    returnAfter: number;
    inflation: number;
    retireSalary: number;
    otherIncome: number;
    otherIncomeIncrease: number;
    otherAssets: number;
};

type CalcResult = {
    d: Inputs;
    netNeeded: number;
    totalAvailable: number;
    shortfall: number;
    additionalMonthly: number;
    goalSavePercent: number;
    yearsLastCurrent: number;
    yearsToPayOut: number;
    currentAnnualContrib: number;
    goalAnnualContrib: number;
};

type Row = {
    kind: 'start' | 'accum' | 'retire' | 'payout';
    tone: 'none' | 'negative' | 'zero';
    year: number | null; // null = start row
    age: number;
    ret: number | null; // fraction
    salary: number;
    contrib: number | null;
    otherInc: number | null;
    payout: number | null;
    interest: number | null;
    balance: number;
};

type ValErr = { field: FieldId; step: number; msg: string };

/* ─────────────────────────── pure math (exact ports) ─────────────────────── */

const parseNum = (s: string, def = 0): number => {
    const v = parseFloat(s);
    return Number.isNaN(v) ? def : v;
};

function getInputs(v: Values): Inputs {
    const monthlySalary = parseNum(v.currentMonthlySalary);
    const retireMonthly = parseNum(v.retireMonthlySalary);
    const otherMonthly = parseNum(v.otherMonthlyIncome);
    return {
        currentAge: parseNum(v.currentAge),
        retireAge: parseNum(v.retireAge),
        lifeExpectancy: parseNum(v.lifeExpectancy),
        currentSalary: monthlySalary * 12,
        salaryIncrease: parseNum(v.salaryIncrease) / 100,
        currentSavings: parseNum(v.currentSavings),
        savePercent: parseNum(v.savePercent) / 100,
        returnBefore: parseNum(v.returnBefore) / 100,
        returnAfter: parseNum(v.returnAfter) / 100,
        inflation: parseNum(v.inflation) / 100,
        retireSalary: retireMonthly * 12,
        otherIncome: otherMonthly * 12,
        otherIncomeIncrease: parseNum(v.otherIncomeIncrease) / 100,
        otherAssets: parseNum(v.otherAssets),
    };
}

function validateInputs(d: Inputs, e: CalcLabels['ret']['errors']): ValErr[] {
    const errs: ValErr[] = [];
    if (d.currentAge <= 0) errs.push({ field: 'currentAge', step: 1, msg: e.currentAge });
    if (d.retireAge <= 0) errs.push({ field: 'retireAge', step: 1, msg: e.retireAge });
    else if (d.currentAge > 0 && d.retireAge <= d.currentAge)
        errs.push({ field: 'retireAge', step: 1, msg: e.retireAgeOrder });
    if (d.lifeExpectancy <= 0) errs.push({ field: 'lifeExpectancy', step: 1, msg: e.lifeExpectancy });
    else if (d.retireAge > 0 && d.lifeExpectancy <= d.retireAge)
        errs.push({ field: 'lifeExpectancy', step: 1, msg: e.lifeExpectancyOrder });
    if (d.currentSalary <= 0) errs.push({ field: 'currentMonthlySalary', step: 2, msg: e.currentSalary });
    if (d.retireSalary <= 0) errs.push({ field: 'retireMonthlySalary', step: 4, msg: e.retireSalary });
    return errs;
}

/** EXACT port of the source doCalculate() computation pipeline. */
function compute(d: Inputs): CalcResult {
    const yearsToInvest = d.retireAge - d.currentAge;
    const yearsToPayOut = d.lifeExpectancy - d.retireAge;

    const inflationAdjSalaryAtRetire = d.retireSalary * Math.pow(1 + d.inflation, yearsToInvest);

    let totalNeeded = 0;
    let otherIncomePV = 0;
    let otherInc = d.otherIncome;
    for (let j = 0; j < yearsToPayOut; j++) {
        const payout = inflationAdjSalaryAtRetire * Math.pow(1 + d.inflation, j);
        totalNeeded += payout / Math.pow(1 + d.returnAfter, j);
        otherIncomePV += otherInc / Math.pow(1 + d.returnAfter, j);
        otherInc *= 1 + d.otherIncomeIncrease;
    }
    const netNeeded = Math.max(0, totalNeeded - otherIncomePV);

    const savingsAtRetire = d.currentSavings * Math.pow(1 + d.returnBefore, yearsToInvest);
    const firstContrib = d.currentSalary * d.savePercent;
    const contributionsAtRetire = growingAnnuityFV(firstContrib, d.returnBefore, d.salaryIncrease, yearsToInvest);
    const otherAssetsAtRetire = d.otherAssets;
    const totalAvailable = savingsAtRetire + contributionsAtRetire + otherIncomePV + otherAssetsAtRetire;

    const shortfall = Math.max(0, netNeeded - totalAvailable);

    let additionalAnnual = 0;
    if (shortfall > 0 && yearsToInvest > 0) {
        const fvFactor = growingAnnuityFV(1, d.returnBefore, d.salaryIncrease, yearsToInvest);
        if (fvFactor > 0) {
            additionalAnnual = shortfall / fvFactor;
        }
    }
    const additionalMonthly = additionalAnnual / 12;
    const goalSavePercent = d.savePercent + additionalAnnual / d.currentSalary;

    const portfolioAtRetire = savingsAtRetire + contributionsAtRetire + otherAssetsAtRetire;
    let balance = portfolioAtRetire;
    let retireSal = inflationAdjSalaryAtRetire;
    let oInc = d.otherIncome;
    let yearsLastCurrent = 0;
    for (let j = 0; j < yearsToPayOut; j++) {
        const netPayout = retireSal - oInc;
        if (balance < netPayout) {
            yearsLastCurrent = j + balance / netPayout;
            break;
        }
        balance = (balance - netPayout) * (1 + d.returnAfter);
        retireSal *= 1 + d.inflation;
        oInc *= 1 + d.otherIncomeIncrease;
        yearsLastCurrent = j + 1;
    }

    return {
        d,
        netNeeded,
        totalAvailable,
        shortfall,
        additionalMonthly,
        goalSavePercent,
        yearsLastCurrent,
        yearsToPayOut,
        currentAnnualContrib: d.currentSalary * d.savePercent,
        goalAnnualContrib: d.currentSalary * goalSavePercent,
    };
}

/** EXACT port of the source buildTable() row generation (values, not DOM). */
function buildRows(d: Inputs, saveRate: number, isGoal: boolean): Row[] {
    const rows: Row[] = [];
    const yearsToInvest = d.retireAge - d.currentAge;
    const yearsToPayOut = d.lifeExpectancy - d.retireAge;
    let balance = d.currentSavings;
    let salary = d.currentSalary;
    const otherInc = d.otherIncome;

    rows.push({
        kind: 'start', tone: 'none', year: null, age: d.currentAge, ret: null,
        salary, contrib: null, otherInc: null, payout: null, interest: null, balance,
    });

    for (let year = 1; year <= yearsToInvest; year++) {
        const age = d.currentAge + year;
        const contrib = salary * saveRate;
        const interest = balance * d.returnBefore;
        const newBalance = balance + contrib + interest;
        rows.push({
            kind: 'accum', tone: 'none', year, age, ret: d.returnBefore,
            salary, contrib, otherInc: 0, payout: 0, interest, balance: newBalance,
        });
        balance = newBalance;
        salary *= 1 + d.salaryIncrease;
    }

    const inflationAdjSal = d.retireSalary * Math.pow(1 + d.inflation, yearsToInvest);
    let retirePayout = inflationAdjSal;
    let retireOtherInc = otherInc;

    const netPayout = retirePayout - retireOtherInc;
    const retireInterest = (balance - netPayout) * d.returnAfter;
    const retireNewBalance = (balance - netPayout) * (1 + d.returnAfter);
    rows.push({
        kind: 'retire', tone: 'none', year: yearsToInvest + 1, age: d.retireAge, ret: d.returnAfter,
        salary: retirePayout, contrib: 0, otherInc: retireOtherInc, payout: retirePayout,
        interest: retireInterest, balance: retireNewBalance,
    });

    balance = retireNewBalance;
    retirePayout *= 1 + d.inflation;
    retireOtherInc *= 1 + d.otherIncomeIncrease;

    for (let year = 2; year <= yearsToPayOut; year++) {
        const age = d.retireAge + year - 1;
        const actualYear = yearsToInvest + year;
        const netPayout2 = retirePayout - retireOtherInc;
        const interest = (balance - netPayout2) * d.returnAfter;
        const newBalance = (balance - netPayout2) * (1 + d.returnAfter);
        const tone: Row['tone'] =
            newBalance < 0 ? 'negative' : Math.abs(newBalance) < 1000 && isGoal ? 'zero' : 'none';
        rows.push({
            kind: 'payout', tone, year: actualYear, age, ret: d.returnAfter,
            salary: retirePayout, contrib: 0, otherInc: retireOtherInc, payout: retirePayout,
            interest, balance: newBalance,
        });
        balance = newBalance;
        retirePayout *= 1 + d.inflation;
        retireOtherInc *= 1 + d.otherIncomeIncrease;
        if (balance < 0 && !isGoal) break;
    }
    return rows;
}

/** EXACT port of the source buildCompareChart() data series. */
function buildChartSeries(d: Inputs, goalSavePercent: number) {
    const yearsToInvest = d.retireAge - d.currentAge;
    const yearsToPayOut = d.lifeExpectancy - d.retireAge;
    const totalYears = yearsToInvest + yearsToPayOut;

    const goalData: number[] = [];
    let balG = d.currentSavings;
    let salG = d.currentSalary;
    for (let y = 0; y <= yearsToInvest; y++) {
        goalData.push(balG);
        const contrib = salG * goalSavePercent;
        balG = balG * (1 + d.returnBefore) + contrib;
        salG *= 1 + d.salaryIncrease;
    }
    balG = goalData[yearsToInvest]; // actual plotted retirement balance
    const infAdjG = d.retireSalary * Math.pow(1 + d.inflation, yearsToInvest);
    let payG = infAdjG;
    let oIncG = d.otherIncome;
    for (let y = 1; y <= yearsToPayOut; y++) {
        const net = payG - oIncG;
        balG = Math.max(0, (balG - net) * (1 + d.returnAfter));
        goalData.push(balG);
        payG *= 1 + d.inflation;
        oIncG *= 1 + d.otherIncomeIncrease;
    }

    const currentData: number[] = [];
    let balC = d.currentSavings;
    let salC = d.currentSalary;
    for (let y = 0; y <= yearsToInvest; y++) {
        currentData.push(balC);
        const contrib = salC * d.savePercent;
        balC = balC * (1 + d.returnBefore) + contrib;
        salC *= 1 + d.salaryIncrease;
    }
    balC = currentData[yearsToInvest]; // actual plotted retirement balance
    const infAdjC = d.retireSalary * Math.pow(1 + d.inflation, yearsToInvest);
    let payC = infAdjC;
    let oIncC = d.otherIncome;
    let currentDepletedAtYear: number | null = null;
    for (let y = 1; y <= yearsToPayOut; y++) {
        const net = payC - oIncC;
        const newBalC = (balC - net) * (1 + d.returnAfter);
        if (newBalC <= 0) {
            currentData.push(0);
            currentDepletedAtYear = yearsToInvest + y;
            break;
        }
        balC = newBalC;
        currentData.push(balC);
        payC *= 1 + d.inflation;
        oIncC *= 1 + d.otherIncomeIncrease;
    }

    return { goalData, currentData, currentDepletedAtYear, yearsToInvest, totalYears };
}

/* ────────────────────────────── UI atoms ─────────────────────────────── */

function Tip({ text }: { text: string }) {
    return (
        <span className="group relative ms-1 inline-flex align-middle">
            <button
                type="button"
                aria-label={text}
                className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border bg-panel/60 text-[9px] font-bold text-muted transition-colors hover:border-starta-teal/50 hover:text-starta-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-starta-teal/40"
            >
                i
            </button>
            <span
                role="tooltip"
                className="pointer-events-none invisible absolute bottom-6 start-1/2 z-20 w-56 rounded-lg border border-border bg-surface p-2.5 text-[11px] font-normal leading-relaxed text-muted opacity-0 shadow-xl transition-all duration-200 ltr:-translate-x-1/2 rtl:translate-x-1/2 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
            >
                {text}
            </span>
        </span>
    );
}

function NumField(props: {
    id: string;
    label: string;
    labelSuffix?: string;
    tip?: string;
    sym?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    invalid?: string | null;
    min?: number;
    max?: number;
    step?: number;
}) {
    const { id, label, labelSuffix, tip, sym, value, onChange, placeholder, invalid, min, max, step } = props;
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 flex items-center text-xs font-semibold text-muted">
                <span>
                    {label}
                    {labelSuffix && <span className="ms-1 font-normal opacity-80">{labelSuffix}</span>}
                </span>
                {tip && <Tip text={tip} />}
            </label>
            <div className="relative">
                <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    dir="ltr"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    aria-invalid={invalid ? true : undefined}
                    aria-describedby={invalid ? `${id}-err` : undefined}
                    className={`w-full rounded-xl border bg-panel/40 px-3.5 py-2.5 text-sm text-main tabular-nums transition-colors placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-starta-teal/30 ${
                        invalid ? 'border-red-500/70' : 'border-border focus:border-starta-teal/60'
                    } ${sym ? 'pe-14' : ''}`}
                />
                {sym && (
                    <span aria-hidden className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
                        {sym}
                    </span>
                )}
            </div>
            {invalid && (
                <p id={`${id}-err`} className="mt-1 text-[11px] font-semibold text-red-500">
                    {invalid}
                </p>
            )}
        </div>
    );
}

function NextBtn({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="btn-primary inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest"
        >
            <span>{label}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="rtl:rotate-180" aria-hidden>
                <path d="m9 18 6-6-6-6" />
            </svg>
        </button>
    );
}

function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="btn-secondary inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest"
        >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ltr:rotate-180" aria-hidden>
                <path d="m9 18 6-6-6-6" />
            </svg>
            <span>{label}</span>
        </button>
    );
}

function ReadonlyField({ label, note, value }: { label: string; note: string; value: string }) {
    return (
        <div>
            <span className="mb-1.5 block text-xs font-semibold text-muted">
                {label} <span className="font-normal text-starta-teal">{note}</span>
            </span>
            <div dir="ltr" className="w-full rounded-xl border border-border bg-panel/60 px-3.5 py-2.5 text-sm font-bold text-starta-teal tabular-nums ltr:text-left rtl:text-right">
                {value}
            </div>
        </div>
    );
}

/* ────────────────────────────── chart ─────────────────────────────── */

function CompareChart({
    d,
    goalRate,
    symbol,
    L,
    yearTickTpl,
}: {
    d: Inputs;
    goalRate: number;
    symbol: string;
    L: CalcLabels['ret'];
    yearTickTpl: string;
}) {
    const fm = moneyFormatters(symbol);
    const { goalData, currentData, currentDepletedAtYear, yearsToInvest, totalYears } = useMemo(
        () => buildChartSeries(d, goalRate),
        [d, goalRate]
    );
    if (totalYears <= 0) return null;

    const w = 700, h = 320;
    const padL = 50, padR = 20, padT = 20, padB = 40;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    const maxVal = Math.max(...goalData, ...currentData, 1);
    const range = maxVal || 1;
    const xFor = (i: number) => padL + (i / totalYears) * chartW;
    const yFor = (v: number) => padT + chartH - (v / range) * chartH;

    const grid: React.ReactNode[] = [];
    for (let i = 0; i <= 5; i++) {
        const val = (range * i) / 5;
        const y = yFor(val);
        grid.push(
            <g key={`g${i}`}>
                <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--c-border)" strokeWidth={1} />
                {/* symbol-less compact ticks: the "EGP "/"ج.م " prefixes overflow
                    the 50px axis gutter (the source tool used a 1-char "$"). */}
                <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--c-text-muted)">
                    {formatShort(val)}
                </text>
            </g>
        );
    }

    const xticks: React.ReactNode[] = [];
    for (let i = 0; i <= totalYears; i += Math.ceil(totalYears / 10)) {
        xticks.push(
            <text key={`x${i}`} x={xFor(i)} y={h - 10} textAnchor="middle" fontSize={10} fill="var(--c-text-muted)">
                {tpl(yearTickTpl, { n: i })}
            </text>
        );
    }

    const barWidth = Math.max(2, (chartW / totalYears) * 0.55);
    const bars = currentData.map((val, i) => {
        const y = yFor(val);
        const barH = padT + chartH - y;
        if (barH <= 0) return null;
        return (
            <rect key={`b${i}`} x={xFor(i) - barWidth / 2} y={y} width={barWidth} height={barH} fill="#EF4444" opacity={0.6} />
        );
    });

    let dpath = `M${xFor(0)} ${yFor(goalData[0])}`;
    for (let i = 1; i < goalData.length; i++) dpath += ` L${xFor(i)} ${yFor(goalData[i])}`;

    const retireX = xFor(yearsToInvest);
    const retireBalance = goalData[yearsToInvest];
    const retireY = yFor(retireBalance);

    let peakVal = retireBalance;
    let peakIdx = yearsToInvest;
    for (let i = yearsToInvest; i < goalData.length; i++) {
        if (goalData[i] > peakVal) {
            peakVal = goalData[i];
            peakIdx = i;
        }
    }
    const showPeak = peakVal > retireBalance * 1.15;

    return (
        <div dir="ltr" className="mt-4 rounded-xl border border-border bg-panel/30 p-2">
            <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={L.results.chartTitle} className="h-auto w-full">
                {grid}
                {xticks}
                <line x1={retireX} x2={retireX} y1={padT} y2={h - padB} stroke="#F59E0B" strokeWidth={2} strokeDasharray="4,4" />
                {bars}
                {currentDepletedAtYear !== null && (
                    <g>
                        <circle cx={xFor(currentDepletedAtYear)} cy={yFor(0)} r={4} fill="#EF4444" />
                        <text x={xFor(currentDepletedAtYear)} y={yFor(0) - 8} textAnchor="middle" fontSize={9} fill="#EF4444" fontWeight={700}>
                            {tpl(L.chart.fundsRunOut, { y: currentDepletedAtYear })}
                        </text>
                    </g>
                )}
                <path d={dpath} fill="none" stroke="#14B8A6" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={retireX} cy={retireY} r={4} fill="#14B8A6" />
                <text
                    x={retireX}
                    y={retireY - 10}
                    textAnchor={retireX > padL + chartW * 0.7 ? 'end' : 'middle'}
                    fontSize={9}
                    fill="#14B8A6"
                    fontWeight={700}
                >
                    {tpl(L.chart.retirementPoint, { v: fm.moneyCompact(retireBalance) })}
                </text>
                {showPeak && (
                    <g>
                        <circle cx={xFor(peakIdx)} cy={yFor(peakVal)} r={4} fill="#14B8A6" stroke="var(--c-surface)" strokeWidth={1.5} />
                        <text
                            x={xFor(peakIdx)}
                            y={yFor(peakVal) - 10}
                            textAnchor={xFor(peakIdx) > padL + chartW * 0.7 ? 'end' : 'middle'}
                            fontSize={9}
                            fill="#14B8A6"
                            fontWeight={700}
                        >
                            {tpl(L.chart.peak, { v: fm.moneyCompact(peakVal), y: peakIdx })}
                        </text>
                    </g>
                )}
            </svg>
        </div>
    );
}

/* ────────────────────────────── main component ─────────────────────────────── */

const STEP_COUNT = 5;

/** Age fields must be whole years — the chart/table math indexes year arrays,
 *  so a fractional age (e.g. 26.5) would produce NaN paths and labels. */
const INT_FIELDS: readonly FieldId[] = ['currentAge', 'retireAge', 'lifeExpectancy'];

function presetValues(code: CurrencyCode): Values {
    const cfg = CURRENCY_CONFIG[code];
    return {
        currentAge: '',
        retireAge: '',
        lifeExpectancy: String(cfg.lifeExpectancy),
        currentMonthlySalary: '',
        salaryIncrease: String(cfg.salaryIncrease),
        savePercent: '',
        currentSavings: '',
        returnBefore: String(cfg.returnBefore),
        returnAfter: String(cfg.returnAfter),
        inflation: String(cfg.inflation),
        retireMonthlySalary: '',
        otherMonthlyIncome: '',
        otherIncomeIncrease: '',
        otherAssets: '',
    };
}

export default function RetirementPlanner({ L }: { L: CalcLabels }) {
    const R = L.ret;
    const [currency, setCurrency] = useState<CurrencyCode>('EGP');
    const [values, setValues] = useState<Values>(() => presetValues('EGP'));
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<ValErr[] | null>(null);
    const [calc, setCalc] = useState<CalcResult | null>(null);
    const [tab, setTab] = useState<'compare' | 'goal' | 'current'>('compare');

    const wizardRef = useRef<HTMLDivElement>(null);
    const stepHeadingRef = useRef<HTMLHeadingElement>(null);
    const prevStepRef = useRef(step);

    /* On step change: scroll back to the top of the wizard and move focus to
       the new step's heading (same pattern as RiskAssessmentClient). */
    useEffect(() => {
        if (prevStepRef.current === step) return;
        prevStepRef.current = step;
        wizardRef.current?.scrollIntoView({ block: 'start' });
        stepHeadingRef.current?.focus({ preventScroll: true });
    }, [step]);

    const cfg = CURRENCY_CONFIG[currency];
    const sym = L.currency.symbols[currency];
    const fm = moneyFormatters(sym);
    const eg = (v: string) => tpl(L.common.eg, { v });

    const setField = (field: FieldId) => (v: string) => {
        let next = v;
        if (INT_FIELDS.includes(field) && v !== '') {
            const parsed = parseFloat(v);
            if (!Number.isNaN(parsed)) next = String(Math.trunc(parsed));
        }
        setValues((prev) => ({ ...prev, [field]: next }));
        setErrors(null);
        setCalc(null); // any input edit invalidates the computed results until Calculate runs again
    };
    const fieldErr = (field: FieldId): string | null => errors?.find((e) => e.field === field)?.msg ?? null;

    const changeCurrency = (code: CurrencyCode) => {
        setCurrency(code);
        setValues(presetValues(code));
        setErrors(null);
        setCalc(null);
        setStep(1); // never leave the user parked on a now-empty Results step
    };
    const doReset = () => {
        changeCurrency(currency);
        setStep(1);
        setTab('compare');
    };

    const doCalculate = () => {
        const d = getInputs(values);
        const errs = validateInputs(d, R.errors);
        if (errs.length > 0) {
            setErrors(errs);
            setStep(errs[0].step);
            return;
        }
        setErrors(null);
        setCalc(compute(d));
        setTab('compare');
        setStep(5);
    };

    /* live-updating reference values */
    const curMonthly = parseNum(values.currentMonthlySalary, NaN);
    const currentAnnualRef = !Number.isNaN(curMonthly) && curMonthly > 0 ? fm.money(curMonthly * 12) : '—';
    const retMonthly = parseNum(values.retireMonthlySalary, NaN);
    const retireAnnualRef = !Number.isNaN(retMonthly) && retMonthly > 0 ? fm.money(retMonthly * 12) : '—';
    const refAge = parseNum(values.currentAge, NaN);
    const refRetAge = parseNum(values.retireAge, NaN);
    const refInfl = parseNum(values.inflation, NaN) / 100;
    let inflAdjMonthlyRef = '—';
    let inflAdjAnnualRef = '—';
    if (
        !Number.isNaN(retMonthly) && retMonthly > 0 &&
        !Number.isNaN(refAge) && !Number.isNaN(refRetAge) && refRetAge > refAge && !Number.isNaN(refInfl)
    ) {
        const yrs = refRetAge - refAge;
        inflAdjMonthlyRef = fm.moneyPrecise(retMonthly * Math.pow(1 + refInfl, yrs));
        inflAdjAnnualRef = fm.moneyPrecise(retMonthly * 12 * Math.pow(1 + refInfl, yrs));
    }
    const otherMonthly = parseNum(values.otherMonthlyIncome, NaN);
    const otherAnnualRef = !Number.isNaN(otherMonthly) && otherMonthly > 0 ? fm.money(otherMonthly * 12) : '—';

    /* results derivations */
    const goalRows = useMemo(
        () => (calc ? buildRows(calc.d, calc.goalSavePercent, true) : []),
        [calc]
    );
    const currentRows = useMemo(
        () => (calc ? buildRows(calc.d, calc.d.savePercent, false) : []),
        [calc]
    );

    const disclaimerTax =
        currency === 'USD' ? R.disclaimer.taxUS : tpl(R.disclaimer.taxOther, { name: L.currency.names[currency] });

    const errorSummary = errors && errors.length > 0 && (
        <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-red-500">{R.errors.summaryTitle}</p>
            <ul className="mt-2 space-y-1 text-[13px] text-red-500/90">
                {errors.map((e) => (
                    <li key={`${e.field}-${e.msg}`}>• {e.msg}</li>
                ))}
            </ul>
        </div>
    );

    const stepCard = (title: string, children: React.ReactNode) => (
        <section className="calc-fade rounded-2xl border border-border bg-surface p-6 sm:p-7">
            <h3
                ref={stepHeadingRef}
                tabIndex={-1}
                className="mb-5 flex items-center gap-2.5 text-base font-extrabold tracking-tight text-main outline-none"
            >
                <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                {title}
            </h3>
            {children}
        </section>
    );

    const toneCls = (tone: Row['tone'], kind: Row['kind']): string => {
        if (tone === 'negative') return 'bg-red-500/10 text-red-500';
        if (tone === 'zero') return 'bg-emerald-500/10 text-emerald-500 font-semibold';
        if (kind === 'start') return 'bg-starta-teal/10 font-semibold';
        if (kind === 'retire') return 'bg-amber-500/10 font-semibold';
        return '';
    };

    const renderTable = (rows: Row[], title: string) => (
        <div className="calc-fade rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h4 className="mb-4 text-sm font-extrabold tracking-tight text-main">{title}</h4>
            <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[720px] text-[12px]">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-[10px] font-bold uppercase tracking-wide text-muted">
                            <th className="px-3 py-2.5 text-start">{R.table.year}</th>
                            <th className="px-3 py-2.5 text-start">{R.table.age}</th>
                            <th className="px-3 py-2.5 text-end">{R.table.ret}</th>
                            <th className="px-3 py-2.5 text-end">{R.table.salary}</th>
                            <th className="px-3 py-2.5 text-end">{R.table.contrib}</th>
                            <th className="px-3 py-2.5 text-end">{R.table.otherInc}</th>
                            <th className="px-3 py-2.5 text-end">{R.table.payout}</th>
                            <th className="px-3 py-2.5 text-end">{R.table.interest}</th>
                            <th className="px-3 py-2.5 text-end">{R.table.balance}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr key={i} className={`border-b border-border/60 last:border-0 ${toneCls(r.tone, r.kind)}`}>
                                <td className="px-3 py-2 text-start">{r.year === null ? R.table.start : r.year}</td>
                                <td className="px-3 py-2 text-start tabular-nums">{r.age}</td>
                                <td dir="ltr" className="px-3 py-2 text-end tabular-nums">{r.ret === null ? '—' : formatPercent(r.ret)}</td>
                                <td dir="ltr" className="px-3 py-2 text-end tabular-nums">{fm.money(r.salary)}</td>
                                <td dir="ltr" className="px-3 py-2 text-end tabular-nums">{r.contrib === null ? '—' : fm.money(r.contrib)}</td>
                                <td dir="ltr" className="px-3 py-2 text-end tabular-nums">{r.otherInc === null ? '—' : fm.money(r.otherInc)}</td>
                                <td dir="ltr" className={`px-3 py-2 text-end tabular-nums ${r.payout !== null && r.payout > 0 ? 'font-semibold text-red-500' : ''}`}>
                                    {r.payout === null ? '—' : fm.money(r.payout)}
                                </td>
                                <td dir="ltr" className="px-3 py-2 text-end tabular-nums">{r.interest === null ? '—' : fm.money(r.interest)}</td>
                                <td dir="ltr" className={`px-3 py-2 text-end font-bold tabular-nums ${r.balance < 0 ? 'text-red-500' : ''}`}>
                                    {fm.money(r.balance)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    /* ── stepper ── */
    const stepper = (
        <div className="mx-auto mb-8 max-w-xl">
            <div className="flex items-center justify-center gap-1">
                {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((n) => (
                    <div key={n} className="flex flex-1 items-center gap-1 last:flex-none">
                        <button
                            type="button"
                            onClick={() => {
                                if (n < 5) setStep(n);
                                else if (calc) setStep(5);
                            }}
                            aria-label={`${n}. ${R.stepLabels[n - 1]}`}
                            aria-current={step === n ? 'step' : undefined}
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ${
                                n < step
                                    ? 'border-starta-teal bg-starta-teal text-white'
                                    : n === step
                                      ? 'border-starta-teal bg-starta-teal/15 text-starta-teal ring-2 ring-starta-teal/25'
                                      : 'border-border bg-panel/40 text-muted'
                            }`}
                        >
                            {n < step ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                                    <path d="m5 13 4 4L19 7" />
                                </svg>
                            ) : (
                                n
                            )}
                        </button>
                        {n < STEP_COUNT && (
                            <div className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${n < step ? 'bg-starta-teal' : 'bg-border'}`} />
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
                {R.stepLabels.map((label, i) => (
                    <span key={label} className={i + 1 === step ? 'text-starta-teal' : 'text-muted'}>
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );

    return (
        <div ref={wizardRef}>
            {/* currency selector */}
            <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-border bg-surface p-4 text-center">
                <label htmlFor="ret-currency" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                    {L.currency.label}
                </label>
                <select
                    id="ret-currency"
                    value={currency}
                    onChange={(e) => changeCurrency(e.target.value as CurrencyCode)}
                    className="w-full cursor-pointer rounded-xl border border-border bg-panel/40 px-3.5 py-2.5 text-sm font-semibold text-main focus:border-starta-teal/60 focus:outline-none focus:ring-2 focus:ring-starta-teal/30"
                >
                    {CURRENCY_ORDER.map((code) => (
                        <option key={code} value={code}>
                            {code} — {L.currency.names[code]}
                        </option>
                    ))}
                </select>
            </div>

            {stepper}

            {/* STEP 1 — Personal */}
            {step === 1 && (
                <div className="mx-auto max-w-xl">
                    {stepCard(
                        `1 · ${R.stepTitles[0]}`,
                        <>
                            {errorSummary}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <NumField id="ret-currentAge" label={R.fields.currentAge.label} tip={R.fields.currentAge.tip}
                                    value={values.currentAge} onChange={setField('currentAge')} placeholder={eg('38')}
                                    invalid={fieldErr('currentAge')} min={18} max={100} />
                                <NumField id="ret-retireAge" label={R.fields.retireAge.label} tip={R.fields.retireAge.tip}
                                    value={values.retireAge} onChange={setField('retireAge')} placeholder={eg('65')}
                                    invalid={fieldErr('retireAge')} min={40} max={100} />
                            </div>
                            <div className="mt-4">
                                <NumField id="ret-lifeExpectancy" label={R.fields.lifeExpectancy.label} tip={R.fields.lifeExpectancy.tip}
                                    value={values.lifeExpectancy} onChange={setField('lifeExpectancy')}
                                    invalid={fieldErr('lifeExpectancy')} min={60} max={120} />
                            </div>
                            <div className="mt-6 flex gap-3">
                                <NextBtn label={R.nav.next} onClick={() => setStep(2)} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* STEP 2 — Income & Savings */}
            {step === 2 && (
                <div className="mx-auto max-w-xl">
                    {stepCard(
                        `2 · ${R.stepTitles[1]}`,
                        <>
                            {errorSummary}
                            <div className="space-y-4">
                                <NumField id="ret-currentMonthlySalary" label={R.fields.currentMonthlySalary.label} tip={R.fields.currentMonthlySalary.tip}
                                    sym={sym} value={values.currentMonthlySalary} onChange={setField('currentMonthlySalary')}
                                    placeholder={eg(cfg.phMonthlySalary)} invalid={fieldErr('currentMonthlySalary')} step={100} />
                                <ReadonlyField label={R.fields.currentAnnualSalary.label} note={R.fields.currentAnnualSalary.note} value={currentAnnualRef} />
                                <NumField id="ret-salaryIncrease" label={R.fields.salaryIncrease.label} tip={R.fields.salaryIncrease.tip}
                                    sym="%" value={values.salaryIncrease} onChange={setField('salaryIncrease')} step={0.1} />
                                <NumField id="ret-savePercent" label={R.fields.savePercent.label} tip={R.fields.savePercent.tip}
                                    sym="%" value={values.savePercent} onChange={setField('savePercent')} placeholder={eg(cfg.phSavePercent)} step={0.1} />
                                <NumField id="ret-currentSavings" label={R.fields.currentSavings.label} tip={R.fields.currentSavings.tip}
                                    sym={sym} value={values.currentSavings} onChange={setField('currentSavings')}
                                    placeholder={eg(cfg.phCurrentSavings)} step={1000} />
                            </div>
                            <div className="mt-6 flex gap-3">
                                <BackBtn label={R.nav.back} onClick={() => setStep(1)} />
                                <NextBtn label={R.nav.next} onClick={() => setStep(3)} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* STEP 3 — Returns & Inflation */}
            {step === 3 && (
                <div className="mx-auto max-w-xl">
                    {stepCard(
                        `3 · ${R.stepTitles[2]}`,
                        <>
                            {errorSummary}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <NumField id="ret-returnBefore" label={R.fields.returnBefore.label} tip={R.fields.returnBefore.tip}
                                    sym="%" value={values.returnBefore} onChange={setField('returnBefore')} step={0.1} />
                                <NumField id="ret-returnAfter" label={R.fields.returnAfter.label} tip={R.fields.returnAfter.tip}
                                    sym="%" value={values.returnAfter} onChange={setField('returnAfter')} step={0.1} />
                            </div>
                            <div className="mt-4">
                                <NumField id="ret-inflation" label={R.fields.inflation.label} tip={R.fields.inflation.tip}
                                    sym="%" value={values.inflation} onChange={setField('inflation')} step={0.1} />
                            </div>
                            <div className="mt-6 flex gap-3">
                                <BackBtn label={R.nav.back} onClick={() => setStep(2)} />
                                <NextBtn label={R.nav.next} onClick={() => setStep(4)} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* STEP 4 — Retirement Needs */}
            {step === 4 && (
                <div className="mx-auto max-w-xl">
                    {stepCard(
                        `4 · ${R.stepTitles[3]}`,
                        <>
                            {errorSummary}
                            <div className="space-y-4">
                                <NumField id="ret-retireMonthlySalary" label={R.fields.retireMonthlySalary.label}
                                    labelSuffix={R.fields.retireMonthlySalary.suffix} tip={R.fields.retireMonthlySalary.tip}
                                    sym={sym} value={values.retireMonthlySalary} onChange={setField('retireMonthlySalary')}
                                    placeholder={eg(cfg.phRetireMonthly)} invalid={fieldErr('retireMonthlySalary')} step={100} />
                                <ReadonlyField label={R.fields.retireAnnualSalary.label} note={R.fields.retireAnnualSalary.note} value={retireAnnualRef} />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <ReadonlyField label={R.fields.inflAdjMonthly.label} note={R.fields.inflAdjMonthly.note} value={inflAdjMonthlyRef} />
                                    <ReadonlyField label={R.fields.inflAdjAnnual.label} note={R.fields.inflAdjAnnual.note} value={inflAdjAnnualRef} />
                                </div>
                                <NumField id="ret-otherMonthlyIncome" label={R.fields.otherMonthlyIncome.label} tip={R.fields.otherMonthlyIncome.tip}
                                    sym={sym} value={values.otherMonthlyIncome} onChange={setField('otherMonthlyIncome')}
                                    placeholder={eg(cfg.phOtherIncome)} step={100} />
                                <ReadonlyField label={R.fields.otherAnnualIncome.label} note={R.fields.otherAnnualIncome.note} value={otherAnnualRef} />
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <NumField id="ret-otherIncomeIncrease" label={R.fields.otherIncomeIncrease.label} tip={R.fields.otherIncomeIncrease.tip}
                                        sym="%" value={values.otherIncomeIncrease} onChange={setField('otherIncomeIncrease')}
                                        placeholder={eg(cfg.phOtherIncomeIncrease)} step={0.1} />
                                    <NumField id="ret-otherAssets" label={R.fields.otherAssets.label} tip={R.fields.otherAssets.tip}
                                        sym={sym} value={values.otherAssets} onChange={setField('otherAssets')}
                                        placeholder={eg(cfg.phOtherAssets)} step={1000} />
                                </div>
                            </div>
                            <div className="mt-6 flex gap-3">
                                <BackBtn label={R.nav.back} onClick={() => setStep(3)} />
                                <NextBtn label={R.nav.calculate} onClick={doCalculate} />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* STEP 5 — Results */}
            {step === 5 && calc && (
                <>
                    {/* focus target for the step-change effect (visually the results
                        speak for themselves; screen readers get the step title).
                        Outside the space-y wrapper so it adds no layout gap. */}
                    <h3 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
                        {`5 · ${R.stepTitles[4]}`}
                    </h3>
                <div className="calc-fade space-y-6">
                    {/* stat cards */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {[
                            { label: R.results.totalNeeded, value: fm.money(calc.netNeeded), tone: 'plain' as const },
                            { label: R.results.totalAvailable, value: fm.money(calc.totalAvailable), tone: 'plain' as const },
                            {
                                label: R.results.shortfall,
                                value: fm.money(calc.shortfall),
                                tone: calc.shortfall > 0 ? ('bad' as const) : ('good' as const),
                            },
                            { label: R.results.additionalMonthly, value: fm.moneyPrecise(calc.additionalMonthly), tone: 'plain' as const },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className={`rounded-2xl border p-4 sm:p-5 ${
                                    s.tone === 'bad'
                                        ? 'border-red-500/40 bg-red-500/5'
                                        : s.tone === 'good'
                                          ? 'border-starta-teal/40 bg-starta-teal/5'
                                          : 'border-border bg-surface'
                                }`}
                            >
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{s.label}</div>
                                <div
                                    dir="ltr"
                                    className={`mt-1.5 text-lg font-extrabold tabular-nums tracking-tight sm:text-xl ltr:text-left rtl:text-right ${
                                        s.tone === 'bad' ? 'text-red-500' : s.tone === 'good' ? 'text-starta-teal' : 'text-main'
                                    }`}
                                >
                                    {s.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* savings-rate progress */}
                    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                        <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="font-semibold text-main">{R.results.savingsRateTitle}</span>
                            <span dir="ltr" className="font-extrabold tabular-nums text-starta-teal">
                                {formatPercent(calc.goalSavePercent)}
                            </span>
                        </div>
                        <div dir="ltr" className="h-5 overflow-hidden rounded-full border border-border bg-panel/60">
                            <div
                                className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-starta-darkTeal to-starta-teal pe-2 text-[10px] font-bold text-white transition-all duration-500"
                                style={{
                                    width: `${
                                        calc.goalSavePercent > 0
                                            ? Math.min(100, (calc.d.savePercent / calc.goalSavePercent) * 100)
                                            : 100
                                    }%`,
                                }}
                            >
                                <span className="whitespace-nowrap">{formatPercent(calc.d.savePercent)}</span>
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-muted">
                            <span>
                                {R.results.currentLabel}: <strong dir="ltr" className="tabular-nums text-main">{formatPercent(calc.d.savePercent)}</strong>
                            </span>
                            <span>
                                {R.results.goalLabel}: <strong dir="ltr" className="tabular-nums text-main">{formatPercent(calc.goalSavePercent)}</strong>
                            </span>
                        </div>
                    </div>

                    {/* highlight */}
                    {calc.shortfall <= 0 ? (
                        <div className="rounded-2xl border border-starta-teal/40 bg-starta-teal/10 p-5">
                            <h4 className="text-sm font-extrabold text-starta-teal">{R.results.onTrackTitle}</h4>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-main">
                                {tpl(R.results.onTrackBody, {
                                    avail: fm.money(calc.totalAvailable),
                                    need: fm.money(calc.netNeeded),
                                    surplus: fm.money(calc.totalAvailable - calc.netNeeded),
                                })}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
                            <h4 className="text-sm font-extrabold text-amber-500">{R.results.actionTitle}</h4>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-main">
                                {tpl(R.results.actionBody, {
                                    short: fm.money(calc.shortfall),
                                    cur: formatPercent(calc.d.savePercent),
                                    goal: formatPercent(calc.goalSavePercent),
                                    monthly: fm.moneyPrecise(calc.additionalMonthly),
                                    years: calc.yearsLastCurrent.toFixed(1),
                                })}
                            </p>
                        </div>
                    )}

                    {/* scenario comparison */}
                    <div>
                        <h3 className="mb-4 flex items-center gap-2.5 text-base font-extrabold tracking-tight text-main">
                            <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                            {R.results.scenarioTitle}
                        </h3>
                        <div className="grid gap-5 sm:grid-cols-2">
                            {[
                                {
                                    badge: R.results.currentPlan,
                                    accent: 'teal' as const,
                                    rows: [
                                        [R.results.scSavingsRate, formatPercent(calc.d.savePercent)],
                                        [R.results.scAnnualContribution, fm.money(calc.currentAnnualContrib)],
                                        [R.results.scTotalAtRetirement, fm.money(calc.totalAvailable)],
                                        [R.results.scShortfall, fm.money(calc.shortfall)],
                                        [R.results.scFundsLast, formatYears(Number(calc.yearsLastCurrent.toFixed(1)), L.common)],
                                    ],
                                },
                                {
                                    badge: R.results.goalPlan,
                                    accent: 'amber' as const,
                                    rows: [
                                        [R.results.scSavingsRate, formatPercent(calc.goalSavePercent)],
                                        [R.results.scAnnualContribution, fm.money(calc.goalAnnualContrib)],
                                        [R.results.scTotalAtRetirement, fm.money(calc.netNeeded)],
                                        [R.results.scShortfall, fm.money(0)],
                                        [R.results.scFundsLast, formatYears(calc.yearsToPayOut, L.common)],
                                    ],
                                },
                            ].map((card) => (
                                <div
                                    key={card.badge}
                                    className={`relative rounded-2xl border-2 bg-surface p-5 pt-6 ${
                                        card.accent === 'teal' ? 'border-starta-teal/50' : 'border-amber-500/50'
                                    }`}
                                >
                                    <span
                                        className={`absolute -top-3 start-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${
                                            card.accent === 'teal' ? 'bg-starta-teal' : 'bg-amber-500'
                                        }`}
                                    >
                                        {card.badge}
                                    </span>
                                    {card.rows.map(([label, value]) => (
                                        <div key={label} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                                            <span className="text-xs text-muted">{label}</span>
                                            <span dir="ltr" className="font-bold tabular-nums text-main">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* tabs */}
                    <div>
                        <div role="tablist" aria-label={R.results.scenarioTitle} className="mb-4 flex gap-1 rounded-full border border-border bg-panel/40 p-1">
                            {(
                                [
                                    ['compare', R.results.tabChart],
                                    ['goal', R.results.tabGoalTable],
                                    ['current', R.results.tabCurrentTable],
                                ] as const
                            ).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    id={`ret-tab-${key}`}
                                    aria-selected={tab === key}
                                    aria-controls={`ret-panel-${key}`}
                                    onClick={() => setTab(key)}
                                    className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                                        tab === key ? 'bg-starta-teal text-white shadow-lg shadow-starta-teal/20' : 'text-muted hover:text-main'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {tab === 'compare' && (
                            <div
                                id="ret-panel-compare"
                                role="tabpanel"
                                aria-labelledby="ret-tab-compare"
                                tabIndex={0}
                                className="calc-fade rounded-2xl border border-border bg-surface p-5 sm:p-6"
                            >
                                <h4 className="text-sm font-extrabold tracking-tight text-main">{R.results.chartTitle}</h4>
                                <CompareChart d={calc.d} goalRate={calc.goalSavePercent} symbol={sym} L={R} yearTickTpl={L.common.yearTick} />
                                <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted">
                                    <span className="flex items-center gap-2">
                                        <span aria-hidden className="inline-block h-1 w-5 rounded-full bg-starta-teal" />
                                        {R.results.legendGoal}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-red-500/60" />
                                        {R.results.legendCurrent}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                                        {R.results.legendRetirement}
                                    </span>
                                </div>
                                <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">{R.results.chartNote}</p>
                            </div>
                        )}
                        {tab === 'goal' && (
                            <div id="ret-panel-goal" role="tabpanel" aria-labelledby="ret-tab-goal" tabIndex={0}>
                                {renderTable(goalRows, tpl(R.results.goalTableTitle, { p: formatPercent(calc.goalSavePercent) }))}
                            </div>
                        )}
                        {tab === 'current' && (
                            <div id="ret-panel-current" role="tabpanel" aria-labelledby="ret-tab-current" tabIndex={0}>
                                {renderTable(currentRows, tpl(R.results.currentTableTitle, { p: formatPercent(calc.d.savePercent) }))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <BackBtn label={R.nav.editInputs} onClick={() => setStep(4)} />
                        <button
                            type="button"
                            onClick={doReset}
                            className="btn-secondary inline-flex flex-1 items-center justify-center rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest"
                        >
                            {R.nav.startOver}
                        </button>
                    </div>

                    {/* disclaimer */}
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4">
                        <strong className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-red-500">
                            {R.disclaimer.title}
                        </strong>
                        <p className="text-[11px] leading-relaxed text-muted">
                            {disclaimerTax} {R.disclaimer.base}
                        </p>
                    </div>
                </div>
                </>
            )}
        </div>
    );
}
