#!/usr/bin/env node
/**
 * VENDOR PRIVACY GATE — no user-facing surface may name a commercial data
 * supplier, and no browser bundle may carry the name it exists to strip.
 *
 *   node scripts/verify-vendor-privacy.mjs            # static: source + shipped assets
 *   node scripts/verify-vendor-privacy.mjs --live     # also crawl the deployed site
 *   node scripts/verify-vendor-privacy.mjs --live --base http://localhost:3000
 *
 * WHY A GATE AND NOT A ONE-OFF SWEEP: the same supplier reached readers through
 * eight unrelated paths (a table column, a provenance block, an outbound link,
 * JSON-LD, two JSON APIs, a CSV header, a citation hostname) and an ordinary
 * code review had caught none of them, because each looked local and reasonable
 * in its own file. Anything that only holds while everyone remembers it does
 * not hold. This fails the build instead.
 *
 * THE ONE EXCEPTION, MADE EXPLICIT: six FRA-licensed funds and their manager
 * carry the supplier's name inside their own REGISTERED name. Those are public
 * market data about entities the site covers — not a disclosure of where our
 * data comes from — and renaming them would falsify a registered fund name and
 * break matching against FRA/EIMA records. They are allow-listed below BY EXACT
 * STRING and reconciled against the published fund dataset on every run, so the
 * exception can never quietly widen into "the word is fine anywhere".
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');

/* ── policy ─────────────────────────────────────────────────────────────── */

/** Hostnames that identify a supplier. Never permitted on a user-facing surface. */
const VENDOR_HOSTS = [/\bmubasher\.info\b/gi];

/** Brand tokens. Permitted only inside an allow-listed registered entity name. */
const VENDOR_TOKENS = [/\bmubasher\b/gi, /(?<![؀-ۿ])مباشر(?![؀-ۿ])/g];

/** Pipeline source tags. Operational vocabulary; never published anywhere. */
const VENDOR_TAGS = [/\bmubasher[_-][a-z][a-z_-]*/gi];

/**
 * Registered names of entities in the published universe. Removed from a file's
 * text BEFORE the scan, so "Mubasher Misr Equity Fund" passes and "Mubasher
 * per-fund price file (primary)" does not. Longest first, so a longer name is
 * consumed before a shorter one that is its prefix.
 */
