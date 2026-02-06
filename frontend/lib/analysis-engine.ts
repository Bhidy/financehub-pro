import {
    Ticker,
    PortfolioHolding,
    OHLC
} from "./api";

// ===========================================
// TYPES & INTERFACES
// ===========================================

export interface AnalysisScore {
    value: number;   // 0-6
    future: number;  // 0-6
    past: number;    // 0-6
    health: number;  // 0-6
    dividend: number;// 0-6
    total: number;   // 0-30
}

export interface AnalysisCheck {
    id: string;
    label: string;
    passed: boolean; // green vs red
    value: string | number;
    benchmark?: string | number;
    message: string;
}

export interface StockAnalysisResult {
    symbol: string;
    scores: AnalysisScore;
    checks: AnalysisCheck[]; // All 30 checks
    summary: string; // "Undervalued with high growth potential"
    color: string; // #ff5252 (Red), #ffca28 (Amber), #00e676 (Green)
}

export interface PortfolioAnalysisResult {
    snowflake: AnalysisScore; // Weighted average
    risk: {
        beta: number; // Portfolio Beta
        volatility: number; // Std Dev
        sharpeRatio: number;
    };
    diversification: {
        sectorHHI: number; // Herfindahl-Hirschman Index
        topSectors: { name: string; percent: number }[];
    };
    forecast: {
        expectedReturn3Y: number;
        projectedValue3Y: number;
    };
}

// ===========================================
// HELPERS
// ===========================================

const calculateCAGR = (start: number, end: number, years: number) => {
    if (start <= 0 || end <= 0) return 0;
    return (Math.pow(end / start, 1 / years) - 1) * 100;
};

// ===========================================
// STOCK ANALYSIS ENGINE
// ===========================================

export class AnalysisEngine {

    /**
     * Master function to analyze a single stock
     */
    static analyzeStock(
        ticker: Ticker,
        ratios: any,
        financials: any[],
        fairValue: any,
        dividends: any[]
    ): StockAnalysisResult {

        const checks: AnalysisCheck[] = [];
        const scores = { value: 0, future: 0, past: 0, health: 0, dividend: 0, total: 0 };

        // 1. VALUATION (0-6)
        // ------------------------------------------
        // Check 1: PE vs Industry
        const pe = Number(ratios?.pe_ratio || 0);
        const industryPe = 18.5; // Benchmark (should ideally come from sector API)
        if (pe > 0 && pe < industryPe) { scores.value++; checks.push({ id: 'v1', label: 'PE vs Industry', passed: true, value: pe.toFixed(1), benchmark: industryPe, message: 'Good value compared to industry' }); }
        else { checks.push({ id: 'v1', label: 'PE vs Industry', passed: false, value: pe.toFixed(1), benchmark: industryPe, message: 'Expensive compared to industry' }); }

        // Check 2: PE vs Market
        const marketPe = 22.0; // EGX/TASI Market Average
        if (pe > 0 && pe < marketPe) { scores.value++; checks.push({ id: 'v2', label: 'PE vs Market', passed: true, value: pe.toFixed(1), benchmark: marketPe, message: 'Good value compared to market' }); }
        else { checks.push({ id: 'v2', label: 'PE vs Market', passed: false, value: pe.toFixed(1), benchmark: marketPe, message: 'Expensive compared to market' }); }

        // Check 3: PEG Ratio (PE / Growth)
        const peg = Number(ratios?.peg_ratio || 0);
        if (peg > 0 && peg < 1) { scores.value++; checks.push({ id: 'v3', label: 'PEG Ratio', passed: true, value: peg.toFixed(1), benchmark: 1, message: 'Good value based on growth' }); }
        else { checks.push({ id: 'v3', label: 'PEG Ratio', passed: false, value: peg.toFixed(1), benchmark: 1, message: 'Poor value based on growth' }); }

        // Check 4: PB Ratio
        const pb = Number(ratios?.pb_ratio || 0);
        if (pb > 0 && pb < 3) { scores.value++; checks.push({ id: 'v4', label: 'PB Ratio', passed: true, value: pb.toFixed(1), benchmark: 3, message: 'Trading below fair book value' }); }
        else { checks.push({ id: 'v4', label: 'PB Ratio', passed: false, value: pb.toFixed(1), benchmark: 3, message: 'High Price-to-Book ratio' }); }

        // Check 5: DCF (Fair Value)
        const dcfValue = Number(fairValue?.fair_value || 0);
        const currentPrice = Number(ticker.last_price || 0);
        if (dcfValue > currentPrice) { scores.value += 2; checks.push({ id: 'v5', label: 'Discounted Cash Flow', passed: true, value: currentPrice, benchmark: dcfValue, message: `${((dcfValue - currentPrice) / currentPrice * 100).toFixed(0)}% Undervalued` }); }
        else { checks.push({ id: 'v5', label: 'Discounted Cash Flow', passed: false, value: currentPrice, benchmark: dcfValue, message: 'Overvalued based on DCF' }); }

        // 2. FUTURE GROWTH (0-6)
        // ------------------------------------------
        // Simple mock for growth logic (normally requires analyst estimates)
        const revGrowth = Number(ratios?.revenue_growth || 0);
        const netIncomeGrowth = Number(ratios?.net_income_growth || 0);

        if (revGrowth > 10) scores.future++;
        if (revGrowth > 20) scores.future++;
        if (netIncomeGrowth > 10) scores.future++;
        if (netIncomeGrowth > 20) scores.future++;
        if (Number(ratios?.roe || 0) > 15) scores.future += 2; // ROE as proxy for future efficiency

        // 3. PAST PERFORMANCE (0-6)
        // ------------------------------------------
        // Historical check from financials array
        if (financials.length > 3) {
            const latest = financials[0];
            const old = financials[financials.length - 1];
            const years = financials.length; // Approximate

            const earningsCagr = calculateCAGR(Number(old.net_income), Number(latest.net_income), years);
            if (earningsCagr > 0) scores.past++;
            if (earningsCagr > 10) scores.past++;
            if (earningsCagr > 20) scores.past++;

            const roe = Number(latest.total_equity) > 0 ? (Number(latest.net_income) / Number(latest.total_equity)) * 100 : 0;
            if (roe > 10) scores.past++;
            if (roe > 20) scores.past++;
            if (Number(latest.net_income) > 0) scores.past++; // Profitable
        }

        // 4. FINANCIAL HEALTH (0-6)
        // ------------------------------------------
        const de = Number(ratios?.debt_to_equity || 0);
        if (de < 40) scores.health += 2;
        else if (de < 100) scores.health += 1;

        const currentRatio = Number(ratios?.current_ratio || 0);
        if (currentRatio > 1.5) scores.health += 2;
        else if (currentRatio > 1) scores.health += 1;

        // Cash runway proxy (Cash vs Operating Expense)
        // Assuming we don't have full OPEX, we use Quick Ratio
        const quickRatio = Number(ratios?.quick_ratio || 0);
        if (quickRatio > 1) scores.health += 2;

        // 5. DIVIDEND (0-6) (Only if paying)
        // ------------------------------------------
        const yieldVal = Number(ratios?.dividend_yield || 0);
        if (yieldVal > 0) {
            if (yieldVal > 2) scores.dividend += 2; // Decent yield
            else scores.dividend += 1;

            if (yieldVal > 4) scores.dividend += 1; // High yield

            // Payout Ratio check
            const payout = Number(ratios?.payout_ratio || 0);
            if (payout > 0 && payout < 80) scores.dividend += 3; // Sustainable
        } else {
            // Non-paying stocks get 0 for dividend
        }

        // TOTAL & SUMMARY
        scores.total = scores.value + scores.future + scores.past + scores.health + scores.dividend;

        // Generate Color
        let color = "#ff5252"; // Red
        if (scores.total > 10) color = "#ffca28"; // Amber
        if (scores.total > 18) color = "#00e676"; // Green

        // Generate Summary
        let summary = "Analysis shows accurate data is required.";
        if (scores.value > 4 && scores.future > 4) summary = "Undervalued gem with high growth potential.";
        else if (scores.value > 4 && scores.health > 4) summary = "Solid value investment with healthy fundamentals.";
        else if (scores.future > 4) summary = "High growth stock, possibly trading at a premium.";
        else if (scores.dividend > 4 && scores.health > 3) summary = "Reliable dividend payer with good health.";
        else if (scores.total < 8) summary = "High risk assessment. Fundamentals look weak.";

        return { symbol: ticker.symbol, scores, checks, summary, color };
    }

