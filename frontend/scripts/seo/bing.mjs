#!/usr/bin/env node
/**
 * BING SEARCH + AI-CITATION INTELLIGENCE.
 *
 *     node scripts/seo/bing.mjs [--days 30] [--out f.json]
 *     node scripts/seo/bing.mjs --import-ai path/to/ai-performance.csv
 *
 * TWO DATA SOURCES, DELIBERATELY SEPARATED, because their availability differs
 * and pretending otherwise is how a dashboard starts showing invented numbers.
 *
 * 1. SEARCH PERFORMANCE — a real, documented, keyed HTTP API.
 *    Bing Webmaster Tools exposes GetRankAndTrafficStats, GetQueryStats and
 *    GetPageStats at ssl.bing.com/webmaster/api.svc/json/. Set
 *    BING_WEBMASTER_API_KEY (Webmaster Tools → Settings → API access) and this
 *    pulls them directly.
 *
 * 2. AI CITATIONS (Copilot / AI answers) — NO PUBLIC API EXISTS.
 *    Verified 2026-09-04: Bing's AI Performance report — total citations, cited
 *    pages, grounding queries, citation share, grounding-query→page mapping —
 *    ships in the Webmaster Tools DASHBOARD only. Microsoft documents no
 *    endpoint for it. So this script does NOT invent one and does NOT scrape
 *    the dashboard. It ingests the CSV the dashboard exports, normalises it
 *    into the same shape the rest of the SEO system consumes, and records the
 *    export date so nobody mistakes a three-week-old import for live data.
 *
 *    If Microsoft later documents an endpoint, implement it as fetchAiCitations()
 *    below; nothing downstream needs to change.
 *
 * The honesty rule from serp.mjs applies identically: with no credential and no
 * import, this reports `configured: false` and returns NOTHING. It never
 * estimates a citation count.
 */
import { writeFileSync, readFileSync, statSync } from 'node:fs';
import { SITE_URL, nowIso } from './lib.mjs';

const arg = (name, dflt = null) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};

const OUT = arg('out');
const DAYS = Number(arg('days', '30'));
const IMPORT_AI = arg('import-ai');
const API_KEY = process.env.BING_WEBMASTER_API_KEY || null;
const SITE = process.env.BING_SITE_URL || SITE_URL;

const API = 'https://ssl.bing.com/webmaster/api.svc/json';

