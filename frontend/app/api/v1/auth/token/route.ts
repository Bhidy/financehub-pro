import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const HF_API_URL = 'https://starta.46-224-223-172.sslip.io/api/v1/auth';

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
            { detail: error.message || 'Authentication failed' },
            { status: 500 }
        );
    }
}
