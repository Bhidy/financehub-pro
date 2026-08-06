import type { Metadata } from 'next';
import { renderRiskPage, riskMetadata } from './renderRiskPage';

/**
 * English Investment Risk Assessment at /RiskAssessment (LTR).
 * The Arabic twin lives at /ar/RiskAssessment. All rendering + SEO logic is
 * shared in ./renderRiskPage; scoring in ./risk-engine; copy in ./risk-i18n.
 */
export const metadata: Metadata = riskMetadata('en');

export default function RiskAssessmentPage() {
    return renderRiskPage('en');
}
