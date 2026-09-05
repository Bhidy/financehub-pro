import type { Metadata } from 'next';
import { getTicker, getTickerAny } from '@/lib/public-data';
import { symbolFromArParam } from '@/lib/seo';

/**
 * Segment layout whose only job is the 404 title on the Arabic company tree.
 * A `notFound()` thrown by a page (a symbol neither the listing master nor the
 * vendor knows — 7010 STC, 2222 Aramco) makes Next answer 404 with its minimal
 * error document; the page's metadata is dropped with the page, a layout's
 * survives. Until this file existed every Arabic company 404 carried the root
 * layout's English title. For a listed or status-page symbol the layout
 * returns nothing and the page's own metadata applies. Both lookups are
 * request-cached, so this costs no extra query.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const symbol = symbolFromArParam(id || '');
    if (!symbol) return { title: { absolute: 'الشركة غير موجودة | ستارتا ماركتس' }, robots: { index: false, follow: true } };
    try {
        const ticker = await getTicker(symbol);
        if (ticker) return {};
        const any = await getTickerAny(symbol);
        if (any) return {};
    } catch {
        return {}; // DB unreachable is not "unknown symbol": leave the page's degraded metadata in charge
    }
    return { title: { absolute: 'الشركة غير موجودة | ستارتا ماركتس' }, robots: { index: false, follow: true } };
}

export default function ArSymbolSegmentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
