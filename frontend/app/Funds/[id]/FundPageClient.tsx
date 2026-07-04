'use client';

import Link from 'next/link';
import FundNavChart from './FundNavChart';
import './fund-premium.css';

type Stat = { label: string; value: string };
type SignedStat = { label: string; value: string; negative: boolean };

export type FundClientData = {
    fundId: string | number;
    name: string;
    nameEn: string | null;
    nameAr: string | null;
    managerLine: string | null;
    monogram: string;
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
    miniStats: Stat[];
    perfCards: SignedStat[];
    facts: Stat[];
    fees: Stat[];
    riskStats: SignedStat[];
    platforms: Array<{ name: string; logo: string | null }>;
    prospectusUrl: string | null;
    tradingRows: Stat[];
    strategyEn: string | null;
    objectiveEn: string | null;
    strategyAr: string | null;
    objectiveAr: string | null;
    peers: Array<{ id: number; label: string; href: string; compareHref: string }>;
    faqs: Array<{ q: string; a: string }>;
};

const MICRO = 'text-[0.68rem] uppercase tracking-[0.22em] text-muted';
const SECTION = 'mt-8';

function SignedValue({ value, negative, className = '' }: { value: string; negative: boolean; className?: string }) {
    return <span className={`${negative ? 'text-red-500' : 'text-main'} ${className}`}>{value}</span>;
}

