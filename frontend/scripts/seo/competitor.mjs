#!/usr/bin/env node
/**
 * COMPETITIVE SCORECARD — Starta vs a named competitor, measured not asserted.
 *
 *     node scripts/seo/competitor.mjs [--out file.json] [--competitor https://…]
 *
 * WHY THIS EXISTS
 * The competitor analysis in this repo was forensic and manual: someone sat
 * down, read snduk.com, and wrote findings into a memo. That answers "how do we
 * compare today" exactly once. Every later claim of progress was then an
 * assertion — and "200x better" is not a number anyone can check.
 *
 * This turns the comparison into a MEASUREMENT that reruns on a schedule. It
 * compares only things both sites publish publicly and that genuinely predict
 * search strength:
 *
 *   coverage   — indexable URLs per content cluster, from each site's own
 *                sitemaps. Breadth is what stockanalysis.com wins on.
 *   depth      — server-rendered words and headings on the head-to-head money
 *                page. Depth is what the funds money page lost on before.
 *   structure  — JSON-LD entity types actually emitted. Numeric fund schema is
 *                our documented differentiator; this proves it still ships.
 *   linking    — internal links in the served HTML (crawl paths into the tree).
 *   freshness  — sitemap lastmod recency.
 *   ai-access  — whether each site lets answer-engine crawlers in at all.
 *
 * HONESTY RULES, deliberately enforced in code:
 *  - Everything is fetched from public URLs with a self-identifying UA. There
 *    is no search-result scraping here: rankings are NOT in this file, because
 *    obtaining them requires a paid SERP provider (see serp.mjs) and guessing
 *    them would be fabrication.
 *  - A metric that cannot be fetched is reported as `null`, never as 0 and
 *    never estimated. `null` and "we are ahead" are different statements.
 *  - No metric is editorialised. The scorecard reports the numbers and who
 *    leads on each; it does not compute a single vanity score.
 */
import { writeFileSync } from 'node:fs';
import { httpGet, mapLimit, parseLocs, parseUrlEntries, extractHtmlFacts, jsonLdTypes, stripTags, SITE_URL, nowIso } from './lib.mjs';

const arg = (name, dflt = null) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
};

const COMPETITOR = (arg('competitor', 'https://snduk.com') || '').replace(/\/$/, '');
const OUT = arg('out');

/**
 * Cluster classification. Deliberately URL-pattern based and identical in shape
 * for both sites, so neither is measured on rules written to flatter it.
 */
