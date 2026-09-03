import type { Metadata } from 'next';
import { renderTechnicals, technicalsMetadata } from '@/app/symbol/[id]/technicals/renderTechnicals';

/** Arabic technical-analysis page — the hreflang twin of /symbol/{SYM}/technicals. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return technicalsMetadata(id, 'ar');
}

export default async function ArabicTechnicalsPage({ params }: Props) {
    const { id } = await params;
    return renderTechnicals(id, 'ar');
}
