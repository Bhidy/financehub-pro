import { renderNewsTopic } from '@/app/News/renderNewsHubs';

/** English news topic archive. */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return renderNewsTopic(slug, 'en');
}
