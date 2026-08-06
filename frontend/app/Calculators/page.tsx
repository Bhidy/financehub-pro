import type { Metadata } from 'next';
import { renderCalculatorsPage, calculatorsMetadata } from './renderCalculatorsPage';

/**
 * English Wealth Calculators at /Calculators (LTR). The Arabic twin lives at
 * /ar/Calculators. All rendering + SEO logic is shared in
 * ./renderCalculatorsPage.
 */

export const metadata: Metadata = calculatorsMetadata('en');

export default function CalculatorsPage() {
    return renderCalculatorsPage('en');
}
