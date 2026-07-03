import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SITE_URL, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import {
    GLOSSARY_TERMS,
    GLOSSARY_SITE_LINKS,
    firstSentence,
    getGlossaryTerm,
    relatedGlossaryTerms,
} from '@/content/glossary-terms';

/**
 * Arabic glossary term page at /ar/Learn/glossary/{slug}. Fully static:
 * content comes from content/glossary-terms.ts only (no db). Uses the SAME
 * hreflang languages map as the English page so the pair is reciprocal.
 */

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
    return GLOSSARY_TERMS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const term = getGlossaryTerm(slug);
    if (!term) return {};
    const path = `/ar/Learn/glossary/${slug}`;
    const description = firstSentence(term.ar.definition);
    return {
        title: `${term.ar.term} — تعريف | قاموس المصطلحات`,
        description,
        alternates: {
            canonical: path,
            languages: {
                en: `/Learn/glossary/${slug}`,
                ar: path,
                'x-default': `/Learn/glossary/${slug}`,
            },
        },
        openGraph: {
            type: 'article',
            title: `${term.ar.term} — تعريف`,
            description,
            url: path,
            locale: 'ar_EG',
        },
    };
}

export default async function GlossaryTermArabicPage({ params }: Props) {
    const { slug } = await params;
    const term = getGlossaryTerm(slug);
    if (!term) notFound();

    const path = `/ar/Learn/glossary/${slug}`;
    const related = relatedGlossaryTerms(slug);
    const siteLinks = GLOSSARY_SITE_LINKS[slug] ?? [];

    const definedTermJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: term.ar.term,
        description: term.ar.definition,
        inDefinedTermSet: absUrl('/ar/Learn/glossary'),
        url: absUrl(path),
    };

    const crumbs = [
        { href: '/', label: 'الرئيسية' },
        { href: '/Learn', label: 'تعلّم' },
        { href: '/ar/Learn/glossary', label: 'القاموس' },
        { label: term.ar.term },
    ];

    return (
        <PublicPageShell lang="ar" altHref={`/Learn/glossary/${term.slug}`}>
            <JsonLd data={definedTermJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs items={crumbs} />

            <article lang="ar" className="max-w-3xl">
                <h1 className="text-2xl font-extrabold leading-snug text-main sm:text-3xl">
                    {term.ar.term}
                </h1>
                <p dir="ltr" lang="en" className="mt-1 text-start text-lg font-semibold text-starta-teal">
                    {term.en.term}
                </p>

                <p className="mt-5 text-[1.05rem] leading-relaxed text-main">
                    {term.ar.definition}
                </p>

                {siteLinks.length > 0 && (
                    <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50 p-4">
                        <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
                            شاهدها على المنصة
                        </p>
                        <ul className="mt-2 space-y-1">
                            {siteLinks.map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={l.href}
                                        prefetch={false}
                                        className="font-semibold text-starta-teal hover:underline"
                                    >
                                        {l.ar} ←
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </article>

            <section lang="ar" className="mt-10 border-t border-border pt-6">
                <h2 className="text-lg font-bold text-main">مصطلحات ذات صلة</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                    {related.map((t) => (
                        <li key={t.slug}>
                            <Link
                                href={`/ar/Learn/glossary/${t.slug}`}
                                prefetch={false}
                                className="inline-block rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-main transition-colors hover:border-teal-300 hover:text-starta-teal"
                            >
                                {t.ar.term}
                            </Link>
                        </li>
                    ))}
                </ul>
                <p className="mt-5 text-sm">
                    <Link
                        href="/ar/Learn/glossary"
                        prefetch={false}
                        className="font-semibold text-starta-teal hover:underline"
                    >
                        كل مصطلحات القاموس ←
                    </Link>
                </p>
            </section>
        </PublicPageShell>
    );
}
