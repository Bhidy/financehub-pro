import type { Metadata } from 'next';
import { renderFundPage, fundMetadata } from './renderFundPage';

/**
 * English fund profile at /Funds/{fund_id}-{slug} (LTR). Bare /Funds/{fund_id}
 * or a stale slug 308s to the slugged canonical; unknown ids are 404s.
 * The Arabic twin lives at /ar/Funds/{fund_id}-{slug}. All rendering + SEO
 * logic is shared in ./renderFundPage.
 */
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return fundMetadata(id, 'en');
}

export default async function FundPage({ params }: Props) {
    const { id } = await params;
    return renderFundPage(id, 'en');
}
