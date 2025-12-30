import { NextRequest, NextResponse } from 'next/server';
import { chatWithAnalyst } from '@/lib/ai-service';

export const runtime = 'nodejs'; // Use Node.js runtime for pg driver
export const dynamic = 'force-dynamic'; // Disable caching

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, history = [] } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { reply: "Please provide a message.", error: "INVALID_INPUT" },
                { status: 400 }
            );
        }

        console.log(`[AI Route] Processing: "${message.substring(0, 50)}..."`);

        const result = await chatWithAnalyst(message, history);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[AI Route] Error:', error);
        return NextResponse.json(
            { reply: "An error occurred processing your request.", error: error.message },
            { status: 500 }
        );
    }
}

// Health check
export async function GET() {
    return NextResponse.json({ status: 'healthy', service: 'ai-chat' });
}
