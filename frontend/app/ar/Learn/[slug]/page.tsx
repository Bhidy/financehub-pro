import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SITE_URL } from '@/lib/seo';
import LearnTopicArticle, { learnTopics } from '@/components/seo/LearnTopicArticle';

/**
 * Arabic Learn academy article at /ar/Learn/{slug}. Fully static: content
 * comes from data/learn-topics.json only (no db). Uses the SAME hreflang
 * languages map as the English page so the pair is reciprocal.
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
        title: topic.ar.title,
        description: topic.ar.summary,
        alternates: {
            canonical: `/ar/Learn/${slug}`,
            languages: {
                en: `/Learn/${slug}`,
                ar: `/ar/Learn/${slug}`,
                'x-default': `/Learn/${slug}`,
            },
        },
        openGraph: {
            type: 'article',
            title: topic.ar.title,
            description: topic.ar.summary,
            url: `/ar/Learn/${slug}`,
            locale: 'ar_EG',
            images: [{ url: SITE_URL + topic.coverImageAr }],
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
    const topic = learnTopics.find((t) => t.slug === slug);
    if (!topic) notFound();
    return <LearnTopicArticle topic={topic} lang="ar" />;
}
