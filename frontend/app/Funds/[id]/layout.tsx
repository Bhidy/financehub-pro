import type { Metadata } from 'next';
import { getFund } from '@/lib/public-data';
import { idFromParam } from '@/lib/seo';

/**
 * Segment layout whose ONLY job is the 404 title. When a fund page throws
 * `notFound()` (unknown id, or a fund the database does not hold), Next answers
 * 404 with its minimal error document and renders the not-found boundary on the
 * client; page-level metadata is dropped with the page, but a LAYOUT's metadata
 * survives into that document. Without this, every fund 404 carried the root
 * layout's generic title. For a real fund the layout returns nothing and the
 * page's own metadata applies unchanged. getFund is request-cached, so this
 * costs no extra query.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const fundId = idFromParam(id || '');
    const fund = fundId ? await getFund(fundId).catch(() => null) : null;
    if (fund) return {};
    return { title: { absolute: 'Fund not found | Starta Markets' }, robots: { index: false, follow: true } };
}

export default function FundSegmentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
