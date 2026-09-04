/**
 * SEO FORENSIC AUDIT — the self-healing guardrail.
 *
 * Crawls production the way a search engine would and asserts every property
 * that, if it silently broke, would cost us visibility before anyone noticed.
 * This is the job the repo previously had no equivalent of: `verify:routes`
 * gates SOURCE at build time, this gates the RENDERED SITE after deploy.
 *
 *   node scripts/seo/audit.mjs                     # standard daily audit
 *   node scripts/seo/audit.mjs --quick             # money pages only (post-deploy)
 *   node scripts/seo/audit.mjs --sample 40         # URLs sampled per segment
 *   node scripts/seo/audit.mjs --out report.json
 *   node scripts/seo/audit.mjs --fail-on high      # exit 1 at/above this severity
 *
 * Exit codes: 0 clean (or below threshold) · 1 findings at/above --fail-on ·
 * 2 the audit itself could not run (never conflated with "the site is fine").
 */

import { writeFileSync } from 'node:fs';
import {
    SITE_URL, httpGet, mapLimit, extractHtmlFacts, jsonLdTypes, parseLocs, parseUrlEntries,
    makeFindings, healthScore, nowIso, sevRank, sleep,
} from './lib.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? dflt : args[i + 1];
};
const QUICK = args.includes('--quick');
const SAMPLE = Number(flag('sample', QUICK ? 0 : 25));
const OUT = flag('out', null);
const FAIL_ON = flag('fail-on', 'critical');
const CONCURRENCY = Number(flag('concurrency', 6));

/**
 * MONEY PAGES — always audited in full, never sampled. These are the URLs the
 * business actually competes on; a defect here is worth more than a defect on
 * a long-tail page, so they get deterministic (not probabilistic) coverage.
 */
const MONEY_PAGES = [
    '/', '/ar',
    '/Funds', '/ar/Funds',
    '/Funds/best-mutual-funds-egypt-2026', '/ar/Funds/best-mutual-funds-egypt-2026',
    '/companies', '/ar/companies',
    '/sectors', '/ar/sectors',
    '/News', '/Learn', '/Learn/glossary', '/ar/Learn/glossary',
    '/markets/egx30', '/ar/markets/egx30',
    '/markets/movers', '/markets/top-dividend-yield',
    '/markets/largest-companies', '/markets/lowest-pe-stocks',
    '/Market-Pulse', '/Calculators', '/ar/Calculators',
    '/RiskAssessment', '/ar/RiskAssessment',
    '/about', '/editorial-policy', '/corrections', '/contact',
];

/** Segments sampled for template-level regressions (the long tail). */
const SEGMENTS = ['companies', 'ar-companies', 'metrics', 'sectors', 'funds', 'comparisons', 'learn', 'glossary', 'news'];

/** Templates that must carry structured data, and the @type that proves it. */
const REQUIRED_SCHEMA = [
    { match: /^\/(ar\/)?Funds\/\d+-/, types: ['BreadcrumbList'], label: 'fund detail' },
    { match: /^\/(ar\/)?Funds\/best-mutual-funds/, types: ['ItemList'], label: 'fund money page' },
    { match: /^\/News\/\d+/, types: ['NewsArticle'], label: 'news article' },
    { match: /^\/(ar\/)?Learn\/glossary\/.+/, types: ['DefinedTerm'], label: 'glossary term' },
    { match: /^\/(ar\/)?sectors\/.+/, types: ['ItemList'], label: 'sector' },
];

const f = makeFindings();
const pages = [];
/** Paths served with no-store — reported once, in aggregate (see auditPage). */
const uncacheable = [];

/* ── crawl-policy layer ──────────────────────────────────────────────────── */