    /**
     * Master function to analyze a portfolio
     */
    static analyzePortfolio(
        portfolioHoldings: PortfolioHolding[],
        scoreMap: Record<string, AnalysisScore>, // Pre-calculated scores for each stock in portfolio
        marketHistory: OHLC[] = []
    ): PortfolioAnalysisResult {

        let totalValue = 0;
        const weightedScores = { value: 0, future: 0, past: 0, health: 0, dividend: 0, total: 0 };
        const sectorExposure: Record<string, number> = {};

        // 1. Calculate Weights & Aggregate Snowflake
        portfolioHoldings.forEach(h => {
            const value = h.quantity * h.current_price;
            totalValue += value;
        });

        portfolioHoldings.forEach(h => {
            const weight = (h.quantity * h.current_price) / (totalValue || 1);
            const s = scoreMap[h.symbol] || { value: 0, future: 0, past: 0, health: 0, dividend: 0, total: 0 };

            weightedScores.value += s.value * weight;
            weightedScores.future += s.future * weight;
            weightedScores.past += s.past * weight;
            weightedScores.health += s.health * weight;
            weightedScores.dividend += s.dividend * weight;
            weightedScores.total += s.total * weight;

            // Sector
            const sector = h.sector || "Unknown";
            sectorExposure[sector] = (sectorExposure[sector] || 0) + weight;
        });

        // 2. Diversification (HHI Index)
        let hhi = 0;
        const topSectors = Object.entries(sectorExposure)
            .sort((a, b) => b[1] - a[1])
            .map(([name, percent]) => {
                hhi += Math.pow(percent * 100, 2); // HHI calculation
                return { name, percent: percent * 100 };
            });

        // HHI Guide: < 1500 (Diverse), 1500-2500 (Moderate), > 2500 (Concentrated)

        // 3. Risk (Beta) - Weighted Average
        // Mocking Beta per stock as it requires API data, assume 1.1 for now if missing
        const portfolioBeta = 1.15; // Placeholder for logic requiring external Beta data provided key

        // 4. Forecast returns (Mock 8% growth based on weighted Future Score)
        const expectedReturnRate = 0.05 + (weightedScores.future / 6) * 0.10; // Base 5% + up to 10% bonus
        const projectedValue3Y = totalValue * Math.pow(1 + expectedReturnRate, 3);

        return {
            snowflake: weightedScores,
            risk: {
                beta: portfolioBeta,
                volatility: 12.5, // Mock volatility
                sharpeRatio: 1.2
            },
            diversification: {
                sectorHHI: hhi,
                topSectors
            },
            forecast: {
                expectedReturn3Y: expectedReturnRate * 100,
                projectedValue3Y
            }
        };
    }
}
