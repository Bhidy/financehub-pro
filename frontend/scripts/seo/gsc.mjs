/**
 * GOOGLE SEARCH CONSOLE INTELLIGENCE.
 *
 * Pulls real Search Analytics data and turns it into the decisions a search
 * team would make: what gained, what lost, what is one push from page one,
 * what is being under-clicked for its position, what is cannibalising itself,
 * and what is decaying.
 *
 * HONESTY CONTRACT — the single most important property of this file:
 * if no credential is configured, or the API errors, this returns
 * { configured: false, ... } / { error } and the report says so. It NEVER
 * synthesises, estimates or back-fills a metric. A fabricated impressions
 * number would be worse than no number, because it would be acted on.
 *
 * AUTH: a Google Cloud service account with the Search Console API enabled,
 * added as a user on the property. Supply the JSON key as the environment
 * variable GSC_SERVICE_ACCOUNT_JSON (raw JSON or base64). Zero npm
 * dependencies — the JWT is signed with node:crypto.
 *
 *   node scripts/seo/gsc.mjs --days 28 --out gsc.json
 */

import { createSign } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { SITE_URL } from './lib.mjs';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** URL-prefix property (matches how the property was verified). */
const PROPERTY = process.env.GSC_PROPERTY || `${SITE_URL}/`;

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function loadCredentials() {
    const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
    if (!raw || !raw.trim()) return null;
    const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    try {
        const json = JSON.parse(text);
        if (!json.client_email || !json.private_key) return null;
        return json;
    } catch {
        return null;
    }
}

async function getAccessToken(creds) {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(
        JSON.stringify({ iss: creds.client_email, scope: SCOPE, aud: TOKEN_URL, exp: now + 3600, iat: now })
    );
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claims}`);
    const signature = b64url(signer.sign(creds.private_key));
    const assertion = `${header}.${claims}.${signature}`;

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
        throw new Error(`token exchange failed (${res.status}): ${body.error_description || body.error || 'unknown'}`);
    }
    return body.access_token;
}

const dayStr = (d) => new Date(d).toISOString().slice(0, 10);

async function queryAnalytics(token, { startDate, endDate, dimensions, rowLimit = 5000 }) {
    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(PROPERTY)}/searchAnalytics/query`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, dimensions, rowLimit, dataState: 'final' }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(`searchAnalytics ${dimensions.join('+')} failed (${res.status}): ${body?.error?.message || 'unknown'}`);
    }
    return body.rows || [];
}

/**
 * Expected CTR by position. Used ONLY to flag pages that under-perform their
 * own rank — never presented as a forecast. Values are a conservative,
 * widely-observed shape, not a claim about this site's data.
 */
const EXPECTED_CTR = [0, 0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.018];
const expectedCtrFor = (pos) => EXPECTED_CTR[Math.min(Math.max(Math.round(pos), 1), 10)] ?? 0.015;

