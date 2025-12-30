import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const report: any = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            GROQ_API_KEY_SET: !!process.env.GROQ_API_KEY,
            DATABASE_URL_SET: !!process.env.DATABASE_URL,
        },
        connectivity: {
            database: "pending",
            ai_client: "pending"
        }
    };

    // 1. Check Database
    try {
        const start = Date.now();
        await db.query('SELECT 1');
        report.connectivity.database = `Connected (${Date.now() - start}ms)`;
    } catch (e: any) {
        report.connectivity.database = `Failed: ${e.message}`;
    }

    // 2. Check Groq Client init
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            report.connectivity.ai_client = "Skipped (No Key)";
        } else {
            const groq = new Groq({ apiKey });
            report.connectivity.ai_client = "Initialized";
        }
    } catch (e: any) {
        report.connectivity.ai_client = `Failed: ${e.message}`;
    }

    const isHealthy = report.connectivity.database.startsWith("Connected") && report.environment.GROQ_API_KEY_SET;

    return NextResponse.json(report, { status: isHealthy ? 200 : 503 });
}
