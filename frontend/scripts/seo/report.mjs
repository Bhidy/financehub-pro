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
 *   node scripts/seo/report.mjs --audit a.json --gsc g.json --competitor c.json --serp s.json --bing b.json --duplicates d.json --experiments ../content/seo-experiments.json
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
    PAGES_UNCACHEABLE: 'Vercel stamps force-dynamic App Router routes with no-store and overrides both middleware and next.config headers, so this is not fixable per page. The working lever is the cross-request data cache (unstable_cache in lib/public-data.ts) — extend it to any hot read still hitting Postgres per request.',
    PAGE_FEW_INTERNAL_LINKS: 'Add contextual internal links — a page with no outbound links is a PageRank dead end.',
    HREFLANG_NO_SELF_REFERENCE: 'hreflang clusters must include a self-reference or Google discards the whole cluster.',
    ROBOTS_AI_BOT_MISSING: 'Add an explicit allow stanza for this answer-engine crawler.',
};

/* ── command center ──────────────────────────────────────────────────────── */

const UNMEASURED = (why) => `unmeasured — ${why}`;

/**
 * Executive KPIs, one table, every source named. The rule: a KPI that cannot
 * be measured says so in its own row — it is never blank, never zero, never
 * estimated. The daily job archived competitor, ranking, Bing and duplicate
 * outputs for weeks without a single one reaching the brief; this is where
 * they surface.
 */
function commandCenter(audit, gsc, { competitor, serp, bing, duplicates, experiments }) {
    const rows = [];
    const add = (kpi, value, source) => rows.push([kpi, value, source]);

    add('Indexable footprint', `${audit.indexableFootprint} URLs`, 'sitemaps');
    add('SEO health', `${audit.healthScore}/100 over ${audit.urlsAudited} URLs (${audit.counts.critical} critical · ${audit.counts.high} high)`, 'audit');
    if (audit.timing) add('Time to last byte', `p50 ${audit.timing.p50} ms · p90 ${audit.timing.p90} ms (${audit.timing.count} pages)`, 'audit');
    else add('Time to last byte', UNMEASURED('fewer than 10 timed pages'), 'audit');

    if (gsc?.configured && !gsc.error) {
        const t = gsc.totals;
        add('Google search', `${t.clicks} clicks · ${t.impressions} impressions · ${t.ctr}% CTR (${gsc.window.days}d)`, 'Search Console');
        add('Striking distance (pos 4–20)', `${gsc.strikingDistance?.length ?? 0} queries`, 'Search Console');
    } else {
        add('Google search', UNMEASURED(gsc ? gsc.reason || gsc.error || 'not configured' : 'no GSC run'), 'Search Console');
    }

    if (competitor?.coverage) {
        const lead = competitor.coverage.leader || {};
        const keys = Object.keys(lead).filter((k) => lead[k] !== null);
        const ours = keys.filter((k) => lead[k] === 'starta');
        const theirs = keys.filter((k) => lead[k] === 'competitor');
        add('Coverage lead vs competitor', `${ours.length}/${keys.length} clusters${theirs.length ? ` — behind on ${theirs.join(', ')}` : ''}`, `competitor.mjs (${competitor.competitor})`);
        for (const h of competitor.headToHead || []) {
            const a = h.starta, b = h.competitor;
            if (!a?.reachable && !b?.reachable) continue;
            const f = (x, k) => (typeof x?.[k] === 'number' ? x[k] : '—');
            add(`Head-to-head · ${h.intent}`, `words ${f(a, 'words')} vs ${f(b, 'words')} · headings ${f(a, 'headings')} vs ${f(b, 'headings')} · links ${f(a, 'internalLinks')} vs ${f(b, 'internalLinks')}`, 'competitor.mjs');
        }
        const access = (r) => {
            if (!r?.named) return 'n/a';
            const e = Object.entries(r.named);
            const blocked = e.filter(([, v]) => v === false).map(([k]) => k);
            return blocked.length ? `${e.length - blocked.length}/${e.length} bots allowed (blocks ${blocked.join(', ')})` : `all ${e.length} named bots allowed`;
        };
        add('Answer-engine access', `starta: ${access(competitor.aiAccess?.starta)} · competitor: ${access(competitor.aiAccess?.competitor)}`, 'robots.txt');
    } else {
        add('Coverage lead vs competitor', UNMEASURED('competitor scorecard not run or competitor unreachable'), 'competitor.mjs');
    }

    if (serp?.configured && Array.isArray(serp.rankings)) {
        const host = 'startamarkets.com';
        const pos = serp.rankings.map((r) => r.positions?.[host]?.position).filter((p) => typeof p === 'number');
        add('Rankings', `${pos.filter((p) => p <= 3).length} top-3 · ${pos.filter((p) => p <= 10).length} top-10 · ${pos.length}/${serp.rankings.length} tracked queries ranked`, `serp.mjs (${serp.provider || 'provider'})`);
    } else {
        add('Rankings', UNMEASURED('no licensed SERP provider configured (SERP_PROVIDER/SERP_API_KEY)'), 'serp.mjs');
    }

    if (bing?.searchPerformance?.configured) {
        const t = bing.searchPerformance.totals || {};
        add('Bing search', `${t.clicks ?? '—'} clicks · ${t.impressions ?? '—'} impressions`, 'Bing Webmaster API');
    } else {
        add('Bing search', UNMEASURED(bing?.searchPerformance?.reason || 'BING_WEBMASTER_API_KEY not set'), 'Bing Webmaster API');
    }
    if (bing?.aiCitations?.configured) {
        add('AI citations (Bing/Copilot)', `${bing.aiCitations.totalCitations} citations across ${bing.aiCitations.citedPages} pages`, 'Bing AI Performance export');
    } else {
        add('AI citations (Bing/Copilot)', UNMEASURED('dashboard-only; import the CSV with bing.mjs --import-ai'), 'Bing AI Performance');
    }

    if (duplicates?.counts) {
        const parts = Object.entries(duplicates.counts).map(([k, v]) => `${v} ${k}`);
        add('Near-duplicate content (news sample)', parts.length ? parts.join(' · ') : 'none found', 'duplicates.mjs');
    } else {
        add('Near-duplicate content (news sample)', UNMEASURED('duplicate scan not run'), 'duplicates.mjs');
    }

    if (Array.isArray(experiments?.experiments)) {
        const today = new Date().toISOString().slice(0, 10);
        const open = experiments.experiments.filter((e) => e.status === 'open');
        const due = open.filter((e) => e.reviewAfter && e.reviewAfter <= today);
        add('Experiments', `${open.length} open · ${due.length} due for measurement`, 'content/seo-experiments.json');
    } else {
        add('Experiments', UNMEASURED('ledger not supplied'), 'experiments.mjs');
    }

    const L = ['## Command center', '', '| KPI | Value | Source |', '|---|---|---|'];
    for (const [k, v, src] of rows) L.push(`| ${k} | ${v} | ${src} |`);
    L.push('');
    return L;
}

