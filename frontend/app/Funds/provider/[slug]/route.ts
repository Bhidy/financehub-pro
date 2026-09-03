import { renderProviderHub } from '../renderProviderHub';

/** English provider hub — the premium marketplace, filtered to one institution. */
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return renderProviderHub(slug, 'en');
}
