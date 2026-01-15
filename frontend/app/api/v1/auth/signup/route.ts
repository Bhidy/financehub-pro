import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const HF_API_URL = 'https://starta.46-224-223-172.sslip.io/api/v1/auth';

// Auth signup endpoint
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('[Auth Route] Signup request for:', body.email);

        const response = await fetch(`${HF_API_URL}/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Auth Route] Signup error:', errorData);
            return NextResponse.json(
                { detail: errorData.detail || 'Registration failed' },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Auth Route] Signup error:', error);
        return NextResponse.json(
            { detail: error.message || 'Registration failed' },
            { status: 500 }
        );
    }
}
