import type { Metadata } from 'next';
import { renderProvidersIndex, providersMetadata } from './renderProvidersIndex';

/** English provider league table. Arabic twin: /ar/Funds/providers. */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
    return providersMetadata('en');
}

export default async function FundProvidersPage() {
    return renderProvidersIndex('en');
}