export default function FundPageClient(props: FundClientData) {
    const {
        fundId,
        name,
        nameEn,
        nameAr,
        managerLine,
        monogram,
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
        miniStats,
        perfCards,
        facts,
        fees,
        riskStats,
        platforms,
        prospectusUrl,
        tradingRows,
        strategyEn,
        objectiveEn,
        strategyAr,
        objectiveAr,
        peers,
        faqs,
    } = props;

    const arabicOnlyTitle = !nameEn && !!nameAr;

    return (
        <div className="fund-premium">
            {/* ── Hero: identity + headline stats + interactive NAV chart ───────── */}
            <section className="surface-card rounded-[2.4rem] p-5 sm:p-7 lg:p-9">
                <div className="grid gap-7 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)] xl:items-stretch">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.3rem] border border-border bg-surface text-2xl font-display font-bold text-starta-teal shadow-sm sm:h-20 sm:w-20 sm:text-3xl">
                                {monogram}
                            </div>
                            <div className="min-w-0">
                                <h1
                                    className="text-2xl font-display font-bold leading-[1.05] tracking-[-0.03em] text-main sm:text-3xl lg:text-[2.6rem]"
                                    {...(arabicOnlyTitle ? { dir: 'rtl' as const, lang: 'ar' } : {})}
                                >
                                    {name}
                                </h1>
                                {nameEn && nameAr && nameAr !== nameEn && (
                                    <p dir="rtl" lang="ar" className="mt-2 text-base font-semibold text-muted">
                                        {nameAr}
                                    </p>
                                )}
                                {managerLine && <p className="mt-2 text-sm text-muted">{managerLine}</p>}
                            </div>
                        </div>

                        {chips.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {chips.map((c) => (
                                    <span key={c} className="chip">
                                        {c}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="summary-card rounded-[1.6rem] p-5">
                                <div className={MICRO}>Latest NAV</div>
                                <div className="mt-3 text-3xl font-display font-bold tracking-[-0.03em] text-main sm:text-4xl">
                                    {navText ?? '—'}
                                    {navText && <span className="ml-1.5 text-base font-semibold text-muted">{currency}</span>}
                                </div>
                                <p className="mt-2 text-sm text-muted">
                                    {navHuman ? (
                                        <>
                                            as of <time dateTime={navDateIso ?? undefined}>{navHuman}</time>
                                        </>
                                    ) : (
                                        currency
                                    )}
                                    {navStale && (
                                        <span className="ml-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                                            Delayed{navAgeDays !== null ? ` · ${navAgeDays}d` : ''}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="summary-card rounded-[1.6rem] p-5">
                                <div className={MICRO}>{headlineReturn ? headlineReturn.label : 'Return'}</div>
                                <div className="mt-3 text-3xl font-display font-bold tracking-[-0.03em] sm:text-4xl">
                                    {headlineReturn ? (
                                        <SignedValue value={headlineReturn.value} negative={headlineReturn.negative} />
                                    ) : (
                                        <span className="text-main">—</span>
                                    )}
                                </div>
                                <p className="mt-2 text-sm text-muted">Total NAV return</p>
                            </div>
                        </div>

                        {(navLow || navHigh) && (
                            <p className="text-sm text-muted">
                                {navLow && (
                                    <>
                                        52-week low: <span className="font-semibold text-main">{navLow}</span>
                                    </>
                                )}
                                {navLow && navHigh && ' · '}
                                {navHigh && (
                                    <>
                                        52-week high: <span className="font-semibold text-main">{navHigh}</span>
                                    </>
                                )}
                            </p>
                        )}

                        {miniStats.length > 0 && (
                            <div className="grid gap-3 sm:grid-cols-3">
                                {miniStats.map((s) => (
                                    <div key={s.label} className="summary-card rounded-[1.3rem] p-4">
                                        <div className={MICRO}>{s.label}</div>
                                        <div className="mt-2 text-base font-semibold text-main">{s.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <FundNavChart fundId={fundId} currency={currency} />
                </div>
            </section>

            {/* ── Period performance ────────────────────────────────────────────── */}
            {perfCards.length > 0 && (
                <section className={SECTION}>
                    <span className="section-tag">Performance</span>
                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                        {perfCards.map((p) => (
                            <div key={p.label} className="summary-card perf-card rounded-[1.4rem] p-4">
                                <div className={MICRO}>{p.label}</div>
                                <div className="mt-3 text-xl font-display font-bold tracking-[-0.03em]">
                                    <SignedValue value={p.value} negative={p.negative} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Fund details + Investment thesis ──────────────────────────────── */}
            <section className={`${SECTION} grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]`}>
                {facts.length > 0 && (
                    <div className="glass-premium rounded-[2rem] p-6 sm:p-7">
                        <span className="section-tag">Fund details</span>
                        <h2 className="mt-3 text-xl font-display font-bold tracking-[-0.03em] text-main">
                            Research-grade fund profile
                        </h2>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {facts.map((f) => (
                                <div key={f.label} className="summary-card rounded-[1.2rem] p-4">
                                    <div className={MICRO}>{f.label}</div>
                                    <div className="mt-2 text-sm font-semibold text-main">{f.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(strategyEn || objectiveEn || strategyAr || objectiveAr) && (
                    <div className="glass-premium rounded-[2rem] p-6 sm:p-7">
                        <span className="section-tag">Investment thesis</span>
                        <div className="mt-4 space-y-6">
                            {strategyEn && (
                                <div>
                                    <h3 className="text-base font-semibold text-main">Investment strategy</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted">{strategyEn}</p>
                                </div>
                            )}
                            {objectiveEn && (
                                <div>
                                    <h3 className="text-base font-semibold text-main">Fund objective</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted">{objectiveEn}</p>
                                </div>
                            )}
                            {(strategyAr || objectiveAr) && (
                                <div dir="rtl" lang="ar" className="rounded-[1.2rem] border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
                                    {strategyAr && <p>{strategyAr}</p>}
                                    {objectiveAr && <p className={strategyAr ? 'mt-3' : ''}>{objectiveAr}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            {/* ── Fees + Risk ───────────────────────────────────────────────────── */}
            {(fees.length > 0 || riskStats.length > 0) && (
                <section className={`${SECTION} grid gap-6 lg:grid-cols-2`}>
                    {fees.length > 0 && (
                        <div className="glass-premium rounded-[2rem] p-6 sm:p-7">
                            <span className="section-tag">Cost of ownership</span>
                            <h2 className="mt-3 text-xl font-display font-bold tracking-[-0.03em] text-main">Fees</h2>
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
                            <span className="section-tag">Risk factors</span>
                            <h2 className="mt-3 text-xl font-display font-bold tracking-[-0.03em] text-main">Risk &amp; Volatility</h2>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                {riskStats.map((r) => (
                                    <div key={r.label} className="summary-card rounded-[1.2rem] p-4">
                                        <div className={MICRO}>{r.label}</div>
                                        <div className="mt-2 text-lg font-display font-bold tabular-nums">
                                            <SignedValue value={r.value} negative={r.negative} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 border-t border-border/60 pt-3 text-xs text-muted">
                                Computed from our full NAV history. Max drawdown is the worst peak-to-trough decline;
                                volatility is annualized by the fund&apos;s NAV reporting frequency.
                            </p>
                        </div>
                    )}
                </section>
            )}

            {/* ── Where to invest: distributors + prospectus + schedule ─────────── */}
            {(platforms.length > 0 || prospectusUrl || tradingRows.length > 0) && (
                <section className={`${SECTION} glass-premium rounded-[2rem] p-6 sm:p-8`}>
                    <span className="section-tag">Purchase channels</span>
                    <h2 className="mt-3 text-xl font-display font-bold tracking-[-0.03em] text-main">Where to Invest</h2>

                    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)]">
                        <div className="flex flex-col gap-6">
                            {platforms.length > 0 && (
                                <div>
                                    <div className={MICRO}>Subscription &amp; redemption channels</div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {platforms.map((p) => (
                                            <div
                                                key={p.name}
                                                className="summary-card flex items-center gap-3 rounded-[1.1rem] p-3.5"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                {p.logo ? (
                                                    <img
                                                        src={p.logo}
                                                        alt=""
                                                        className="h-9 w-9 shrink-0 rounded-lg object-contain"
                                                    />
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
                                    <div className={MICRO}>Trading schedule</div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {tradingRows.map((t) => (
                                            <div key={t.label} className="summary-card rounded-[1.1rem] p-3.5">
                                                <div className={MICRO}>{t.label}</div>
                                                <div className="mt-1.5 text-sm font-semibold text-main">{t.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {prospectusUrl && (
                            <div>
                                <div className={MICRO}>Documents</div>
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
                                        <span className="block text-sm font-semibold text-main">Fund prospectus</span>
                                        <span className="block text-xs text-muted">PDF · opens in a new tab</span>
                                    </span>
                                </a>
                            </div>
                        )}
                    </div>

                    <p className="mt-6 border-t border-border/60 pt-3 text-xs text-muted">
                        Channels &amp; prospectus as published by the fund manager. Verify terms before investing.
                    </p>
                </section>
            )}

            {/* ── Similar funds ─────────────────────────────────────────────────── */}
            <section className={SECTION}>
                <span className="section-tag">Explore more</span>
                <h2 className="mt-3 text-xl font-display font-bold tracking-[-0.03em] text-main">
                    Similar funds in the same universe
                </h2>
                {peers.length > 0 && (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {peers.map((p) => (
                            <div key={p.id} className="summary-card flex flex-col gap-3 rounded-[1.3rem] p-5">
                                <Link href={p.href} className="text-sm font-semibold text-main hover:text-starta-teal">
                                    {p.label}
                                </Link>
                                <Link
                                    href={p.compareHref}
                                    className="mt-auto text-xs font-semibold text-starta-teal hover:underline"
                                >
                                    Compare →
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
                <p className="mt-5 text-sm">
                    <Link href="/Funds" className="font-semibold text-starta-teal hover:underline">
                        All Egyptian mutual funds →
                    </Link>
                </p>
            </section>

            {/* ── FAQ ───────────────────────────────────────────────────────────── */}
            {faqs.length > 0 && (
                <section className={`${SECTION} glass-premium rounded-[2rem] p-6 sm:p-8`}>
                    <span className="section-tag">Fund FAQ</span>
                    <h2 className="mt-3 text-xl font-display font-bold tracking-[-0.03em] text-main">
                        Frequently asked questions
                    </h2>
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
    );
}
