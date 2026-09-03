import type { Metadata } from 'next';
import { renderStatistics, statisticsMetadata } from '@/app/symbol/[id]/statistics/renderStatistics';

/** Arabic key-statistics page — the hreflang twin of /symbol/{SYM}/statistics. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return statisticsMetadata(id, 'ar');
}

export default async function ArabicStatisticsPage({ params }: Props) {
    const { id } = await params;
    return renderStatistics(id, 'ar');
}
