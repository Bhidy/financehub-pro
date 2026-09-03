import type { Metadata } from 'next';
import { renderSeasonality, seasonalityMetadata } from '@/app/symbol/[id]/seasonality/renderSeasonality';

/** Arabic seasonality page — the hreflang twin of /symbol/{SYM}/seasonality. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return seasonalityMetadata(id, 'ar');
}

export default async function ArabicSeasonalityPage({ params }: Props) {
    const { id } = await params;
    return renderSeasonality(id, 'ar');
}
