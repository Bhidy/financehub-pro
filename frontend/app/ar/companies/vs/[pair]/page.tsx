import type { Metadata } from 'next';
import { renderStockVs, stockVsMetadata } from '@/app/companies/vs/[pair]/renderStockVs';

/** Arabic stock comparison — the hreflang twin of /companies/vs/{pair}. */
export const revalidate = 900;

type Props = { params: Promise<{ pair: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { pair } = await params;
    return stockVsMetadata(pair, 'ar');
}

export default async function ArabicStockVsPage({ params }: Props) {
    const { pair } = await params;
    return renderStockVs(pair, 'ar');
}
