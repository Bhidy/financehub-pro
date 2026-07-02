import Link from 'next/link';

/**
 * Server-rendered chrome for the SEO/public pages (news articles, fund pages,
 * learn topics, directory hubs). Styled to the Midnight Teal design system
 * (DESIGN_SYSTEM.md): dark-navy #0F172A anchors, teal #14B8A6 accent, light
 * #F8FAFC surfaces, uppercase tracked nav like the designed static pages.
 * Zero client JS.
 */

const NAV = [
    { href: '/', label: 'Home' },
    { href: '/Market-Pulse', label: 'Market Pulse' },
    { href: '/companies', label: 'Companies' },
    { href: '/News', label: 'Market News' },
    { href: '/Funds', label: 'Funds' },
    { href: '/Learn', label: 'Learn' },
];

export default function PublicPageShell({
    children,
    dir = 'ltr',
}: {
    children: React.ReactNode;
    dir?: 'ltr' | 'rtl';
}) {
    return (
        <div dir={dir} className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
            <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
                    <Link href="/" className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight text-[#0F172A]">
                        <span className="relative flex h-2.5 w-2.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#14B8A6]" />
                        </span>
                        Starta<span className="text-[#14B8A6]">Markets</span>
                    </Link>
                    <nav aria-label="Main" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        {NAV.map((item) => (
                            <Link key={item.href} href={item.href} className="transition-colors hover:text-[#14B8A6]">
                                {item.label}
                            </Link>
                        ))}
                        <Link
                            href="/AiChat"
                            className="rounded-full bg-[#0F172A] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#14B8A6]"
                        >
                            AI Analyst
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
            <footer className="mt-16 bg-[#0F172A] text-slate-300">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10 sm:px-6">
                    <div>
                        <p className="flex items-center gap-2 text-[15px] font-extrabold tracking-tight text-white">
                            <span className="inline-block h-2 w-2 rounded-full bg-[#14B8A6]" aria-hidden />
                            Starta<span className="text-[#14B8A6]">Markets</span>
                        </p>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                            EGX market intelligence in Arabic &amp; English — live prices, fund NAVs, news and an AI analyst.
                        </p>
                    </div>
                    <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        <Link href="/companies" className="hover:text-[#2DD4BF]">EGX Companies</Link>
                        <Link href="/sectors" className="hover:text-[#2DD4BF]">Sectors</Link>
                        <Link href="/News" className="hover:text-[#2DD4BF]">News</Link>
                        <Link href="/Funds" className="hover:text-[#2DD4BF]">Funds</Link>
                        <Link href="/Learn" className="hover:text-[#2DD4BF]">Learn</Link>
                        <Link href="/about" className="hover:text-[#2DD4BF]">About</Link>
                        <Link href="/contact" className="hover:text-[#2DD4BF]">Contact</Link>
                        <Link href="/privacy" className="hover:text-[#2DD4BF]">Privacy</Link>
                        <Link href="/terms" className="hover:text-[#2DD4BF]">Terms</Link>
                    </nav>
                </div>
                <div className="border-t border-white/10">
                    <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
                        © {new Date().getFullYear()} Starta Markets. Market data is informational — not investment advice.
                    </p>
                </div>
            </footer>
        </div>
    );
}

/** Linked breadcrumb trail; pair with a BreadcrumbList JSON-LD block. */
export function Breadcrumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
    return (
        <nav aria-label="Breadcrumb" className="mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <ol className="flex flex-wrap items-center gap-1.5">
                {items.map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span aria-hidden className="text-slate-300">/</span>}
                        {item.href ? (
                            <Link href={item.href} className="transition-colors hover:text-[#14B8A6]">
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-slate-600">{item.label}</span>
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