async function auditCrawlPolicy() {
    const robots = await httpGet(`${SITE_URL}/robots.txt`);
    if (!robots.ok || robots.status !== 200) {
        f.add('critical', 'ROBOTS_UNREACHABLE', `robots.txt returned ${robots.status || 'network error'}`, { status: robots.status });
    } else {
        const body = robots.body;
        // A blanket disallow is the single most destructive SEO regression
        // possible and has shipped by accident on many sites. Gate it hard.
        if (/^\s*User-Agent:\s*\*\s*$[\s\S]*?^\s*Disallow:\s*\/\s*$/im.test(body)) {
            f.add('critical', 'ROBOTS_BLOCKS_SITE', 'robots.txt disallows the entire site for all agents', { body: body.slice(0, 400) });
        }
        if (!/Sitemap:\s*https:\/\/startamarkets\.com\/sitemap\.xml/i.test(body)) {
            f.add('high', 'ROBOTS_NO_SITEMAP', 'robots.txt does not advertise the sitemap index', null);
        }
        for (const bot of ['GPTBot', 'PerplexityBot', 'ClaudeBot', 'OAI-SearchBot', 'Google-Extended']) {
            if (!body.includes(bot)) {
                f.add('medium', 'ROBOTS_AI_BOT_MISSING', `robots.txt has no explicit stanza for ${bot} (AI answer engines are a distribution channel)`, { bot });
            }
        }
        // Rendering resources must never be blocked — a disallowed /_next/
        // makes Google render a blank page and rate the site as broken.
        if (/Disallow:\s*\/_next/i.test(body) || /Disallow:\s*\/assets/i.test(body)) {
            f.add('critical', 'ROBOTS_BLOCKS_RESOURCES', 'robots.txt blocks rendering resources (_next or assets)', null);
        }
    }
    return robots;
}

/* ── sitemap layer ───────────────────────────────────────────────────────── */

