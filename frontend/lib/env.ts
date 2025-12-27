import { z } from "zod";

const envSchema = z.object({
    NEXT_PUBLIC_API_URL: z.string().url().optional().or(z.literal("")),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
});
