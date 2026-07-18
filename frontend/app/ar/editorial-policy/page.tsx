import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** Arabic twin of /editorial-policy — "سياسة التحرير". */

export const metadata: Metadata = {
    title: 'سياسة التحرير — المصادر والدقة والإفصاح عن الذكاء الاصطناعي',
    description:
        'كيف تجمع ستارتا ماركتس بيانات وأخبار البورصة المصرية وتتحقق منها وتنشرها — معايير المصادر، وعملية الدقة، والإفصاح عن استخدام الذكاء الاصطناعي، وسياسة التصحيحات.',
    alternates: {
        canonical: '/ar/editorial-policy',
        languages: { en: '/editorial-policy', ar: '/ar/editorial-policy', 'x-default': '/ar/editorial-policy' },
    },
};

const SECTIONS: Array<{ h: string; p: string }> = [
    { h: 'ماذا ننشر', p: 'تنشر ستارتا ماركتس بيانات السوق (الأسعار والقوائم المالية والتوزيعات والتحليل الفني وصافي قيمة أصول الصناديق) للبورصة المصرية (EGX)، وأخبار السوق المجمّعة، ومحتوى تعليمي. البيانات والمحتوى التعليمي لأغراض معلوماتية فقط وليست نصيحة استثمارية.' },
    { h: 'مصادر البيانات', p: 'تأتي الأسعار وبيانات السوق من البورصة المصرية عبر TradingView؛ والقوائم المالية عبر TradingView وYahoo Finance؛ وصافي قيمة أصول الصناديق من إفصاحات مديري الصناديق؛ والأخبار من الصحافة المالية المصرية المرخّصة بالعربية والإنجليزية. تحمل كل صفحة بيانات ختم "آخر تحديث" (بتوقيت القاهرة) ومصدرها عند الاقتضاء. المصادر وتواتر التحديث موثّقة بالكامل في صفحة "من نحن والمنهجية".' },
    { h: 'الدقة والتعامل مع الأرقام', p: 'لا نحرّر الأرقام يدويًا. القيم المعروضة هي القيم الواردة من المصدر الأساسي في وقت التحديث المذكور؛ وتُحسب القيم المشتقة (المتوسطات المتحركة والنسب والعوائد) آليًا من تلك البيانات بالمنهجية المذكورة على الصفحة. إذا عدّل المصدر رقمًا، تُحدَّث صفحتنا في تحديثها التالي.' },
    { h: 'كيف تُختار الأخبار وتُعالج', p: 'تُجمَع الأخبار من الصحافة المالية المرخّصة التي تغطي السوق المصري. يفضّل الاختيار التغطية المتعلقة بشركات وقطاعات البورصة والاقتصاد الكلي. تُنظَّف العناوين والمصادر للاتساق ونربطها بصفحات البيانات عند الاقتضاء. لا نختلق اقتباسات أو أرقامًا أو أحداثًا.' },
    { h: 'استخدام الذكاء الاصطناعي', p: 'تستخدم ستارتا ماركتس الذكاء الاصطناعي للمساعدة في التلخيص والترجمة وهيكلة المحتوى، وتوفّر محللًا ذكيًا يجيب من بياناتنا. تُقدَّم شروح الذكاء الاصطناعي بوضوح كمساعدة تحليلية مبنية على بيانات المنصة، وليست بديلًا عن المشورة المالية المهنية. لا يُستخدم الذكاء الاصطناعي مطلقًا لاختلاق حقائق أو أرقام.' },
    { h: 'الاستقلالية والإفصاح', p: 'ستارتا ماركتس منصة بيانات وتقنية. لا نقبل مقابلًا لتغيير التصنيفات أو الأسعار أو التغطية؛ والتصنيفات الآلية (مثل جداول أداء الصناديق) هي ترتيبات آلية لبيانات مباشرة بالمنهجية المذكورة.' },
    { h: 'التصحيحات', p: 'نصحّح الأخطاء بسرعة وشفافية. للإبلاغ عن خطأ محتمل في أي رقم أو مقال، راجع صفحة التصحيحات أو راسلنا على corrections@startamarkets.com.' },
];

export default function EditorialPolicyArPage() {
    return (
        <PublicPageShell lang="ar" altHref="/editorial-policy">
            <JsonLd data={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'سياسة التحرير — ستارتا ماركتس', url: `${SITE_URL}/ar/editorial-policy`, inLanguage: 'ar', mainEntity: { '@id': `${SITE_URL}/#organization` } }} />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'الرئيسية' }, { label: 'سياسة التحرير' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'الرئيسية' }, { label: 'سياسة التحرير' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">سياسة التحرير</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                كيف تجمع ستارتا ماركتس بيانات وأخبار البورصة المصرية وتتحقق منها وتنشرها. هدفنا منصة يثق بها الناس ومحركات البحث والذكاء الاصطناعي على حد سواء: مصادر شفافة، ودقة آلية، وإفصاح واضح عن كيفية استخدام الذكاء الاصطناعي.
            </p>

            <div className="mt-8 max-w-3xl space-y-7">
                {SECTIONS.map((s) => (
                    <section key={s.h}>
                        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-main">
                            <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />{s.h}
                        </h2>
                        <p className="mt-2 leading-relaxed text-muted">{s.p}</p>
                    </section>
                ))}
            </div>

            <nav aria-label="ذات صلة" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/about" className="text-muted hover:text-starta-teal">من نحن ومصادر البيانات</Link>
                <Link href="/ar/corrections" className="text-muted hover:text-starta-teal">سياسة التصحيحات</Link>
                <a href="/editorial-policy" hrefLang="en" className="text-muted hover:text-starta-teal">Editorial policy in English</a>
            </nav>
        </PublicPageShell>
    );
}
