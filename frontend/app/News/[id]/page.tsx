import type { Metadata } from 'next';
import { renderNewsArticle, newsArticleMetadata } from './renderNewsArticle';

/**
 * English news tree. An ARABIC article requested here 308s to its
 * /ar/News/{id}-{slug} canonical — see renderNewsArticle.
 */
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return newsArticleMetadata(id, 'en');
}

export default async function NewsArticlePage({ params }: Props) {
    const { id } = await params;
    return renderNewsArticle(id, 'en');
}
