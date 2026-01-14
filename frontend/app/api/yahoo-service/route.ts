import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const y_sym = symbol.toUpperCase().endsWith('.CA') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.CA`;

    // Yahoo Quote Summary Endpoint
    const modules = [
        "summaryDetail", "assetProfile", "financialData", "defaultKeyStatistics",
        "price", "esgScores", "majorHoldersBreakdown", "netSharePurchaseActivity",
        "insiderHolders", "institutionOwnership"
    ].join(",");

    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${y_sym}?modules=${modules}&formatted=false&corsDomain=finance.yahoo.com`;

    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            },
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Yahoo Error ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        const result = data.quoteSummary?.result?.[0];

        if (!result) {
            return NextResponse.json({ error: "No data found" }, { status: 404 });
        }

        // Map Data to match our Frontend Schema
        const mapped = {
            profile: {
                sector: result.assetProfile?.sector,
                industry: result.assetProfile?.industry,
                description: result.assetProfile?.longBusinessSummary,
                website: result.assetProfile?.website,
                market_cap: result.summaryDetail?.marketCap,
                price: result.financialData?.currentPrice,
                volume: result.summaryDetail?.volume,
                avg_vol_10d: result.summaryDetail?.averageDailyVolume10Day,
                avg_vol_3m: result.summaryDetail?.averageVolume,
                bid: result.summaryDetail?.bid,
                ask: result.summaryDetail?.ask,
                year_high: result.summaryDetail?.fiftyTwoWeekHigh,
                year_low: result.summaryDetail?.fiftyTwoWeekLow,
                shares_outstanding: result.defaultKeyStatistics?.sharesOutstanding,
                float_shares: result.defaultKeyStatistics?.floatShares,
                short_ratio: result.defaultKeyStatistics?.shortRatio,
            },
            fundamentals: {
                pe_ratio: result.summaryDetail?.trailingPE,
                forward_pe: result.summaryDetail?.forwardPE,
                dividend_yield: (result.summaryDetail?.dividendYield || 0) * 100,
                payout_ratio: result.summaryDetail?.payoutRatio,
                profit_margin: result.financialData?.profitMargins,
                operating_margin: result.financialData?.operatingMargins,
                return_on_equity: result.financialData?.returnOnEquity,
                debt_to_equity: result.financialData?.debtToEquity,
                current_ratio: result.financialData?.currentRatio,
                free_cash_flow: result.financialData?.freeCashflow,
                audit_risk: result.esgScores?.auditRisk,
                board_risk: result.esgScores?.boardRisk,
                overall_risk: result.esgScores?.totalEsg,
                insider_percent: result.defaultKeyStatistics?.heldPercentInsiders,
                institution_percent: result.defaultKeyStatistics?.heldPercentInstitutions,
            }
        };

        return NextResponse.json(mapped);

    } catch (error) {
        return NextResponse.json({ error: "Proxy Failed" }, { status: 500 });
    }
}
