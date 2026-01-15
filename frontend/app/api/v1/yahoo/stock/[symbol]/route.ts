import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;

    // Proxy to Fixed Python Backend on Hetzner VPS
    // This backend has the robust suffix handling (COMI -> COMI.CA)
    const targetUrl = `https://starta.46-224-223-172.sslip.io/api/v1/yahoo/stock/${symbol}`;

    try {
        const res = await fetch(targetUrl, {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            console.error(`[Yahoo Proxy] Failed: ${res.status} ${res.statusText}`);
            return NextResponse.json(
                { error: `Backend Error: ${res.statusText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[Yahoo Proxy] Exception:', error.message);
        return NextResponse.json(
            { error: `Proxy Failed: ${error.message}` },
            { status: 500 }
        );
    }
}
