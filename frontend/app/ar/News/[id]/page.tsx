/**
 * @ar-not-a-twin
 *
 * This route is NOT a language twin of /News/[id] and must never appear in the
 * /ar link-prefix patterns. The two trees hold DIFFERENT articles: an article
 * exists in one language only, and its own language decides its tree. If the
 * helper prefixed news links, /News/{english-article} would be rewritten to
 * /ar/News/{...} and immediately 308 back — a pointless bounce on every
 * English article an Arabic reader clicks. Links are built by
 * canonicalNewsPath(), which already targets the right tree.
 */
import type { Metadata } from 'next';
import { renderNewsArticle, newsArticleMetadata } from '@/app/News/[id]/renderNewsArticle';

/**
 * Arabic news tree — the home of the 2,033 Arabic articles, which until now
 * had no Arabic URL at all and were served from /News under <html lang="en">.
 * An ENGLISH article requested here 308s to its /News/{id}-{slug} canonical.
 */
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return newsArticleMetadata(id, 'ar');
}

export default async function ArabicNewsArticlePage({ params }: Props) {
    const { id } = await params;
    return renderNewsArticle(id, 'ar');
}
