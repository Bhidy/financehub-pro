import { renderNewsFront } from './renderNewsHubs';

/**
 * /News — the designed news hub with its lead story and article grid rendered
 * server-side. Before this it was 152 words with ZERO structured data and NOT
 * ONE link to an article: the whole 4,583-URL archive had no crawlable path
 * from its own hub.
 *
 * Shares renderNewsHubs with the Arabic hub and every topic archive, so the
 * markup, the schema and the escaping cannot drift between them.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    return renderNewsFront('en');
}
