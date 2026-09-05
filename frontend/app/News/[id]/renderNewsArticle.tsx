import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getNewsArticle, getLatestNews, type NewsArticle } from '@/lib/public-data';
import { sanitizeNewsText, newsLang, canonicalNewsPath } from '@/lib/news-display';
import { SITE_URL, newsPath, idFromParam, canonicalRedirectTarget, absUrl, symbolPath, symbolPathAr, type SiteLang } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import PreferredSource from '@/components/seo/PreferredSource';
import JsonLd from '@/components/seo/JsonLd';
import { newsCoverPath, newsCoverUrl } from '@/lib/news-cover';

/**
 * Server-rendered news article, in the tree that matches its OWN language:
 *   English article → /News/{id}-{slug}
 *   Arabic article  → /ar/News/{id}-{arabic-slug}
 *
 * The feed is genuinely bilingual (2,033 Arabic articles, 2,552 English) and
 * these are DIFFERENT articles, not translations — so the two trees are not
 * hreflang alternates and no article appears in both. Serving Arabic articles
 * from /News shipped Arabic text under <html lang="en">, because the document
 * language is derived from the URL. Requesting an article from the wrong tree
 * (or with a stale slug, or bare) 308s to its one canonical URL.
 * Replaces the shared client-side shell (news-article.html) that served
 * byte-identical HTML for every article id. Bare /News/{id} 308s to the
 * slugged canonical; unknown ids are real 404s.
 */

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

export async function newsArticleMetadata(idParam: string, _tree: SiteLang): Promise<Metadata> {
    const id = idFromParam(idParam);
    if (!id) return {};
    const article = await getNewsArticle(id);
    if (!article) return {};
    const headline = sanitizeNewsText(article.headline) || 'Egypt Market Update';
    const paragraphs = cleanBody(article);
    const description = (paragraphs.join(' ').slice(0, 155) || headline).trim();
    // encodeURI: Arabic slugs must be percent-encoded in link/meta URLs.
    const lang = newsLang(article);
    const arabic = lang === 'ar';
    // Canonical is ALWAYS the article's own-language URL, whichever tree was
    // requested — so the wrong-tree form never presents itself as canonical.
    const canonical = encodeURI(newsPath(article.id, headline, lang));
    return {
        title: headline,
        description,
        // types: RSS autodiscovery for the article's own language feed.
        alternates: { canonical, types: { 'application/rss+xml': arabic ? '/ar/feed.xml' : '/feed.xml' } },
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

export async function renderNewsArticle(idParam: string, tree: SiteLang) {
    const article = await resolveArticle(idParam);
    const headline = sanitizeNewsText(article.headline) || 'Egypt Market Update';
    const lang = newsLang(article);
    const canonicalPath = newsPath(article.id, headline, lang);

    // 308 any non-canonical form (bare id, stale/wrong slug) to the canonical.
    // Encoding-aware: route params arrive percent-encoded (Arabic slugs), and
    // the Location header must be encoded too — raw unicode there 500s.
    // Includes the WRONG-TREE case: /ar/News/{english-article} 308s to
    // /News/{...} and vice versa, so each article has exactly one live URL.
    const requestedPath = `${tree === 'ar' ? '/ar' : ''}/News/${idParam}`;
    const redirectTarget = canonicalRedirectTarget(requestedPath, canonicalPath);
    if (redirectTarget) {
        permanentRedirect(redirectTarget);
    }

    const arabic = lang === 'ar';
    const paragraphs = cleanBody(article);
    const published = new Date(article.published_at);
    const publishedIso = published.toISOString();
    const publishedHuman = published.toLocaleDateString(arabic ? 'ar-EG' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Africa/Cairo',
    });

    // Same-language only. The archive is bilingual and an article exists in
    // ONE language, so "latest" on an Arabic page must be Arabic: 24 Arabic
    // articles carried an English headline in this block (audit 2026-09-05).
    const latest = (await getLatestNews(30)).filter((n) => n.id !== article.id && newsLang(n) === lang).slice(0, 6);

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
                        { url: arabic ? '/ar' : '/', label: arabic ? 'الرئيسية' : 'Home' },
                        { url: arabic ? '/ar/News' : '/News', label: arabic ? 'أخبار السوق' : 'Market News' },
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
                            <Link href={encodeURI(arabic ? symbolPathAr(article.symbol.toUpperCase()) : symbolPath(article.symbol.toUpperCase()))} className="font-semibold text-starta-teal hover:underline">
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
                    height={338}
                    /* Half the previous height: 16/9 -> 32/9, cropped not squashed. */
                    className="mt-5 aspect-[32/9] w-full rounded-xl border border-border object-cover"
                />

                <div className="prose mt-6 max-w-none text-[1.05rem] leading-relaxed">
                    {paragraphs.map((p, i) => (
                        <p key={i} className="mb-4">{p}</p>
                    ))}
                </div>

                {/* Google's Preferred Sources button, at the end of the article
                    because that is where Google's guidance puts it — a reader
                    acting on a good experience. Deliberately not on the hubs or
                    the fund pages. */}
                <PreferredSource lang={arabic ? 'ar' : 'en'} />

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
                            href={arabic ? '/ar/News' : '/News'}
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
                                    href={encodeURI(canonicalNewsPath(n.id, n.headline, (n as { source_section?: string | null }).source_section))}
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
