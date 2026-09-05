import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /ar/about — Arabic twin of the entity anchor page. It returned 404 while
 * /ar/editorial-policy and /ar/corrections both existed, so the Arabic tree had
 * no page describing WHO publishes this data and WHERE it comes from — the page
 * a search engine, an answer engine or a journalist resolves the brand against,
 * missing in the site's default language.
 *
 * The English page previously carried one translated paragraph in place of this.
 * A footnote is not a bilingual page.
 *
 * Every claim here mirrors a claim on /about. Nothing is added, and the AI
 * analyst is deliberately absent from both: it is out of the navigation by the
 * owner's standing decision, and copy must not sell a hidden feature.
 */

export const metadata: Metadata = {
    title: 'من نحن — مصادر بيانات ستارتا ماركتس ومنهجيتها',
    description:
        'ستارتا ماركتس منصة ذكاء مالي ثنائية اللغة للبورصة المصرية: أسعار الأسهم وبيانات مالية تمتد 20 عاماً وصافي قيمة أصول صناديق الاستثمار وأخبار السوق. من أين تأتي بياناتنا وكيف تُحسب.',
    alternates: {
        canonical: '/ar/about',
        languages: { en: '/about', ar: '/ar/about', 'x-default': '/ar/about' },
    },
};

/** Mirrors SOURCES in app/about/page.tsx — same datasets, same cadences. */
const SOURCES: Array<[string, string]> = [
    ['أسعار الأسهم وبيانات السوق', 'تغذية البورصة المصرية عبر TradingView — تُحدَّث كل 15 دقيقة خلال ساعات التداول (الأحد–الخميس)'],
    ['القوائم المالية', 'إفصاحات الشركات مجمَّعة عبر TradingView وYahoo Finance — حتى 20 عاماً من القوائم السنوية، تُحدَّث أسبوعياً'],
    ['صافي قيمة أصول الصناديق وبياناتها', 'إفصاحات مديري الصناديق — تاريخ صافي قيمة الأصول حتى 2010، يُحدَّث مرتين يومياً'],
    ['أخبار السوق', 'تغطية الصحافة المالية المصرية المرخّصة بالعربية والإنجليزية — تُحدَّث على مدار اليوم'],
    ['المؤشرات الفنية والإحصاءات', 'محسوبة من تاريخ الأسعار الأساسي (المتوسطات المتحركة، مؤشر القوة النسبية، الموسمية، مضاعفات التقييم)'],
];

export default function AboutArPage() {
    const crumbs = [{ href: '/ar', url: '/ar', label: 'الرئيسية' }, { label: 'من نحن' }];

    return (
        <PublicPageShell lang="ar" altHref="/about" persistLang>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'AboutPage',
                    name: 'من نحن — ستارتا ماركتس',
                    url: `${SITE_URL}/ar/about`,
                    inLanguage: 'ar',
                    mainEntity: { '@id': `${SITE_URL}/#organization` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd(crumbs, SITE_URL)} />
            <Breadcrumbs items={crumbs} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">من نحن</h1>

            <div className="mt-4 max-w-3xl space-y-4 leading-relaxed text-main">
                <p>
                    <strong>ستارتا ماركتس</strong> منصة ذكاء مالي ثنائية اللغة (عربي/إنجليزي) لـ
                    <strong> البورصة المصرية (EGX)</strong>. تجمع في مكان واحد: أسعاراً مباشرة وصفحات لكل شركة مقيدة،
                    وقوائم مالية تمتد حتى 20 عاماً، وتاريخ التوزيعات، والمؤشرات الفنية؛ وصافي قيمة أصول صناديق
                    الاستثمار المصرية وأداءها؛ وأخبار السوق المصري باللغتين؛ وأكاديمية تعليمية للمبتدئين.
                </p>
            </div>

            <h2 className="mt-10 text-xl font-bold text-main">من أين تأتي بياناتنا</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full min-w-[560px] text-sm">
                    <thead>
                        <tr className="border-b border-border bg-panel/40 text-right text-xs font-bold uppercase tracking-wide text-muted">
                            <th className="px-4 py-3">مجموعة البيانات</th>
                            <th className="px-4 py-3">المصدر ومعدل التحديث</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SOURCES.map(([k, v]) => (
                            <tr key={k} className="border-b border-border/60 last:border-0">
                                <td className="px-4 py-3 font-semibold text-main">{k}</td>
                                <td className="px-4 py-3 text-muted">{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h2 className="mt-10 text-xl font-bold text-main">ملاحظات منهجية</h2>
            <ul className="mt-3 max-w-3xl list-disc space-y-2 pr-5 leading-relaxed text-main">
                <li>كل الأرقام بالجنيه المصري ما لم يُذكر خلاف ذلك صراحةً.</li>
                <li>كل صفحة بيانات تحمل ختم &laquo;آخر تحديث&raquo; بتوقيت القاهرة وتذكر مصدرها.</li>
                <li>صافي قيمة الوثيقة المعروض في العناوين مشتق دائماً من تاريخ صافي قيمة الأصول نفسه، فلا يمكن أن يختلف العنوان عن الرسم البياني.</li>
                <li>المقاييس المشتقة (العوائد، المضاعفات، المتوسطات المتحركة، مؤشر القوة النسبية، الموسمية) محسوبة من تاريخ الأسعار والقوائم الأساسي؛ ولا نعدّل أي رقم يدوياً.</li>
                <li>تراقب أنظمة آلية حداثة البيانات على مدار الساعة وتنبّه عند التقادم أو الشذوذ.</li>
            </ul>

            <h2 className="mt-10 text-xl font-bold text-main">ما ليست عليه ستارتا ماركتس</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-main">
                ستارتا ماركتس منصة معلومات. لا شيء على هذا الموقع يُعد مشورة استثمارية أو توصية بشراء أو بيع أي ورقة
                مالية أو عرضاً لخدمات وساطة. الاستثمار ينطوي على مخاطر — قم دائماً ببحثك الخاص وفكّر في استشارة مستشار
                مالي مرخّص من الهيئة العامة للرقابة المالية (FRA).
            </p>

            <h2 className="mt-10 text-xl font-bold text-main">تواصل معنا</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-main">
                للأسئلة أو التصحيحات أو الشراكات:{' '}
                <Link href="/ar/contact" className="font-semibold text-starta-teal hover:underline">اتصل بنا</Link>. أو تصفّح{' '}
                <Link href="/ar/companies" className="font-semibold text-starta-teal hover:underline">دليل شركات البورصة المصرية</Link>، و
                <Link href="/ar/Funds" className="font-semibold text-starta-teal hover:underline">صناديق الاستثمار</Link>، و
                <Link href="/ar/Learn" className="font-semibold text-starta-teal hover:underline">أكاديمية ستارتا</Link>.
            </p>

            <nav aria-label="ذات صلة" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/ar/editorial-policy" className="text-muted hover:text-starta-teal">سياسة التحرير</Link>
                <Link href="/ar/corrections" className="text-muted hover:text-starta-teal">سياسة التصحيحات</Link>
                <a href="/about" hrefLang="en" lang="en" className="text-muted hover:text-starta-teal">About in English</a>
            </nav>
        </PublicPageShell>
    );
}
