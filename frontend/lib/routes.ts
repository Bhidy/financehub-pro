/**
 * Centralized routing utilities for FinanceHub Pro.
 * This is the SINGLE SOURCE OF TRUTH for market-based routing.
 */

export type MarketCode = 'EGX' | 'TADAWUL' | 'SAU' | string | null | undefined;

/**
 * Returns the correct company profile route based on market.
 * @param symbol - Stock symbol (e.g., "COMI", "2222")
 * @param marketCode - Market code from API (e.g., "EGX", "TADAWUL")
 * @returns The correct route path for the company profile
 */
export function getCompanyProfileRoute(symbol: string, marketCode: MarketCode): string {
    if (!symbol) return '/';

    // The canonical company page for EVERY market is /symbol/{SYMBOL}.
    // (An /egx/{symbol} App Router route never existed — the old EGX branch
    // here sent global-search users to live 404s.)
    void marketCode;
    return `/symbol/${symbol.toUpperCase()}`;
}
