import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bhidy-financehub-api.hf.space';

export async function GET(
    request: NextRequest,
    { params }: { params: { symbol: string } }
) {
    const symbol = params.symbol?.toUpperCase();

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/egx/dividends/${symbol}`, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 600 } // Cache for 10 minutes
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Dividends not found', dividends: [] }, { status: 200 });
            }
            return NextResponse.json({ error: 'Failed to fetch dividends' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('EGX dividends error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
