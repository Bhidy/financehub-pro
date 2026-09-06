/**
 * INDEX COVERAGE — what Google actually did with our URLs, measured per URL.
 *
 *   node scripts/seo/inspect.mjs --per-segment 12 --out inspect.json
 *   node scripts/seo/inspect.mjs --urls "/ar/Funds,/Funds/fees"
 *
 * THE GAP THIS CLOSES. Until now the only evidence of an indexing problem was
 * the owner opening Search Console and reading a chart — which is how
 * "Datasets: invalid creator" and "Not found (404)" arrived as email surprises
 * on 2026-09-06, long after the cause shipped. Search Analytics (gsc.mjs)
 * reports clicks and positions; it says NOTHING about whether a URL is indexed.
 *
 * The URL Inspection API does, and nothing in this repo was using it. For any
 * URL on the property it returns Google's own verdict:
 *
 *   · coverageState  — "Submitted and indexed" / "Crawled - currently not
 *                      indexed" / "Discovered - currently not indexed" / …
 *                      the exact vocabulary of the Page Indexing report
 *   · googleCanonical vs userCanonical — canonical disagreements, which is the
 *                      "Duplicate, Google chose different canonical" bucket
 *   · robotsTxtState, indexingState, pageFetchState, lastCrawlTime
 *   · richResultsResult — per-item structured-data issues, i.e. the Dataset
 *                      errors, detectable here BEFORE Google emails about them
 *
 * SAMPLING, HONESTLY. The quota is 2,000 URLs/day and the site advertises
 * ~9,200, so this samples each sitemap segment on a deterministic even stride:
 * the same URLs every run, so a change between two runs is a real change and
 * not resampling noise. Per-segment coverage rates are the KPI; the absolute
 * count of indexed pages is Search Console's job, not this script's.
 *
 * HONESTY CONTRACT (shared with gsc.mjs): with no credential this reports
 * `configured: false` and a reason. It never estimates, never infers indexing
 * from a 200, and never fabricates a coverage state.
 */

