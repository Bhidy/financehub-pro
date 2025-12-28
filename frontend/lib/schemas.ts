import { z } from "zod";

export const TickerSchema = z.object({
    symbol: z.string(),
    // API returns these as strings, so we coerce to numbers
    last_price: z.coerce.number().nullable().optional(),
    change: z.coerce.number().nullable().optional(),
    change_percent: z.coerce.number().nullable().optional(),
    name_en: z.string().nullable().optional(),
    name_ar: z.string().nullable().optional(),
    sector_name: z.string().nullable().optional(),
    volume: z.coerce.number().nullable().optional(),
});

export const TickerResponseSchema = z.array(TickerSchema);

export type Ticker = z.infer<typeof TickerSchema>;