const REGISTERED_ENTITY_NAMES = [
    'Mubasher Capital Daily Cumulative Return Fund Cash Mubasher',
    'Mubasher Empire of Gold Fadda Fund Fadda Mubasher',
    'Mubasher Misr Equity Fund Mubasher Equity',
    'Mubasher Fixed Income Fund Mubasher USD',
    'Mubasher Evolve Gold Fund Dahab Mubasher',
    'Mubasher Securities Portfolio Management',
    // The second licensed manager in the published universe (5 funds). Missed by
    // the first sweep because public/data/funds_data.json is a stale snapshot
    // that carries only the first — which is why the --live crawl, not that
    // file, is the authority on who is actually published.
    'Mubasher Capital Holding For Financial Investments',
    'mubasher-capital-holding-for-financial-investments',
    'mubasher-securities-portfolio-management',
    'مباشر كابيتال هولدنج للاستثمارات المالية',
    'مباشر-كابيتال-هولدنج-للاستثمارات-المالية',
    'مباشر-لتكوين-وإدارة-محافظ-الأوراق-المالية',
    'Mubasher Capital',
    'صندوق استثمار مباشر كابيتال ذو العائد اليومي التراكمي - كاش مباشر',
    'صندوق استثمار مباشر وإمبراطورية الذهب للاستثمار في الفضة - فضة مباشر',
    'صندوق استثمار مباشر لأدوات الدخل الثابت بالدولار الأمريكي - دولار مباشر',
    'صندوق مباشر للاستثمار في الأسهم المصرية - أسهم مباشر',
    'صندوق استثمار مباشر - إيفولف للاستثمار في الذهب - دهب مباشر',
    'مباشر لتكوين وإدارة محافظ الأوراق المالية',
    // The FRA company-record forms of the same fund, as cited in the taxonomy
    // override that documents its asset class.
    'صندوق استثمار مباشر كابيتال ذو العائد اليومي التراكمي',
    'كاش مباشر',
    // Slug forms of the names above, as they appear in URLs and canonicals.
    'mubasher-misr-equity-fund-mubasher-equity',
    'mubasher-capital-daily-cumulative-return-fund-cash-mubasher',
    'mubasher-evolve-gold-fund-dahab-mubasher',
    'mubasher-fixed-income-fund-mubasher-usd',
    'mubasher-empire-of-gold-fadda-fund-fadda-mubasher',
    // The manager's own record key, and the entity slugs inside FRA / press
    // record URLs cited as evidence for that manager's funds.
    "'MUBASHER'",
    'مباشر-كابيتال',
    'صندوق-استثمار-مباشر-كابيتال',
    'صندوق-استثمار-مباشر',
    'صندوق-مباشر-للاستثمار-في-الأسهم-المصرية-أسهم-مباشر',
    'صندوق-استثمار-مباشر-كابيتال-ذو-العائد-اليومي-التراكمي-كاش-مباشر',
    'صندوق-استثمار-مباشر-إيفولف-للاستثمار-في-الذهب-دهب-مباشر',
    'صندوق-استثمار-مباشر-لأدوات-الدخل-الثابت-بالدولار-الأمريكي-دولار-مباشر',
    'صندوق-استثمار-مباشر-وإمبراطورية-الذهب-للاستثمار-في-الفضة-فضة-مباشر',
    'أسهم-مباشر', 'كاش-مباشر', 'دهب-مباشر', 'دولار-مباشر', 'فضة-مباشر',
    'مباشر-للاستثمار-في-الأسهم-المصرية', 'استثمار-مباشر',
].sort((a, b) => b.length - a.length);

/**
 * Arabic collocations where «مباشر» is the everyday adjective ("direct",
 * "live"), not a name. Listed one by one on purpose: the word is genuinely
 * ambiguous, so each place the site uses it is a decision someone made and can
 * re-read here, rather than a blanket exemption for the token.
 *
 * NOT listed, and deliberately changed instead: freshness badges that stood
 * alone next to market data («مباشر» as a "Live" chip, «المصدر: EGX مباشر»).
 * Beside a price, a lone «مباشر» reads as an attribution; those now say «لحظي»
 * / «اللحظية», which is the precise term for real-time anyway.
 */
const ADJECTIVAL_COLLOCATIONS = [
    'وصول مباشر',      // "direct access" — API tier feature
    'اتصال مباشر',     // "direct connection"
    'بث مباشر',        // "live broadcast"
    'استثمار مباشر',   // "direct investment" — an asset-class term
    'تمويل مباشر',     // "direct financing"
];

/**
 * Files allowed to know a supplier's identity: the policy module itself, the
 * server-side scrubbers it feeds, the image proxy's host allowlist, the private
 * evidence fixtures, and this gate. Every one is server-side or never shipped.
 */
const POLICY_FILES = new Set([
    'lib/vendor-privacy.ts',
    'lib/news-display.ts',
    'app/api/v1/news-image/route.ts',
    'scripts/verify-vendor-privacy.mjs',
    'scripts/egx-security-master.mjs',
].map((p) => path.join(root, p)));

/**
 * Files that legitimately name a supplier, each with the reason it is allowed.
 * An exception without a reason is how a gate rots, so the reason is printed in
 * the run summary rather than living in someone's memory.
 */
const EXEMPT = new Map([
    ['app/api/auth/google/callback/route.ts',
     'legacy Capacitor URL scheme, kept registered so builds already on devices still receive their OAuth redirect; the scheme the app now requests is neutral'],
    ['app/mobile/MOBILE_APP_HANDOFF.md',
     'internal release runbook recording the App Store bundle identity the owner chose to keep; never served'],
]);

