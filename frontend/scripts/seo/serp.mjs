#!/usr/bin/env node
/**
 * SERP RANK TRACKING — provider abstraction and configuration boundary.
 *
 *     node scripts/seo/serp.mjs [--out f.json] [--queries file.json]
 *
 * READ THIS BEFORE ADDING A PROVIDER.
 *
 * Search Console reports OUR positions; it cannot report a competitor's, and no
 * public API does. The only lawful ways to get competitor rankings are licensed
 * SERP-data providers. Scraping Google directly violates its terms, gets the
 * origin IP blocked, and would poison the very data it collects — so it is not
 * implemented here and must not be added.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: with no credential configured, this
 * script reports `configured: false` and returns NO RANKINGS. It never
 * estimates, never interpolates from impressions, and never emits a placeholder
 * number that a dashboard could render as fact. A missing measurement and a
 * measured zero are different statements, and a search programme that blurs
 * them makes every later decision unfalsifiable.
 *
 * TO ENABLE, set both:
 *   SERP_PROVIDER   one of: dataforseo | serpapi
 *   SERP_API_KEY    that provider's key. DataForSEO expects "login:password"
 *                   (the pair it issues), SerpApi expects the raw api_key.
 * Optional:
 *   SERP_LOCATION   default 'Egypt'
 *   SERP_LANGUAGE   default 'ar'
 *   SERP_DEVICE     desktop | mobile   (default 'desktop')
 *
 * The query set is the Arabic-first cluster this site actually contests. It is
 * data, not code — override with --queries pointing at a JSON array.
 */
import { writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, nowIso, sleep } from './lib.mjs';

const arg = (name, dflt = null) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};

const OUT = arg('out');
const PROVIDER = process.env.SERP_PROVIDER || null;
const API_KEY = process.env.SERP_API_KEY || null;
const LOCATION = process.env.SERP_LOCATION || 'Egypt';
const LANGUAGE = process.env.SERP_LANGUAGE || 'ar';
const DEVICE = process.env.SERP_DEVICE || 'desktop';

/** Domains we track alongside our own. Competitors first, then the incumbents
 *  that hold the head terms — see the "why we're not ranking" forensics: the
 *  bare head term is held by the regulator and the banks, so a report that only
 *  watched snduk would misread those SERPs entirely. */
const TRACKED = [
    'startamarkets.com',
    'snduk.com',
    'egxbot.com',
    'mubasher.info',
    'investing.com',
    'tradingview.com',
];

/**
 * The query set IS the search-intent map (content/search-intent-map.json):
 * one cluster, one canonical URL per language. This file no longer carries a
 * list of its own, so the tracked queries cannot drift from the pages built
 * to answer them; scripts/test-intent-map.mjs gates the map on every build.
 */
const INTENT_MAP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'content', 'search-intent-map.json');
function defaultQueries() {
    const map = JSON.parse(readFileSync(INTENT_MAP, 'utf8'));
    return map.clusters.flatMap((c) => [
        { q: c.ar, intent: c.id, lang: 'ar', target: c.targetAr, priority: c.priority },
        { q: c.en, intent: c.id, lang: 'en', target: c.targetEn, priority: c.priority },
    ]);
}

/* ────────────────────────── providers ──────────────────────────
 * Each returns a normalised array: [{ position, url, domain, title }].
 * Adding one means implementing exactly this shape — nothing downstream
 * knows which provider produced a row.
 */

async function fetchDataForSeo(query) {
    const auth = Buffer.from(API_KEY).toString('base64');
    const res = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
        method: 'POST',
        headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
        body: JSON.stringify([
            { keyword: query.q, location_name: LOCATION, language_code: query.lang || LANGUAGE, device: DEVICE, depth: 100 },
        ]),
    });
    if (!res.ok) throw new Error(`dataforseo ${res.status}`);
    const json = await res.json();
    const items = json?.tasks?.[0]?.result?.[0]?.items ?? [];
    return items
        .filter((i) => i.type === 'organic' && i.url)
        .map((i) => ({ position: i.rank_absolute, url: i.url, domain: i.domain, title: i.title }));
}

