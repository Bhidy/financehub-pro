#!/usr/bin/env node
/**
 * DUPLICATION ENGINE — near-duplicate detection across news, learn and hubs.
 *
 *     node scripts/seo/duplicates.mjs [--segment news] [--sample 300] [--out f.json]
 *     node scripts/seo/duplicates.mjs --all            # every URL in the segment
 *
 * WHY. The news archive is 4,584 URLs fed by an upstream wire. Wires re-file
 * the same story under new ids, and a site that publishes four near-identical
 * articles for one event asks Google to pick a canonical it never declared —
 * which it does by picking one and discounting the rest, or by discounting all
 * of them. Nothing in this repo could see that happening.
 *
 * HOW IT MEASURES, and why it is not just "compare the text":
 *
 * 1. BOILERPLATE IS STRIPPED FIRST. Every page shares a nav, a footer and a
 *    disclaimer. Hashing the raw body makes every pair look ~70% similar and
 *    the signal disappears. Tokens that appear on more than BOILERPLATE_RATIO
 *    of sampled pages are dropped from every document before hashing — the
 *    site's own chrome, learned from the sample rather than hardcoded.
 *
 * 2. SimHash (64-bit) over token shingles. Near-duplicates land within a small
 *    Hamming distance, so comparison is O(n²) on cheap integer XOR rather than
 *    O(n²) on string similarity, and the whole archive stays tractable.
 *
 * 3. Jaccard on the shingle sets CONFIRMS every candidate pair. SimHash has
 *    false positives at low bit-distance on short documents; a headline-length
 *    page can collide with an unrelated one. A pair is only reported when both
 *    agree, which is the same "confirm before recording" discipline the page
 *    auditor needed after it emitted six false criticals from its own
 *    concurrency.
 *
 * CLASSIFICATION — deliberately four states, not one "duplicate" verdict:
 *   EXACT            identical normalised text
 *   NEAR_DUPLICATE   ≥ NEAR_JACCARD — same article, re-filed
 *   SAME_INTENT      ≥ INTENT_JACCARD — different words, same story/topic;
 *                    a canonical/consolidation decision, not a bug
 *   THIN_BOILERPLATE most of the page is chrome; there is not enough unique
 *                    text to judge, which is its own finding
 *
 * WHAT IT WILL NOT DO. It does not delete, canonicalise or rewrite anything.
 * Editorial consolidation is a human decision (§53 level 4) and an automated
 * merge of two financial news stories can destroy a correction. It reports.
 */
import { writeFileSync } from 'node:fs';
import { httpGet, mapLimit, parseLocs, parseUrlEntries, stripTags, SITE_URL, nowIso } from './lib.mjs';

const arg = (name, dflt = null) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};
const has = (name) => process.argv.includes(`--${name}`);

const SEGMENT = arg('segment', 'news');
const SAMPLE = Number(arg('sample', '250'));
const ALL = has('all');
const OUT = arg('out');
const CONCURRENCY = 6;

/** A token appearing on more than this share of pages is site chrome. */
const BOILERPLATE_RATIO = 0.6;
const SHINGLE = 4;
const HAMMING_MAX = 12;
const NEAR_JACCARD = 0.82;
const INTENT_JACCARD = 0.55;
/** Below this many unique tokens there is no article to compare. */
const MIN_UNIQUE_TOKENS = 40;

/** Arabic + Latin word tokens. Arabic diacritics and tatweel are stripped so
 *  two spellings of the same word do not read as different tokens. */
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[ً-ْـ]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .split(/[^\p{L}\p{N}]+/u)
        .filter((t) => t.length > 1);
}

/** FNV-1a 64-bit as a BigInt — no dependency, stable across runs. */
function hash64(str) {
    let h = 0xcbf29ce484222325n;
    const prime = 0x100000001b3n;
    for (let i = 0; i < str.length; i++) {
        h ^= BigInt(str.charCodeAt(i));
        h = (h * prime) & 0xffffffffffffffffn;
    }
    return h;
}

function simhash(shingles) {
    const bits = new Array(64).fill(0);
    for (const sh of shingles) {
        const h = hash64(sh);
        for (let i = 0; i < 64; i++) bits[i] += (h >> BigInt(i)) & 1n ? 1 : -1;
    }
    let out = 0n;
    for (let i = 0; i < 64; i++) if (bits[i] > 0) out |= 1n << BigInt(i);
    return out;
}

