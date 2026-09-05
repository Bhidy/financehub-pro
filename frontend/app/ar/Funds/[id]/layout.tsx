import type { Metadata } from 'next';
import { getFund } from '@/lib/public-data';
import { idFromParam } from '@/lib/seo';

/**
 * Arabic twin of app/Funds/[id]/layout.tsx — the 404 title for an unknown fund
 * on an Arabic URL is Arabic (a `notFound()` thrown by the page drops the page's
 * metadata; a layout's survives into Next's 404 error document).
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const fundId = idFromParam(id || '');
    const fund = fundId ? await getFund(fundId).catch(() => null) : null;
    if (fund) return {};
    return { title: { absolute: 'الصندوق غير موجود | ستارتا ماركتس' }, robots: { index: false, follow: true } };
}

export default function ArFundSegmentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
