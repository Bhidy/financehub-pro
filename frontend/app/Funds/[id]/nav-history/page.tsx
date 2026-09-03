import type { Metadata } from 'next';
import { renderNavHistory, navHistoryMetadata } from './renderNavHistory';

/** en fund NAV history page. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return navHistoryMetadata(id, 'en');
}

export default async function NavHistoryPage({ params }: Props) {
    const { id } = await params;
    return renderNavHistory(id, 'en');
}
