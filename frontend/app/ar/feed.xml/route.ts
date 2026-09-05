import { renderNewsFeed } from '@/lib/news-feed';

/**
 * /ar/feed.xml — RSS 2.0 of the latest ARABIC EGX market news. Did not exist:
 * the Arabic tree, the site's default language, had no syndication path.
 * Twin of /feed.xml; both are rendered by lib/news-feed.ts.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    return renderNewsFeed('ar');
}
