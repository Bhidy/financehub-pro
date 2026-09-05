import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';
import { EGX_ONLY } from '@/lib/public-data';

export async function GET() {
    try {
        // CRITICAL: Only return stocks with actual price data
        const result = await db.query(
            `SELECT symbol, name_en, name_ar, last_price, change, change_percent, volume, sector_name, market_code,
                    currency, market_cap, pe_ratio, pb_ratio, dividend_yield, isin, logo_url,
                    last_updated, updated_at
             FROM market_tickers
             -- LISTING AUTHORITY (2026-09-06): this endpoint served the whole vendor
             -- universe — 273 Saudi rows (Aramco, Al Rajhi, STC) and non-listed EGX
             -- lines — from an Egyptian-market API. Same allow-list as every page.
             WHERE last_price IS NOT NULL AND ${EGX_ONLY}
             ORDER BY volume::numeric DESC NULLS LAST
             LIMIT 500`
        );
        // Surface data freshness without changing the array body: callers that
        // want it read the header; the rows carry last_updated for per-row use.
        const newest = result.rows.reduce((mx: any, r: any) => {
            const t = r.last_updated || r.updated_at;
            return t && (!mx || new Date(t) > new Date(mx)) ? t : mx;
        }, null);
        return NextResponse.json(result.rows, {
            headers: newest ? { 'X-Data-As-Of': new Date(newest).toISOString() } : {},
        });
    } catch (error: any) {
        console.error('[API /tickers ERROR]', error.message);
        return apiError('/v1/tickers', error);
    }
}
