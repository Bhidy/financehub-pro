/**
 * NAV gap detection — shared by every chart that draws a fund's history.
 *
 * WHY THIS EXISTS (2026-08-15 audit)
 * ----------------------------------
 * Mubasher's per-fund CSV stopped publishing around 2025-05 for a large cohort.
 * A daily list-API sync resumed writing in 2026-06. The result is two islands of
 * data with a ~13-month hole between them — 61 funds carry exactly that shape.
 *
 * lightweight-charts spaces points by INDEX, not by calendar time, and connects
 * consecutive points with a line. So two rows 412 days apart render as one bar
 * width joined by a near-vertical segment: the platform drew a 29% price jump
 * that never happened. On the compare page `LineType.Curved` made it worse by
 * fitting a spline through the void.
 *
 * The fix is not to invent the missing values. It is to BREAK the series so the
 * absence is visible, and to let callers label it.
 *
 * NOT EVERY GAP IS A DEFECT — this is the part that must not be got wrong:
 *   - 54 of 195 funds publish WEEKLY. A 7-day interval is their normal cadence,
 *     not a hole. A fixed day-count threshold would flag all of them.
 *   - The EGX was genuinely shut 2011-01-27 → 2011-03-23 (revolution). 23 funds
 *     lived through it. That is real market history and must never be "filled".
 *   - The Egyptian week is Sunday–Thursday, so Fri/Sat absences are structural.
 *
 * So tolerance is derived from each fund's OWN median interval, and known
 * closures are excluded. Only what is left is treated as missing data.
 */

export type NavPoint = { time: string; value: number };
/** A whitespace point breaks the line in lightweight-charts. */
export type SeriesPoint = { time: string; value?: number };

export type Gap = { from: string; to: string; days: number };

/** Exchange closures that are real history, not missing data. */
const CLOSURES: ReadonlyArray<readonly [string, string]> = [
    ['2011-01-27', '2011-03-23'], // Egyptian revolution — EGX shut ~8 weeks
];

const DAY = 86_400_000;
const iso = (s: string) => Date.parse(`${s}T00:00:00Z`);

function overlapsClosure(from: string, to: string): boolean {
    return CLOSURES.some(([s, e]) => !(iso(to) <= iso(s) || iso(from) >= iso(e)));
}

/**
 * The fund's own publication rhythm, as a median interval in days.
 * Median (not mean) so a single long hole cannot drag the estimate.
 */
export function medianIntervalDays(points: readonly NavPoint[]): number {
    if (points.length < 3) return 1;
    const gaps: number[] = [];
    for (let i = 1; i < points.length; i++) {
        gaps.push((iso(points[i].time) - iso(points[i - 1].time)) / DAY);
    }
    gaps.sort((a, b) => a - b);
    const mid = Math.floor(gaps.length / 2);
    return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

/**
 * Gap tolerance for this fund: 3x its own cadence, floored at 10 days so a
 * daily fund is not tripped by a public holiday plus a weekend.
 */
export function gapToleranceDays(points: readonly NavPoint[]): number {
    return Math.max(10, medianIntervalDays(points) * 3);
}

/** Intervals that are genuinely missing data, closures and cadence excluded. */
export function findGaps(points: readonly NavPoint[], toleranceDays?: number): Gap[] {
    if (points.length < 2) return [];
    const tol = toleranceDays ?? gapToleranceDays(points);
    const out: Gap[] = [];
    for (let i = 1; i < points.length; i++) {
        const from = points[i - 1].time;
        const to = points[i].time;
        const days = Math.round((iso(to) - iso(from)) / DAY);
        if (days <= tol) continue;
        if (overlapsClosure(from, to)) continue;
        out.push({ from, to, days });
    }
    return out;
}

/**
 * Threshold for VISUALLY severing the line, deliberately higher than the
 * detection threshold above.
 *
 * Two thresholds, because the two jobs are different. Detection should be
 * generous — every real absence belongs in the completeness metric. Breaking
 * the line is a loud visual claim, and fragmenting a chart into a dozen
 * segments over ordinary 12-day holes would make it harder to read while
 * misrepresenting the severity.
 *
 * The test that matters: does interpolating across this gap MISLEAD? Fund 5784
 * has five detected gaps — four of 12–26 days and one of 412. Drawing a line
 * across twelve days of a money-market fund distorts nothing. Drawing one
 * across 412 days invents a 29% price move. Only the second earns a break.
 */
export function breakToleranceDays(points: readonly NavPoint[]): number {
    return Math.max(30, medianIntervalDays(points) * 10);
}

/** Safety valve: a 20-year hole must not generate 7,000 points. */
const MAX_FILLER_PER_GAP = 400;

/**
 * Fill every misleading gap with WHITESPACE points at the fund's own cadence,
 * so the renderer both breaks the line and gives the hole its true width.
 *
 * Why not a single break point — learned the hard way, in the browser:
 * lightweight-charts spaces points by INDEX. One whitespace point therefore
 * buys exactly one bar of gap, which on a 431-point series is under two pixels.
 * The line was severed and still looked like a vertical cliff, because the
 * severing was sub-pixel. The unit tests passed and the chart was still lying.
 *
 * Emitting one whitespace point per cadence-step across the hole makes the
 * index axis approximate a CALENDAR axis over that span: 412 missing days of a
 * daily fund become ~412 empty slots, so the hole reads as the long silence it
 * actually was, and the two islands of data sit where they belong in time.
 *
 * These points carry no value. Nothing is estimated, interpolated or invented —
 * they are the absence, made visible.
 */
export function withGapBreaks(points: readonly NavPoint[], toleranceDays?: number): SeriesPoint[] {
    if (points.length < 2) return [...points];
    const gaps = findGaps(points, toleranceDays ?? breakToleranceDays(points));
    if (!gaps.length) return [...points];

    const step = Math.max(1, Math.round(medianIntervalDays(points)));
    const gapFrom = new Map(gaps.map((g) => [g.from, g]));
    const out: SeriesPoint[] = [];

    for (let i = 0; i < points.length; i++) {
        out.push(points[i]);
        const gap = gapFrom.get(points[i].time);
        if (!gap) continue;

        const startMs = iso(gap.from);
        const endMs = iso(gap.to);
        const slots = Math.floor((endMs - startMs) / (step * DAY)) - 1;
        const emit = Math.min(slots, MAX_FILLER_PER_GAP);
        if (emit <= 0) continue;
        // Spread evenly so a capped gap still spans its full width.
        const stride = (endMs - startMs) / (emit + 1);
        for (let k = 1; k <= emit; k++) {
            const t = new Date(startMs + stride * k).toISOString().slice(0, 10);
            if (t !== gap.from && t !== gap.to) out.push({ time: t });
        }
    }
    // Whitespace must never collide with, or reorder against, a real observation.
    const seen = new Set(points.map((p) => p.time));
    return out.filter((p) => ('value' in p && p.value !== undefined) || !seen.has(p.time));
}

/** Total days of missing data — used for the completeness badge. */
export function missingDays(points: readonly NavPoint[], toleranceDays?: number): number {
    return findGaps(points, toleranceDays).reduce((n, g) => n + g.days, 0);
}

/**
 * Is `anchor` close enough to `target` to justify labelling a return with that
 * period? A "1Y return" measured from a point 15 months old is a false number.
 * Tolerance scales with the window: 10% of it, floored at 10 days.
 */
export function anchorWithinTolerance(anchorDate: string, targetDate: string, windowDays: number): boolean {
    const drift = Math.abs(iso(anchorDate) - iso(targetDate)) / DAY;
    return drift <= Math.max(10, windowDays * 0.1);
}
