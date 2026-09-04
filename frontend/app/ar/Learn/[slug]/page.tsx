import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { SITE_URL, arabicSlug, assertUniqueSlugs, canonicalRedirectTarget, learnPath, DEFAULT_OG_IMAGE} from '@/lib/seo';
import LearnTopicArticle, { learnTopics } from '@/components/seo/LearnTopicArticle';

/**
 * Arabic Learn academy article. Canonical URL carries the ARABIC-title slug:
 * /ar/Learn/{arabic-slug}. The legacy English slug still resolves (the topic's
 * stable catalogue key) and 308s to the Arabic canonical, so indexed URLs
 * never 404. Fully static: content comes from data/learn-topics.json only.
 * Uses the SAME hreflang languages map as the English page (reciprocal pair).
 */

type Props = { params: Promise<{ slug: string }> };

/** Resolve a route param (arrives percent-encoded) by AR slug or EN slug. */
function findTopic(slugParam: string) {
    let decoded = slugParam;
    try {
        decoded = decodeURIComponent(slugParam);
    } catch {
        // malformed escapes: compare raw
    }
    return learnTopics.find((t) => t.slug === decoded || arabicSlug(t.ar.title) === decoded);
}

export function generateStaticParams() {
    // Build gate: an EN/AR slug collision would point one URL at two documents
    // (or an alias at the wrong one) — fail the build, never ship it.
    assertUniqueSlugs(
        'learn topics (EN ∪ AR)',
        learnTopics.flatMap((t) => [...new Set([t.slug, arabicSlug(t.ar.title) || t.slug])])
    );
    // Prerender the Arabic canonicals; legacy EN slugs render on demand → 308.
    return learnTopics.map((topic) => ({ slug: arabicSlug(topic.ar.title) || topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const topic = findTopic(slug);
    if (!topic) return {};
    const arPath = learnPath(topic.slug, topic.ar.title, 'ar');
    const enPath = learnPath(topic.slug, null, 'en');
    return {
        title: topic.ar.title,
        description: topic.ar.summary,
        alternates: {
            canonical: encodeURI(arPath),
            languages: {
                en: enPath,
                ar: encodeURI(arPath),
                'x-default': encodeURI(arPath),
            },
        },
        openGraph: {
            type: 'article',
            title: topic.ar.title,
            description: topic.ar.summary,
            url: encodeURI(arPath),
            locale: 'ar_EG',
            images: [{ url: topic.coverImageAr ? SITE_URL + topic.coverImageAr : DEFAULT_OG_IMAGE }],
        },
        twitter: {
            card: 'summary_large_image',
            title: topic.ar.title,
            description: topic.ar.summary,
        },
    };
}

export default async function LearnTopicArabicPage({ params }: Props) {
    const { slug } = await params;
    const topic = findTopic(slug);
    if (!topic) notFound();
    // 308 legacy/stale slugs (e.g. the old English slug) to the Arabic canonical.
    const redirectTarget = canonicalRedirectTarget(`/ar/Learn/${slug}`, learnPath(topic.slug, topic.ar.title, 'ar'));
    if (redirectTarget) permanentRedirect(redirectTarget);
    return <LearnTopicArticle topic={topic} lang="ar" />;
}
