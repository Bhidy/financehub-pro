import { NextResponse } from 'next/server';
import { chatWithAnalyst } from '@/lib/ai-service';

/**
 * AI Chat Test Endpoint
 * Tests the full AI pipeline with a sample query
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'What is Aramco stock price?';

    const startTime = Date.now();

    try {
        const result = await chatWithAnalyst(query, []);

        return NextResponse.json({
            query,
            success: true,
            latencyMs: Date.now() - startTime,
            reply: result.reply,
            data: result.data,
            toolsUsed: result.tools_used,
            error: result.error || null,
        });
    } catch (error: any) {
        return NextResponse.json({
            query,
            success: false,
            latencyMs: Date.now() - startTime,
            error: error.message,
            stack: error.stack?.substring(0, 500),
        }, { status: 500 });
    }
}
