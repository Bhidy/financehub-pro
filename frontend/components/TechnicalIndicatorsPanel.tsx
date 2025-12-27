"use client";

import { useMemo } from "react";
import { SMA, RSI, MACD, BollingerBands, StochasticRSI, ATR } from "technicalindicators";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface OHLCData {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

interface TechnicalIndicatorsPanelProps {
    data: OHLCData[];
    symbol: string;
}

export function TechnicalIndicatorsPanel({ data, symbol }: TechnicalIndicatorsPanelProps) {
    // Calculate all technical indicators
    const indicators = useMemo(() => {
        if (!data || data.length < 200) {
            return null;
        }

        const closes = data.map(d => d.close);
        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);

        // Moving Averages
        const sma50 = SMA.calculate({ period: 50, values: closes });
        const sma200 = SMA.calculate({ period: 200, values: closes });

        // RSI
        const rsi = RSI.calculate({ period: 14, values: closes });

        // MACD
        const macd = MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });

        // Bollinger Bands
        const bb = BollingerBands.calculate({
            period: 20,
            values: closes,
            stdDev: 2
        });

        // Stochastic RSI
        const stochRSI = StochasticRSI.calculate({
            values: closes,
            rsiPeriod: 14,
            stochasticPeriod: 14,
            kPeriod: 3,
            dPeriod: 3
        });

        // ATR (Average True Range)
        const atr = ATR.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 14
        });

        // Latest values
        const latestClose = closes[closes.length - 1];
        const latestSMA50 = sma50[sma50.length - 1];
        const latestSMA200 = sma200[sma200.length - 1];
        const latestRSI = rsi[rsi.length - 1];
        const latestMACD = macd[macd.length - 1];
        const latestBB = bb[bb.length - 1];
        const latestStochRSI = stochRSI[stochRSI.length - 1];
        const latestATR = atr[atr.length - 1];

        // Calculate signals
        const isBullish = latestClose > latestSMA50 && latestSMA50 > latestSMA200;
        const isOverbought = latestRSI > 70;
        const isOversold = latestRSI < 30;

        // Fix potential undefined for MACD signal
        const macdSignalVal = (latestMACD?.MACD ?? 0) > (latestMACD?.signal ?? 0) ? "BUY" : "SELL";

        const bbPosition =
            (latestBB && latestClose > latestBB.upper) ? "Above Upper Band" :
                (latestBB && latestClose < latestBB.lower) ? "Below Lower Band" :
                    "Within Bands";

        // Prepare chart data (last 100 bars)
        const chartData = data.slice(-100).map((d, index) => {
            const dataIndex = data.length - 100 + index;
            // Safety checks for undefined indices
            const rsiVal = rsi[dataIndex - (data.length - rsi.length)];
            const macdVal = macd[dataIndex - (data.length - macd.length)];

            return {
                time: d.time.split('T')[0],
                close: d.close,
                rsi: rsiVal || null,
                macd: macdVal?.MACD || null,
                signal: macdVal?.signal || null,
                histogram: macdVal?.histogram || null,
            };
        }).filter(d => d.rsi !== null);

        return {
            sma50: latestSMA50,
            sma200: latestSMA200,
            rsi: latestRSI,
            macd: latestMACD,
            bb: latestBB,
            stochRSI: latestStochRSI,
            atr: latestATR,
            signals: {
                trend: isBullish ? "Bullish" : "Bearish",
                rsiState: isOverbought ? "Overbought" : isOversold ? "Oversold" : "Neutral",
                macdSignal: macdSignalVal,
                bbPosition
            },
            chartData
        };
    }, [data]);

    if (!indicators) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <div className="text-slate-400 mb-2">📊</div>
                <p className="text-sm text-slate-500">Need at least 200 data points for technical analysis</p>
                <p className="text-xs text-slate-400 mt-1">Currently: {data?.length || 0} bars</p>
            </div>
        );
    }

    const getSignalColor = (signal: string) => {
        if (signal.includes("Bullish") || signal.includes("BUY") || signal.includes("Oversold")) {
            return "text-emerald-600 bg-emerald-50";
        }
        if (signal.includes("Bearish") || signal.includes("SELL") || signal.includes("Overbought")) {
            return "text-red-600 bg-red-50";
        }
        return "text-slate-600 bg-slate-50";
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Trend Signal */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Trend</div>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg font-bold text-sm ${getSignalColor(indicators.signals.trend)}`}>
                        {indicators.signals.trend === "Bullish" ? "🐂" : "🐻"} {indicators.signals.trend}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                        SMA50 {indicators.sma50 > indicators.sma200 ? ">" : "<"} SMA200
                    </div>
                </div>

                {/* RSI Signal */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">RSI (14)</div>
                    <div className="text-3xl font-bold font-mono text-slate-900 mb-2">
                        {indicators.rsi.toFixed(2)}
                    </div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-lg font-bold text-xs ${getSignalColor(indicators.signals.rsiState)}`}>
                        {indicators.signals.rsiState}
                    </div>
                </div>

                {/* MACD Signal */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">MACD</div>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg font-bold text-sm ${getSignalColor(indicators.signals.macdSignal)}`}>
                        {indicators.signals.macdSignal === "BUY" ? "📈" : "📉"} {indicators.signals.macdSignal}
                    </div>
                    <div className="mt-3 text-xs text-slate-500 font-mono">
                        {indicators.macd?.MACD?.toFixed(2) || "0.00"} / {indicators.macd?.signal?.toFixed(2) || "0.00"}
                    </div>
                </div>

                {/* Bollinger Bands */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Bollinger Bands</div>
                    <div className={`inline-flex items-center px-3 py-1 rounded-lg font-bold text-xs ${getSignalColor(indicators.signals.bbPosition)}`}>
                        {indicators.signals.bbPosition}
                    </div>
                    <div className="mt-3 text-xs text-slate-500 font-mono">
                        {indicators.bb?.lower?.toFixed(2) || "0.00"} - {indicators.bb?.upper?.toFixed(2) || "0.00"}
                    </div>
                </div>
            </div>

            {/* Detailed Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Moving Averages */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="text-lg">📈</span>
                        Moving Averages
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-amber-600">SMA 50</span>
                            <span className="text-sm font-mono font-bold text-slate-900">{indicators.sma50.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-purple-600">SMA 200</span>
                            <span className="text-sm font-mono font-bold text-slate-900">{indicators.sma200.toFixed(2)}</span>
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Position</div>
                            <div className="text-sm font-bold text-slate-900">
                                Price {data[data.length - 1].close > indicators.sma50 ? "above" : "below"} SMA50
                                {indicators.sma50 > indicators.sma200 ? " (Golden Cross)" : " (Death Cross)"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Volatility */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <span className="text-lg">📊</span>
                        Volatility (ATR)
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">ATR (14)</span>
                            <span className="text-sm font-mono font-bold text-slate-900">{indicators.atr.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500">Bollinger Width</span>
                            <span className="text-sm font-mono font-bold text-slate-900">
                                {(indicators.bb && (indicators.bb.upper - indicators.bb.lower).toFixed(2)) || "0.00"}
                            </span>
                        </div>
                        <div className="pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">Interpretation</div>
                            <div className="text-sm font-bold text-slate-900">
                                {indicators.atr > 2 ? "High Volatility" : indicators.atr > 1 ? "Moderate" : "Low Volatility"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* RSI Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">RSI (14) - Last 100 Bars</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={indicators.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    fontSize: "12px"
                                }}
                            />
                            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Overbought", fontSize: 10 }} />
                            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Oversold", fontSize: 10 }} />
                            <Line type="monotone" dataKey="rsi" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* MACD Chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">MACD - Last 100 Bars</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={indicators.chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "white",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    fontSize: "12px"
                                }}
                            />
                            <ReferenceLine y={0} stroke="#64748b" />
                            <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD" />
                            <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false} name="Signal" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-2">Technical Analysis Summary for {symbol}</h4>
                        <ul className="text-xs text-slate-600 space-y-1">
                            <li>• <strong>Trend:</strong> {indicators.signals.trend} based on SMA crossover</li>
                            <li>• <strong>Momentum:</strong> RSI at {indicators.rsi.toFixed(2)} ({indicators.signals.rsiState})</li>
                            <li>• <strong>Signal:</strong> MACD showing {indicators.signals.macdSignal} signal</li>
                            <li>• <strong>Volatility:</strong> ATR at {indicators.atr.toFixed(2)} (14-period)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
