/**
 * Shared utility functions for the frontend.
 */

/**
 * Format a number with abbreviations (B, M, K) for display.
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined) return "-";
    if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(decimals)}B`;
    if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
    if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(decimals)}K`;
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Format a percentage value.
 */
export function formatPercent(value: number | null | undefined, forceSign = false): string {
    if (value === null || value === undefined) return "-";
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return "-";
    const sign = (num >= 0 && forceSign) ? "+" : "";
    return `${sign}${num.toFixed(2)}%`;
}
