/**
 * INDEXNOW SUBMITTER — event-driven crawl notification.
 *
 * Replaces the manual scripts/indexnow-ping.mjs, which submitted the ENTIRE
 * sitemap every run and was wired to nothing, so it had never actually run in
 * production. Two problems fixed here:
 *
 *  1. DELTA, not everything. Re-submitting all ~9,000 URLs on every deploy is
 *     noise that search engines learn to discount. This submits only URLs whose
 *     sitemap <lastmod> falls inside a window, so "what changed" stays a real
 *     signal. The window is stateless — derived from the sitemap itself — so
 *     the job is idempotent and needs no state file to keep in sync.
 *  2. HONEST FAILURE. A non-2xx from the endpoint is reported and exits
 *     non-zero rather than being swallowed.
 *
 *   node scripts/seo/indexnow.mjs --since 24h        # changed in last 24h
 *   node scripts/seo/indexnow.mjs --since 2h --dry-run
 *   node scripts/seo/indexnow.mjs --all              # full resubmit (rare)
 *   node scripts/seo/indexnow.mjs <url> [<url>…]     # explicit URLs
 *
 * The key file (public/<KEY>.txt) must stay reachable — the endpoint fetches it
 * to prove we own the host. It is PUBLIC BY DESIGN (the protocol requires it),
 * so it is not a secret and belongs in the repo.
 */

import { SITE_URL, httpGet, parseLocs, parseUrlEntries } from './lib.mjs';

const HOST = new URL(SITE_URL).host;
const KEY = process.env.INDEXNOW_KEY || 'de80daa1942341b49e8a9f59c48e1465';
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_PER_REQUEST = 10000;

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const ALL = args.includes('--all');
/**
 * The pages that must be re-announced after EVERY deploy.
 *
 * `--since` is data-driven: it reads sitemap `lastmod`, so it only sees content
 * changes. A TEMPLATE change — a schema fix, a new internal-link block, a
 * localisation repair — moves no lastmod anywhere, so all three deploys on
 * 2026-09-05 submitted 0 URLs and the engines were never told to re-crawl the
 * pages that had actually changed. This is the fixed list that closes that gap.
 */
const MONEY_PAGES = args.includes('--money-pages');
const MONEY_PATHS = [
    '/', '/ar',
    '/Funds', '/ar/Funds',
    '/Funds/best-mutual-funds-egypt-2026', '/ar/Funds/best-mutual-funds-egypt-2026',
    '/Funds/prices-today', '/ar/Funds/prices-today',
    '/Funds/categories', '/ar/Funds/categories',
    '/Funds/providers', '/ar/Funds/providers',
    '/Funds/fees', '/ar/Funds/fees',
    '/Funds/risk', '/ar/Funds/risk',
    '/companies', '/ar/companies',
    '/sectors', '/ar/sectors',
    '/markets', '/ar/markets',
    '/markets/egx30', '/ar/markets/egx30',
    '/methodology', '/ar/methodology',
    '/News', '/ar/News', '/Learn', '/ar/Learn',
    '/Market-Pulse', '/ar/Market-Pulse',
];
const explicit = args.filter((a) => a.startsWith('http'));
const sinceArg = (() => {
    const i = args.indexOf('--since');
    return i === -1 ? '24h' : args[i + 1];
})();

/** "24h" | "90m" | "7d" -> milliseconds. */
function parseWindow(spec) {
    const m = /^(\d+)([mhd])$/.exec(String(spec));
    if (!m) throw new Error(`unparseable --since "${spec}" (use 90m, 24h, 7d)`);
    const n = Number(m[1]);
    return n * ({ m: 60000, h: 3600000, d: 86400000 })[m[2]];
}

