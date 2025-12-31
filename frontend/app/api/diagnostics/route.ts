import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

/**
 * AI Database Diagnostic Endpoint
 * Tests:
 * 1. DATABASE_URL presence
 * 2. Connection viability
 * 3. Data availability (market_tickers)
 */
export async function GET() {
    const diagnostics: Record<string, any> = {
        timestamp: new Date().toISOString(),
        environment: process.env.VERCEL ? 'vercel' : 'local',
        checks: {},
    };

    // Check 1: DATABASE_URL exists
    diagnostics.checks.databaseUrlPresent = !!process.env.DATABASE_URL;
    if (!process.env.DATABASE_URL) {
        diagnostics.checks.databaseUrlPresent = false;
        diagnostics.error = 'DATABASE_URL is not defined in environment';
        return NextResponse.json(diagnostics, { status: 500 });
    }

    // Masked URL for debugging (hide password)
    const dbUrl = process.env.DATABASE_URL;
    diagnostics.checks.databaseUrlMasked = dbUrl.replace(/:([^:@]+)@/, ':***@');

    // Check 2: Database connection
    try {
        const healthCheck = await db.healthCheck();
        diagnostics.checks.connectionHealth = healthCheck;
    } catch (error: any) {
        diagnostics.checks.connectionHealth = { ok: false, error: error.message };
    }

    // Check 3: Data availability and sample fund columns
    let sampleFundResult;
    try {
        const [tickersRes, fundsRes, sampleFund] = await Promise.all([
            db.query('SELECT count(*) as count FROM market_tickers'),
            db.query('SELECT count(*) as count FROM mutual_funds'),
            db.query('SELECT * FROM mutual_funds LIMIT 1')
        ]);

        diagnostics.checks.dataAvailability = {
            tickers: parseInt(tickersRes.rows[0]?.count || '0'),
            funds: parseInt(fundsRes.rows[0]?.count || '0')
        };
        sampleFundResult = sampleFund; // Store for later use
    } catch (error: any) {
        diagnostics.checks.dataAvailability = { error: error.message };
    }

    // Add fund columns check
    diagnostics.checks.fundColumns = sampleFundResult?.rows[0] ? Object.keys(sampleFundResult.rows[0]) : ['NO_DATA'];

    // Check 4: Sample stock lookup (Aramco 2222)
    try {
        const result = await db.query(
            'SELECT symbol, name_en, last_price, change_percent FROM market_tickers WHERE symbol = $1',
            ['2222']
        );
        diagnostics.checks.sampleStock = result.rows[0] || { error: 'No data for Aramco (2222)' };
    } catch (error: any) {
        diagnostics.checks.sampleStock = { error: error.message };
    }

    const allPassed =
        diagnostics.checks.databaseUrlPresent &&
        diagnostics.checks.connectionHealth?.ok &&
        diagnostics.checks.dataAvailability?.tickersWithPrices > 0;

    diagnostics.status = allPassed ? 'HEALTHY' : 'DEGRADED';

    return NextResponse.json(diagnostics, { status: allPassed ? 200 : 500 });
}
