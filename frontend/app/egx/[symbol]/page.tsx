'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================
interface StockData {
    symbol: string;
    name_en: string;
    name_ar?: string;
    sector_name: string;
    market_code: string;
    currency: string;
    market_cap: number;
    last_price: number;
    change: number;
    change_percent: number;
    volume: number;
    pe_ratio: number;
    pb_ratio: number;
    dividend_yield: number;
    high: number;
    low: number;
    open_price: number;
    prev_close: number;
    last_updated: string;
}

interface StatisticsData {
    // Valuation
    pe_ratio: number;
    forward_pe: number;
    ps_ratio: number;
    pb_ratio: number;
    peg_ratio: number;
    p_fcf: number;
    p_ocf: number;
    // Enterprise
    enterprise_value: number;
    ev_ebitda: number;
    ev_sales: number;
    // Efficiency
    roe: number;
    roa: number;
    roic: number;
    roce: number;
    asset_turnover: number;
    // Margins
    gross_margin: number;
    operating_margin: number;
    profit_margin: number;
    ebitda_margin: number;
    fcf_margin: number;
    // Financial Health
    current_ratio: number;
    quick_ratio: number;
    debt_equity: number;
    debt_ebitda: number;
    interest_coverage: number;
    // Technical
    beta_5y: number;
    rsi_14: number;
    ma_50d: number;
    ma_200d: number;
    // TTM
    revenue_ttm: number;
    net_income_ttm: number;
    eps_ttm: number;
    fcf_ttm: number;
    // Dividends
    dividend_yield: number;
    payout_ratio: number;
    earnings_yield: number;
    fcf_yield: number;
    // Share Stats
    shares_outstanding: number;
    float_shares: number;
    insider_ownership: number;
    institutional_ownership: number;
}

interface DividendData {
    ex_date: string;
    dividend_amount: number;
    record_date?: string;
    pay_date?: string;
    currency: string;
}

interface OHLCData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// ============================================================================
// HELPERS
// ============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

const formatNumber = (num: number | null | undefined, decimals = 2): string => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatPercent = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
};

