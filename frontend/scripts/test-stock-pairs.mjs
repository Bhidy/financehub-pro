/**
 * Pair-URL contract for /companies/vs/{A}-vs-{B}.
 *
 * Two things must hold or the comparison pages leak duplicate or nonsense URLs:
 *   1. Parsing survives EGX tickers that CONTAIN a dash ("EGS48271C018-EGP").
 *      A regex like /^(.+)-vs-(.+)$/ or a split('-') both mangle those.
 *   2. Every unordered pair has exactly ONE canonical URL, so B-vs-A redirects
 *      to A-vs-B instead of indexing the same table twice.
 *
 * The three-way case is a real regression this file caught: upper-casing the
 * right-hand side BEFORE testing it for a second "-vs-" made the guard compare
 * against "-VS-" and pass a malformed pair through.
 */

const PAIR_SEP = '-vs-';

export function parsePair(pair) {
    const raw = (pair || '').trim();
    const i = raw.indexOf(PAIR_SEP);
    if (i <= 0) return null;
    const rawA = raw.slice(0, i);
    const rawB = raw.slice(i + PAIR_SEP.length);
    if (!rawA || !rawB || rawB.includes(PAIR_SEP)) return null;
    const a = rawA.toUpperCase();
    const b = rawB.toUpperCase();
    if (a === b) return null;
    return { a, b };
}

export const canonicalPair = (a, b) => (a < b ? `${a}${PAIR_SEP}${b}` : `${b}${PAIR_SEP}${a}`);

const cases = [
    ['COMI-vs-HRHO', { a: 'COMI', b: 'HRHO' }],
    ['comi-vs-hrho', { a: 'COMI', b: 'HRHO' }],
    ['EGS48271C018-EGP-vs-COMI', { a: 'EGS48271C018-EGP', b: 'COMI' }],
    ['COMI-vs-EGS48271C018-EGP', { a: 'COMI', b: 'EGS48271C018-EGP' }],
    ['EGS385S1C012-vs-COMI', { a: 'EGS385S1C012', b: 'COMI' }],
    ['COMI-vs-COMI', null],
    ['COMI', null],
    ['-vs-COMI', null],
    ['COMI-vs-', null],
    ['A-vs-B-vs-C', null],
    ['', null],
    [null, null],
];

let failed = 0;
console.log('[1] pair parsing (dashed tickers, self-pairs, malformed)');
for (const [input, want] of cases) {
    const got = parsePair(input);
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${JSON.stringify(input)} → ${JSON.stringify(got)}`);
}

console.log('\n[2] canonical ordering — one indexable URL per unordered pair');
for (const [a, b] of [['COMI', 'HRHO'], ['EGS48271C018-EGP', 'COMI'], ['ABUK', 'SKPC']]) {
    const forward = canonicalPair(a, b);
    const reverse = canonicalPair(b, a);
    const ok = forward === reverse;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${a} + ${b} → ${forward} (reversed: ${reverse})`);
}

console.log('\n[3] a canonical URL round-trips through the parser');
for (const [a, b] of [['COMI', 'HRHO'], ['COMI', 'EGS48271C018-EGP']]) {
    const url = canonicalPair(a, b);
    const back = parsePair(url);
    const ok = back !== null && canonicalPair(back.a, back.b) === url;
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${url} → ${JSON.stringify(back)}`);
}

if (failed > 0) {
    console.error(`\nFAIL: stock pair contract — ${failed} case(s) wrong.`);
    process.exit(1);
}
console.log('\nPASS: stock pair URL contract');
