import type { Metadata } from 'next';
import { renderFundPage, fundMetadata } from '@/app/Funds/[id]/renderFundPage';

/**
 * Arabic fund profile at /ar/Funds/{fund_id}-{slug} (RTL) — the hreflang twin
 * of the English /Funds/{fund_id}-{slug}. Shares all rendering + SEO logic;
 * content is shown fully in Arabic.
 */
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return fundMetadata(id, 'ar');
}

export default async function ArabicFundPage({ params }: Props) {
    const { id } = await params;
    return renderFundPage(id, 'ar');
}
