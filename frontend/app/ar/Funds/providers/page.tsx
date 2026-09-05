import type { Metadata } from 'next';
import { renderProvidersIndex, providersMetadata } from '@/app/Funds/providers/renderProvidersIndex';

/** Arabic provider league table — the hreflang twin of /Funds/providers. */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
    return providersMetadata('ar');
}

export default async function ArabicFundProvidersPage() {
    return renderProvidersIndex('ar');
}