async function collectChanged(windowMs) {
    const index = await httpGet(`${SITE_URL}/sitemap.xml`);
    if (!index.ok || index.status !== 200) throw new Error(`sitemap index unreachable (${index.status})`);
    const children = parseLocs(index.body).filter((u) => u.endsWith('.xml'));
    if (children.length === 0) throw new Error('sitemap index lists no child sitemaps');

    const cutoff = Date.now() - windowMs;
    const changed = new Set();
    const noLastmod = new Set();
    for (const child of children) {
        const res = await httpGet(child);
        if (!res.ok || res.status !== 200) {
            console.error(`WARN: skipping ${child} (${res.status})`);
            continue;
        }
        for (const e of parseUrlEntries(res.body)) {
            if (!e.loc.startsWith(SITE_URL)) continue;
            if (ALL) {
                changed.add(e.loc);
                continue;
            }
            if (!e.lastmod) {
                // No lastmod means we cannot tell whether it changed. Submitting
                // it every run would be exactly the noise this job avoids, so
                // it is counted and skipped, not guessed at.
                noLastmod.add(e.loc);
                continue;
            }
            const t = Date.parse(e.lastmod);
            if (Number.isFinite(t) && t >= cutoff) changed.add(e.loc);
        }
    }
    return { urls: [...changed], skippedNoLastmod: noLastmod.size };
}

async function submit(urlList) {
    let failed = false;
    for (let i = 0; i < urlList.length; i += MAX_PER_REQUEST) {
        const batch = urlList.slice(i, i + MAX_PER_REQUEST);
        if (DRY) {
            console.log(`[dry-run] would POST ${batch.length} URLs to ${ENDPOINT}`);
            batch.slice(0, 5).forEach((u) => console.log(`   ${u}`));
            if (batch.length > 5) console.log(`   … and ${batch.length - 5} more`);
            continue;
        }
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch }),
        });
        // 200 OK and 202 Accepted are both success. 4xx means the key file is
        // unreachable or the host does not match — a real, actionable failure.
        console.log(`POST ${batch.length} URLs -> ${res.status} ${res.statusText}`);
        if (res.status !== 200 && res.status !== 202) {
            console.error(await res.text().catch(() => ''));
            failed = true;
        }
    }
    return !failed;
}

async function main() {
    // Verify the key file before submitting: a 404 here is the single most
    // common cause of a silently rejected submission.
    const keyProbe = await httpGet(KEY_LOCATION, { retries: 1 });
    if (keyProbe.status !== 200 || keyProbe.body.trim() !== KEY) {
        console.error(`FATAL: key file ${KEY_LOCATION} returned ${keyProbe.status} or does not contain the key.`);
        console.error('IndexNow would reject every submission until this resolves.');
        process.exit(1);
    }
    console.log(`[indexnow] key file verified at ${KEY_LOCATION}`);

    let urls;
    if (MONEY_PAGES) {
        urls = MONEY_PATHS.map((p) => SITE_URL + p);
        console.log(`[indexnow] submitting ${urls.length} money page(s) — every deploy, regardless of lastmod`);
    } else if (explicit.length) {
        urls = explicit;
        console.log(`[indexnow] submitting ${urls.length} explicit URL(s)`);
    } else {
        const windowMs = ALL ? 0 : parseWindow(sinceArg);
        const { urls: changed, skippedNoLastmod } = await collectChanged(windowMs);
        urls = changed;
        console.log(
            `[indexnow] ${urls.length} URL(s) changed within ${ALL ? 'all time' : sinceArg}` +
                (skippedNoLastmod ? ` (${skippedNoLastmod} URLs carry no lastmod and were not guessed at)` : '')
        );
    }

    if (urls.length === 0) {
        // Nothing changed is a NORMAL outcome, not a failure.
        console.log('[indexnow] nothing to submit — exiting 0');
        return;
    }
    const ok = await submit(urls);
    if (!ok) process.exit(1);
    console.log('[indexnow] done');
}

main().catch((e) => {
    console.error(`[indexnow] FATAL: ${e.message}`);
    process.exit(1);
});
