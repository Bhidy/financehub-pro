/**
 * fund-analytics.ts — the deterministic "brains" behind the fund profile's
 * decision-support layer (Scoring, Suitability, Insights, Stress-test, Calculator).
 *
 * WHY A PURE MODULE
 * -----------------
 * Every function here is a PURE transform of primitives already computed and stored
 * server-side by data_pipeline/fund_metrics.py (CAGR, volatility, drawdown, downside
 * deviation, positive-period %, fee, …). Keeping it framework-free means:
 *   • identical results in SSR (renderFundPage) and in the client (live calculator),
 *   • it is unit-testable in isolation, and
 *   • the UI never invents numbers — it only formats what this module derives.
 *
 * DISCIPLINE (institutional honesty)
 * ----------------------------------
 * We deliberately do NOT fabricate a Sharpe/alpha/beta (no EGX benchmark + no real
 * EGP risk-free rate — mirroring fund_metrics.py's stance). Scores use only RF-free,
 * benchmark-free signals. The Diversification score is an explicit CATEGORY-BASED
 * ESTIMATE (holdings data not yet ingested) and is flagged `estimated: true` so the
 * UI can disclose it — never presented as if derived from real holdings.
 *
 * This module returns numbers + enum tiers ONLY. All human-facing phrasing (AR/EN)
 * is mapped from those enums in fund-i18n.ts, so the logic stays locale-agnostic.
 */

/* ------------------------------------------------------------------ helpers */

export const clamp = (v: number, lo = 0, hi = 100): number =>
  Math.max(lo, Math.min(hi, v));

/** Linear map of `v` from [inLo,inHi] onto [outLo,outHi], clamped to the out range.
 *  Handles inverted out ranges (outLo > outHi) for "lower input = higher score". */
export function mapRange(
  v: number, inLo: number, inHi: number, outLo: number, outHi: number,
): number {
  if (inHi === inLo) return outLo;
  const t = (v - inLo) / (inHi - inLo);
  const clampedT = Math.max(0, Math.min(1, t));
  return outLo + (outHi - outLo) * clampedT;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export type Tier = 'excellent' | 'strong' | 'average' | 'weak' | 'poor';
export function tierOf(score: number): Tier {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'strong';
  if (score >= 50) return 'average';
  if (score >= 35) return 'weak';
  return 'poor';
}

/* ------------------------------------------------------------------- input */

/** Everything the analytics layer needs, already coerced to number|null. */
export type AnalyticsInput = {
  cagr: number | null;              // annualized % since inception
  returnInception: number | null;   // total % since inception
  inceptionYears: number | null;
  volatility: number | null;        // annualized %
  downsideDeviation: number | null; // annualized %
  maxDrawdown: number | null;       // NEGATIVE %
  bestPeriod: number | null;        // %
  worstPeriod: number | null;       // %
  positivePeriodsPct: number | null;
  avgGain: number | null;
  avgLoss: number | null;
  avgPeriodDays: number | null;     // ~7 weekly, ~1-2 daily
  feeManagement: number | null;     // %
  expenseRatio: number | null;      // %
  navPoints: number | null;
  latestNav: number | null;
  return1y: number | null;
  return3y: number | null;          // cumulative % over 3y
  return5y: number | null;          // cumulative % over 5y
  fundType: string | null;          // raw or _en
  classification: string | null;
  strategy: string | null;          // free text (used only for diversification hints)
};

/* ------------------------------------------------------------- fund "kind" */

export type FundKind = 'money_market' | 'fixed_income' | 'balanced' | 'equity' | 'sector' | 'unknown';

/** Classify a fund from its type/classification text (AR + EN aware). Drives the
 *  Diversification estimate and Stress-test market sensitivity. */
export function classifyFund(input: Pick<AnalyticsInput, 'fundType' | 'classification' | 'strategy'>): FundKind {
  const hay = `${input.fundType ?? ''} ${input.classification ?? ''}`.toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => hay.includes(n));
  if (has('money market', 'أسواق نقد', 'نقدي', 'liquid', 'خزانة', 'treasury', 'cash')) return 'money_market';
  if (has('fixed income', 'دخل ثابت', 'سندات', 'bond', 'صكوك', 'sukuk', 'debt')) return 'fixed_income';
  if (has('balanced', 'متوازن', 'mixed', 'mختلط', 'multi', 'متعدد', 'allocation', 'توزيع')) return 'balanced';
  if (has('sector', 'قطاع', 'consumer', 'استهلاك', 'thematic', 'موضوعي', 'real estate', 'عقار', 'gold', 'ذهب')) return 'sector';
  if (has('equity', 'أسهم', 'اسهم', 'stock', 'growth', 'نمو')) return 'equity';
  return 'unknown';
}

