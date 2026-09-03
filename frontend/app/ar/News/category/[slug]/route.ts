import { renderNewsTopic } from '@/app/News/renderNewsHubs';

/** Arabic news topic archive — the hreflang twin of /News/category/{slug}. */
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const page = Number(new URL(req.url).searchParams.get('page')) || 1;
    return renderNewsTopic(slug, 'ar', page);
}
