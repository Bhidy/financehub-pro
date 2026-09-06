import { renderStaticHub, esc, jsonLdScript, langSeedScript } from '@/lib/static-hub';
import { SITE_URL } from '@/lib/seo';

/**
 * /ar — THE ARABIC HOMEPAGE, on the designed homepage.
 *
 * WHAT THIS REPLACED, AND WHY
 * /ar used to be a hand-written text hub: an <h1>, a paragraph, an index tile
 * and eleven links — 113 KB against the designed homepage's 299 KB. It existed
 * because /ar had been a 308→404 loop and the Arabic tree had no root, and as a
 * stopgap it worked. As a homepage it did not: the site's default language is
 * ARABIC, and `/` declares /ar its Arabic twin, so the majority of organic
 * homepage traffic — the readers this product is actually for — met a list of
 * links where English readers met the product.
 *
 * The owner's report on 2026-09-06 was that clicking HOME opened "the wrong
 * page". Pointing every HOME link at `/` fixed the click. This fixes the page.
 *
 * HOW — the designed-shell contract, the same one /Funds, /News, /Learn and
 * /Market-Pulse are served through (lib/static-hub.ts). This route returns
 * home.html ITSELF, byte-for-byte the designed homepage, with:
 *   • <html lang="ar" dir="rtl">, so the document stops declaring itself English
 *   • the page's OWN dictionary applied server-side, so a crawler that does not
 *     run JS is served the same Arabic a visitor reads
 *   • every internal anchor localised to its Arabic twin (/Funds -> /ar/Funds),
 *     and HOME left at "/" (lib/lang.ts R1)
 *   • the Arabic <title>, description, canonical and OG pair
 * It is NOT a plain server page wearing the homepage's name — that mistake was
 * made once (#130) and rolled back. Nothing about the design changes.
 *
 * WHERE THE OLD PAGE'S LINKS WENT — it was the only surface linking the Arabic
 * money pages (/ar/markets/*, /ar/sectors, /ar/Learn/glossary). They are not
 * lost: /markets and /ar/markets are now a real market-data hub gathering all
 * twelve of them, and the shared footer on every page in both trees links that
 * hub, Market Pulse and the glossary. Those links moved from one page to every
 * page.
 */

export const dynamic = 'force-dynamic';

const AR_TITLE = 'ستارتا ماركتس — صناديق الاستثمار وأسهم البورصة المصرية';
const AR_DESC =
    'منصة الصناديق الاستثمارية في مصر: سجل موثّق لصافي قيمة الوحدة، والرسوم والمخاطر بوضوح، ومقارنة الصناديق، وأخبار البورصة المصرية، وحاسبات الثروة.';

// The designed file's own head, verbatim — the anchors these replacements match.
const EN_TITLE_TAG = '<title>Starta Markets — EGX Stocks, Mutual Funds &amp; Market Data</title>';
const EN_OG_TITLE = 'Starta Markets — EGX Stocks, Mutual Funds &amp; Market Data';
const EN_DESC =
    'The bilingual mutual-fund platform for Egypt: verified NAV history, fees and risk scorecards, fund comparison, market news and wealth calculators.';
const EN_OG_DESC =
    'Starta is the bilingual mutual-fund platform for the Egyptian market: verified NAV history, fees and risk scorecards, side-by-side fund comparison, market news and wealth calculators.';

export async function GET() {
    return renderStaticHub({
        file: 'home.html',
        lang: 'ar',
        // No content injection: home.html renders its own funds, news, academy
        // and market blocks client-side, and the server-side dictionary pass
        // already puts this page's Arabic in the HTML. Adding markup here would
        // change what a visitor sees on the designed homepage, which is the one
        // thing this contract forbids.
        injections: [],
        replacements: [
            { find: EN_TITLE_TAG, replace: `<title>${esc(AR_TITLE)}</title>` },
            { find: `content="${EN_DESC}"`, replace: `content="${esc(AR_DESC)}"` },
            { find: `content="${EN_OG_DESC}"`, replace: `content="${esc(AR_DESC)}"` },
            { find: `content="${EN_OG_TITLE}"`, replace: `content="${esc(AR_TITLE)}"` },
            { find: '<link rel="canonical" href="https://startamarkets.com/">', replace: `<link rel="canonical" href="${SITE_URL}/ar">` },
            { find: '<meta property="og:url" content="https://startamarkets.com/">', replace: `<meta property="og:url" content="${SITE_URL}/ar">` },
            { find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' },
        ],
        // home.html already declares the reciprocal hreflang triple (en -> /,
        // ar -> /ar, x-default -> /ar) and it is correct for BOTH members of the
        // pair, so it is left alone rather than duplicated.
        head:
            langSeedScript('ar') +
            jsonLdScript({
                '@context': 'https://schema.org',
                '@type': 'WebPage',
                name: AR_TITLE,
                description: AR_DESC,
                url: `${SITE_URL}/ar`,
                inLanguage: 'ar',
                isPartOf: { '@id': `${SITE_URL}/#website` },
                about: { '@id': `${SITE_URL}/#organization` },
            }),
        cacheSeconds: 300,
    });
}
