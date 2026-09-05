#!/usr/bin/env node
/**
 * EGX SECURITY MASTER — the listing authority the public layer publishes from.
 *
 *   node scripts/egx-security-master.mjs                 # rebuild content/egx-security-master.json from the fixtures
 *   node scripts/egx-security-master.mjs --refresh-tv    # refetch TradingView's egypt/scan universe first
 *   node scripts/egx-security-master.mjs --refresh-sme   # refetch the SME-market register first
 *   node scripts/egx-security-master.mjs --refresh-platform  # refetch the platform's symbol list first
 *   node scripts/egx-security-master.mjs --check         # exit 1 if the committed master is stale vs the fixtures
 *
 * WHY THIS EXISTS (audit 2026-09-05). market_tickers is filled from
 * TradingView's egypt/scan — every row the vendor returns became an "EGX
 * listed company" with a page, a sitemap entry and a place in the directory.
 * The vendor carries no listing status, so Global Telecom Holding (GTHE) —
 * delisted by EGX decree on 9 Sep 2019 — was served as an active EGX stock
 * with 2026 OHLC (off-board prints), 40 other lines absent from EGX's
 * registers were published alongside it, eight companies appeared twice
 * (ticker + ISIN alias), two subscription-rights lines were companies, and
 * 22 symbols the vendor had dropped kept three-month-old quotes as "live".
 *
 * THE RULE: a price vendor can populate prices; it cannot grant listing
 * status. Status comes from EGX's own registers (main market + SME market),
 * keyed by ISIN; the vendor supplies identity (ISIN, description) and prices;
 * hand-verified overrides supply documented delistings and identity matches
 * for lines the vendor no longer serves. Anything the registers do not
 * confirm is QUARANTINED (`unverified`): reachable, clearly labelled, not
 * indexed, not counted, not ranked. Nothing is deleted anywhere.
 *
 * Output: content/egx-security-master.json — consumed by lib/security-master.ts
 * (which turns it into the EGX_ONLY publish gate) and tested by
 * scripts/test-security-master.ts.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(root, 'scripts/fixtures');
const OUT = path.join(root, 'content/egx-security-master.json');
const args = process.argv.slice(2);
const today = new Date().toISOString().slice(0, 10);

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 1) + '\n', 'utf8');

async function refreshTv() {
    const res = await fetch('https://scanner.tradingview.com/egypt/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (starta security-master)' },
        body: JSON.stringify({ columns: ['name', 'description', 'sector', 'industry', 'market_cap_basic', 'volume', 'close', 'type', 'subtype', 'isin', 'currency', 'exchange'], range: [0, 600] }),
    });
    if (!res.ok) throw new Error(`TradingView scan HTTP ${res.status}`);
    const data = await res.json();
    const cols = ['name', 'description', 'sector', 'industry', 'market_cap_basic', 'volume', 'close', 'type', 'subtype', 'isin', 'currency', 'exchange'];
    const rows = (data.data || []).map((r) => {
        const d = Object.fromEntries(cols.map((c, i) => [c, r.d[i]]));
        return { symbol: d.name, tv_symbol: r.s, description: d.description, isin: d.isin, sector: d.sector, industry: d.industry, currency: d.currency, market_cap: d.market_cap_basic, volume: d.volume };
    });
    if (rows.length < 250) throw new Error(`TradingView returned only ${rows.length} rows — refusing to overwrite the fixture`);
    const fx = readJson(path.join(FIX, 'tv-egypt-universe.json'));
    writeJson(path.join(FIX, 'tv-egypt-universe.json'), { ...fx, captured_at: today, rows });
    console.log(`[master] TradingView universe refreshed: ${rows.length} rows`);
}

async function refreshSme() {
    const res = await fetch('https://www.egyptsmes.com.eg/en/sme/listedcompanies', { headers: { 'user-agent': 'Mozilla/5.0 (starta security-master)' } });
    if (!res.ok) throw new Error(`SME register HTTP ${res.status}`);
    const html = await res.text();
    const rows = [];
    const re = /data-url="sme\/CompanyDetails\?isin=(EGS[0-9A-Z]{9})">([^<]+)<\/div>[\s\S]*?<td>\s*<div>([^<]*)<\/div>\s*<\/td>\s*<td>(EGS[0-9A-Z]{9})<\/td>\s*<td>([A-Z]{3,5})\.CA<\/td>\s*<td data-order="(\d{8})">/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const [, , name, sector, isin, ticker, d] = m;
        rows.push({ ticker, isin, name: name.trim(), sector: sector.trim(), listing_date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` });
    }
    if (rows.length < 10) throw new Error(`SME register parsed only ${rows.length} rows — refusing to overwrite the fixture`);
    const fx = readJson(path.join(FIX, 'egx-sme-listed.json'));
    writeJson(path.join(FIX, 'egx-sme-listed.json'), { ...fx, captured_at: today, rows });
    console.log(`[master] SME register refreshed: ${rows.length} rows`);
}

async function refreshPlatform() {
    const res = await fetch('https://startamarkets.com/api/v1/egx/stocks?limit=1000', { headers: { 'user-agent': 'starta security-master' } });
    if (!res.ok) throw new Error(`platform API HTTP ${res.status}`);
    const rows = (await res.json()).map((r) => ({ symbol: r.symbol, name_en: r.name_en ?? null, name_ar: r.name_ar ?? null, sector_name: r.sector_name ?? null }));
    if (rows.length < 200) throw new Error(`platform returned only ${rows.length} symbols — refusing to overwrite the fixture`);
    const fx = readJson(path.join(FIX, 'platform-symbols.json'));
    writeJson(path.join(FIX, 'platform-symbols.json'), { ...fx, captured_at: today, rows });
    console.log(`[master] platform symbols refreshed: ${rows.length} rows`);
}

function build() {
    const main = readJson(path.join(FIX, 'egx-official-listed.json'));
    const sme = readJson(path.join(FIX, 'egx-sme-listed.json'));
    const tv = readJson(path.join(FIX, 'tv-egypt-universe.json'));
    const platform = readJson(path.join(FIX, 'platform-symbols.json'));
    const ovr = readJson(path.join(FIX, 'egx-security-overrides.json'));

    const mainByIsin = new Map(main.rows.map((r) => [r.isin, r]));
    const smeByIsin = new Map(sme.rows.map((r) => [r.isin, r]));
    const tvBySymbol = new Map(tv.rows.map((r) => [r.symbol, r]));
    const tvByIsin = new Map();
    for (const r of tv.rows) if (r.isin) tvByIsin.set(r.isin, [...(tvByIsin.get(r.isin) || []), r.symbol]);
    const identity = new Map(ovr.identity.map((o) => [o.symbol, o]));
    const delisted = new Map(ovr.delisted.map((o) => [o.symbol, o]));
    const preferredRe = new RegExp(ovr.share_classes.find((s) => s.security_type === 'preferred').isin_pattern);
    const rightsRe = new RegExp(ovr.rights_name_pattern, 'i');
    const platformSymbols = new Set(platform.rows.map((r) => r.symbol));
    const tvSymbolFor = (isin, self) => (tvByIsin.get(isin) || []).find((s) => s !== self && platformSymbols.has(s)) ?? null;

    const securities = [];
    for (const p of platform.rows) {
        const symbol = p.symbol;
        const tvRow = tvBySymbol.get(symbol) ?? null;
        const ov = identity.get(symbol);
        const isin = tvRow?.isin ?? ov?.isin ?? (/^EGS[0-9A-Z]{9}/.test(symbol) ? symbol.slice(0, 12) : null);
        // A few platform rows carry raw provider tuples instead of names
        // ("ACRO.CA,0P0000B6WW,81902"); never let one become an identity.
        const PROVIDER_TUPLE = /^[A-Z0-9._-]+,0P[0-9A-Z]+,\d+$/;
        const platformName = p.name_en && !PROVIDER_TUPLE.test(p.name_en.trim()) ? p.name_en : null;
        const reg = isin ? mainByIsin.get(isin) ?? null : null;
        const smeReg = isin ? smeByIsin.get(isin) ?? null : null;
        const name_en = tvRow?.description ?? platformName ?? reg?.name ?? smeReg?.name ?? symbol;
        const rec = {
            symbol,
            isin,
            name_en,
            name_ar: p.name_ar ?? null,
            official_name_en: reg?.name ?? smeReg?.name ?? null,
            listing_status: 'unverified',
            market_segment: null,
            security_type: 'common',
            official_sector_en: reg?.sector ?? smeReg?.sector ?? null,
            listing_date: smeReg?.listing_date ?? null,
            delisting_date: null,
            identity_source: tvRow ? 'tradingview' : ov ? ov.method : /^EGS/.test(symbol) ? 'symbol_is_isin' : 'none',
            listing_source: null,
            price_source: 'tradingview',
            price_served_by_vendor: !!tvRow,
            canonical_symbol: null,
            reason: null,
            evidence: [],
            verified_at: main.captured_at,
        };
        if (symbol === 'EGX30' || (p.sector_name || '') === 'Index') {
            Object.assign(rec, { listing_status: 'index', security_type: 'index', reason: 'market index row, not a company' });
        } else if (symbol.endsWith('.CA') && platformSymbols.has(symbol.replace(/\.CA$/, ''))) {
            Object.assign(rec, { listing_status: 'duplicate_alias', canonical_symbol: symbol.replace(/\.CA$/, ''), reason: '.CA suffix alias of a platform symbol' });
        } else if (rightsRe.test(name_en) || rightsRe.test(reg?.name || '')) {
            Object.assign(rec, { listing_status: 'rights', security_type: 'subscription_rights', reason: 'subscription-rights line, not a company', listing_source: reg ? 'egx_register' : null });
        } else if (isin && preferredRe.test(isin)) {
            Object.assign(rec, { listing_status: 'preferred', security_type: 'preferred', reason: 'preferred-share class of a listed company, not a separate company', listing_source: reg ? 'egx_register' : null, market_segment: reg ? 'main' : null });
        } else if (delisted.has(symbol)) {
            const d = delisted.get(symbol);
            Object.assign(rec, { listing_status: 'delisted', delisting_date: d.delisting_date, reason: d.note, evidence: d.evidence, listing_source: 'documented_delisting' });
        } else if (isin && !tvRow && tvSymbolFor(isin, symbol)) {
            // The vendor serves this company under ANOTHER platform symbol
            // (usually its ISIN); this one is the frozen twin.
            Object.assign(rec, { listing_status: 'duplicate_alias', canonical_symbol: tvSymbolFor(isin, symbol), reason: 'same ISIN as a platform symbol the vendor actively serves', listing_source: reg ? 'egx_register' : smeReg ? 'egx_sme_register' : null, market_segment: reg ? 'main' : smeReg ? 'sme' : null });
        } else if (reg) {
            Object.assign(rec, { listing_status: 'listed', market_segment: 'main', listing_source: 'egx_register' });
        } else if (smeReg) {
            Object.assign(rec, { listing_status: 'listed', market_segment: 'sme', listing_source: 'egx_sme_register' });
        } else {
            Object.assign(rec, { listing_status: 'unverified', reason: isin ? 'ISIN not on the EGX main or SME register on the capture date' : 'no ISIN known for this symbol; not on either EGX register by name' });
        }
        if (ov?.note && !rec.reason) rec.reason = ov.note;
        else if (ov?.note && rec.listing_status !== 'delisted') rec.reason = `${rec.reason}; ${ov.note}`;
        securities.push(rec);
    }

    // Register entries the platform does not carry at all — informational,
    // so coverage gaps are visible (Banque du Caire, the EGX30 ETF, …).
    const known = new Set(securities.map((s) => s.isin).filter(Boolean));
    const registerNotOnPlatform = main.rows.filter((r) => !known.has(r.isin)).map((r) => ({ name: r.name, isin: r.isin, sector: r.sector }));

    const counts = {};
    for (const s of securities) counts[s.listing_status] = (counts[s.listing_status] || 0) + 1;
    const publishable = securities.filter((s) => s.listing_status === 'listed').map((s) => s.symbol).sort();

    return {
        _comment: 'GENERATED by scripts/egx-security-master.mjs from scripts/fixtures/* — do not edit by hand. Listing status comes from EGX registers (main + SME) keyed by ISIN; TradingView supplies identity and prices only; overrides supply documented delistings. Consumed by lib/security-master.ts.',
        generated_at: today,
        sources: {
            egx_main_register: { url: main.source_url, captured_at: main.captured_at, rows: main.rows.length },
            egx_sme_register: { url: sme.source_url, captured_at: sme.captured_at, rows: sme.rows.length },
            tradingview_universe: { url: tv.source_url, captured_at: tv.captured_at, rows: tv.rows.length },
            platform_symbols: { url: platform.source_url, captured_at: platform.captured_at, rows: platform.rows.length },
        },
        counts,
        publishable_symbols: publishable,
        securities: securities.sort((a, b) => a.symbol.localeCompare(b.symbol)),
        register_not_on_platform: registerNotOnPlatform,
    };
}

(async () => {
    if (args.includes('--refresh-tv')) await refreshTv();
    if (args.includes('--refresh-sme')) await refreshSme();
    if (args.includes('--refresh-platform')) await refreshPlatform();
    const master = build();
    if (args.includes('--check')) {
        if (!existsSync(OUT)) { console.error('[master] content/egx-security-master.json is missing'); process.exit(1); }
        const current = readJson(OUT);
        const same = JSON.stringify({ ...current, generated_at: null }) === JSON.stringify({ ...master, generated_at: null });
        if (!same) { console.error('[master] committed master is STALE vs the fixtures — run: node scripts/egx-security-master.mjs'); process.exit(1); }
        console.log('[master] committed master matches the fixtures.');
        return;
    }
    writeJson(OUT, master);
    console.log(`[master] wrote ${OUT}`);
    console.log('[master] statuses:', master.counts);
    console.log(`[master] publishable: ${master.publishable_symbols.length}; register entries not on platform: ${master.register_not_on_platform.length}`);
    for (const s of master.securities.filter((x) => x.listing_status !== 'listed')) console.log(`   ${x_(s)}`);
    function x_(s) { return `${s.listing_status.padEnd(15)} ${s.symbol.padEnd(18)} ${s.isin ?? '—'}  ${(s.name_en || '').slice(0, 44)}${s.canonical_symbol ? `  → ${s.canonical_symbol}` : ''}`; }
})().catch((e) => { console.error('[master] FAILED:', e.message); process.exit(1); });
