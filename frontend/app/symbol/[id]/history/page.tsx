import type { Metadata } from 'next';
import { renderHistory, historyMetadata } from './renderHistory';

/** English history page. Arabic twin: /ar/symbol/{SYM}-{slug}/history. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return historyMetadata(id, 'en');
}

export default async function HistoryPage({ params }: Props) {
    const { id } = await params;
    return renderHistory(id, 'en');
}