function buildMarkdown(audit, gsc, extra = {}) {
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
    L.push(...commandCenter(audit, gsc, extra));

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
function buildDigest(audit, gsc, extra = {}) {
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
    const lead = extra.competitor?.coverage?.leader;
    if (lead) {
        const keys = Object.keys(lead).filter((k) => lead[k] !== null);
        const behind = keys.filter((k) => lead[k] === 'competitor');
        lines.push(`🏁 Coverage lead ${keys.length - behind.length}/${keys.length} clusters vs ${String(extra.competitor.competitor || '').replace(/^https?:\/\//, '')}${behind.length ? ` — behind on ${behind.join(', ')}` : ''}`);
    }
    if (Array.isArray(extra.experiments?.experiments)) {
        const today = new Date().toISOString().slice(0, 10);
        const due = extra.experiments.experiments.filter((e) => e.status === 'open' && e.reviewAfter && e.reviewAfter <= today);
        if (due.length) lines.push(`🧪 ${due.length} experiment(s) due for measurement — run scripts/seo/experiments.mjs due`);
    }
    return lines.join('\n');
}

async function main() {
    const audit = readJson(val('audit', null));
    const gsc = readJson(val('gsc', null));
    const extra = {
        competitor: readJson(val('competitor', null)),
        serp: readJson(val('serp', null)),
        bing: readJson(val('bing', null)),
        duplicates: readJson(val('duplicates', null)),
        experiments: readJson(val('experiments', null)),
    };
    const md = buildMarkdown(audit, gsc, extra);
    const out = val('out', null);
    if (out) {
        writeFileSync(out, md);
        console.log(`[seo-report] written to ${out}`);
    } else {
        console.log(md);
    }
    if (NOTIFY) {
        const r = await notifyDiscord(buildDigest(audit, gsc, extra));
        console.log(`[seo-report] discord: ${r.sent ? 'sent' : `not sent (${r.reason || r.status})`}`);
    }
}

main().catch((e) => {
    console.error(`[seo-report] FATAL: ${e.message}`);
    process.exit(2);
});
