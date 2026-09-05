import type { Metadata } from 'next';
import { renderFundRisk, fundRiskMetadata } from '@/app/Funds/risk/renderFundRisk';

/** Arabic risk league table — the hreflang twin of /Funds/risk. */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
    return fundRiskMetadata('ar');
}

export default async function ArabicFundRiskPage() {
    return renderFundRisk('ar');
}
