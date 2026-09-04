import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { SITE_URL, absUrl, arabicSlug, assertUniqueSlugs, canonicalRedirectTarget, glossaryPath } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import {
    GLOSSARY_TERMS,
    GLOSSARY_SITE_LINKS,
    firstSentence,
    getGlossaryTermByParam,
    relatedGlossaryTerms,
} from '@/content/glossary-terms';
import { glossaryDepth } from '@/content/glossary-detail';

/**
 * Arabic glossary term page. Canonical URL carries the ARABIC-term slug:
 * /ar/Learn/glossary/{arabic-slug}. The legacy English slug (the catalogue
 * key) still resolves and 308s to the Arabic canonical, so indexed URLs never
 * 404. Fully static: content comes from content/glossary-terms.ts only (no
 * db). Uses the SAME hreflang languages map as the English page (reciprocal).
 */

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
    // Build gate: an EN/AR slug collision would point one URL at two terms
    // (or an alias at the wrong one) — fail the build, never ship it.
    assertUniqueSlugs(
        'glossary terms (EN ∪ AR)',
        GLOSSARY_TERMS.flatMap((t) => [...new Set([t.slug, arabicSlug(t.ar.term) || t.slug])])
    );
    // Prerender the Arabic canonicals; legacy EN slugs render on demand → 308.
    return GLOSSARY_TERMS.map((t) => ({ slug: arabicSlug(t.ar.term) || t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const term = getGlossaryTermByParam(slug);
    if (!term) return {};
    const path = encodeURI(glossaryPath(term.slug, term.ar.term, 'ar'));
    const description = firstSentence(term.ar.definition);
    return {
        title: `${term.ar.term} — تعريف`,
        description,
        alternates: {
            canonical: path,
            languages: {
                en: `/Learn/glossary/${term.slug}`,
                ar: path,
                // x-default = Arabic: the site's default language is Arabic.
                'x-default': path,
            },
        },
        openGraph: {
            type: 'article',
            title: `${term.ar.term} — تعريف`,
            description,
            url: path,
            locale: 'ar_EG',
            images: [{ url: '/og-default.png' }],
        },
    };
}

export default async function GlossaryTermArabicPage({ params }: Props) {
    const { slug } = await params;
    const term = getGlossaryTermByParam(slug);
    if (!term) notFound();

    const path = glossaryPath(term.slug, term.ar.term, 'ar');
    // 308 legacy/stale slugs (e.g. the old English slug) to the Arabic canonical.
    const redirectTarget = canonicalRedirectTarget(`/ar/Learn/glossary/${slug}`, path);
    if (redirectTarget) permanentRedirect(redirectTarget);
    const related = relatedGlossaryTerms(term.slug);
    const siteLinks = GLOSSARY_SITE_LINKS[term.slug] ?? [];
    // term.slug, NOT slug: the Arabic URL carries the Arabic slug, while
    // GLOSSARY_DETAIL is keyed by the canonical English slug — the same key
    // GLOSSARY_SITE_LINKS uses one line above.
    const depth = glossaryDepth(term.slug, 'ar');

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

                {depth && (
                    <div className="mt-8 space-y-6">
                        <section>
                            <h2 className="text-base font-extrabold tracking-tight text-main">مثال</h2>
                            <p className="mt-1.5 leading-relaxed text-muted">{depth.example}</p>
                        </section>
                        <section>
                            <h2 className="text-base font-extrabold tracking-tight text-main">لماذا يهم</h2>
                            <p className="mt-1.5 leading-relaxed text-muted">{depth.whyItMatters}</p>
                        </section>
                        <section>
                            <h2 className="text-base font-extrabold tracking-tight text-main">خطأ شائع</h2>
                            <p className="mt-1.5 leading-relaxed text-muted">{depth.mistake}</p>
                        </section>
                    </div>
                )}

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
                                href={encodeURI(glossaryPath(t.slug, t.ar.term, 'ar'))}
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
