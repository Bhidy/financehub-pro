import { renderStaticHub, esc, escUrl, jsonLdScript, hreflangLinks, langSeedScript } from '@/lib/static-hub';
import { getAllFundsRanked } from '@/lib/public-data';
import { fundName } from '@/lib/funds-hub-render';
import { featuredFundPairs } from '@/lib/fund-pairs';
import { FUND_CATEGORIES, categoryOfFund, categoryPath } from '@/content/fund-categories';
import { SITE_URL, absUrl } from '@/lib/seo';

/**
 * /Funds/Compare and /ar/Funds/Compare — THE COMPARISON HUB.
 *
 * WHAT WAS WRONG, measured against snduk.com's equivalent on 2026-09-04:
 *  - It was a STATIC REWRITE (next.config.ts → /fund-compare.html), so it was
 *    the only fund surface with no server render at all: zero JSON-LD on a site
 *    where every other hub carries schema, and no crawl path into the ~150
 *    /Funds/vs/{pair} pages the sitemap advertises.
 *  - `/ar/Funds/Compare` DID NOT EXIST on a site whose default language is
 *    Arabic — the same gap that left /ar/Learn and /ar/Market-Pulse without a
 *    URL. "مقارنة صناديق الاستثمار" had no Arabic destination.
 *  - Its empty state was a dead end: "choose at least two funds" and a link
 *    back to /Funds, with nothing to act on.
 *
 * Note the measurement did NOT say "add words". We already had more words than
 * the competitor (199 vs 150); the gaps were headings, internal links and
 * structured data. Padding this page with prose would be writing for a crawler
 * rather than a reader, which is the thing /Market-Pulse's route explicitly
 * refuses to do.
 *
 * THE DIRECTION: the empty state stops apologising and becomes the shortcut —
 * the comparisons people are actually making, one tap away.
 *
 * That is why this content goes in the EMPTY STATE specifically, and why it is
 * not cloaking: `renderCompare()` shows #emptyState whenever fewer than two
 * funds are selected, which is the state of every first-time visitor and every
 * crawler. Removing the shell's `hidden` class server-side makes the served
 * HTML equal that true default. A visitor who arrives with a shortlist still
 * sees the tool, because the page's own script hides this the moment it has
 * two funds.
 *
 * DESIGN CONSTRAINT: fund-compare.html is styled by a PRE-COMPILED Tailwind
 * build (public/assets/tw-fund-compare.css). A class that is not already in
 * that file silently does nothing. Every utility used below was verified
 * present — which is why the layout is `flex flex-wrap` and not a grid: no
 * `grid-cols-*` variant is compiled. Headings are plain dark titles, never a
 * small uppercase kicker (the owner's standing ban on section eyebrows).
 */

type Row = Record<string, unknown>;
type Lang = 'en' | 'ar';

const PATH_EN = '/Funds/Compare';
const PATH_AR = '/ar/Funds/Compare';

