/**
 * verify:news — the news purity + duplicate-canonical chokepoint.
 *
 * Proves the ONE function every news emitter goes through (sitemaps, hubs,
 * feeds, Market Pulse, the article page) makes the decisions the archive
 * audit of 2026-09-05 required:
 *   - a Saudi-market story that arrived through the Egypt feed (SAR/TASI/
 *     Tadawul, symbol NULL) is off-market;
 *   - a story that mapped to an EGX ticker is never off-market;
 *   - ordinary EGX headlines ("Sarwa", EGP, Arabic) are never caught;
 *   - of several copies of one headline only the lowest id survives, and the
 *     dedupe key ignores dateline prefixes the page strips anyway.
 */
import { isOffMarketNews, isUnpublishableNews, newsSuppressionReason, newsDedupeKey, primaryNewsRows } from '../lib/news-display';

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
    if (ok) return;
    failures += 1;
    console.error(`FAIL ${name}`, detail === undefined ? '' : JSON.stringify(detail));
}

// --- off-market -----------------------------------------------------------
check('SAR + no symbol is off-market', isOffMarketNews('Aramco raises SAR 5bn through sukuk', null));
check('TASI + no symbol is off-market', isOffMarketNews('TASI closes higher as banks rally', null));
check('Tadawul + no symbol is off-market', isOffMarketNews('Flynas lists on Tadawul', null));
check('Arabic riyal + no symbol is off-market', isOffMarketNews('أرامكو تجمع 5 مليارات ريال من الصكوك', null));
check('symbol wins over SAR', !isOffMarketNews('SAIB signs SAR 100m facility', 'SAIB'));
check('EGP story stays', !isOffMarketNews('CIB posts EGP 20bn net profit', null));
check('Arabic EGP story stays', !isOffMarketNews('البنك التجاري الدولي يحقق أرباحًا بقيمة 20 مليار جنيه', null));
check('"Sarwa" is not SAR', !isOffMarketNews('Sarwa Capital lists on EGX', null));
check('lower-case sar is not the currency code', !isOffMarketNews('Sar El Nile announces results', null));
check('empty headline is not off-market', !isOffMarketNews('', null));
// body lede: SAR in the first 400 chars and nothing naming Egypt
check('SAR in the lede with no Egypt marker is off-market', isOffMarketNews('KDL Logistics shifts to net losses in H1-26', null, 'Khaled Dhafer and Brothers for Logistics Services Company incurred a net loss of SAR 4.19 million'));
check('SAR in the lede but an Egypt marker keeps it', !isOffMarketNews('Exports to Saudi rise', null, 'Egypt exported goods worth SAR 2bn to Saudi Arabia in H1'));
check('body beyond 400 chars is ignored', !isOffMarketNews('Quarterly update', null, 'x'.repeat(420) + ' SAR 5m'));
// the January 2026 mover generator priced EGX movers in SAR — wrong number, never published
check('mislabeled EGX mover is suppressed even with a symbol', newsSuppressionReason('Catalyst Partners (CPME) surges 6.71% to 18.3 SAR on strong buying volume.', 'CPME') === 'mislabeled-currency');
check('mislabeled mover is unpublishable but not off-market', isUnpublishableNews('Prime Holding (PRMH) slides 4% to 1.59 SAR amid volatility', 'PRMH') && !isOffMarketNews('Prime Holding (PRMH) slides 4% to 1.59 SAR amid volatility', 'PRMH'));
check('EGP mover is fine', !isUnpublishableNews('Prime Holding (PRMH) slides 4% to 1.59 EGP amid volatility', 'PRMH'));

// --- dedupe key -------------------------------------------------------------
check('dateline prefix does not change identity', newsDedupeKey('Egypt - EGX ends higher') === newsDedupeKey('EGX ends higher'));
check('case and punctuation do not change identity', newsDedupeKey('EGX30 ends higher, banks lead') === newsDedupeKey('egx30 ends higher — banks lead'));
check('different headlines differ', newsDedupeKey('EGX ends higher') !== newsDedupeKey('EGX ends lower'));

// --- primary rows -----------------------------------------------------------
const rows = [
    { id: 20, headline: 'EGX ends higher', symbol: null },
    { id: 10, headline: 'Egypt - EGX ends higher', symbol: null },
    { id: 30, headline: 'Aramco raises SAR 5bn', symbol: null },
    { id: 40, headline: 'SAIB signs SAR 100m facility', symbol: 'SAIB' },
    { id: 50, headline: 'CIB posts EGP 20bn net profit', symbol: 'COMI' },
    { id: 60, headline: 'CIB posts EGP 20bn net profit', symbol: 'COMI' },
    { id: 70, headline: 'Pan Gulf Marketing swings to net loss in H1-26', symbol: null, body_head: 'Pan Gulf Marketing Company shifted to a net loss of SAR 12.31 million' },
    { id: 80, headline: 'Taqa Arabia (TAQA) surges 8.38% to 14.49 SAR on strong buying volume', symbol: 'TAQA' },
];
const kept = primaryNewsRows(rows).map((r) => r.id);
check('keeps the lowest id per headline, drops off-market, preserves order', JSON.stringify(kept) === JSON.stringify([10, 40, 50]), kept);
check('does not mutate input order', rows[0].id === 20);

if (failures) {
    console.error(`verify:news FAILED (${failures})`);
    process.exit(1);
}
console.log('verify:news OK — off-market filter, dedupe key and primary-row selection behave');
