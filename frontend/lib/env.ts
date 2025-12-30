import { z } from "zod";

const envSchema = z.object({
    // Centralized Production URL (The Source of Truth)
    NEXT_PUBLIC_API_URL: z.string().url().default("https://financehub-pro-production.up.railway.app/api/v1"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
});
