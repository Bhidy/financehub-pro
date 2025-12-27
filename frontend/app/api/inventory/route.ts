import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export async function GET() {
    const client = await pool.connect();

    try {
        const inventory: any = {
            generated_at: new Date().toISOString(),
            sections: {}
        };

        // 1. STOCKS OVERVIEW
        const stockCount = await client.query("SELECT COUNT(*) FROM market_tickers");
        const stocksWithData = await client.query("SELECT COUNT(DISTINCT symbol) FROM ohlc_data");
        inventory.sections.stocks = {
            title: "Stock Tickers",
            icon: "📈",
            color: "emerald",
            total: parseInt(stockCount.rows[0].count),
            with_data: parseInt(stocksWithData.rows[0].count),
            coverage: Math.round((parseInt(stocksWithData.rows[0].count) / parseInt(stockCount.rows[0].count) * 100) || 0)
        };

        // 2. OHLC HISTORY
        const ohlcCount = await client.query("SELECT COUNT(*) FROM ohlc_data");
        const ohlcRange = await client.query("SELECT MIN(date), MAX(date) FROM ohlc_data");
        inventory.sections.ohlc_history = {
            title: "Historical OHLC",
            icon: "📊",
            color: "blue",
            total_rows: parseInt(ohlcCount.rows[0].count),
            date_from: ohlcRange.rows[0].min,
            date_to: ohlcRange.rows[0].max,
            data_points: parseInt(ohlcCount.rows[0].count) * 5
        };

        // 3. INTRADAY DATA
        const intraCount = await client.query("SELECT COUNT(*) FROM intraday_data");
        const intraSymbols = await client.query("SELECT COUNT(DISTINCT symbol) FROM intraday_data");
        inventory.sections.intraday = {
            title: "Intraday Data",
            icon: "⏱️",
            color: "orange",
            total_rows: parseInt(intraCount.rows[0].count),
            unique_symbols: parseInt(intraSymbols.rows[0].count),
            data_points: parseInt(intraCount.rows[0].count) * 5
        };

        // 4. FINANCIAL STATEMENTS
        const stmtCount = await client.query("SELECT COUNT(*) FROM financial_statements");
        const stmtBreakdown = await client.query(`
      SELECT period_type, COUNT(*) as cnt 
      FROM financial_statements 
      GROUP BY period_type ORDER BY period_type
    `);
        inventory.sections.financials = {
            title: "Financial Statements",
            icon: "📑",
            color: "teal",
            total_rows: parseInt(stmtCount.rows[0].count),
            breakdown: stmtBreakdown.rows.reduce((acc: any, r: any) => {
                acc[r.period_type] = parseInt(r.cnt);
                return acc;
            }, {}),
            data_points: parseInt(stmtCount.rows[0].count) * 10
        };

        // 5. MUTUAL FUNDS
        const fundCount = await client.query("SELECT COUNT(*) FROM mutual_funds");
        const fundsWithMetrics = await client.query("SELECT COUNT(*) FROM mutual_funds WHERE sharpe_ratio IS NOT NULL");
        inventory.sections.mutual_funds = {
            title: "Mutual Funds",
            icon: "💼",
            color: "indigo",
            total: parseInt(fundCount.rows[0].count),
            with_risk_metrics: parseInt(fundsWithMetrics.rows[0].count),
            coverage: Math.round((parseInt(fundsWithMetrics.rows[0].count) / parseInt(fundCount.rows[0].count) * 100) || 0)
        };

        // 6. NAV HISTORY
        const navCount = await client.query("SELECT COUNT(*) FROM nav_history");
        const navRange = await client.query("SELECT MIN(date), MAX(date) FROM nav_history");
        inventory.sections.nav_history = {
            title: "Fund NAV History",
            icon: "📈",
            color: "cyan",
            total_rows: parseInt(navCount.rows[0].count),
            date_from: navRange.rows[0].min,
            date_to: navRange.rows[0].max,
            data_points: parseInt(navCount.rows[0].count) * 2
        };

        // 7. MAJOR SHAREHOLDERS
        const shCount = await client.query("SELECT COUNT(*) FROM major_shareholders");
        const shSymbols = await client.query("SELECT COUNT(DISTINCT symbol) FROM major_shareholders");
        inventory.sections.shareholders = {
            title: "Major Shareholders",
            icon: "👥",
            color: "amber",
            total_rows: parseInt(shCount.rows[0].count),
            unique_stocks: parseInt(shSymbols.rows[0].count)
        };

        // 8. EARNINGS CALENDAR
        const earnCount = await client.query("SELECT COUNT(*) FROM earnings_calendar");
        const earnSymbols = await client.query("SELECT COUNT(DISTINCT symbol) FROM earnings_calendar");
        inventory.sections.earnings = {
            title: "Earnings Calendar",
            icon: "📅",
            color: "rose",
            total_rows: parseInt(earnCount.rows[0].count),
            unique_stocks: parseInt(earnSymbols.rows[0].count)
        };

        // 9. CORPORATE ACTIONS
        try {
            const corpCount = await client.query("SELECT COUNT(*) FROM corporate_actions");
            inventory.sections.corporate_actions = {
                title: "Corporate Actions",
                icon: "📋",
                color: "violet",
                total_rows: parseInt(corpCount.rows[0].count)
            };
        } catch {
            inventory.sections.corporate_actions = { title: "Corporate Actions", icon: "📋", color: "violet", total_rows: 0 };
        }

        // 10. FINANCIAL RATIOS
        try {
            const ratioCount = await client.query("SELECT COUNT(*) FROM financial_ratios");
            inventory.sections.ratios = {
                title: "Financial Ratios",
                icon: "📐",
                color: "lime",
                total_rows: parseInt(ratioCount.rows[0].count)
            };
        } catch {
            inventory.sections.ratios = { title: "Financial Ratios", icon: "📐", color: "lime", total_rows: 0 };
        }

        // 11. SECTOR CLASSIFICATION
        try {
            const sectorCount = await client.query("SELECT COUNT(*) FROM sector_classification");
            inventory.sections.sectors = {
                title: "Sector Classification",
                icon: "🏭",
                color: "sky",
                total_rows: parseInt(sectorCount.rows[0].count)
            };
        } catch {
            inventory.sections.sectors = { title: "Sector Classification", icon: "🏭", color: "sky", total_rows: 0 };
        }

        // 12. FAIR VALUES
        try {
            const fvCount = await client.query("SELECT COUNT(*) FROM fair_values");
            inventory.sections.fair_values = {
                title: "Fair Values",
                icon: "💰",
                color: "yellow",
                total_rows: parseInt(fvCount.rows[0].count)
            };
        } catch {
            inventory.sections.fair_values = { title: "Fair Values", icon: "💰", color: "yellow", total_rows: 0 };
        }

        // AGGREGATE METRICS
        const totalDataPoints =
            (inventory.sections.ohlc_history?.data_points || 0) +
            (inventory.sections.intraday?.data_points || 0) +
            (inventory.sections.financials?.data_points || 0) +
            (inventory.sections.nav_history?.data_points || 0) +
            (inventory.sections.shareholders?.total_rows || 0) * 3 +
            (inventory.sections.earnings?.total_rows || 0) * 5;

        inventory.aggregate = {
            total_data_points: totalDataPoints,
            total_stocks: inventory.sections.stocks?.total || 0,
            total_funds: inventory.sections.mutual_funds?.total || 0,
            total_tables: 12,
            database_health: totalDataPoints > 2000000 ? "EXCELLENT" : totalDataPoints > 1000000 ? "GOOD" : "BUILDING"
        };

        return NextResponse.json(inventory);
    } catch (error: any) {
        console.error('Inventory API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
