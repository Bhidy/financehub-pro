import { z } from "zod";

export const TickerSchema = z.object({
    symbol: z.string(),
    last_price: z.number().nullable().optional(),
    change: z.number().nullable().optional(),
    change_percent: z.number().nullable().optional(),
    name_en: z.string().optional(),
    name_ar: z.string().optional(),
    sector_name: z.string().optional(),
    volume: z.number().nullable().optional(),
});

export const TickerResponseSchema = z.array(TickerSchema);

export type Ticker = z.infer<typeof TickerSchema>;
