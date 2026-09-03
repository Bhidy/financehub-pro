import type { Metadata } from 'next';
import { renderDividends, dividendsMetadata } from '@/app/symbol/[id]/dividends/renderDividends';

/** Arabic dividends page — the hreflang twin of /symbol/{SYM}/dividends. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return dividendsMetadata(id, 'ar');
}

export default async function ArabicDividendsPage({ params }: Props) {
    const { id } = await params;
    return renderDividends(id, 'ar');
}
