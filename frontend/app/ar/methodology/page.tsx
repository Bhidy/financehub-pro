import type { Metadata } from 'next';
import { renderMethodology, methodologyMetadata } from '@/app/methodology/renderMethodology';

/** Arabic methodology page — the hreflang twin of /methodology. */
export const metadata: Metadata = methodologyMetadata('ar');

export default function ArabicMethodologyPage() {
    return renderMethodology('ar');
}
