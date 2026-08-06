import type { Metadata } from 'next';
import { renderCalculatorsPage, calculatorsMetadata } from '@/app/Calculators/renderCalculatorsPage';

/**
 * Arabic Wealth Calculators at /ar/Calculators (RTL) — the hreflang twin of
 * the English /Calculators. Shares all rendering + SEO logic; content is
 * shown fully in Arabic.
 */

export const metadata: Metadata = calculatorsMetadata('ar');

export default function ArabicCalculatorsPage() {
    return renderCalculatorsPage('ar');
}
