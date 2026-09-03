import type { Metadata } from 'next';
import { renderFundFees, fundFeesMetadata } from './renderFundFees';

/** English fund fee comparison. Arabic twin: /ar/Funds/fees. */
export const revalidate = 900;

export async function generateMetadata(): Promise<Metadata> {
    return fundFeesMetadata('en');
}

export default async function FundFeesPage() {
    return renderFundFees('en');
}