/** Equity-market sensitivity used ONLY for clearly-labelled stress-test estimates. */
function marketSensitivity(kind: FundKind): number {
  switch (kind) {
    case 'money_market': return 0.05;
    case 'fixed_income': return 0.20;
    case 'balanced': return 0.55;
    case 'sector': return 1.05;
    case 'equity': return 0.95;
    default: return 0.75;
  }
}

/* ----------------------------------------------------------------- SCORING */

export type ScoreKey = 'performance' | 'risk' | 'cost' | 'stability' | 'diversification';

export type Score = {
  key: ScoreKey;
  value: number | null;   // 0-100, null when we lack the inputs to judge honestly
  tier: Tier | null;
  /** the raw metric shown NEXT TO the score (our transparency edge vs snduk). */
  metric: { kind: string; value: number | null };
  estimated?: boolean;    // true => category-based estimate, must be disclosed
};

export type Confidence = 'high' | 'medium' | 'low';

export type ScoreResult = {
  scores: Score[];
  overall: number | null;
  overallTier: Tier | null;
  confidence: Confidence;
};

/** Annualize a CUMULATIVE % return over `years` into an annual %. */
function annualize(cumulativePct: number, years: number): number {
  if (years <= 0) return cumulativePct;
  return (Math.pow(1 + cumulativePct / 100, 1 / years) - 1) * 100;
}

/**
 * The annualized return that best reflects the fund's CURRENT-regime performance.
 * A 17-year inception CAGR averages through old devaluations and understates a fund
 * that has compounded strongly of late — so we lead with 3Y-annualized (the most
 * decision-relevant reliable window), temper with 1Y, and stabilize with the
 * long-run CAGR. Every input is a real, published number the UI can show.
 */
export function effectiveAnnualReturn(i: AnalyticsInput): number | null {
  const parts: number[] = [];
  const weights: number[] = [];
  if (isNum(i.return3y)) { parts.push(annualize(i.return3y, 3)); weights.push(0.5); }
  else if (isNum(i.return5y)) { parts.push(annualize(i.return5y, 5)); weights.push(0.5); }
  if (isNum(i.return1y)) { parts.push(i.return1y); weights.push(0.25); }
  if (isNum(i.cagr)) { parts.push(i.cagr); weights.push(0.25); }
  else if (isNum(i.returnInception) && isNum(i.inceptionYears) && i.inceptionYears > 0) {
    parts.push(annualize(i.returnInception, i.inceptionYears)); weights.push(0.25);
  }
  if (!parts.length) return null;
  const wsum = weights.reduce((a, b) => a + b, 0);
  return parts.reduce((acc, p, idx) => acc + p * weights[idx], 0) / wsum;
}

function performanceScore(i: AnalyticsInput): number | null {
  // Primary driver: the current-regime annualized return, mapped for the Egyptian
  // nominal context (high EGP inflation lifts what counts as "good" nominal growth).
  const ear = effectiveAnnualReturn(i);
  let base: number | null = ear === null ? null : mapRange(ear, -5, 50, 5, 95);
  if (base === null) return null;
  // Risk-adjusted nudge via Calmar (annualized return / |maxDrawdown|) — RF-free.
  // Rewards funds that earned their return without a catastrophic peak-to-trough.
  if (ear !== null && isNum(i.maxDrawdown) && i.maxDrawdown < 0) {
    const calmar = ear / Math.abs(i.maxDrawdown);
    const calmarScore = mapRange(calmar, 0, 2.5, 30, 95);
    base = 0.8 * base + 0.2 * calmarScore;
  }
  return clamp(Math.round(base));
}

