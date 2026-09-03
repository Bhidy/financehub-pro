import { notFound } from 'next/navigation';
import { getAllFundsRanked } from '@/lib/public-data';
import { renderFundHub } from '@/lib/fund-hub';
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

    return renderFundHub({
        lang,
        canonical: categoryPath(cat, lang),
        altPath: categoryPath(cat, isAr ? 'en' : 'ar'),
        title: `${isAr ? cat.titleAr : cat.titleEn} | Starta Markets`,
        description: isAr ? cat.descriptionAr : cat.descriptionEn,
        heading: `${isAr ? cat.nameAr : cat.nameEn}${isAr ? ' في مصر' : ' in Egypt'}`,
        intro: isAr ? cat.introAr : cat.introEn,
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
