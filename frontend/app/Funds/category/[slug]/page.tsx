import type { Metadata } from 'next';
import { renderFundCategory, fundCategoryMetadata } from '../renderFundCategory';

/**
 * English fund category page at /Funds/category/{key}. The Arabic twin lives
 * at /ar/Funds/category/{arabic-slug}. All rendering + SEO logic is shared in
 * ../renderFundCategory.
 */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    return fundCategoryMetadata(slug, 'en');
}

export default async function FundCategoryPage({ params }: Props) {
    const { slug } = await params;
    return renderFundCategory(slug, 'en');
}
