import { esc, escUrl, type Injection } from '@/lib/static-hub';
import { fundPath, absUrl, SITE_URL } from '@/lib/seo';
import { categoryOfFund } from '@/content/fund-categories';
import { ltrNum } from '@/lib/bidi';
import { fundCurrency } from '@/lib/fund-stats';
import reconciliation from '@/content/fund-universe-reconciliation.json';

/**
 * The ONE server-side pre-render of a fund list.
 *
 * Shared by every route that serves the designed marketplace shell — the
 * English hub, the Arabic hub and the six category pages in both languages —
 * so the crawler-facing markup, the escaping and the schema can never diverge
 * between them. This is the module that keeps a second, drifting "SEO version"
 * of the fund list from ever existing again.
 */

type Row = Record<string, unknown>;

const num = (r: Row, k: string): number | null =>
    typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? (r[k] as number) : null;
const str = (r: Row, k: string): string | null =>
    typeof r[k] === 'string' && (r[k] as string).trim() ? (r[k] as string).trim() : null;
const pct = (v: number | null): string => (v === null ? '—' : ltrNum(`${v.toFixed(2)}%`));
const navFmt = (v: number | null, lang: 'en' | 'ar'): string =>
    v === null ? '—' : v.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 4 });

/**
 * The marketplace shell's closing CTA, in the shell's OWN Arabic dictionary
 * values.
 *
 * marketplace.html bakes the English copy into the file and translates it
 * client-side, so every Arabic route built on this shell (/ar/Funds and each
 * /ar/Funds/{category,provider}/… hub) served an English <h2> inside an
 * `<html lang="ar">` document — invisible to the language checks, which only
 * looked at <html lang>, and invisible to a browser, which runs the i18n pass.
 * Non-JS answer-engine crawlers saw the English.
 *
 * `keepKey` is required: the marketplace toggles language IN PLACE, so
 * dropping the key would strand this heading in Arabic for a visitor who
 * switches to English.
 */
export const AR_MARKETPLACE_CLOSING = [
    { dataKey: 'close_title', text: 'ابحث بوضوح ثم تحرك بثقة.', keepKey: true },
    { dataKey: 'close_lnk_best', text: 'أفضل صناديق الاستثمار في مصر 2026 حسب العائد', keepKey: true },
    { dataKey: 'close_lnk_prices', text: 'أسعار الصناديق اليوم', keepKey: true },
    { dataKey: 'close_lnk_providers', text: 'شركات إدارة الصناديق', keepKey: true },
    { dataKey: 'close_lnk_categories', text: 'فئات الصناديق', keepKey: true },
    { dataKey: 'close_lnk_risk', text: 'جدول المخاطر', keepKey: true },
    { dataKey: 'close_lnk_method', text: 'المنهجية', keepKey: true },
    {
        dataKey: 'close_text',
        text: 'تحول ستارتا سوق الصناديق بالكامل إلى تجربة أنظف من الاكتشاف وحتى دراسة كل صندوق.',
        keepKey: true,
    },
    { dataKey: 'close_btn', text: 'اعرف ملف مخاطرك', keepKey: true },
    // The filter empty state — hidden until the visitor filters, but its <h3>
    // is in the served HTML and was the one English heading left on every
    // Arabic hub (audit 2026-09-05: AR_PAGE_ENGLISH_SUBHEADING on /ar/Funds).
    { dataKey: 'empty_title', text: 'لم نجد صناديق بهذا المزيج من الفلاتر.', keepKey: true },
];

export const fundName = (f: Row, lang: 'en' | 'ar'): string => {
    const ar = str(f, 'fund_name');
    const en = str(f, 'fund_name_en');
    return (lang === 'ar' ? ar || en : en || ar) || `Fund ${f.fund_id}`;
};

/** Latest NAV date across a set, compared as TIMESTAMPS (String(Date) sorts
 *  alphabetically — the bug that once produced a stale "as of" line). */
