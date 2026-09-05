import Link from 'next/link';
import PublicPageShell from '@/components/seo/PublicPageShell';

/**
 * English 404 (the /ar tree has its own, app/ar/not-found.tsx). Replaces
 * Next's bare error shell — no heading, no navigation, the layout's generic
 * title — with a page that names the likely causes (a delisted or foreign
 * symbol, a fund without a published price) and links the main hubs.
 */
export default function NotFound() {
    return (
        <PublicPageShell lang="en" altHref="/ar">
            <title>Page not found | Starta Markets</title>
            <meta name="robots" content="noindex, follow" />
            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">Page not found</h1>
            <p className="mt-3 max-w-2xl leading-relaxed text-muted">
                There is no page at this address. The link may be out of date, or it may point to a security that is not
                listed on the Egyptian Exchange, or to a fund that no longer publishes a price.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                    { href: '/', title: 'Home', desc: 'Egyptian Exchange stocks, funds and market intelligence' },
                    { href: '/Funds', title: 'Mutual funds', desc: 'NAVs, returns and fees for every priced fund' },
                    { href: '/companies', title: 'EGX companies', desc: 'Listed companies ranked by market capitalisation' },
                    { href: '/Funds/best-mutual-funds-egypt-2026', title: 'Best mutual funds 2026', desc: 'Ranked mechanically by trailing 1-year return' },
                    { href: '/News', title: 'Market news', desc: 'The latest on the exchange and the funds' },
                    { href: '/Learn/glossary', title: 'Glossary', desc: 'Investing terms explained' },
                ].map((h) => (
                    <li key={h.href}>
                        <Link href={h.href} className="group block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-starta-teal/50">
                            <span className="block font-bold text-main group-hover:text-starta-teal">{h.title}</span>
                            <span className="mt-1 block text-sm leading-relaxed text-muted">{h.desc}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </PublicPageShell>
    );
}
