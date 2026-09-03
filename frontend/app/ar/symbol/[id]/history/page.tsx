import type { Metadata } from 'next';
import { renderHistory, historyMetadata } from '@/app/symbol/[id]/history/renderHistory';

/** Arabic history page — the hreflang twin of /symbol/{SYM}/history. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return historyMetadata(id, 'ar');
}

export default async function ArabicHistoryPage({ params }: Props) {
    const { id } = await params;
    return renderHistory(id, 'ar');
}