const COPY = {
    en: {
        title: 'Compare Egypt Mutual Funds Side by Side | Starta Markets',
        desc: 'Compare Egyptian mutual funds on NAV, 1Y and 3Y returns, management fees, risk and manager — side by side, updated from fund-manager disclosures.',
        heroTitle: 'Compare funds with real pricing, real history, and clearer decisions.',
        heroText: 'Compare funds through normalized performance, updated returns, manager context, and clean multi-fund analytics.',
        emptyTitle: 'Choose at least two funds to compare.',
        emptyDesc: 'Return to the Funds page, select your shortlist, and open the comparison view again.',
        emptyCta: 'Go back to Funds',
        popular: 'Comparisons people run most',
        popularNote: 'Each pair is two funds of the same type, so the comparison is between real alternatives. Ranked by one-year return.',
        vs: 'vs',
        browseAll: 'Browse all funds',
        home: 'Home',
        crumbFunds: 'Mutual Funds',
        crumb: 'Compare',
        faq: [
            {
                q: 'How do I compare two mutual funds in Egypt?',
                a: 'Pick two or more funds of the same type — money market against money market, equity against equity — then compare net asset value, one-year and three-year returns, the management fee, and the manager. Comparing funds of different types measures the asset class, not the fund.',
            },
            {
                q: 'What does NAV mean when comparing funds?',
                a: 'NAV is the net asset value of one unit. A higher NAV does not mean a better fund: it reflects the unit price, not performance. Compare the percentage return over the same period instead.',
            },
            {
                q: 'Do management fees change the comparison?',
                a: 'Yes. Published returns on this site are the fund manager’s reported figures. Two funds with the same gross performance and different management fees do not leave the investor in the same place, so the fee is shown alongside every return.',
            },
        ],
    },
    ar: {
        title: 'مقارنة صناديق الاستثمار في مصر جنباً إلى جنب | Starta Markets',
        desc: 'قارن صناديق الاستثمار المصرية من حيث صافي قيمة الوثيقة والعائد السنوي والثلاثي ورسوم الإدارة ومستوى المخاطر ومدير الصندوق، محدثة من إفصاحات مديري الصناديق.',
        heroTitle: 'قارن الصناديق بثقة',
        heroText: 'حلّل الأداء والعوائد التاريخية في لوحة واحدة واضحة تساعدك على اختيار الصندوق الأنسب.',
        emptyTitle: 'اختر صندوقين على الأقل للمقارنة.',
        emptyDesc: 'ارجع إلى صفحة الصناديق، حدّد قائمتك المختصرة، ثم افتح المقارنة مرة أخرى.',
        emptyCta: 'العودة إلى الصناديق',
        popular: 'أكثر المقارنات طلباً',
        popularNote: 'كل مقارنة بين صندوقين من النوع نفسه، حتى تكون المقارنة بين بدائل حقيقية. مرتبة حسب عائد سنة.',
        vs: 'مقابل',
        browseAll: 'تصفح كل الصناديق',
        home: 'الرئيسية',
        crumbFunds: 'صناديق الاستثمار',
        crumb: 'المقارنة',
        faq: [
            {
                q: 'كيف أقارن بين صندوقي استثمار في مصر؟',
                a: 'اختر صندوقين أو أكثر من النوع نفسه — نقدي مقابل نقدي، أسهم مقابل أسهم — ثم قارن صافي قيمة الوثيقة والعائد خلال سنة وثلاث سنوات ورسوم الإدارة ومدير الصندوق. مقارنة صندوقين من نوعين مختلفين تقيس فئة الأصول لا الصندوق نفسه.',
            },
            {
                q: 'ماذا يعني صافي قيمة الوثيقة عند المقارنة؟',
                a: 'صافي قيمة الوثيقة هو قيمة الوحدة الواحدة. ارتفاع هذه القيمة لا يعني أن الصندوق أفضل: فهي تعكس سعر الوثيقة لا الأداء. قارن نسبة العائد خلال المدة نفسها بدلاً من ذلك.',
            },
            {
                q: 'هل تؤثر رسوم الإدارة على المقارنة؟',
                a: 'نعم. العوائد المنشورة هنا هي الأرقام المعلنة من مدير الصندوق. صندوقان بالأداء نفسه ورسوم إدارة مختلفة لا يتركان المستثمر في الموضع نفسه، لذلك تُعرض الرسوم بجانب كل عائد.',
            },
        ],
    },
} as const;

/** Group the featured pairs under their fund category, so the block reads as a
 *  structured shortcut rather than a link dump — and so each group contributes
 *  a real, intent-bearing heading instead of one generic one. */
