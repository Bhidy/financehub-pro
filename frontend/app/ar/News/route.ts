import { renderNewsFront } from '@/app/News/renderNewsHubs';

/**
 * /ar/News — the ARABIC news hub, which simply did not exist: the URL returned
 * 404 while roughly 76% of the archive is Arabic. Serves the same designed
 * news page, in Arabic, filtered to Arabic headlines.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
    return renderNewsFront('ar');
}