function riskScore(i: AnalyticsInput): number | null {
  // Higher = SAFER (lower risk). Blend annualized volatility + worst drawdown.
  const parts: number[] = [];
  const weights: number[] = [];
  if (isNum(i.volatility)) { parts.push(mapRange(i.volatility, 4, 45, 96, 8)); weights.push(0.55); }
  if (isNum(i.maxDrawdown)) { parts.push(mapRange(Math.abs(i.maxDrawdown), 3, 60, 96, 8)); weights.push(0.45); }
  if (!parts.length) return null;
  const wsum = weights.reduce((a, b) => a + b, 0);
  const v = parts.reduce((acc, p, idx) => acc + p * weights[idx], 0) / wsum;
  return clamp(Math.round(v));
}

/** Total ongoing cost we can defensibly cite: the greater of mgmt fee / expense ratio. */
function costBasisPct(i: AnalyticsInput): number | null {
  const vals = [i.feeManagement, i.expenseRatio].filter(isNum) as number[];
  if (!vals.length) return null;
  return Math.max(...vals);
}

function costScore(i: AnalyticsInput): number | null {
  const fee = costBasisPct(i);
  if (fee === null) return null;
  // Higher = cheaper. 0.25%→~98, 1%→~78, 2%→~46, 3%→~15.
  return clamp(Math.round(mapRange(fee, 0.25, 3.0, 98, 15)));
}

function stabilityScore(i: AnalyticsInput): number | null {
  const parts: number[] = [];
  const weights: number[] = [];
  if (isNum(i.positivePeriodsPct)) { parts.push(mapRange(i.positivePeriodsPct, 40, 70, 20, 95)); weights.push(0.6); }
  if (isNum(i.volatility)) { parts.push(mapRange(i.volatility, 5, 40, 92, 20)); weights.push(0.4); }
  if (!parts.length) return null;
  const wsum = weights.reduce((a, b) => a + b, 0);
  return clamp(Math.round(parts.reduce((acc, p, idx) => acc + p * weights[idx], 0) / wsum));
}

/** Category-based ESTIMATE (holdings not yet ingested). Always flagged estimated. */
function diversificationScore(i: AnalyticsInput): number {
  const kind = classifyFund(i);
  let base: number;
  switch (kind) {
    case 'money_market': base = 82; break;
    case 'fixed_income': base = 74; break;
    case 'balanced': base = 72; break;
    case 'equity': base = 50; break;
    case 'sector': base = 34; break;
    default: base = 50;
  }
  // Broader mandate (international / regional exposure) widens the opportunity set.
  const s = (i.strategy ?? '').toLowerCase();
  if (/international|global|regional|mena|middle east|شرق الأوسط|دولي|إقليم|عالمي|خارج/.test(s)) {
    base += 8;
  }
  return clamp(Math.round(base));
}