const hamming = (a, b) => {
    let x = a ^ b;
    let n = 0;
    while (x) {
        x &= x - 1n;
        n++;
    }
    return n;
};

const jaccard = (a, b) => {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    const [small, large] = a.size < b.size ? [a, b] : [b, a];
    for (const v of small) if (large.has(v)) inter++;
    return inter / (a.size + b.size - inter);
};

/** Main content only. Falls back to the body with chrome elements removed —
 *  the learned stop-list below catches whatever survives. */
function mainText(html) {
    let h = html.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    h = h.replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    const article = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(h) || /<main[^>]*>([\s\S]*?)<\/main>/i.exec(h);
    return stripTags(article ? article[1] : h);
}

async function segmentUrls(segment) {
    const idx = await httpGet(`${SITE_URL}/sitemap.xml`);
    if (idx.status !== 200) throw new Error(`sitemap index ${idx.status}`);
    const child = parseLocs(idx.body).find((u) => u.endsWith(`/${segment}.xml`));
    if (!child) throw new Error(`no sitemap segment "${segment}"`);
    const doc = await httpGet(child);
    if (doc.status !== 200) throw new Error(`segment ${doc.status}`);
    return parseUrlEntries(doc.body).map((e) => e.loc).filter(Boolean);
}

/** Deterministic even spread, so consecutive runs are comparable. */
const sampleEvenly = (arr, n) => {
    if (arr.length <= n) return arr;
    const step = arr.length / n;
    return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
};

/**
 * SELF-TEST — proof the detector can actually fire.
 *
 * The first real runs reported zero duplicates across news and learn. That is
 * either a clean archive or a broken detector, and the two look identical from
 * the outside. This exercises the classifier on constructed inputs whose answer
 * is known, so "no duplicates found" becomes a measurement instead of a guess.
 * Wired into verify:all; exits non-zero on any wrong verdict.
 */
