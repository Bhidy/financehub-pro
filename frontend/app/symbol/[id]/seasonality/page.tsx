import type { Metadata } from 'next';
import { renderSeasonality, seasonalityMetadata } from './renderSeasonality';

/** English seasonality page. Arabic twin: /ar/symbol/{SYM}-{slug}/seasonality. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return seasonalityMetadata(id, 'en');
}

export default async function SeasonalityPage({ params }: Props) {
    const { id } = await params;
    return renderSeasonality(id, 'en');
}
