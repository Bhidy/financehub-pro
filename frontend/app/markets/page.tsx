import type { Metadata } from 'next';
import { renderMarketsHub, marketsHubMetadata } from '@/app/markets/renderMarketsHub';

/** /markets — the English market-data hub. Both /markets and /ar/markets 404'd
 *  while twelve market pages sat in the sitemap with no parent. */
export const revalidate = 300;
export const metadata: Metadata = marketsHubMetadata('en');
export default async function MarketsHubPage() {
    return renderMarketsHub('en');
}
