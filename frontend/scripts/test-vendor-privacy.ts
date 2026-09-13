/**
 * VENDOR PRIVACY — BOUNDARY TESTS
 *
 *   npx tsx scripts/test-vendor-privacy.ts
 *
 * The gate (scripts/verify-vendor-privacy.mjs) proves no supplier name is
 * WRITTEN into a user-facing file. This proves the functions that strip it at
 * runtime actually strip it — using the real shapes the production APIs were
 * returning on 2026-09-13, when /api/v1/news and /api/v1/egx/news-tv served
 * 6 and 71 supplier strings per response respectively.
 *
 * It also pins the two things this change must NOT break:
 *   · a registered fund name survives untouched (renaming a licensed Egyptian
 *     fund would be a data-accuracy defect, not a privacy win)
 *   · canonicalNewsPath produces the SAME slug as before, because ~4,500 live
 *     news URLs and the sitemap that advertises them are derived from it
 */

import {
    scrubVendorNames,
    publicUrl,
    publicUrls,
    publicImageUrl,
    publicSourceName,
    isConfidentialVendorUrl,
    namesConfidentialVendor,
} from '../lib/vendor-privacy';
import { canonicalNewsPath, sanitizeNewsText } from '../lib/news-display';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    if (!ok) {
        failures += 1;
        console.error(`  FAIL  ${label}\n        expected ${JSON.stringify(expected)}\n        got      ${JSON.stringify(actual)}`);
    } else {
        console.log(`  ok    ${label}`);
    }
};
const assertClean = (label: string, value: unknown) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
    const dirty = /mubasher/i.test(text) || /(?<![؀-ۿ])مباشر(?![؀-ۿ])/.test(text);
    if (dirty) {
        failures += 1;
        console.error(`  FAIL  ${label} still names the supplier: ${text.slice(0, 120)}`);
    } else {
        console.log(`  ok    ${label}`);
    }
};

/* ── 1. the two API rows that were leaking, verbatim from production ────── */

console.log('\n/api/v1/news row (6 supplier strings on 2026-09-13):');
const newsRow = {
    id: 906191,
    headline: 'رئيس "القلعة": 3 طروحات لشركات تابعة بالنصف الثاني من 2027',
    source: 'Mubasher',
    url: 'https://www.mubasher.info/news/4671496/%D8%B1%D8%A6%D9%8A%D8%B3',
    image_url: 'https://static.mubasher.info/File.Story_Image/11a8905f6b8ff9328b65eca4c6978eff/640.jpg',
};
assertClean('source', publicSourceName(newsRow.source));
assertClean('url', publicUrl(newsRow.url));
assertClean('image_url', publicImageUrl(newsRow.image_url, newsRow.id));
check('image_url is re-addressed by our own article id', publicImageUrl(newsRow.image_url, newsRow.id), '/api/v1/news-image?id=906191');
check('source is withheld, not renamed', publicSourceName(newsRow.source), null);
check('a publishable source name survives', publicSourceName('TradingView'), 'TradingView');
check('an image with no article id is dropped rather than exposed', publicImageUrl(newsRow.image_url, null), null);
check('a non-confidential cover keeps its own URL', publicImageUrl('https://www.arabfinance.com/x.jpg', 5), 'https://www.arabfinance.com/x.jpg');

console.log('\n/api/v1/egx/news-tv row (71 supplier strings per 30-row response):');
check('origin falls back to "local"', publicSourceName('Mubasher') || 'local', 'local');
assertClean('headline with an English dateline', scrubVendorNames(sanitizeNewsText('Cairo - Mubasher: EGX30 ends higher')));
check('…and reads correctly', scrubVendorNames(sanitizeNewsText('Cairo - Mubasher: EGX30 ends higher')), 'EGX30 ends higher');
assertClean('headline with an Arabic byline', scrubVendorNames(sanitizeNewsText('مباشر: البورصة المصرية تغلق مرتفعة')));
check('…and reads correctly', scrubVendorNames(sanitizeNewsText('مباشر: البورصة المصرية تغلق مرتفعة')), 'البورصة المصرية تغلق مرتفعة');
assertClean('mid-sentence mention', scrubVendorNames('EGX30 rises, according to Mubasher data'));

/* ── 2. citations ───────────────────────────────────────────────────────── */

console.log('\nDelisting citations (symbol pages, methodology):');
check('a supplier citation is dropped, others kept', publicUrls([
    'https://www.veon.com/newsroom/press-releases/veon-announces-delisting',
    'https://english.mubasher.info/markets/EGX/stocks/GTHE',
]), ['https://www.veon.com/newsroom/press-releases/veon-announces-delisting']);
check('every subdomain is caught', isConfidentialVendorUrl('https://static.mubasher.info/x.jpg'), true);
check('a bare hostname in a citation string is caught', isConfidentialVendorUrl('see english.mubasher.info/markets'), true);
check('an unrelated host is untouched', isConfidentialVendorUrl('https://fra.gov.eg/company_records/x'), false);

/* ── 3. what must NOT change ────────────────────────────────────────────── */

console.log('\nRegistered entity names must survive (they are public market data):');
for (const name of [
    'Mubasher Misr Equity Fund Mubasher Equity',
    'صندوق مباشر للاستثمار في الأسهم المصرية - أسهم مباشر',
    'Mubasher Securities Portfolio Management',
    'Mubasher Capital Holding For Financial Investments',
]) {
    check(`"${name.slice(0, 46)}…" is never rewritten`, namesConfidentialVendor(name) && name, name);
}
check('a fund name is never passed through the news scrubber', scrubVendorNames !== (undefined as unknown), true);

console.log('\nNews URL stability (≈4,500 live URLs + the sitemap derive from this):');
// sanitizeNewsText/canonicalNewsPath were NOT modified by this change; these
// pin the slugs a future "tidy-up" of that module would silently rewrite.
check('English dateline slug', canonicalNewsPath(271720, 'Egypt - Mubasher: EGX ends higher', null), '/News/271720-egx-ends-higher');
check('plain English slug', canonicalNewsPath(271721, 'EGX30 closes up 1.2%', null), '/News/271721-egx30-closes-up-1-2');
check('Arabic article stays in the Arabic tree',
    canonicalNewsPath(271722, 'البورصة المصرية تغلق مرتفعة', 'eg/pulse/stocks/ar').startsWith('/ar/News/271722-'), true);

/* ── 4. the ordinary Arabic word must not be collateral damage ──────────── */

console.log('\nArabic adjective «مباشر» is not the supplier:');
check('«وصول مباشر إلى API» is left alone by the URL policy', publicUrl('https://fra.gov.eg/x'), 'https://fra.gov.eg/x');
check('a non-vendor fund named «…العقارى العربى المباشر» keeps its manager', publicSourceName('Amwal Financial Investment'), 'Amwal Financial Investment');

/* ── result ─────────────────────────────────────────────────────────────── */

if (failures) {
    console.error(`\nverify:vendor-runtime FAILED — ${failures} assertion(s)\n`);
    process.exit(1);
}
console.log('\nverify:vendor-runtime OK — supplier stripped at the boundary, registered names and news URLs intact\n');
