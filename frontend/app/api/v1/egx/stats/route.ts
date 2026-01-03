import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bhidy-financehub-api.hf.space';

export async function GET() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/egx/stats`, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('EGX stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