const formatLargeNumber = (num: number | null | undefined): string => {
    if (!num) return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Score Gauge Component
const ScoreGauge = ({ value, max = 100, label, color = 'emerald' }: { value: number; max?: number; label: string; color?: string }) => {
    const percent = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (percent / 100) * circumference;
    const colors = {
        emerald: 'stroke-emerald-500',
        blue: 'stroke-blue-500',
        amber: 'stroke-amber-500',
        red: 'stroke-red-500'
    };

    return (
        <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
            <svg className="w-24 h-24 -rotate-90 transform">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-slate-700" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none"
                    className={colors[color as keyof typeof colors] || colors.emerald}
                    strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
            </svg>
            <span className="text-2xl font-bold text-white -mt-16">{formatNumber(value, 0)}</span>
            <span className="text-xs text-slate-400 mt-10">{label}</span>
        </div>
    );
};

// Metric Card Component
const MetricCard = ({ label, value, suffix = '', trend }: { label: string; value: string; suffix?: string; trend?: 'up' | 'down' | null }) => (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/60 rounded-xl p-4 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
        <p className="text-slate-400 text-xs uppercase tracking-wider font-medium">{label}</p>
        <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-white">{value}</span>
            {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
            {trend === 'up' && <span className="text-emerald-400 text-sm ml-1">▲</span>}
            {trend === 'down' && <span className="text-red-400 text-sm ml-1">▼</span>}
        </div>
    </div>
);

// Progress Bar for Margins
const MarginBar = ({ label, value, color = 'emerald' }: { label: string; value: number | null; color?: string }) => {
    const percent = value ? Math.min(value * 100, 100) : 0;
    const colors = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        amber: 'bg-amber-500',
        teal: 'bg-teal-500'
    };
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-slate-400">{label}</span>
                <span className="text-white font-medium">{value ? formatPercent(value) : 'N/A'}</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full ${colors[color as keyof typeof colors]} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(percent, 0)}%` }} />
            </div>
        </div>
    );
};

// Tab Button Component
const TabButton = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) => (
    <button onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${active
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}>
        <span>{icon}</span>
        <span className="hidden sm:inline">{label}</span>
    </button>
);

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

// Overview Tab
const OverviewTab = ({ stock, stats, ohlc }: { stock: StockData; stats: StatisticsData | null; ohlc: OHLCData[] }) => {
    const weekHigh = useMemo(() => Math.max(...(ohlc.slice(0, 252).map(d => d.high || 0).filter(h => h > 0) || [0])), [ohlc]);
    const weekLow = useMemo(() => Math.min(...(ohlc.slice(0, 252).filter(d => d.low > 0).map(d => d.low) || [0])), [ohlc]);

    // Calculate scores based on metrics
    const valuationScore = stats?.pe_ratio && stats.pe_ratio > 0 && stats.pe_ratio < 20 ? 85 : stats?.pe_ratio && stats.pe_ratio < 30 ? 70 : 50;
    const healthScore = stats?.current_ratio && stats.current_ratio > 1.5 ? 85 : stats?.current_ratio && stats.current_ratio > 1 ? 70 : 50;
    const profitScore = stats?.roe && stats.roe > 0.15 ? 90 : stats?.roe && stats.roe > 0.08 ? 70 : 50;

    return (
        <div className="space-y-6">
            {/* Hero Price Section */}
            <div className="bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-blue-900/20 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-slate-400 text-sm mb-1">Current Price</p>
                        <p className="text-5xl font-bold text-white">
                            {formatNumber(stock.last_price)}
                            <span className="text-xl text-slate-400 ml-2">EGP</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${stock.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stock.change_percent >= 0 ? '+' : ''}{formatNumber(stock.change_percent)}%
                        </div>
                        <p className="text-slate-400 text-sm mt-1">
                            {stock.change_percent >= 0 ? '+' : ''}{formatNumber(stock.change)} EGP today
                        </p>
                    </div>
                </div>

                {/* Mini Sparkline */}
                {ohlc.length > 0 && (
                    <div className="mt-4 h-16 flex items-end gap-0.5">
                        {[...ohlc].reverse().slice(-60).map((d, i) => {
                            const prices = ohlc.map(x => x.close).filter(x => x > 0);
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            const range = max - min || 1;
                            const height = ((d.close - min) / range) * 100;
                            return (
                                <div key={i} className={`rounded-t ${d.close >= (ohlc[i - 1]?.close || d.close) ? 'bg-emerald-500/60' : 'bg-red-500/60'}`}
                                    style={{ height: `${Math.max(height, 5)}%`, flex: 1 }} />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <MetricCard label="Market Cap" value={formatLargeNumber(stock.market_cap)} suffix="EGP" />
                <MetricCard label="P/E Ratio" value={formatNumber(stats?.pe_ratio || stock.pe_ratio, 1)} />
                <MetricCard label="P/B Ratio" value={formatNumber(stats?.pb_ratio || stock.pb_ratio, 1)} />
                <MetricCard label="ROE" value={stats?.roe ? formatPercent(stats.roe) : 'N/A'} />
                <MetricCard label="52W High" value={formatNumber(weekHigh)} suffix="EGP" />
                <MetricCard label="52W Low" value={formatNumber(weekLow)} suffix="EGP" />
                <MetricCard label="Dividend Yield" value={stats?.dividend_yield ? formatPercent(stats.dividend_yield) : (stock.dividend_yield ? `${formatNumber(stock.dividend_yield)}%` : 'N/A')} />
                <MetricCard label="Volume" value={formatLargeNumber(stock.volume)} />
                <MetricCard label="Beta" value={formatNumber(stats?.beta_5y, 2)} />
                <MetricCard label="Open" value={formatNumber(stock.open_price)} suffix="EGP" />
                <MetricCard label="Prev Close" value={formatNumber(stock.prev_close)} suffix="EGP" />
                <MetricCard label="EPS (TTM)" value={formatNumber(stats?.eps_ttm, 2)} suffix="EGP" />
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-900/20 to-slate-800/50 rounded-xl p-5 border border-emerald-700/30">
                    <h3 className="text-emerald-400 font-semibold mb-3">🎯 Valuation Score</h3>
                    <ScoreGauge value={valuationScore} label="PE + PB Combined" color="emerald" />
                </div>
                <div className="bg-gradient-to-br from-blue-900/20 to-slate-800/50 rounded-xl p-5 border border-blue-700/30">
                    <h3 className="text-blue-400 font-semibold mb-3">💪 Financial Health</h3>
                    <ScoreGauge value={healthScore} label="Liquidity & Solvency" color="blue" />
                </div>
                <div className="bg-gradient-to-br from-amber-900/20 to-slate-800/50 rounded-xl p-5 border border-amber-700/30">
                    <h3 className="text-amber-400 font-semibold mb-3">📈 Profitability</h3>
                    <ScoreGauge value={profitScore} label="ROE & Margins" color="amber" />
                </div>
            </div>
        </div>
    );
};

// Statistics Tab
const StatisticsTab = ({ stats }: { stats: StatisticsData | null }) => {
    if (!stats) {
        return (
            <div className="text-center py-12">
                <span className="text-5xl block mb-4">📊</span>
                <p className="text-slate-400">No statistics available</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Valuation Ratios */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    💰 <span>Valuation Ratios</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="P/E Ratio" value={formatNumber(stats.pe_ratio, 2)} />
                    <MetricCard label="Forward P/E" value={formatNumber(stats.forward_pe, 2)} />
                    <MetricCard label="P/B Ratio" value={formatNumber(stats.pb_ratio, 2)} />
                    <MetricCard label="P/S Ratio" value={formatNumber(stats.ps_ratio, 2)} />
                    <MetricCard label="PEG Ratio" value={formatNumber(stats.peg_ratio, 2)} />
                    <MetricCard label="P/FCF" value={formatNumber(stats.p_fcf, 2)} />
                    <MetricCard label="EV/EBITDA" value={formatNumber(stats.ev_ebitda, 2)} />
                    <MetricCard label="EV/Sales" value={formatNumber(stats.ev_sales, 2)} />
                </div>
            </div>

            {/* Efficiency Metrics */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    ⚡ <span>Financial Efficiency</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="ROE" value={formatPercent(stats.roe)} trend={stats.roe && stats.roe > 0.15 ? 'up' : null} />
                    <MetricCard label="ROA" value={formatPercent(stats.roa)} />
                    <MetricCard label="ROIC" value={formatPercent(stats.roic)} />
                    <MetricCard label="ROCE" value={formatPercent(stats.roce)} />
                    <MetricCard label="Asset Turnover" value={formatNumber(stats.asset_turnover, 2)} />
                    <MetricCard label="Earnings Yield" value={formatPercent(stats.earnings_yield)} />
                    <MetricCard label="FCF Yield" value={formatPercent(stats.fcf_yield)} />
                </div>
            </div>

            {/* Margins */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📊 <span>Profit Margins</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <MarginBar label="Gross Margin" value={stats.gross_margin} color="emerald" />
                        <MarginBar label="Operating Margin" value={stats.operating_margin} color="blue" />
                        <MarginBar label="Profit Margin" value={stats.profit_margin} color="teal" />
                    </div>
                    <div className="space-y-4">
                        <MarginBar label="EBITDA Margin" value={stats.ebitda_margin} color="amber" />
                        <MarginBar label="FCF Margin" value={stats.fcf_margin} color="emerald" />
                    </div>
                </div>
            </div>

            {/* Financial Health */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    ⚖️ <span>Financial Health</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Current Ratio" value={formatNumber(stats.current_ratio, 2)} trend={stats.current_ratio && stats.current_ratio > 1.5 ? 'up' : stats.current_ratio && stats.current_ratio < 1 ? 'down' : null} />
                    <MetricCard label="Quick Ratio" value={formatNumber(stats.quick_ratio, 2)} />
                    <MetricCard label="Debt/Equity" value={formatNumber(stats.debt_equity, 2)} trend={stats.debt_equity && stats.debt_equity > 2 ? 'down' : null} />
                    <MetricCard label="Debt/EBITDA" value={formatNumber(stats.debt_ebitda, 2)} />
                    <MetricCard label="Interest Coverage" value={formatNumber(stats.interest_coverage, 2)} />
                </div>
            </div>

            {/* Technical Indicators */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📉 <span>Technical Indicators</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Beta (5Y)" value={formatNumber(stats.beta_5y, 2)} />
                    <MetricCard label="RSI (14)" value={formatNumber(stats.rsi_14, 0)} />
                    <MetricCard label="MA 50D" value={formatNumber(stats.ma_50d, 2)} />
                    <MetricCard label="MA 200D" value={formatNumber(stats.ma_200d, 2)} />
                </div>
            </div>
        </div>
    );
};

// Dividends Tab
const DividendsTab = ({ dividends, symbol }: { dividends: DividendData[]; symbol: string }) => {
    // Calculate totals
    const totalDividends = dividends.reduce((sum, d) => sum + (d.dividend_amount || 0), 0);
    const latestDividend = dividends[0]?.dividend_amount || 0;
    const avgDividend = dividends.length > 0 ? totalDividends / dividends.length : 0;

    // Group by year for chart
    const yearlyData = useMemo(() => {
        const grouped: { [year: string]: number } = {};
        dividends.forEach(d => {
            const year = new Date(d.ex_date).getFullYear().toString();
            grouped[year] = (grouped[year] || 0) + (d.dividend_amount || 0);
        });
        return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    }, [dividends]);

    if (dividends.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <span className="text-5xl block mb-4">💰</span>
                <p className="text-slate-400 text-lg">No dividend history for {symbol}</p>
                <p className="text-slate-500 text-sm mt-2">This stock may not pay dividends</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-emerald-900/30 to-slate-800/50 rounded-xl p-5 border border-emerald-700/30">
                    <p className="text-emerald-400 text-sm font-medium">Latest Dividend</p>
                    <p className="text-3xl font-bold text-white mt-2">{formatNumber(latestDividend)} <span className="text-lg text-slate-400">EGP</span></p>
                    <p className="text-slate-400 text-xs mt-1">{dividends[0]?.ex_date}</p>
                </div>
                <div className="bg-gradient-to-r from-blue-900/30 to-slate-800/50 rounded-xl p-5 border border-blue-700/30">
                    <p className="text-blue-400 text-sm font-medium">Total Dividends</p>
                    <p className="text-3xl font-bold text-white mt-2">{formatNumber(totalDividends)} <span className="text-lg text-slate-400">EGP</span></p>
                    <p className="text-slate-400 text-xs mt-1">{dividends.length} payments</p>
                </div>
                <div className="bg-gradient-to-r from-amber-900/30 to-slate-800/50 rounded-xl p-5 border border-amber-700/30">
                    <p className="text-amber-400 text-sm font-medium">Average Payment</p>
                    <p className="text-3xl font-bold text-white mt-2">{formatNumber(avgDividend)} <span className="text-lg text-slate-400">EGP</span></p>
                    <p className="text-slate-400 text-xs mt-1">Per distribution</p>
                </div>
            </div>

            {/* Yearly Chart */}
            {yearlyData.length > 1 && (
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <h3 className="text-white font-semibold mb-4">Annual Dividend Trend</h3>
                    <div className="flex items-end gap-2 h-40">
                        {yearlyData.map(([year, amount]) => {
                            const maxAmount = Math.max(...yearlyData.map(d => d[1] as number));
                            const height = (amount / maxAmount) * 100;
                            return (
                                <div key={year} className="flex-1 flex flex-col items-center">
                                    <div className="w-full bg-emerald-500/80 rounded-t transition-all hover:bg-emerald-400"
                                        style={{ height: `${height}%`, minHeight: '8px' }} />
                                    <span className="text-xs text-slate-400 mt-2">{year}</span>
                                    <span className="text-xs text-white font-medium">{formatNumber(amount, 2)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 flex justify-between items-center">
                    <h3 className="text-white font-semibold">Payment History</h3>
                    <button onClick={() => {
                        const csv = ['Ex-Date,Amount,Record Date,Pay Date', ...dividends.map(d =>
                            `${d.ex_date},${d.dividend_amount},${d.record_date || ''},${d.pay_date || ''}`
                        )].join('\n');
                        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `${symbol}_dividends.csv`;
                        link.click();
                    }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition">
                        📊 Export
                    </button>
                </div>
                <table className="w-full">
                    <thead className="bg-slate-900/50">
                        <tr className="text-slate-400 text-xs uppercase tracking-wider">
                            <th className="py-3 px-4 text-left">Ex-Date</th>
                            <th className="py-3 px-4 text-right">Amount</th>
                            <th className="py-3 px-4 text-left hidden md:table-cell">Record Date</th>
                            <th className="py-3 px-4 text-left hidden md:table-cell">Pay Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {dividends.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-800/50 transition">
                                <td className="py-3 px-4 text-slate-300">{d.ex_date}</td>
                                <td className="py-3 px-4 text-right text-emerald-400 font-semibold">{formatNumber(d.dividend_amount)} EGP</td>
                                <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{d.record_date || '-'}</td>
                                <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{d.pay_date || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// History Tab (Price History)
const HistoryTab = ({ ohlc, symbol }: { ohlc: OHLCData[]; symbol: string }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Price History ({ohlc.length} trading days)</h3>
            <button onClick={() => {
                const csv = ['Date,Open,High,Low,Close,Volume', ...ohlc.map(d =>
                    `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`
                )].join('\n');
                const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${symbol}_history.csv`;
                link.click();
            }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition flex items-center gap-2">
                📊 Export to Excel
            </button>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full">
                <thead className="bg-slate-900/80 sticky top-0">
                    <tr className="text-slate-400 text-xs uppercase tracking-wider">
                        <th className="py-3 px-4 text-left">Date</th>
                        <th className="py-3 px-4 text-right">Open</th>
                        <th className="py-3 px-4 text-right">High</th>
                        <th className="py-3 px-4 text-right">Low</th>
                        <th className="py-3 px-4 text-right">Close</th>
                        <th className="py-3 px-4 text-right">Volume</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                    {ohlc.slice(0, 100).map((d, i) => (
                        <tr key={i} className="hover:bg-slate-800/50 text-sm">
                            <td className="py-2 px-4 text-slate-300">{d.date}</td>
                            <td className="py-2 px-4 text-right text-slate-400">{formatNumber(d.open)}</td>
                            <td className="py-2 px-4 text-right text-emerald-400">{formatNumber(d.high)}</td>
                            <td className="py-2 px-4 text-right text-red-400">{formatNumber(d.low)}</td>
                            <td className="py-2 px-4 text-right text-white font-medium">{formatNumber(d.close)}</td>
                            <td className="py-2 px-4 text-right text-slate-400">{d.volume?.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// Profile Tab
const ProfileTab = ({ stock }: { stock: StockData }) => (
    <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-4">Company Overview</h3>
            <p className="text-slate-300 leading-relaxed">
                {stock.name_en} is a company listed on the Egyptian Stock Exchange (EGX) under the symbol {stock.symbol},
                operating in the {stock.sector_name || 'Financial Services'} sector. The company trades in Egyptian Pounds (EGP)
                and has a market capitalization of {formatLargeNumber(stock.market_cap)} EGP.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
                { label: 'Symbol', value: stock.symbol },
                { label: 'Name', value: stock.name_en },
                { label: 'Arabic Name', value: stock.name_ar || 'N/A' },
                { label: 'Sector', value: stock.sector_name || 'N/A' },
                { label: 'Exchange', value: 'Egyptian Stock Exchange (EGX)' },
                { label: 'Currency', value: 'EGP (Egyptian Pound)' },
                { label: 'Market Cap', value: formatLargeNumber(stock.market_cap) + ' EGP' },
                { label: 'Last Updated', value: stock.last_updated ? new Date(stock.last_updated).toLocaleString() : 'N/A' },
            ].map((item, i) => (
                <div key={i} className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
                    <p className="text-slate-500 text-xs uppercase tracking-wider">{item.label}</p>
                    <p className="text-white mt-1 font-medium">{item.value}</p>
                </div>
            ))}
        </div>
    </div>
);

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function EGXStockProfilePage() {
    const params = useParams();
    const symbol = (params?.symbol as string)?.toUpperCase() || '';

    const [stock, setStock] = useState<StockData | null>(null);
    const [stats, setStats] = useState<StatisticsData | null>(null);
    const [ohlc, setOhlc] = useState<OHLCData[]>([]);
    const [dividends, setDividends] = useState<DividendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!symbol) return;

        const loadData = async () => {
            setLoading(true);

            try {
                // Parallel fetch all data
                const [stockRes, statsRes, ohlcRes, divRes] = await Promise.allSettled([
                    fetch(`${API_BASE}/api/v1/egx/statistics/${symbol}`).then(r => r.ok ? r.json() : null),
                    fetch(`${API_BASE}/api/v1/egx/statistics/${symbol}`).then(r => r.ok ? r.json() : null),
                    fetch(`${API_BASE}/api/v1/egx/ohlc/${symbol}?limit=500`).then(r => r.ok ? r.json() : []),
                    fetch(`${API_BASE}/api/v1/egx/dividends/${symbol}`).then(r => r.ok ? r.json() : [])
                ]);

                // Also fetch basic stock info
                const basicRes = await fetch(`${API_BASE}/api/v1/egx/stock/${symbol}`);
                if (basicRes.ok) setStock(await basicRes.json());

                if (statsRes.status === 'fulfilled' && statsRes.value) setStats(statsRes.value);
                if (ohlcRes.status === 'fulfilled') setOhlc(ohlcRes.value || []);
                if (divRes.status === 'fulfilled') setDividends(divRes.value || []);

            } catch (e) {
                console.error('Error loading data:', e);
            }

            setLoading(false);
        };

        loadData();
    }, [symbol]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-500/20 border-t-blue-500 mx-auto" />
                        <span className="absolute inset-0 flex items-center justify-center text-2xl">📊</span>
                    </div>
                    <p className="text-slate-400 mt-6 text-lg">Loading {symbol}...</p>
                </div>
            </div>
        );
    }

    if (!stock) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <span className="text-7xl block mb-6">🔍</span>
                    <h1 className="text-3xl font-bold text-white mb-2">Stock Not Found</h1>
                    <p className="text-slate-400 mb-6">{symbol} is not available in the EGX market</p>
                    <Link href="/egx" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition">
                        ← Back to EGX Market
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-emerald-900/30 via-slate-800/80 to-blue-900/30 border-b border-slate-700/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                        <Link href="/egx" className="hover:text-blue-400 transition">🇪🇬 EGX</Link>
                        <span>/</span>
                        <span className="text-white font-medium">{symbol}</span>
                    </div>

                    {/* Title Row */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl sm:text-4xl font-bold text-white">{symbol}</h1>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${stock.change_percent >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {stock.change_percent >= 0 ? '▲' : '▼'} {Math.abs(stock.change_percent).toFixed(2)}%
                                </span>
                            </div>
                            <p className="text-slate-400 mt-1 text-lg">{stock.name_en}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full">
                                {stock.sector_name || 'EGX'}
                            </span>
                        </div>

                        <div className="text-right">
                            <p className="text-4xl sm:text-5xl font-bold text-white">
                                {formatNumber(stock.last_price)}
                                <span className="text-xl text-slate-400 ml-2">EGP</span>
                            </p>
                            <p className={`text-xl font-semibold mt-1 ${stock.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {stock.change_percent >= 0 ? '+' : ''}{formatNumber(stock.change_percent)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                <div className="flex flex-wrap gap-2 bg-slate-800/40 p-2 rounded-xl border border-slate-700/50 backdrop-blur-sm overflow-x-auto">
                    {[
                        { id: 'overview', icon: '📊', label: 'Overview' },
                        { id: 'statistics', icon: '📋', label: 'Statistics' },
                        { id: 'dividends', icon: '💰', label: 'Dividends' },
                        { id: 'history', icon: '📈', label: 'History' },
                        { id: 'profile', icon: '🏢', label: 'Profile' },
                    ].map(tab => (
                        <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} icon={tab.icon} label={tab.label} />
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {activeTab === 'overview' && <OverviewTab stock={stock} stats={stats} ohlc={ohlc} />}
                {activeTab === 'statistics' && <StatisticsTab stats={stats} />}
                {activeTab === 'dividends' && <DividendsTab dividends={dividends} symbol={symbol} />}
                {activeTab === 'history' && <HistoryTab ohlc={ohlc} symbol={symbol} />}
                {activeTab === 'profile' && <ProfileTab stock={stock} />}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center border-t border-slate-800">
                <p className="text-slate-500 text-sm">
                    Last Updated: {stock.last_updated ? new Date(stock.last_updated).toLocaleString() : 'N/A'} • Data from Egyptian Stock Exchange
                </p>
            </div>
        </div>
    );
}
