import type { Metadata } from 'next';
import { renderNavHistory, navHistoryMetadata } from '@/app/Funds/[id]/nav-history/renderNavHistory';

/** ar fund NAV history page. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return navHistoryMetadata(id, 'ar');
}

export default async function ArabicNavHistoryPage({ params }: Props) {
    const { id } = await params;
    return renderNavHistory(id, 'ar');
}
