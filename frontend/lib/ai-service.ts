import Groq from 'groq-sdk';
import { db } from './db-server';

// Lazy Groq Client initialization (avoid build-time errors)
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
    if (groqClient) return groqClient;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY is not defined');
    }

    groqClient = new Groq({ apiKey });
    return groqClient;
}

// Models
const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const BACKUP_MODEL = "llama-3.1-70b-versatile";

// Common company aliases
const COMMON_ALIASES: Record<string, string> = {
    "aramco": "2222", "saudi aramco": "2222",
    "rajhi": "1120", "al rajhi": "1120", "alrajhi": "1120",
    "sabic": "2010", "saudi basic": "2010",
    "stc": "7010", "saudi telecom": "7010",
    "ncb": "1180", "alahli": "1180", "snb": "1180",
    "maaden": "1211", "mobily": "7020",
    "almarai": "2280", "jarir": "4190",
};

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `You are the FinanceHub Analyst AI — a Senior Financial Analyst for Tadawul (Saudi Stock Exchange).
You have access to 21 data tools covering 3.12 million data points. Use them strategically.

ABSOLUTE RULES:
1. NEVER answer financial questions without calling tools FIRST
2. NEVER say "I don't have access" — YOU HAVE 21 TOOLS, USE THEM
3. NEVER guess. ALL numbers from tools only.
4. If tool returns null → say "Data not currently available for [symbol]"

CURRENCY: Always SAR (Saudi Riyal)
SYMBOL FORMAT: 4-digit (1120, 2222, 2010)
LANGUAGE: English, professional tone

REMEMBER: CALL TOOLS FIRST, SYNTHESIZE SECOND. Every number cited. Zero hallucinations.`;

// ===== HELPER: Symbol Resolution =====
async function resolveSymbol(query: string): Promise<string | null> {
    const trimmed = query.trim();
    if (/^\d{4}$/.test(trimmed)) return trimmed;

    const lower = trimmed.toLowerCase();
    if (COMMON_ALIASES[lower]) return COMMON_ALIASES[lower];

    try {
        const result = await db.query(
            `SELECT symbol FROM market_tickers WHERE name_en ILIKE $1 OR name_ar ILIKE $1 LIMIT 1`,
            [`%${query}%`]
        );
        if (result.rows.length > 0) return result.rows[0].symbol;
    } catch (e) {
        console.error('Symbol resolution error:', e);
    }
    return null;
}

// ===== TOOLS =====
async function getStockPrice(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT symbol, name_en, last_price, change_percent, volume, last_updated FROM market_tickers WHERE symbol = $1`,
        [resolved]
    );
    return result.rows[0] || null;
}

async function getFundamentals(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT fiscal_year, period_type, raw_data FROM financial_statements WHERE symbol = $1 ORDER BY fiscal_year DESC LIMIT 4`,
        [resolved]
    );
    if (result.rows.length === 0) return null;

    const financials = result.rows.map(row => {
        const raw = typeof row.raw_data === 'string' ? JSON.parse(row.raw_data) : row.raw_data;
        return {
            fiscal_year: row.fiscal_year,
            period: row.period_type,
            net_income: raw?.["صافى الربح"],
            total_assets: raw?.["إجمالي الأصول"],
            total_equity: raw?.["اجمالي حقوق المساهمين مضاف اليها حقوق الاقلية"],
        };
    });
    return { symbol: resolved, financials };
}

async function getMarketSummary() {
    const gainers = await db.query(
        `SELECT symbol, name_en, last_price, change_percent FROM market_tickers ORDER BY change_percent DESC LIMIT 5`
    );
    const losers = await db.query(
        `SELECT symbol, name_en, last_price, change_percent FROM market_tickers ORDER BY change_percent ASC LIMIT 5`
    );
    return { top_gainers: gainers.rows, top_losers: losers.rows };
}

