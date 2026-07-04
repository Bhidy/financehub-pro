/**
 * One-shot SEO head injection for the 13 static public HTML templates.
 *
 * Injects, idempotently (marker-guarded), immediately before </head>:
 *   - <link rel="canonical"> to the clean route on the apex host
 *   - Open Graph + Twitter card tags (from each file's existing title/description)
 *   - favicon.ico link
 *   - GA4 gtag snippet (async; the static pages previously had NO analytics)
 *   - home.html only: Organization + WebSite JSON-LD
 *
 * Deliberately zero visual changes. Run: node scripts/inject-seo-heads.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, '../public');

const SITE = 'https://startamarkets.com';
const OG_IMAGE = `${SITE}/og-default.png`;
const GA_ID = 'G-X86G4NMVFJ';
const MARKER = '<!-- seo:injected -->';

// file -> canonical clean route. Detail-page SHELLS canonicalize to their hub
// (every /News/:id currently serves the same shell — the hub is the only
// honest canonical until the server-rendered routes replace the rewrites).
const FILES = {
    'home.html': '/',
    'news.html': '/News',
    'news-article.html': '/News',
    'learn.html': '/Learn',
    'learn-topic.html': '/Learn',
    'marketplace.html': '/Funds',
    'fund-details.html': '/Funds',
    'fund-compare.html': '/Funds/Compare',
    'market-pulse.html': '/Market-Pulse',
    'portfolio.html': '/Portfolio',
    'portfolio-detail.html': '/Portfolio',
    'privacy.html': '/privacy',
    'terms.html': '/terms',
};

const ORG_JSONLD = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Organization',
            '@id': `${SITE}/#organization`,
            name: 'Starta Markets',
            alternateName: 'Starta',
            url: SITE,
            logo: { '@type': 'ImageObject', url: `${SITE}/app-icon.png` },
            description:
                'Bilingual (Arabic/English) market-intelligence platform for the Egyptian Exchange (EGX): live prices, 20 years of financials, mutual-fund NAVs and returns, market news, and an AI market analyst.',
            areaServed: 'EG',
            knowsLanguage: ['en', 'ar'],
            sameAs: [],
        },
        {
            '@type': 'WebSite',
            '@id': `${SITE}/#website`,
            url: SITE,
            name: 'Starta Markets',
            publisher: { '@id': `${SITE}/#organization` },
            inLanguage: ['en', 'ar'],
        },
    ],
};

function extract(re, html) {
    const m = re.exec(html);
    return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}

function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let changed = 0;
for (const [file, route] of Object.entries(FILES)) {
    const path = join(pub, file);
    let html = readFileSync(path, 'utf8');
    if (html.includes(MARKER)) {
        console.log(`skip (already injected): ${file}`);
        continue;
    }
    const title = extract(/<title>([\s\S]*?)<\/title>/i, html) || 'Starta Markets';
    const desc = extract(/<meta\s+name="description"\s+content="([\s\S]*?)"/i, html) || '';
    const canonical = SITE + (route === '/' ? '/' : route);

    const lines = [
        MARKER,
        `    <link rel="canonical" href="${canonical}">`,
        `    <link rel="icon" href="/favicon.ico" sizes="32x32">`,
        `    <meta property="og:site_name" content="Starta Markets">`,
        `    <meta property="og:type" content="website">`,
        `    <meta property="og:title" content="${esc(title)}">`,
        desc ? `    <meta property="og:description" content="${esc(desc)}">` : null,
        `    <meta property="og:url" content="${canonical}">`,
        `    <meta property="og:image" content="${OG_IMAGE}">`,
        `    <meta property="og:image:width" content="1200">`,
        `    <meta property="og:image:height" content="630">`,
        `    <meta property="og:locale" content="en_US">`,
        `    <meta name="twitter:card" content="summary_large_image">`,
        `    <meta name="twitter:title" content="${esc(title)}">`,
        desc ? `    <meta name="twitter:description" content="${esc(desc)}">` : null,
        `    <meta name="twitter:image" content="${OG_IMAGE}">`,
        `    <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`,
        `    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');</script>`,
    ].filter(Boolean);

    if (file === 'home.html') {
        // The home is the one static template with an Arabic twin (/ar). Declare
        // reciprocal hreflang so crawlers pair the two locales.
        lines.push(
            `    <link rel="alternate" hreflang="en" href="${SITE}/">`,
            `    <link rel="alternate" hreflang="ar" href="${SITE}/ar">`,
            `    <link rel="alternate" hreflang="x-default" href="${SITE}/">`,
            `    <script type="application/ld+json">${JSON.stringify(ORG_JSONLD)}</script>`
        );
    }

    const block = '\n' + lines.join('\n') + '\n';
    if (!/<\/head>/i.test(html)) {
        console.error(`FATAL: no </head> in ${file}`);
        process.exit(1);
    }
    html = html.replace(/<\/head>/i, `${block}</head>`);
    writeFileSync(path, html);
    changed++;
    console.log(`injected: ${file} -> canonical ${canonical}`);
}
console.log(`Done. ${changed} file(s) updated.`);