function selfTest() {
    const base =
        'الشركة المصرية للاتصالات تعلن نتائج الربع الثالث بارتفاع الأرباح إلى مليار جنيه ' +
        'مدفوعة بنمو قاعدة المشتركين وزيادة إيرادات خدمات البيانات خلال الفترة الحالية للسوق';
    const cases = [
        { name: 'identical text', a: base, b: base, expect: 'EXACT' },
        {
            name: 're-filed wire copy (one clause changed)',
            a: base,
            b: base.replace('خلال الفترة الحالية للسوق', 'خلال الفترة الماضية للسوق'),
            expect: 'NEAR_DUPLICATE',
        },
        {
            name: 'unrelated story',
            a: base,
            b: 'البنك المركزي المصري يثبت أسعار الفائدة في اجتماع لجنة السياسة النقدية اليوم ' +
               'وسط توقعات المحللين باستمرار الضغوط التضخمية على الاقتصاد المحلي حتى نهاية العام',
            expect: null,
        },
    ];

    const classify = (ta, tb) => {
        const mk = (t) => {
            const toks = tokenize(t);
            const sh = new Set();
            for (let i = 0; i + SHINGLE <= toks.length; i++) sh.add(toks.slice(i, i + SHINGLE).join(' '));
            return { sh, sim: simhash(sh), norm: toks.join(' ') };
        };
        const A = mk(ta);
        const B = mk(tb);
        if (hamming(A.sim, B.sim) > HAMMING_MAX) return null;
        const j = jaccard(A.sh, B.sh);
        if (A.norm === B.norm) return 'EXACT';
        if (j >= NEAR_JACCARD) return 'NEAR_DUPLICATE';
        if (j >= INTENT_JACCARD) return 'SAME_INTENT';
        return null;
    };

    let failed = 0;
    for (const c of cases) {
        const got = classify(c.a, c.b);
        const ok = got === c.expect;
        if (!ok) failed++;
        console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${c.name}: expected ${c.expect ?? 'no match'}, got ${got ?? 'no match'}`);
    }
    if (failed) {
        console.error(`\nFAIL: duplicate detector — ${failed} wrong verdict(s). "0 duplicates found" cannot be trusted.`);
        process.exit(1);
    }
    console.log('\nPASS: duplicate detector fires on known duplicates and ignores unrelated text');
}

async function main() {
    if (has('selftest')) return selfTest();
    const started = Date.now();
    let urls;
    try {
        urls = await segmentUrls(SEGMENT);
    } catch (e) {
        console.error(`[duplicates] cannot read segment "${SEGMENT}": ${e.message}`);
        process.exit(1);
    }
    const targets = ALL ? urls : sampleEvenly(urls, SAMPLE);
    console.log(`[duplicates] segment=${SEGMENT} sitemapped=${urls.length} analysing=${targets.length}`);

    const docs = [];
    await mapLimit(targets, CONCURRENCY, async (url) => {
        const res = await httpGet(url);
        if (res.status !== 200 || !res.body) return;
        const tokens = tokenize(mainText(res.body));
        if (tokens.length) docs.push({ url, tokens });
    });
    if (docs.length < 2) {
        console.log('[duplicates] not enough readable pages to compare');
        return;
    }

    // Learn this site's chrome from the sample instead of hardcoding it.
    const df = new Map();
    for (const d of docs) for (const t of new Set(d.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
    const cutoff = docs.length * BOILERPLATE_RATIO;
    const stop = new Set([...df.entries()].filter(([, n]) => n > cutoff).map(([t]) => t));
    console.log(`[duplicates] learned ${stop.size} boilerplate tokens from ${docs.length} pages`);

    const thin = [];
    const prepared = [];
    for (const d of docs) {
        const content = d.tokens.filter((t) => !stop.has(t));
        const unique = new Set(content);
        if (unique.size < MIN_UNIQUE_TOKENS) {
            thin.push({ url: d.url, uniqueTokens: unique.size });
            continue;
        }
        const shingles = new Set();
        for (let i = 0; i + SHINGLE <= content.length; i++) shingles.add(content.slice(i, i + SHINGLE).join(' '));
        if (!shingles.size) continue;
        prepared.push({ url: d.url, shingles, sim: simhash(shingles), norm: content.join(' ') });
    }

    const pairs = [];
    for (let i = 0; i < prepared.length; i++) {
        for (let j = i + 1; j < prepared.length; j++) {
            const a = prepared[i];
            const b = prepared[j];
            // Cheap gate first; Jaccard only on candidates SimHash flags.
            if (hamming(a.sim, b.sim) > HAMMING_MAX) continue;
            const jac = jaccard(a.shingles, b.shingles);
            let kind = null;
            if (a.norm === b.norm) kind = 'EXACT';
            else if (jac >= NEAR_JACCARD) kind = 'NEAR_DUPLICATE';
            else if (jac >= INTENT_JACCARD) kind = 'SAME_INTENT';
            if (kind) pairs.push({ kind, jaccard: Number(jac.toFixed(3)), a: a.url, b: b.url });
        }
    }
    pairs.sort((x, y) => y.jaccard - x.jaccard);

    const counts = pairs.reduce((acc, p) => ((acc[p.kind] = (acc[p.kind] ?? 0) + 1), acc), {});
    const report = {
        generatedAt: nowIso(),
        segment: SEGMENT,
        durationMs: Date.now() - started,
        sitemapped: urls.length,
        analysed: docs.length,
        compared: prepared.length,
        boilerplateTokens: stop.size,
        thresholds: { HAMMING_MAX, NEAR_JACCARD, INTENT_JACCARD, MIN_UNIQUE_TOKENS, BOILERPLATE_RATIO },
        counts,
        thinBoilerplate: thin,
        pairs: pairs.slice(0, 200),
        // Stated in the artifact so a reader never mistakes this for a cleanup tool.
        note: 'Reported only. Merging or canonicalising editorial content is a human decision; an automated merge of two financial stories can destroy a correction.',
    };

    const p = (n) => String(n).padStart(5);
    console.log(`\n[duplicates] EXACT ${p(counts.EXACT ?? 0)}   NEAR ${p(counts.NEAR_DUPLICATE ?? 0)}   SAME-INTENT ${p(counts.SAME_INTENT ?? 0)}   THIN ${p(thin.length)}`);
    for (const x of pairs.slice(0, 12)) {
        console.log(`  ${x.kind.padEnd(15)} j=${x.jaccard}`);
        console.log(`     ${x.a.replace(SITE_URL, '')}`);
        console.log(`     ${x.b.replace(SITE_URL, '')}`);
    }
    if (!pairs.length) console.log('  no duplicate or same-intent pairs above threshold');

    if (OUT) {
        writeFileSync(OUT, JSON.stringify(report, null, 2));
        console.log(`[duplicates] wrote ${OUT}`);
    }
}

main().catch((e) => {
    console.error('[duplicates] fatal:', e.message);
    process.exit(1);
});
