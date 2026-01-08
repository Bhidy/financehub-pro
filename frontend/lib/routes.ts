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

    // Egypt stocks use /egx/{symbol} route
    if (marketCode === 'EGX') {
        return `/egx/${symbol}`;
    }

    // All other markets (Saudi, etc.) use /symbol/{symbol} route
    return `/symbol/${symbol}`;
}
