import type { Metadata } from 'next';
import { renderFinancials, financialsMetadata } from './renderFinancials';

/** English financials page. Arabic twin: /ar/symbol/{SYM}-{slug}/financials. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return financialsMetadata(id, 'en');
}

export default async function FinancialsPage({ params }: Props) {
    const { id } = await params;
    return renderFinancials(id, 'en');
}
