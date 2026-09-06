/**
 * The Arabic designed hubs must render an ARABIC <h1> in SERVER HTML.
 *
 * /ar/Funds is the site's most valuable Arabic commercial URL. It serves the
 * shared marketplace.html shell, whose markup default is the English
 * "Mutual Funds"; renderStaticHub's heroText is what replaces it. A JS-running
 * crawler recovers the Arabic from the page's own i18n pass, but the answer
 * engines robots.txt explicitly invites (OAI-SearchBot, PerplexityBot, CCBot)
 * largely do not run JS — so a failed replacement ships an English heading to
 * exactly the systems the Arabic strategy targets, and nothing in the build
 * notices.
 *
 * This asserts the rendered output rather than the source, so it fails whether
 * the cause is a changed shell, a broken regex or a dropped option.
 */
import { renderStaticHub } from '@/lib/static-hub';
import { renderFundHub } from '@/lib/fund-hub';
import { GET as arHomeGET } from '@/app/ar/route';

const HERO_AR = 'الصناديق الاستثمارية';

const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

let failed = 0;
const ok = (cond: boolean, label: string, got?: unknown) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${got !== undefined ? `  got=${JSON.stringify(got)}` : ''}`);
};

(async () => {
    console.log('[1] /ar/Funds hero renders in Arabic, server-side');
    const res = await renderStaticHub({
        file: 'marketplace.html',
        lang: 'ar',
        heroText: [{ dataKey: 'marketplace_title', text: HERO_AR, keepKey: true }],
        injections: [{ id: 'fundsGrid', html: '<div></div>' }],
        // Required by StaticHubOptions; irrelevant to what this asserts, but
        // omitting it fails `tsc --noEmit` and therefore the production build.
        cacheSeconds: 0,
    });
    const html = await res.text();
    const m = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
    const h1 = (m ? m[1] : '').replace(/<[^>]*>/g, '').trim();
    ok(!!m, 'the shell still has an <h1>');
    ok(hasArabic(h1), 'the rendered <h1> is Arabic', h1.slice(0, 40));
    ok(!/Mutual Funds/.test(h1), 'the English markup default was replaced', h1.slice(0, 40));

    console.log('\n[2] keepKey preserves the data-key so the language toggle still works');
    ok(/data-key="marketplace_title"/.test(html), 'data-key survives the replacement');

    console.log('\n[3] the <html> tag is rewritten to Arabic');
    const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? '';
    ok(/lang="ar"/.test(htmlTag), 'lang="ar"', htmlTag.slice(0, 80));
    ok(/dir="rtl"/.test(htmlTag), 'dir="rtl"');

    console.log('\n[4] a category/provider hub declares exactly ONE hreflang cluster');
    // marketplace.html carries the /Funds hub's own triple; the shared hub
    // renderer must strip it, or every category/provider page ships two
    // clusters (verified live 2026-09-05 on all 82 hubs).
    const hub = await renderFundHub({
        lang: 'ar',
        canonical: '/ar/Funds/category/test',
        altPath: '/Funds/category/test',
        title: 't',
        description: 'd',
        heading: 'h',
        intro: 'i',
        funds: [{ fund_id: 1, fund_name: 'صندوق', fund_name_en: 'Fund', latest_nav: 10, currency: 'EGP', return_1y: 1, return_ytd: 1 }],
        crumbs: [{ name: 'x' }],
        cacheSeconds: 0,
    });
    const hubHtml = await hub.text();
    const perLang = (l: string) => (hubHtml.match(new RegExp(`hreflang="${l}"`, 'g')) || []).length;
    ok(perLang('en') === 1, 'exactly one hreflang="en"', perLang('en'));
    ok(perLang('ar') === 1, 'exactly one hreflang="ar"', perLang('ar'));
    ok(perLang('x-default') === 1, 'exactly one hreflang="x-default"', perLang('x-default'));
    ok(!hubHtml.includes('hreflang="en" href="https://startamarkets.com/Funds">'), "the shell's /Funds alternates were removed");
    ok((hubHtml.match(/rel="canonical"/g) || []).length === 1, 'exactly one canonical');

    console.log('\n[5] /ar IS the designed homepage, in Arabic, in SERVER HTML');
    // /ar was a 113 KB hand-written link list while "/" served the 299 KB
    // designed homepage — on a site whose default language is Arabic and whose
    // "/" declares /ar its Arabic twin. It is now the same designed file.
    // These assertions render the real route, because the failure mode that
    // shipped it was a dictionary the parser could not read: the route returned
    // 200, the <html> tag said lang="ar", and the <h1> said "A Smarter Vision".
    const arHome = await arHomeGET();
    const homeHtml = await arHome.text();
    const homeTag = /<html[^>]*>/.exec(homeHtml)?.[0] ?? '';
    const homeH1 = (/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(homeHtml)?.[1] ?? '').replace(/<[^>]*>/g, '').trim();
    ok(arHome.status === 200, '/ar returns 200', arHome.status);
    ok(homeHtml.length > 200_000, 'it is the DESIGNED homepage, not a text hub', homeHtml.length);
    ok(/lang="ar"/.test(homeTag) && /dir="rtl"/.test(homeTag), 'the document declares Arabic and RTL', homeTag.slice(0, 80));
    ok(hasArabic(homeH1), 'the <h1> is Arabic without running JS', homeH1.slice(0, 50));
    ok(!/Smarter Vision/.test(homeH1), 'the English markup default was replaced', homeH1.slice(0, 50));
    ok(/<link rel="canonical" href="https:\/\/startamarkets\.com\/ar">/.test(homeHtml), 'canonical is /ar');
    ok(/setItem\('starta-lang','ar'\)/.test(homeHtml), 'it seeds Arabic before the page script reads storage');
    const homeAnchors = [...homeHtml.matchAll(/<a\b[^>]*\shref="(\/[^"]*)"/g)].map((m) => m[1]);
    const twinnable = homeAnchors.filter((h) => /^\/(Funds|News|Learn|Calculators|RiskAssessment|Market-Pulse|companies|about|contact|markets|sectors)(\/|$)/.test(h));
    ok(twinnable.length === 0, 'every twinned link points into the Arabic tree', twinnable.slice(0, 5));
    ok(homeAnchors.includes('/'), 'HOME is still "/" — one home URL in both languages');
    const arabicWords = (homeHtml.match(/[؀-ۿ]+/g) || []).length;
    ok(arabicWords > 500, 'the page is substantively Arabic in the served HTML', arabicWords);

    if (failed > 0) {
        console.error(`\nFAIL: Arabic hub hero — ${failed} problem(s).`);
        process.exit(1);
    }
    console.log('\nPASS: Arabic hubs and the Arabic homepage render server-side');
})();
