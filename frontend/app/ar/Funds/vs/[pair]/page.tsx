import type { Metadata } from 'next';
import { renderFundVs, fundVsMetadata } from '@/app/Funds/vs/renderFundVs';

/** Arabic fund-vs-fund comparison — the hreflang twin of /Funds/vs/{pair}. */
export const revalidate = 900;

type Props = { params: Promise<{ pair: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { pair } = await params;
    return fundVsMetadata(pair, 'ar');
}

export default async function ArabicFundVsPage({ params }: Props) {
    const { pair } = await params;
    return renderFundVs(pair, 'ar');
}
