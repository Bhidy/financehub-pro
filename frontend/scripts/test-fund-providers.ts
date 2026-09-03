/**
 * Gate: the provider taxonomy must resolve every URL the sitemap advertises.
 * Run: npx tsx scripts/test-fund-providers.ts
 *
 * WHY THIS EXISTS: the provider pages 404'd on every BANK while the sitemap
 * listed 70 provider URLs. Cause — the page reads funds through
 * getAllFundsRanked(), whose SELECT omitted owner_name/owner_name_en, while
 * the sitemap builder ran its own query that included them. Two queries for
 * one concept, disagreeing. This asserts the round trip on the SHAPE of row
 * the page actually receives.
 */
import { buildProviders, findProvider, providerPath, fundBelongsToProvider, MIN_FUNDS_PER_PROVIDER } from '../content/fund-providers';

let failures = 0;
const check = (name: string, got: unknown, want: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failures++;
    console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}  got=${JSON.stringify(got)}${ok ? '' : ` want=${JSON.stringify(want)}`}`);
};

/** Rows shaped exactly like production: a bank OWNS, a house MANAGES. */
const rows = [
    ...Array.from({ length: 8 }, (_, i) => ({
        fund_id: 100 + i,
        owner_name: 'بنك مصر ش.م.م', owner_name_en: 'Banque Misr S.A.E',
        manager_name: 'بنك مصر ش.م.م', manager_name_en: 'Banque Misr S.A.E',
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
        fund_id: 200 + i,
        owner_name: 'البنك التجاري الدولي', owner_name_en: 'Commercial International Bank',
        manager_name: 'سي آى كابيتال لإدارة الأصول', manager_name_en: 'CI Capital Asset Management',
    })),
    // Below threshold: must NOT publish.
    { fund_id: 300, owner_name: 'بنك صغير', owner_name_en: 'Tiny Bank', manager_name: '', manager_name_en: '' },
];

const providers = buildProviders(rows);
console.log('\n[1] providers resolve from the row shape the PAGE receives');
check('Banque Misr present', !!providers.find((p) => p.slug === 'banque-misr-s-a-e'), true);
check('CI Capital present (manager-only role)', !!providers.find((p) => p.slug === 'ci-capital-asset-management'), true);
check('below-threshold provider excluded', !!providers.find((p) => p.slug === 'tiny-bank'), false);
check('CIB present (owner) even though CI Capital manages', !!providers.find((p) => p.slug === 'commercial-international-bank'), true);

console.log('\n[2] every advertised URL resolves back — both languages');
for (const p of providers) {
    check(`EN ${p.slug}`, findProvider(providers, providerPath(p, 'en').split('/').pop() as string)?.slug ?? null, p.slug);
    const arSlug = decodeURIComponent(providerPath(p, 'ar').split('/').pop() as string);
    check(`AR ${p.slug}`, findProvider(providers, arSlug)?.slug ?? null, p.slug);
    check(`${p.slug} has an Arabic name`, /[؀-ۿ]/.test(p.nameAr) || p.nameAr === p.nameEn, true);
}

console.log('\n[3] every provider matches at least MIN funds');
for (const p of providers) {
    const n = rows.filter((r) => fundBelongsToProvider(r as Record<string, unknown>, p)).length;
    check(`${p.slug} matches >= ${MIN_FUNDS_PER_PROVIDER} funds`, n >= MIN_FUNDS_PER_PROVIDER, true);
}

console.log('\n[4] a row missing owner columns must not silently drop banks');
const noOwner = rows.map(({ owner_name, owner_name_en, ...rest }) => rest);
check('without owner columns, Banque Misr survives via manager', !!buildProviders(noOwner).find((p) => p.slug === 'banque-misr-s-a-e'), true);
check('without owner columns, CIB disappears (owner-only entity)', !!buildProviders(noOwner).find((p) => p.slug === 'commercial-international-bank'), false);

console.log('\n[5] legal-form suffixes are stripped from headings, never from slugs');
const bm = providers.find((p) => p.slug === 'banque-misr-s-a-e');
check('EN display name drops S.A.E', bm?.nameEn, 'Banque Misr');
check('AR display name drops ش.م.م', bm?.nameAr, 'بنك مصر');
check('slug is UNCHANGED (URLs are contracts)', bm?.slug, 'banque-misr-s-a-e');

console.log(failures === 0 ? '\nPASS: fund provider gate\n' : `\nFAIL: ${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
