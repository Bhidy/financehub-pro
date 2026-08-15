import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-error';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/db-server';

// Handle requests for /api/v1/company/[symbol]/profile
export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    // Await params before using them (Next.js 15 requirement)
    const { symbol } = await params;

    // Resolve alias if needed (simple check)
    const cleanSymbol = symbol.trim().toUpperCase();
    const symBase = cleanSymbol.replace('.CA', '');
    const symCA = `${symBase}.CA`;

    try {
        // Parallel fetch for speed: Profile + Ticker Data + Overview Statistics
        const [profileRes, tickerRes, statsRes] = await Promise.all([
            db.query(`SELECT * FROM company_profiles WHERE symbol = $1 OR symbol = $2 LIMIT 1`, [symBase, symCA]),
            db.query(`SELECT * FROM market_tickers WHERE symbol = $1 OR symbol = $2 LIMIT 1`, [symBase, symCA]),
            db.query(`SELECT * FROM stock_stats_view WHERE symbol = $1 OR symbol = $2 LIMIT 1`, [symBase, symCA])
        ]);

        const profile = profileRes.rows[0] || {};
        const ticker = tickerRes.rows[0] || {};
        const stats = statsRes.rows[0] || {};

        if (!profile.symbol && !ticker.symbol && !stats.symbol) {
            return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Merge data for a complete profile
        const data = {
            symbol: cleanSymbol,
            profile: {
                ...profile,
                name_en: ticker.name_en || profile.name_en || profile.company_name,
                name_ar: ticker.name_ar || profile.name_ar,
                sector: ticker.sector_name || profile.sector || stats.sector_name || stats.sector,
                market_cap: ticker.market_cap || stats.market_cap,
                website: profile.website,
                // No fabricated fallback text — if we have no description, send none.
                description: profile.description || null
            },
            market_data: {
                current_price: ticker.last_price,
                change_percent: ticker.change_percent,
                volume: ticker.volume,
                high: ticker.high,
                low: ticker.low,
                pe_ratio: ticker.pe_ratio || stats.pe_ratio,
                pb_ratio: ticker.pb_ratio || stats.pb_ratio,
                dividend_yield: ticker.dividend_yield || stats.dividend_yield
            },
            statistics: stats
        };

        return NextResponse.json(data);

    } catch (error: any) {
        return apiError('/v1/company/[symbol]/profile', error);
    }
}

