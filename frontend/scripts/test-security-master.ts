/**
 * SECURITY MASTER GATE — the listing authority must be internally consistent
 * and must hold the specific facts that went wrong in production.
 *
 * Run: npx tsx scripts/test-security-master.ts
 *
 * WHY THIS EXISTS (audit 2026-09-05): GTHE — delisted by EGX decree on
 * 9 Sep 2019 — was published as an active EGX company with 2026 OHLC, eight
 * companies were published twice (ticker + ISIN alias), subscription-rights
 * lines were "companies", and 40 lines absent from EGX's registers sat in the
 * directory because the price vendor returned a row for them. This asserts
 * the master that now gates publication, on the committed artefact itself,
 * and refuses a master that is stale against its own fixtures.
 */
import { execFileSync } from 'node:child_process';
import master from '../content/egx-security-master.json';
import { EGX_OFFICIAL_SECTORS, officialSector } from '../content/egx-official-sectors';

let failed = 0;
const ok = (cond: boolean, label: string, got?: unknown) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${got !== undefined ? `  got=${JSON.stringify(got)}` : ''}`);
};

type Sec = (typeof master.securities)[number];
const bySymbol = new Map<string, Sec>(master.securities.map((s) => [s.symbol, s]));
const listed = master.securities.filter((s) => s.listing_status === 'listed');

console.log('[1] the committed master is what the fixtures produce');
let fresh = true;
try {
    execFileSync('node', ['scripts/egx-security-master.mjs', '--check'], { stdio: 'pipe' });
} catch {
    fresh = false;
}
ok(fresh, 'content/egx-security-master.json matches scripts/fixtures/* (run: node scripts/egx-security-master.mjs)');

console.log('\n[2] the incident facts');
const gthe = bySymbol.get('GTHE');
ok(gthe?.listing_status === 'delisted', 'GTHE is delisted', gthe?.listing_status);
ok(gthe?.delisting_date === '2019-09-09', 'GTHE delisting date is the EGX decree date', gthe?.delisting_date);
ok((gthe?.evidence.length ?? 0) >= 1 && gthe!.evidence.every((u) => /^https:\/\//.test(u)), 'GTHE carries source evidence URLs');
ok(!master.publishable_symbols.includes('GTHE'), 'GTHE is not publishable');
for (const s of ['EGS924G1C014', 'EGS924I1C012', 'EGS924K1C018']) ok(bySymbol.get(s)?.listing_status === 'rights', `${s} is a subscription-rights line`, bySymbol.get(s)?.listing_status);
ok(bySymbol.get('CCAPP')?.listing_status === 'preferred', 'CCAPP is the QALA preferred-share class, not a company', bySymbol.get('CCAPP')?.listing_status);
ok(bySymbol.get('EGX30')?.listing_status === 'index', 'EGX30 is the index row');
for (const [alias, canon] of [['EGS66DU1C015', 'ALXD'], ['EGS70311C013', 'EGOTH'], ['EGS651F1C014', 'MMHC'], ['EGS39022C016', 'ENPI'], ['EGS3J7D2C015', 'PMSC'], ['ACTF.CA', 'ACTF']]) {
    const s = bySymbol.get(alias);
    ok(s?.listing_status === 'duplicate_alias' && s?.canonical_symbol === canon, `${alias} is a duplicate alias of ${canon}`, `${s?.listing_status}→${s?.canonical_symbol}`);
}
for (const s of ['COMI', 'TMGH', 'SWDY', 'ETEL', 'ABUK', 'EAST', 'HRHO']) ok(bySymbol.get(s)?.listing_status === 'listed' && bySymbol.get(s)?.market_segment === 'main', `${s} is listed on the main market`);
for (const s of ['TOUR', 'FTNS', 'INEG']) ok(bySymbol.get(s)?.listing_status === 'listed' && bySymbol.get(s)?.market_segment === 'sme', `${s} is listed on the SME market`);
ok(bySymbol.get('TMGH')?.official_sector_en === 'Real Estate', 'TMGH carries EGX’s own sector (Real Estate), not the vendor’s "Finance"', bySymbol.get('TMGH')?.official_sector_en);

console.log('\n[3] structural invariants');
ok(new Set(master.securities.map((s) => s.symbol)).size === master.securities.length, 'symbols are unique');
ok(master.publishable_symbols.every((s) => bySymbol.get(s)?.listing_status === 'listed'), 'publishable ⇔ listed');
ok(listed.length === master.publishable_symbols.length, 'publishable list is complete', [listed.length, master.publishable_symbols.length]);
ok(listed.every((s) => s.isin && /^EGS[0-9A-Z]{9}$/.test(s.isin)), 'every listed security has an ISIN');
ok(listed.every((s) => s.listing_source === 'egx_register' || s.listing_source === 'egx_sme_register'), 'every listed status comes from an EGX register');
ok(listed.every((s) => officialSector(s.official_sector_en) !== null), 'every listed security maps to one of the 18 official sectors', listed.filter((s) => !officialSector(s.official_sector_en)).map((s) => `${s.symbol}:${s.official_sector_en}`).slice(0, 5));
ok(EGX_OFFICIAL_SECTORS.length === 18 && new Set(EGX_OFFICIAL_SECTORS.map((s) => s.slug)).size === 18, '18 official sectors, unique slugs');
const listedIsins = listed.map((s) => s.isin);
ok(new Set(listedIsins).size === listedIsins.length, 'no ISIN is published under two symbols', listedIsins.filter((v, i, a) => a.indexOf(v) !== i));
ok(master.securities.filter((s) => s.listing_status !== 'listed').every((s) => s.reason), 'every non-listed security states a reason');
ok(master.securities.every((s) => /^[A-Z0-9][A-Z0-9.\-]{0,23}$/.test(s.symbol)), 'every symbol is in the safe SQL alphabet');
ok(listed.length >= 250 && listed.length <= 320, 'publishable universe is a plausible EGX size', listed.length);
ok(master.securities.filter((s) => s.listing_status === 'unverified').length <= 40, 'quarantine is bounded (a growing quarantine means the registers need refreshing)', master.securities.filter((s) => s.listing_status === 'unverified').length);

if (failed > 0) {
    console.error(`\nFAIL: security master — ${failed} problem(s).`);
    process.exit(1);
}
console.log('\nPASS: the security master is consistent and holds the incident facts');
