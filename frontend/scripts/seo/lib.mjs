/**
 * Shared primitives for the SEO operating system (scripts/seo/*).
 *
 * Design rules for everything in this directory:
 *  - IDEMPOTENT: a job may run twice with no side effect beyond the second read.
 *  - HONEST: a missing credential or a failed upstream produces a "skipped" /
 *    "error" status, never a fabricated number. Nothing here invents metrics.
 *  - DETERMINISTIC: same input HTML → same findings, so a diff between two runs
 *    is a real regression, not sampling noise.
 *  - NO WRITES TO THE SITE: these jobs observe production and report. The only
 *    outbound write is the IndexNow submission, which is a crawl hint.
 */

export const SITE_URL = process.env.SEO_SITE_URL || 'https://startamarkets.com';
export const USER_AGENT = 'StartaMarkets-SEO-Bot/1.0 (+https://startamarkets.com/about)';

/** Severity ladder. Order matters: index = rank, used for sorting and gating. */
export const SEVERITY = ['critical', 'high', 'medium', 'low', 'info'];
export const sevRank = (s) => {
    const i = SEVERITY.indexOf(s);
    return i === -1 ? SEVERITY.length : i;
};

/* ── HTTP ────────────────────────────────────────────────────────────────── */

/**
 * fetch with timeout + bounded retry. Retries only on network errors and 5xx —
 * a 404 is an ANSWER, not a failure, and retrying it would mask the finding.
 */
export async function httpGet(url, { timeoutMs = 25000, retries = 2, redirect = 'follow', userAgent = USER_AGENT } = {}) {
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), timeoutMs);
        const started = Date.now();
        try {
            const res = await fetch(url, {
                redirect,
                signal: ctl.signal,
                headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
            });
            const body = await res.text();
            clearTimeout(timer);
            if (res.status >= 500 && attempt < retries) {
                await sleep(1000 * (attempt + 1));
                continue;
            }
            return {
                ok: true,
                status: res.status,
                url: res.url,
                headers: Object.fromEntries(res.headers.entries()),
                body,
                ms: Date.now() - started,
                redirected: res.redirected,
            };
        } catch (err) {
            clearTimeout(timer);
            lastErr = err;
            if (attempt < retries) await sleep(1000 * (attempt + 1));
        }
    }
    return { ok: false, status: 0, url, headers: {}, body: '', ms: 0, error: String(lastErr && lastErr.message) };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Bounded-concurrency map. Production is a live site — an unbounded fan-out
 * would be a self-inflicted load test, and Vercel would rate-limit us into
 * false "site is down" findings.
 */
export async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        for (;;) {
            const i = cursor++;
            if (i >= items.length) return;
            out[i] = await fn(items[i], i);
        }
    });
    await Promise.all(workers);
    return out;
}

/* ── HTML field extraction ───────────────────────────────────────────────── */
// Regex, not a DOM parser: zero dependencies, and we only need a fixed set of
// head-level fields whose shape Next.js controls. Every extractor is tolerant
// of attribute order and quote style, and returns null (never throws) so one
// malformed page cannot abort a crawl.

const attr = (tag, name) => {
    const m = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag);
    return m ? m[1] : null;
};

