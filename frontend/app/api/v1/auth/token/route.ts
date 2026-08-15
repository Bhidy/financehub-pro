import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const HF_API_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1/auth`;

// Auth token endpoint
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        let body: string;
        if (contentType.includes('application/x-www-form-urlencoded')) {
            body = await request.text();
        } else {
            body = await request.text();
        }

        console.log('[Auth Route] Token request');

        const response = await fetch(`${HF_API_URL}/token`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000), // don't hang on a slow/sleeping backend (L-4)
            headers: {
                'Content-Type': contentType || 'application/x-www-form-urlencoded'
            },
            body: body
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Auth Route] Token error:', errorText);
            return NextResponse.json(
                { detail: 'Invalid credentials' },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Auth Route] Error:', error);
        return NextResponse.json(
            { detail: 'Authentication failed' },
            { status: 500 }
        );
    }
}
