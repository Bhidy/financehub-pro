import { renderCompareHub } from '@/lib/compare-hub';

/**
 * /ar/Funds/Compare — did not exist. On a site whose default language is
 * Arabic, "مقارنة صناديق الاستثمار" had no destination in its own tree, the
 * same gap that left /ar/Learn and /ar/Market-Pulse without a URL.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    return renderCompareHub('ar');
}
