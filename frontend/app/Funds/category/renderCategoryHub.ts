import { notFound } from 'next/navigation';
import { ltrNum } from '@/lib/bidi';
import { getAllFundsRanked } from '@/lib/public-data';
import { renderFundHub } from '@/lib/fund-hub';
import { clampTitle, clampDescription } from '@/lib/seo';
import {
    categoryOfFund, categoryPath, findCategory, MIN_FUNDS_TO_PUBLISH, FUND_CATEGORIES,
} from '@/content/fund-categories';

/**
 * FUND CATEGORY HUBS — /Funds/category/{key} and /ar/Funds/category/{arabic}.
 *
 * The category IS the query — "صناديق السيولة النقدية في مصر", "صناديق الذهب
 * في مصر" — and no competitor serves those with a working page: the nearest
 * one publishes eleven such slugs and every one of them 404s.
 *
 * Data-gated: a category below MIN_FUNDS_TO_PUBLISH 404s rather than shipping
 * a thin page, so the sitemap and the 404 gate provably agree.
 */
export async function renderCategoryHub(slug: string, lang: 'en' | 'ar'): Promise<Response> {
    const cat = findCategory(slug);
    if (!cat) notFound();
    const isAr = lang === 'ar';

    let all: Array<Record<string, unknown>> = [];
    try {
        all = await getAllFundsRanked();
    } catch (error) {
        console.error('[hub:fund-category] query failed:', (error as Error).message);
    }
    const funds = all.filter((f) => categoryOfFund(f)?.key === cat.key);
    if (funds.length < MIN_FUNDS_TO_PUBLISH) notFound();
    // Answer-first lead (2026-09-05): the category's size and its best
    // 12-month performer, from the same ranked rows the table shows.
    const leadRow = funds.find((f) => typeof f.return_1y === 'number' && Number.isFinite(f.return_1y as number));
    const leadName = leadRow ? String((isAr ? leadRow.fund_name || leadRow.fund_name_en : leadRow.fund_name_en || leadRow.fund_name) || '') : '';
    const leadRet = leadRow ? (leadRow.return_1y as number) : null;
    const leadPct = leadRet !== null ? `${leadRet >= 0 ? '+' : ''}${leadRet.toFixed(2)}%` : '';
    const lead = leadRow && leadName
        ? isAr
            ? `تضم فئة ${cat.nameAr} ${funds.length} صندوقًا في مصر؛ أفضلها أداءً خلال آخر 12 شهرًا «${leadName}» بعائد ${ltrNum(leadPct)}. `
            : `${cat.nameEn} in Egypt: ${funds.length} funds; the best performer over the last 12 months is ${leadName} at ${leadPct}. `
        : '';

    return renderFundHub({
        lang,
        canonical: categoryPath(cat, lang),
        altPath: categoryPath(cat, isAr ? 'en' : 'ar'),
        // Written straight into the shell's <title>: the brand suffix rides along only while the whole title fits 60.
        title: clampTitle([`${isAr ? cat.titleAr : cat.titleEn} | Starta Markets`, isAr ? cat.titleAr : cat.titleEn], 60),
        description: clampDescription(isAr ? cat.descriptionAr : cat.descriptionEn),
        heading: `${isAr ? cat.nameAr : cat.nameEn}${isAr ? ' في مصر' : ' in Egypt'}`,
        intro: lead + (isAr ? cat.introAr : cat.introEn),
        funds,
        marketplaceType: cat.marketplaceType || undefined,
        crumbs: [
            { name: isAr ? 'الرئيسية' : 'Home', url: isAr ? '/ar' : '/' },
            { name: isAr ? 'صناديق الاستثمار' : 'Mutual Funds', url: isAr ? '/ar/Funds' : '/Funds' },
            { name: isAr ? cat.nameAr : cat.nameEn },
        ],
        siblings: FUND_CATEGORIES.filter((c) => c.key !== cat.key).map((c) => ({
            href: categoryPath(c, lang),
            label: isAr ? c.nameAr : c.nameEn,
        })),
    });
}
