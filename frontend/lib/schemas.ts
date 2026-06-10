import { z } from "zod";

// Safe number parser that handles all API edge cases
const safeNumber = z.preprocess((val) => {
    if (val === null || val === undefined || val === "" || val === "null") return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
}, z.number().nullable().optional());

export const TickerSchema = z.object({
    symbol: z.string(),
    last_price: safeNumber,
    change: safeNumber,
    change_percent: safeNumber,
    name_en: z.string().nullable().optional(),
    name_ar: z.string().nullable().optional(),
    sector_name: z.string().nullable().optional(),
    volume: safeNumber,
    pe_ratio: safeNumber,
    market_cap: safeNumber,
    book_value: safeNumber,
    market_code: z.string().nullable().optional(),
    // TV-owned identity/ratio fields served by /api/v1/tickers (June-2026).
    // Zod strips undeclared keys, so every field the page reads MUST be listed
    // here — omitting one silently renders "-" (Codex review, PR#75).
    pb_ratio: safeNumber,
    dividend_yield: safeNumber,
    currency: z.string().nullable().optional(),
    isin: z.string().nullable().optional(),
    logo_url: z.string().nullable().optional(),
    last_updated: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
});

export const TickerResponseSchema = z.array(TickerSchema);

export type Ticker = z.infer<typeof TickerSchema>;
