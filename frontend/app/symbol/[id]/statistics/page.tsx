import type { Metadata } from 'next';
import { renderStatistics, statisticsMetadata } from './renderStatistics';

/** English key-statistics page. Arabic twin: /ar/symbol/{SYM}-{slug}/statistics. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return statisticsMetadata(id, 'en');
}

export default async function StatisticsPage({ params }: Props) {
    const { id } = await params;
    return renderStatistics(id, 'en');
}
