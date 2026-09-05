import type { Metadata } from 'next';
import { renderCategoriesIndex, categoriesMetadata } from './renderCategoriesIndex';

/** English category comparison. Arabic twin: /ar/Funds/categories. */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
    return categoriesMetadata('en');
}

export default async function FundCategoriesPage() {
    return renderCategoriesIndex('en');
}