function pairGroups(funds: Row[], lang: Lang) {
    const byId = new Map<number, Row>();
    for (const f of funds) {
        const id = Number(f.fund_id);
        if (Number.isFinite(id)) byId.set(id, f);
    }
    const groups = new Map<string, { label: string; href: string; items: Array<{ href: string; a: string; b: string }> }>();

    for (const pair of featuredFundPairs(funds, 12)) {
        const fa = byId.get(pair.a);
        const fb = byId.get(pair.b);
        if (!fa || !fb) continue; // never link a pair we cannot name
        const cat = categoryOfFund(fa) ?? FUND_CATEGORIES.find((c) => c.key === pair.type);
        const key = cat?.key ?? pair.type;
        if (!groups.has(key)) {
            groups.set(key, {
                label: cat ? (lang === 'ar' ? cat.nameAr : cat.nameEn) : key,
                href: cat ? categoryPath(cat, lang) : lang === 'ar' ? '/ar/Funds' : '/Funds',
                items: [],
            });
        }
        (groups.get(key) as { items: Array<{ href: string; a: string; b: string }> }).items.push({
            href: `${lang === 'ar' ? '/ar' : ''}/Funds/vs/${pair.slug}`,
            a: fundName(fa, lang),
            b: fundName(fb, lang),
        });
    }
    return [...groups.values()].filter((g) => g.items.length > 0);
}

