/**
 * ============================================================================
 * ARABIC LINK AUDIT — does a live Arabic page link out of the Arabic tree?
 * ============================================================================
 *
 * The build gates in verify-route-aliases.mjs police the SOURCE. This polices
 * the RESULT, against the deployed site, because the two can disagree in a way
 * no static check can see: the nav that sent Arabic readers to English pages on
 * /ar/symbol/[id] rendered only after hydration, so it was absent from the
 * server HTML and every server-side audit called that page clean.
 *
 * WHAT IT REPORTS
 *   For each Arabic page family: every internal link whose path has an Arabic
 *   twin but was written without the /ar prefix — i.e. every link that would
 *   drop the reader into English.
 *
 * WHAT IT DELIBERATELY DOES NOT REPORT
 *   The language switcher and the "…in English" cross-links. Those point at
 *   the other tree ON PURPOSE and are recognised by aria-label / hreflang="en"
 *   / data-lang-switch, the same three markers components/i18n/LangLinkGuard
 *   uses to decide what to leave alone. Keep the two lists in step.
 *
 * LIMIT: this reads server HTML, so it cannot see links a client component
 * renders after hydration. For those, drive a real browser. The guard is what
 * covers them at runtime.
 *
 *     node scripts/audit-ar-links.mjs [https://startamarkets.com]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = (process.argv[2] || 'https://startamarkets.com').replace(/\/$/, '');
const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/126 Safari/537.36' };

const { patterns } = JSON.parse(await readFile(path.join(root, 'lib/ar-twin-routes.json'), 'utf8'));
const TWIN = patterns.map((p) => new RegExp(p));
/**
 * The SAME rule lib/localized-href.ts applies, or this audit reports links the
 * helper would (correctly) refuse to rewrite. A dynamic pattern matches a
 * filename too: `^/Funds/[^/]+$` matches /Funds/prices-today.csv, whose /ar
 * form is a 404. Only an EXACT pattern may claim a file.
 */
const hasTwin = (p) => {
    const looksLikeFile = /\.[A-Za-z0-9]{1,8}$/.test(p.slice(p.lastIndexOf('/') + 1));
    return TWIN.some((re) => re.test(p) && !(looksLikeFile && re.source.includes('[^/]+')));
};

/** One representative of every Arabic page family. */
const PAGES = [
    '/ar', '/ar/Funds', '/ar/Funds/categories', '/ar/Funds/prices-today', '/ar/Funds/providers',
    '/ar/Funds/fees', '/ar/Funds/risk', '/ar/Funds/best-mutual-funds-egypt-2026',
    '/ar/News', '/ar/Market-Pulse', '/ar/markets', '/ar/markets/egx30', '/ar/markets/movers',
    '/ar/markets/largest-companies', '/ar/markets/top-dividend-yield', '/ar/markets/lowest-pe-stocks',
    '/ar/markets/dividend-calendar', '/ar/sectors', '/ar/companies', '/ar/Learn', '/ar/Learn/glossary',
    '/ar/Calculators', '/ar/RiskAssessment', '/ar/about', '/ar/contact', '/ar/methodology',
    '/ar/corrections', '/ar/editorial-policy',
];

async function grab(p) {
    const r = await fetch(ORIGIN + p, { headers: UA, redirect: 'follow' });
    return { status: r.status, html: await r.text() };
}

/** An anchor that crosses the trees ON PURPOSE, by any of the three markers. */
function deliberate(tag) {
    return /hreflang=["']?en/i.test(tag)
        || /data-lang-switch/i.test(tag)
        || /aria-label="[^"]*(English version|النسخة العربية)/i.test(tag);
}

let leaks = 0;
const results = await Promise.all(PAGES.map(async (p) => {
    try {
        const { status, html } = await grab(p);
        const bad = [];
        for (const m of html.matchAll(/<a\b([^>]*?)href="(\/[^"]*)"([^>]*)>/g)) {
            const href = m[2];
            if (href.startsWith('/ar/') || href === '/ar') continue;
            if (/^\/(_next|assets|api)\b/.test(href)) continue;
            if (!hasTwin(href.split(/[?#]/)[0].replace(/(.)\/$/, '$1'))) continue;
            if (deliberate(m[1] + m[3])) continue;
            bad.push(href);
        }
        return { p, status, bad };
    } catch (e) {
        return { p, error: String(e) };
    }
}));

for (const r of results) {
    if (r.error) { console.log(`ERR  ${r.p}  ${r.error}`); leaks++; continue; }
    const counts = r.bad.reduce((m, h) => m.set(h, (m.get(h) || 0) + 1), new Map());
    leaks += r.bad.length;
    console.log(`${r.bad.length ? 'LEAK' : ' ok '} ${String(r.bad.length).padStart(3)}  ${r.p}`);
    for (const [h, c] of counts) console.log(`          ×${c} ${h}`);
}

console.log(`\n${leaks === 0 ? 'OK' : 'FAIL'}: ${leaks} link(s) leave the Arabic tree across ${PAGES.length} pages (${ORIGIN}).`);
process.exit(leaks === 0 ? 0 : 1);
