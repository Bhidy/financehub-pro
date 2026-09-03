import type { Metadata } from 'next';
import { renderTechnicals, technicalsMetadata } from './renderTechnicals';

/** English technical-analysis page. Arabic twin: /ar/symbol/{SYM}-{slug}/technicals. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return technicalsMetadata(id, 'en');
}

export default async function TechnicalsPage({ params }: Props) {
    const { id } = await params;
    return renderTechnicals(id, 'en');
}
