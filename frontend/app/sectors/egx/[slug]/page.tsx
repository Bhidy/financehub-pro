import type { Metadata } from 'next';
import { renderEgxSector, egxSectorMetadata } from '../renderEgxSector';

/** English official-EGX-sector hub. Arabic twin: /ar/sectors/egx/{arabic-slug}. */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    return egxSectorMetadata(slug, 'en');
}

export default async function EgxSectorPage({ params }: Props) {
    const { slug } = await params;
    return renderEgxSector(slug, 'en');
}
