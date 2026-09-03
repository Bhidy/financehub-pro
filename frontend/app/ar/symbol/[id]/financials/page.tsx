import type { Metadata } from 'next';
import { renderFinancials, financialsMetadata } from '@/app/symbol/[id]/financials/renderFinancials';

/** Arabic financials page — the hreflang twin of /symbol/{SYM}/financials. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return financialsMetadata(id, 'ar');
}

export default async function ArabicFinancialsPage({ params }: Props) {
    const { id } = await params;
    return renderFinancials(id, 'ar');
}
