import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getNewsArticle, getLatestNews, type NewsArticle } from '@/lib/public-data';
import { sanitizeNewsText } from '@/lib/news-display';
import { SITE_URL, newsPath, idFromParam, canonicalRedirectTarget, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import { newsCoverPath, newsCoverUrl } from '@/lib/news-cover';

/**
 * Server-rendered news article at /News/{id}-{slug}.
 * Replaces the shared client-side shell (news-article.html) that served
 * byte-identical HTML for every article id. Bare /News/{id} 308s to the
 * slugged canonical; unknown ids are real 404s.
 */

type Props = { params: Promise<{ id: string }> };

function isArabic(article: NewsArticle): boolean {
    return (article.source_section || '').endsWith('/ar') || /[؀-ۿ]/.test(article.headline);
}

function cleanBody(article: NewsArticle): string[] {
    const body = sanitizeNewsText(article.article_body || '') || '';
    return body
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
}

async function resolveArticle(idParam: string) {
    const id = idFromParam(idParam);
    if (!id) notFound();
    const article = await getNewsArticle(id);
    if (!article) notFound();
    return article;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id: idParam } = await params;
    const id = idFromParam(idParam);
    if (!id) return {};
    const article = await getNewsArticle(id);
    if (!article) return {};
    const headline = sanitizeNewsText(article.headline) || 'Egypt Market Update';
    const paragraphs = cleanBody(article);
    const description = (paragraphs.join(' ').slice(0, 155) || headline).trim();
    // encodeURI: Arabic slugs must be percent-encoded in link/meta URLs.
    const canonical = encodeURI(newsPath(article.id, headline));
    const arabic = isArabic(article);
    return {
        title: headline,
        description,
        alternates: { canonical },
        // max-image-preview:large is required for Google Discover / Top Stories
        // large-thumbnail eligibility (2026-07-03 audit gap).
        robots: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
        openGraph: {
            type: 'article',
            title: headline,
            description,
            url: canonical,
            publishedTime: new Date(article.published_at).toISOString(),
            locale: arabic ? 'ar_EG' : 'en_US',
            images: [{ url: newsCoverUrl(SITE_URL, arabic ? 'ar' : 'en') }],
        },
        twitter: {
            card: 'summary_large_image',
            title: headline,
            description,
        },
    };
}

