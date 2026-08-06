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

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Contact Starta Markets</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-main">
                We read everything. For the fastest answer about a stock or fund, browse the{' '}
                <Link href="/Funds" className="font-semibold text-starta-teal hover:underline">fund profiles</Link> first —
                for everything else, email us:
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {CHANNELS.map((c) => (
                    <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{c.label}</h2>
                        <a href={`mailto:${c.email}`} className="mt-2 block font-semibold text-starta-teal hover:underline">
                            {c.email}
                        </a>
                        <p className="mt-1 text-sm text-muted">{c.note}</p>
                    </div>
                ))}
            </div>

            <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted" dir="rtl" lang="ar">
                للاستفسارات والدعم راسلنا على البريد أعلاه — وللأسئلة السريعة عن أي سهم أو صندوق تصفّح صفحات الصناديق.
            </p>
        </PublicPageShell>
    );
}