const CLUSTERS = [
    { key: 'funds', label: 'Individual funds', re: /\/(funds?|صناديق)\/[^/?#]+/i },
    { key: 'fundHubs', label: 'Fund hubs / categories / providers', re: /\/(funds?)(\/(category|provider|prices-today|fees|compare|vs)\b|\/?$|\?)/i },
    { key: 'stocks', label: 'Stocks / companies', re: /\/(symbol|stocks?|quote|companies)\b/i },
    { key: 'indices', label: 'Indices / market screens', re: /\/(indices|index|markets?|sectors?)\b/i },
    { key: 'learn', label: 'Education / glossary', re: /\/(learn|blog|academy|glossary|education|guides?)\b/i },
    { key: 'news', label: 'News', re: /\/(news|article)s?\b/i },
];

const classify = (u) => CLUSTERS.find((c) => c.re.test(u))?.key ?? 'other';

/** Follow a sitemap index down to leaf URLs. Bounded so a hostile/looping index cannot hang the job. */
async function collectSitemapUrls(origin, { maxDocs = 40 } = {}) {
    const seen = new Set();
    const urls = [];
    const lastmods = [];
    const queue = [`${origin}/sitemap.xml`];
    let docs = 0;
    let reachable = false;

    while (queue.length && docs < maxDocs) {
        const doc = queue.shift();
        if (seen.has(doc)) continue;
        seen.add(doc);
        docs++;
        const res = await httpGet(doc);
        if (res.status !== 200 || !res.body) continue;
        reachable = true;
        const isIndex = /<sitemapindex/i.test(res.body);
        if (isIndex) {
            for (const loc of parseLocs(res.body)) if (!seen.has(loc)) queue.push(loc);
            continue;
        }
        for (const e of parseUrlEntries(res.body)) {
            if (!e.loc) continue;
            urls.push(e.loc);
            if (e.lastmod) {
                const t = Date.parse(e.lastmod);
                if (Number.isFinite(t)) lastmods.push(t);
            }
        }
    }
    // Not reachable is a real state, not zero coverage.
    return reachable ? { urls, lastmods, truncated: queue.length > 0 } : null;
}

function coverageOf(sitemap) {
    if (!sitemap) return null;
    // Strip query strings before de-duplicating: a competitor that sitemaps
    // `?lang=ar` and `?lang=en` of one page is publishing one page, not two.
    // Counting them as two would overstate their coverage.
    const canonicalish = new Set(sitemap.urls.map((u) => u.split('#')[0].replace(/\?.*$/, '')));
    const byCluster = Object.fromEntries(CLUSTERS.map((c) => [c.key, 0]));
    byCluster.other = 0;
    for (const u of canonicalish) byCluster[classify(u)]++;
    const fresh = sitemap.lastmods.length
        ? { newest: new Date(Math.max(...sitemap.lastmods)).toISOString(), withLastmod: sitemap.lastmods.length }
        : { newest: null, withLastmod: 0 };
    return { totalSitemapped: sitemap.urls.length, distinctPages: canonicalish.size, byCluster, freshness: fresh, truncated: sitemap.truncated };
}

/** Page-level depth on one URL. */
async function measurePage(url) {
    const res = await httpGet(url);
    if (res.status !== 200 || !res.body) return { url, status: res.status, reachable: false };
    const facts = extractHtmlFacts(res.body);
    const body = res.body.replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    const text = stripTags(body);
    const words = text.split(/\s+/).filter(Boolean).length;
    const arabic = (text.match(/[؀-ۿ]/g) || []).length;
    const latin = (text.match(/[A-Za-z]/g) || []).length;
    // h1-h4, not h1-h3. The narrower count under-measured our own comparison
    // hub, whose grouped and FAQ headings are h4 — a scorecard that cannot see
    // half the structure it is scoring produces a gap that does not exist.
    const headings = (body.match(/<h[1-4][^>]*>/gi) || []).length;
    const internal = (body.match(/href="(\/[^"]*|https?:\/\/[^"]*)"/gi) || []).filter((h) => {
        const m = h.match(/href="([^"]+)"/i);
        if (!m) return false;
        return m[1].startsWith('/') || m[1].startsWith(new URL(url).origin);
    }).length;
    return {
        url,
        status: res.status,
        reachable: true,
        ttfbMs: res.ms,
        bytes: res.body.length,
        words,
        headings,
        internalLinks: internal,
        arabicShareOfLetters: arabic + latin ? Number((arabic / (arabic + latin)).toFixed(3)) : null,
        title: facts.title,
        h1: facts.h1,
        jsonLdTypes: [...jsonLdTypes(facts.jsonLd)],
        // Numeric fund values inside InvestmentFund/MonetaryAmount schema is the
        // documented differentiator; verify it rather than assuming it holds.
        numericFundSchema: /"@type"\s*:\s*"MonetaryAmount"[\s\S]{0,200}?"value"\s*:\s*-?\d/.test(res.body),
    };
}

/** Does this origin let the answer engines in? robots.txt only — the honest, checkable part. */
async function aiAccess(origin) {
    const res = await httpGet(`${origin}/robots.txt`);
    if (res.status !== 200 || !res.body) return null;
    const txt = res.body;
    const bots = ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'CCBot', 'Google-Extended'];
    const named = {};
    for (const b of bots) {
        const re = new RegExp(`user-agent:\\s*${b}\\b([\\s\\S]*?)(?=\\nuser-agent:|$)`, 'i');
        const m = txt.match(re);
        // Named block that disallows everything = explicitly excluded.
        named[b] = m ? !/disallow:\s*\/\s*$/im.test(m[1]) : 'default';
    }
    return { named, hasSitemapPointer: /sitemap:/i.test(txt) };
}

