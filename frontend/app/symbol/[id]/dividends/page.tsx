import type { Metadata } from 'next';
import { renderDividends, dividendsMetadata } from './renderDividends';

/** English dividends page. Arabic twin: /ar/symbol/{SYM}-{slug}/dividends. */
export const revalidate = 900;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return dividendsMetadata(id, 'en');
}

export default async function DividendsPage({ params }: Props) {
    const { id } = await params;
    return renderDividends(id, 'en');
}
