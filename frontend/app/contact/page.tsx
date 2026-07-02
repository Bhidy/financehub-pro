import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = {
    title: 'Contact Starta Markets',
    description:
        'Contact Starta Markets — support, data corrections, press and partnerships for the bilingual EGX market-intelligence platform.',
    alternates: { canonical: '/contact' },
};

const CHANNELS: Array<{ label: string; email: string; note: string }> = [
    { label: 'Support & general enquiries', email: 'support@startamarkets.com', note: 'Product questions, account help, feedback' },
    { label: 'Data corrections', email: 'support@startamarkets.com', note: 'Spotted a wrong price, NAV or statement? Tell us the page and the figure' },
    { label: 'Privacy', email: 'privacy@startamarkets.com', note: 'Data-privacy questions and requests' },
];

export default function ContactPage() {
    return (
        <PublicPageShell>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'ContactPage',
                    name: 'Contact Starta Markets',
                    url: `${SITE_URL}/contact`,
                    mainEntity: { '@id': `${SITE_URL}/#organization` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd([{ url: '/', label: 'Home' }, { label: 'Contact' }], SITE_URL)} />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { label: 'Contact' }]} />

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Contact Starta Markets</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-700">
                We read everything. For the fastest answer about a stock or fund, try the{' '}
                <Link href="/AiChat" className="font-semibold text-teal-600 hover:underline">AI analyst</Link> first —
                for everything else, email us:
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {CHANNELS.map((c) => (
                    <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{c.label}</h2>
                        <a href={`mailto:${c.email}`} className="mt-2 block font-semibold text-teal-600 hover:underline">
                            {c.email}
                        </a>
                        <p className="mt-1 text-sm text-slate-500">{c.note}</p>
                    </div>
                ))}
            </div>

            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-slate-500" dir="rtl" lang="ar">
                للاستفسارات والدعم راسلنا على البريد أعلاه — وللأسئلة السريعة عن أي سهم أو صندوق جرّب المحلل الذكي.
            </p>
        </PublicPageShell>
    );
}
