import Link from 'next/link';
import type { Security } from '@/lib/security-master';
import type { Ticker } from '@/lib/public-data';
import PublicPageShell, { Breadcrumbs } from '@/components/seo/PublicPageShell';
import ListingStatusNotice from '@/components/seo/ListingStatusNotice';
import { symbolPath, symbolPathAr } from '@/lib/seo';
import { HOME_PATH } from '@/lib/lang';

/**
 * THE STATUS PAGE for a symbol the security master does not publish as a
 * listed EGX company (delisted, duplicate alias, rights, preferred, index,
 * unverified). It replaces the interactive quote app on those URLs: mounting
 * the app beneath a "delisted" notice showed either off-board prints as if
 * they were a quote, or a bare "Symbol Not Found" card (GTHE, 2026-09-05).
 * What a visitor needs here is the identity and the status, stated once,
 * with the way back to the listed universe. Bilingual, server-rendered,
 * noindex (set by the layout).
 */
export default function ListingStatusPage({ ticker, security, lang }: { ticker: Ticker; security: Security | null; lang: 'en' | 'ar' }) {
    const isAr = lang === 'ar';
    const symbol = ticker.symbol.toUpperCase();
    const name = (isAr ? ticker.name_ar || ticker.name_en : ticker.name_en || ticker.name_ar) || symbol;
    const statusLabel: Record<string, { en: string; ar: string }> = {
        delisted: { en: 'Delisted', ar: 'مشطوب من القيد' },
        duplicate_alias: { en: 'Duplicate symbol', ar: 'رمز مكرر' },
        rights: { en: 'Subscription rights', ar: 'حق اكتتاب' },
        preferred: { en: 'Preferred-share class', ar: 'فئة أسهم ممتازة' },
        index: { en: 'Market index', ar: 'مؤشر سوق' },
        unverified: { en: 'Listing unverified', ar: 'قيد غير مؤكد' },
    };
    const status = security?.listing_status ?? 'unverified';
    const facts: Array<[string, string | null]> = [
        [isAr ? 'الرمز' : 'Symbol', symbol],
        [isAr ? 'الاسم' : 'Name', name],
        [isAr ? 'ISIN' : 'ISIN', security?.isin ?? ticker.isin ?? null],
        [isAr ? 'حالة القيد' : 'Listing status', statusLabel[status]?.[lang] ?? status],
        [isAr ? 'تاريخ الشطب' : 'Delisting date', security?.delisting_date ?? null],
        [isAr ? 'الرمز الأساسي' : 'Canonical symbol', security?.canonical_symbol ?? null],
        [isAr ? 'مصدر حالة القيد' : 'Listing source', security?.listing_source ? (isAr ? 'سجلات البورصة المصرية / توثيق منشور' : security.listing_source.replace(/_/g, ' ')) : (isAr ? 'لم يُعثر عليه في سجلات البورصة' : 'not found on the EGX registers')],
        [isAr ? 'تاريخ التحقق' : 'Verified on', security?.verified_at ?? null],
    ];
    const canonicalHref = security?.canonical_symbol ? (isAr ? symbolPathAr(security.canonical_symbol) : symbolPath(security.canonical_symbol)) : null;
    const crumbs = isAr
        ? [{ href: HOME_PATH, label: 'الرئيسية' }, { href: '/ar/companies', label: 'أسهم البورصة المصرية' }, { label: `${name} (${symbol})` }]
        : [{ href: '/', label: 'Home' }, { href: '/companies', label: 'EGX Listed Companies' }, { label: `${name} (${symbol})` }];
    return (
        <PublicPageShell lang={lang} altHref={isAr ? symbolPath(symbol) : `/ar${symbolPath(symbol)}`}>
            <Breadcrumbs lang={lang} items={crumbs} />
            <h1 className="mt-2 text-2xl font-extrabold text-main sm:text-3xl">
                {isAr ? `${name} (${symbol}) — حالة القيد` : `${name} (${symbol}) — listing status`}
            </h1>
            <div className="-mx-4 mt-2">
                <ListingStatusNotice symbol={symbol} security={security} lang={lang} />
            </div>
            <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {facts.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-border bg-surface p-3.5">
                        <dt className="text-xs font-bold text-muted">{k}</dt>
                        <dd className="mt-1 text-sm font-extrabold text-main" dir="ltr">{v}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-6 text-sm text-muted">
                {isAr
                    ? 'لا تُعرض أسعار لهذه الورقة على ستارتا لأنها ليست سهمًا مقيدًا في البورصة المصرية وفق سجلات البورصة؛ ولا تدخل في دليل الشركات أو شاشات السوق أو الترتيبات.'
                    : 'Starta shows no quote for this line: it is not a listed EGX share according to the exchange’s registers, so it is not part of the company directory, the market screens or any ranking.'}
            </p>
            <nav aria-label={isAr ? 'استكشف' : 'Explore'} className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                {canonicalHref && (
                    <Link href={canonicalHref} className="text-starta-darkTeal hover:underline">
                        {isAr ? `الصفحة الأساسية: ${security?.canonical_symbol}` : `Canonical page: ${security?.canonical_symbol}`}
                    </Link>
                )}
                <Link href={isAr ? '/ar/companies' : '/companies'} className="text-starta-darkTeal hover:underline">
                    {isAr ? 'دليل الشركات المقيدة' : 'Listed companies directory'}
                </Link>
                <Link href={isAr ? '/ar/methodology#listed-companies' : '/methodology#listed-companies'} className="text-starta-darkTeal hover:underline">
                    {isAr ? 'كيف نحدد الشركات المقيدة' : 'How listing status is determined'}
                </Link>
            </nav>
        </PublicPageShell>
    );
}