/** Directories that never reach a browser: pipeline internals and evidence stores. */
const SKIP_DIRS = new Set([
    'node_modules', '.next', '.git', 'dist', 'build', 'out', 'coverage',
    'ios', 'android', 'mobile-native', 'testsprite_tests', '.vercel',
]);
/** The private evidence store. Cited by auditors; stripped by the generator before it reaches content/. */
const SKIP_PATHS = [path.join(root, 'scripts/fixtures')];

/** Everything a browser can receive, plus the server code that decides what it receives. */
const SCAN_DIRS = ['app', 'components', 'lib', 'content', 'public', 'hooks', 'styles']
    .map((d) => path.join(root, d))
    .filter(existsSync);
/** The static shell is served verbatim at `/`, so it is scanned as shipped bytes. */
const SCAN_FILES = [path.join(repoRoot, 'index.html'), path.join(root, 'next.config.ts')].filter(existsSync);

const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.csv', '.xml', '.txt']);

/* ── helpers ────────────────────────────────────────────────────────────── */

const rel = (p) => path.relative(repoRoot, p);
const failures = [];
const fail = (file, line, detail) => failures.push({ file: rel(file), line, detail });

/** File text with every allow-listed registered entity name removed. */
function withoutRegisteredNames(text) {
    let out = text;
    for (const name of REGISTERED_ENTITY_NAMES) out = out.split(name).join('«entity»');
    for (const phrase of ADJECTIVAL_COLLOCATIONS) out = out.split(phrase).join('«adjective»');
    // URL-encoded Arabic slugs (%D8%B5%D9%86...) hide the same names inside hrefs.
    try {
        const decoded = decodeURIComponent(out);
        if (decoded !== out) {
            let d = decoded;
                for (const name of REGISTERED_ENTITY_NAMES) d = d.split(name).join('«entity»');
            for (const phrase of ADJECTIVAL_COLLOCATIONS) d = d.split(phrase).join('«adjective»');
            // Keep BOTH views: encoding can also hide a non-entity mention.
            out = `${out}\n${d}`;
        }
    } catch { /* malformed escapes — scan the raw text only */ }
    return out;
}

function* matches(text, patterns) {
    for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) !== null) yield m;
    }
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        if (SKIP_DIRS.has(entry)) continue;
        const full = path.join(dir, entry);
        if (SKIP_PATHS.some((p) => full === p || full.startsWith(`${p}${path.sep}`))) continue;
        const st = statSync(full);
        if (st.isDirectory()) walk(full, out);
        else if (TEXT_EXT.has(path.extname(full))) out.push(full);
    }
    return out;
}

