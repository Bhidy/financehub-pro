import type { Metadata } from 'next';
import { renderCategoriesIndex, categoriesMetadata } from '@/app/Funds/categories/renderCategoriesIndex';

/** Arabic category comparison — the hreflang twin of /Funds/categories. */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
    return categoriesMetadata('ar');
}

export default async function ArabicFundCategoriesPage() {
    return renderCategoriesIndex('ar');
}
