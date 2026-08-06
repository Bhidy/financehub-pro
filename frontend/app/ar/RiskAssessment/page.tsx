import type { Metadata } from 'next';
import { renderRiskPage, riskMetadata } from '@/app/RiskAssessment/renderRiskPage';

/**
 * Arabic Investment Risk Assessment at /ar/RiskAssessment (RTL) — the
 * hreflang twin of the English /RiskAssessment. Shares all rendering + SEO
 * logic; content is shown fully in Arabic.
 */
export const metadata: Metadata = riskMetadata('ar');

export default function ArabicRiskAssessmentPage() {
    return renderRiskPage('ar');
}
