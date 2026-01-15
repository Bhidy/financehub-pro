import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://starta.46-224-223-172.sslip.io';

export async function GET(
    request: NextRequest,
    { params }: { params: { symbol: string } }
) {
    const symbol = params.symbol?.toUpperCase();

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/egx/statistics/${symbol}`, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Statistics not found' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('EGX statistics error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
