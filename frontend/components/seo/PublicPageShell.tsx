import Link from 'next/link';

/**
 * Lightweight server-rendered chrome for the SEO/public pages (news articles,
 * fund pages, learn topics, directory hubs). Light theme to match the static
 * public site; zero client JS.
 */

const NAV = [
    { href: '/', label: 'Home' },
    { href: '/Market-Pulse', label: 'Market Pulse' },
    { href: '/companies', label: 'Companies' },
    { href: '/News', label: 'News' },
    { href: '/Funds', label: 'Funds' },
    { href: '/Learn', label: 'Learn' },
    { href: '/AiChat', label: 'AI Analyst' },
];

export default function PublicPageShell({
    children,
    dir = 'ltr',
}: {
    children: React.ReactNode;
    dir?: 'ltr' | 'rtl';
}) {
    return (
        <div dir={dir} className="min-h-screen bg-slate-50 text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
                    <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-slate-900">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-teal-500" aria-hidden />
                        Starta <span className="text-teal-600">Markets</span>
                    </Link>
                    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-600">
                        {NAV.map((item) => (
                            <Link key={item.href} href={item.href} className="hover:text-teal-600">
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
            <footer className="mt-12 border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} Starta Markets — EGX market intelligence in Arabic &amp; English.</p>
                    <nav aria-label="Footer" className="flex flex-wrap gap-4">
                        <Link href="/companies" className="hover:text-teal-600">EGX Companies</Link>
                        <Link href="/News" className="hover:text-teal-600">News</Link>
                        <Link href="/Funds" className="hover:text-teal-600">Funds</Link>
                        <Link href="/Learn" className="hover:text-teal-600">Learn</Link>
                        <Link href="/about" className="hover:text-teal-600">About</Link>
                        <Link href="/contact" className="hover:text-teal-600">Contact</Link>
                        <Link href="/privacy" className="hover:text-teal-600">Privacy</Link>
                        <Link href="/terms" className="hover:text-teal-600">Terms</Link>
                    </nav>
                </div>
            </footer>
        </div>
    );
}

/** Linked breadcrumb trail; pair with a BreadcrumbList JSON-LD block. */
export function Breadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
            <ol className="flex flex-wrap items-center gap-1">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-1">
                        {i > 0 && <span aria-hidden>›</span>}
                        {item.href ? (
                            <Link href={item.href} className="hover:text-teal-600">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-slate-700">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

/** BreadcrumbList JSON-LD helper (absolute URLs required). */
export function breadcrumbJsonLd(items: Array<{ url?: string; label: string }>, siteUrl: string) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.label,
            ...(item.url ? { item: siteUrl + item.url } : {}),
        })),
    };
}
