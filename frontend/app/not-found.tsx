import Link from 'next/link';
import { headers } from 'next/headers';
import PublicPageShell from '@/components/seo/PublicPageShell';

/**
 * Root 404 — the page Next renders for every UNMATCHED URL (a URL no route
 * claims), in either language tree. It reads the language the middleware
 * resolved (x-starta-lang, the same header the root layout uses for
 * <html lang/dir>) so an unmatched /ar/* URL gets an Arabic 404, not an
 * English one under an Arabic <html>. A `notFound()` thrown INSIDE a matched
 * dynamic segment (an unknown fund id, a delisted symbol) is a different path:
 * Next answers 404 with its minimal error document and renders the nearest
 * not-found boundary (app/ar/not-found.tsx / this file) on the client — the
 * status and the body are right, but the server HTML carries no heading.
 * React 19 hoists the <title> below into <head>.
 */
const COPY = {
    en: {
        title: 'Page not found | Starta Markets',
        h1: 'Page not found',
        lede: 'There is no page at this address. The link may be out of date, or it may point to a security that is not listed on the Egyptian Exchange, or to a fund that no longer publishes a price.',
        hubs: [
            { href: '/', title: 'Home', desc: 'Egyptian Exchange stocks, funds and market intelligence' },
            { href: '/Funds', title: 'Mutual funds', desc: 'NAVs, returns and fees for every priced fund' },
            { href: '/companies', title: 'EGX companies', desc: 'Listed companies ranked by market capitalisation' },
            { href: '/Funds/best-mutual-funds-egypt-2026', title: 'Best mutual funds 2026', desc: 'Ranked mechanically by trailing 1-year return' },
            { href: '/News', title: 'Market news', desc: 'The latest on the exchange and the funds' },
            { href: '/Learn/glossary', title: 'Glossary', desc: 'Investing terms explained' },
        ],
    },
    ar: {
        title: 'الصفحة غير موجودة | ستارتا ماركتس',
        h1: 'الصفحة غير موجودة',
        lede: 'لا توجد صفحة على هذا العنوان. قد يكون الرابط قديمًا، أو يشير إلى ورقة مالية غير مقيدة في البورصة المصرية، أو إلى صندوق لم يعد يُنشر له سعر.',
        hubs: [
            { href: '/ar', title: 'البورصة المصرية اليوم', desc: 'الصفحة الرئيسية بالعربية' },
            { href: '/ar/Funds', title: 'صناديق الاستثمار', desc: 'صافي قيمة الأصول والعوائد والرسوم لكل صندوق' },
            { href: '/ar/companies', title: 'أسهم البورصة المصرية', desc: 'الشركات المقيدة مرتبة حسب القيمة السوقية' },
            { href: '/ar/Funds/best-mutual-funds-egypt-2026', title: 'أفضل صناديق الاستثمار 2026', desc: 'ترتيب آلي حسب عائد 12 شهرًا' },
            { href: '/ar/News', title: 'أخبار السوق', desc: 'آخر أخبار البورصة والصناديق' },
            { href: '/ar/Learn/glossary', title: 'قاموس المصطلحات', desc: 'شرح مصطلحات الاستثمار بالعربية' },
        ],
    },
} as const;

export default async function NotFound() {
    let lang: 'en' | 'ar' = 'en';
    try {
        lang = (await headers()).get('x-starta-lang') === 'ar' ? 'ar' : 'en';
    } catch {
        // No request context (a static render): English, the root layout's default.
    }
    const t = COPY[lang];
    return (
        <PublicPageShell lang={lang} altHref={lang === 'ar' ? '/' : '/ar'}>
            <title>{t.title}</title>
            <meta name="robots" content="noindex, follow" />
            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">{t.h1}</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">{t.lede}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {t.hubs.map((h) => (
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
