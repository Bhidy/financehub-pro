import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge for faster response times
export const dynamic = 'force-dynamic'; // Disable caching

const BACKEND_AI_URL = 'https://starta.46-224-223-172.sslip.io/api/v1/ai/chat';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { message, history = [], session_id = null } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                {
                    message_text: "Please provide a message.",
                    message_text_ar: "يرجى كتابة رسالة.",
                    language: "en",
                    cards: [],
                    actions: [],
                    meta: { intent: "ERROR", confidence: 0, entities: {} }
                },
                { status: 400 }
            );
        }

        console.log(`[AI Route v2.2] Processing message: "${message.substring(0, 50)}..."`);

        // Proxy to Hetzner deterministic backend
        const response = await fetch(BACKEND_AI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history, session_id })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[AI Route] Backend error:', errorText);
            return NextResponse.json(
                {
                    message_text: "I'm having trouble connecting to the service. Please try again.",
                    message_text_ar: "أواجه مشكلة في الاتصال بالخدمة. يرجى المحاولة مرة أخرى.",
                    language: "en",
                    cards: [],
                    actions: [],
                    meta: { intent: "ERROR", confidence: 0, entities: {}, error: errorText }
                },
                { status: 502 }
            );
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[AI Route] Error:', error);
        return NextResponse.json(
            {
                message_text: "An error occurred processing your request.",
                message_text_ar: "حدث خطأ أثناء معالجة طلبك.",
                language: "en",
                cards: [],
                actions: [],
                meta: { intent: "ERROR", confidence: 0, entities: {}, error: error.message }
            },
            { status: 500 }
        );
    }
}

// Health check
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        service: 'ai-chat',
        backend: 'hetzner-vps-deterministic'
    });
}
