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
    FUND_TAXONOMY_OVERRIDES, applyFundTaxonomy, nameTypeConflict, primaryAssetClassOf, strategyTagsOf, shariaCompliantOf,
    taxonomyOverrideFor, normalizeVendorType,
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
// A vendor "equity" type is the superclass: the registered name names the sub-type.
check('fund_type=equity + "Beltone EGX100 Fund Issuance 2 Meya Meya" -> index', categoryOfFund({ fund_type: 'equity', fund_name_en: 'Beltone EGX100 Fund Issuance 2 Meya Meya' })?.key ?? null, 'index');
check('fund_type=equity + "Beltone Financial Fund Issuance 3" -> sector', categoryOfFund({ fund_type: 'equity', fund_name_en: 'Beltone Financial Fund Issuance 3' })?.key ?? null, 'sector');
check('fund_type=equity + "Beltone EGX33 Shariah Issuance 1 Wafra" -> shariah', categoryOfFund({ fund_type: 'equity', fund_name_en: 'Beltone EGX33 Shariah Issuance 1 Wafra' })?.key ?? null, 'shariah');
check('fund_type=equity + "ABC Bank Equity Fund 1" stays equity', categoryOfFund({ fund_type: 'equity', fund_name_en: 'ABC Bank Equity Fund 1' })?.key ?? null, 'equity');
check('fund_type=money_market + "… Index …" name keeps the vendor type', categoryOfFund({ fund_type: 'money_market', fund_name_en: 'Some Index Money Market Fund' })?.key ?? null, 'money-market');
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
// no disclosed type) and again once a vendor "equity" type learned to defer to
// an index / sector / Shariah name marker (the vendor files every Beltone
// EGX100/EGX70/EGX33 index fund as "equity"): counts are from the live fund
// payloads of that day — 207 current funds, 29 still uncategorised.
// Refreshed 2026-09-05 (evening) for the taxonomy overrides: BANK NXT (2689,
// vendor "balanced") and Cash Mubasher (2665, vendor "fixed income") moved to
// money-market; 5958 stays on the Shariah page (flag wins) with class money_market.
const OBSERVED: Record<string, number> = {
    equity: 35, 'money-market': 61, 'fixed-income': 28, balanced: 11, shariah: 15, gold: 8,
    index: 8, sector: 12,
};
for (const c of FUND_CATEGORIES) {
    const n = OBSERVED[c.key];
    check(`${c.key} had ${n} funds in production >= threshold`, n !== undefined && n >= MIN_FUNDS_TO_PUBLISH, true);
}

console.log('\n[8] documented overrides beat a wrong vendor type — on every surface, through one resolver');
// The chief re-audit (2026-09-05) found the vendor filing BANK NXT's money-market
// fund as "balanced": category page, fund FAQ, analytics and "same category"
// peers all repeated it. The override carries the FRA prospectus as evidence.
const bankNxt = applyFundTaxonomy({ fund_id: '2689', fund_type: 'balanced', classification: 'Balanced Fund', fund_name_en: 'BANK NXT Money Market Fund', fund_name: 'صندوق بنك نكست التجاري النقدي', is_shariah: false });
check('2689 fund_type -> money_market', bankNxt.fund_type, 'money_market');
check('2689 fund_type_source -> override', bankNxt.fund_type_source, 'override');
check('2689 vendor classification text replaced', bankNxt.classification, 'Money Market Fund');
check('2689 primary_asset_class', bankNxt.primary_asset_class, 'money_market');
check('2689 strategy_tags carry daily_yield', (bankNxt.strategy_tags as string[]).includes('daily_yield'), true);
check('2689 no open conflict', bankNxt.taxonomy_conflict, null);
check('2689 category page -> money-market', categoryOfFund({ fund_id: '2689', fund_type: 'balanced', classification_en: null })?.key ?? null, 'money-market');
check('2689 category from a raw row with the vendor text -> money-market', categoryOfFund({ fund_id: 2689, fund_type_en: 'balanced' })?.key ?? null, 'money-market');
const nasser = applyFundTaxonomy({ fund_id: '5958', fund_type: 'fixed_income', classification: 'Fixed Income Fund', fund_name_en: 'Nasser Social Bank and Azimut Egypt Islamic Money Market fund', is_shariah: true });
check('5958 class money_market, Shariah kept as its own dimension', `${nasser.primary_asset_class}/${nasser.sharia_compliant}`, 'money_market/true');
check('5958 canonical category page stays Shariah (URL contract: the flag wins)', categoryOfFund({ fund_id: '5958', fund_type: 'fixed_income', is_shariah: true })?.key ?? null, 'shariah');
const granite = applyFundTaxonomy({ fund_id: '6411', fund_type: 'fixed_income', fund_name_en: 'Granite Fixed Income Fund Issuance 1 EGP', fund_name: 'صندوق استثمار جرانيت لأدوات الدخل الثابت - الإصدار الأول النقدي بالجنيه' });
check('6411 keep_vendor: type unchanged', granite.fund_type, 'fixed_income');
check('6411 keep_vendor: reviewed, no open conflict', `${granite.taxonomy_reviewed}/${granite.taxonomy_conflict}`, 'true/null');
check('a fund with no disposition keeps the vendor type', applyFundTaxonomy({ fund_id: '2734', fund_type: 'equity', fund_name_en: 'Pharos Investment Fund 1' }).fund_type_source, 'disclosed');
check('a fund with no type resolves from its name', applyFundTaxonomy({ fund_id: '4877', fund_name_en: 'Misr Insurance Fund Hesn El Aman', fund_name: 'صندوق استثمار مصر للتأمين - حصن الأمان اليومي' }).primary_asset_class, null);
check('name-only money-market fund', applyFundTaxonomy({ fund_id: '1', fund_name_en: 'HSBC Money Market Fund Kol Youm' }).primary_asset_class, 'money_market');
for (const o of FUND_TAXONOMY_OVERRIDES) {
    check(`${o.fund_id}: disposition is override|keep_vendor`, ['override', 'keep_vendor'].includes(o.disposition), true);
    if (o.disposition === 'override') check(`${o.fund_id}: override cites evidence`, o.evidence.length >= 1, true);
    check(`${o.fund_id}: names the vendor value it judges`, typeof o.vendor_type === 'string' && o.vendor_type.length > 0, true);
    check(`${o.fund_id}: taxonomyOverrideFor agrees with the disposition`, taxonomyOverrideFor(o.fund_id) !== null, o.disposition === 'override');
}

