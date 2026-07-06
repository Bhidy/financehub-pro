'use client';

import { useState } from 'react';
import Link from 'next/link';
import FundNavChart from './FundNavChart';
import type { FundLabels, Lang } from './fund-i18n';
import type { FundAnalytics } from '@/lib/fund-analytics';
import { Scorecard, Suitability, Insights, StressTest } from './FundAnalytics';
import FundKeyFacts from './FundKeyFacts';
import FundCalculator from './FundCalculator';
import FundFeedback from './FundFeedback';
import FundGate from './FundGate';
import FundComparePicker from './FundComparePicker';
import './fund-premium.css';

type LabelValue = { label: string; value: string };
type SignedStat = { label: string; value: string; negative: boolean };

export type FundClientData = {
    t: FundLabels;
    lang: Lang;
    fundId: string | number;
    name: string;
    nameEn: string | null;
    nameAr: string | null;
    managerLine: string | null;
    monogram: string;
    heroLogo: string | null;
    navText: string | null;
    navDateIso: string | null;
    navHuman: string | null;
    navStale: boolean;
    navAgeDays: number | null;
    navHigh: string | null;
    navLow: string | null;
    currency: string;
    headlineReturn: SignedStat | null;
    chips: string[];
    perfCards: SignedStat[];
    facts: LabelValue[];
    fees: LabelValue[];
    riskStats: SignedStat[];
    platforms: Array<{ name: string; logo: string | null }>;
    prospectusUrl: string | null;
    tradingRows: LabelValue[];
    strategy: string | null;
    objective: string | null;
    managerProfile: { name: string; logo: string | null; rows: LabelValue[] } | null;
    peers: Array<{ id: number; label: string; href: string; compareHref: string }>;
    faqs: Array<{ q: string; a: string }>;
    isShariah: boolean;
    // analytics layer
    analytics: FundAnalytics;
    cagrStat: { value: string; years: number | null; sinceInception: string | null } | null;
    movement: { best: number | null; worst: number | null; avgGain: number | null; avgLoss: number | null; cadence: 'day' | 'week' | 'period' } | null;
    compareHref: string;
};

const MICRO = 'text-[0.68rem] uppercase tracking-[0.22em] text-muted';

function Signed({ value, negative, className = '' }: { value: string; negative: boolean; className?: string }) {
    return <span className={`${negative ? 'text-red-500' : 'text-main'} ${className}`}>{value}</span>;
}

