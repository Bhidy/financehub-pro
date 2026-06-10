import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    try {
        let query = `SELECT id, symbol, action_type, announcement_date, ex_date,
                            record_date, payment_date, amount, currency, description
                     FROM corporate_actions 
                     ORDER BY ex_date DESC 
                     LIMIT 100`;
        let params: any[] = [];

        if (symbol) {
            const cleanSym = symbol.toUpperCase().replace(".CA", "");
            query = `SELECT id, symbol, action_type, announcement_date, ex_date,
                            record_date, payment_date, amount, currency, description
                     FROM corporate_actions 
                     WHERE symbol = $1 OR symbol = $2
                     ORDER BY ex_date DESC 
                     LIMIT 20`;
            params = [cleanSym, `${cleanSym}.CA`];
        }

        const result = await db.query(query, params);

        // dividend_history fallback removed (June-2026 audit): that table froze in
        // January. corporate_actions is now self-extending — the daily TradingView
        // dividends cycle upserts every recent/upcoming dividend into it.
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

