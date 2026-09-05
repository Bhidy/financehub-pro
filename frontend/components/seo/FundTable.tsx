import Link from 'next/link';
import { fundPath } from '@/lib/seo';
import { categoryOfFund } from '@/content/fund-categories';

/**
 * The ONE fund table. Rendered server-side (so the rows are in the HTML a
 * crawler sees) and shared by the funds directory and every category page, so
 * the columns, the number formatting and the internal-link shape cannot drift
 * between them.
 *
 * Design note: the markup deliberately mirrors the money page's table
 * (rounded-2xl / border-border / bg-surface / panel header row) so the new
 * pages are visually part of the existing system rather than a second style.
 */

export type FundRow = Record<string, unknown>;

export const num = (r: FundRow, k: string): number | null =>
    typeof r[k] === 'number' && Number.isFinite(r[k] as number) ? (r[k] as number) : null;

export const str = (r: FundRow, k: string): string | null =>
    typeof r[k] === 'string' && (r[k] as string).trim() ? (r[k] as string).trim() : null;

const fmtPct = (v: number | null): string => (v === null ? '—' : `${v.toFixed(2)}%`);
const fmtNav = (v: number | null, lang: 'en' | 'ar'): string =>
    v === null ? '—' : v.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 4 });

/** Display name in the requested language, falling back to the other one —
 *  never an empty cell and never a bare id when a name exists. */
export function fundDisplayName(f: FundRow, lang: 'en' | 'ar'): string {
    const ar = str(f, 'fund_name');
    const en = str(f, 'fund_name_en');
    return (lang === 'ar' ? ar || en : en || ar) || `Fund ${f.fund_id}`;
}

/**
 * Latest NAV date across a fund set, as both an ISO date (for <time dateTime>)
 * and a localised human string.
 *
 * Compared as TIMESTAMPS, not strings: pg returns Date objects here and
 * String(Date) ("Wed May 14 2025…") sorts alphabetically, which is the exact
 * bug that once produced a stale "as of" line on the money page.
 */
export function fundsAsOf(funds: FundRow[], lang: 'en' | 'ar'): { iso: string | null; human: string | null } {
    const maxMs = funds.reduce<number | null>((mx, f) => {
        const t = f.last_nav_date ? Date.parse(String(f.last_nav_date)) : NaN;
        return Number.isFinite(t) && (mx === null || t > mx) ? t : mx;
    }, null);
    if (maxMs === null) return { iso: null, human: null };
    const d = new Date(maxMs);
    return {
        iso: d.toISOString().slice(0, 10),
        human: d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
}

export function FundTable({
    funds,
    lang,
    showCategory = true,
    limit,
}: {
    funds: FundRow[];
    lang: 'en' | 'ar';
    showCategory?: boolean;
    limit?: number;
}) {
    const isAr = lang === 'ar';
    const rows = limit ? funds.slice(0, limit) : funds;
    const t = isAr
        ? { fund: 'الصندوق', category: 'الفئة', manager: 'مدير الصندوق', r1y: 'عائد سنة', ytd: 'من بداية العام', nav: 'صافي قيمة الأصول' }
        : { fund: 'Fund', category: 'Category', manager: 'Manager', r1y: '1Y Return', ytd: 'YTD', nav: 'Latest NAV' };

    return (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
            <table className="w-full min-w-[720px] text-sm">
                <thead>
                    <tr className={`border-b border-border bg-panel/40 text-xs font-bold uppercase tracking-wide text-muted ${isAr ? 'text-right' : 'text-left'}`}>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">{t.fund}</th>
                        {showCategory && <th className="px-4 py-3">{t.category}</th>}
                        <th className="px-4 py-3">{t.manager}</th>
                        <th className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t.r1y}</th>
                        <th className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t.ytd}</th>
                        <th className={`px-4 py-3 ${isAr ? 'text-left' : 'text-right'}`}>{t.nav}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((f, i) => {
                        const r1y = num(f, 'return_1y');
                        const cat = categoryOfFund(f);
                        const manager = str(f, 'manager_name_en') || str(f, 'issuer_en');
                        const otherName = isAr ? str(f, 'fund_name_en') : str(f, 'fund_name');
                        return (
                            <tr key={String(f.fund_id)} className="border-b border-border/60 last:border-0 hover:bg-panel/40">
                                <td className="px-4 py-2.5 text-muted">{i + 1}</td>
                                <td className="px-4 py-2.5">
                                    <Link
                                        href={encodeURI(fundPath(f.fund_id as number, str(f, 'fund_name_en'), str(f, 'fund_name'), lang))}
                                        prefetch={false}
                                        className="font-semibold text-main hover:text-starta-darkTeal"
                                    >
                                        {fundDisplayName(f, lang)}
                                    </Link>
                                    {otherName && (
                                        <span className="block text-xs text-muted" dir={isAr ? 'ltr' : 'rtl'} lang={isAr ? 'en' : 'ar'}>
                                            {otherName}
                                        </span>
                                    )}
                                </td>
                                {showCategory && <td className="px-4 py-2.5 text-muted">{cat ? (isAr ? cat.nameAr : cat.nameEn) : '—'}</td>}
                                <td className="px-4 py-2.5 text-muted">{manager || '—'}</td>
                                <td className={`px-4 py-2.5 font-bold ${isAr ? 'text-left' : 'text-right'} ${r1y === null ? 'text-muted' : r1y >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                    {fmtPct(r1y)}
                                </td>
                                <td className={`px-4 py-2.5 ${isAr ? 'text-left' : 'text-right'}`}>{fmtPct(num(f, 'return_ytd'))}</td>
                                <td className={`px-4 py-2.5 ${isAr ? 'text-left' : 'text-right'}`}>
                                    {fmtNav(num(f, 'latest_nav'), lang)} {str(f, 'currency') || 'EGP'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