export default function FundPageClient(props: FundClientData) {
    const {
        t,
        lang,
        fundId,
        name,
        managerLine,
        monogram,
        heroLogo,
        navText,
        navDateIso,
        navHuman,
        navStale,
        navAgeDays,
        navHigh,
        navLow,
        currency,
        headlineReturn,
        chips,
        perfCards,
        facts,
        fees,
        riskStats,
        platforms,
        prospectusUrl,
        tradingRows,
        strategy,
        objective,
        managerProfile,
        peers,
        faqs,
        analytics,
        cagrStat,
        movement,
        compareHref,
    } = props;

    const [pickerOpen, setPickerOpen] = useState(false);

    return (
        <div className="fund-premium">
            {/* ── Hero (full width) ─────────────────────────────────────────────── */}
            <section className="surface-card rounded-[2.4rem] p-5 sm:p-7 lg:p-9">
                <div className="grid gap-7 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)] xl:items-stretch">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-4">
                            {heroLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={heroLogo}
                                    alt=""
                                    className="h-16 w-16 shrink-0 rounded-[1.3rem] border border-border bg-surface object-contain p-2 shadow-sm sm:h-20 sm:w-20"
                                />
                            ) : (
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.3rem] border border-border bg-surface text-2xl font-display font-bold text-starta-teal shadow-sm sm:h-20 sm:w-20 sm:text-3xl">
                                    {monogram}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-2xl font-display font-bold leading-[1.15] tracking-[-0.03em] text-main sm:text-3xl lg:text-[2.6rem]">
                                    {name}
                                </h1>
                                {managerLine && <p className="mt-2 text-sm text-muted">{managerLine}</p>}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {chips.map((c) => (
                                <span key={c} className="chip">
                                    {c}
                                </span>
                            ))}
                            <Link
                                href={compareHref}
                                className="hero-compare"
                                aria-label={t.ax.compareCta}
                                aria-haspopup="dialog"
                                onClick={(e) => {
                                    // Open the in-page picker; let modified clicks fall through
                                    // to the (bilingual) compare tool as a no-JS/new-tab fallback.
                                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
                                    e.preventDefault();
                                    setPickerOpen(true);
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                                {t.ax.compareCta}
                            </Link>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="summary-card rounded-[1.6rem] p-5">
                                <div className={MICRO}>{t.latestNav}</div>
                                <div className="mt-3 text-3xl font-display font-bold tracking-[-0.03em] text-main sm:text-4xl">
                                    {navText ?? '—'}
                                    {navText && <span className="mx-1.5 text-base font-semibold text-muted">{currency}</span>}
                                </div>
                                <p className="mt-2 text-sm text-muted">
                                    {navHuman ? (
                                        <>
                                            {t.asOf} <time dateTime={navDateIso ?? undefined}>{navHuman}</time>
                                        </>
                                    ) : (
                                        currency
                                    )}
                                    {navStale && (
                                        <span className="mx-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                                            {t.delayed}{navAgeDays !== null ? ` · ${navAgeDays}d` : ''}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="summary-card rounded-[1.6rem] p-5">
                                <div className={MICRO}>{headlineReturn ? headlineReturn.label : t.returnLabel}</div>
                                <div className="mt-3 text-3xl font-display font-bold tracking-[-0.03em] sm:text-4xl">
                                    {headlineReturn ? (
                                        <Signed value={headlineReturn.value} negative={headlineReturn.negative} />
                                    ) : (
                                        <span className="text-main">—</span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-muted">{t.totalNavReturn}</p>
                            </div>
                        </div>

                        {(navLow || navHigh) && (
                            <p className="text-sm text-muted">
                                {navLow && (
                                    <>
                                        {t.week52Low}: <span className="font-semibold text-main">{navLow}</span>
                                    </>
                                )}
                                {navLow && navHigh && ' · '}
                                {navHigh && (
                                    <>
                                        {t.week52High}: <span className="font-semibold text-main">{navHigh}</span>
                                    </>
                                )}
                            </p>
                        )}
                    </div>

                    <FundNavChart fundId={fundId} currency={currency} lang={lang} />
                </div>
            </section>

            {/* ── Two-column: main analysis + sticky sidebar ─────────────────────── */}
            <div className="fund-layout mt-8">
                {/* ══ MAIN COLUMN — the analysis, ordered by decision value ══ */}
                <div className="fund-main">
                    {/* Performance */}
                    {perfCards.length > 0 && (
                        <section aria-label={t.performance}>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                {perfCards.map((p) => (
                                    <div key={p.label} className="summary-card perf-card rounded-[1.4rem] p-4">
                                        <div className={MICRO}>{p.label}</div>
                                        <div className="mt-3 text-xl font-display font-bold tracking-[-0.03em]">
                                            <Signed value={p.value} negative={p.negative} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Investment thesis */}
                    {(strategy || objective) && (
                        <section className="glass-premium rounded-[2rem] p-6 sm:p-7" aria-label={t.investmentThesis}>
                            <div className="space-y-6">
                                {strategy && (
                                    <div>
                                        <h3 className="text-base font-semibold text-main">{t.investmentStrategy}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-muted">{strategy}</p>
                                    </div>
                                )}
                                {objective && (
                                    <div>
                                        <h3 className="text-base font-semibold text-main">{t.fundObjective}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-muted">{objective}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Fees + Risk */}
                    {(fees.length > 0 || riskStats.length > 0) && (
                        <section className="grid gap-6 lg:grid-cols-2">
                            {fees.length > 0 && (
                                <div className="glass-premium rounded-[2rem] p-6 sm:p-7">
                                    <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main">{t.fees}</h2>
                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                        {fees.map((f) => (
                                            <div key={f.label} className="summary-card rounded-[1.2rem] p-4">
                                                <div className={MICRO}>{f.label}</div>
                                                <div className="mt-2 text-lg font-display font-bold tabular-nums text-main">{f.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {riskStats.length > 0 && (
                                <div className="glass-premium rounded-[2rem] p-6 sm:p-7">
                                    <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main">{t.riskVolatility}</h2>
                                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                        {riskStats.map((r) => (
                                            <div key={r.label} className="summary-card rounded-[1.2rem] p-4">
                                                <div className={MICRO}>{r.label}</div>
                                                <div className="mt-2 text-lg font-display font-bold tabular-nums">
                                                    <Signed value={r.value} negative={r.negative} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted">{t.riskNote}</p>
                                </div>
                            )}
                        </section>
                    )}

                    {/* About the manager */}
                    {managerProfile && (
                        <section className="glass-premium rounded-[2rem] p-6 sm:p-8" aria-label={t.managerProfile}>
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-4">
                                    {managerProfile.logo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={managerProfile.logo}
                                            alt=""
                                            className="h-16 w-16 shrink-0 rounded-2xl border border-border bg-surface object-contain p-2"
                                        />
                                    ) : (
                                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-starta-teal/10 text-2xl font-display font-bold text-starta-teal">
                                            {managerProfile.name.trim().charAt(0)}
                                        </span>
                                    )}
                                    <h2 className="text-lg font-display font-bold tracking-[-0.02em] text-main sm:text-xl">
                                        {managerProfile.name}
                                    </h2>
                                </div>
                                <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {managerProfile.rows.map((r) => (
                                        <div key={r.label} className="summary-card rounded-[1.2rem] p-4">
                                            <div className={MICRO}>{r.label}</div>
                                            <div className="mt-2 text-sm font-semibold text-main">{r.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Scorecard — free account unlocks all (gated) */}
                    {analytics.hasEnoughData && (
                        <FundGate t={t}>
                            <Scorecard scores={analytics.scores} t={t} />
                        </FundGate>
                    )}

                    {/* Where to invest */}
                    {(platforms.length > 0 || prospectusUrl || tradingRows.length > 0) && (
                        <section className="glass-premium rounded-[2rem] p-6 sm:p-8" aria-label={t.purchaseChannels}>
                            <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main">{t.whereToInvest}</h2>

                            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.55fr)]">
                                <div className="flex flex-col gap-6">
                                    {platforms.length > 0 && (
                                        <div>
                                            <div className={MICRO}>{t.subRedemptionChannels}</div>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                {platforms.map((p) => (
                                                    <div key={p.name} className="summary-card flex items-center gap-3 rounded-[1.1rem] p-3.5">
                                                        {p.logo ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={p.logo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
                                                        ) : (
                                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-starta-teal/10 text-sm font-bold text-starta-teal">
                                                                {p.name.trim().charAt(0)}
                                                            </span>
                                                        )}
                                                        <span className="text-sm font-medium text-main">{p.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {tradingRows.length > 0 && (
                                        <div>
                                            <div className={MICRO}>{t.tradingSchedule}</div>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                {tradingRows.map((tr) => (
                                                    <div key={tr.label} className="summary-card rounded-[1.1rem] p-3.5">
                                                        <div className={MICRO}>{tr.label}</div>
                                                        <div className="mt-1.5 text-sm font-semibold text-main">{tr.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {prospectusUrl && (
                                    <div>
                                        <div className={MICRO}>{t.documents}</div>
                                        <a
                                            href={prospectusUrl}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow"
                                            className="doc-link mt-3 flex items-center gap-3 rounded-[1.1rem] p-4"
                                        >
                                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-starta-teal/10 text-starta-teal">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                            </span>
                                            <span>
                                                <span className="block text-sm font-semibold text-main">{t.prospectus}</span>
                                                <span className="block text-xs text-muted">{t.prospectusMeta}</span>
                                            </span>
                                        </a>
                                    </div>
                                )}
                            </div>

                            <p className="mt-6 border-t border-border/60 pt-3 text-xs text-muted">{t.channelsDisclaimer}</p>
                        </section>
                    )}

                    {/* Similar funds */}
                    <section aria-label={t.exploreMore}>
                        <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main">{t.similarFunds}</h2>
                        {peers.length > 0 && (
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                {peers.map((p) => (
                                    <div key={p.id} className="summary-card flex flex-col gap-3 rounded-[1.3rem] p-5">
                                        <Link href={p.href} className="text-sm font-semibold text-main hover:text-starta-teal">
                                            {p.label}
                                        </Link>
                                        <Link href={p.compareHref} className="mt-auto text-xs font-semibold text-starta-teal hover:underline">
                                            {t.compare} →
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="mt-5 text-sm">
                            <Link href="/Funds" className="font-semibold text-starta-teal hover:underline">
                                {t.allFunds} →
                            </Link>
                        </p>
                    </section>

                    {/* FAQ */}
                    {faqs.length > 0 && (
                        <section className="glass-premium rounded-[2rem] p-6 sm:p-8" aria-label={t.fundFaq}>
                            <h2 className="text-xl font-display font-bold tracking-[-0.03em] text-main">{t.faqTitle}</h2>
                            <dl className="mt-6 space-y-5">
                                {faqs.map((f) => (
                                    <div key={f.q} className="border-b border-border/60 pb-5 last:border-b-0 last:pb-0">
                                        <dt className="text-sm font-semibold text-main">{f.q}</dt>
                                        <dd className="mt-1.5 text-sm leading-relaxed text-muted">{f.a}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    )}
                </div>

                {/* ══ SIDEBAR — sticky, compact + interactive widgets ══ */}
                <aside className="fund-aside">
                    <FundKeyFacts facts={facts} cagr={cagrStat} t={t} />

                    {/* Decision widgets — one free-account gate for the whole cluster */}
                    {analytics.hasEnoughData && (
                        <FundGate t={t} compact>
                            <div className="flex flex-col gap-5">
                                <Suitability suit={analytics.suitability} t={t} />
                                <Insights insights={analytics.insights} t={t} />
                                <StressTest stress={analytics.stress} movement={movement} t={t} />
                                {analytics.calc.cagr !== null && (
                                    <FundCalculator
                                        cagr={analytics.calc.cagr}
                                        volatility={analytics.calc.volatility}
                                        currency={currency}
                                        t={t}
                                    />
                                )}
                            </div>
                        </FundGate>
                    )}

                    <FundFeedback fundId={fundId} t={t} />
                </aside>
            </div>

            {pickerOpen && (
                <FundComparePicker
                    onClose={() => setPickerOpen(false)}
                    currentId={String(fundId)}
                    currentName={name}
                    lang={lang}
                    t={t}
                />
            )}
        </div>
    );
}
