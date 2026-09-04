import { renderCompareHub } from '@/lib/compare-hub';

/**
 * /Funds/Compare — was a static rewrite to /fund-compare.html, which made it
 * the only fund surface with no server render: zero structured data and no
 * crawl path into the /Funds/vs/{pair} cluster. See lib/compare-hub.ts.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    return renderCompareHub('en');
}
