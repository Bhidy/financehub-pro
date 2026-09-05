/**
 * EGX's OWN sector taxonomy — the 18 sectors the Egyptian Exchange assigns to
 * listed companies in its register (Listing › All Listed Securities › Stocks),
 * in the exchange's own English and Arabic wording, captured 2026-09-05.
 *
 * WHY A SECOND TAXONOMY: market_tickers.sector_name is TradingView's global
 * classification ("Finance", "Process Industries", "Non-Energy Minerals"),
 * which files Talaat Moustafa Group — Egypt's largest property developer —
 * under Finance. That vocabulary is kept for the vendor-derived /sectors/*
 * pages (a URL contract) and for internal joins; the register's sector is
 * what an Egyptian investor and an Egyptian search query mean by "sector",
 * so it is the one shown on the company directory and company pages.
 * Mapping is per ISIN through the security master, never by translating the
 * vendor label.
 */
export type EgxOfficialSector = { en: string; ar: string; slug: string };

export const EGX_OFFICIAL_SECTORS: EgxOfficialSector[] = [
    { en: 'Banks', ar: 'بنوك', slug: 'banks' },
    { en: 'Basic Resources', ar: 'موارد أساسية', slug: 'basic-resources' },
    { en: 'Health Care & Pharmaceuticals', ar: 'رعاية صحية و ادوية', slug: 'health-care-pharmaceuticals' },
    { en: 'Industrial Goods , Services and Automobiles', ar: 'خدمات و منتجات صناعية وسيارات', slug: 'industrial-goods-services-automobiles' },
    { en: 'Real Estate', ar: 'عقارات', slug: 'real-estate' },
    { en: 'Travel & Leisure', ar: 'سياحة وترفيه', slug: 'travel-leisure' },
    { en: 'Utilities', ar: 'مرافق', slug: 'utilities' },
    { en: 'IT , Media & Communication Services', ar: 'اتصالات و اعلام و تكنولوجيا المعلومات', slug: 'it-media-communication' },
    { en: 'Food, Beverages and Tobacco', ar: 'أغذية و مشروبات و تبغ', slug: 'food-beverages-tobacco' },
    { en: 'Energy & Support Services', ar: 'طاقة وخدمات مساندة', slug: 'energy-support-services' },
    { en: 'Trade & Distributors', ar: 'تجارة و موزعون', slug: 'trade-distributors' },
    { en: 'Shipping & Transportation Services', ar: 'خدمات النقل والشحن', slug: 'shipping-transportation' },
    { en: 'Education Services', ar: 'خدمات تعليمية', slug: 'education-services' },
    { en: 'Non-bank financial services', ar: 'خدمات مالية غير مصرفية', slug: 'non-bank-financial-services' },
    { en: 'Contracting & Construction Engineering', ar: 'مقاولات و إنشاءات هندسية', slug: 'contracting-construction' },
    { en: 'Textile & Durables', ar: 'منسوجات و سلع معمرة', slug: 'textile-durables' },
    { en: 'Building Materials', ar: 'مواد البناء', slug: 'building-materials' },
    { en: 'Paper & Packaging', ar: 'ورق ومواد تعبئة و تغليف', slug: 'paper-packaging' },
];

const byEn = new Map(EGX_OFFICIAL_SECTORS.map((s) => [s.en.replace(/\s+/g, ' ').trim().toLowerCase(), s]));

/** Resolve the register's English sector label (as captured) to the taxonomy row. */
export function officialSector(labelEn: string | null | undefined): EgxOfficialSector | null {
    if (!labelEn) return null;
    return byEn.get(labelEn.replace(/\s+/g, ' ').trim().toLowerCase()) ?? null;
}