async function fetchSerpApi(query) {
    const u = new URL('https://serpapi.com/search.json');
    u.searchParams.set('engine', 'google');
    u.searchParams.set('q', query.q);
    u.searchParams.set('location', LOCATION);
    u.searchParams.set('hl', query.lang || LANGUAGE);
    u.searchParams.set('gl', 'eg');
    u.searchParams.set('num', '100');
    u.searchParams.set('device', DEVICE);
    u.searchParams.set('api_key', API_KEY);
    const res = await fetch(u);
    if (!res.ok) throw new Error(`serpapi ${res.status}`);
    const json = await res.json();
    return (json.organic_results ?? [])
        .filter((r) => r.link)
        .map((r) => ({ position: r.position, url: r.link, domain: new URL(r.link).hostname.replace(/^www\./, ''), title: r.title }));
}

const PROVIDERS = { dataforseo: fetchDataForSeo, serpapi: fetchSerpApi };

async function main() {
    const queries = (() => {
        const f = arg('queries');
        if (!f) return defaultQueries();
        try {
            return JSON.parse(readFileSync(f, 'utf8'));
        } catch (e) {
            console.error(`[serp] cannot read --queries ${f}: ${e.message}`);
            process.exit(1);
        }
    })();

    if (!PROVIDER || !API_KEY) {
        // The honest empty state. Exit 0: an unconfigured integration is not a
        // failure of the site, and failing here would make the daily job red
        // for a reason no engineer can fix without a purchasing decision.
        const report = {
            generatedAt: nowIso(),
            configured: false,
            reason: !PROVIDER
                ? 'SERP_PROVIDER is not set'
                : 'SERP_API_KEY is not set',
            providersSupported: Object.keys(PROVIDERS),
            queriesReady: queries.length,
            trackedDomains: TRACKED,
            rankings: [],
            note: 'No rankings are reported without a licensed provider. Competitor positions are not available from Search Console and are never estimated here.',
        };
        console.log('[serp] NOT CONFIGURED — no rankings reported (this is the correct behaviour, not a failure).');
        console.log(`[serp] set SERP_PROVIDER (${Object.keys(PROVIDERS).join('|')}) and SERP_API_KEY to enable.`);
        console.log(`[serp] ${queries.length} queries and ${TRACKED.length} tracked domains are configured and ready.`);
        if (OUT) writeFileSync(OUT, JSON.stringify(report, null, 2));
        return;
    }

    const fetchFn = PROVIDERS[PROVIDER];
    if (!fetchFn) {
        console.error(`[serp] unknown SERP_PROVIDER "${PROVIDER}" — supported: ${Object.keys(PROVIDERS).join(', ')}`);
        process.exit(1);
    }

    const rankings = [];
    const errors = [];
    for (const query of queries) {
        try {
            const results = await fetchFn(query);
            const row = { query: query.q, intent: query.intent, lang: query.lang, device: DEVICE, positions: {} };
            for (const domain of TRACKED) {
                const hit = results.find((r) => r.domain === domain || r.domain?.endsWith(`.${domain}`));
                // null = "not in the top 100", which is a measurement. It is
                // deliberately not 101 or 0: both would average into nonsense.
                row.positions[domain] = hit ? { position: hit.position, url: hit.url } : null;
            }
            rankings.push(row);
            const ours = row.positions[new URL(SITE_URL).hostname.replace(/^www\./, '')];
            const theirs = row.positions['snduk.com'];
            console.log(
                `  ${String(ours?.position ?? '—').padStart(3)} vs ${String(theirs?.position ?? '—').padStart(3)}  ${query.q}`
            );
            await sleep(1200); // be a good client of a paid API
        } catch (e) {
            errors.push({ query: query.q, error: e.message });
            console.error(`  ERR  ${query.q}: ${e.message}`);
        }
    }

    const report = {
        generatedAt: nowIso(),
        configured: true,
        provider: PROVIDER,
        location: LOCATION,
        device: DEVICE,
        trackedDomains: TRACKED,
        rankings,
        errors,
    };
    if (OUT) {
        writeFileSync(OUT, JSON.stringify(report, null, 2));
        console.log(`[serp] wrote ${OUT}`);
    }
}

main().catch((e) => {
    console.error('[serp] fatal:', e.message);
    process.exit(1);
});
