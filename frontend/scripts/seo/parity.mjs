/**
 * SITEMAP PARITY — a sitemap is a PROMISE, and this is the proof.
 *
 *   node scripts/seo/parity.mjs                 # every URL in every sitemap
 *   node scripts/seo/parity.mjs --segment news  # one segment
 *   node scripts/seo/parity.mjs --sample 400    # cap per segment (post-deploy)
 *   node scripts/seo/parity.mjs --out parity.json --fail-on any
 *
 * THE CONTRACT. Every URL this site advertises must answer 200, declare itself
 * canonical, and be indexable. Anything else is a promise we broke:
 *
 *   · non-200        → "Not found (404)" / "Server error" in Search Console
 *   · 3xx            → "Page with redirect": crawl budget spent to be told to
 *                      go somewhere else, and the sitemap should have said so
 *   · cross-canonical→ the URL de-indexes itself in favour of another
 *   · noindex        → we asked to be crawled and then refused to be indexed
 *
 * WHY IT IS SEPARATE FROM audit.mjs. The forensic audit SAMPLES (25 per
 * segment) because it fetches and parses whole documents; sampling is right for
 * template regressions and wrong for parity, where the whole point is that no
 * single URL is broken. This walks the FULL set with cheap requests, so
 * "zero broken advertised URLs" is a measured fact rather than an inference
 * from 25 samples.
 *
 * Exit: 0 clean · 1 defects at/above --fail-on · 2 the check could not run.
 */
import { writeFileSync } from 'node:fs';
import { SITE_URL, httpGet, mapLimit, extractHtmlFacts, parseLocs, nowIso } from './lib.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const ONLY = flag('segment', null);
const SAMPLE = Number(flag('sample', 0)) || 0;
const OUT = flag('out', null);
const CONCURRENCY = Number(flag('concurrency', 6));
/** `any` fails on any defect; `hard` ignores canonical/indexability nuance. */
const FAIL_ON = flag('fail-on', 'any');

/** Deterministic even stride, so two runs sample the same URLs. */
function stride(arr, n) {
    if (!n || arr.length <= n) return arr;
    const step = arr.length / n;
    return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

async function main() {
    const indexXml = await httpGet(`${SITE_URL}/sitemap.xml`, { retries: 2 });
    if (indexXml.status !== 200) {
        console.error(`[parity] sitemap index returned ${indexXml.status} — cannot run`);
        process.exit(2);
    }
    const segments = parseLocs(indexXml.body);
    const targets = [];
    const perSegment = {};
    for (const segUrl of segments) {
        const name = segUrl.split('/').pop().replace('.xml', '');
        if (ONLY && name !== ONLY) continue;
        const res = await httpGet(segUrl, { retries: 2 });
        if (res.status !== 200) {
            console.error(`[parity] segment ${name} returned ${res.status}`);
            process.exit(2);
        }
        const locs = parseLocs(res.body);
        perSegment[name] = locs.length;
        for (const loc of stride(locs, SAMPLE)) targets.push({ segment: name, loc });
    }

    console.log(`[parity] ${targets.length} advertised URL(s) across ${Object.keys(perSegment).length} segment(s), concurrency ${CONCURRENCY}`);
    const defects = [];
    let checked = 0;

    await mapLimit(targets, CONCURRENCY, async (t) => {
        // ONE request per URL. redirect:'manual' so a 3xx is the finding rather
        // than something we silently follow; the body is needed anyway for the
        // canonical and robots checks, so a HEAD probe would only add a round trip.
        const res = await httpGet(t.loc, { redirect: 'manual', retries: 1 });
        const status = res.status;
        const location = res.headers?.location || null;
        checked++;
        if (checked % 500 === 0) console.log(`[parity] ${checked}/${targets.length}`);

        if (status === 0) { defects.push({ ...t, kind: 'UNREACHABLE', status, detail: res.error || 'no response' }); return; }
        if (status >= 500) { defects.push({ ...t, kind: 'SERVER_ERROR', status }); return; }
        if (status === 404 || status === 410) { defects.push({ ...t, kind: 'GONE', status }); return; }
        if (status >= 400) { defects.push({ ...t, kind: 'CLIENT_ERROR', status }); return; }
        if (status >= 300) { defects.push({ ...t, kind: 'REDIRECT', status, location }); return; }
        if (FAIL_ON === 'hard' || !res.body) return;

        // 200: the URL must also be indexable and canonical to ITSELF.
        const facts = extractHtmlFacts(res.body);
        if (/\bnoindex\b/.test(`${facts.robotsMeta || ''}`.toLowerCase())) { defects.push({ ...t, kind: 'NOINDEX', status }); return; }
        if (!facts.canonical) { defects.push({ ...t, kind: 'NO_CANONICAL', status }); return; }
        try {
            const canonical = decodeURIComponent(new URL(facts.canonical, SITE_URL).pathname);
            const self = decodeURIComponent(new URL(t.loc).pathname);
            if (canonical !== self) defects.push({ ...t, kind: 'CROSS_CANONICAL', status, detail: facts.canonical });
        } catch {
            defects.push({ ...t, kind: 'BAD_CANONICAL', status, detail: facts.canonical });
        }
    });

    const byKind = {};
    const bySegment = {};
    for (const d of defects) {
        byKind[d.kind] = (byKind[d.kind] || 0) + 1;
        bySegment[d.segment] = (bySegment[d.segment] || 0) + 1;
    }
    const report = { generatedAt: nowIso(), site: SITE_URL, advertised: targets.length, perSegment, defects: defects.length, byKind, bySegment, examples: defects.slice(0, 40) };
    if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));

    console.log(`\n[parity] ${targets.length} advertised · ${defects.length} defect(s)`);
    if (defects.length) {
        console.log('[parity] by kind:', JSON.stringify(byKind));
        console.log('[parity] by segment:', JSON.stringify(bySegment));
        for (const d of defects.slice(0, 25)) {
            console.log(`  [${d.kind}] ${d.status} ${decodeURI(d.loc)}${d.location ? ` -> ${d.location}` : ''}${d.detail ? ` (${d.detail})` : ''}`);
        }
        process.exit(1);
    }
    console.log('[parity] PASS — every advertised URL is 200, self-canonical and indexable.');
}

main().catch((e) => { console.error('[parity] failed to run:', e.message); process.exit(2); });
