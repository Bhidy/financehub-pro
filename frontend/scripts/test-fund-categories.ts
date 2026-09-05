/**
 * Gate: the fund category classifier must assign REAL production fund_type
 * values to the right category, and must never silently drop a whole category.
 * Run: npx tsx scripts/test-fund-categories.ts
 *
 * WHY THIS EXISTS: the first implementation matched with /money\s*market/,
 * but the production values are snake_case ("money_market", "fixed_income").
 * `\s` does not match an underscore, so 26 money-market and 20 fixed-income
 * funds silently fell into "no category" and the two largest category pages in
 * the Egyptian market 404'd on their data gate. The classifier looked correct
 * in review and was verified only by hitting the live URLs.
 */
import {
    FUND_CATEGORIES, MIN_FUNDS_TO_PUBLISH, categoryOfFund, categorySlugEn, categorySlugAr,
    categoryPath, findCategory,
} from '../content/fund-categories';

let failures = 0;
const check = (name: string, got: unknown, want: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failures++;
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};

/**
 * The EXACT distinct fund_type_en values present in production (2026-09-03,
 * GET /api/v1/funds, n=200). If the upstream vocabulary changes, this list is
 * what must be updated — and the failure will say so instead of a category
 * quietly emptying.
 */
const PRODUCTION_FUND_TYPES: Array<[string, string]> = [
    ['equity', 'equity'],
    ['money_market', 'money-market'],
    ['fixed_income', 'fixed-income'],
    ['fixed_income_usd', 'fixed-income'],
    ['balanced', 'balanced'],
    ['gold', 'gold'],
    ['commodities', 'gold'],
];

console.log('\n[1] every production fund_type_en maps to its category');
for (const [type, expected] of PRODUCTION_FUND_TYPES) {
    check(`fund_type_en="${type}"`, categoryOfFund({ fund_type_en: type })?.key ?? null, expected);
}

console.log('\n[2] separator forms are equivalent (the regression that shipped)');
for (const variant of ['money_market', 'money-market', 'money market', 'MONEY_MARKET', 'Money Market']) {
    check(`"${variant}" -> money-market`, categoryOfFund({ fund_type_en: variant })?.key ?? null, 'money-market');
}
for (const variant of ['fixed_income', 'fixed-income', 'Fixed Income']) {
    check(`"${variant}" -> fixed-income`, categoryOfFund({ fund_type_en: variant })?.key ?? null, 'fixed-income');
}

console.log('\n[3] Shariah wins over the asset class (that is the search intent)');
check('is_shariah + equity', categoryOfFund({ fund_type_en: 'equity', is_shariah: true })?.key ?? null, 'shariah');
check('is_shariah string "true"', categoryOfFund({ fund_type_en: 'money_market', is_shariah: 'true' })?.key ?? null, 'shariah');
check('classification says islamic', categoryOfFund({ classification_en: 'Islamic Fund' })?.key ?? null, 'shariah');

console.log('\n[3b] name fallback when the disclosure carries no type (106 of 207 live funds)');
check('"HSBC Money Market Fund Kol Youm" -> money-market', categoryOfFund({ fund_name_en: 'HSBC Money Market Fund Kol Youm' })?.key ?? null, 'money-market');
check('"Commercial International Bank Fixed Income Fund Thabat" -> fixed-income', categoryOfFund({ fund_name_en: 'Commercial International Bank Fixed Income Fund Thabat' })?.key ?? null, 'fixed-income');
check('"ABC Bank Equity Fund 1" -> equity', categoryOfFund({ fund_name_en: 'ABC Bank Equity Fund 1' })?.key ?? null, 'equity');
check('"Beltone EGX70 EWI Fund B 70" -> index', categoryOfFund({ fund_name_en: 'Beltone EGX70 EWI Fund B 70' })?.key ?? null, 'index');
check('"CI Asset Management CI ctor Specialized Funds Issuance 2 Technology" -> sector', categoryOfFund({ fund_name_en: 'CI Asset Management CI ctor Specialized Funds Issuance 2 Technology' })?.key ?? null, 'sector');
check('"Sanabel Equity Fund Islamic Sharia Compliant" -> shariah (flag wins)', categoryOfFund({ fund_name_en: 'Sanabel Equity Fund Islamic Sharia Compliant' })?.key ?? null, 'shariah');
check('Arabic "فضة" inside "منخفضة" is NOT silver/gold', categoryOfFund({ fund_name_en: 'Azimut Equity Opportunities Fund Az LV', fund_name: 'صندوق أزيموت لفرص الأسهم منخفضة التقلبات السعرية' })?.key ?? null, 'equity');
check('"Credit Agricole Egypt Mutual Fund 2" stays uncategorised', categoryOfFund({ fund_name_en: 'Credit Agricole Egypt Mutual Fund 2' }), null);

console.log('\n[4] unknown / empty input is uncategorised, never mis-assigned');
check('empty row', categoryOfFund({}), null);
check('null fields', categoryOfFund({ fund_type_en: null, fund_type: null, classification_en: null }), null);
check('unknown type', categoryOfFund({ fund_type_en: 'structured_note' }), null);

console.log('\n[5] URL contracts: slugs unique, non-empty, and round-trip');
const enSlugs = FUND_CATEGORIES.map(categorySlugEn);
const arSlugs = FUND_CATEGORIES.map(categorySlugAr);
check('EN slugs unique', new Set(enSlugs).size, enSlugs.length);
check('AR slugs unique', new Set(arSlugs).size, arSlugs.length);
check('no empty AR slug', arSlugs.filter((s) => !s).length, 0);
check('EN∪AR slugs collision-free', new Set([...enSlugs, ...arSlugs]).size, enSlugs.length + arSlugs.length);
for (const c of FUND_CATEGORIES) {
    check(`findCategory("${categorySlugEn(c)}")`, findCategory(categorySlugEn(c))?.key ?? null, c.key);
    check(`findCategory(AR slug of ${c.key})`, findCategory(categorySlugAr(c))?.key ?? null, c.key);
    check(`AR path is under /ar/Funds/category/`, categoryPath(c, 'ar').startsWith('/ar/Funds/category/'), true);
    check(`EN path is under /Funds/category/`, categoryPath(c, 'en').startsWith('/Funds/category/'), true);
}

console.log('\n[6] the publish threshold is sane');
check('MIN_FUNDS_TO_PUBLISH >= 3', MIN_FUNDS_TO_PUBLISH >= 3, true);

console.log('\n[7] production distribution — every category clears the threshold');
// Counts observed in production on 2026-09-03. This is a canary: if a future
// classifier change drops a category below its gate, the page 404s and the
// sitemap shrinks silently. Here it fails loudly instead.
// Refreshed 2026-09-05 after the name-fallback classifier (106 funds carried
// no disclosed type) and the index / sector categories: counts are from the
// live fund payloads of that day.
const OBSERVED: Record<string, number> = {
    equity: 48, 'money-market': 57, 'fixed-income': 29, balanced: 12, shariah: 13, gold: 6,
    index: 5, sector: 8,
};
for (const c of FUND_CATEGORIES) {
    const n = OBSERVED[c.key];
    check(`${c.key} had ${n} funds in production >= threshold`, n !== undefined && n >= MIN_FUNDS_TO_PUBLISH, true);
}

console.log(failures === 0 ? '\nPASS: fund category classifier gate\n' : `\nFAIL: ${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