export function computeScores(i: AnalyticsInput): ScoreResult {
  const perf = performanceScore(i);
  const risk = riskScore(i);
  const cost = costScore(i);
  const stab = stabilityScore(i);
  const div = diversificationScore(i);

  const ear = effectiveAnnualReturn(i);
  const scores: Score[] = [
    { key: 'performance', value: perf, tier: perf === null ? null : tierOf(perf), metric: { kind: 'annualizedReturn', value: ear === null ? null : Math.round(ear * 10) / 10 } },
    { key: 'risk', value: risk, tier: risk === null ? null : tierOf(risk), metric: { kind: 'volatility', value: i.volatility } },
    { key: 'stability', value: stab, tier: stab === null ? null : tierOf(stab), metric: { kind: 'positivePeriods', value: i.positivePeriodsPct } },
    { key: 'cost', value: cost, tier: cost === null ? null : tierOf(cost), metric: { kind: 'fee', value: costBasisPct(i) } },
    { key: 'diversification', value: div, tier: tierOf(div), metric: { kind: 'category', value: null }, estimated: true },
  ];

  // Composite: weighted mean over the scores we could actually compute (skip nulls,
  // renormalize). Diversification is included but under-weighted since it's an estimate.
  const weights: Record<ScoreKey, number> = {
    performance: 0.30, risk: 0.22, stability: 0.20, cost: 0.16, diversification: 0.12,
  };
  let num = 0, den = 0;
  for (const s of scores) {
    if (s.value !== null) { num += s.value * weights[s.key]; den += weights[s.key]; }
  }
  const overall = den > 0 ? clamp(Math.round(num / den)) : null;

  // Confidence from history depth — a 5-point series should not read as authoritative.
  let confidence: Confidence = 'low';
  if (isNum(i.navPoints) && isNum(i.inceptionYears)) {
    if (i.navPoints >= 150 && i.inceptionYears >= 3) confidence = 'high';
    else if (i.navPoints >= 40 && i.inceptionYears >= 1) confidence = 'medium';
  } else if (isNum(i.navPoints)) {
    confidence = i.navPoints >= 150 ? 'high' : i.navPoints >= 40 ? 'medium' : 'low';
  }

  return { scores, overall, overallTier: overall === null ? null : tierOf(overall), confidence };
}

/* -------------------------------------------------------------- SUITABILITY */

export type HorizonStatus = 'suitable' | 'caution' | 'unsuitable';
export type InvestorProfile = 'conservative' | 'balanced' | 'aggressive';

export type SuitabilityResult = {
  horizons: { key: 'short' | 'medium' | 'long'; status: HorizonStatus }[];
  investorMatch: { profile: InvestorProfile; matchPct: number }[];
  /** 0..1 intensity of the fund's risk, exposed for the UI/testing. */
  riskIntensity: number;
};

/** 0 (very calm) .. 1 (very aggressive), from volatility + drawdown. */
function riskIntensity(i: AnalyticsInput): number {
  const parts: number[] = [];
  if (isNum(i.volatility)) parts.push(mapRange(i.volatility, 4, 45, 0, 1));
  if (isNum(i.maxDrawdown)) parts.push(mapRange(Math.abs(i.maxDrawdown), 3, 60, 0, 1));
  if (!parts.length) return 0.5; // unknown → neutral
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length, 0, 1);
}

export function computeSuitability(i: AnalyticsInput): SuitabilityResult {
  const vol = isNum(i.volatility) ? i.volatility : null;
  const dd = isNum(i.maxDrawdown) ? Math.abs(i.maxDrawdown) : null;
  const intensity = riskIntensity(i);

  const horizonStatus = (band: 'short' | 'medium' | 'long'): HorizonStatus => {
    if (vol === null) return 'caution';
    if (band === 'short') {
      if (vol <= 8 && (dd === null || dd <= 8)) return 'suitable';
      if (vol <= 15) return 'caution';
      return 'unsuitable';
    }
    if (band === 'medium') {
      if (vol <= 16 && (dd === null || dd <= 22)) return 'suitable';
      if (vol <= 30) return 'caution';
      return 'unsuitable';
    }
    // long horizon: high volatility is acceptable if long-run return is positive
    if (isNum(i.cagr)) return i.cagr > 0 ? 'suitable' : 'caution';
    return 'suitable';
  };

  // Investor-type match: closeness of the fund's intensity to each profile's appetite,
  // with a small performance bonus for the aggressive profile on strong performers.
  const targets: Record<InvestorProfile, number> = { conservative: 0.15, balanced: 0.45, aggressive: 0.82 };
  const match = (p: InvestorProfile): number => {
    let m = 100 - Math.abs(intensity - targets[p]) * 115;
    if (p === 'aggressive' && isNum(i.cagr) && i.cagr > 20) m += 6;
    if (p === 'conservative' && dd !== null && dd > 30) m -= 6;
    return Math.round(clamp(m, 18, 98));
  };

  return {
    horizons: [
      { key: 'short', status: horizonStatus('short') },
      { key: 'medium', status: horizonStatus('medium') },
      { key: 'long', status: horizonStatus('long') },
    ],
    investorMatch: [
      { profile: 'conservative', matchPct: match('conservative') },
      { profile: 'balanced', matchPct: match('balanced') },
      { profile: 'aggressive', matchPct: match('aggressive') },
    ],
    riskIntensity: Math.round(intensity * 100) / 100,
  };
}

