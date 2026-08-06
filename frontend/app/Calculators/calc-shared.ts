/**
 * Shared numeric + formatting helpers for the Wealth Calculators.
 * Numbers keep en-US grouping and Western digits in BOTH languages (site
 * convention — see fund pages / egx30). Currency display symbols come from
 * calculators-i18n (EN "EGP" / AR "ج.م" etc.); multi-character symbols get a
 * separating space, "$" stays glued like the original tool.
 */

import type { CurrencyCode } from './calculators-i18n';

/** Currency presets ported verbatim from the source retirement tool
 *  (returnBefore/returnAfter/inflation/lifeExpectancy/salaryIncrease and the
 *  example-placeholder values). Default currency on this site is EGP. */
export const CURRENCY_CONFIG: Record<
    CurrencyCode,
    {
        returnBefore: number;
        returnAfter: number;
        inflation: number;
        lifeExpectancy: number;
        salaryIncrease: number;
        phCurrentSavings: string;
        phSavePercent: string;
        phOtherIncome: string;
        phOtherIncomeIncrease: string;
        phOtherAssets: string;
        phMonthlySalary: string;
        phRetireMonthly: string;
    }
> = {
    USD: {
        returnBefore: 10, returnAfter: 5, inflation: 3, lifeExpectancy: 95, salaryIncrease: 5,
        phCurrentSavings: '30,000', phSavePercent: '5', phOtherIncome: '250',
        phOtherIncomeIncrease: '5', phOtherAssets: '1,000,000',
        phMonthlySalary: '10,000', phRetireMonthly: '8,000',
    },
    EGP: {
        returnBefore: 18, returnAfter: 10, inflation: 15, lifeExpectancy: 75, salaryIncrease: 12,
        phCurrentSavings: '200,000', phSavePercent: '10', phOtherIncome: '2,000',
        phOtherIncomeIncrease: '10', phOtherAssets: '1,000,000',
        phMonthlySalary: '25,000', phRetireMonthly: '20,000',
    },
    SAR: {
        returnBefore: 8, returnAfter: 4, inflation: 2, lifeExpectancy: 80, salaryIncrease: 4,
        phCurrentSavings: '100,000', phSavePercent: '5', phOtherIncome: '1,000',
        phOtherIncomeIncrease: '3', phOtherAssets: '500,000',
        phMonthlySalary: '15,000', phRetireMonthly: '12,000',
    },
    AED: {
        returnBefore: 7, returnAfter: 4, inflation: 2, lifeExpectancy: 80, salaryIncrease: 3,
        phCurrentSavings: '100,000', phSavePercent: '5', phOtherIncome: '1,000',
        phOtherIncomeIncrease: '3', phOtherAssets: '500,000',
        phMonthlySalary: '15,000', phRetireMonthly: '12,000',
    },
};

export const CURRENCY_ORDER: CurrencyCode[] = ['EGP', 'USD', 'SAR', 'AED'];

const glue = (symbol: string): string => (symbol.length > 1 ? `${symbol} ` : symbol);

/** Money formatters bound to a display symbol — mirrors the source tool's
 *  formatMoney / formatMoneyPrecise / formatMoneyCompact, NaN-guarded. */
export function moneyFormatters(symbol: string) {
    const p = glue(symbol);
    return {
        money(n: number | null | undefined): string {
            if (n === undefined || n === null || Number.isNaN(n)) return '—';
            return p + Math.round(n).toLocaleString('en-US');
        },
        moneyPrecise(n: number | null | undefined): string {
            if (n === undefined || n === null || Number.isNaN(n)) return '—';
            return p + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        moneyCompact(n: number): string {
            if (Number.isNaN(n)) return '—';
            if (n >= 1_000_000) return p + (n / 1_000_000).toFixed(1) + 'M';
            if (n >= 1_000) return p + (n / 1_000).toFixed(0) + 'k';
            return p + Math.round(n).toString();
        },
    };
}

/** (rate as fraction) → "12.00%" — identical to the source tool. */
export function formatPercent(n: number): string {
    return (n * 100).toFixed(2) + '%';
}

/** Plain integer with en-US grouping ("1,234,567"). */
export function formatInt(n: number): string {
    if (Number.isNaN(n)) return '—';
    return Math.round(n).toLocaleString('en-US');
}

/** Compact number without a currency symbol ("1.2M" / "350K"), matching the
 *  home-page simulator's fmtShort. */
export function formatShort(n: number): string {
    const r = Math.round(n);
    if (r >= 1_000_000) return (r / 1_000_000).toFixed(1) + 'M';
    if (r >= 1_000) return (r / 1_000).toFixed(0) + 'K';
    return r.toLocaleString('en-US');
}

/**
 * Growing-annuity future value — EXACT port (incl. the r≈g branch).
 * FV of a payment stream starting at `pmt`, growing g/yr, compounding r/yr, n years.
 */
export function growingAnnuityFV(pmt: number, r: number, g: number, n: number): number {
    if (n <= 0) return 0;
    if (Math.abs(r - g) < 0.000001) {
        return pmt * n * Math.pow(1 + r, n - 1);
    }
    return (pmt * (Math.pow(1 + r, n) - Math.pow(1 + g, n))) / (r - g);
}
