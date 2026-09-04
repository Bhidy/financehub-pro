import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL, learnPath, DEFAULT_OG_IMAGE} from '@/lib/seo';
import LearnTopicArticle, { learnTopics } from '@/components/seo/LearnTopicArticle';

/**
 * English Learn academy article at /Learn/{slug}. Fully static: content comes
 * from data/learn-topics.json only (no db). Reciprocal hreflang pairs each
 * topic with its Arabic twin at /ar/Learn/{slug}.
 */

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
    return learnTopics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const topic = learnTopics.find((t) => t.slug === slug);
    if (!topic) return {};
    return {
        title: topic.en.title,
        description: topic.en.summary,
        alternates: {
            canonical: `/Learn/${slug}`,
            languages: {
                en: `/Learn/${slug}`,
                // AR canonical carries the Arabic-title slug; x-default = Arabic
                // (the site's default language).
                ar: encodeURI(learnPath(topic.slug, topic.ar.title, 'ar')),
                'x-default': encodeURI(learnPath(topic.slug, topic.ar.title, 'ar')),
            },
        },
        openGraph: {
            type: 'article',
            title: topic.en.title,
            description: topic.en.summary,
            url: `/Learn/${slug}`,
            locale: 'en_US',
            images: [{ url: topic.coverImageEn ? SITE_URL + topic.coverImageEn : DEFAULT_OG_IMAGE }],
        },
        twitter: {
            card: 'summary_large_image',
            title: topic.en.title,
            description: topic.en.summary,
        },
    };
}

export default async function LearnTopicPage({ params }: Props) {
    const { slug } = await params;
    const topic = learnTopics.find((t) => t.slug === slug);
    if (!topic) notFound();
    return <LearnTopicArticle topic={topic} lang="en" />;
}