import { createSign } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { SITE_URL, httpGet, parseLocs, nowIso, sleep } from './lib.mjs';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
const PROPERTY = process.env.GSC_PROPERTY || `${SITE_URL}/`;

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1]; };
const PER_SEGMENT = Number(flag('per-segment', 12));
const OUT = flag('out', null);
const EXPLICIT = (flag('urls', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
/** Well under the documented 600/min ceiling; this is a background job. */
const DELAY_MS = Number(flag('delay', 250));

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function loadCredentials() {
    const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
    if (!raw || !raw.trim()) return null;
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    try {
        const json = JSON.parse(text);
        return json.client_email && json.private_key ? json : null;
    } catch { return null; }
}

async function getAccessToken(creds) {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({ iss: creds.client_email, scope: SCOPE, aud: TOKEN_URL, exp: now + 3600, iat: now }));
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claims}`);
    const assertion = `${header}.${claims}.${b64url(signer.sign(creds.private_key))}`;
    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) throw new Error(`token exchange failed (${res.status}): ${body.error_description || body.error || 'unknown'}`);
    return body.access_token;
}

/** Deterministic even stride — the same URLs every run. */
function stride(arr, n) {
    if (!n || arr.length <= n) return arr;
    const step = arr.length / n;
    return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

async function collectTargets() {
    if (EXPLICIT.length) return EXPLICIT.map((p) => ({ segment: 'explicit', loc: p.startsWith('http') ? p : SITE_URL + p }));
    const idx = await httpGet(`${SITE_URL}/sitemap.xml`, { retries: 2 });
    if (idx.status !== 200) throw new Error(`sitemap index returned ${idx.status}`);
    const targets = [];
    for (const segUrl of parseLocs(idx.body)) {
        const name = segUrl.split('/').pop().replace('.xml', '');
        const res = await httpGet(segUrl, { retries: 2 });
        if (res.status !== 200) continue;
        for (const loc of stride(parseLocs(res.body), PER_SEGMENT)) targets.push({ segment: name, loc });
    }
    return targets;
}

async function inspectOne(token, loc) {
    const res = await fetch(INSPECT_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: loc, siteUrl: PROPERTY, languageCode: 'en-US' }),
    });
    if (res.status === 429) return { error: 'quota', status: 429 };
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: body?.error?.message || `http ${res.status}`, status: res.status };
    const r = body.inspectionResult || {};
    const idx = r.indexStatusResult || {};
    const rich = r.richResultsResult || {};
    return {
        verdict: idx.verdict ?? null,
        coverageState: idx.coverageState ?? null,
        robotsTxtState: idx.robotsTxtState ?? null,
        indexingState: idx.indexingState ?? null,
        pageFetchState: idx.pageFetchState ?? null,
        lastCrawlTime: idx.lastCrawlTime ?? null,
        googleCanonical: idx.googleCanonical ?? null,
        userCanonical: idx.userCanonical ?? null,
        sitemaps: idx.sitemap ?? [],
        referringUrls: (idx.referringUrls ?? []).length,
        richVerdict: rich.verdict ?? null,
        richIssues: (rich.detectedItems ?? []).flatMap((d) =>
            (d.items ?? []).flatMap((it) => (it.issues ?? []).map((i) => `${d.richResultType}: ${i.issueMessage} (${i.severity})`))
        ),
    };
}

async function main() {
    const creds = loadCredentials();
    if (!creds) {
        const report = { generatedAt: nowIso(), configured: false, reason: 'GSC_SERVICE_ACCOUNT_JSON is not set', property: PROPERTY };
        if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
        console.log('[inspect] unmeasured — GSC_SERVICE_ACCOUNT_JSON is not set. No indexing state is inferred.');
        return;
    }

    const token = await getAccessToken(creds);
    const targets = await collectTargets();
    console.log(`[inspect] inspecting ${targets.length} URL(s) against ${PROPERTY}`);

    const results = [];
    let quotaHit = false;
    for (const [i, t] of targets.entries()) {
        if (quotaHit) break;
        const r = await inspectOne(token, t.loc);
        if (r.error === 'quota') { quotaHit = true; console.log('[inspect] daily quota reached — stopping early, partial result is still reported'); break; }
        results.push({ ...t, ...r });
        if ((i + 1) % 25 === 0) console.log(`[inspect] ${i + 1}/${targets.length}`);
        await sleep(DELAY_MS);
    }

    // Per-segment coverage: the KPI. "indexed" is Google's own word, not ours.
    const bySegment = {};
    const coverageTally = {};
    const canonicalMismatch = [];
    const richIssues = [];
    for (const r of results) {
        bySegment[r.segment] ??= { inspected: 0, indexed: 0, states: {} };
        const s = bySegment[r.segment];
        s.inspected++;
        const state = r.coverageState || 'unknown';
        s.states[state] = (s.states[state] || 0) + 1;
        coverageTally[state] = (coverageTally[state] || 0) + 1;
        if (/submitted and indexed|indexed, not submitted/i.test(state)) s.indexed++;
        if (r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical) {
            canonicalMismatch.push({ url: r.loc, google: r.googleCanonical, user: r.userCanonical });
        }
        if (r.richIssues?.length) richIssues.push({ url: r.loc, issues: r.richIssues });
    }
    for (const s of Object.values(bySegment)) s.coverageRate = s.inspected ? Number(((s.indexed / s.inspected) * 100).toFixed(1)) : null;

    const report = {
        generatedAt: nowIso(), configured: true, property: PROPERTY,
        inspected: results.length, quotaHit,
        coverageTally, bySegment,
        canonicalMismatch: canonicalMismatch.slice(0, 50),
        richIssues: richIssues.slice(0, 50),
        results,
    };
    if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));

    console.log(`\n[inspect] ${results.length} URL(s) inspected`);
    console.log('SEGMENT           inspected  indexed  coverage');
    for (const [seg, s] of Object.entries(bySegment).sort((a, b) => (a[1].coverageRate ?? 0) - (b[1].coverageRate ?? 0))) {
        console.log(`${seg.padEnd(17)} ${String(s.inspected).padStart(9)}  ${String(s.indexed).padStart(7)}  ${String(s.coverageRate ?? '—').padStart(7)}%`);
    }
    console.log('\nCOVERAGE STATES:');
    for (const [state, n] of Object.entries(coverageTally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${state}`);
    if (canonicalMismatch.length) {
        console.log(`\nCANONICAL DISAGREEMENTS (${canonicalMismatch.length}) — Google chose a different canonical:`);
        for (const c of canonicalMismatch.slice(0, 10)) console.log(`  ${c.user}\n      -> google: ${c.google}`);
    }
    if (richIssues.length) {
        console.log(`\nSTRUCTURED-DATA ISSUES (${richIssues.length}):`);
        for (const r of richIssues.slice(0, 10)) console.log(`  ${r.url}\n      ${r.issues.join('\n      ')}`);
    }
}

main().catch((e) => { console.error('[inspect] failed:', e.message); process.exit(1); });
