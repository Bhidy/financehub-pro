#!/usr/bin/env node
/**
 * Post-deploy health gate — asserts the LIVE site is healthy and serving the
 * intended build, so a stalled/failed/partial deploy fails loudly instead of
 * silently serving stale HTML. Replaces blind curl-polling.
 *
 * Usage:
 *   node scripts/verify-deploy.mjs [baseUrl] [expectedCommit]
 *   baseUrl        defaults to https://startamarkets.com
 *   expectedCommit optional 7-40 char sha; if given, /api/version must match
 *
 * Exit codes: 0 = all checks pass · 1 = a check failed (never a false green).
 */

const BASE = (process.argv[2] || 'https://startamarkets.com').replace(/\/$/, '');
const EXPECT_COMMIT = (process.argv[3] || process.env.EXPECT_COMMIT || '').trim();

/** A check that must hold on the live site. `mustHave`/`mustNotHave` are substrings of the HTML. */
const ROUTES = [
    { path: '/', mustHave: ['STARTA'] },
    { path: '/Funds', mustHave: [] },
    // The fund page is the crown jewel — it must render the PREMIUM design,
    // never regress to the old plain server page.
    {
        path: '/Funds/2734-pharos-investment-fund-1',
        mustHave: ['fund-premium', 'section-tag'],
        mustNotHave: [],
    },
    { path: '/News', mustHave: [] },
    { path: '/Learn', mustHave: [] },
];

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;

async function fetchText(url) {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'starta-deploy-verify' } });
    const body = await res.text();
    return { status: res.status, body };
}

async function main() {
    const failures = [];
    console.log(`\nVerifying deploy at ${BASE}\n`);

    // 1) Commit pin (optional but strongest signal).
    if (EXPECT_COMMIT) {
        try {
            const { status, body } = await fetchText(`${BASE}/api/version?cb=${Date.now()}`);
            const live = status === 200 ? (JSON.parse(body).commit || '') : '';
            const ok = live.startsWith(EXPECT_COMMIT) || EXPECT_COMMIT.startsWith(live);
            console.log(`${ok ? GREEN('✓') : RED('✗')} /api/version commit=${live.slice(0, 12) || 'n/a'} (want ${EXPECT_COMMIT.slice(0, 12)})`);
            if (!ok) failures.push(`live commit ${live.slice(0, 12)} != expected ${EXPECT_COMMIT.slice(0, 12)}`);
        } catch (e) {
            failures.push(`/api/version unreachable: ${e.message}`);
            console.log(RED(`✗ /api/version unreachable: ${e.message}`));
        }
    }

    // 2) Route health + content markers.
    for (const r of ROUTES) {
        try {
            const { status, body } = await fetchText(`${BASE}${r.path}?cb=${Date.now()}`);
            const problems = [];
            if (status !== 200) problems.push(`status ${status}`);
            for (const m of r.mustHave ?? []) if (!body.includes(m)) problems.push(`missing "${m}"`);
            for (const m of r.mustNotHave ?? []) if (body.includes(m)) problems.push(`unexpected "${m}"`);
            if (problems.length) {
                failures.push(`${r.path}: ${problems.join(', ')}`);
                console.log(RED(`✗ ${r.path} — ${problems.join(', ')}`));
            } else {
                console.log(GREEN(`✓ ${r.path}`));
            }
        } catch (e) {
            failures.push(`${r.path}: ${e.message}`);
            console.log(RED(`✗ ${r.path} — ${e.message}`));
        }
    }

    console.log('');
    if (failures.length) {
        console.error(RED(`DEPLOY VERIFICATION FAILED (${failures.length}):`));
        for (const f of failures) console.error(`  - ${f}`);
        process.exit(1);
    }
    console.log(GREEN('DEPLOY VERIFICATION PASSED — all routes healthy, premium fund page live.\n'));
}

main().catch((e) => {
    console.error(RED(`verify-deploy crashed: ${e.stack || e}`));
    process.exit(1);
});
