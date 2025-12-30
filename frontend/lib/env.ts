import { z } from "zod";

const envSchema = z.object({
    // Unified Serverless: AI is now internal, no external backend needed
    // This is kept for other API calls if any, but AI uses /api/v1/ai/chat directly
    NEXT_PUBLIC_API_URL: z.string().url().default("https://finhub-pro.vercel.app/api/v1"),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
});
