/**
 * Arabic display names for the 24 TradingView-derived sector names carried in
 * market_tickers.sector_name (2026-07-03 audit: interpolating the raw English
 * name into Arabic sentences left strings like "قطاع Finance" on every
 * /ar/symbol page). DB queries still use the English name — this map is for
 * DISPLAY inside Arabic copy only. Unknown names fall back to the original.
 */
const SECTOR_NAMES_AR: Record<string, string> = {
    'Finance': 'المالية',
    'Financial Services': 'الخدمات المالية',
    'Process Industries': 'الصناعات التحويلية',
    'Non-Energy Minerals': 'المعادن غير الطاقية',
    'Producer Manufacturing': 'التصنيع الإنتاجي',
    'Consumer Non-Durables': 'السلع الاستهلاكية غير المعمرة',
    'Consumer Durables': 'السلع الاستهلاكية المعمرة',
    'Communications': 'الاتصالات',
    'Technology Services': 'الخدمات التكنولوجية',
    'Electronic Technology': 'التكنولوجيا الإلكترونية',
    'Industrial Services': 'الخدمات الصناعية',
    'Commercial Services': 'الخدمات التجارية',
    'Distribution Services': 'خدمات التوزيع',
    'Consumer Services': 'الخدمات الاستهلاكية',
    'Health Technology': 'التكنولوجيا الصحية',
    'Health Services': 'الخدمات الصحية',
    'Transportation': 'النقل',
    'Utilities': 'المرافق العامة',
    'Basic Resources': 'الموارد الأساسية',
    'Retail Trade': 'تجارة التجزئة',
    'Energy Minerals': 'معادن الطاقة',
    'Contracting and Construction Engineering': 'المقاولات والهندسة الإنشائية',
    'Paper and Packaging': 'الورق والتغليف',
    'Miscellaneous': 'قطاعات متنوعة',
};

export function sectorAr(name: string | null | undefined): string | null {
    if (!name) return null;
    return SECTOR_NAMES_AR[name.trim()] ?? name;
}