/* ----------------------------------------------------------------- INSIGHTS */

export type Impact = 'high' | 'medium' | 'low';
export type Insight = {
  kind: 'pro' | 'con';
  code: string;          // mapped to bilingual copy in fund-i18n
  impact: Impact;
  value: number | null;  // the number to interpolate into the copy
};

export function computeInsights(i: AnalyticsInput, scores?: ScoreResult): Insight[] {
  const s = scores ?? computeScores(i);
  const byKey = (k: ScoreKey) => s.scores.find((x) => x.key === k)?.value ?? null;
  const out: Insight[] = [];

  const perf = byKey('performance');
  const ear = effectiveAnnualReturn(i);
  if (perf !== null && perf >= 65 && ear !== null) out.push({ kind: 'pro', code: 'strongPerformance', impact: 'high', value: Math.round(ear * 10) / 10 });
  if (isNum(i.positivePeriodsPct) && i.positivePeriodsPct >= 58) out.push({ kind: 'pro', code: 'consistent', impact: 'medium', value: Math.round(i.positivePeriodsPct) });
  if (isNum(i.inceptionYears) && i.inceptionYears >= 8) out.push({ kind: 'pro', code: 'longTrack', impact: 'medium', value: Math.round(i.inceptionYears) });
  else if (isNum(i.navPoints) && i.navPoints >= 300) out.push({ kind: 'pro', code: 'deepData', impact: 'low', value: i.navPoints });

  if (isNum(i.volatility) && i.volatility >= 22) out.push({ kind: 'con', code: 'highVolatility', impact: i.volatility >= 35 ? 'high' : 'medium', value: Math.round(i.volatility * 10) / 10 });
  if (isNum(i.maxDrawdown) && i.maxDrawdown <= -35) out.push({ kind: 'con', code: 'deepDrawdown', impact: i.maxDrawdown <= -50 ? 'high' : 'medium', value: Math.round(i.maxDrawdown * 10) / 10 });
  const fee = costBasisPct(i);
  if (fee !== null && fee >= 1.75) out.push({ kind: 'con', code: 'highFee', impact: 'medium', value: Math.round(fee * 100) / 100 });
  if (isNum(i.inceptionYears) && i.inceptionYears < 2) out.push({ kind: 'con', code: 'shortTrack', impact: 'low', value: Math.round(i.inceptionYears * 10) / 10 });

  // Impact-first ordering, pros and cons interleaved by strength; cap at 6.
  const rank: Record<Impact, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => rank[a.impact] - rank[b.impact]).slice(0, 6);
}

/* -------------------------------------------------------------- STRESS TEST */

export type StressScenario = {
  code: string;           // mapped to bilingual copy in fund-i18n
  kind: 'estimate' | 'historical';
  impactPct: number;      // negative %
};

export type StressResult = {
  scenarios: StressScenario[];
  fundKind: FundKind;
  sensitivity: number;    // exposed for transparency/testing
};

