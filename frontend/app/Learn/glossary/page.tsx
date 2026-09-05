import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL, absUrl, OG_DEFAULTS } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { GLOSSARY_TERMS, firstSentence } from '@/content/glossary-terms';

/**
 * English glossary index at /Learn/glossary. Fully static: content comes from
 * content/glossary-terms.ts only (no db). Reciprocal hreflang pair with
 * /ar/Learn/glossary.
 */

const PATH = '/Learn/glossary';
const TERM_COUNT = GLOSSARY_TERMS.length;

export const metadata: Metadata = {
    title: 'Financial Glossary — EGX & Investing Terms',
    description:
        `Plain-English definitions of ${TERM_COUNT} essential stock market and investing terms — from P/E ratio and NAV to circuit breakers — with an Egyptian Exchange (EGX) angle.`,
    alternates: {
        canonical: PATH,
        languages: {
            en: PATH,
            ar: '/ar/Learn/glossary',
            'x-default': '/ar/Learn/glossary',
        },
    },
    openGraph: {
            ...OG_DEFAULTS,
        type: 'website',
        title: 'Financial Glossary — EGX & Investing Terms',
        description:
            `Definitions of ${TERM_COUNT} essential stock market and investing terms with an Egyptian Exchange (EGX) angle.`,
        url: PATH,
        locale: 'en_US',
    },
};

export default function GlossaryIndexPage() {
    const terms = [...GLOSSARY_TERMS].sort((a, b) => a.en.term.localeCompare(b.en.term, 'en'));

    const definedTermSetJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'DefinedTermSet',
        name: 'Financial Glossary — EGX & Investing Terms',
        url: absUrl(PATH),
        hasDefinedTerm: terms.map((t) => ({
            '@type': 'DefinedTerm',
            name: t.en.term,
            description: firstSentence(t.en.definition),
            url: absUrl(`${PATH}/${t.slug}`),
            inDefinedTermSet: absUrl(PATH),
        })),
    };

    const crumbs = [
        { href: '/', label: 'Home' },
        { href: '/Learn', label: 'Learn' },
        { label: 'Glossary' },
    ];

    return (
        <PublicPageShell lang="en" altHref="/ar/Learn/glossary">
            <JsonLd data={definedTermSetJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs lang="en" items={crumbs} />

            <h1 className="text-2xl font-extrabold leading-snug text-main sm:text-3xl">
                Financial Glossary — EGX &amp; Investing Terms
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-main">
                Clear definitions of the terms you meet when following the Egyptian Exchange — from
                order types and index mechanics to fund NAVs — in English and Arabic.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {terms.map((t) => (
                    <li
                        key={t.slug}
                        className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-teal-300"
                    >
                        <Link
                            href={`${PATH}/${t.slug}`}
                            prefetch={false}
                            className="font-bold text-main hover:text-starta-darkTeal"
                        >
                            {t.en.term}
                        </Link>
                        <span dir="rtl" lang="ar" className="ms-2 text-sm font-semibold text-muted">
                            {t.ar.term}
                        </span>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            {firstSentence(t.en.definition)}
                        </p>
                    </li>
                ))}
            </ul>

            <p className="mt-10 rounded-xl border border-teal-100 bg-teal-50 p-4 text-[1.05rem] leading-relaxed text-main">
                Want the full lessons behind these terms?{' '}
                <Link href="/Learn" prefetch={false} className="font-semibold text-starta-darkTeal hover:underline">
                    Visit the Learn academy
                </Link>{' '}
                or{' '}
                <Link href="/Funds" prefetch={false} className="font-semibold text-starta-darkTeal hover:underline">
                    explore the mutual funds
                </Link>
                .
            </p>
        </PublicPageShell>
    );
}
