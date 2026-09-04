import { renderStaticHub, esc, escUrl, jsonLdScript, hreflangLinks, langSeedScript } from '@/lib/static-hub';
import { learnPath, SITE_URL, absUrl } from '@/lib/seo';
import learnTopics from '@/content/learn-topics.generated';

/**
 * /ar/Learn — THE ARABIC LEARN HUB.
 *
 * WHY THIS EXISTS. Until now `/ar/Learn` 308'd to the English `/Learn`, which
 * is the SAME defect that cost the Arabic funds rankings and was fixed there:
 * on a site whose default language is Arabic, the entire education cluster had
 * no Arabic URL. Three things followed from that one redirect:
 *
 *   1. `/ar/Learn` answered `<html lang="en">` (the redirect target is the
 *      English static shell), so an Arabic URL declared itself English.
 *   2. `/ar/Learn/glossary` and the 20 `/ar/Learn/{slug}` topic pages were
 *      ORPHANED — sitemapped, but with no crawlable parent in their own tree.
 *   3. The English `/Learn` pointed BOTH hreflang values at itself, telling
 *      search engines no Arabic education hub existed at all.
 *
 * Same architecture as `/ar/Funds`: serve the SAME designed learn.html, in
 * Arabic, at the Arabic URL. Nothing about the design changes — the hero
 * strings below are the shell's own Arabic dictionary values, so the rendered
 * output equals what a visitor already sees once the page's i18n pass runs.
 *
 * The topic data is static, so this is deterministic and edge-cacheable for a
 * day; it changes only on deploy.
 */
export const dynamic = 'force-static';
export const revalidate = 86400;

const PATH_AR = '/ar/Learn';
const PATH_EN = '/Learn';

const AR_TITLE = 'تعلم الاستثمار في البورصة المصرية — أكاديمية ستارتا';
const AR_DESC =
    'دروس مبسطة بالعربية عن صناديق الاستثمار والأسهم والمخاطر وكيفية عمل البورصة المصرية، مكتوبة للمستثمر المبتدئ بأمثلة من السوق المصري.';

type Topic = {
    slug: string;
    en: { category?: string; title: string; summary?: string; readTime?: string };
    ar: { category?: string; title: string; summary?: string; readTime?: string };
};

export async function GET() {
    const topics = learnTopics as unknown as Topic[];

    // Same card markup and utility classes as the English hub, so the server
    // render and the page's own client render are visually identical.
    const cards = topics
        .map((t) => {
            const href = learnPath(t.slug, t.ar?.title, 'ar');
            const title = t.ar?.title || t.en.title;
            const summary = t.ar?.summary;
            const category = t.ar?.category || 'تعلّم';
            return (
                `<a href="${escUrl(href)}" class="learn-card group block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--teal)]" dir="rtl">` +
                `<span class="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">${esc(category)}</span>` +
                `<h3 class="mt-2 text-base font-bold leading-snug text-[var(--ink)]">${esc(title)}</h3>` +
                (summary ? `<p class="mt-2 text-sm leading-relaxed text-[var(--muted)]">${esc(summary)}</p>` : '') +
                (t.ar?.readTime ? `<span class="mt-3 block text-xs text-[var(--muted)]">${esc(t.ar.readTime)}</span>` : '') +
                `</a>`
            );
        })
        .join('');

    // The glossary is the other half of the Arabic education cluster and had no
    // link from anywhere in the Arabic tree while this hub was a redirect.
    const glossaryLink =
        `<a href="/ar/Learn/glossary" class="learn-card group block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--teal)]" dir="rtl">` +
        `<span class="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">مرجع</span>` +
        `<h3 class="mt-2 text-base font-bold leading-snug text-[var(--ink)]">قاموس المصطلحات المالية</h3>` +
        `<p class="mt-2 text-sm leading-relaxed text-[var(--muted)]">تعريفات موجزة لمصطلحات الاستثمار والبورصة، مع مثال وشرح لأهمية كل مصطلح.</p>` +
        `</a>`;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'أكاديمية ستارتا — دروس الاستثمار والبورصة المصرية',
        inLanguage: 'ar',
        numberOfItems: topics.length,
        itemListElement: topics.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: t.ar?.title || t.en.title,
            url: absUrl(learnPath(t.slug, t.ar?.title, 'ar')),
        })),
    };

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${SITE_URL}/ar` },
            { '@type': 'ListItem', position: 2, name: 'أكاديمية ستارتا' },
        ],
    };

    return renderStaticHub({
        file: 'learn.html',
        lang: 'ar',
        replacements: [
            { find: '<title>Learn | Starta Markets</title>', replace: `<title>${esc(AR_TITLE)}</title>` },
            {
                find: '<link rel="canonical" href="https://startamarkets.com/Learn">',
                replace: `<link rel="canonical" href="https://startamarkets.com${PATH_AR}">`,
            },
            {
                find: '<meta property="og:url" content="https://startamarkets.com/Learn">',
                replace: `<meta property="og:url" content="https://startamarkets.com${PATH_AR}">`,
            },
            {
                find: '<meta property="og:title" content="Learn | Starta Markets">',
                replace: `<meta property="og:title" content="${esc(AR_TITLE)}">`,
            },
            { find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' },
            {
                find: '<meta name="description" content="Starta Learn helps new investors understand mutual funds, risk and how markets work — premium beginner-friendly guides in Arabic and English.">',
                replace: `<meta name="description" content="${esc(AR_DESC)}">`,
            },
            {
                find: '<meta property="og:description" content="Starta Learn helps new investors understand mutual funds, risk and how markets work — premium beginner-friendly guides in Arabic and English.">',
                replace: `<meta property="og:description" content="${esc(AR_DESC)}">`,
            },
        ],
        // The shell's own Arabic dictionary values. `keepKey` matters here:
        // learn.html toggles language IN PLACE (`langToggle` calls
        // `setLanguage()`, it does not navigate), so dropping the key would
        // freeze the heading in Arabic for a visitor switching to English.
        heroText: [
            { dataKey: 'hero_title', text: 'أكاديمية ستارتا', keepKey: true },
            { dataKey: 'hero_text', text: 'تعلّم الاستثمار بثقة خطوة بخطوة', keepKey: true },
        ],
        injections: [{ id: 'topicsGrid', html: cards + glossaryLink }],
        head:
            langSeedScript('ar') +
            hreflangLinks(PATH_EN, PATH_AR) +
            jsonLdScript(itemList) +
            jsonLdScript(breadcrumb),
        cacheSeconds: 86400,
    });
}