export function computeStressTest(i: AnalyticsInput): StressResult {
  const kind = classifyFund(i);
  const sensitivity = marketSensitivity(kind);
  const scenarios: StressScenario[] = [];

  // Model-based estimates (clearly labelled): broad-market shocks scaled by the fund's
  // asset-class sensitivity — an approximation, NOT a beta-derived figure.
  scenarios.push({ code: 'marketDrop10', kind: 'estimate', impactPct: Math.round(-10 * sensitivity * 10) / 10 });
  scenarios.push({ code: 'marketDrop20', kind: 'estimate', impactPct: Math.round(-20 * sensitivity * 10) / 10 });

  // ~95% one-year adverse move from the fund's own annualized volatility (1.65σ).
  if (isNum(i.volatility)) {
    scenarios.push({ code: 'adverse1y', kind: 'estimate', impactPct: Math.round(-1.65 * i.volatility * 10) / 10 });
  }

  // Historical FACTS (not estimates) — the strongest, most honest anchors.
  if (isNum(i.maxDrawdown)) scenarios.push({ code: 'worstDrawdown', kind: 'historical', impactPct: Math.round(i.maxDrawdown * 10) / 10 });
  if (isNum(i.worstPeriod)) scenarios.push({ code: 'worstPeriod', kind: 'historical', impactPct: Math.round(i.worstPeriod * 10) / 10 });

  return { scenarios, fundKind: kind, sensitivity };
}

/* --------------------------------------------------------------- CALCULATOR */

export type Projection = {
  years: number;
  invested: number;
  base: number;      // projected value at CAGR
  low: number;       // conservative band
  high: number;      // optimistic band
  gain: number;      // base - invested
  gainPct: number;
  cagrUsed: number;
};

/**
 * Project a lump-sum investment forward using the fund's realized CAGR, with a soft
 * band derived from volatility. This is a MODELLED illustration from past performance
 * — the UI must show the "not a guarantee" disclaimer alongside it.
 */
export function projectInvestment(
  amount: number, years: number, cagr: number | null, volatility: number | null,
): Projection | null {
  if (!isNum(amount) || amount <= 0 || !isNum(years) || years <= 0 || !isNum(cagr)) return null;
  const r = cagr / 100;
  const base = amount * Math.pow(1 + r, years);
  // Band: widen the annual rate by ~0.6σ (annual), compounded — a plausible, non-scary
  // spread rather than a formal confidence interval.
  const vol = isNum(volatility) ? volatility / 100 : 0;
  const spread = 0.6 * vol;
  const low = amount * Math.pow(1 + Math.max(-0.95, r - spread), years);
  const high = amount * Math.pow(1 + r + spread, years);
  return {
    years,
    invested: Math.round(amount),
    base: Math.round(base),
    low: Math.round(Math.min(low, base)),
    high: Math.round(Math.max(high, base)),
    gain: Math.round(base - amount),
    gainPct: Math.round((base / amount - 1) * 1000) / 10,
    cagrUsed: Math.round(cagr * 100) / 100,
  };
}

/* ------------------------------------------------------------ convenience */

export type FundAnalytics = {
  scores: ScoreResult;
  suitability: SuitabilityResult;
  insights: Insight[];
  stress: StressResult;
  fundKind: FundKind;
  /** Enough context for the client-side calculator to run without re-fetching. */
  calc: { cagr: number | null; volatility: number | null; currency: string | null };
  /** Do we have enough to responsibly show the analytics layer at all? */
  hasEnoughData: boolean;
};

/** One-call builder used by the server render to attach analytics to client props.
 *  `suppressed` hard-hides the layer for rows the backend flagged as data-artifact
 *  corrupted (e.g. a cash fund with a redenomination step) — no score can be trusted
 *  there, so hasEnoughData is forced false regardless of which primitives survived. */
export function buildFundAnalytics(i: AnalyticsInput, currency: string | null, suppressed = false): FundAnalytics {
  const scores = computeScores(i);
  const hasEnoughData = !suppressed && isNum(i.navPoints) && i.navPoints >= 8 &&
    (isNum(i.cagr) || isNum(i.volatility) || isNum(i.return1y));
  return {
    scores,
    suitability: computeSuitability(i),
    insights: computeInsights(i, scores),
    stress: computeStressTest(i),
    fundKind: classifyFund(i),
    calc: { cagr: i.cagr, volatility: i.volatility, currency },
    hasEnoughData,
  };
}
