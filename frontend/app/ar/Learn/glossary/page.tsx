import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, absUrl, glossaryPath } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { GLOSSARY_TERMS, firstSentence } from '@/content/glossary-terms';

/**
 * Arabic glossary index at /ar/Learn/glossary. Fully static: content comes
 * from content/glossary-terms.ts only (no db). Uses the SAME hreflang
 * languages map as the English page so the pair is reciprocal.
 */

const PATH = '/ar/Learn/glossary';

export const metadata: Metadata = {
    title: 'قاموس المصطلحات المالية — البورصة المصرية والاستثمار',
    description:
        'تعريفات واضحة لثلاثين مصطلحًا أساسيًا في سوق الأسهم والاستثمار — من مكرر الربحية وصافي قيمة الأصول إلى قاطع التداول — بزاوية مصرية على البورصة المصرية.',
    alternates: {
        canonical: PATH,
        languages: {
            en: '/Learn/glossary',
            ar: PATH,
            'x-default': PATH,
        },
    },
    openGraph: {
        type: 'website',
        title: 'قاموس المصطلحات المالية',
        description: 'تعريفات لثلاثين مصطلحًا أساسيًا في سوق الأسهم والاستثمار بزاوية على البورصة المصرية.',
        url: PATH,
        locale: 'ar_EG',
    },
};

export default function GlossaryIndexArabicPage() {
    const terms = [...GLOSSARY_TERMS].sort((a, b) => a.ar.term.localeCompare(b.ar.term, 'ar'));

    const definedTermSetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTermSet',
        name: 'قاموس المصطلحات المالية — البورصة المصرية والاستثمار',
        url: absUrl(PATH),
        hasDefinedTerm: terms.map((t) => ({
            '@type': 'DefinedTerm',
            name: t.ar.term,
            description: firstSentence(t.ar.definition),
            url: absUrl(glossaryPath(t.slug, t.ar.term, 'ar')),
            inDefinedTermSet: absUrl(PATH),
        })),
    };

    const crumbs = [
        { href: '/', label: 'الرئيسية' },
        { href: '/Learn', label: 'تعلّم' },
        { label: 'القاموس' },
    ];

    return (
        <PublicPageShell lang="ar" altHref="/Learn/glossary">
            <JsonLd data={definedTermSetJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs items={crumbs} />

            <div lang="ar">
                <h1 className="text-2xl font-extrabold leading-snug text-main sm:text-3xl">
                    قاموس المصطلحات المالية
                </h1>
                <p className="mt-3 max-w-3xl text-lg leading-relaxed text-main">
                    تعريفات واضحة لأهم المصطلحات التي تقابلك عند متابعة البورصة المصرية — من أنواع
                    الأوامر وآلية المؤشرات إلى صافي قيمة أصول الصناديق — بالعربية والإنجليزية.
                </p>

                <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                    {terms.map((t) => (
                        <li
                            key={t.slug}
                            className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-teal-300"
                        >
                            <Link
                                href={encodeURI(glossaryPath(t.slug, t.ar.term, 'ar'))}
                                prefetch={false}
                                className="font-bold text-main hover:text-starta-teal"
                            >
                                {t.ar.term}
                            </Link>
                            <span dir="ltr" lang="en" className="ms-2 text-sm font-semibold text-muted">
                                {t.en.term}
                            </span>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted">
                                {firstSentence(t.ar.definition)}
                            </p>
                        </li>
                    ))}
                </ul>

                <p className="mt-10 rounded-xl border border-teal-100 bg-teal-50 p-4 text-[1.05rem] leading-relaxed text-main">
                    تريد الدروس الكاملة وراء هذه المصطلحات؟{' '}
                    <Link href="/ar/Learn" prefetch={false} className="font-semibold text-starta-teal hover:underline">
                        زر أكاديمية التعلّم
                    </Link>{' '}
                    أو{' '}
                    <Link href="/ar/Funds" prefetch={false} className="font-semibold text-starta-teal hover:underline">
                        استكشف صناديق الاستثمار
                    </Link>
                    .
                </p>
            </div>
        </PublicPageShell>
    );
}