const isClientModule = (text) => /^\s*['"]use client['"]/m.test(text.slice(0, 400));

/* ── checks ─────────────────────────────────────────────────────────────── */

function checkFile(file) {
    const raw = readFileSync(file, 'utf8');
    const isPolicy = POLICY_FILES.has(file) || EXEMPT.has(path.relative(root, file));
    const scan = withoutRegisteredNames(raw);

    // 1. A supplier hostname is never publishable, entity allow-list or not.
    if (!isPolicy) {
        for (const m of matches(raw, VENDOR_HOSTS)) {
            fail(file, lineOf(raw, m.index), `supplier hostname "${m[0]}" — route it through lib/vendor-privacy.ts`);
            break;
        }
    }

    // 2. A pipeline source tag is operational vocabulary and is never published.
    if (!isPolicy) {
        for (const m of matches(raw, VENDOR_TAGS)) {
            fail(file, lineOf(raw, m.index), `pipeline source tag "${m[0]}" reaching a user-facing file`);
            break;
        }
    }

    // 3. A brand token outside a registered entity name.
    if (!isPolicy) {
        for (const m of matches(scan, VENDOR_TOKENS)) {
            fail(file, lineOf(scan, m.index), `supplier name "${m[0]}" outside a registered entity name`);
            break;
        }
    }

    // 4. No client module may import the server-side policy or its scrubbers:
    //    their literals would be inlined into the browser bundle.
    if (isClientModule(raw)) {
        for (const forbidden of ['@/lib/vendor-privacy', '@/lib/news-display"', "@/lib/news-display'"]) {
            if (raw.includes(forbidden)) {
                fail(file, lineOf(raw, raw.indexOf(forbidden)),
                    `client module imports ${forbidden.replace(/["']/g, '')} — use @/lib/news-display.client instead`);
            }
        }
    }
}

/** The allow-list must describe funds that actually exist, or it is stale cover. */
function checkAllowListIsHonest() {
    const dataset = path.join(root, 'public/data/funds_data.json');
    if (!existsSync(dataset)) return;
    let rows;
    try {
        rows = JSON.parse(readFileSync(dataset, 'utf8'));
    } catch {
        return;
    }
    if (!Array.isArray(rows)) return;

    const blob = JSON.stringify(rows);
    const unmatched = [];
    for (const row of rows) {
        const text = withoutRegisteredNames(JSON.stringify(row));
        for (const m of matches(text, VENDOR_TOKENS)) {
            unmatched.push(`${row.id}: ${row.nameEn || row.nameAr}`);
            break;
        }
    }
    if (unmatched.length) {
        failures.push({
            file: 'frontend/public/data/funds_data.json',
            line: 0,
            detail: `fund names carrying the supplier name are NOT on the registered-entity allow-list — add them to REGISTERED_ENTITY_NAMES after confirming they are registered names, or unpublish the funds: ${unmatched.join(' | ')}`,
        });
    }

    // An allow-list entry that matches nothing in the repo's own snapshots is
    // reported, not failed: the snapshots lag the live universe (the second
    // licensed manager is published today and appears in NEITHER of them), so
    // absence here means "unconfirmed offline", not "wrong". The --live crawl is
    // the authority on who is actually published.
    const managers = existsSync(path.join(root, 'lib/asset-managers.ts'))
        ? readFileSync(path.join(root, 'lib/asset-managers.ts'), 'utf8')
        : '';
    const unconfirmed = REGISTERED_ENTITY_NAMES.filter(
        (n) => !n.includes('-') && !blob.includes(n) && !managers.includes(n)
    );
    if (unconfirmed.length) {
        console.warn(`[vendor] note: ${unconfirmed.length} allow-listed entity name(s) not present in the committed snapshots — confirm against the live directory before trusting them: ${unconfirmed.join(' | ')}`);
    }
}

/* ── live crawl ─────────────────────────────────────────────────────────── */

const LIVE_PATHS = [
    '/', '/ar',
    '/Funds', '/ar/Funds',
    '/methodology', '/ar/methodology',
    '/News', '/ar/News',
    '/symbol/GTHE', '/symbol/PACH', '/symbol/COMI',
    '/api/v1/news?source_country=EG&language=ar&limit=5',
    '/api/v1/news?source_country=EG&language=en&limit=5',
    '/api/v1/egx/news-tv/COMI?lang=ar',
    '/api/v1/egx/news-tv/COMI?lang=en',
    '/Funds/prices-today.csv',
    '/sitemap.xml', '/news-sitemap.xml',
];

/** A fund profile and its NAV-history twin, discovered from the live directory. */
async function discoverFundPaths(base) {
    try {
        const html = await (await fetch(`${base}/Funds`, { redirect: 'follow' })).text();
        const hrefs = [...html.matchAll(/href="(\/Funds\/\d+-[^"]+)"/g)].map((m) => m[1]);
        const first = hrefs.find((h) => !h.includes('nav-history'));
        return first ? [first, `${first}/nav-history`] : [];
    } catch {
        return [];
    }
}

async function crawl(base) {
    const paths = [...LIVE_PATHS, ...(await discoverFundPaths(base))];
    let checked = 0;
    for (const p of paths) {
        const url = `${base}${p}`;
        let body;
        try {
            const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'starta-vendor-gate/1.0' } });
            body = await res.text();
        } catch (err) {
            console.warn(`[vendor] live: could not fetch ${p} (${err.message})`);
            continue;
        }
        checked += 1;
        const scan = withoutRegisteredNames(body);
        const hits = [];
        for (const m of matches(scan, [...VENDOR_TOKENS, ...VENDOR_HOSTS, ...VENDOR_TAGS])) {
            const around = scan.slice(Math.max(0, m.index - 70), m.index + 70).replace(/\s+/g, ' ');
            hits.push(`…${around}…`);
            if (hits.length >= 3) break;
        }
        if (hits.length) failures.push({ file: url, line: 0, detail: hits.join('\n        ') });
    }
    console.log(`[vendor] live: ${checked}/${paths.length} URLs fetched from ${base}`);
}