async function auditSitemaps() {
    const index = await httpGet(`${SITE_URL}/sitemap.xml`);
    if (!index.ok || index.status !== 200) {
        f.add('critical', 'SITEMAP_INDEX_DOWN', `sitemap.xml returned ${index.status || 'network error'}`, { status: index.status });
        return { children: [], entriesBySegment: {} };
    }
    if (!/<sitemapindex/.test(index.body)) {
        f.add('critical', 'SITEMAP_INDEX_MALFORMED', 'sitemap.xml is not a <sitemapindex>', null);
    }

    // lastmod credibility: Google ignores lastmod it cannot trust. If every
    // child reports the current timestamp on every fetch, the value carries no
    // information and the whole freshness signal is wasted.
    const lastmods = [...index.body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    const nowMs = Date.now();
    const allJustNow = lastmods.length > 1 && lastmods.every((l) => Math.abs(nowMs - Date.parse(l)) < 120000);
    const allIdentical = lastmods.length > 1 && new Set(lastmods).size === 1;
    if (allJustNow && allIdentical) {
        f.add('high', 'SITEMAP_LASTMOD_UNTRUSTWORTHY',
            'Every child sitemap reports lastmod = request time, so the value is generated rather than observed. Search engines discount a lastmod that always equals "now", which forfeits the freshness signal for the whole site.',
            { sample: lastmods.slice(0, 3) });
    }

    const children = parseLocs(index.body);
    if (children.length === 0) f.add('critical', 'SITEMAP_INDEX_EMPTY', 'sitemap index lists no child sitemaps', null);

    const entriesBySegment = {};
    for (const child of children) {
        const res = await httpGet(child);
        const seg = (child.split('/').pop() || '').replace(/\.xml$/, '');
        if (!res.ok || res.status !== 200) {
            f.add('critical', 'SITEMAP_SEGMENT_DOWN', `child sitemap ${seg} returned ${res.status || 'network error'}`, { url: child, status: res.status });
            continue;
        }
        const entries = parseUrlEntries(res.body);
        entriesBySegment[seg] = entries;
        if (entries.length === 0) {
            f.add('high', 'SITEMAP_SEGMENT_EMPTY', `child sitemap ${seg} contains zero URLs`, { url: child });
        }
        // A sitemap must advertise canonical URLs only — a non-apex host, a
        // query string or an unencoded Arabic slug in <loc> makes the entry
        // either a duplicate or invalid XML.
        for (const e of entries.slice(0, 5000)) {
            if (!e.loc.startsWith(`${SITE_URL}/`) && e.loc !== SITE_URL) {
                f.add('high', 'SITEMAP_FOREIGN_HOST', `sitemap ${seg} lists a URL outside the canonical origin`, { loc: e.loc });
                break;
            }
            if (e.loc.includes('?')) {
                f.add('medium', 'SITEMAP_QUERY_URL', `sitemap ${seg} lists a URL with a query string`, { loc: e.loc });
                break;
            }
        }
    }
    return { children, entriesBySegment };
}

/* ── page layer ──────────────────────────────────────────────────────────── */

function auditPage(url, res) {
    const path = url.replace(SITE_URL, '') || '/';
    const facts = extractHtmlFacts(res.body);
    const types = [...jsonLdTypes(facts.jsonLd)];
    const record = {
        url, path, status: res.status, ms: res.ms, bytes: res.body.length,
        cacheControl: res.headers['cache-control'] || null,
        xRobotsTag: res.headers['x-robots-tag'] || null,
        ...facts, jsonLdTypes: types,
    };
    pages.push(record);

    const isMoney = MONEY_PAGES.includes(path);
    const sev = (critical, normal) => (isMoney ? critical : normal);

    if (res.status === 0) {
        f.add('critical', 'PAGE_UNREACHABLE', `${path} could not be fetched`, { url, error: res.error });
        return record;
    }
    if (res.status >= 500) {
        f.add('critical', 'PAGE_5XX', `${path} returned ${res.status}`, { url, status: res.status });
        return record;
    }
    if (res.status === 404) {
        f.add('critical', 'PAGE_404', `${path} returned 404 but is linked or sitemapped as live`, { url });
        return record;
    }
    if (res.status >= 400) {
        f.add('high', 'PAGE_4XX', `${path} returned ${res.status}`, { url, status: res.status });
        return record;
    }

    // Indexability. A noindex on a money page is a silent traffic kill switch.
    const robotsSignal = `${facts.robotsMeta || ''} ${record.xRobotsTag || ''}`.toLowerCase();
    if (/\bnoindex\b/.test(robotsSignal)) {
        f.add(sev('critical', 'high'), 'PAGE_NOINDEX', `${path} is marked noindex`, { url, robots: robotsSignal.trim() });
    }

    if (!facts.canonical) {
        f.add(sev('high', 'medium'), 'PAGE_NO_CANONICAL', `${path} has no rel=canonical`, { url });
    } else {
        let canonicalPath = facts.canonical;
        try { canonicalPath = decodeURIComponent(new URL(facts.canonical, SITE_URL).pathname); } catch { /* keep raw */ }
        const selfPath = decodeURIComponent(path);
        if (canonicalPath !== selfPath) {
            // Cross-canonical is legitimate only when the page is a known
            // alias; on a sitemapped URL it means the URL is de-indexing itself.
            f.add('high', 'PAGE_CANONICAL_MISMATCH',
                `${path} canonicalises to a different URL, so it cannot rank on its own address`,
                { url, canonical: facts.canonical });
        }
        if (!facts.canonical.startsWith(SITE_URL)) {
            f.add('critical', 'PAGE_CANONICAL_FOREIGN_HOST', `${path} canonical points off-origin`, { url, canonical: facts.canonical });
        }
    }

    if (!facts.title) {
        f.add(sev('critical', 'high'), 'PAGE_NO_TITLE', `${path} has no <title>`, { url });
    } else if (facts.titleLength > 65) {
        f.add('low', 'TITLE_TOO_LONG', `${path} title is ${facts.titleLength} chars (truncates in SERPs)`, { url, title: facts.title });
    } else if (facts.titleLength < 15) {
        f.add('medium', 'TITLE_TOO_SHORT', `${path} title is only ${facts.titleLength} chars`, { url, title: facts.title });
    }

    if (!facts.description) {
        f.add(sev('high', 'medium'), 'PAGE_NO_DESCRIPTION', `${path} has no meta description`, { url });
    } else if (facts.descriptionLength > 165) {
        f.add('low', 'DESCRIPTION_TOO_LONG', `${path} description is ${facts.descriptionLength} chars`, { url });
    }

    if (facts.h1.length === 0) {
        f.add(sev('high', 'medium'), 'PAGE_NO_H1', `${path} has no <h1>`, { url });
    } else if (facts.h1.length > 1) {
        f.add('low', 'PAGE_MULTIPLE_H1', `${path} has ${facts.h1.length} <h1> elements`, { url, h1: facts.h1 });
    }

    // LANGUAGE INTEGRITY — an Arabic URL that declares lang="en" contradicts
    // its own hreflang and hands the query to a competitor whose page agrees
    // with itself.
    const isAr = path === '/ar' || path.startsWith('/ar/');
    if (isAr && facts.htmlLang !== 'ar') {
        f.add('critical', 'AR_PAGE_WRONG_LANG',
            `${path} is an Arabic URL but <html lang="${facts.htmlLang}">`, { url, htmlLang: facts.htmlLang });
    }
    if (isAr && facts.htmlDir !== 'rtl') {
        f.add('high', 'AR_PAGE_WRONG_DIR', `${path} is Arabic but <html dir="${facts.htmlDir}">`, { url, htmlDir: facts.htmlDir });
    }
    if (!isAr && facts.htmlLang && facts.htmlLang !== 'en') {
        f.add('medium', 'EN_PAGE_WRONG_LANG', `${path} is an English URL but <html lang="${facts.htmlLang}">`, { url });
    }

    // HEADING LANGUAGE. `<html lang="ar">` being right is not enough: the
    // designed static shells bake their English headings into the file and
    // rely on a client i18n pass to translate them, so /ar/Funds served
    // `<h1>Mutual Funds</h1>`, /ar/News served `<h1>Market stories, clearly
    // told.</h1>` and /ar/Learn served `<h1>Starta Academy</h1>` — each inside
    // a correctly-declared Arabic document, which is why every existing check
    // passed them.
    //
    // A JS-executing crawler recovers the Arabic. The answer-engine crawlers
    // robots.txt explicitly invites (OAI-SearchBot, PerplexityBot, CCBot)
    // largely do not, so the H1 they index for the site's most valuable Arabic
    // URLs was English. Measured as a SHARE of letters, not presence of Latin:
    // Arabic headings legitimately carry tickers and brand names
    // ("أسهم البورصة المصرية (EGX)"), and flagging those would be noise.
    if (isAr && facts.h1.length) {
        for (const heading of facts.h1) {
            const arabic = (heading.match(/[\u0600-\u06FF]/g) || []).length;
            const latin = (heading.match(/[A-Za-z]/g) || []).length;
            const letters = arabic + latin;
            // Too few letters to judge (a bare ticker or a number) — skip.
            if (letters < 8) continue;
            const share = Number((arabic / letters).toFixed(2));

            // ZERO Arabic is the unambiguous defect: an English string sitting
            // in an Arabic template, i.e. the replacement never ran.
            if (arabic === 0) {
                f.add(sev('high', 'medium'), 'AR_PAGE_ENGLISH_HEADING',
                    `${path} is Arabic but its <h1> is English: "${heading.slice(0, 70)}"`,
                    { url, h1: heading, arabicShare: share });
            } else if (share < 0.3) {
                // Arabic present but outweighed. On this site that is almost
                // always an Arabic TEMPLATE carrying an English proper noun —
                // "سهم Fawry For Banking Technology And Electronic Payment
                // (FWRY)" — because some rows have no Arabic company name
                // upstream, and inventing one for a listed issuer is not an
                // option. The template is correct and the page is not broken,
                // so this is reported for visibility at `low` rather than
                // raised as a defect: a check that fires daily on something
                // nobody can fix is how monitoring gets ignored.
                f.add('low', 'AR_HEADING_MOSTLY_LATIN',
                    `${path} has an Arabic <h1> dominated by a Latin proper noun (likely a missing Arabic name upstream): "${heading.slice(0, 70)}"`,
                    { url, h1: heading, arabicShare: share });
            }
        }
    }

    // hreflang reciprocity: a declared alternate must exist, be canonical, and
    // point back. A one-way hreflang is ignored entirely by Google.
    const hl = facts.hreflang;
    if (Object.keys(hl).length > 0) {
        if (hl.ar && hl.en) {
            const expectSelf = isAr ? hl.ar : hl.en;
            let selfMatches = false;
            try { selfMatches = decodeURIComponent(new URL(expectSelf, SITE_URL).pathname) === decodeURIComponent(path); } catch { /* ignore */ }
            if (!selfMatches) {
                f.add('high', 'HREFLANG_NO_SELF_REFERENCE',
                    `${path} declares hreflang alternates but none points at itself (self-reference is required)`,
                    { url, hreflang: hl });
            }
        }
        if (!hl['x-default']) {
            f.add('low', 'HREFLANG_NO_XDEFAULT', `${path} has hreflang alternates but no x-default`, { url });
        }
    }

    // Structured data must parse and must describe the template it is on.
    if (facts.jsonLdErrors.length) {
        f.add('high', 'JSONLD_PARSE_ERROR', `${path} has ${facts.jsonLdErrors.length} unparseable JSON-LD block(s)`, { url, errors: facts.jsonLdErrors });
    }
    for (const rule of REQUIRED_SCHEMA) {
        if (rule.match.test(path)) {
            const missing = rule.types.filter((t) => !types.includes(t));
            if (missing.length) {
                f.add('high', 'SCHEMA_MISSING',
                    `${path} (${rule.label}) is missing required schema: ${missing.join(', ')}`,
                    { url, present: types, missing });
            }
        }
    }

    // Thin content: crawlable but not competitive.
    if (facts.wordCount < 300) {
        f.add(sev('high', 'medium'), 'PAGE_THIN', `${path} renders only ${facts.wordCount} words server-side`, { url, words: facts.wordCount });
    }

    // Orphan risk: a page with no outbound internal links is a PageRank dead end.
    if (facts.internalLinks < 5) {
        f.add('medium', 'PAGE_FEW_INTERNAL_LINKS', `${path} has only ${facts.internalLinks} internal links`, { url, links: facts.internalLinks });
    }

    // Uncacheable HTML is a TTFB tax, but on this stack it is a PLATFORM
    // constraint, not a per-page defect: Vercel stamps every force-dynamic App
    // Router route with no-store and overrides both middleware and
    // next.config headers (verified 2026-09-03). Emitting it per URL produced
    // 153 identical medium findings in one run, which is how monitoring gets
    // ignored. It is counted here and reported ONCE, in aggregate, below.
    if (record.cacheControl && /no-store|private/.test(record.cacheControl)) {
        uncacheable.push(path);
    }

    return record;
}

/* ── cross-page defects ──────────────────────────────────────────────────── */

function auditCrossPage() {
    // One aggregate finding for the whole uncacheable set.
    if (uncacheable.length) {
        const pct = Math.round((uncacheable.length / Math.max(pages.length, 1)) * 100);
        f.add('medium', 'PAGES_UNCACHEABLE',
            `${uncacheable.length} of ${pages.length} audited pages (${pct}%) are served with no-store, so they get 0% CDN hits and pay a full origin render on every crawl`,
            { count: uncacheable.length, examples: uncacheable.slice(0, 10) });
    }

    const byTitle = new Map();
    const byDescription = new Map();
    for (const p of pages) {
        if (p.status !== 200) continue;
        if (p.title) {
            if (!byTitle.has(p.title)) byTitle.set(p.title, []);
            byTitle.get(p.title).push(p.path);
        }
        if (p.description) {
            if (!byDescription.has(p.description)) byDescription.set(p.description, []);
            byDescription.get(p.description).push(p.path);
        }
    }
    for (const [title, paths] of byTitle) {
        if (paths.length > 1) {
            f.add('high', 'DUPLICATE_TITLE',
                `${paths.length} URLs share the title "${title}" — they compete for the same query instead of one ranking`,
                { title, paths: paths.slice(0, 8) });
        }
    }
    for (const [desc, paths] of byDescription) {
        if (paths.length > 1) {
            f.add('medium', 'DUPLICATE_DESCRIPTION', `${paths.length} URLs share one meta description`, { paths: paths.slice(0, 8) });
        }
    }
}

/* ── runner ──────────────────────────────────────────────────────────────── */

function sampleEvenly(arr, n) {
    if (arr.length <= n) return arr.slice();
    // Deterministic even stride, not Math.random: two consecutive runs must
    // audit the same URLs or a "new" finding could just be a new sample.
    const step = arr.length / n;
    return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

async function main() {
    const started = Date.now();
    console.log(`[seo-audit] target=${SITE_URL} mode=${QUICK ? 'quick' : 'full'} sample=${SAMPLE}`);

    await auditCrawlPolicy();
    const { entriesBySegment } = await auditSitemaps();

    const targets = new Set(MONEY_PAGES.map((p) => SITE_URL + p));
    if (!QUICK) {
        for (const seg of SEGMENTS) {
            const entries = entriesBySegment[seg] || [];
            for (const e of sampleEvenly(entries, SAMPLE)) targets.add(e.loc);
        }
    }

    const list = [...targets];
    console.log(`[seo-audit] fetching ${list.length} URLs (concurrency ${CONCURRENCY})`);
    await mapLimit(list, CONCURRENCY, async (url) => {
        // redirect:'manual' so a 308 is a FINDING, not silently followed —
        // a sitemapped URL that redirects is a wasted crawl budget entry.
        const head = await httpGet(url, { redirect: 'manual', retries: 1 });
        if (head.status >= 300 && head.status < 400) {
            const path = url.replace(SITE_URL, '') || '/';
            const isSitemapped = Object.values(entriesBySegment).some((es) => es.some((e) => e.loc === url));
            f.add(isSitemapped ? 'high' : 'medium', 'URL_REDIRECTS',
                `${path} returns ${head.status} instead of 200${isSitemapped ? ' but is listed in a sitemap' : ''}`,
                { url, status: head.status, location: head.headers.location || null });
            return;
        }
        let res = await httpGet(url, { redirect: 'follow' });
        // A network abort under OUR OWN concurrency is not "the page is
        // unreachable". Six URLs were reported CRITICAL in one run and every
        // one of them answered 200 in under two seconds when probed on its
        // own. Confirm serially, with a longer budget, before declaring a
        // page down — a false critical in a self-healing system trains people
        // to ignore the real ones.
        if (res.status === 0) {
            await sleep(1500);
            res = await httpGet(url, { redirect: 'follow', timeoutMs: 45000, retries: 2 });
        }
        auditPage(url, res);
    });

    auditCrossPage();

    const counts = f.countBy();
    const score = healthScore(counts, f.all(), pages.length);
    const report = {
        generatedAt: nowIso(),
        site: SITE_URL,
        mode: QUICK ? 'quick' : 'full',
        durationMs: Date.now() - started,
        urlsAudited: pages.length,
        sitemapTotals: Object.fromEntries(Object.entries(entriesBySegment).map(([k, v]) => [k, v.length])),
        indexableFootprint: Object.values(entriesBySegment).reduce((a, v) => a + v.length, 0),
        healthScore: score,
        counts,
        findings: f.all(),
        pages: pages.map((p) => ({
            path: p.path, status: p.status, ms: p.ms, title: p.title, titleLength: p.titleLength,
            descriptionLength: p.descriptionLength, canonical: p.canonical, htmlLang: p.htmlLang,
            htmlDir: p.htmlDir, h1: p.h1[0] || null, h2Count: p.h2Count, wordCount: p.wordCount,
            internalLinks: p.internalLinks, jsonLdTypes: p.jsonLdTypes, hreflang: Object.keys(p.hreflang),
            cacheControl: p.cacheControl,
        })),
    };

    if (OUT) {
        writeFileSync(OUT, JSON.stringify(report, null, 2));
        console.log(`[seo-audit] report written to ${OUT}`);
    }

    console.log(`\n[seo-audit] health score ${score}/100 over ${pages.length} URLs (${report.indexableFootprint} sitemapped)`);
    console.log(`[seo-audit] critical=${counts.critical} high=${counts.high} medium=${counts.medium} low=${counts.low}`);
    for (const finding of f.all().slice(0, 40)) {
        console.log(`  [${finding.severity.toUpperCase()}] ${finding.code}: ${finding.message}`);
    }

    const threshold = sevRank(FAIL_ON);
    const breaching = f.all().filter((x) => sevRank(x.severity) <= threshold);
    if (breaching.length) {
        console.error(`\n[seo-audit] FAIL — ${breaching.length} finding(s) at or above "${FAIL_ON}"`);
        process.exit(1);
    }
    console.log(`\n[seo-audit] PASS — no findings at or above "${FAIL_ON}"`);
}

main().catch((e) => {
    // Exit 2, never 1: "the audit crashed" must never be read as "the site failed".
    console.error(`[seo-audit] FATAL: ${e.stack || e.message}`);
    process.exit(2);
});
