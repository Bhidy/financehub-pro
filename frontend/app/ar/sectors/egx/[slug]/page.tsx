import type { Metadata } from 'next';
import { renderEgxSector, egxSectorMetadata } from '@/app/sectors/egx/renderEgxSector';

/** Arabic official-EGX-sector hub (canonical slug is the Arabic sector name; a Latin slug 308s to it). */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    return egxSectorMetadata(slug, 'ar');
}

export default async function EgxSectorPageAr({ params }: Props) {
    const { slug } = await params;
    return renderEgxSector(slug, 'ar');
}
