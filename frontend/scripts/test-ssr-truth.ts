/**
 * SSR TRUTHFULNESS GATE — a server-rendered designed shell must describe, in
 * the HTML it sends, exactly what it renders in that same response.
 *
 * WHY THIS EXISTS (live audit 2026-09-05): /ar/Funds shipped the shell's
 * literal `<span id="resultsCount">0</span> funds matching your filters`
 * directly above 207 server-rendered fund rows, and every filter label, table
 * header, nav item and empty-state sentence in ENGLISH inside an
 * `<html lang="ar">` document — for Googlebot, OAI-SearchBot, bingbot and
 * PerplexityBot alike. A browser hid both defects (the page's own scripts
 * overwrite the count and translate the labels on load), which is exactly why
 * they survived every review.
 *
 * This renders the real shells through the real renderer with fixture data and
 * asserts the invariants on the OUTPUT, so it fails whether the cause is a
 * changed shell, a missing dictionary, a broken regex or a dropped injection.
 *
 * Run: npx tsx scripts/test-ssr-truth.ts
 */
import { readFileSync } from 'node:fs';
import { renderStaticHub } from '@/lib/static-hub';
import { renderFundHub } from '@/lib/fund-hub';
import { fundsHubRows, fundsCountInjection } from '@/lib/funds-hub-render';

let failed = 0;
const ok = (cond: boolean, label: string, got?: unknown) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${got !== undefined ? `  got=${JSON.stringify(got)}` : ''}`);
};

/** The English defaults every marketplace-shell route used to leak. */
const ENGLISH_DEFAULTS = [
    'funds matching your filters', 'Filters', 'Reset all', 'Search fund', 'Fund type', 'Manager', 'Issuer',
    'Management fee', 'Sort by', 'Subscription frequency', 'Redemption frequency', 'No entry / exit fees',
    'Shariah-compliant only', 'Return period', 'NAV range (EGP)', 'Grid', 'Table',
    'No funds matched this filter set.', 'Research with clarity, then act.', 'HOME', 'MUTUAL FUNDS', 'MARKET NEWS', 'LEARN',
];
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** An English default present as the TEXT of a keyed element (not inside a script). */
const leaks = (html: string) => {
    const noScript = html.replace(/<script[\s\S]*?<\/script>/g, '');
    return ENGLISH_DEFAULTS.filter((s) => new RegExp(`data-key="[^"]+"[^>]*>\\s*${escapeRe(s)}\\s*<`).test(noScript));
};

const fixture = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
        fund_id: 1000 + i,
        fund_name: `صندوق تجريبي ${i + 1}`,
        fund_name_en: i === 0 ? 'Fixture Fixed Income Fund USD' : `Fixture Fund ${i + 1}`,
        fund_type: 'money_market',
        latest_nav: 10 + i,
        currency: 'EGP',
        return_1y: 5 + i,
        return_ytd: 1 + i,
        last_nav_date: '2026-09-01',
        nav_points: 100,
        returns_source: 'computed',
    }));

