import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const HF_API_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1/auth`;

// Auth signup endpoint
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        console.log('[Auth Route] Signup request for:', body.email);

        const response = await fetch(`${HF_API_URL}/signup`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000), // don't hang on a slow/sleeping backend (L-4)
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
            { detail: 'Registration failed' },
            { status: 500 }
        );
    }
}
