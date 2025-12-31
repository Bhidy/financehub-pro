import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

/**
 * AI Tool Test Endpoint
 * Simulates what the AI does when asked about a stock
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || '2222';

    const results: Record<string, any> = {
        requestedSymbol: symbol,
        timestamp: new Date().toISOString(),
    };

    // Test 1: Direct symbol lookup (what happens when user says "2222")
    try {
        const directResult = await db.query(
            `SELECT symbol, name_en, last_price, change_percent, volume 
             FROM market_tickers WHERE symbol = $1`,
            [symbol]
        );
        results.directLookup = directResult.rows[0] || { error: 'No data found for symbol' };
    } catch (error: any) {
        results.directLookup = { error: error.message };
    }

    // Test 2: Name-based lookup (what happens when user says "Aramco")
    try {
        const nameResult = await db.query(
            `SELECT symbol, name_en, last_price, change_percent 
             FROM market_tickers WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 5`,
            [`%aramco%`]
        );
        results.nameLookup = nameResult.rows;
    } catch (error: any) {
        results.nameLookup = { error: error.message };
    }

    // Test 3: Full table sample (verify data exists)
    try {
        const sampleResult = await db.query(
            `SELECT symbol, name_en, last_price FROM market_tickers ORDER BY volume DESC LIMIT 5`
        );
        results.topByVolume = sampleResult.rows;
    } catch (error: any) {
        results.topByVolume = { error: error.message };
    }

    // Test 4: Check if GROQ_API_KEY exists
    results.groqKeyPresent = !!process.env.GROQ_API_KEY;

    return NextResponse.json(results);
}
