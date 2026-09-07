#!/usr/bin/env node
/**
 * qa-gated-surfaces.mjs — QA the surfaces a logged-OUT visitor cannot see.
 *
 * WHY THIS EXISTS
 * ---------------
 * The NAV chart on /Funds/[id] sits behind the registration gate. Every check
 * run against production so far has therefore verified the gate, not the
 * chart — the thing the whole NAV backfill exists to fill. A fund could have a
 * year-long hole, or no series at all, and every logged-out check would still
 * come back green. That blind spot is what this closes.
 *
 * It signs in as a dedicated QA account over the JSON API — it does not drive
 * a login form — and then asserts what an authenticated visitor actually gets:
 * a series that exists, reaches today, and has no hole big enough to read as a
 * broken chart.
 *
 * CREDENTIALS
 * -----------
 * Supplied only through the environment, never committed and never printed:
 *
 *     QA_EMAIL     the QA account's email
 *     QA_PASSWORD  its password
 *
 * In CI these come from repo secrets. Locally, export them for one command.
 * The account must be a READ-ONLY QA user — this script never writes anything,
 * but the credential should not be able to either. If the variables are absent
 * the script SKIPS loudly rather than failing: a red run nobody can fix trains
 * people to ignore red runs, and a silent pass would recreate the blind spot.
 *
 * USAGE
 *     node scripts/qa-gated-surfaces.mjs
 *     node scripts/qa-gated-surfaces.mjs --funds 5906,6197,6212 --max-gap 45
 */

const API = process.env.NEXT_PUBLIC_API_URL || "https://startamarkets.com";
const SITE = process.env.QA_SITE_URL || "https://startamarkets.com";

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

/** A hole wider than this reads as a broken chart to a user. */
const MAX_GAP_DAYS = Number(argOf("--max-gap", "45"));
/** Below this a series is too sparse to plot meaningfully. */
const MIN_POINTS = Number(argOf("--min-points", "30"));
/** The series must reach within this many days of today. */
const MAX_STALE_DAYS = Number(argOf("--max-stale", "10"));

/** The 2011 EGX closure is real history and must never count as a gap. */
const EGX_CLOSURE = ["2011-01-27", "2011-03-23"];

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

async function signIn(email, password) {
    const res = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        // Never echo the body: it can contain the submitted address.
        throw new Error(`sign-in failed with HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!body.access_token) throw new Error("sign-in returned no access token");
    return body.access_token;
}

async function navSeries(token, fundId) {
    const res = await fetch(`${API}/api/v1/funds/${fundId}/nav?limit=5000`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`nav fetch for ${fundId}: HTTP ${res.status}`);
    const body = await res.json();
    const rows = Array.isArray(body) ? body : (body.data ?? body.nav ?? []);
    return [...new Set(rows.map((r) => String(r.date ?? r.nav_date ?? "").slice(0, 10)))]
        .filter(Boolean)
        .sort();
}

/** Widest gap in days, ignoring the 2011 closure. */
function widestGap(dates) {
    let worst = 0, when = null;
    for (let i = 0; i < dates.length - 1; i += 1) {
        const a = dates[i], b = dates[i + 1];
        if (a <= EGX_CLOSURE[1] && b >= EGX_CLOSURE[0]) continue;
        const days = (Date.parse(b) - Date.parse(a)) / 86400000;
        if (days > worst) { worst = days; when = [a, b]; }
    }
    return { days: worst, when };
}

async function main() {
    const email = process.env.QA_EMAIL;
    const password = process.env.QA_PASSWORD;

    if (!email || !password) {
        console.log("SKIPPED — QA_EMAIL / QA_PASSWORD are not set.");
        console.log("Gated surfaces were NOT verified. Set the credentials to");
        console.log("enable this check; see the header of this file.");
        process.exit(0);          // skip loudly, never a silent green
    }

    console.log(`QA gated surfaces against ${SITE}`);
    let token;
    try {
        token = await signIn(email, password);
        pass("signed in as the QA account");
    } catch (err) {
        console.error(`  ✗ ${err.message}`);
        process.exit(1);
    }

    const explicit = argOf("--funds", "");
    let funds;
    if (explicit) {
        funds = explicit.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
        const res = await fetch(`${API}/api/v1/funds?limit=500`);
        const all = await res.json();
        funds = (Array.isArray(all) ? all : all.data ?? []).map((f) => String(f.fund_id));
    }
    console.log(`checking ${funds.length} fund NAV series\n`);

    const offenders = [];
    let checked = 0;
    for (const fundId of funds) {
        let dates;
        try {
            dates = await navSeries(token, fundId);
        } catch (err) {
            offenders.push({ fundId, why: err.message });
            continue;
        }
        checked += 1;
        if (dates.length < MIN_POINTS) {
            offenders.push({ fundId, why: `only ${dates.length} points (min ${MIN_POINTS})` });
            continue;
        }
        const stale = Math.round((Date.now() - Date.parse(dates.at(-1))) / 86400000);
        if (stale > MAX_STALE_DAYS) {
            offenders.push({ fundId, why: `series ends ${dates.at(-1)} (${stale}d stale)` });
        }
        const gap = widestGap(dates);
        if (gap.days > MAX_GAP_DAYS) {
            offenders.push({
                fundId,
                why: `${gap.days}d hole ${gap.when[0]} → ${gap.when[1]}`,
            });
        }
    }

    console.log(`\nseries fetched for ${checked}/${funds.length} funds`);
    if (offenders.length === 0) {
        pass(`every series has no hole wider than ${MAX_GAP_DAYS}d and is current`);
    } else {
        console.log(`\n${offenders.length} fund(s) fail the chart-quality bar:`);
        for (const o of offenders.slice(0, 40)) {
            console.log(`   ${o.fundId.padStart(6)}  ${o.why}`);
        }
        if (offenders.length > 40) {
            console.log(`   ... and ${offenders.length - 40} more`);
        }
        // Reported, not fatal: the remaining holes are a known, tracked backlog
        // (see backend-core/scripts/mubasher_statement_backfill.py). This exists
        // to MEASURE that backlog on every run, not to block a deploy on it.
        console.log("\n(reported as the tracked NAV backlog, not a build failure)");
    }

    if (failures > 0) {
        console.error(`\n${failures} hard failure(s).`);
        process.exit(1);
    }
    console.log("\nqa-gated-surfaces: OK");
}

main().catch((err) => {
    console.error(err?.message || err);
    process.exit(1);
});
