import { renderCategoryHub } from '../renderCategoryHub';

/** English fund category hub — the premium marketplace, pre-filtered. */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return renderCategoryHub(slug, 'en');
}
