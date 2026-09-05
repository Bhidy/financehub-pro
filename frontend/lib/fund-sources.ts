/**
 * NAV SOURCE LABELS — the human name of each `source` tag the NAV pipeline
 * writes (nav_history.source, surfaced on funds_view as the latest point's
 * source). ONE definition, read by the fund profile's provenance row and the
 * NAV-history page's provenance table, so the two can never name the same
 * source differently. Tags are the pipeline's own; nothing is inferred, and an
 * unknown tag is shown verbatim rather than guessed.
 */
export const FUND_SOURCE_LABELS: Record<string, { en: string; ar: string }> = {
    mubasher_csv: { en: 'Mubasher per-fund price file (primary)', ar: 'ملف أسعار الصندوق من مباشر (المصدر الأساسي)' },
    mubasher_api: { en: 'Mubasher chart API (fallback)', ar: 'واجهة الرسم البياني من مباشر (احتياطي)' },
    mubasher_list_api: { en: 'Mubasher fund-list API (latest price)', ar: 'قائمة الصناديق من مباشر (آخر سعر)' },
    eima_report: { en: 'EIMA weekly performance report (published NAV)', ar: 'تقرير الأداء الأسبوعي لجمعية إدارة الاستثمار (قيمة منشورة)' },
    eima_derived: { en: 'EIMA weekly report (NAV reconstructed from published return)', ar: 'تقرير جمعية إدارة الاستثمار (قيمة مستخرجة من العائد المنشور)' },
};

/** Label for a source tag; `unrecorded` is the honest label for rows written before source tracking. */
export function fundSourceLabel(code: unknown, lang: 'en' | 'ar'): string | null {
    if (typeof code !== 'string' || !code.trim()) return null;
    const k = code.trim().toLowerCase();
    if (FUND_SOURCE_LABELS[k]) return FUND_SOURCE_LABELS[k][lang];
    if (k === 'unrecorded') return lang === 'ar' ? 'غير مسجَّل (قبل تتبّع المصدر)' : 'unrecorded (before source tracking)';
    return code;
}
