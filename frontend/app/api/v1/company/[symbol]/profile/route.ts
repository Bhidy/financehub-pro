import { NextResponse } from 'next/server';
import { db } from '@/lib/db-server';

// Handle requests for /api/v1/company/[symbol]/profile
export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    // Await params before using them (Next.js 15 requirement)
    const { symbol } = await params;

    // Resolve alias if needed (simple check)
    const cleanSymbol = symbol.trim();

    try {
        // Parallel fetch for speed: Profile + Ticker Data + Overview
        const [profileRes, tickerRes] = await Promise.all([
            db.query(`SELECT * FROM company_profiles WHERE symbol = $1`, [cleanSymbol]),
            db.query(`SELECT * FROM market_tickers WHERE symbol = $1`, [cleanSymbol])
        ]);

        const profile = profileRes.rows[0] || {};
        const ticker = tickerRes.rows[0] || {};

        if (!profile.symbol && !ticker.symbol) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Merge data for a complete profile
        const data = {
            symbol: cleanSymbol,
            profile: {
                ...profile,
                name_en: ticker.name_en || profile.company_name,
                sector: ticker.sector_name || profile.sector,
                market_cap: ticker.market_cap,
                website: profile.website,
                description: profile.description || `Leading company in the ${ticker.sector_name} sector.`
            },
            market_data: {
                current_price: ticker.last_price,
                change_percent: ticker.change_percent,
                volume: ticker.volume,
                high: ticker.high,
                low: ticker.low,
                pe_ratio: ticker.pe_ratio,
                pb_ratio: ticker.pb_ratio,
                dividend_yield: ticker.dividend_yield
            }
        };

        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
