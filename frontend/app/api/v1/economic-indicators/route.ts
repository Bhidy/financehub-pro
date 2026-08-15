import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    try {
        // economic_indicators table exists with 2,621 records
        const result = await db.query(
            `SELECT indicator_code, date, value, unit, source
             FROM economic_indicators 
             ORDER BY date DESC 
             LIMIT 100`
        );
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return apiError('/v1/economic-indicators', error);
    }
}
