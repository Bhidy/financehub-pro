import type { Metadata } from 'next';
import { renderFundCategory, fundCategoryMetadata } from '@/app/Funds/category/renderFundCategory';

/**
 * Arabic fund category page at /ar/Funds/category/{arabic-slug} (RTL) — the
 * hreflang twin of /Funds/category/{key}. An English slug requested here still
 * resolves and 308s to the Arabic canonical, so no indexed URL can break.
 */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    return fundCategoryMetadata(slug, 'ar');
}

export default async function ArabicFundCategoryPage({ params }: Props) {
    const { slug } = await params;
    return renderFundCategory(slug, 'ar');
}
