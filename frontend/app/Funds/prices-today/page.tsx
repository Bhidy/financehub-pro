import type { Metadata } from 'next';
import { renderPricesToday, pricesTodayMetadata } from './renderPricesToday';

/** English fund price list. Arabic twin: /ar/Funds/أسعار-وثائق-صناديق-الاستثمار-اليوم */
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    return pricesTodayMetadata('en');
}

export default async function PricesTodayPage() {
    return renderPricesToday('en');
}
