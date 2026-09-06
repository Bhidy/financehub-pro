import type { Metadata } from 'next';
import { renderMarketsHub, marketsHubMetadata } from '@/app/markets/renderMarketsHub';

/** /ar/markets — the Arabic twin. It was the one /ar path the React link
 *  localizer could mint (prefix matching on /markets) and it answered 404. */
export const revalidate = 300;
export const metadata: Metadata = marketsHubMetadata('ar');
export default async function ArMarketsHubPage() {
    return renderMarketsHub('ar');
}
