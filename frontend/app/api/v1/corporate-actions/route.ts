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
        
        // Fallback to dividend_history if no corporate actions found for a specific symbol
        if (symbol && result.rows.length === 0) {
            const cleanSym = symbol.toUpperCase().replace(".CA", "");
            const divResult = await db.query(
                `SELECT id, symbol, ex_date, dividend_amount as amount, currency
                 FROM dividend_history
                 WHERE symbol = $1 OR symbol = $2
                 ORDER BY ex_date DESC
                 LIMIT 20`,
                [cleanSym, `${cleanSym}.CA`]
            );
            
            if (divResult.rows.length > 0) {
                const mappedDividends = divResult.rows.map((d: any) => ({
                    id: d.id,
                    symbol: symbol,
                    action_type: 'Dividend',
                    announcement_date: null,
                    ex_date: d.ex_date,
                    record_date: null,
                    payment_date: null,
                    amount: d.amount,
                    currency: d.currency || 'EGP',
                    description: `Cash Dividend of ${d.amount} ${d.currency || 'EGP'}`
                }));
                return NextResponse.json(mappedDividends);
            }
        }

        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

