import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'AI Market Analyst for EGX Stocks & Funds',
    description:
        'Ask Starta\'s AI analyst about any Egyptian Exchange stock or mutual fund — live prices, financials, dividends, technicals and news, answered in Arabic or English.',
    // The chatbot is hidden from the website (unlinked, de-listed from the
    // sitemap). De-listing alone does not de-index — explicitly noindex until
    // the product decision changes.
    robots: { index: false, follow: false },
};

export default function AiChatLayout({ children }: { children: React.ReactNode }) {
    return children;
}