export function fundsAsOf(funds: Row[], lang: 'en' | 'ar'): { iso: string; human: string } {
    const maxMs = funds.reduce<number | null>((mx, f) => {
        const t = f.last_nav_date ? Date.parse(String(f.last_nav_date)) : NaN;
        return Number.isFinite(t) && (mx === null || t > mx) ? t : mx;
    }, null);
    if (maxMs === null) return { iso: '', human: '' };
    const d = new Date(maxMs);
    return {
        iso: d.toISOString().slice(0, 10),
        human: d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
}

/**
 * The marketplace's results counter. The shell ships `<span id="resultsCount">0</span>`
 * and lets renderFunds() write the real number on load — so every served
 * marketplace page said "0 funds matching your filters" directly above 200+
 * fund rows (verified for Googlebot, OAI-SearchBot, bingbot and PerplexityBot,
 * 2026-09-05). A server-rendered page must not claim zero results while it
 * renders results: the count is the length of the very list injected beside
 * it, so the two cannot disagree. Replace-mode: the span is a leaf.
 */
export function fundsCountInjection(funds: Row[]): Injection {
    return { id: 'resultsCount', html: esc(String(funds.length)), mode: 'replace' };
}

/**
 * Crawler-facing fund rows, injected into the marketplace's empty #fundsGrid.
 * The marketplace's own renderGrid() replaces this wholesale on load, so it is
 * a pre-render of the same content — never a second design.
 */
export function fundsHubRows(funds: Row[], lang: 'en' | 'ar'): string {
    if (!funds.length) return '';
    const isAr = lang === 'ar';
    const { iso, human } = fundsAsOf(funds, lang);
    const t = isAr
        ? { cat: 'الفئة', r1y: 'عائد سنة', ytd: 'من بداية العام', nav: 'صافي قيمة الأصول', asOf: 'البيانات كما في' }
        : { cat: 'Category', r1y: '1Y return', ytd: 'YTD', nav: 'Latest NAV', asOf: 'Data as of' };

    // COVERAGE, STATED. The regulator counts funds by issuance; this site
    // prices the publicly offered ones with a published NAV. Both numbers and
    // the reason they differ come from content/fund-universe-reconciliation.json
    // (scripts/fund-universe-reconcile.mjs), never from prose.
    const fra = reconciliation.fra;
    const coverage = isAr
        ? ` تُحصي الهيئة العامة للرقابة المالية ${esc(String(fra.total_by_issuance))} صندوقًا بإصداراتها في نهاية يونيو 2026، منها ${esc(String(fra.out_of_scope.count))} صندوقًا من صناديق الملكية الخاصة والصناديق العقارية والقابضة والمؤشرات المتداولة التي لا تُنشر أسعار وثائقها للجمهور — <a href="/ar/methodology#coverage">تفاصيل المطابقة</a>.`
        : ` The Financial Regulatory Authority counted ${esc(String(fra.total_by_issuance))} funds by issuance at end-June 2026, ${esc(String(fra.out_of_scope.count))} of them private-equity, real-estate, fund-of-funds or ETF vehicles with no public unit price — <a href="/methodology#coverage">coverage reconciliation</a>.`;
    const intro =
        `<p style="grid-column:1/-1;margin:0 0 .25rem;font-size:.85rem" ${isAr ? 'dir="rtl" lang="ar"' : ''}>` +
        (isAr
            ? `${esc(String(funds.length))} صندوق استثمار مصري مطروح للجمهور بصافي قيمة أصول حديث، مع العوائد التاريخية ورسوم الإدارة من الإفصاحات الرسمية لمديري الصناديق. الترتيب آلي حسب عائد سنة وليس توصية.`
            : `${esc(String(funds.length))} publicly offered Egyptian mutual funds with a current net asset value, trailing returns and fees from official fund-manager disclosures. Ordering is mechanical by trailing one-year return and is not a recommendation.`) +
        (iso ? ` ${esc(t.asOf)} <time datetime="${esc(iso)}">${esc(human)}</time>.` : '') +
        coverage +
        `</p>`;

    const rows = funds
        .map((f) => {
            const name = fundName(f, lang);
            const href = fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang);
            const cat = categoryOfFund(f);
            const manager = str(f, 'manager_name_en') || str(f, 'issuer_en') || '';
            const other = isAr ? str(f, 'fund_name_en') : str(f, 'fund_name');
            return (
                `<article ${isAr ? 'dir="rtl" lang="ar"' : ''}>` +
                `<h3><a href="${escUrl(href)}">${esc(name)}</a></h3>` +
                (other ? `<p>${esc(other)}</p>` : '') +
                (manager ? `<p>${esc(manager)}</p>` : '') +
                `<dl>` +
                (cat ? `<dt>${esc(t.cat)}</dt><dd>${esc(isAr ? cat.nameAr : cat.nameEn)}</dd>` : '') +
                `<dt>${esc(t.r1y)}</dt><dd>${esc(pct(num(f, 'return_1y')))}</dd>` +
                `<dt>${esc(t.ytd)}</dt><dd>${esc(pct(num(f, 'return_ytd')))}</dd>` +
                `<dt>${esc(t.nav)}</dt><dd>${esc(navFmt(num(f, 'latest_nav'), lang))} ${esc(fundCurrency(f))}</dd>` +
                `</dl></article>`
            );
        })
        .join('');

    return intro + rows;
}

