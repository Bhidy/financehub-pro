import { NextResponse } from "next/server";
import { db } from "@/lib/db-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SectionDefinition {
    key: string;
    title: string;
    icon: string;
    color: string;
    tables: string[];
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
    {
        key: "stocks",
        title: "Stock Tickers",
        icon: "📈",
        color: "emerald",
        tables: ["market_tickers", "ticker_aliases", "stock_statistics"],
    },
    {
        key: "company_profiles",
        title: "Company Profiles",
        icon: "🏢",
        color: "sky",
        tables: ["company_profiles"],
    },
    {
        key: "ohlc_history",
        title: "OHLC Price Data",
        icon: "📉",
        color: "orange",
        tables: ["ohlc_data", "ohlc_history"],
    },
    {
        key: "intraday",
        title: "Intraday Price Data",
        icon: "⏱️",
        color: "amber",
        tables: ["intraday_data", "intraday_1m", "intraday_2m", "intraday_5m", "intraday_15m", "intraday_30m", "intraday_1h", "intraday_ohlc"],
    },
    {
        key: "financials",
        title: "Financial Statements",
        icon: "📑",
        color: "blue",
        tables: ["financial_statements", "balance_sheets", "income_statements", "cashflow_statements"],
    },
    {
        key: "ratios",
        title: "Financial Ratios",
        icon: "📐",
        color: "lime",
        tables: ["financial_ratios", "financial_ratios_extended", "financial_ratios_history"],
    },
    {
        key: "mutual_funds",
        title: "Mutual Funds",
        icon: "💼",
        color: "teal",
        tables: ["mutual_funds", "fund_aliases"],
    },
    {
        key: "nav_history",
        title: "Fund NAV History",
        icon: "📊",
        color: "cyan",
        tables: ["nav_history", "fund_nav_history"],
    },
    {
        key: "shareholders",
        title: "Shareholder Intelligence",
        icon: "👥",
        color: "yellow",
        tables: ["major_shareholders", "ownership_breakdown", "institutional_holders"],
    },
    {
        key: "corporate_actions",
        title: "Corporate Actions",
        icon: "📋",
        color: "violet",
        tables: ["corporate_actions", "corporate_events", "dividend_history", "split_history"],
    },
    {
        key: "earnings",
        title: "Earnings Data",
        icon: "📅",
        color: "rose",
        tables: ["earnings_calendar", "earnings_history", "earnings_estimates"],
    },
    {
        key: "analyst_ratings",
        title: "Analyst Ratings",
        icon: "⭐",
        color: "indigo",
        tables: ["analyst_ratings"],
    },
    {
        key: "insider_data",
        title: "Insider Transactions",
        icon: "🔍",
        color: "orange",
        tables: ["insider_transactions", "insider_trading"],
    },
    {
        key: "macro_data",
        title: "Economic Indicators",
        icon: "🌍",
        color: "teal",
        tables: ["economic_indicators", "macro_data", "macro_insights"],
    },
    {
        key: "market_intel",
        title: "Market Intelligence",
        icon: "📰",
        color: "blue",
        tables: ["market_news", "market_breadth", "order_book_snapshot"],
    },
    {
        key: "etf_index",
        title: "ETF & Index Data",
        icon: "📦",
        color: "emerald",
        tables: ["etfs", "index_constituents", "index_history"],
    },
    {
        key: "ai_analytics",
        title: "AI Interaction Data",
        icon: "🤖",
        color: "slate",
        tables: ["chat_messages", "chat_interactions", "chat_sessions", "chat_session_summary", "chat_analytics", "chat_feedback", "guest_sessions", "unresolved_queries"],
    },
];

const TABLE_LABELS: Record<string, string> = {
    market_tickers: "Market Tickers",
    ticker_aliases: "Ticker Aliases",
    stock_statistics: "Stock Statistics",
    company_profiles: "Company Profiles",
    ohlc_data: "OHLC Base",
    ohlc_history: "OHLC History",
    intraday_data: "Intraday Base",
    intraday_1m: "Intraday 1m",
    intraday_2m: "Intraday 2m",
    intraday_5m: "Intraday 5m",
    intraday_15m: "Intraday 15m",
    intraday_30m: "Intraday 30m",
    intraday_1h: "Intraday 1h",
    intraday_ohlc: "Intraday OHLC",
    financial_statements: "Financial Statements",
    balance_sheets: "Balance Sheets",
    income_statements: "Income Statements",
    cashflow_statements: "Cashflow Statements",
    financial_ratios: "Ratios",
    financial_ratios_extended: "Extended Ratios",
    financial_ratios_history: "Ratios History",
    mutual_funds: "Mutual Funds",
    fund_aliases: "Fund Aliases",
    nav_history: "NAV History",
    fund_nav_history: "Fund NAV History",
    major_shareholders: "Major Shareholders",
    ownership_breakdown: "Ownership Breakdown",
    institutional_holders: "Institutional Holders",
    corporate_actions: "Corporate Actions",
    corporate_events: "Corporate Events",
    dividend_history: "Dividend History",
    split_history: "Split History",
    earnings_calendar: "Earnings Calendar",
    earnings_history: "Earnings History",
    earnings_estimates: "Earnings Estimates",
    analyst_ratings: "Analyst Ratings",
    insider_transactions: "Insider Transactions",
    insider_trading: "Insider Trading",
    economic_indicators: "Economic Indicators",
    macro_data: "Macro Data",
    macro_insights: "Macro Insights",
    market_news: "Market News",
    market_breadth: "Market Breadth",
    order_book_snapshot: "Order Book Snapshot",
    etfs: "ETFs",
    index_constituents: "Index Constituents",
    index_history: "Index History",
    chat_messages: "Chat Messages",
    chat_interactions: "Chat Interactions",
    chat_sessions: "Chat Sessions",
    chat_session_summary: "Session Summary",
    chat_analytics: "Chat Analytics",
    chat_feedback: "Chat Feedback",
    guest_sessions: "Guest Sessions",
    unresolved_queries: "Unresolved Queries",
};

function quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
}

function sqlStringLiteral(value: string): string {
    return `'${value.replace(/'/g, "''")}'`;
}

async function countTables(tableNames: string[]): Promise<Record<string, number>> {
    if (!tableNames.length) return {};

    const query = tableNames
        .map((tableName) => `SELECT ${sqlStringLiteral(tableName)} AS table_name, COUNT(*)::bigint AS row_count FROM ${quoteIdentifier(tableName)}`)
        .join(" UNION ALL ");

    const counts: Record<string, number> = {};

    try {
        const result = await db.query(query);
        for (const row of result.rows) {
            counts[String(row.table_name)] = Number(row.row_count ?? 0);
        }
        return counts;
    } catch (error: any) {
        console.warn("[API /inventory WARN] Bulk table counting failed, falling back to per-table count:", error?.message || error);

        for (const tableName of tableNames) {
            try {
                const result = await db.query(`SELECT COUNT(*)::bigint AS row_count FROM ${quoteIdentifier(tableName)}`);
                counts[tableName] = Number(result.rows[0]?.row_count ?? 0);
            } catch (tableError: any) {
                console.warn(`[API /inventory WARN] Failed counting table '${tableName}':`, tableError?.message || tableError);
                counts[tableName] = 0;
            }
        }
    }

    return counts;
}

export async function GET() {
    try {
        const publicTablesResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        const publicTables = publicTablesResult.rows.map((row) => String(row.table_name));
        const publicTableSet = new Set(publicTables);

        // Count every public table in one SQL pass for accurate, fast totals.
        const tableCounts = await countTables(publicTables);

        const sections: Record<string, any> = {};
        const trackedTableSet = new Set<string>();

        for (const definition of SECTION_DEFINITIONS) {
            let totalRows = 0;
            let activeTables = 0;
            const breakdown: Record<string, number> = {};

            for (const tableName of definition.tables) {
                trackedTableSet.add(tableName);
                if (!publicTableSet.has(tableName)) continue;

                const rowCount = tableCounts[tableName] ?? 0;
                if (rowCount <= 0) continue;

                totalRows += rowCount;
                activeTables += 1;
                breakdown[TABLE_LABELS[tableName] || tableName] = rowCount;
            }

            // Remove sections with no DB data.
            if (totalRows <= 0) continue;

            sections[definition.key] = {
                title: definition.title,
                icon: definition.icon,
                color: definition.color,
                total_rows: totalRows,
                active_tables: activeTables,
                table_count: definition.tables.length,
                breakdown,
            };
        }

        // Include unmapped data so no real DB rows are hidden from totals.
        const otherTables = publicTables.filter((tableName) => !trackedTableSet.has(tableName));
        let otherRows = 0;
        let otherActive = 0;
        const otherBreakdown = otherTables
            .map((tableName) => ({
                tableName,
                count: tableCounts[tableName] ?? 0,
            }))
            .filter((row) => row.count > 0)
            .sort((a, b) => b.count - a.count);

        for (const row of otherBreakdown) {
            otherRows += row.count;
            otherActive += 1;
        }

        if (otherRows > 0) {
            sections.other_data = {
                title: "Other Active Tables",
                icon: "🧩",
                color: "slate",
                total_rows: otherRows,
                active_tables: otherActive,
                table_count: otherTables.length,
                breakdown: Object.fromEntries(
                    otherBreakdown.slice(0, 12).map((row) => [
                        TABLE_LABELS[row.tableName] || row.tableName,
                        row.count,
                    ])
                ),
            };
        }

        const totalRowsAllTables = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);
        const activeTablesInDb = Object.values(tableCounts).filter((count) => count > 0).length;

        const aggregate = {
            total_data_points: totalRowsAllTables,
            total_stocks: tableCounts.market_tickers ?? 0,
            total_funds: tableCounts.mutual_funds ?? 0,
            total_tables: activeTablesInDb,
            total_tables_in_db: publicTables.length,
            active_sections: Object.keys(sections).length,
            database_health: totalRowsAllTables >= 1000000 ? "EXCELLENT" : totalRowsAllTables >= 250000 ? "GOOD" : "BUILDING",
        };

        return NextResponse.json(
            {
                generated_at: new Date().toISOString(),
                sections,
                aggregate,
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                    Pragma: "no-cache",
                    Expires: "0",
                },
            }
        );
    } catch (error: any) {
        console.error("[API /inventory ERROR]", error?.message || error);
        return NextResponse.json(
            {
                error: "Failed to load inventory",
                details: error?.message || "Unknown error",
            },
            { status: 500 }
        );
    }
}
