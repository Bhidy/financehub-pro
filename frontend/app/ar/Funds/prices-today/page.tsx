import type { Metadata } from 'next';
import { renderPricesToday, pricesTodayMetadata } from '@/app/Funds/prices-today/renderPricesToday';

/** Arabic fund price list — the hreflang twin of /Funds/prices-today. */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    return pricesTodayMetadata('ar');
}

export default async function ArabicPricesTodayPage() {
    return renderPricesToday('ar');
}