/**
 * THE fund entity node — schema.org InvestmentFund — built ONCE for every
 * surface that describes a fund: the hub ItemLists AND the fund's own page.
 *
 * Before this the detail page emitted a thinner node than the hubs emitted for
 * the SAME fund (name, url, currency only) while the category page beside it
 * carried the numeric NAV, the management fee and the provider. Two shapes for
 * one entity is exactly the drift a shared builder exists to prevent.
 *
 * Every value here is visible on the page that emits it, and nothing is
 * emitted unless it is real: a missing NAV yields no MonetaryAmount, not a 0.
 * `@id` is the page URL plus `#fund`, so the hub item and the detail page
 * describe one reconcilable entity.
 */
export function investmentFundNode(f: Row, lang: 'en' | 'ar', path?: string): Record<string, unknown> {
    const href = path ?? fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang);
    const name = fundName(f, lang);
    const other = lang === 'ar' ? str(f, 'fund_name_en') : str(f, 'fund_name');
    const item: Record<string, unknown> = {
        '@type': 'InvestmentFund',
        '@id': `${absUrl(href)}#fund`,
        name,
        url: absUrl(href),
    };
    if (other && other !== name) item.alternateName = other;
    const provider = str(f, 'manager_name_en') || str(f, 'issuer_en');
    if (provider) item.provider = { '@type': 'Organization', name: provider };
    const navValue = num(f, 'latest_nav');
    // The fund's real denomination (a USD fund stored as 'EGP' must not be
    // described as an EGP MonetaryAmount) — same rule the visible rows use.
    const currency = fundCurrency(f);
    if (navValue !== null) {
        item.currency = currency;
        item.amount = { '@type': 'MonetaryAmount', currency, value: navValue };
    } else if (str(f, 'currency')) {
        item.currency = currency;
    }
    const fee = num(f, 'fee_management');
    if (fee !== null) item.annualPercentageRate = fee;
    const isin = str(f, 'isin');
    if (isin) item.identifier = { '@type': 'PropertyValue', propertyID: 'ISIN', value: isin };
    return item;
}

/**
 * CollectionPage + ItemList of InvestmentFund entities WITH numeric NAV.
 * Competing Egyptian fund sites publish name-only lists, so machine-readable
 * fund performance is the uncontested schema surface — but a value is emitted
 * only when it is real, never to make the markup look richer.
 */
export function fundsHubItemList(funds: Row[], lang: 'en' | 'ar', path: string, name?: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}${path}`,
        name: name || (lang === 'ar' ? 'صناديق الاستثمار في مصر' : 'Egyptian mutual funds'),
        inLanguage: lang === 'ar' ? 'ar-EG' : 'en',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: funds.length,
            itemListOrder: 'https://schema.org/ItemListOrderDescending',
            itemListElement: funds.map((f, i) => ({ '@type': 'ListItem', position: i + 1, item: investmentFundNode(f, lang) })),
        },
    };
}

export function breadcrumbJson(items: Array<{ name: string; url?: string }>) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((x, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: x.name,
            ...(x.url ? { item: SITE_URL + x.url } : {}),
        })),
    };
}
