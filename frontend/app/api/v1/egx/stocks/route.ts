import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bhidy-financehub-api.hf.space';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '300';

    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/egx/stocks?limit=${limit}`, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('EGX stocks error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