export default async function NewsArticlePage({ params }: Props) {
    const { id: idParam } = await params;
    const article = await resolveArticle(idParam);
    const headline = sanitizeNewsText(article.headline) || 'Egypt Market Update';
    const canonicalPath = newsPath(article.id, headline);

    // 308 any non-canonical form (bare id, stale/wrong slug) to the canonical.
    // Encoding-aware: route params arrive percent-encoded (Arabic slugs), and
    // the Location header must be encoded too — raw unicode there 500s.
    const redirectTarget = canonicalRedirectTarget(`/News/${idParam}`, canonicalPath);
    if (redirectTarget) {
        permanentRedirect(redirectTarget);
    }

    const arabic = isArabic(article);
    const paragraphs = cleanBody(article);
    const published = new Date(article.published_at);
    const publishedIso = published.toISOString();
    const publishedHuman = published.toLocaleDateString(arabic ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Africa/Cairo',
    });

    const latest = (await getLatestNews(7)).filter((n) => n.id !== article.id).slice(0, 6);

    const newsJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline,
        datePublished: publishedIso,
        dateModified: publishedIso,
        inLanguage: arabic ? 'ar' : 'en',
        mainEntityOfPage: { '@type': 'WebPage', '@id': absUrl(canonicalPath) },
        image: [newsCoverUrl(SITE_URL, arabic ? 'ar' : 'en')],
        // Inline node (not an @id reference): Google resolves JSON-LD per page,
        // and the #organization node only exists on the homepage.
        publisher: {
            '@type': 'Organization',
            name: 'Starta Markets',
            url: SITE_URL,
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/app-icon.png` },
            // E-E-A-T: point search/AI engines at the sourcing + corrections
            // policy so every article is one hop from provenance, and at the
            // verified LinkedIn entity so publisher/author reconcile to one org.
            sameAs: ['https://www.linkedin.com/company/starta-markets'],
            publishingPrinciples: `${SITE_URL}/editorial-policy`,
            correctionsPolicy: `${SITE_URL}/corrections`,
        },
        author: {
            '@type': 'Organization',
            name: 'Starta Markets Newsroom',
            url: SITE_URL,
            sameAs: ['https://www.linkedin.com/company/starta-markets'],
            publishingPrinciples: `${SITE_URL}/editorial-policy`,
            knowsAbout: ['Egyptian Exchange (EGX)', 'Egyptian stock market', 'mutual funds in Egypt', 'EGX-listed companies'],
        },
        ...(paragraphs.length ? { articleBody: paragraphs.join('\n\n').slice(0, 5000) } : {}),
        ...(article.symbol
            ? { about: { '@type': 'Corporation', name: article.symbol, tickerSymbol: article.symbol } }
            : {}),
    };

    return (
        <PublicPageShell lang={arabic ? 'ar' : 'en'} persistLang>
            <JsonLd data={newsJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [
                        { url: '/', label: arabic ? 'الرئيسية' : 'Home' },
                        { url: '/News', label: arabic ? 'أخبار السوق' : 'Market News' },
                        { label: headline },
                    ],
                    SITE_URL
                )}
            />
            <Breadcrumbs
                items={[
                    { href: '/', label: arabic ? 'الرئيسية' : 'Home' },
                    { href: '/News', label: arabic ? 'أخبار السوق' : 'Market News' },
                    { label: headline },
                ]}
            />

            <article lang={arabic ? 'ar' : 'en'}>
                <h1 className="text-2xl font-extrabold leading-snug text-main sm:text-3xl">{headline}</h1>
                <p className="mt-2 text-sm text-muted">
                    <time dateTime={publishedIso}>{publishedHuman}</time>
                    {' · '}
                    {arabic ? 'أخبار البورصة المصرية' : 'Egyptian market news'}
                    {article.symbol && (
                        <>
                            {' · '}
                            <Link href={`/symbol/${article.symbol.toUpperCase()}`} className="font-semibold text-starta-teal hover:underline">
                                {article.symbol.toUpperCase()}
                            </Link>
                        </>
                    )}
                </p>

                {/* Always the Starta branded cover — never article.image_url.
                    See lib/news-cover.ts for why. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={newsCoverPath(arabic ? 'ar' : 'en')}
                    alt=""
                    width={1200}
                    height={675}
                    className="mt-5 h-auto w-full rounded-xl border border-border object-cover"
                />

                <div className="prose mt-6 max-w-none text-[1.05rem] leading-relaxed">
                    {paragraphs.map((p, i) => (
                        <p key={i} className="mb-4">{p}</p>
                    ))}
                </div>

            </article>

            {latest.length > 0 && (
                /* dir follows the ARTICLE's language: this block was pinned to
                   ltr, which left Arabic readers with a left-aligned English
                   heading and a bare list of links. */
                <section className="mt-14 border-t border-border pt-8" dir={arabic ? 'rtl' : 'ltr'}>
                    <div className="flex items-end justify-between gap-4">
                        <h2 className="text-xl font-bold tracking-[-0.02em] text-main sm:text-2xl">
                            {arabic ? 'المزيد من أخبار السوق' : 'More Egyptian market news'}
                        </h2>
                        <Link
                            href="/News"
                            className="shrink-0 text-xs font-bold uppercase tracking-[0.18em] text-starta-teal hover:underline"
                        >
                            {arabic ? 'كل الأخبار' : 'All news'}
                        </Link>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {latest.map((n) => {
                            const h = sanitizeNewsText(n.headline)
                                || (arabic ? 'تحديث السوق المصري' : 'Egypt Market Update');
                            const when = n.published_at
                                ? new Date(n.published_at).toLocaleDateString(arabic ? 'ar-EG' : 'en-GB', {
                                      day: 'numeric', month: 'short', timeZone: 'Africa/Cairo',
                                  })
                                : null;
                            return (
                                <Link
                                    key={n.id}
                                    href={newsPath(n.id, h)}
                                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-starta-teal/40 hover:shadow-[0_18px_40px_rgba(16,24,40,0.10)]"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={newsCoverPath(arabic ? 'ar' : 'en')}
                                        alt=""
                                        width={640}
                                        height={360}
                                        loading="lazy"
                                        className="aspect-[16/9] w-full object-cover"
                                    />
                                    <div className="flex flex-1 flex-col gap-2 p-4">
                                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-starta-teal">
                                            {arabic ? 'أخبار السوق' : 'Market news'}
                                        </span>
                                        <h3 className="line-clamp-3 text-sm font-bold leading-snug text-main transition-colors group-hover:text-starta-teal">
                                            {h}
                                        </h3>
                                        {when && <span className="mt-auto pt-1 text-xs text-muted">{when}</span>}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}
        </PublicPageShell>
    );
}
