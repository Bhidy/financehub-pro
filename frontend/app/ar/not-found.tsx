import Link from 'next/link';
import PublicPageShell from '@/components/seo/PublicPageShell';
import { HOME_PATH } from '@/lib/lang';

/**
 * Arabic 404 for the /ar tree. Before this file existed, a `notFound()` thrown
 * on any Arabic route (e.g. a delisted or foreign symbol such as /ar/symbol/7010)
 * rendered Next's bare English error shell under the site's English title —
 * an English page on an Arabic URL. The root layout already sets
 * <html lang="ar" dir="rtl"> from the middleware's x-starta-lang header; React
 * hoists the <title> below into <head>.
 */
export default function ArNotFound() {
    return (
        <PublicPageShell lang="ar" altHref="/">
            <title>الصفحة غير موجودة | ستارتا ماركتس</title>
            <meta name="robots" content="noindex, follow" />
            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">الصفحة غير موجودة</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                لا توجد صفحة على هذا العنوان. قد يكون الرابط قديمًا، أو يشير إلى ورقة مالية غير مقيدة في البورصة المصرية،
                أو إلى صندوق لم يعد يُنشر له سعر.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                    { href: HOME_PATH, title: 'الرئيسية', desc: 'الصفحة الرئيسية لستارتا ماركتس' },
                    { href: '/ar', title: 'البورصة المصرية اليوم', desc: 'مؤشر EGX30 وأسهم البورصة والقطاعات' },
                    { href: '/ar/Funds', title: 'صناديق الاستثمار', desc: 'صافي قيمة الأصول والعوائد والرسوم لكل صندوق' },
                    { href: '/ar/companies', title: 'أسهم البورصة المصرية', desc: 'الشركات المقيدة مرتبة حسب القيمة السوقية' },
                    { href: '/ar/Funds/best-mutual-funds-egypt-2026', title: 'أفضل صناديق الاستثمار 2026', desc: 'ترتيب آلي حسب عائد 12 شهرًا' },
                    { href: '/ar/News', title: 'أخبار السوق', desc: 'آخر أخبار البورصة والصناديق' },
                    { href: '/ar/Learn/glossary', title: 'قاموس المصطلحات', desc: 'شرح مصطلحات الاستثمار بالعربية' },
                ].map((h) => (
                    <li key={h.href}>
                        <Link href={h.href} className="group block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-starta-teal/50">
                            <span className="block font-bold text-main group-hover:text-starta-teal">{h.title}</span>
                            <span className="mt-1 block text-sm leading-relaxed text-muted">{h.desc}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </PublicPageShell>
    );
}
