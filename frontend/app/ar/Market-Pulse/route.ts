import { renderMarketPulse } from '@/app/Market-Pulse/route';

/**
 * /ar/Market-Pulse — the Arabic market page, which returned a hard 404 while
 * the site's default language is Arabic. Serves the same designed
 * market-pulse.html in Arabic, with the localized title/description/canonical
 * and the reciprocal hreflang pair its English twin now declares.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    return renderMarketPulse('ar');
}