console.log('\n[9] name-vs-type conflict rule — flags a contradiction, not a refinement');
check('vendor balanced + "Money Market" name -> money_market', nameTypeConflict({ fund_id: '9001', fund_type: 'balanced', fund_name_en: 'Some Bank Money Market Fund' }), 'money_market');
check('vendor fixed_income + "النقدي الإسلامي" name -> money_market', nameTypeConflict({ fund_id: '9002', fund_type: 'fixed_income', fund_name: 'صندوق بنك ما النقدي الإسلامي' }), 'money_market');
check('vendor fixed_income + "Cash Mubasher" / «كاش مباشر» -> money_market', nameTypeConflict({ fund_id: '9003', fund_type: 'fixed_income', fund_name_en: 'Mubasher Capital Daily Cumulative Return Fund Cash Mubasher', fund_name: 'صندوق استثمار مباشر كابيتال ذو العائد اليومي التراكمي - كاش مباشر' }), 'money_market');
check('name that also names the vendor class is not a conflict (Granite)', nameTypeConflict({ fund_id: '9004', fund_type: 'fixed_income', fund_name_en: 'Granite Fixed Income Fund Issuance 1 EGP', fund_name: 'صندوق استثمار جرانيت لأدوات الدخل الثابت - الإصدار الأول النقدي بالجنيه' }), null);
check('vendor equity + index name is a refinement, not a conflict', nameTypeConflict({ fund_id: '9005', fund_type: 'equity', fund_name_en: 'Beltone EGX100 Fund Issuance 2' }), null);
check('vendor balanced naming both legs is not a conflict', nameTypeConflict({ fund_id: '9006', fund_type: 'balanced', fund_name_en: 'Equity and Bond Balanced Fund' }), null);
check('vendor equity + gold name -> gold', nameTypeConflict({ fund_id: '9007', fund_type: 'equity', fund_name_en: 'ABC Gold Fund' }), 'gold');
check('no vendor type -> nothing to conflict with', nameTypeConflict({ fund_id: '9008', fund_name_en: 'ABC Gold Fund' }), null);
check('a recorded disposition silences the conflict', nameTypeConflict({ fund_id: '2689', fund_type: 'balanced', fund_name_en: 'BANK NXT Money Market Fund' }), null);
check('normalizeVendorType("Fixed Income Fund")', normalizeVendorType('Fixed Income Fund'), 'fixed_income');
check('normalizeVendorType("fixed_income_usd")', normalizeVendorType('fixed_income_usd'), 'fixed_income');
check('normalizeVendorType("commodities")', normalizeVendorType('commodities'), 'gold');
check('normalizeVendorType("structured_note") is unknown', normalizeVendorType('structured_note'), null);

console.log('\n[10] orthogonal dimensions — class, strategy and Shariah never substitute for each other');
check('index fund: class equity + tag index', `${primaryAssetClassOf({ fund_type: 'equity', fund_name_en: 'Beltone EGX70 EWI Fund B 70' })}/${strategyTagsOf({ fund_name_en: 'Beltone EGX70 EWI Fund B 70' }).join(',')}`, 'equity/index');
check('sector fund: class equity + tag sector', `${primaryAssetClassOf({ fund_type: 'equity', fund_name_en: 'Beltone Financial Fund Issuance 3' })}/${strategyTagsOf({ fund_name_en: 'Beltone Financial Fund Issuance 3' }).join(',')}`, 'equity/sector');
check('daily-yield cash fund: class money_market + tag daily_yield', `${primaryAssetClassOf({ fund_name_en: 'HSBC Money Market Fund Kol Youm' })}/${strategyTagsOf({ fund_name_en: 'HSBC Money Market Fund Kol Youm' }).join(',')}`, 'money_market/daily_yield');
check('Shariah from the flag', shariaCompliantOf({ is_shariah: true, fund_name_en: 'ABC Equity Fund' }), true);
check('Shariah from the registered name', shariaCompliantOf({ is_shariah: false, fund_name_en: 'Sanabel Equity Fund Islamic Sharia Compliant' }), true);
check('Shariah is not inferred from a bank name', shariaCompliantOf({ is_shariah: false, fund_name_en: 'Faisal Islamic Bank of Egypt Fund' }), true);
check('class from the classification text when fund_type is empty', primaryAssetClassOf({ fund_type: null, classification: 'Equity Fund' }), 'equity');

console.log(failures === 0 ? '\nPASS: fund category classifier gate\n' : `\nFAIL: ${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
