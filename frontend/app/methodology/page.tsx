import type { Metadata } from 'next';
import { renderMethodology, methodologyMetadata } from './renderMethodology';

/** English methodology page. Arabic twin: /ar/methodology. */
export const metadata: Metadata = methodologyMetadata('en');

export default function MethodologyPage() {
    return renderMethodology('en');
}
