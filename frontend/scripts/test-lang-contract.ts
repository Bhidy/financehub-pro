/**
 * ============================================================================
 * THE LANGUAGE + HOME CONTRACT, EXECUTED.
 * ============================================================================
 *
 * Source-text gates (scripts/verify-route-aliases.mjs) prove a file SAYS the
 * right thing. This file proves the code DOES the right thing, and — the part
 * that matters — proves the site's TWO implementations of one contract still
 * agree with each other.
 *
 * The 2026-09-06 production defect existed because they did not:
 *
 *   lib/localized-href.ts      localizedHref('/', 'ar')       -> '/ar'
 *   public/.../starta-lang-boot.js  startaLocalizedHref('/')  -> '/'
 *
 * Both files were individually "correct" and individually commented. Nothing
 * compared them, so every Arabic React page linked HOME to the 113 KB Arabic
 * hub while every static page linked the 299 KB designed homepage, and the
 * brand lockup in the very same header disagreed with the nav item beside it.
 *
 * A differential test is the only kind that catches that class of defect, so
 * this one loads the browser file into a sandbox, runs it, and asserts the two
 * functions produce identical output over the whole route corpus.
 *
 * Run: npm run verify:lang   (part of npm run verify:all)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { localizedHref } from '@/lib/localized-href';
import { HOME_PATH, DEFAULT_LANG, resolveStoredLang, isHomePath, langSeedScriptBody, homeCrumb } from '@/lib/lang';
import navConfig from '@/lib/nav.json';
import arTwinRoutes from '@/lib/ar-twin-routes.json';

let failed = 0;
const ok = (cond: boolean, label: string, got?: unknown) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${got !== undefined ? `  got=${JSON.stringify(got)}` : ''}`);
};

const ROOT = process.cwd();

/** Load starta-lang-boot.js in a sandbox and hand back its exported helper. */
function loadBrowserLocalizer(): (path: string) => string {
    const src = readFileSync(path.join(ROOT, 'public/assets/starta-lang-boot.js'), 'utf8');
    const documentEl = { lang: 'ar', dir: 'rtl' };
    const sandbox: Record<string, unknown> = {
        document: { documentElement: documentEl, addEventListener() {} },
        localStorage: { getItem: () => null, setItem: () => {} },
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    const fn = (sandbox as { startaLocalizedHref?: (p: string) => string }).startaLocalizedHref;
    if (typeof fn !== 'function') throw new Error('starta-lang-boot.js did not define window.startaLocalizedHref');
    return (p: string) => {
        documentEl.lang = 'ar';
        return fn(p);
    };
}

/** Every path both implementations must agree on. */
function routeCorpus(): string[] {
    const fromPatterns = arTwinRoutes.patterns.map((p) =>
        p.replace(/^\^/, '').replace(/\$$/, '').replace(/\[\^\/\]\+/g, 'sample').replace(/\\\./g, '.'),
    );
    return [
        // The home URL in every spelling anyone has ever written it.
        '/', '', '/?utm_source=x', '/#top',
        ...navConfig.items.map((i) => i.href),
        ...arTwinRoutes.routes,
        ...fromPatterns,
        // Untwinned single-URL pages: must NEVER acquire an /ar prefix.
        '/login', '/register', '/settings', '/privacy', '/terms', '/Portfolio', '/AiChat',
        // Children whose parent is twinned but they are not (the 4,584-URL 404).
        '/News/12345-headline', '/symbol/COMI/market-cap', '/Learn/glossary/nav/extra',
        // Already-Arabic paths must be left alone.
        '/ar', '/ar/Funds', '/ar/News/999',
    ];
}

(async () => {
    console.log('[1] HOME IS ONE URL — "/" in every language, on every surface (lib/lang.ts R1)');
    ok(HOME_PATH === '/', 'HOME_PATH is "/"', HOME_PATH);
    ok(localizedHref('/', 'ar') === '/', 'localizedHref("/", "ar") === "/"', localizedHref('/', 'ar'));
    ok(localizedHref('/', 'en') === '/', 'localizedHref("/", "en") === "/"', localizedHref('/', 'en'));
    ok(localizedHref('', 'ar') === '/', 'localizedHref("", "ar") === "/"', localizedHref('', 'ar'));
    ok(homeCrumb('ar').href === '/' && homeCrumb('en').href === '/', 'the shared home breadcrumb points at "/" in both languages');
    ok(homeCrumb('ar').url === '/' && homeCrumb('en').url === '/', 'its JSON-LD url matches its visible href (Google requires the pair to agree)');

    console.log('\n[2] the canonical nav says home is "/"');
    const home = navConfig.items.find((i) => i.key === 'nav_home');
    ok(!!home, 'lib/nav.json still defines nav_home');
    ok(home?.href === '/', 'nav_home.href === "/"', home?.href);
    ok(
        navConfig.items.every((i) => localizedHref(i.href, 'ar') !== '/ar' || i.href === '/ar'),
        'no nav item resolves to the Arabic hub as if it were home',
    );

    console.log('\n[3] DIFFERENTIAL — the React localizer and the browser localizer agree');
    const browserLocalize = loadBrowserLocalizer();
    let mismatches = 0;
    for (const p of routeCorpus()) {
        const a = localizedHref(p, 'ar');
        const b = browserLocalize(p);
        // localizedHref uses prefix matching over routes, the browser twin uses
        // exact patterns; both must agree on HOME and must never disagree about
        // whether a path becomes Arabic.
        // BYTE-IDENTICAL, not merely "both chose Arabic". The two helpers are one
        // contract with two runtimes; anything less than equality is drift.
        if (a !== b) {
            mismatches++;
            console.log(`      MISMATCH ${JSON.stringify(p)}: react=${JSON.stringify(a)} browser=${JSON.stringify(b)}`);
        }
    }
    ok(mismatches === 0, 'both implementations return byte-identical hrefs for every route in the corpus', mismatches);

    console.log('\n[3b] the specific regressions prefix matching caused (live-verified 2026-09-06)');
    ok(
        localizedHref('/News/858878-arab-moltaqa-investments', 'ar') === '/News/858878-arab-moltaqa-investments',
        'an English-only article link is NOT moved into the Arabic tree (/ar/News/{id} 308s straight back to English, flipping the reader\'s language)',
        localizedHref('/News/858878-arab-moltaqa-investments', 'ar'),
    );
    // /markets WAS the one path prefix matching minted that did not exist. It
    // exists now (app/ar/markets/page.tsx, the market-data hub), so the rule it
    // proves has moved: a path is prefixed only when its own Arabic route file
    // is on disk, and this asserts both halves rather than the old 404.
    ok(localizedHref('/markets', 'ar') === '/ar/markets', '/markets is prefixed now that its Arabic twin exists', localizedHref('/markets', 'ar'));
    ok(existsSync(path.join(ROOT, 'app/ar/markets/page.tsx')), 'and /ar/markets is a real page, so the prefixed link cannot 404');
    ok(localizedHref('/symbol/COMI/market-cap', 'ar') === '/symbol/COMI/market-cap', 'an untwinned symbol metric tab keeps its English URL');
    ok(localizedHref('/Funds/Compare?ids=1,2&lang=ar', 'ar') === '/ar/Funds/Compare?ids=1,2&lang=ar', 'a twinned route still gets the prefix, query intact', localizedHref('/Funds/Compare?ids=1,2&lang=ar', 'ar'));
    ok(localizedHref('/symbol/COMI/financials', 'ar') === '/ar/symbol/COMI/financials', 'a twinned symbol tab still gets the prefix');
    ok(localizedHref('/ar/Funds', 'ar') === '/ar/Funds', 'an already-Arabic path is never double-prefixed');
    ok(browserLocalize('/') === '/', 'browser startaLocalizedHref("/") === "/"', browserLocalize('/'));
    ok(browserLocalize('') === '/', 'browser startaLocalizedHref("") === "/"', browserLocalize(''));
    ok(browserLocalize('/?a=1') === '/?a=1', 'the query survives the home rule', browserLocalize('/?a=1'));

    console.log('\n[4] ARABIC IS THE DEFAULT, and only "en" selects English (R2/R4)');
    ok(DEFAULT_LANG === 'ar', 'DEFAULT_LANG is Arabic', DEFAULT_LANG);
    ok(resolveStoredLang(null) === 'ar', 'nothing stored -> ar');
    ok(resolveStoredLang(undefined) === 'ar', 'undefined -> ar');
    ok(resolveStoredLang('') === 'ar', 'empty string -> ar');
    ok(resolveStoredLang('EN') === 'ar', 'a wrong-case value is NOT English', resolveStoredLang('EN'));
    ok(resolveStoredLang('garbage') === 'ar', 'a corrupted value falls back to the default');
    ok(resolveStoredLang('en') === 'en', 'the literal "en" -> en');
    ok(resolveStoredLang('ar') === 'ar', 'the literal "ar" -> ar');

    console.log('\n[5] the browser boot resolves storage with the SAME rule');
    const boot = readFileSync(path.join(ROOT, 'public/assets/starta-lang-boot.js'), 'utf8');
    ok(/var lang = "ar"/.test(boot), 'lang-boot starts from the Arabic default');
    ok(/stored === "en"/.test(boot), 'lang-boot promotes ONLY the literal "en"');
    ok(!/stored === "ar"/.test(boot), 'lang-boot never inverts the rule');

    console.log('\n[6] the seed writes both keys and the cookie, in both languages (R3)');
    for (const lang of ['ar', 'en'] as const) {
        const body = langSeedScriptBody(lang);
        ok(body.includes(`localStorage.setItem('starta-lang','${lang}')`), `seed(${lang}) writes the canonical key`);
        ok(body.includes(`localStorage.setItem('lang','${lang}')`), `seed(${lang}) writes the legacy key`);
        ok(body.includes(`starta-lang=${lang};path=/;max-age=31536000`), `seed(${lang}) writes the cookie mirror`);
        ok(body.startsWith('try{') && body.includes('}catch(e){}'), `seed(${lang}) cannot throw in private mode`);
    }

    console.log('\n[7] isHomePath recognises every spelling of home');
    for (const p of ['/', '', '/ar', '/ar/', '/?x=1', '/ar#a']) ok(isHomePath(p), `isHomePath(${JSON.stringify(p)})`);
    for (const p of ['/Funds', '/ar/Funds', '/article', '/archive']) ok(!isHomePath(p), `!isHomePath(${JSON.stringify(p)})`);

    console.log(failed === 0 ? '\nPASS — language + home contract holds' : `\nFAIL — ${failed} assertion(s)`);
    process.exit(failed === 0 ? 0 : 1);
})();
