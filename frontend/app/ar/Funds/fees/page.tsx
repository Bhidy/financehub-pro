import type { Metadata } from 'next';
import { renderFundFees, fundFeesMetadata } from '@/app/Funds/fees/renderFundFees';

/** Arabic fund fee comparison — the hreflang twin of /Funds/fees. */
export const revalidate = 900;

export async function generateMetadata(): Promise<Metadata> {
    return fundFeesMetadata('ar');
}

export default async function ArabicFundFeesPage() {
    return renderFundFees('ar');
}