export function extractHtmlFacts(html) {
    const facts = {
        title: null,
        titleLength: 0,
        description: null,
        descriptionLength: 0,
        canonical: null,
        robotsMeta: null,
        htmlLang: null,
        htmlDir: null,
        h1: [],
        h2Count: 0,
        hreflang: {},
        /** hreflang entries PER LANGUAGE — two tags for one language is a
         *  conflicting cluster (the defect that shipped on 82 hub pages). */
        hreflangCount: {},
        /** Every <time datetime> on the page — the as-of/freshness signal. */
        timeDates: [],
        /** <h2>/<h3> text, for language-integrity checks below the H1. */
        subheadings: [],
        /** Visible text (scripts/styles stripped). */
        text: '',
        /** data-metric="key" [data-entity="id"] elements — the cross-surface
         *  metric contract (docs/DATA_GOVERNANCE.md §7): one key (and entity)
         *  must print one value on every page that carries it. */
        metrics: [],
        /** data-fund-status="dormant|active" on fund pages — a page that
         *  declares dormancy is honest about an old NAV, not stale. */
        fundStatus: null,
        ogTitle: null,
        ogImage: null,
        jsonLd: [],
        jsonLdErrors: [],
        wordCount: 0,
        internalLinks: 0,
        maxImagePreview: null,
    };
    if (!html) return facts;

    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (title) {
        facts.title = decodeEntities(title[1].trim());
        facts.titleLength = facts.title.length;
    }

    for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
        const tag = m[0];
        const nameAttr = (attr(tag, 'name') || attr(tag, 'property') || '').toLowerCase();
        const content = attr(tag, 'content');
        if (nameAttr === 'description' && content !== null && facts.description === null) {
            facts.description = decodeEntities(content.trim());
            facts.descriptionLength = facts.description.length;
        } else if (nameAttr === 'robots' && content !== null) {
            facts.robotsMeta = content.toLowerCase();
            const mip = /max-image-preview\s*:\s*([a-z]+)/.exec(facts.robotsMeta);
            if (mip) facts.maxImagePreview = mip[1];
        } else if (nameAttr === 'og:title' && content !== null) {
            facts.ogTitle = decodeEntities(content.trim());
        } else if (nameAttr === 'og:image' && content !== null) {
            facts.ogImage = content.trim();
        }
    }

    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
        const tag = m[0];
        const rel = (attr(tag, 'rel') || '').toLowerCase();
        const href = attr(tag, 'href');
        if (!href) continue;
        if (rel === 'canonical' && facts.canonical === null) {
            facts.canonical = href.trim();
        } else if (rel === 'alternate') {
            // Next.js emits `hrefLang` (React camelCase survives into the HTML);
            // hand-written tags use `hreflang`. Accept both or we would report a
            // false "missing hreflang" on every App Router page.
            const hl = attr(tag, 'hreflang') || attr(tag, 'hrefLang');
            if (hl) {
                const key = hl.toLowerCase();
                // COUNT, do not just overwrite. The old `facts.hreflang[key] =
                // href` silently kept the last tag, which is precisely how two
                // clusters on one page (own + shell's) stayed invisible.
                facts.hreflangCount[key] = (facts.hreflangCount[key] || 0) + 1;
                if (!(key in facts.hreflang)) facts.hreflang[key] = href.trim();
            }
        }
    }

    const fs = /data-fund-status=["'](dormant|active)["']/i.exec(html);
    if (fs) facts.fundStatus = fs[1].toLowerCase();

    const htmlTag = /<html\b[^>]*>/i.exec(html);
    if (htmlTag) {
        facts.htmlLang = attr(htmlTag[0], 'lang');
        facts.htmlDir = attr(htmlTag[0], 'dir');
    }

    for (const m of html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)) {
        const text = stripTags(m[1]).trim();
        if (text) facts.h1.push(text);
    }
    facts.h2Count = (html.match(/<h2\b/gi) || []).length;
    for (const m of html.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)) {
        const text = stripTags(m[1]).trim();
        if (text) facts.subheadings.push(text);
    }
    // React renders `dateTime` as `datetime`; hand-written shells use the same.
    for (const m of html.matchAll(/<time\b[^>]*datetime=["']([^"']+)["']/gi)) facts.timeDates.push(m[1]);

    for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        const raw = m[1].trim();
        try {
            facts.jsonLd.push(JSON.parse(raw));
        } catch (e) {
            facts.jsonLdErrors.push(String(e.message).slice(0, 160));
        }
    }

    facts.text = stripTags(
        html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    );
    facts.wordCount = facts.text.split(/\s+/).filter(Boolean).length;

    facts.internalLinks = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)].filter(
        ([, href]) => href.startsWith('/') || href.startsWith(SITE_URL)
    ).length;
    // Internal anchors with their visible text (scripts stripped first so a
    // template literal inside a <script> is never mistaken for a link).
    facts.anchors = [];
    const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    for (const m of noScript.matchAll(/<a\b[^>]*?href=["']([^"']+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi)) {
        let href = m[1];
        if (href.startsWith(SITE_URL)) href = href.slice(SITE_URL.length) || '/';
        if (!href.startsWith('/')) continue;
        try { href = decodeURI(href); } catch { /* keep raw */ }
        facts.anchors.push({ href: href.split(/[?#]/)[0].replace(/\/$/, '') || '/', text: stripTags(m[2]).trim().slice(0, 80) });
    }

    // Tagged metrics. The element's own tag closes the capture, so a value may
    // wrap a differently-named child (<div data-metric><span>…</span></div>).
    for (const m of noScript.matchAll(/<([a-z][a-z0-9]*)\b([^>]*?\sdata-metric=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/\1>/gi)) {
        const entity = attr(`<x ${m[2]}>`, 'data-entity');
        facts.metrics.push({ key: m[3], entity: entity || null, value: normalizeMetricValue(stripTags(m[4])) });
    }

    return facts;
}

export const stripTags = (s) => decodeEntities(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ');

/**
 * Canonical form of a printed metric so the SAME figure compares equal across
 * templates: bidi isolates and marks removed (ltrNum wraps Arabic-page numbers
 * in U+2066/U+2069), Arabic-Indic digits → ASCII, whitespace and thousands
 * separators dropped, an explicit leading "+" dropped ("+81.50%" = "81.50%").
 */
export function normalizeMetricValue(s) {
    return String(s)
        .replace(/[⁦-⁩‎‏؜]/g, '')
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\s,]+/g, '')
        .replace(/^\+/, '')
        .trim();
}

export function decodeEntities(s) {
    return String(s)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&#x27;/gi, "'");
}

/** Flatten every @type in a JSON-LD graph (handles @graph, arrays, nesting). */
export function jsonLdTypes(node, acc = new Set()) {
    if (!node || typeof node !== 'object') return acc;
    if (Array.isArray(node)) {
        for (const n of node) jsonLdTypes(n, acc);
        return acc;
    }
    const t = node['@type'];
    if (typeof t === 'string') acc.add(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && acc.add(x));
    for (const v of Object.values(node)) {
        if (v && typeof v === 'object') jsonLdTypes(v, acc);
    }
    return acc;
}

/* ── sitemap parsing ─────────────────────────────────────────────────────── */

export function parseLocs(xml) {
    return [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decodeEntities(m[1]));
}

export function parseUrlEntries(xml) {
    return [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => {
        const block = m[1];
        const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(block);
        const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(block);
        return { loc: loc ? decodeEntities(loc[1]) : null, lastmod: lastmod ? lastmod[1] : null };
    }).filter((e) => e.loc);
}

/* ── findings ────────────────────────────────────────────────────────────── */

export function makeFindings() {
    const findings = [];
    return {
        add(severity, code, message, evidence) {
            findings.push({ severity, code, message, evidence: evidence ?? null });
        },
        all: () => findings.slice().sort((a, b) => sevRank(a.severity) - sevRank(b.severity)),
        countBy() {
            const c = Object.fromEntries(SEVERITY.map((s) => [s, 0]));
            for (const f of findings) c[f.severity] = (c[f.severity] || 0) + 1;
            return c;
        },
    };
}

/**
 * SEO Health Score, 0-100.
 *
 * RATE-BASED, not absolute. An earlier version summed raw finding counts,
 * which made the score depend on how many URLs were sampled: the same healthy
 * site scored 74 on a 28-URL quick run and 0 on a 158-URL full run, purely
 * because a bigger sample finds proportionally more of everything. A score
 * that moves when the sample size moves cannot be trended, and trending it is
 * the entire point.
 *
 * So per-page findings are scored as a RATE (findings per audited URL) and
 * site-level findings (robots, sitemap integrity) keep an absolute weight —
 * there is only ever one robots.txt, so "2 broken" is not 2/158 of anything.
 *
 * Weights stay fixed so a drop between two runs is a real regression and never
 * a re-weighting artefact.
 */
const SITE_LEVEL_CODES = new Set([
    'ROBOTS_UNREACHABLE', 'ROBOTS_BLOCKS_SITE', 'ROBOTS_NO_SITEMAP', 'ROBOTS_BLOCKS_RESOURCES',
    'ROBOTS_AI_BOT_MISSING', 'SITEMAP_INDEX_DOWN', 'SITEMAP_INDEX_MALFORMED', 'SITEMAP_INDEX_EMPTY',
    'SITEMAP_SEGMENT_DOWN', 'SITEMAP_SEGMENT_EMPTY', 'SITEMAP_LASTMOD_UNTRUSTWORTHY',
    'SITEMAP_FOREIGN_HOST', 'SITEMAP_QUERY_URL',
]);

const WEIGHT = { critical: 100, high: 25, medium: 6, low: 1 };

export function healthScore(counts, findings = [], urlsAudited = 0) {
    // Backwards-compatible: with no findings list, fall back to the absolute
    // model so an old report still produces a number.
    if (!findings.length) {
        const penalty =
            (counts.critical || 0) * 25 + (counts.high || 0) * 6 +
            (counts.medium || 0) * 1.5 + (counts.low || 0) * 0.3;
        return Math.max(0, Math.round((100 - penalty) * 10) / 10);
    }

    const n = Math.max(urlsAudited, 1);
    let penalty = 0;
    for (const f of findings) {
        const w = WEIGHT[f.severity];
        if (w === undefined) continue;
        // Site-level: full weight, once. Per-page: weight × share of pages hit.
        penalty += SITE_LEVEL_CODES.has(f.code) ? w : w / n;
    }
    return Math.max(0, Math.round((100 - penalty) * 10) / 10);
}

/** Discord webhook post. Never throws — an alerting failure must not fail the job. */
export async function notifyDiscord(content) {
    const hook = process.env.DISCORD_WEBHOOK_URL;
    if (!hook) return { sent: false, reason: 'DISCORD_WEBHOOK_URL not set' };
    try {
        const res = await fetch(hook, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            // Discord hard-caps message content at 2000 chars.
            body: JSON.stringify({ content: content.slice(0, 1990) }),
        });
        return { sent: res.ok, status: res.status };
    } catch (e) {
        return { sent: false, reason: String(e.message) };
    }
}

export const nowIso = () => new Date().toISOString();
