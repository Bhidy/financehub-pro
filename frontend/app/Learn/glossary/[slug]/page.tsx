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
 * English glossary term page at /Learn/glossary/{slug}. Fully static: content
 * comes from content/glossary-terms.ts only (no db). Reciprocal hreflang pair
 * with /ar/Learn/glossary/{slug}.
 */

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
    return GLOSSARY_TERMS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const term = getGlossaryTerm(slug);
    if (!term) return {};
    const path = `/Learn/glossary/${slug}`;
    const description = firstSentence(term.en.definition);
    return {
        // Short template: the root layout appends the brand, and the final
        // audit flagged glossary titles running past 70 chars.
        title: `${term.en.term} — Definition`,
        description,
        alternates: {
            canonical: path,
            languages: {
                en: path,
                ar: `/ar/Learn/glossary/${slug}`,
                'x-default': path,
            },
        },
        openGraph: {
            type: 'article',
            title: `${term.en.term} — Definition`,
            description,
            url: path,
            locale: 'en_US',
            images: [{ url: '/og-default.png' }],
        },
    };
}

export default async function GlossaryTermPage({ params }: Props) {
    const { slug } = await params;
    const term = getGlossaryTerm(slug);
    if (!term) notFound();

    const path = `/Learn/glossary/${slug}`;
    const related = relatedGlossaryTerms(slug);
    const siteLinks = GLOSSARY_SITE_LINKS[slug] ?? [];

    const definedTermJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTerm',
        name: term.en.term,
        description: term.en.definition,
        inDefinedTermSet: absUrl('/Learn/glossary'),
        url: absUrl(path),
    };

    const crumbs = [
        { href: '/', label: 'Home' },
        { href: '/Learn', label: 'Learn' },
        { href: '/Learn/glossary', label: 'Glossary' },
        { label: term.en.term },
    ];

    return (
        <PublicPageShell lang="en" altHref={`/ar/Learn/glossary/${term.slug}`}>
            <JsonLd data={definedTermJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs items={crumbs} />

            <article className="max-w-3xl">
                <h1 className="text-2xl font-extrabold leading-snug text-main sm:text-3xl">
                    {term.en.term}
                </h1>
                <p dir="rtl" lang="ar" className="mt-1 text-start text-lg font-semibold text-starta-teal">
                    {term.ar.term}
                </p>

                <p className="mt-5 text-[1.05rem] leading-relaxed text-main">
                    {term.en.definition}
                </p>

                {siteLinks.length > 0 && (
                    <div className="mt-6 rounded-xl border border-teal-100 bg-teal-50 p-4">
                        <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted">
                            See it in action
                        </p>
                        <ul className="mt-2 space-y-1">
                            {siteLinks.map((l) => (
                                <li key={l.href}>
                                    <Link
                                        href={l.href}
                                        prefetch={false}
                                        className="font-semibold text-starta-teal hover:underline"
                                    >
                                        {l.en} →
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </article>

            <section className="mt-10 border-t border-border pt-6">
                <h2 className="text-lg font-bold text-main">Related terms</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                    {related.map((t) => (
                        <li key={t.slug}>
                            <Link
                                href={`/Learn/glossary/${t.slug}`}
                                prefetch={false}
                                className="inline-block rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium text-main transition-colors hover:border-teal-300 hover:text-starta-teal"
                            >
                                {t.en.term}
                            </Link>
                        </li>
                    ))}
                </ul>
                <p className="mt-5 text-sm">
                    <Link
                        href="/Learn/glossary"
                        prefetch={false}
                        className="font-semibold text-starta-teal hover:underline"
                    >
                        ← All glossary terms
                    </Link>
                </p>
            </section>
        </PublicPageShell>
    );
}