/* ── run ────────────────────────────────────────────────────────────────── */

/**
 * Proof the detectors still bite. A gate that scans a clean tree prints OK
 * whether or not it works — this repo has shipped a gate that examined ZERO
 * files and passed. These fixtures make the difference visible.
 */
function selfTest() {
    const cases = [
        ['Mubasher per-fund price file (primary)', true, 'supplier as a source label'],
        ['ملف أسعار الصندوق من مباشر', true, 'Arabic supplier attribution'],
        ['https://static.mubasher.info/File.Story_Image/x/640.jpg', true, 'supplier hostname'],
        ['mubasher_list_api', true, 'pipeline source tag'],
        ['Mubasher Misr Equity Fund Mubasher Equity', false, 'registered fund name'],
        ['صندوق مباشر للاستثمار في الأسهم المصرية - أسهم مباشر', false, 'registered Arabic fund name'],
        ['وصول مباشر إلى API', false, 'ordinary Arabic adjective'],
        ['بيانات EGX اللحظية', false, 'neutral freshness copy'],
    ];
    let bad = 0;
    for (const [sample, shouldFlag, label] of cases) {
        const scrubbed = withoutRegisteredNames(sample);
        const flagged =
            !([...matches(sample, VENDOR_HOSTS)].length === 0) ||
            !([...matches(sample, VENDOR_TAGS)].length === 0) ||
            !([...matches(scrubbed, VENDOR_TOKENS)].length === 0);
        if (flagged !== shouldFlag) {
            console.error(`[vendor] selftest FAIL: "${sample}" — expected ${shouldFlag ? 'flag' : 'pass'} (${label})`);
            bad += 1;
        }
    }
    if (bad) process.exit(1);
    console.log(`[vendor] selftest OK — ${cases.length} fixtures, detectors and allow-list both behaving`);
}

const argv = process.argv.slice(2);
const live = argv.includes('--live');
const base = (argv[argv.indexOf('--base') + 1] || 'https://www.startamarkets.com').replace(/\/$/, '');

selfTest();

const files = [...SCAN_DIRS.flatMap((d) => walk(d)), ...SCAN_FILES];
for (const f of files) checkFile(f);
checkAllowListIsHonest();

// A gate that scans nothing passes everything — this repo has shipped that
// exact failure before (market purity, 2026-09). Assert the scope out loud.
if (files.length < 200) {
    failures.push({ file: 'scripts/verify-vendor-privacy.mjs', line: 0, detail: `scanned only ${files.length} files — the walk is broken, not the codebase` });
}

if (live) await crawl(base);

if (failures.length) {
    console.error(`\n[vendor] FAIL — ${failures.length} supplier disclosure(s):\n`);
    for (const f of failures) console.error(`  ${f.file}${f.line ? `:${f.line}` : ''}\n        ${f.detail}\n`);
    console.error('Fix at the boundary (lib/vendor-privacy.ts), not by widening the allow-list.\n');
    process.exit(1);
}

console.log(`[vendor] OK — ${files.length} files scanned, ${REGISTERED_ENTITY_NAMES.length} registered-entity names + ${ADJECTIVAL_COLLOCATIONS.length} adjectival phrases allowed${live ? `, live crawl clean (${base})` : ''}`);
for (const [file, reason] of EXEMPT) console.log(`[vendor]   exempt: ${file} — ${reason}`);
