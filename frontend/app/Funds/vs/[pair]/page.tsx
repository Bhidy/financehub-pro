import type { Metadata } from 'next';
import { renderFundVs, fundVsMetadata } from '../renderFundVs';

/** English fund-vs-fund comparison. Arabic twin: /ar/Funds/vs/{pair}. */
export const revalidate = 900;

type Props = { params: Promise<{ pair: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { pair } = await params;
    return fundVsMetadata(pair, 'en');
}

export default async function FundVsPage({ params }: Props) {
    const { pair } = await params;
    return renderFundVs(pair, 'en');
}
