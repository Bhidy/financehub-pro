import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Market Analyst for EGX Stocks & Funds',
    description:
        'Ask Starta\'s AI analyst about any Egyptian Exchange stock or mutual fund — live prices, financials, dividends, technicals and news, answered in Arabic or English.',
};

export default function AiChatLayout({ children }: { children: React.ReactNode }) {
    return children;
}
