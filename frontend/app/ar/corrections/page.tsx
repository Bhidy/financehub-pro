import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /corrections — "سياسة التصحيحات". */

export const metadata: Metadata = {
    title: 'سياسة التصحيحات — الإبلاغ عن خطأ',
    description:
        'كيف تتعامل ستارتا ماركتس مع تصحيحات بيانات وأخبار البورصة المصرية، وكيفية الإبلاغ عن خطأ محتمل. نصحّح الأخطاء بسرعة وشفافية.',
    alternates: {
        canonical: '/ar/corrections',
        languages: { en: '/corrections', ar: '/ar/corrections', 'x-default': '/ar/corrections' },
    },
};

export default function CorrectionsArPage() {
    return (
        <PublicPageShell lang="ar" altHref="/corrections">
            <JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'سياسة التصحيحات — ستارتا ماركتس', url: `${SITE_URL}/ar/corrections`, inLanguage: 'ar', mainEntity: { '@id': `${SITE_URL}/#organization` } }} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'التصحيحات' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { label: 'التصحيحات' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">سياسة التصحيحات</h1>

            <div className="mt-4 max-w-3xl space-y-6 leading-relaxed text-muted">
                <p>
                    الدقة تهمّنا. تجمع ستارتا ماركتس البيانات من مصادر أساسية وتحسب القيم المشتقة آليًا، لكن الأخطاء قد تحدث — في تغذية مصدر، أو خطوة معالجة، أو مقال توضيحي. عندما نكتشف خطأً جوهريًا أو يُبلَّغ به إلينا، نصحّحه بسرعة وشفافية.
                </p>
                <section>
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-main">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />كيف نتعامل مع التصحيحات
                    </h2>
                    <ul className="mt-2 space-y-2">
                        <li>تُحدَّث الأرقام تلقائيًا في تحديثها التالي بمجرد تصحيح المصدر؛ ويُظهر ختم "آخر تحديث" على كل صفحة مدى حداثتها.</li>
                        <li>عند وجود خطأ جوهري في مقال أو شرح، نصحّح المحتوى، وعندما يتغيّر المعنى نشير إلى أنه صُحِّح.</li>
                        <li>لا نغيّر جوهر رقم منشور دون أن ينعكس التصحيح في ختم وقت البيانات.</li>
                    </ul>
                </section>
                <section>
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-main">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />الإبلاغ عن خطأ محتمل
                    </h2>
                    <p className="mt-2">
                        لاحظت شيئًا يبدو خاطئًا — سعرًا أو رقمًا ماليًا أو صافي قيمة أصول صندوق أو معلومة في مقال؟ راسلنا على <a href="mailto:corrections@startamarkets.com" className="font-semibold text-starta-teal hover:underline">corrections@startamarkets.com</a> مع رابط الصفحة وما تعتقد أنه غير صحيح، وأرفق مصدرًا إن وُجد. نراجع كل بلاغ.
                    </p>
                </section>
            </div>

            <nav aria-label="ذات صلة" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/ar/editorial-policy" className="text-muted hover:text-starta-teal">سياسة التحرير</Link>
                <Link href="/ar/about" className="text-muted hover:text-starta-teal">من نحن ومصادر البيانات</Link>
                <a href="/corrections" hrefLang="en" className="text-muted hover:text-starta-teal">Corrections in English</a>
            </nav>
        </PublicPageShell>
    );
}