export async function collectGsc({ days = 28 } = {}) {
    const creds = loadCredentials();
    if (!creds) {
        return {
            configured: false,
            reason:
                'GSC_SERVICE_ACCOUNT_JSON is not set. Search-performance intelligence is unavailable — no metrics are estimated in its place.',
        };
    }

    // GSC finalises data on a ~2-day lag; querying up to today returns partial
    // rows that would look like a traffic drop.
    const end = new Date(Date.now() - 2 * 86400000);
    const start = new Date(end.getTime() - days * 86400000);
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - days * 86400000);

    try {
        const token = await getAccessToken(creds);
        const [queriesNow, queriesPrev, pagesNow, pagesPrev, queryPage] = await Promise.all([
            queryAnalytics(token, { startDate: dayStr(start), endDate: dayStr(end), dimensions: ['query'] }),
            queryAnalytics(token, { startDate: dayStr(prevStart), endDate: dayStr(prevEnd), dimensions: ['query'] }),
            queryAnalytics(token, { startDate: dayStr(start), endDate: dayStr(end), dimensions: ['page'] }),
            queryAnalytics(token, { startDate: dayStr(prevStart), endDate: dayStr(prevEnd), dimensions: ['page'] }),
            queryAnalytics(token, { startDate: dayStr(start), endDate: dayStr(end), dimensions: ['query', 'page'] }),
        ]);

        const totals = (rows) =>
            rows.reduce(
                (a, r) => ({
                    clicks: a.clicks + (r.clicks || 0),
                    impressions: a.impressions + (r.impressions || 0),
                }),
                { clicks: 0, impressions: 0 }
            );
        // Totals come from the PAGE dimension. The query dimension omits the
        // queries Google anonymises — for a long-tail site that is most of
        // them: the first live run summed 9 clicks / 1,802 impressions from
        // query rows while Search Console showed 299 / 104K for the same 28
        // days. Page rows carry every click. Query rows still drive the
        // striking-distance, CTR-gap and cannibalisation tables below.
        const tNow = totals(pagesNow);
        const tPrev = totals(pagesPrev);
        const tQueriesNow = totals(queriesNow);

        const index = (rows) => new Map(rows.map((r) => [r.keys[0], r]));
        const prevQ = index(queriesPrev);
        const prevP = index(pagesPrev);

        const delta = (rows, prev, minImpressions) =>
            rows
                .filter((r) => (r.impressions || 0) >= minImpressions)
                .map((r) => {
                    const p = prev.get(r.keys[0]);
                    return {
                        key: r.keys[0],
                        clicks: r.clicks || 0,
                        clicksPrev: p?.clicks || 0,
                        clicksDelta: (r.clicks || 0) - (p?.clicks || 0),
                        impressions: r.impressions || 0,
                        position: r.position ?? null,
                        positionPrev: p?.position ?? null,
                        // Positive = improved (a LOWER position number is better).
                        positionDelta: p?.position != null && r.position != null ? p.position - r.position : null,
                        ctr: r.ctr ?? null,
                    };
                });

        const qDelta = delta(queriesNow, prevQ, 20);
        const pDelta = delta(pagesNow, prevP, 20);

        // Striking distance: ranking but not yet earning clicks.
        const strikingDistance = queriesNow
            .filter((r) => r.position >= 4 && r.position <= 20 && (r.impressions || 0) >= 50)
            .sort((a, b) => b.impressions - a.impressions)
            .slice(0, 25)
            .map((r) => ({
                query: r.keys[0],
                position: Number(r.position.toFixed(1)),
                impressions: r.impressions,
                clicks: r.clicks,
                band: r.position <= 10 ? 'page-1 (4-10)' : 'page-2 (11-20)',
            }));

        // CTR gap: ranks well, under-clicked for that rank. Almost always a
        // title/description problem, which is cheap to fix.
        const ctrOpportunities = queriesNow
            .filter((r) => r.position <= 10 && (r.impressions || 0) >= 100)
            .map((r) => {
                const expected = expectedCtrFor(r.position);
                return {
                    query: r.keys[0],
                    position: Number(r.position.toFixed(1)),
                    impressions: r.impressions,
                    ctr: Number((r.ctr * 100).toFixed(2)),
                    expectedCtr: Number((expected * 100).toFixed(2)),
                    missedClicksEstimate: Math.round((expected - r.ctr) * r.impressions),
                };
            })
            .filter((r) => r.missedClicksEstimate > 5)
            .sort((a, b) => b.missedClicksEstimate - a.missedClicksEstimate)
            .slice(0, 20);

        // Cannibalisation: one query, several of our own URLs competing.
        const byQuery = new Map();
        for (const r of queryPage) {
            const [q, page] = r.keys;
            if (!byQuery.has(q)) byQuery.set(q, []);
            byQuery.get(q).push({ page, clicks: r.clicks || 0, impressions: r.impressions || 0, position: r.position });
        }
        const cannibalization = [...byQuery.entries()]
            .map(([query, rows]) => ({
                query,
                urls: rows.filter((x) => x.impressions >= 30).sort((a, b) => a.position - b.position),
            }))
            .filter((x) => x.urls.length > 1)
            .sort((a, b) => b.urls.reduce((s, u) => s + u.impressions, 0) - a.urls.reduce((s, u) => s + u.impressions, 0))
            .slice(0, 15);

        const sortDesc = (arr, k) => arr.slice().sort((a, b) => (b[k] ?? 0) - (a[k] ?? 0));
        const sortAsc = (arr, k) => arr.slice().sort((a, b) => (a[k] ?? 0) - (b[k] ?? 0));

        return {
            configured: true,
            property: PROPERTY,
            window: { start: dayStr(start), end: dayStr(end), days },
            previousWindow: { start: dayStr(prevStart), end: dayStr(prevEnd) },
            totals: {
                clicks: tNow.clicks,
                impressions: tNow.impressions,
                ctr: tNow.impressions ? Number(((tNow.clicks / tNow.impressions) * 100).toFixed(2)) : 0,
                clicksPrev: tPrev.clicks,
                impressionsPrev: tPrev.impressions,
                clicksChangePct: tPrev.clicks ? Number((((tNow.clicks - tPrev.clicks) / tPrev.clicks) * 100).toFixed(1)) : null,
            },
            queryWinners: sortDesc(qDelta, 'clicksDelta').slice(0, 15),
            queryLosers: sortAsc(qDelta, 'clicksDelta').slice(0, 15),
            pageWinners: sortDesc(pDelta, 'clicksDelta').slice(0, 15),
            // Content decay: pages that used to earn clicks and now earn fewer.
            contentDecay: sortAsc(pDelta.filter((p) => p.clicksPrev >= 10), 'clicksDelta').slice(0, 15),
            strikingDistance,
            ctrOpportunities,
            cannibalization,
        };
    } catch (e) {
        return { configured: true, error: String(e.message) };
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const args = process.argv.slice(2);
    const val = (n, d) => {
        const i = args.indexOf(`--${n}`);
        return i === -1 ? d : args[i + 1];
    };
    collectGsc({ days: Number(val('days', 28)) }).then((r) => {
        const out = val('out', null);
        if (out) writeFileSync(out, JSON.stringify(r, null, 2));
        if (!r.configured) console.log(`[gsc] SKIPPED — ${r.reason}`);
        else if (r.error) console.error(`[gsc] ERROR — ${r.error}`);
        else
            console.log(
                `[gsc] ${r.totals.clicks} clicks / ${r.totals.impressions} impressions over ${r.window.days}d;  — ${tQueriesNow.clicks} of those clicks sit on visible (non-anonymised) queries` +
                    `${r.strikingDistance.length} striking-distance queries, ${r.ctrOpportunities.length} CTR gaps, ${r.cannibalization.length} cannibalisations`
            );
    });
}