async function getInsiderTrades(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT insider_name, transaction_type, shares, price, transaction_date FROM insider_trading WHERE symbol = $1 ORDER BY transaction_date DESC LIMIT 10`,
        [resolved]
    );
    return { symbol: resolved, trades: result.rows };
}

async function getAnalystConsensus(symbol: string) {
    const resolved = await resolveSymbol(symbol);
    if (!resolved) return null;

    const result = await db.query(
        `SELECT analyst_firm, rating, target_price, rating_date FROM analyst_ratings WHERE symbol = $1 ORDER BY rating_date DESC LIMIT 10`,
        [resolved]
    );
    return { symbol: resolved, ratings: result.rows };
}

async function getTopMovers() {
    const result = await db.query(
        `SELECT symbol, name_en, last_price, change_percent, volume FROM market_tickers ORDER BY ABS(change_percent) DESC LIMIT 10`
    );
    return { movers: result.rows };
}

// ===== TOOL SCHEMA FOR GROQ =====
const TOOLS_SCHEMA = [
    {
        type: "function" as const,
        function: {
            name: "get_stock_price",
            description: "Get current stock price, change %, and volume for a Tadawul symbol",
            parameters: {
                type: "object",
                properties: { symbol: { type: "string", description: "4-digit Tadawul symbol or company name" } },
                required: ["symbol"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_fundamentals",
            description: "Get financial fundamentals: net income, assets, equity",
            parameters: {
                type: "object",
                properties: { symbol: { type: "string", description: "4-digit Tadawul symbol" } },
                required: ["symbol"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_market_summary",
            description: "Get market overview: top gainers, top losers",
            parameters: { type: "object", properties: {}, required: [] }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_insider_trades",
            description: "Get recent insider trading activity for a symbol",
            parameters: {
                type: "object",
                properties: { symbol: { type: "string", description: "4-digit Tadawul symbol" } },
                required: ["symbol"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_analyst_consensus",
            description: "Get analyst ratings and price targets",
            parameters: {
                type: "object",
                properties: { symbol: { type: "string", description: "4-digit Tadawul symbol" } },
                required: ["symbol"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_top_movers",
            description: "Get stocks with biggest price movements today",
            parameters: { type: "object", properties: {}, required: [] }
        }
    }
];

// Tool executor
async function executeTool(name: string, args: any): Promise<any> {
    switch (name) {
        case "get_stock_price": return getStockPrice(args.symbol);
        case "get_fundamentals": return getFundamentals(args.symbol);
        case "get_market_summary": return getMarketSummary();
        case "get_insider_trades": return getInsiderTrades(args.symbol);
        case "get_analyst_consensus": return getAnalystConsensus(args.symbol);
        case "get_top_movers": return getTopMovers();
        default: return null;
    }
}

// ===== MAIN CHAT FUNCTION =====
export async function chatWithAnalyst(message: string, history: { role: string; content: string }[] = []) {
    const apiKey = process.env.GROQ_API_KEY;

    // Debug logging
    console.log('[AI Service] GROQ_API_KEY present:', !!apiKey);
    console.log('[AI Service] GROQ_API_KEY length:', apiKey?.length || 0);
    console.log('[AI Service] All env keys:', Object.keys(process.env).filter(k => k.includes('GROQ') || k.includes('API')));

    if (!apiKey) {
        return { reply: "⚠️ AI service not configured. Set GROQ_API_KEY.", data: null, error: "NO_API_KEY" };
    }

    const messages: any[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-10).map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: "user", content: message }
    ];

    let currentModel = PRIMARY_MODEL;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            if (attempt === 2) currentModel = BACKUP_MODEL;

            console.log(`[AI] Attempt ${attempt + 1} with ${currentModel}`);

            const response = await getGroqClient().chat.completions.create({
                model: currentModel,
                messages,
                tools: TOOLS_SCHEMA,
                tool_choice: "auto",
                temperature: 0.2
            });

            const responseMsg = response.choices[0].message;
            const toolCalls = responseMsg.tool_calls;

            if (toolCalls && toolCalls.length > 0) {
                messages.push(responseMsg);
                const dataPayload: any = {};

                for (const toolCall of toolCalls) {
                    const fnName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments || '{}');
                    const result = await executeTool(fnName, args);

                    dataPayload[fnName] = result;

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result) || "No data found."
                    });
                }

                const finalResponse = await getGroqClient().chat.completions.create({
                    model: currentModel,
                    messages,
                    temperature: 0.5
                });

                return {
                    reply: finalResponse.choices[0].message.content,
                    data: dataPayload,
                    tools_used: toolCalls.map(tc => tc.function.name)
                };
            } else {
                return { reply: responseMsg.content, data: {}, tools_used: [] };
            }
        } catch (e: any) {
            console.error(`[AI] Attempt ${attempt + 1} failed:`, e.message);
            if (attempt === 2) {
                return { reply: "I apologize, but I'm encountering a temporary issue.", data: null, error: e.message };
            }
        }
    }

    return { reply: "Service temporarily unavailable.", data: null, error: "MAX_RETRIES" };
}
