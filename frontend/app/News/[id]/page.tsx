import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getNewsArticle, getLatestNews, type NewsArticle } from '@/lib/public-data';
import { sanitizeNewsText } from '@/lib/news-display';
import { SITE_URL, newsPath, idFromParam, canonicalRedirectTarget, absUrl } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

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
        openGraph: {
            type: 'article',
            title: headline,
            description,
            url: canonical,
            publishedTime: new Date(article.published_at).toISOString(),
            locale: arabic ? 'ar_EG' : 'en_US',
            ...(article.image_url ? { images: [{ url: article.image_url }] } : {}),
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
        ...(article.image_url ? { image: [article.image_url] } : {}),
        // Inline node (not an @id reference): Google resolves JSON-LD per page,
        // and the #organization node only exists on the homepage.
        publisher: {
            '@type': 'Organization',
            name: 'Starta Markets',
            url: SITE_URL,
            logo: { '@type': 'ImageObject', url: `${SITE_URL}/app-icon.png` },
        },
        author: { '@type': 'Organization', name: 'Starta Markets Newsroom', url: SITE_URL },
        ...(paragraphs.length ? { articleBody: paragraphs.join('\n\n').slice(0, 5000) } : {}),
        ...(article.symbol
            ? { about: { '@type': 'Corporation', name: article.symbol, tickerSymbol: article.symbol } }
            : {}),
    };

    return (
        <PublicPageShell lang={arabic ? 'ar' : 'en'}>
            <JsonLd data={newsJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    [{ url: '/', label: 'Home' }, { url: '/News', label: 'Market News' }, { label: headline }],
                    SITE_URL
                )}
            />
            <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/News', label: 'Market News' }, { label: headline }]} />

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

                {article.image_url && (
                    // External news images come from many hosts; plain <img> with
                    // explicit dimensions avoids next/image remotePatterns failures.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={article.image_url}
                        alt={headline}
                        width={1200}
                        height={675}
                        className="mt-5 h-auto w-full rounded-xl border border-border object-cover"
                        referrerPolicy="no-referrer"
                    />
                )}

                <div className="prose mt-6 max-w-none text-[1.05rem] leading-relaxed">
                    {paragraphs.map((p, i) => (
                        <p key={i} className="mb-4">{p}</p>
                    ))}
                </div>

                {article.url && (
                    <p className="mt-6 text-sm text-muted">
                        {arabic ? 'المصدر الأصلي: ' : 'Original source: '}
                        <a href={article.url} rel="nofollow noopener" target="_blank" className="text-starta-teal hover:underline">
                            {(() => {
                                try {
                                    return new URL(article.url).hostname;
                                } catch {
                                    return 'link';
                                }
                            })()}
                        </a>
                    </p>
                )}
            </article>

            {latest.length > 0 && (
                <section className="mt-10 border-t border-border pt-6" dir="ltr">
                    <h2 className="text-lg font-bold text-main">More Egyptian market news</h2>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {latest.map((n) => {
                            const h = sanitizeNewsText(n.headline) || 'Egypt Market Update';
                            return (
                                <li key={n.id}>
                                    <Link href={newsPath(n.id, h)} className="text-sm font-medium text-main hover:text-starta-teal">
                                        {h}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                    <p className="mt-4 text-sm">
                        <Link href="/News" className="font-semibold text-starta-teal hover:underline">
                            All market news →
                        </Link>
                    </p>
                </section>
            )}
        </PublicPageShell>
    );
}
