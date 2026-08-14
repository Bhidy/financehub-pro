/**
 * Gate: the NAV gap engine must break real holes and NEVER flag real market history.
 * Run: npx tsx scripts/test-nav-gaps.ts
 */
import { readFileSync } from 'fs';
import {
    medianIntervalDays, gapToleranceDays, breakToleranceDays, findGaps, withGapBreaks,
    splitAtGaps, anchorWithinTolerance, type NavPoint,
} from '../lib/nav-gaps';

let failures = 0;
const check = (name: string, got: unknown, want: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failures++;
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};

const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

console.log('\n[1] REAL fund 5784 — 760 production rows, documented 412-day hole');
const real: NavPoint[] = JSON.parse(
    // Real production series, captured 2026-08-15. Committed as a fixture so this
    // gate keeps working offline and in CI — the hole in it is the actual incident.
    readFileSync(new URL('./fixtures/nav-5784-real.json', import.meta.url), 'utf8')
).map(([t, v]: [string, number]) => ({ time: t, value: v }));
const realGaps = findGaps(real);
console.log(`       median=${medianIntervalDays(real)}d tolerance=${gapToleranceDays(real)}d`);
console.log('       detected gaps:', realGaps.map(g => `${g.from}->${g.to} ${g.days}d`).join(' | '));
check('detects every real absence', realGaps.length, 5);
check('the 13-month hole is among them', realGaps.some(g => g.days === 412), true);
// Only the misleading one is severed — 12-26d holes stay connected.
const severed = findGaps(real, breakToleranceDays(real));
check('exactly one gap is severe enough to break', severed.length, 1);
check('break starts at the frozen-CSV date', severed[0]?.from, '2025-05-14');
check('break ends where the list-API resumed', severed[0]?.to, '2026-06-30');
const broken = withGapBreaks(real);
const ws = broken.filter(p => p.value === undefined);
// The hole must occupy real horizontal space, not one sub-pixel bar. A single
// break point looked severed in a unit test and still rendered as a cliff.
check('gap is filled with proportional whitespace', ws.length > 300, true);
check('whitespace is capped', ws.length <= 400, true);
check('no real value was altered', broken.filter(p => p.value !== undefined).length, real.length);
check('whitespace never collides with a real date',
    ws.some(w => real.some(r => r.time === w.time)), false);
check('series stays chronologically sorted',
    broken.every((p, i) => i === 0 || p.time >= broken[i - 1].time), true);
check('the hole is a visible share of the series', ws.length / broken.length > 0.25, true);
// Segments are what actually guarantees the break: whitespace alone did NOT stop
// the AreaSeries drawing through the hole (verified by canvas pixel scan on prod).
const runs = splitAtGaps(real);
check('splits into two contiguous runs', runs.length, 2);
check('run 1 ends at the freeze', runs[0][runs[0].length - 1].time, '2025-05-14');
check('run 2 starts at the resume', runs[1][0].time, '2026-06-30');
check('every observation survives the split', runs.reduce((n, r) => n + r.length, 0), real.length);
check('runs stay in order and never overlap',
    runs[0][runs[0].length - 1].time < runs[1][0].time, true);
check('real values are untouched, not rescaled',
    broken.filter(p => p.value !== undefined).map(p => p.value).join() === real.map(p => p.value).join(), true);

console.log('\n[2] WEEKLY fund — 7-day cadence is NORMAL, must not be flagged (54 funds)');
const weekly: NavPoint[] = Array.from({ length: 60 }, (_, i) => ({ time: day(2025, 0, 5 + i * 7), value: 100 + i }));
check('median interval is 7', medianIntervalDays(weekly), 7);
check('tolerance scales to cadence', gapToleranceDays(weekly), 21);
check('zero gaps flagged', findGaps(weekly).length, 0);
check('break threshold scales too', breakToleranceDays(weekly), 70);
check('series passes through untouched', withGapBreaks(weekly).length, weekly.length);
check('no whitespace added to a clean weekly fund', withGapBreaks(weekly).filter(p => p.value === undefined).length, 0);
check('a clean fund stays ONE unbroken run', splitAtGaps(weekly).length, 1);

console.log('\n[3] MONTHLY fund — 30-day cadence must not be flagged');
const monthly: NavPoint[] = Array.from({ length: 30 }, (_, i) => ({ time: day(2024, i, 1), value: 50 + i }));
check('zero gaps flagged', findGaps(monthly).length, 0);

console.log('\n[4] 2011 EGX closure — real market history, must NEVER be filled or flagged');
const revolution: NavPoint[] = [
    { time: '2011-01-24', value: 10 }, { time: '2011-01-25', value: 10.1 }, { time: '2011-01-26', value: 10 },
    { time: '2011-03-24', value: 8.9 }, { time: '2011-03-27', value: 9.0 }, { time: '2011-03-28', value: 9.1 },
];
check('closure is not a defect', findGaps(revolution).length, 0);
check('series not broken across the closure', withGapBreaks(revolution).length, revolution.length);
check('closure does NOT split the series', splitAtGaps(revolution).length, 1);

console.log('\n[5] A genuine multi-month hole in a daily fund MUST be flagged');
const holed: NavPoint[] = [
    { time: '2025-05-12', value: 10 }, { time: '2025-05-13', value: 10 }, { time: '2025-05-14', value: 10 },
    { time: '2026-06-30', value: 13 }, { time: '2026-07-01', value: 13 }, { time: '2026-07-02', value: 13 },
];
check('one gap detected', findGaps(holed).length, 1);
check('gap length is correct', findGaps(holed)[0]?.days, 412);

console.log('\n[6] Weekend/holiday noise must not trip a daily fund');
const noisy: NavPoint[] = [
    { time: '2025-03-02', value: 1 }, { time: '2025-03-03', value: 1 }, { time: '2025-03-04', value: 1 },
    { time: '2025-03-05', value: 1 }, { time: '2025-03-06', value: 1 },
    { time: '2025-03-13', value: 1 }, // Eid: 7-day break
    { time: '2025-03-16', value: 1 }, { time: '2025-03-17', value: 1 },
];
check('holiday break tolerated', findGaps(noisy).length, 0);

console.log('\n[7] Return-anchor tolerance');
check('1Y anchor 15 months old is REJECTED', anchorWithinTolerance('2025-05-14', '2025-08-15', 365), false);
check('1Y anchor 5 days off is accepted', anchorWithinTolerance('2025-08-10', '2025-08-15', 365), true);
check('3M anchor 40 days off is REJECTED', anchorWithinTolerance('2025-07-06', '2025-08-15', 92), false);
check('3M anchor 6 days off is accepted', anchorWithinTolerance('2025-08-09', '2025-08-15', 92), true);

console.log('\n[8] Degenerate inputs must not throw');
check('empty', findGaps([]).length, 0);
check('single point', findGaps([{ time: '2026-01-01', value: 1 }]).length, 0);
check('single point passthrough', withGapBreaks([{ time: '2026-01-01', value: 1 }]).length, 1);

console.log(failures ? `\n❌ ${failures} assertion(s) failed\n` : '\n✅ all nav-gap assertions passed\n');
process.exit(failures ? 1 : 0);
