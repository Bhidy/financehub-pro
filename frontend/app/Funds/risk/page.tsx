import type { Metadata } from 'next';
import { renderFundRisk, fundRiskMetadata } from './renderFundRisk';

/** English risk league table. Arabic twin: /ar/Funds/risk. */
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
    return fundRiskMetadata('en');
}

export default async function FundRiskPage() {
    return renderFundRisk('en');
}
