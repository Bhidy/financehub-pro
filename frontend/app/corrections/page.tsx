import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/** /corrections — public corrections policy (E-E-A-T). */

export const metadata: Metadata = {
    title: 'Corrections Policy — Report an Error',
    description:
        'How Starta Markets handles corrections to Egyptian Exchange data and news, and how to report a possible error. We correct mistakes promptly and transparently.',
    alternates: {
        canonical: '/corrections',
        languages: { en: '/corrections', ar: '/ar/corrections', 'x-default': '/ar/corrections' },
    },
};

export default function CorrectionsPage() {
    return (
        <PublicPageShell>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'AboutPage',
                    name: 'Corrections Policy — Starta Markets',
                    url: `${SITE_URL}/corrections`,
                    mainEntity: { '@id': `${SITE_URL}/#organization` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { label: 'Corrections' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Corrections' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Corrections Policy</h1>

            <div className="mt-4 max-w-3xl space-y-6 leading-relaxed text-muted">
                <p>
                    Accuracy matters. Starta Markets aggregates data from primary sources and computes derived figures
                    mechanically, but errors can still occur — in a source feed, an ingestion step, or an explanatory
                    article. When we find or are told about a material error, we correct it promptly and transparently.
                </p>
                <section>
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-main">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />How we handle corrections
                    </h2>
                    <ul className="mt-2 space-y-2">
                        <li>Data figures update automatically on their next refresh once a source is corrected; the “as of” timestamp on each page shows recency.</li>
                        <li>For a material error in an article or explainer, we fix the content and, where the meaning changed, note that it was corrected.</li>
                        <li>We do not silently alter the substance of a published figure without the correction being reflected in the data’s timestamp.</li>
                    </ul>
                </section>
                <section>
                    <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight text-main">
                        <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />Report a possible error
                    </h2>
                    <p className="mt-2">
                        Spotted something that looks wrong — a price, a financial figure, a fund NAV, or a fact in an
                        article? Email <a href="mailto:corrections@startamarkets.com" className="font-semibold text-starta-teal hover:underline">corrections@startamarkets.com</a> with
                        the page URL and what you believe is incorrect. Please include a source if you have one. We review every report.
                    </p>
                </section>
            </div>

            <nav aria-label="Related" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/editorial-policy" className="text-muted hover:text-starta-teal">Editorial policy</Link>
                <Link href="/about" className="text-muted hover:text-starta-teal">About &amp; data sources</Link>
                <a href="/ar/corrections" lang="ar" hrefLang="ar" className="text-muted hover:text-starta-teal">سياسة التصحيحات بالعربية</a>
            </nav>
        </PublicPageShell>
    );
}