async function bingGet(method, extra = {}) {
    const u = new URL(`${API}/${method}`);
    u.searchParams.set('apikey', API_KEY);
    u.searchParams.set('siteUrl', SITE);
    for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
    const res = await fetch(u, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${method} ${res.status}`);
    const json = await res.json();
    return json.d ?? json;
}

/** Bing serialises dates as /Date(ms)/. */
const bingDate = (v) => {
    const m = /\/Date\((\d+)/.exec(String(v ?? ''));
    return m ? new Date(Number(m[1])).toISOString().slice(0, 10) : null;
};

/**
 * PLACEHOLDER BY DESIGN — not a stub that returns fake data.
 *
 * There is no documented Bing endpoint for AI-citation data. This function
 * exists so the integration point is obvious the day one is published; until
 * then it returns null and the caller falls back to the CSV import.
 */
async function fetchAiCitations() {
    return null;
}

/** Minimal RFC-4180 CSV parser: the export contains quoted queries with commas. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') { cell += '"'; i++; }
                else quoted = false;
            } else cell += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
        else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

/**
 * Normalise the dashboard export. Column names have changed once already as
 * the report evolved, so match on NORMALISED SUBSTRINGS rather than exact
 * headers — a renamed column should degrade one field, not fail the import.
 */
function importAiCsv(file) {
    const rows = parseCsv(readFileSync(file, 'utf8'));
    if (rows.length < 2) throw new Error('CSV has no data rows');
    const head = rows[0].map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
    const idx = (...cands) => head.findIndex((h) => cands.some((c) => h.includes(c)));
    const iQuery = idx('groundingquery', 'query', 'prompt');
    const iPage = idx('url', 'page', 'citedpage');
    const iCites = idx('citation', 'cites', 'count');
    const iShare = idx('share');
    const iIntent = idx('intent');
    const iTopic = idx('topic');

    const records = rows.slice(1).map((r) => ({
        groundingQuery: iQuery > -1 ? r[iQuery]?.trim() || null : null,
        page: iPage > -1 ? r[iPage]?.trim() || null : null,
        citations: iCites > -1 ? Number(String(r[iCites]).replace(/[^\d.-]/g, '')) || 0 : null,
        citationShare: iShare > -1 ? Number(String(r[iShare]).replace(/[^\d.-]/g, '')) || null : null,
        intent: iIntent > -1 ? r[iIntent]?.trim() || null : null,
        topic: iTopic > -1 ? r[iTopic]?.trim() || null : null,
    }));

    const byPage = new Map();
    for (const rec of records) {
        if (!rec.page) continue;
        byPage.set(rec.page, (byPage.get(rec.page) ?? 0) + (rec.citations ?? 0));
    }
    return {
        source: 'dashboard-csv-export',
        // The export date, not the import date: a stale file must LOOK stale.
        exportFileModified: new Date(statSync(file).mtime).toISOString(),
        columnsDetected: { iQuery, iPage, iCites, iShare, iIntent, iTopic },
        totalCitations: records.reduce((n, r) => n + (r.citations ?? 0), 0),
        citedPages: byPage.size,
        groundingQueries: new Set(records.map((r) => r.groundingQuery).filter(Boolean)).size,
        topPages: [...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([page, citations]) => ({ page, citations })),
        records: records.slice(0, 1000),
    };
}

async function main() {
    const report = {
        generatedAt: nowIso(),
        site: SITE,
        searchPerformance: { configured: false, reason: 'BING_WEBMASTER_API_KEY is not set' },
        aiCitations: { configured: false, reason: 'no --import-ai CSV supplied and no public API exists' },
        notes: [
            'AI-citation data (total citations, cited pages, grounding queries, citation share) is dashboard-only: verified 2026-09-04 that Microsoft documents no API for it. Export the CSV from Bing Webmaster Tools → AI Performance and pass it with --import-ai.',
            'No figure in this report is estimated. An unavailable metric is reported as unavailable.',
        ],
    };

    if (IMPORT_AI) {
        try {
            report.aiCitations = { configured: true, ...importAiCsv(IMPORT_AI) };
            console.log(
                `[bing] AI import: ${report.aiCitations.totalCitations} citations across ${report.aiCitations.citedPages} pages, ${report.aiCitations.groundingQueries} grounding queries`
            );
            for (const p of report.aiCitations.topPages.slice(0, 8)) {
                console.log(`   ${String(p.citations).padStart(6)}  ${p.page.replace(SITE_URL, '')}`);
            }
        } catch (e) {
            report.aiCitations = { configured: false, reason: `import failed: ${e.message}` };
            console.error(`[bing] AI import failed: ${e.message}`);
        }
    } else {
        // Keep the integration point warm even when unused.
        const live = await fetchAiCitations();
        if (live) report.aiCitations = { configured: true, source: 'api', ...live };
    }

    if (!API_KEY) {
        console.log('[bing] search performance NOT CONFIGURED — set BING_WEBMASTER_API_KEY (Webmaster Tools → Settings → API access).');
    } else {
        try {
            const [traffic, queries, pages] = await Promise.all([
                bingGet('GetRankAndTrafficStats'),
                bingGet('GetQueryStats'),
                bingGet('GetPageStats'),
            ]);
            const recent = (traffic ?? []).map((d) => ({
                date: bingDate(d.Date),
                impressions: d.Impressions ?? null,
                clicks: d.Clicks ?? null,
            })).filter((d) => d.date).slice(-DAYS);
            report.searchPerformance = {
                configured: true,
                days: recent.length,
                totals: {
                    impressions: recent.reduce((n, d) => n + (d.impressions ?? 0), 0),
                    clicks: recent.reduce((n, d) => n + (d.clicks ?? 0), 0),
                },
                daily: recent,
                topQueries: (queries ?? []).slice(0, 50).map((q) => ({
                    query: q.Query,
                    impressions: q.Impressions ?? null,
                    clicks: q.Clicks ?? null,
                    avgPosition: q.AvgImpressionPosition ?? null,
                })),
                topPages: (pages ?? []).slice(0, 50).map((p) => ({
                    page: p.Query,
                    impressions: p.Impressions ?? null,
                    clicks: p.Clicks ?? null,
                })),
            };
            console.log(
                `[bing] search: ${report.searchPerformance.totals.impressions} impressions / ${report.searchPerformance.totals.clicks} clicks over ${recent.length}d`
            );
        } catch (e) {
            report.searchPerformance = { configured: false, reason: `api error: ${e.message}` };
            console.error(`[bing] search performance failed: ${e.message}`);
        }
    }

    if (OUT) {
        writeFileSync(OUT, JSON.stringify(report, null, 2));
        console.log(`[bing] wrote ${OUT}`);
    }
}

main().catch((e) => {
    console.error('[bing] fatal:', e.message);
    process.exit(1);
});
