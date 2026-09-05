import { renderNewsFeed } from '@/lib/news-feed';

/**
 * /feed.xml — RSS 2.0 of the latest ENGLISH EGX market news. Prerequisite for
 * Google Publisher Center / Bing PubHub enrolment and for syndication. The
 * Arabic feed is /ar/feed.xml; both are rendered by lib/news-feed.ts.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    return renderNewsFeed('en');
}
