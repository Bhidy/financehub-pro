import { renderCategoryHub } from '@/app/Funds/category/renderCategoryHub';

/** Arabic fund category hub — the same premium marketplace, in Arabic. */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return renderCategoryHub(slug, 'ar');
}
