import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNewsPage, type NewsArticle } from '@/lib/public-data';
import { sanitizeNewsText } from '@/lib/news-display';
import { SITE_URL, newsPath } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /News — server-rendered market-news hub with crawlable pagination.
 * Replaces the static news.html shell whose article grid was 100% client-
 * rendered (crawlers saw ~27 words and the archive beyond the first 12 items
 * was unreachable behind JS-state pagination). Every page is a real URL —
 * /News, /News?page=2, … — with self-canonical, indexable paginated pages so
 * the whole archive stays crawlable.
 */

export const dynamic = 'force-dynamic';

const PER_PAGE = 24;

type Props = { searchParams: Promise<{ page?: string }> };

function parsePage(raw: string | undefined): number {
    const n = parseInt(raw ?? '1', 10);
    return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** Same detection as the article page: Arabic feed section or Arabic script. */
function isArabic(article: NewsArticle): boolean {
    return (article.source_section || '').endsWith('/ar') || /[؀-ۿ]/.test(article.headline);
}

function headlineOf(article: NewsArticle): string {
    return sanitizeNewsText(article.headline) || 'Egypt Market Update';
}

/** First ~maxLen chars of the sanitized body, cut at a word boundary. */
function teaserOf(article: NewsArticle, maxLen = 200): string {
    const clean = sanitizeNewsText(article.article_body || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    if (clean.length <= maxLen) return clean;
    const cut = clean.slice(0, maxLen);
    const lastSpace = cut.lastIndexOf(' ');
    return `${(lastSpace > 120 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function formatDate(iso: string, arabic: boolean): { dateTime: string; human: string } {
    const d = new Date(iso);
    return {
        dateTime: d.toISOString(),
        human: d.toLocaleDateString(arabic ? 'ar-EG' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Africa/Cairo',
        }),
    };
}

/** Page 2 links to plain /News (never ?page=1 — one URL per page of content). */
function pageHref(page: number): string {
    return page <= 1 ? '/News' : `/News?page=${page}`;
}

/** Compact numbered window: first, current±2, last — with ellipsis gaps. */
function pageWindow(page: number, totalPages: number): Array<number | 'gap'> {
    const wanted = new Set<number>([1, totalPages]);
    for (let p = page - 2; p <= page + 2; p += 1) {
        if (p >= 1 && p <= totalPages) wanted.add(p);
    }
    const sorted = [...wanted].sort((a, b) => a - b);
    const out: Array<number | 'gap'> = [];
    let prev = 0;
    for (const p of sorted) {
        if (prev && p - prev > 1) out.push('gap');
        out.push(p);
        prev = p;
    }
    return out;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const { page: rawPage } = await searchParams;
    const page = parsePage(rawPage);
    if (page === 1) {
        return {
            title: 'Egyptian Market News — EGX & Egypt Business Updates',
            description:
                'Latest Egyptian Exchange (EGX) and Egypt business news in Arabic and English — company announcements, earnings, dividends and market moves, updated throughout the trading day. أخبار البورصة المصرية.',
            alternates: { canonical: '/News' },
            robots: { index: true, follow: true },
            openGraph: {
                type: 'website',
                title: 'Egyptian Market News — EGX & Egypt Business Updates | Starta Markets',
                description:
                    'Latest Egyptian Exchange (EGX) and Egypt business news in Arabic and English, updated throughout the trading day.',
                url: '/News',
            },
        };
    }
    // Paginated archive pages are SELF-canonical and indexable. Canonicalizing
    // them to page 1 (or the layout default, which strips query params) would
    // orphan every article beyond the first 24 — the exact bug this page fixes.
    return {
        title: `Egyptian Market News — Page ${page}`,
        description: `Egyptian market news archive, page ${page} — EGX company announcements, earnings and market updates in Arabic and English.`,
        alternates: { canonical: `/News?page=${page}` },
        robots: { index: true, follow: true },
    };
}

export default async function NewsHubPage({ searchParams }: Props) {
    const { page: rawPage } = await searchParams;
    const requested = parsePage(rawPage);

    const { articles, total } = await getNewsPage(requested, PER_PAGE);
    const totalPages = Math.ceil(total / PER_PAGE);

    // Beyond the archive → real 404. An empty page 1 is NOT a 404: that is a
    // transient DB state and gets a graceful empty state below.
    if (totalPages > 0 && requested > totalPages) notFound();
    const page = totalPages > 0 ? Math.min(requested, totalPages) : 1;

    const featured = page === 1 ? articles[0] : undefined;
    const gridArticles = page === 1 ? articles.slice(1) : articles;

    const breadcrumbItems =
        page === 1
            ? [{ href: '/', label: 'Home' }, { label: 'Market News' }]
            : [{ href: '/', label: 'Home' }, { href: '/News', label: 'Market News' }, { label: `Page ${page}` }];

    return (
        <PublicPageShell>
            <JsonLd
                data={breadcrumbJsonLd(
                    breadcrumbItems.map(({ href, label }) => ({ ...(href ? { url: href } : {}), label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs items={breadcrumbItems} />

            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {page === 1 ? 'Egyptian Market News' : `Egyptian Market News — Page ${page}`}
            </h1>
            {page === 1 && (
                <>
                    <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
                        Egyptian market news in Arabic and English — {total.toLocaleString()} articles, updated
                        throughout the trading day.
                    </p>
                    <p className="mt-1 text-sm text-slate-500" dir="rtl" lang="ar">
                        أخبار البورصة المصرية والشركات المدرجة — بالعربية والإنجليزية، تحديث مستمر طوال اليوم.
                    </p>
                </>
            )}

            {articles.length === 0 ? (
                <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center">
                    <p className="text-lg font-semibold text-slate-700">News is being refreshed</p>
                    <p className="mt-2 text-sm text-slate-500">
                        Articles will appear here shortly — please check back in a few minutes.
                    </p>
                    <p className="mt-4">
                        <Link href="/" className="font-semibold text-teal-600 hover:underline">
                            ← Back to Starta Markets
                        </Link>
                    </p>
                </div>
            ) : (
                <>
                    {featured && (() => {
                        const headline = headlineOf(featured);
                        const arabic = isArabic(featured);
                        const date = formatDate(featured.published_at, arabic);
                        const teaser = teaserOf(featured);
                        return (
                            <section className="mt-6" aria-label="Featured story">
                                <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    {featured.image_url && (
                                        // External news images come from many hosts; plain <img> with
                                        // explicit dimensions avoids next/image remotePatterns failures.
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={featured.image_url}
                                            alt={headline}
                                            width={1200}
                                            height={675}
                                            loading="eager"
                                            className="max-h-[420px] w-full object-cover"
                                            referrerPolicy="no-referrer"
                                        />
                                    )}
                                    <div className="p-5 sm:p-6" dir={arabic ? 'rtl' : 'ltr'} lang={arabic ? 'ar' : 'en'}>
                                        <h2 className="text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">
                                            <Link href={newsPath(featured.id, headline)} className="hover:text-teal-600">
                                                {headline}
                                            </Link>
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            <time dateTime={date.dateTime}>{date.human}</time>
                                            {featured.symbol && (
                                                <>
                                                    {' · '}
                                                    <Link
                                                        href={`/symbol/${featured.symbol.toUpperCase()}`}
                                                        className="font-semibold text-teal-600 hover:underline"
                                                    >
                                                        {featured.symbol.toUpperCase()}
                                                    </Link>
                                                </>
                                            )}
                                        </p>
                                        {teaser && <p className="mt-3 leading-relaxed text-slate-600">{teaser}</p>}
                                    </div>
                                </article>
                            </section>
                        );
                    })()}

                    {gridArticles.length > 0 && (
                        <section className="mt-8" aria-label="News articles">
                            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                {gridArticles.map((article) => {
                                    const headline = headlineOf(article);
                                    const arabic = isArabic(article);
                                    const date = formatDate(article.published_at, arabic);
                                    return (
                                        <li key={article.id}>
                                            <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-teal-300">
                                                {article.image_url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={article.image_url}
                                                        alt=""
                                                        width={400}
                                                        height={225}
                                                        loading="lazy"
                                                        className="aspect-video w-full object-cover"
                                                        referrerPolicy="no-referrer"
                                                    />
                                                ) : (
                                                    <div aria-hidden className="aspect-video w-full bg-slate-100" />
                                                )}
                                                <div
                                                    className="flex flex-1 flex-col p-4"
                                                    dir={arabic ? 'rtl' : 'ltr'}
                                                    lang={arabic ? 'ar' : 'en'}
                                                >
                                                    <h3 className="font-bold leading-snug text-slate-900">
                                                        <Link
                                                            href={newsPath(article.id, headline)}
                                                            className="line-clamp-3 hover:text-teal-600"
                                                        >
                                                            {headline}
                                                        </Link>
                                                    </h3>
                                                    <p className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-slate-500">
                                                        <time dateTime={date.dateTime}>{date.human}</time>
                                                        {article.symbol && (
                                                            <Link
                                                                href={`/symbol/${article.symbol.toUpperCase()}`}
                                                                className="rounded-full bg-teal-50 px-2 py-0.5 font-mono font-semibold text-teal-700 hover:bg-teal-100"
                                                            >
                                                                {article.symbol.toUpperCase()}
                                                            </Link>
                                                        )}
                                                    </p>
                                                </div>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    )}

                    {totalPages > 1 && (
                        <nav aria-label="Pagination" className="mt-10 border-t border-slate-200 pt-6">
                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                {page > 1 ? (
                                    <Link rel="prev" href={pageHref(page - 1)} className="font-semibold text-teal-600 hover:underline">
                                        ← Newer
                                    </Link>
                                ) : (
                                    <span aria-hidden className="text-slate-300">← Newer</span>
                                )}
                                <span className="text-slate-500">
                                    Page {page.toLocaleString()} of {totalPages.toLocaleString()}
                                </span>
                                {page < totalPages ? (
                                    <Link rel="next" href={pageHref(page + 1)} className="font-semibold text-teal-600 hover:underline">
                                        Older →
                                    </Link>
                                ) : (
                                    <span aria-hidden className="text-slate-300">Older →</span>
                                )}
                            </div>
                            <ol className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-sm">
                                {pageWindow(page, totalPages).map((p, i) =>
                                    p === 'gap' ? (
                                        <li key={`gap-${i}`} aria-hidden className="px-1 text-slate-400">
                                            …
                                        </li>
                                    ) : (
                                        <li key={p}>
                                            {p === page ? (
                                                <span
                                                    aria-current="page"
                                                    className="inline-block min-w-9 rounded-lg bg-teal-600 px-2.5 py-1.5 text-center font-semibold text-white"
                                                >
                                                    {p}
                                                </span>
                                            ) : (
                                                <Link
                                                    href={pageHref(p)}
                                                    className="inline-block min-w-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-center font-medium text-slate-600 hover:border-teal-300 hover:text-teal-600"
                                                >
                                                    {p}
                                                </Link>
                                            )}
                                        </li>
                                    )
                                )}
                            </ol>
                        </nav>
                    )}
                </>
            )}
        </PublicPageShell>
    );
}
