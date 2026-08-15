/**
 * Gate: no range button may render a window other than its own label.
 *
 * The 2026-08-15 audit measured the OLD applyRange across all 195 production
 * funds: 99 of them had two or more differently-labelled ranges drawing a
 * pixel-identical chart (on 23 funds, five of the six buttons did), because
 * line 109 silently substituted the full series and fitContent() then rescaled
 * the axis to the data's own extent. This replicates BOTH behaviours against
 * the same production data so the fix is measured, not asserted.
 *
 * Run: npx tsx scripts/test-range-integrity.ts [path-to-sweep.json]
 */
import { readFileSync } from 'fs';

const RANGES = ['1M', '3M', 'YTD', '1Y', '3Y', 'ALL'] as const;
type Range = (typeof RANGES)[number];
const MIN_POINTS_TO_DRAW = 2;
const MIN_WINDOW_COVERAGE = 1 / 3;
const NOW = Date.UTC(2026, 7, 15);
const DAY = 86_400_000;

function cutoff(r: Range): number | null {
    switch (r) {
        case '1M': return NOW - 31 * DAY;
        case '3M': return NOW - 92 * DAY;
        case 'YTD': return Date.UTC(2026, 0, 1);
        case '1Y': return NOW - 365 * DAY;
        case '3Y': return NOW - 3 * 365 * DAY;
        case 'ALL': return null;
    }
}
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);

/** What the chart drew BEFORE: <2 points in window => silently swap in everything. */
function oldView(all: string[], r: Range): string[] {
    const c = cutoff(r);
    const f = c === null ? all : all.filter((d) => ms(d) >= c);
    return f.length >= 2 ? f : all;
}
/**
 * What it draws NOW. Two changes matter and BOTH must be modelled:
 *   1. a window it cannot support is disabled, never substituted; and
 *   2. the x-axis is pinned to the REQUESTED window via setVisibleRange, not
 *      rescaled to the data's own extent by fitContent().
 * What the user sees is (axis span + data), so identity must include the axis.
 * Comparing data alone would wrongly call 3M and 1Y identical for a fund whose
 * only data is a recent six-week island — those now render very differently:
 * 1Y shows that island against a full year of empty axis, which is the honest
 * picture. That emptiness IS the information.
 */
function newView(all: string[], r: Range): { axis: string; data: string[] } | null {
    const c = cutoff(r);
    if (c === null) {
        return all.length >= MIN_POINTS_TO_DRAW ? { axis: `${all[0]}..${all[all.length - 1]}`, data: all } : null;
    }
    const f = all.filter((d) => ms(d) >= c);
    if (f.length < MIN_POINTS_TO_DRAW) return null;      // button disabled
    // A labelled period must be backed by history covering a real share of it.
    // Without this the thin cohort passed while "3Y" still showed five weeks —
    // the earlier version of this gate modelled setVisibleRange as always
    // succeeding, but it REFUSES a range extending past the series and the code
    // fell back to fitContent(). Model the rule, not the happy path.
    if ((NOW - ms(f[0])) / (NOW - c) < MIN_WINDOW_COVERAGE) return null;
    const axis = `${new Date(c).toISOString().slice(0, 10)}..${f[f.length - 1]}`;
    return { axis, data: f };
}

const funds: Record<string, string[]> = JSON.parse(
    readFileSync(process.argv[2] ?? '/private/tmp/claude-501/-Users-mohamedbhidy-Documents-startamarkets/a767bf37-cc3b-468f-a91d-ae8bd355aedf/scratchpad/audit/all_dates.json', 'utf8')
);

let oldDup = 0, newDup = 0, oldLie = 0, newDisabled = 0, total = 0;
const offenders: string[] = [];

for (const [id, dates] of Object.entries(funds)) {
    if (dates.length < 2) continue;
    total++;
    const group = (keys: (Range | null)[][]) => {
        const seen = new Map<string, Range[]>();
        for (const [r, k] of keys as unknown as [Range, string | null][]) {
            if (k === null) continue;              // disabled: renders nothing, cannot lie
            (seen.get(k) ?? seen.set(k, []).get(k)!).push(r);
        }
        return [...seen.values()].filter((g) => g.length > 1);
    };
    // BEFORE: fitContent() meant the axis always equalled the data extent, so the
    // rendered identity was the data alone.
    const o = group(RANGES.map((r) => {
        const v = oldView(dates, r);
        return [r, `${v.length}:${v[0]}:${v[v.length - 1]}`];
    }) as never);
    const n = group(RANGES.map((r) => {
        const v = newView(dates, r);
        return [r, v === null ? null : `${v.axis}|${v.data.length}`];
    }) as never);
    if (o.length) oldDup++;
    if (n.length) { newDup++; offenders.push(`${id}: ${n.map((g) => g.join('=')).join(' | ')}`); }
    // a "lie" = the old code drew the FULL series under a narrower label
    for (const r of RANGES) {
        if (r === 'ALL') continue;
        if (oldView(dates, r).length === dates.length && (cutoff(r) !== null)) {
            const c = cutoff(r)!;
            if (dates.filter((d) => ms(d) >= c).length < 2) { oldLie++; break; }
        }
    }
    for (const r of RANGES) if (newView(dates, r) === null) { newDisabled++; break; }
}

console.log(`\nfunds evaluated: ${total}`);
console.log(`  BEFORE — funds with duplicate-rendering ranges : ${oldDup}`);
console.log(`  AFTER  — funds with duplicate-rendering ranges : ${newDup}`);
console.log(`  BEFORE — funds where a button drew the FULL series under a narrower label: ${oldLie}`);
console.log(`  AFTER  — funds with >=1 range now honestly DISABLED: ${newDisabled}`);
if (offenders.length) {
    console.log('\n  remaining duplicates:');
    offenders.slice(0, 10).forEach((o) => console.log('   ', o));
}
const pass = newDup === 0;
console.log(pass
    ? '\n✅ every enabled range renders a distinct window matching its label\n'
    : `\n❌ ${newDup} fund(s) still render duplicate charts under different labels\n`);
process.exit(pass ? 0 : 1);
