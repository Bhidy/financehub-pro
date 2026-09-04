/**
 * Glossary content contract.
 *
 * Three things must hold or the term pages regress to the thin state the SEO
 * auditor flagged (43 terms x 2 languages at ~200-260 words each):
 *   1. Every term has a depth entry, in BOTH languages, with all three fields.
 *   2. No orphan depth entries for terms that no longer exist.
 *   3. Every GLOSSARY_SITE_LINKS href is a real route on this site — a glossary
 *      link that 404s is worse than no link.
 *
 * (3) is checked against a literal list of known routes rather than the router,
 * because the router is not importable from a plain script; adding a new link
 * target means adding it here, which is the point — it forces a deliberate check.
 */
import { GLOSSARY_TERMS, GLOSSARY_SITE_LINKS } from '@/content/glossary-terms';
import { GLOSSARY_DETAIL } from '@/content/glossary-detail';

let failed = 0;
const ok = (cond: boolean, label: string, got?: unknown) => {
    if (!cond) failed++;
    console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}${got !== undefined ? `  got=${JSON.stringify(got)}` : ''}`);
};

console.log('[1] every term has depth in both languages');
const missing = GLOSSARY_TERMS.filter((t) => !GLOSSARY_DETAIL[t.slug]);
ok(missing.length === 0, 'no term is missing a depth entry', missing.map((t) => t.slug));

for (const t of GLOSSARY_TERMS) {
    const d = GLOSSARY_DETAIL[t.slug];
    if (!d) continue;
    for (const lang of ['en', 'ar'] as const) {
        const side = d[lang];
        const complete = !!side && ['example', 'whyItMatters', 'mistake'].every(
            (k) => typeof (side as Record<string, unknown>)[k] === 'string' && ((side as Record<string, string>)[k]).trim().length > 40
        );
        if (!complete) ok(false, `${t.slug} [${lang}] has all three fields with real content`);
    }
}
ok(failed === 0 || missing.length > 0, 'all depth fields are populated in both languages');

console.log('\n[2] no orphan depth entries');
const orphans = Object.keys(GLOSSARY_DETAIL).filter((s) => !GLOSSARY_TERMS.some((t) => t.slug === s));
ok(orphans.length === 0, 'every depth entry maps to a real term', orphans);

console.log('\n[3] every site link points at a real route');
const KNOWN_ROUTES = new Set([
    '/companies', '/Market-Pulse', '/Funds', '/Funds/prices-today', '/Funds/fees',
    '/Funds/category/money-market', '/Funds/category/fixed-income', '/Funds/category/equity',
    '/Funds/category/balanced', '/Funds/category/gold', '/Funds/category/shariah',
    '/markets/egx30', '/markets/largest-companies', '/markets/most-active',
    '/markets/most-volatile', '/markets/top-gainers', '/markets/top-losers',
    '/Learn/what-are-dividends', '/Learn/diversification-made-simple',
    '/Learn/savings-certificates-vs-funds',
]);
for (const [slug, links] of Object.entries(GLOSSARY_SITE_LINKS)) {
    for (const l of links) {
        ok(KNOWN_ROUTES.has(l.href), `${slug} → ${l.href}`);
        ok(!!l.en?.trim() && !!l.ar?.trim(), `${slug} link is bilingual`);
    }
}

if (failed > 0) {
    console.error(`\nFAIL: glossary contract — ${failed} problem(s).`);
    process.exit(1);
}
console.log(`\nPASS: glossary contract (${GLOSSARY_TERMS.length} terms, ${Object.keys(GLOSSARY_SITE_LINKS).length} linked)`);
