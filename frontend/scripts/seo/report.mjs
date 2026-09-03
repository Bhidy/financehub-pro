/**
 * DAILY SEO INTELLIGENCE REPORT.
 *
 * Composes the audit findings and (when configured) Search Console
 * intelligence into one prioritised brief and pushes a digest to the ops
 * Discord channel that already receives every other pipeline alert.
 *
 * The rule this file exists to enforce: DO NOT DUMP RAW DATA. Every section
 * answers "what changed and what should be done", ordered by impact. Findings
 * without an action are noise.
 *
 *   node scripts/seo/report.mjs --audit audit.json --gsc gsc.json --out report.md
 *   node scripts/seo/report.mjs --audit audit.json --notify
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { notifyDiscord, SEVERITY } from './lib.mjs';

const args = process.argv.slice(2);
const val = (n, d) => {
    const i = args.indexOf(`--${n}`);
    return i === -1 ? d : args[i + 1];
};
const NOTIFY = args.includes('--notify');

const readJson = (p) => {
    if (!p || !existsSync(p)) return null;
    try {
        return JSON.parse(readFileSync(p, 'utf8'));
    } catch (e) {
        console.error(`WARN: could not parse ${p}: ${e.message}`);
        return null;
    }
};

/** Group findings by code so 300 instances of one defect read as one line. */
function groupFindings(findings) {
    const byCode = new Map();
    for (const f of findings) {
        if (!byCode.has(f.code)) byCode.set(f.code, { code: f.code, severity: f.severity, count: 0, examples: [] });
        const g = byCode.get(f.code);
        g.count++;
        if (g.examples.length < 3) g.examples.push(f.message);
    }
    return [...byCode.values()].sort(
        (a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity) || b.count - a.count
    );
}

/**
 * Recommended actions, derived from the findings themselves. Each maps a defect
 * class to the concrete change that closes it — never generic SEO advice.
 */
const ACTION_FOR = {
    ROBOTS_BLOCKS_SITE: 'ROLL BACK IMMEDIATELY — robots.txt is disallowing the whole site.',
    ROBOTS_BLOCKS_RESOURCES: 'Unblock /_next and /assets in app/robots.ts — Google cannot render the pages.',
    PAGE_5XX: 'Investigate the erroring route before the next crawl cycle; a sustained 5xx de-indexes the URL.',
    PAGE_404: 'Either restore the page or remove it from the sitemap — the two must agree.',
    PAGE_NOINDEX: 'Remove the noindex, or remove the URL from the sitemap if it is genuinely private.',
    AR_PAGE_WRONG_LANG: 'The Arabic tree is serving <html lang="en"> — check that middleware still stamps x-starta-lang and the root layout reads it.',
    AR_PAGE_WRONG_DIR: 'Arabic pages must serve dir="rtl" server-side, not via client JS.',
    PAGE_CANONICAL_MISMATCH: 'The URL canonicalises elsewhere, so it cannot rank on its own address — align the canonical or drop the URL from the sitemap.',
    PAGE_CANONICAL_FOREIGN_HOST: 'A canonical points off-origin — this de-indexes the page. Fix immediately.',
    DUPLICATE_TITLE: 'Differentiate the titles: identical titles make our own URLs compete for one query.',
    URL_REDIRECTS: 'A sitemapped URL is redirecting — emit the canonical form in the sitemap instead (wasted crawl budget).',
    SITEMAP_SEGMENT_EMPTY: 'A sitemap segment returned zero URLs — check the query behind that builder.',
    SITEMAP_SEGMENT_DOWN: 'A child sitemap is erroring; Search Console will report the whole index as failing.',
    SITEMAP_LASTMOD_UNTRUSTWORTHY: 'lastmod equals request time on every child — report the real max data timestamp instead.',
    SCHEMA_MISSING: 'A template lost its required structured data — rich-result eligibility is gone for that page type.',
    JSONLD_PARSE_ERROR: 'Invalid JSON-LD is ignored entirely by search engines — fix the emitting template.',
    PAGE_THIN: 'Server-render the page content: a client-rendered list is invisible to the indexing pass.',
    PAGE_NO_H1: 'Add a single descriptive H1 carrying the page’s target term.',
    PAGE_NO_CANONICAL: 'Add a self-referencing canonical.',
    PAGE_UNCACHEABLE: 'Add a Cache-Control s-maxage in next.config.ts — no-store means 0% CDN hits and a slow TTFB on every crawl.',
    PAGE_FEW_INTERNAL_LINKS: 'Add contextual internal links — a page with no outbound links is a PageRank dead end.',
    HREFLANG_NO_SELF_REFERENCE: 'hreflang clusters must include a self-reference or Google discards the whole cluster.',
    ROBOTS_AI_BOT_MISSING: 'Add an explicit allow stanza for this answer-engine crawler.',
};

