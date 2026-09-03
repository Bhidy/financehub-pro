import { renderProviderHub } from '@/app/Funds/provider/renderProviderHub';

/** Arabic provider hub — the same premium marketplace, in Arabic. */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return renderProviderHub(slug, 'ar');
}