export async function renderCompareHub(lang: Lang) {
    const isAr = lang === 'ar';
    const t = COPY[lang];
    const selfPath = isAr ? PATH_AR : PATH_EN;
    const fundsHref = isAr ? '/ar/Funds' : '/Funds';

    let funds: Row[] = [];
    try {
        funds = await getAllFundsRanked();
    } catch (error) {
        console.error('[hub:compare] query failed:', (error as Error).message);
    }

    const groups = pairGroups(funds, lang);

    // Every utility below is verified present in tw-fund-compare.css.
    const popularBlock = groups.length
        ? `<div class="mx-auto mt-8 max-w-3xl border-t border-border" style="text-align:start"${isAr ? ' dir="rtl"' : ''}>` +
          `<h3 class="mt-6 text-lg font-display font-bold text-main">${esc(t.popular)}</h3>` +
          `<p class="mt-2 text-sm text-muted">${esc(t.popularNote)}</p>` +
          groups
              .map(
                  (g) =>
                      `<h4 class="mt-6 text-sm font-semibold text-main"><a class="hover:text-starta-teal transition-colors" href="${escUrl(g.href)}">${esc(g.label)}</a></h4>` +
                      `<div class="mt-3 flex flex-wrap justify-center gap-3">` +
                      g.items
                          .map(
                              (it) =>
                                  `<a class="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-main hover:text-starta-teal transition-colors" href="${escUrl(it.href)}">` +
                                  `${esc(it.a)} <span class="text-muted">${esc(t.vs)}</span> ${esc(it.b)}</a>`
                          )
                          .join('') +
                      `</div>`
              )
              .join('') +
          `<p class="mt-6 text-sm"><a class="text-starta-teal hover:text-starta-teal transition-colors font-semibold" href="${escUrl(fundsHref)}">${esc(t.browseAll)}</a></p>` +
          `</div>`
        : '';

    // Structured data: this page previously emitted NONE, alone among the fund
    // surfaces. The ItemList is the machine-readable form of the same links the
    // block above renders — it describes visible content, never extra claims.
    const itemList = groups.length
        ? {
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: t.popular,
              inLanguage: lang,
              numberOfItems: groups.reduce((n, g) => n + g.items.length, 0),
              itemListElement: groups.flatMap((g) => g.items).map((it, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  name: `${it.a} ${t.vs} ${it.b}`,
                  url: absUrl(it.href),
              })),
          }
        : null;

    const faq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: lang,
        mainEntity: t.faq.map((x) => ({
            '@type': 'Question',
            name: x.q,
            acceptedAnswer: { '@type': 'Answer', text: x.a },
        })),
    };

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: t.home, item: `${SITE_URL}${isAr ? '/ar' : '/'}` },
            { '@type': 'ListItem', position: 2, name: t.crumbFunds, item: absUrl(fundsHref) },
            { '@type': 'ListItem', position: 3, name: t.crumb },
        ],
    };

    // The FAQ is rendered as visible text too — schema that describes content a
    // reader cannot see is schema spam, and the answers are the ones a first
    // comparison actually raises.
    const faqBlock =
        // `text-align: start`, not the `text-left` utility: the empty state is
        // `text-center`, these paragraphs need to align to the reading edge, and
        // on the Arabic page that edge is the RIGHT one. Tailwind's `text-right`
        // is not in the pre-compiled stylesheet, and `text-left` computed to a
        // genuine left-alignment on an rtl document — caught by reading the
        // computed style, not by looking at the screenshot, where full-width
        // paragraphs hid it. The logical value is correct in both directions.
        `<div class="mx-auto mt-8 max-w-3xl border-t border-border" style="text-align:start"${isAr ? ' dir="rtl"' : ''}>` +
        t.faq
            .map(
                (x) =>
                    `<h4 class="mt-6 text-sm font-semibold text-main">${esc(x.q)}</h4>` +
                    `<p class="mt-2 text-sm text-muted">${esc(x.a)}</p>`
            )
            .join('') +
        `</div>`;

    // SINGLE-LINE anchor on purpose. An earlier version matched through to
    // `</section>`, which meant matching the file's indentation — and matching
    // hand-formatted HTML by exact bytes is how the category hero silently
    // no-op'd and shipped the wrong heading. Appending after the closing </a>
    // puts the block inside the section, after the button, either way.
    const CTA_ANCHOR = 'data-key="empty_cta">Go back to Funds</a>';

    return renderStaticHub({
        file: 'fund-compare.html',
        lang,
        replacements: [
            // The empty state is the TRUE default: renderCompare() reveals it
            // whenever fewer than two funds are selected. Serving it hidden
            // meant the served HTML did not match the state every first-time
            // visitor sees.
            {
                find: '<section id="emptyState" class="hidden mt-8',
                replace: '<section id="emptyState" class="mt-8',
            },
            // Append after the CTA so the designed order (icon → title → copy →
            // button) is untouched and the shortcut follows it.
            { find: CTA_ANCHOR, replace: `data-key="empty_cta">${esc(t.emptyCta)}</a>${popularBlock}${faqBlock}` },
            // The back-link must not drop an Arabic reader onto the English hub.
            ...(isAr ? [{ find: '<a href="/Funds" class="btn-primary', replace: '<a href="/ar/Funds" class="btn-primary' }] : []),
            { find: '<title>Fund Comparison | Starta Markets</title>', replace: `<title>${esc(t.title)}</title>` },
            {
                find: '<link rel="canonical" href="https://startamarkets.com/Funds/Compare">',
                replace: `<link rel="canonical" href="https://startamarkets.com${selfPath}">`,
            },
            {
                find: '<meta name="description" content="Compare Egypt mutual funds side by side with real NAV history, performance ranges, manager context, and premium Starta research design.">',
                replace: `<meta name="description" content="${esc(t.desc)}">`,
            },
            ...(isAr
                ? [{ find: '<meta property="og:locale" content="en_US">', replace: '<meta property="og:locale" content="ar_EG">' }]
                : []),
        ],
        // Dictionary-backed hero copy, so `keepKey` — fund-compare.html toggles
        // language in place and a key-less heading would strand.
        heroText: [
            { dataKey: 'hero_title', text: t.heroTitle, keepKey: true },
            { dataKey: 'hero_text', text: t.heroText, keepKey: true },
            { dataKey: 'empty_title', text: t.emptyTitle, keepKey: true },
            { dataKey: 'empty_desc', text: t.emptyDesc, keepKey: true },
        ],
        injections: [],
        head:
            (isAr ? langSeedScript('ar') : '') +
            hreflangLinks(PATH_EN, PATH_AR) +
            (itemList ? jsonLdScript(itemList) : '') +
            jsonLdScript(faq) +
            jsonLdScript(breadcrumb),
        cacheSeconds: 900,
    });
}
