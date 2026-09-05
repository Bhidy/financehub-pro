import type { Security } from '@/lib/security-master';
import { SECURITY_MASTER_SOURCES } from '@/lib/security-master';

/**
 * LISTING-STATUS NOTICE — shown on a company page whose symbol the security
 * master does NOT confirm as a listed EGX company: delisted (GTHE), a
 * duplicate alias of another symbol, a subscription-rights or preferred-share
 * line, or a symbol neither EGX register confirms. The page stays reachable
 * for anyone who followed an old link, but it says what the thing is before
 * showing any vendor figure, and it is not indexed (layout sets noindex).
 *
 * Bilingual, server-rendered, no design change to the app beneath it.
 */
export default function ListingStatusNotice({ symbol, security, lang }: { symbol: string; security: Security | null; lang: 'en' | 'ar' }) {
    const isAr = lang === 'ar';
    const status = security?.listing_status ?? 'unverified';
    const registerDate = SECURITY_MASTER_SOURCES.egx_main_register?.captured_at ?? '';
    const fmt = (iso: string | null) =>
        iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

    let title: string;
    let body: string;
    switch (status) {
        case 'delisted':
            title = isAr ? `سهم ${symbol} مشطوب من البورصة المصرية` : `${symbol} is delisted from the Egyptian Exchange`;
            body = isAr
                ? `شُطب هذا السهم من القيد في البورصة المصرية بتاريخ ${fmt(security?.delisting_date ?? null)}. أي أسعار تظهر أدناه هي تداولات خارج المقصورة ينقلها مزوّد البيانات ولا تُعامَل كسعر سهم مقيد؛ لذلك لا يُدرَج هذا السهم في دليل الشركات المقيدة ولا في الترتيبات.`
                : `This security was removed from the EGX listing on ${fmt(security?.delisting_date ?? null)}. Any prices shown below are off-board trades relayed by the data vendor and are not a listed EGX quote; the symbol is therefore excluded from the listed-companies directory and every ranking.`;
            break;
        case 'duplicate_alias':
            title = isAr ? `${symbol} رمز مكرر` : `${symbol} is a duplicate symbol`;
            body = isAr
                ? `يشير هذا الرمز إلى الشركة نفسها المنشورة تحت الرمز ${security?.canonical_symbol}. تُنشر صفحة واحدة لكل شركة؛ يرجى الانتقال إلى الصفحة الأساسية.`
                : `This symbol refers to the same company published under ${security?.canonical_symbol}. One page is published per company; use the canonical symbol.`;
            break;
        case 'rights':
            title = isAr ? `${symbol} حق اكتتاب، لا شركة` : `${symbol} is a subscription-rights line, not a company`;
            body = isAr
                ? 'هذه الورقة حق اكتتاب مؤقت في أسهم شركة مقيدة، لا شركة مستقلة، ولذلك لا تُدرَج في دليل الشركات.'
                : 'This instrument is a temporary right to subscribe to a listed company’s shares, not a company, so it is not listed in the company directory.';
            break;
        case 'preferred':
            title = isAr ? `${symbol} فئة أسهم ممتازة` : `${symbol} is a preferred-share class`;
            body = isAr
                ? 'هذه الورقة فئة أسهم ممتازة لشركة مقيدة، وليست شركة مستقلة؛ تُعرض بيانات الشركة على صفحة الأسهم العادية.'
                : 'This is a preferred-share class of a listed company, not a separate company; the company’s data lives on its ordinary-share page.';
            break;
        case 'index':
            title = isAr ? `${symbol} مؤشر، لا شركة` : `${symbol} is an index, not a company`;
            body = isAr ? 'هذا الرمز يمثل مؤشرًا للسوق وليس شركة مقيدة.' : 'This symbol is a market index, not a listed company.';
            break;
        default:
            title = isAr ? `لم يتم التحقق من قيد ${symbol}` : `${symbol}’s listing status is unverified`;
            body = isAr
                ? `لم نجد هذا الرمز في سجل الأوراق المقيدة بالبورصة المصرية (السوق الرئيسي وسوق الشركات الصغيرة والمتوسطة) بتاريخ ${fmt(registerDate)}. الأسعار المعروضة أدناه من مزوّد البيانات ولا تُعامَل كسعر سهم مقيد حتى يتأكد القيد؛ ولذلك لا يُدرَج في دليل الشركات ولا في الترتيبات.`
                : `This symbol was not found on the Egyptian Exchange’s register of listed securities (main and SME markets) as of ${fmt(registerDate)}. Prices below come from the data vendor and are not treated as a listed quote until the listing is confirmed; the symbol is excluded from the company directory and every ranking.`;
    }
    return (
        <aside
            role="note"
            dir={isAr ? 'rtl' : 'ltr'}
            lang={lang}
            data-listing-status={status}
            className="mx-auto max-w-6xl px-4 pt-6"
        >
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="text-base font-extrabold tracking-tight">{title}</p>
                <p className="mt-1.5 text-sm leading-6">{body}</p>
                {security?.evidence?.length ? (
                    <p className="mt-2 text-xs">
                        {isAr ? 'المصادر: ' : 'Sources: '}
                        {security.evidence.map((u, i) => (
                            <span key={u}>
                                {i > 0 && ' · '}
                                <a href={u} rel="nofollow noopener" target="_blank" className="underline">
                                    {new URL(u).hostname.replace(/^www\./, '')}
                                </a>
                            </span>
                        ))}
                    </p>
                ) : null}
            </div>
        </aside>
    );
}
