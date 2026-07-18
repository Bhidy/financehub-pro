import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /editorial-policy — the E-E-A-T authority page (audit High gap: zero
 * editorial/sourcing/AI-disclosure surface). States how data and news are
 * sourced, reviewed and disclosed. Referenced by NewsArticle
 * publishingPrinciples so every article is one hop from provenance.
 */

export const metadata: Metadata = {
    title: 'Editorial Policy — Sourcing, Accuracy & AI Disclosure',
    description:
        'How Starta Markets sources, verifies and publishes Egyptian Exchange market data and news — our sourcing standards, accuracy process, AI-assistance disclosure and corrections policy.',
    alternates: {
        canonical: '/editorial-policy',
        languages: { en: '/editorial-policy', ar: '/ar/editorial-policy', 'x-default': '/ar/editorial-policy' },
    },
};

const SECTIONS: Array<{ h: string; p: string }> = [
    {
        h: 'What we publish',
        p: 'Starta Markets publishes market data (prices, financial statements, dividends, technicals, fund NAVs) for the Egyptian Exchange (EGX), aggregated market news, and educational explainers. Data and educational content are informational only and are not investment advice.',
    },
    {
        h: 'Where the data comes from',
        p: 'Prices and market data come from the Egyptian Exchange via TradingView; financial statements via TradingView and Yahoo Finance; fund NAVs from fund-manager disclosures; and news from licensed Egyptian financial press in Arabic and English. Each data page carries an “as of” timestamp (Cairo time) and, where relevant, its source. The full source and refresh cadence is documented on our About & methodology page.',
    },
    {
        h: 'Accuracy and how we handle numbers',
        p: 'We do not hand-edit numeric data. Figures shown are the values received from the primary source at the stated refresh time; derived figures (moving averages, ratios, returns) are computed mechanically from that primary data with the method stated on the page. If a source revises a figure, our page updates on its next refresh.',
    },
    {
        h: 'How news is selected and processed',
        p: 'News items are ingested from licensed financial-press feeds covering the Egyptian market. Selection favours EGX-relevant company, sector and macro coverage. Headlines and datelines are cleaned for consistency; we link to the underlying data pages where relevant. We do not fabricate quotes, figures or events.',
    },
    {
        h: 'Use of AI',
        p: 'Starta Markets uses AI to help summarise, translate and structure content, and provides an AI market analyst that answers questions from our own data. AI-generated explanations are clearly presented as analytical assistance, are grounded in the platform’s data, and are not a substitute for professional financial advice. AI is never used to invent facts or figures.',
    },
    {
        h: 'Independence and disclosures',
        p: 'Starta Markets is a data and technology platform. We do not accept payment to alter rankings, prices or coverage; programmatic rankings (for example fund performance tables) are mechanical orderings of live data with the methodology stated inline.',
    },
    {
        h: 'Corrections',
        p: 'We correct errors promptly and transparently. To report a possible error in any figure or article, see our Corrections page or email corrections@startamarkets.com.',
    },
];

export default function EditorialPolicyPage() {
    return (
        <PublicPageShell>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'AboutPage',
                    name: 'Editorial Policy — Starta Markets',
                    url: `${SITE_URL}/editorial-policy`,
                    mainEntity: { '@id': `${SITE_URL}/#organization` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { label: 'Editorial Policy' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Editorial Policy' }]} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Editorial Policy</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">
                How Starta Markets sources, verifies, and publishes Egyptian Exchange market data and news. Our aim is
                a platform that both people and search/AI engines can trust: transparent sources, mechanical accuracy,
                and clear disclosure of how AI is used.
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

            <nav aria-label="Related" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-6 text-sm font-semibold">
                <Link href="/about" className="text-muted hover:text-starta-teal">About &amp; data sources</Link>
                <Link href="/corrections" className="text-muted hover:text-starta-teal">Corrections policy</Link>
                <Link href="/contact" className="text-muted hover:text-starta-teal">Contact</Link>
                <a href="/ar/editorial-policy" lang="ar" hrefLang="ar" className="text-muted hover:text-starta-teal">سياسة التحرير بالعربية</a>
            </nav>
        </PublicPageShell>
    );
}
