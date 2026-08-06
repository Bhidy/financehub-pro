/**
 * Pure scoring engine for the Investment Risk Assessment (/RiskAssessment).
 * Framework-free and unit-testable: no React, no browser globals. The wizard
 * collects one answer (1–4 points) per question; the total (7–28) maps to one
 * of five investor profiles, each with a model asset allocation and a set of
 * matching Egyptian mutual-fund categories on /Funds.
 */

export const QUESTION_COUNT = 7;
export const POINTS_MIN = 1;
export const POINTS_MAX = 4;
export const SCORE_MIN = QUESTION_COUNT * POINTS_MIN; // 7
export const SCORE_MAX = QUESTION_COUNT * POINTS_MAX; // 28

export type ProfileId = 'very_conservative' | 'conservative' | 'balanced' | 'growth' | 'aggressive';

/** Percentages, always summing to 100. */
export type Allocation = {
    cash: number;
    fixedIncome: number;
    equities: number;
};

export type ProfileDef = {
    id: ProfileId;
    /** 0-based position on the 5-segment risk gauge (0 = most conservative). */
    index: number;
    minScore: number;
    maxScore: number;
    allocation: Allocation;
};

/** Ordered from least to most risk. Bands are contiguous over 7..28. */
export const PROFILES: readonly ProfileDef[] = [
    { id: 'very_conservative', index: 0, minScore: 7, maxScore: 11, allocation: { cash: 20, fixedIncome: 70, equities: 10 } },
    { id: 'conservative', index: 1, minScore: 12, maxScore: 15, allocation: { cash: 15, fixedIncome: 55, equities: 30 } },
    { id: 'balanced', index: 2, minScore: 16, maxScore: 19, allocation: { cash: 10, fixedIncome: 40, equities: 50 } },
    { id: 'growth', index: 3, minScore: 20, maxScore: 23, allocation: { cash: 5, fixedIncome: 25, equities: 70 } },
    { id: 'aggressive', index: 4, minScore: 24, maxScore: 28, allocation: { cash: 5, fixedIncome: 10, equities: 85 } },
];

/** True for a whole number of points inside the 1..4 answer range. */
export function isValidPoints(v: unknown): v is number {
    return typeof v === 'number' && Number.isInteger(v) && v >= POINTS_MIN && v <= POINTS_MAX;
}

/**
 * Sum of the 7 answers, or null when the set is incomplete/invalid.
 * Never returns NaN: every element must be a valid 1..4 integer.
 */
export function scoreAnswers(answers: ReadonlyArray<number | null | undefined>): number | null {
    if (answers.length !== QUESTION_COUNT) return null;
    let sum = 0;
    for (const a of answers) {
        if (!isValidPoints(a)) return null;
        sum += a;
    }
    return sum;
}

/** Clamp any number (incl. NaN/Infinity) into the valid 7..28 integer range. */
export function clampScore(score: number): number {
    if (!Number.isFinite(score)) return SCORE_MIN;
    return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(score)));
}

export function profileForScore(score: number): ProfileDef {
    const s = clampScore(score);
    for (const p of PROFILES) {
        if (s >= p.minScore && s <= p.maxScore) return p;
    }
    /* istanbul ignore next -- bands cover the clamped range exhaustively */
    return PROFILES[PROFILES.length - 1];
}

/** Needle position along the gauge: 0 (score 7) .. 1 (score 28). */
export function scoreFraction(score: number): number {
    return (clampScore(score) - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
}

/* ── Fund-category mapping ─────────────────────────────────────────────── */

export type FundCategory = 'money_market' | 'fixed_income' | 'balanced' | 'equity' | 'gold';

const FUND_CATEGORY_MAP: Record<ProfileId, readonly FundCategory[]> = {
    very_conservative: ['money_market', 'fixed_income'],
    conservative: ['money_market', 'fixed_income', 'balanced'],
    balanced: ['balanced', 'equity', 'fixed_income'],
    growth: ['equity', 'gold', 'balanced'],
    aggressive: ['equity', 'gold', 'balanced'],
};

export function fundCategoriesFor(profile: ProfileId): FundCategory[] {
    return [...FUND_CATEGORY_MAP[profile]];
}

/** /Funds supports a ?type= filter query param (registered separately). */
export function fundCategoryHref(category: FundCategory): string {
    return `/Funds?type=${category}`;
}

/* ── Result persistence (localStorage contract) ────────────────────────── */

export const STORAGE_KEY = 'starta-risk-profile';

export type StoredResult = {
    score: number;
    profile: ProfileId;
    /** ISO-8601 timestamp of when the result was achieved. */
    date: string;
    /** The 7 raw answers (1..4 points each), in question order. */
    answers: number[];
};

/** Build the persistable result from a complete answer set (null if incomplete). */
export function buildStoredResult(
    answers: ReadonlyArray<number | null | undefined>,
    now: Date = new Date(),
): StoredResult | null {
    const score = scoreAnswers(answers);
    if (score === null) return null;
    return {
        score,
        profile: profileForScore(score).id,
        date: now.toISOString(),
        answers: answers.map((a) => a as number),
    };
}

/** Strictly validated parse of a previously stored result; null on any defect. */
export function parseStoredResult(raw: string | null): StoredResult | null {
    if (!raw) return null;
    try {
        const v: unknown = JSON.parse(raw);
        if (typeof v !== 'object' || v === null) return null;
        const o = v as Record<string, unknown>;
        const { score, profile, date, answers } = o;
        if (typeof score !== 'number' || !Number.isFinite(score) || score < SCORE_MIN || score > SCORE_MAX) return null;
        if (typeof profile !== 'string' || !PROFILES.some((p) => p.id === profile)) return null;
        if (typeof date !== 'string' || date.length === 0) return null;
        if (!Array.isArray(answers) || answers.length !== QUESTION_COUNT || !answers.every(isValidPoints)) return null;
        return { score, profile: profile as ProfileId, date, answers: answers as number[] };
    } catch {
        return null;
    }
}
