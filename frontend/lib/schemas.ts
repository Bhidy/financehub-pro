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
});

export const TickerResponseSchema = z.array(TickerSchema);

export type Ticker = z.infer<typeof TickerSchema>;
