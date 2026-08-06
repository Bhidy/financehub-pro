'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
    QUESTION_COUNT,
    SCORE_MAX,
    STORAGE_KEY,
    buildStoredResult,
    fundCategoriesFor,
    fundCategoryHref,
    profileForScore,
    parseStoredResult,
    scoreFraction,
    PROFILES,
    type StoredResult,
} from './risk-engine';
import { RISK_I18N, fmt, type Lang } from './risk-i18n';

/**
 * Interactive wizard for /RiskAssessment (+/ar twin). Three stages:
 * landing → one-question-per-screen quiz → results. The initial "landing"
 * stage is server-rendered (H1 + intro visible to crawlers); everything else
 * is client state. Scoring lives in risk-engine.ts; all copy in risk-i18n.ts.
 *
 * A11y: options are a real radiogroup (roving tabindex, RTL-aware arrow
 * keys); focus moves to the question / results heading on step change; the
 * progress bar is a labelled progressbar. Motion is restrained CSS only and
 * fully disabled under prefers-reduced-motion. Numbers keep Western digits
 * in both languages.
 */

const OPTION_COUNT = 4;

/** Scoped styles (mirrors the PublicPageShell inline-<style> pattern). */
const WIZ_CSS = `
.risk-wiz .rw-fade{animation:rwFadeUp .34s ease both}
@keyframes rwFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.risk-wiz .rw-needle{transition:left .7s cubic-bezier(.22,1,.36,1)}
.risk-wiz .rw-bar{transition:width .45s ease}
@media (prefers-reduced-motion:reduce){
  .risk-wiz .rw-fade{animation:none}
  .risk-wiz .rw-needle,.risk-wiz .rw-bar{transition:none}
}
`;

type Stage = 'landing' | 'quiz' | 'results';

const freshAnswers = (): Array<number | null> => new Array<number | null>(QUESTION_COUNT).fill(null);

/**
 * The persisted result as an external store (localStorage), read via
 * useSyncExternalStore: null on the server / first hydration render, the
 * parsed value on the client. The parse is cached per raw string so the
 * snapshot stays referentially stable between renders.
 */
let storedCacheRaw: string | null | undefined;
let storedCacheParsed: StoredResult | null = null;

function subscribeStored(onChange: () => void): () => void {
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
}
function getStoredSnapshot(): StoredResult | null {
    let raw: string | null;
    try {
        raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
        raw = null;
    }
    if (raw !== storedCacheRaw) {
        storedCacheRaw = raw;
        storedCacheParsed = parseStoredResult(raw);
    }
    return storedCacheParsed;
}
function getStoredServerSnapshot(): StoredResult | null {
    return null;
}

/* ── Small inline icons (stroke = currentColor) ────────────────────────── */

const ICON_PROPS = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
} as const;

function GaugeIcon() {
    return (
        <svg width="30" height="30" viewBox="0 0 24 24" {...ICON_PROPS} aria-hidden>
            <path d="M12 15 8.5 9.5" />
            <path d="M20.6 16a9 9 0 1 0-17.2 0" />
            <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
        </svg>
    );
}
function ClockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_PROPS} aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </svg>
    );
}
function ListIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_PROPS} aria-hidden>
            <path d="M9 6h11M9 12h11M9 18h11" />
            <path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth={3} />
        </svg>
    );
}
function ChartIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...ICON_PROPS} aria-hidden>
            <path d="M3 3v16a2 2 0 0 0 2 2h16" />
            <path d="m7 14 4-4 3 3 5-6" />
        </svg>
    );
}
function Chevron({ flip }: { flip: boolean }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" {...ICON_PROPS} strokeWidth={2.5} aria-hidden className={flip ? 'rotate-180' : undefined}>
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}

/* ── Risk gauge (5 segments + needle) ──────────────────────────────────── */

const SEGMENT_TINTS = [
    'bg-starta-teal/25',
    'bg-starta-teal/40',
    'bg-starta-teal/55',
    'bg-starta-teal/75',
    'bg-starta-teal',
] as const;