async function main() {
    const startedAt = Date.now();
    console.log(`[competitor] Starta ${SITE_URL} vs ${COMPETITOR}`);

    const [ourSitemap, theirSitemap, ourRobots, theirRobots] = await Promise.all([
        collectSitemapUrls(SITE_URL),
        collectSitemapUrls(COMPETITOR),
        aiAccess(SITE_URL),
        aiAccess(COMPETITOR),
    ]);

    // Head-to-head pages: the same intent on both sites. These are the SERPs we
    // actually contest, so depth is compared where it matters rather than on a
    // whole-site average that a large news archive would distort.
    const HEAD_TO_HEAD = [
        { intent: 'Arabic funds money page', starta: `${SITE_URL}/ar/Funds`, competitor: `${COMPETITOR}/eg/funds?lang=ar` },
        { intent: 'Fund price list', starta: `${SITE_URL}/ar/Funds/prices-today`, competitor: `${COMPETITOR}/eg/fund-prices?lang=ar` },
        { intent: 'Fund comparison', starta: `${SITE_URL}/Funds/Compare`, competitor: `${COMPETITOR}/eg/funds/compare?lang=ar` },
    ];

    const targets = HEAD_TO_HEAD.flatMap((h) => [
        { ...h, side: 'starta', url: h.starta },
        { ...h, side: 'competitor', url: h.competitor },
    ]);
    const measured = await mapLimit(targets, 3, async (t) => ({ ...t, page: await measurePage(t.url) }));

    const headToHead = HEAD_TO_HEAD.map((h) => {
        const ours = measured.find((m) => m.intent === h.intent && m.side === 'starta')?.page ?? null;
        const theirs = measured.find((m) => m.intent === h.intent && m.side === 'competitor')?.page ?? null;
        const cmp = (key) => {
            const a = ours?.[key];
            const b = theirs?.[key];
            if (typeof a !== 'number' || typeof b !== 'number') return null;
            return a === b ? 'tie' : a > b ? 'starta' : 'competitor';
        };
        return {
            intent: h.intent,
            starta: ours,
            competitor: theirs,
            leader: { words: cmp('words'), headings: cmp('headings'), internalLinks: cmp('internalLinks') },
        };
    });

    const ourCov = coverageOf(ourSitemap);
    const theirCov = coverageOf(theirSitemap);
    const coverageLead = {};
    for (const c of CLUSTERS) {
        const a = ourCov?.byCluster?.[c.key];
        const b = theirCov?.byCluster?.[c.key];
        coverageLead[c.key] =
            typeof a !== 'number' || typeof b !== 'number' ? null : a === b ? 'tie' : a > b ? 'starta' : 'competitor';
    }

    const report = {
        generatedAt: nowIso(),
        durationMs: Date.now() - startedAt,
        starta: SITE_URL,
        competitor: COMPETITOR,
        // Explicit about what this file does NOT contain, so nobody reads the
        // absence of rankings as "we rank everywhere".
        notMeasured: [
            'Keyword rankings and SERP positions — require a licensed SERP provider (scripts/seo/serp.mjs); never estimated here.',
            'Backlinks / referring domains — require a link-index provider; not inferable from public pages.',
            'AI citation counts — Bing Webmaster AI performance requires account access (scripts/seo/gsc.mjs pattern).',
        ],
        coverage: { starta: ourCov, competitor: theirCov, leader: coverageLead },
        headToHead,
        aiAccess: { starta: ourRobots, competitor: theirRobots },
    };

    const line = (label, a, b) => {
        const fmt = (v) => (v === null || v === undefined ? 'n/a' : String(v));
        const lead = typeof a === 'number' && typeof b === 'number' ? (a === b ? '=' : a > b ? '<<' : '>>') : '?';
        console.log(`  ${label.padEnd(34)} ${fmt(a).padStart(8)}  ${lead}  ${fmt(b)}`);
    };

    console.log(`\n[competitor] COVERAGE (distinct pages in each site's own sitemaps)`);
    console.log(`  ${''.padEnd(34)} ${'STARTA'.padStart(8)}      COMPETITOR`);
    line('total distinct pages', ourCov?.distinctPages, theirCov?.distinctPages);
    for (const c of CLUSTERS) line(c.label, ourCov?.byCluster?.[c.key], theirCov?.byCluster?.[c.key]);

    console.log(`\n[competitor] HEAD-TO-HEAD DEPTH (server-rendered)`);
    for (const h of headToHead) {
        console.log(`  ${h.intent}`);
        line('  words', h.starta?.words, h.competitor?.words);
        line('  headings', h.starta?.headings, h.competitor?.headings);
        line('  internal links', h.starta?.internalLinks, h.competitor?.internalLinks);
        if (h.starta && !h.starta.reachable) console.log(`    ! our page unreachable (status ${h.starta.status})`);
        if (h.competitor && !h.competitor.reachable) console.log(`    ! their page unreachable (status ${h.competitor.status})`);
    }

    const ourSchema = headToHead.find((h) => h.starta?.numericFundSchema);
    console.log(`\n[competitor] numeric fund schema — starta: ${ourSchema ? 'YES' : 'no'} · competitor: ${headToHead.find((h) => h.competitor?.numericFundSchema) ? 'YES' : 'no'}`);
    console.log(`[competitor] not measured here: ${report.notMeasured.length} item(s) requiring external credentials`);

    if (OUT) {
        writeFileSync(OUT, JSON.stringify(report, null, 2));
        console.log(`[competitor] wrote ${OUT}`);
    }
}

main().catch((e) => {
    console.error('[competitor] fatal:', e.message);
    process.exit(1);
});
