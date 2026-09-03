import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

/**
 * Site-wide default Open Graph card.
 *
 * The file convention applies this to every route that does not define its
 * own, which is what closes the 29-template gap in one place: a page can now
 * declare `openGraph: { title, description, url }` without an `images` key and
 * still ship a branded thumbnail.
 */
export const alt = 'Starta Markets — Egyptian Exchange stocks, funds and market data';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OgImage() {
    return renderOgCard({
        eyebrow: 'EGX · EGYPTIAN EXCHANGE',
        title: 'Egyptian market data, funds and research',
        subtitle: 'Live EGX prices · 214 mutual funds · Arabic & English',
        footnote: 'startamarkets.com',
    });
}
