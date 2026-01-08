import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const HF_API_URL = 'https://bhidy-financehub-api.hf.space/api/v1/auth';

// Admin users list endpoint (proxy)
export async function GET(request: NextRequest) {
    try {
        const authorization = request.headers.get('authorization');

        if (!authorization) {
            return NextResponse.json(
                { detail: 'Not authenticated' },
                { status: 401 }
            );
        }

        const url = new URL(request.url);
        const skip = url.searchParams.get('skip') || '0';
        const limit = url.searchParams.get('limit') || '50';
        const search = url.searchParams.get('search') || '';

        const params = new URLSearchParams({ skip, limit });
        if (search) params.append('search', search);

        console.log('[Auth Route] Fetching users list');

        const response = await fetch(`${HF_API_URL}/users?${params}`, {
            method: 'GET',
            headers: {
                'Authorization': authorization
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Auth Route] Users list error:', errorData);
            return NextResponse.json(
                { detail: errorData.detail || 'Failed to fetch users' },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Auth Route] Users error:', error);
        return NextResponse.json(
            { detail: error.message || 'Failed to fetch users' },
            { status: 500 }
        );
    }
}