(async () => {
    console.log('[1] Arabic marketplace shell: count == rows, no English dictionary defaults');
    const funds = fixture(7);
    const res = await renderStaticHub({
        file: 'marketplace.html',
        lang: 'ar',
        injections: [{ id: 'fundsGrid', html: fundsHubRows(funds, 'ar') }, fundsCountInjection(funds)],
        cacheSeconds: 0,
    });
    const html = await res.text();
    const count = /id="resultsCount"[^>]*>([^<]*)</.exec(html)?.[1];
    // Hub rows only — the designed shell carries two <article>s of its own.
    const rows = (html.match(/<h3><a href="\/ar\/Funds\//g) || []).length;
    ok(count === '7', 'the results counter carries the real count', count);
    ok(rows === 7, 'seven fund articles were rendered', rows);
    ok(!/>\s*0\s*<\/span>\s*<span data-key="results_label"/.test(html), 'the literal "0 … matching" default is gone');
    ok(leaks(html).length === 0, 'no English dictionary default remains on a keyed element', leaks(html));
    ok(/data-key="results_label">صندوقاً مطابقاً للفلاتر</.test(html), 'results label is the shell’s own Arabic value');
    ok(/data-key="nav_home">الرئيسية</.test(html), 'shared chrome (nav) is Arabic');
    ok(/id="fundSearch"[^>]*placeholder="ابحث باسم الصندوق أو المدير"/.test(html), 'input placeholder is Arabic');
    ok(/id="langToggle"[^>]*>EN</.test(html), 'language toggle offers the OTHER language (EN)');
    ok((html.match(/data-key="filters_title"/g) || []).length === 1, 'data-key attributes survive (toggle keeps working)');
    ok(/Fixture Fixed Income Fund USD[\s\S]*?<dd>[^<]*USD<\/dd>/.test(html), 'a USD fund is denominated USD, not EGP');

    console.log('\n[2] English marketplace shell: byte-identical to the design apart from the injected content');
    const enRes = await renderStaticHub({ file: 'marketplace.html', lang: 'en', injections: [fundsCountInjection(funds)], cacheSeconds: 0 });
    const enHtml = await enRes.text();
    const shell = readFileSync('public/marketplace.html', 'utf8');
    const strip = (s: string) => s.replace(/<html[^>]*>/, '').replace(/id="resultsCount"[^>]*>[^<]*</, 'id="resultsCount">#<');
    ok(strip(enHtml) === strip(shell), 'the EN shell is untouched (design contract)');
    ok(/id="resultsCount"[^>]*>7</.test(enHtml), 'EN count injected too');
    ok(/data-key="results_label">funds matching your filters</.test(enHtml), 'EN labels stay English (no over-translation)');

    console.log('\n[3] The shared hub renderer (category/provider pages) carries the same guarantees');
    const hub = await renderFundHub({
        lang: 'ar',
        canonical: '/ar/Funds/category/x',
        altPath: '/Funds/category/x',
        title: 't', description: 'd', heading: 'صناديق أسواق النقد في مصر', intro: 'i',
        funds: fixture(3),
        crumbs: [{ name: 'x' }],
        cacheSeconds: 0,
    });
    const hubHtml = await hub.text();
    ok(/id="resultsCount"[^>]*>3</.test(hubHtml), 'hub counter == hub rows', /id="resultsCount"[^>]*>([^<]*)</.exec(hubHtml)?.[1]);
    ok(leaks(hubHtml).length === 0, 'hub has no English dictionary defaults', leaks(hubHtml));
    ok(/<h1[^>]*>\s*صناديق أسواق النقد في مصر\s*<\/h1>/.test(hubHtml), 'page-specific heading still wins over the dictionary');

    console.log('\n[4] Other Arabic shells get the shared chrome localized');
    for (const file of ['learn.html', 'news.html', 'fund-compare.html']) {
        const r = await renderStaticHub({ file, lang: 'ar', injections: [], cacheSeconds: 0 });
        const h = await r.text();
        ok(/data-key="nav_home">الرئيسية</.test(h), `${file}: nav is Arabic`);
        ok(!/data-key="footer_lnk_about">About</.test(h), `${file}: footer is not English`);
    }

    console.log('\n[5] An empty result set is honest: count 0 and no rows');
    const empty = await renderStaticHub({
        file: 'marketplace.html', lang: 'ar',
        injections: [{ id: 'fundsGrid', html: fundsHubRows([], 'ar') }, fundsCountInjection([])],
        cacheSeconds: 0,
    });
    const emptyHtml = await empty.text();
    ok(/id="resultsCount"[^>]*>0</.test(emptyHtml) && !/<h3><a href="\/ar\/Funds\//.test(emptyHtml), 'zero rows ⇒ counter 0');

    if (failed > 0) {
        console.error(`\nFAIL: SSR truthfulness — ${failed} problem(s).`);
        process.exit(1);
    }
    console.log('\nPASS: server-rendered shells describe exactly what they render');
})();
