import type { Metadata } from 'next';
import { renderStockVs, stockVsMetadata } from './renderStockVs';

/** English stock comparison. Arabic twin: /ar/companies/vs/{pair}. */
export const revalidate = 900;

type Props = { params: Promise<{ pair: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { pair } = await params;
    return stockVsMetadata(pair, 'en');
}

export default async function StockVsPage({ params }: Props) {
    const { pair } = await params;
    return renderStockVs(pair, 'en');
}
