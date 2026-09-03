/**
 * Pure, locale-stable formatters shared by the fund analytics components.
 * The profile page shows Western numerals throughout (matching the existing NAV /
 * return formatting in renderFundPage), so numeric output uses 'en-EG' regardless
 * of UI language — deterministic across SSR and client (no hydration drift).
 */

import { ltrNum } from '@/lib/bidi';
export const pct = (v: number): string => ltrNum(`${v.toFixed(2)}%`);
export const signedPct = (v: number): string => ltrNum(`${v > 0 ? '+' : ''}${v.toFixed(2)}%`);
export const int = (v: number): string => Math.round(v).toLocaleString('en-EG');
export const money = (v: number, currency: string): string =>
    `${Math.round(v).toLocaleString('en-EG')} ${currency}`;

/** Interpolate `{key}` placeholders in a bilingual template string. */
export const interp = (tpl: string, map: Record<string, string | number>): string =>
    tpl.replace(/\{(\w+)\}/g, (_, k) => (map[k] != null ? String(map[k]) : ''));