function buildMarkdown(audit, gsc) {
    const L = [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    L.push(`# SEO Intelligence Report — ${now} UTC`);
    L.push('');

    if (!audit) {
        L.push('> **The audit did not produce a report.** No health score can be stated for this run.');
        return L.join('\n');
    }

    const c = audit.counts;
    L.push(`**SEO Health Score: ${audit.healthScore}/100**  ·  ${audit.urlsAudited} URLs audited  ·  ${audit.indexableFootprint} URLs in sitemaps`);
    L.push('');
    L.push(`| Critical | High | Medium | Low |`);
    L.push(`|---|---|---|---|`);
    L.push(`| ${c.critical} | ${c.high} | ${c.medium} | ${c.low} |`);
    L.push('');

    const groups = groupFindings(audit.findings);
    const blocking = groups.filter((g) => g.severity === 'critical' || g.severity === 'high');
    if (blocking.length === 0) {
        L.push('## No critical or high findings');
        L.push('');
        L.push('Crawl policy, sitemaps, canonicals, language declarations and structured data all verified clean on the audited set.');
    } else {
        L.push('## Issues that need action');
        L.push('');
        for (const g of blocking) {
            L.push(`### ${g.severity.toUpperCase()} · ${g.code} (${g.count})`);
            for (const ex of g.examples) L.push(`- ${ex}`);
            if (g.count > g.examples.length) L.push(`- …and ${g.count - g.examples.length} more`);
            const action = ACTION_FOR[g.code];
            if (action) L.push(`- **Action:** ${action}`);
            L.push('');
        }
    }

    const lesser = groups.filter((g) => g.severity === 'medium');
    if (lesser.length) {
        L.push('## Worth fixing');
        L.push('');
        for (const g of lesser.slice(0, 10)) {
            L.push(`- **${g.code}** (${g.count}) — ${ACTION_FOR[g.code] || g.examples[0] || ''}`);
        }
        L.push('');
    }

    L.push('## Indexable footprint by segment');
    L.push('');
    L.push('| Segment | URLs |');
    L.push('|---|---|');
    for (const [k, v] of Object.entries(audit.sitemapTotals || {})) L.push(`| ${k} | ${v} |`);
    L.push('');

    L.push('## Search performance');
    L.push('');
    if (!gsc) {
        L.push('_No Search Console data was collected for this run._');
    } else if (!gsc.configured) {
        L.push(`_Not available: ${gsc.reason}_`);
        L.push('');
        L.push('No estimated or placeholder metrics are shown in its place.');
    } else if (gsc.error) {
        L.push(`_Search Console request failed: ${gsc.error}_`);
    } else {
        const t = gsc.totals;
        const trend = t.clicksChangePct === null ? 'n/a' : `${t.clicksChangePct > 0 ? '+' : ''}${t.clicksChangePct}%`;
        L.push(`**${t.clicks} clicks · ${t.impressions} impressions · ${t.ctr}% CTR** over ${gsc.window.days} days to ${gsc.window.end} (clicks ${trend} vs the previous ${gsc.window.days} days).`);
        L.push('');
        const table = (title, rows, fmt) => {
            if (!rows?.length) return;
            L.push(`### ${title}`);
            L.push('');
            for (const r of rows.slice(0, 8)) L.push(`- ${fmt(r)}`);
            L.push('');
        };
        table('Gaining', gsc.queryWinners.filter((r) => r.clicksDelta > 0), (r) => `\`${r.key}\` — ${r.clicks} clicks (${r.clicksDelta > 0 ? '+' : ''}${r.clicksDelta}), position ${r.position?.toFixed(1)}`);
        table('Losing', gsc.queryLosers.filter((r) => r.clicksDelta < 0), (r) => `\`${r.key}\` — ${r.clicks} clicks (${r.clicksDelta}), position ${r.position?.toFixed(1)}`);
        table('One push from page one (positions 4-20)', gsc.strikingDistance, (r) => `\`${r.query}\` — position ${r.position}, ${r.impressions} impressions, ${r.clicks} clicks [${r.band}]`);
        table('Ranking well but under-clicked (title/description work)', gsc.ctrOpportunities, (r) => `\`${r.query}\` — position ${r.position}, ${r.ctr}% CTR vs ~${r.expectedCtr}% typical; ≈${r.missedClicksEstimate} clicks left on the table`);
        if (gsc.cannibalization?.length) {
            L.push('### Cannibalisation — our own URLs competing');
            L.push('');
            for (const x of gsc.cannibalization.slice(0, 6)) {
                L.push(`- \`${x.query}\`: ${x.urls.map((u) => `${u.page.replace(/^https?:\/\/[^/]+/, '')} (pos ${u.position.toFixed(1)})`).join(' vs ')}`);
            }
            L.push('');
            L.push('**Action:** pick one canonical destination per query and link the others to it.');
            L.push('');
        }
        table('Content decay — pages losing clicks', gsc.contentDecay.filter((r) => r.clicksDelta < 0), (r) => `${r.key.replace(/^https?:\/\/[^/]+/, '')} — ${r.clicks} clicks (${r.clicksDelta})`);
    }

    L.push('---');
    L.push(`_Generated by scripts/seo/report.mjs · audit ran in ${Math.round((audit.durationMs || 0) / 1000)}s_`);
    return L.join('\n');
}

/** Discord digest: the headline plus only what needs a human. */
function buildDigest(audit, gsc) {
    if (!audit) return '⚠️ **SEO audit produced no report** — the job failed before writing findings.';
    const c = audit.counts;
    const icon = c.critical > 0 ? '🔴' : c.high > 0 ? '🟠' : '🟢';
    const lines = [`${icon} **SEO Health ${audit.healthScore}/100** — ${c.critical} critical · ${c.high} high · ${c.medium} medium (${audit.urlsAudited} URLs, ${audit.indexableFootprint} sitemapped)`];
    const groups = groupFindings(audit.findings).filter((g) => g.severity === 'critical' || g.severity === 'high');
    for (const g of groups.slice(0, 6)) lines.push(`• **${g.code}** ×${g.count} — ${g.examples[0]}`);
    if (groups.length > 6) lines.push(`• …and ${groups.length - 6} more issue types`);
    if (gsc?.configured && !gsc.error) {
        const t = gsc.totals;
        lines.push(`📈 ${t.clicks} clicks / ${t.impressions} impressions (${t.clicksChangePct === null ? 'n/a' : `${t.clicksChangePct > 0 ? '+' : ''}${t.clicksChangePct}%`}) · ${gsc.strikingDistance.length} near-page-1 queries · ${gsc.ctrOpportunities.length} CTR gaps`);
    } else if (gsc && !gsc.configured) {
        lines.push('ℹ️ Search Console not configured — no search-performance section in this report.');
    }
    return lines.join('\n');
}

async function main() {
    const audit = readJson(val('audit', null));
    const gsc = readJson(val('gsc', null));
    const md = buildMarkdown(audit, gsc);
    const out = val('out', null);
    if (out) {
        writeFileSync(out, md);
        console.log(`[seo-report] written to ${out}`);
    } else {
        console.log(md);
    }
    if (NOTIFY) {
        const r = await notifyDiscord(buildDigest(audit, gsc));
        console.log(`[seo-report] discord: ${r.sent ? 'sent' : `not sent (${r.reason || r.status})`}`);
    }
}

main().catch((e) => {
    console.error(`[seo-report] FATAL: ${e.message}`);
    process.exit(2);
});
