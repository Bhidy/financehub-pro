import { renderNewsTopic } from '@/app/News/renderNewsHubs';

/** Arabic news topic archive — the hreflang twin of /News/category/{slug}. */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return renderNewsTopic(slug, 'ar');
}