function RiskGauge({
    fraction,
    activeIndex,
    labels,
    ariaLabel,
    isRtl,
}: {
    fraction: number;
    activeIndex: number;
    labels: string[];
    ariaLabel: string;
    isRtl: boolean;
}) {
    // Animate the needle from the safe end to the achieved position on mount.
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setSettled(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const pct = Math.min(100, Math.max(0, (settled ? fraction : 0) * 100));
    // insetInlineStart + translate would fight (translate is physical), so
    // compute the physical `left` explicitly for both directions.
    const leftPct = isRtl ? 100 - pct : pct;

    return (
        <div>
            <div className="relative pt-2.5" role="img" aria-label={ariaLabel}>
                <div className="flex h-3 gap-1">
                    {labels.map((label, i) => (
                        <div
                            key={label}
                            className={`h-full flex-1 first:rounded-s-full last:rounded-e-full ${SEGMENT_TINTS[i]} ${i === activeIndex ? '' : 'opacity-60'}`}
                        />
                    ))}
                </div>
                <div
                    aria-hidden
                    className="rw-needle absolute top-0 h-8 w-[3px] -translate-x-1/2 rounded-full bg-main shadow-[0_0_10px_rgba(20,184,166,0.5)]"
                    style={{ left: `${leftPct}%` }}
                />
            </div>
            <div className="mt-2.5 flex gap-1 text-center text-[9px] font-mono uppercase tracking-wider text-muted sm:text-[10px]">
                {labels.map((label, i) => (
                    <span key={label} className={`flex-1 leading-tight ${i === activeIndex ? 'font-bold text-starta-teal' : ''}`}>
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ── Allocation donut (hand-rolled SVG, no chart lib) ──────────────────── */

type DonutSlice = { key: string; label: string; value: number; color: string };

function AllocationDonut({
    slices,
    centerValue,
    centerCaption,
    ariaLabel,
}: {
    slices: DonutSlice[];
    centerValue: string;
    centerCaption: string;
    ariaLabel: string;
}) {
    const size = 200;
    const stroke = 26;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;

    const visible = slices.filter((s) => s.value > 0);
    const arcs = visible.map((s, i) => ({
        ...s,
        len: (s.value / 100) * c,
        offset: visible.slice(0, i).reduce((sum, prev) => sum + (prev.value / 100) * c, 0),
    }));

    return (
        <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44 shrink-0 sm:h-48 sm:w-48" role="img" aria-label={ariaLabel}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-border)" strokeWidth={stroke} />
            {arcs.map((a) => (
                <circle
                    key={a.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${a.len} ${c - a.len}`}
                    strokeDashoffset={-a.offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            ))}
            <text
                x={size / 2}
                y={size / 2 - 2}
                textAnchor="middle"
                fill="var(--c-text-main)"
                fontSize="34"
                fontWeight="800"
                style={{ fontVariantNumeric: 'tabular-nums' }}
            >
                {centerValue}
            </text>
            <text x={size / 2} y={size / 2 + 22} textAnchor="middle" fill="var(--c-text-muted)" fontSize="12" fontWeight="600">
                {centerCaption}
            </text>
        </svg>
    );
}

/* ── Main wizard ───────────────────────────────────────────────────────── */

export default function RiskAssessmentClient({ lang }: { lang: Lang }) {
    const t = RISK_I18N[lang];
    const isRtl = lang === 'ar';

    const [stage, setStage] = useState<Stage>('landing');
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState<Array<number | null>>(freshAnswers);
    const [result, setResult] = useState<StoredResult | null>(null);
    // Previously persisted result — null during SSR/hydration, then live.
    const saved = useSyncExternalStore(subscribeStored, getStoredSnapshot, getStoredServerSnapshot);

    const questionHeadingRef = useRef<HTMLHeadingElement>(null);
    const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    // Move focus onto the active heading whenever the screen changes.
    useEffect(() => {
        if (stage === 'quiz') questionHeadingRef.current?.focus();
        else if (stage === 'results') resultsHeadingRef.current?.focus();
    }, [stage, step]);

    const startQuiz = useCallback(() => {
        setAnswers(freshAnswers());
        setResult(null);
        setStep(0);
        setStage('quiz');
    }, []);

    const selectOption = useCallback(
        (idx: number) => {
            setAnswers((prev) => prev.map((v, i) => (i === step ? idx + 1 : v)));
        },
        [step],
    );

    const goBack = useCallback(() => {
        if (step > 0) setStep(step - 1);
        else setStage('landing');
    }, [step]);

    const goNext = useCallback(() => {
        if (answers[step] === null) return;
        if (step < QUESTION_COUNT - 1) {
            setStep(step + 1);
            return;
        }
        const built = buildStoredResult(answers);
        if (!built) return; // unreachable: Next is gated on a complete answer
        try {
            // The next render re-reads the store snapshot, so the landing
            // banner reflects this result without extra state.
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(built));
        } catch {
            /* storage unavailable (private mode) — result still shown */
        }
        setResult(built);
        setStage('results');
    }, [answers, step]);

    // Standard radiogroup arrow-key behavior, mirrored for RTL.
    const handleRadioKey = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            let delta = 0;
            if (e.key === 'ArrowDown') delta = 1;
            else if (e.key === 'ArrowUp') delta = -1;
            else if (e.key === 'ArrowRight') delta = isRtl ? -1 : 1;
            else if (e.key === 'ArrowLeft') delta = isRtl ? 1 : -1;
            else return;
            e.preventDefault();
            const sel = answers[step];
            const currentIdx = sel === null ? null : sel - 1;
            const nextIdx =
                currentIdx === null ? (delta > 0 ? 0 : OPTION_COUNT - 1) : (currentIdx + delta + OPTION_COUNT) % OPTION_COUNT;
            selectOption(nextIdx);
            optionRefs.current[nextIdx]?.focus();
        },
        [answers, step, isRtl, selectOption],
    );

    /* ── Landing ───────────────────────────────────────────────────────── */

    const renderLanding = () => (
        <div className="rw-fade mx-auto max-w-3xl pt-4 text-center sm:pt-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-starta-teal/30 bg-starta-teal/10 text-starta-teal shadow-[0_0_44px_rgba(20,184,166,0.18)]">
                <GaugeIcon />
            </div>
            <p className="mt-5 text-[11px] font-mono uppercase tracking-[0.3em] text-starta-teal">{t.landing.tagline}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-main sm:text-4xl">{t.landing.h1}</h1>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-muted">{t.landing.subtitle}</p>

            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-surface p-6 text-start">
                <ul className="space-y-4">
                    {(
                        [
                            [ClockIcon, t.landing.metaMinutes],
                            [ListIcon, t.landing.metaQuestions],
                            [ChartIcon, t.landing.metaMpt],
                        ] as const
                    ).map(([Icon, label]) => (
                        <li key={label} className="flex items-center gap-3.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-panel/40 text-starta-teal">
                                <Icon />
                            </span>
                            <span className="text-sm font-semibold text-main">{label}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {saved && (
                <div className="mx-auto mt-5 flex max-w-md flex-wrap items-center justify-between gap-3 rounded-xl border border-starta-teal/25 bg-starta-teal/5 px-4 py-3 text-start">
                    <span className="text-xs font-semibold text-muted">
                        {fmt(t.landing.lastResult, { profile: t.profiles[saved.profile].name })}
                    </span>
                    <button
                        type="button"
                        onClick={startQuiz}
                        className="text-xs font-bold tracking-wide text-starta-teal transition-colors hover:text-main"
                    >
                        {t.landing.lastResultRetake}
                    </button>
                </div>
            )}

            <button
                type="button"
                onClick={startQuiz}
                className="btn-primary mt-8 inline-flex items-center gap-2 rounded-full px-9 py-3.5 text-xs font-bold uppercase tracking-widest"
            >
                <span>{t.landing.start}</span>
                <Chevron flip={isRtl} />
            </button>
        </div>
    );

    /* ── Quiz ──────────────────────────────────────────────────────────── */

    const renderQuiz = () => {
        const q = t.questions[step];
        const sel = answers[step];
        const selIdx = sel === null ? null : sel - 1;

        return (
            <div className="mx-auto max-w-2xl pt-2 sm:pt-8">
                <div className="flex items-baseline justify-between text-[11px] font-mono uppercase tracking-[0.2em] text-muted">
                    <span>{fmt(t.wizard.questionOf, { n: step + 1, total: QUESTION_COUNT })}</span>
                    <span className="tabular-nums">{Math.round(((step + 1) / QUESTION_COUNT) * 100)}%</span>
                </div>
                <div
                    role="progressbar"
                    aria-label={t.wizard.progressAria}
                    aria-valuemin={1}
                    aria-valuemax={QUESTION_COUNT}
                    aria-valuenow={step + 1}
                    className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full border border-border bg-panel/40"
                >
                    <div
                        className="rw-bar h-full rounded-full bg-starta-teal"
                        style={{ width: `${((step + 1) / QUESTION_COUNT) * 100}%` }}
                    />
                </div>

                <div key={`q-${step}`} className="rw-fade mt-9">
                    <h2
                        ref={questionHeadingRef}
                        tabIndex={-1}
                        id="rw-question"
                        className="text-xl font-extrabold tracking-tight text-main outline-none sm:text-2xl"
                    >
                        {q.title}
                    </h2>

                    <div role="radiogroup" aria-labelledby="rw-question" onKeyDown={handleRadioKey} className="mt-6 grid gap-3">
                        {q.options.map((opt, i) => {
                            const isSel = selIdx === i;
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSel}
                                    tabIndex={isSel || (selIdx === null && i === 0) ? 0 : -1}
                                    ref={(el) => {
                                        optionRefs.current[i] = el;
                                    }}
                                    onClick={() => selectOption(i)}
                                    className={`flex w-full cursor-pointer items-center gap-3.5 rounded-xl border px-5 py-4 text-start text-sm font-medium leading-6 transition-all duration-200 ${
                                        isSel
                                            ? 'border-starta-teal bg-starta-teal/10 text-main shadow-[0_0_0_1px_rgba(20,184,166,0.35)]'
                                            : 'border-border bg-surface text-main hover:border-starta-teal/40 hover:bg-panel/40'
                                    }`}
                                >
                                    <span
                                        aria-hidden
                                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                            isSel ? 'border-starta-teal' : 'border-border'
                                        }`}
                                    >
                                        {isSel && <span className="h-2 w-2 rounded-full bg-starta-teal" />}
                                    </span>
                                    <span>{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-9 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={goBack}
                        className="btn-secondary rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest"
                    >
                        {t.wizard.back}
                    </button>
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={sel === null}
                        className="btn-primary inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-xs font-bold uppercase tracking-widest"
                    >
                        <span>{step === QUESTION_COUNT - 1 ? t.wizard.seeResults : t.wizard.next}</span>
                        <Chevron flip={isRtl} />
                    </button>
                </div>
            </div>
        );
    };

    /* ── Results ───────────────────────────────────────────────────────── */

    const renderResults = () => {
        if (!result) return null;
        const profile = profileForScore(result.score);
        const copy = t.profiles[profile.id];
        const alloc = profile.allocation;
        const gaugeLabels = PROFILES.map((p) => t.profiles[p.id].name);
        const donutSlices: DonutSlice[] = [
            { key: 'equities', label: t.results.legend.equities, value: alloc.equities, color: '#14B8A6' },
            { key: 'fixedIncome', label: t.results.legend.fixedIncome, value: alloc.fixedIncome, color: '#0F766E' },
            { key: 'cash', label: t.results.legend.cash, value: alloc.cash, color: '#94A3B8' },
        ];

        return (
            <div className="rw-fade mx-auto max-w-3xl pt-2 sm:pt-8">
                <div className="text-center">
                    <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-starta-teal">{t.results.kicker}</p>
                    <h2
                        ref={resultsHeadingRef}
                        tabIndex={-1}
                        className="mt-2 text-3xl font-extrabold tracking-tight text-main outline-none sm:text-4xl"
                    >
                        {copy.name}
                    </h2>
                    <p className="mt-1.5 text-xs font-mono tabular-nums text-muted">
                        {fmt(t.results.scoreLabel, { score: result.score, max: SCORE_MAX })}
                    </p>
                    <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">{copy.description}</p>
                </div>

                {/* Risk gauge */}
                <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
                    <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted">{t.results.gaugeTitle}</h3>
                    <div className="mt-4">
                        <RiskGauge
                            fraction={scoreFraction(result.score)}
                            activeIndex={profile.index}
                            labels={gaugeLabels}
                            ariaLabel={`${t.results.gaugeTitle}: ${copy.name}`}
                            isRtl={isRtl}
                        />
                    </div>
                </section>

                {/* Volatility + horizon */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-surface p-5">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted">{t.results.volatilityLabel}</p>
                        <p className="mt-1.5 text-sm font-bold text-main">{copy.volatility}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface p-5">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted">{t.results.horizonLabel}</p>
                        <p className="mt-1.5 text-sm font-bold text-main">{copy.horizon}</p>
                    </div>
                </div>

                {/* Allocation donut + legend + recommendation */}
                <section className="mt-4 rounded-2xl border border-border bg-surface p-6">
                    <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted">{t.results.allocationTitle}</h3>
                    <div className="mt-5 flex flex-col items-center gap-8 sm:flex-row sm:justify-center">
                        <AllocationDonut
                            slices={donutSlices}
                            centerValue={`${alloc.equities}%`}
                            centerCaption={t.results.allocationCenterCaption}
                            ariaLabel={`${t.results.allocationTitle}: ${donutSlices
                                .map((s) => `${s.label} ${s.value}%`)
                                .join(', ')}`}
                        />
                        <ul className="w-full max-w-xs space-y-3">
                            {donutSlices.map((s) => (
                                <li key={s.key} className="flex items-center gap-3 text-sm">
                                    <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                                    <span className="font-medium text-main">{s.label}</span>
                                    <span className="ms-auto font-bold tabular-nums text-main">{s.value}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-6 rounded-xl border border-starta-teal/25 bg-starta-teal/5 p-4">
                        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-starta-teal">
                            {t.results.recommendationTitle}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold leading-6 text-main">
                            {fmt(t.results.recommendation, { equities: alloc.equities, fixed: alloc.fixedIncome })}
                        </p>
                    </div>
                </section>

                {/* Matching fund categories */}
                <section className="mt-4 rounded-2xl border border-border bg-surface p-6">
                    <h3 className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted">{t.results.fundsTitle}</h3>
                    <p className="mt-1.5 text-xs text-muted">{t.results.fundsSubtitle}</p>
                    <div className="mt-4 flex flex-wrap gap-2.5">
                        {fundCategoriesFor(profile.id).map((cat) => (
                            <Link
                                key={cat}
                                href={fundCategoryHref(cat)}
                                prefetch={false}
                                className="inline-flex items-center gap-2 rounded-full border border-starta-teal/35 bg-starta-teal/10 px-4 py-2 text-xs font-bold tracking-wide text-main transition-colors hover:bg-starta-teal/20"
                            >
                                <span>{fmt(t.results.explore, { category: t.fundCategories[cat] })}</span>
                                <Chevron flip={isRtl} />
                            </Link>
                        ))}
                    </div>
                </section>

                <div className="mt-8 text-center">
                    <button
                        type="button"
                        onClick={startQuiz}
                        className="btn-secondary rounded-full px-8 py-2.5 text-xs font-bold uppercase tracking-widest"
                    >
                        {t.results.retake}
                    </button>
                </div>

                <p className="mt-6 rounded-xl border border-border bg-panel/30 p-4 text-[11px] leading-relaxed text-muted">
                    {t.results.disclaimer}
                </p>
            </div>
        );
    };

    return (
        <div className="risk-wiz">
            <style dangerouslySetInnerHTML={{ __html: WIZ_CSS }} />
            {stage === 'landing' && renderLanding()}
            {stage === 'quiz' && renderQuiz()}
            {stage === 'results' && renderResults()}
        </div>
    );
}
