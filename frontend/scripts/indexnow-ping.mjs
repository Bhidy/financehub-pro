/**
 * IndexNow submitter — pushes our URLs to IndexNow (Bing, Yandex, and the
 * shared IndexNow network) so fresh/changed pages get crawled in minutes
 * instead of waiting for a scheduled recrawl. Complements the sitemaps.
 *
 * Key file (must stay reachable): public/<KEY>.txt containing <KEY>.
 *
 * Usage:
 *   node scripts/indexnow-ping.mjs                 # submit every sitemap URL
 *   node scripts/indexnow-ping.mjs --dry-run       # print what would be sent
 *   node scripts/indexnow-ping.mjs <url> [<url>…]  # submit only these URLs
 *
 * Wire it to run after a production deploy (Vercel deploy hook / CI step /
 * cron) to activate real-time submission; running it by hand also works.
 */

const HOST = 'startamarkets.com';
const SITE = `https://${HOST}`;
const KEY = 'de80daa1942341b49e8a9f59c48e1465';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const SITEMAP_INDEX = `${SITE}/sitemap.xml`;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const explicitUrls = args.filter((a) => a.startsWith('http'));

function locs(xml) {
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function fetchText(url) {
    const res = await fetch(url, { headers: { 'user-agent': 'StartaMarkets-IndexNow/1.0' } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
    return res.text();
}

async function collectSitemapUrls() {
    const index = await fetchText(SITEMAP_INDEX);
    const children = locs(index).filter((u) => u.endsWith('.xml'));
    const targets = children.length ? children : [SITEMAP_INDEX];
    const all = new Set();
    for (const child of targets) {
        try {
            const xml = await fetchText(child);
            for (const u of locs(xml)) if (u.startsWith(SITE)) all.add(u);
        } catch (e) {
            console.error(`WARN: could not read ${child}: ${e.message}`);
        }
    }
    return [...all];
}

async function submit(urlList) {
    // IndexNow accepts up to 10,000 URLs per request.
    for (let i = 0; i < urlList.length; i += 10000) {
        const batch = urlList.slice(i, i + 10000);
        const body = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: batch };
        if (dryRun) {
            console.log(`[dry-run] would POST ${batch.length} URLs to ${ENDPOINT}`);
            continue;
        }
        const res = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(body),
        });
        // 200 OK or 202 Accepted both mean success; 4xx means key/host problem.
        console.log(`POST ${batch.length} URLs -> ${res.status} ${res.statusText}`);
        if (!res.ok && res.status !== 202) {
            console.error(await res.text().catch(() => ''));
            process.exitCode = 1;
        }
    }
}

async function main() {
    const urls = explicitUrls.length ? explicitUrls : await collectSitemapUrls();
    if (urls.length === 0) {
        console.error('FATAL: no URLs to submit.');
        process.exit(1);
    }
    console.log(`Submitting ${urls.length} URL(s) via IndexNow (key ${KEY.slice(0, 8)}…).`);
    await submit(urls);
    console.log('Done.');
}

main().catch((e) => {
    console.error(`FATAL: ${e.message}`);
    process.exit(1);
});
