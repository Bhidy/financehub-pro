'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';

// ============================================================================
// TYPES
// ============================================================================
interface StockData {
    symbol: string; name_en: string; name_ar?: string; sector_name: string;
    market_code: string; currency: string; market_cap: number; last_price: number;
    change: number; change_percent: number; volume: number; pe_ratio: number;
    pb_ratio: number; dividend_yield: number; high: number; low: number;
    open_price: number; prev_close: number; last_updated: string;
}

interface StatisticsData {
    pe_ratio: number; forward_pe: number; ps_ratio: number; pb_ratio: number;
    peg_ratio: number; p_fcf: number; p_ocf: number; enterprise_value: number;
    ev_ebitda: number; ev_sales: number; roe: number; roa: number; roic: number;
    roce: number; asset_turnover: number; gross_margin: number; operating_margin: number;
    profit_margin: number; ebitda_margin: number; fcf_margin: number;
    current_ratio: number; quick_ratio: number; debt_equity: number; debt_ebitda: number;
    interest_coverage: number; beta_5y: number; rsi_14: number; ma_50d: number;
    ma_200d: number; revenue_ttm: number; net_income_ttm: number; eps_ttm: number;
    fcf_ttm: number; dividend_yield: number; payout_ratio: number; earnings_yield: number;
    fcf_yield: number; shares_outstanding: number; float_shares: number;
    insider_ownership: number; institutional_ownership: number;
}

interface DividendData { ex_date: string; dividend_amount: number; record_date?: string; pay_date?: string; currency: string; }
interface OHLCData { date: string; open: number; high: number; low: number; close: number; volume: number; }

// ============================================================================
// HELPERS
// ============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const fmt = (n: number | null | undefined, d = 2) => (n == null || isNaN(n)) ? 'N/A' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: number | null | undefined) => (n == null || isNaN(n)) ? 'N/A' : `${(n * 100).toFixed(2)}%`;
const fmtLarge = (n: number | null | undefined) => { if (!n) return 'N/A'; if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`; if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`; if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`; return n.toLocaleString(); };

// ============================================================================
// PREMIUM COMPONENTS - LIGHT THEME
// ============================================================================

// Metric Card - Light Theme
const MetricCard = ({ label, value, suffix = '', icon, color = 'blue' }: { label: string; value: string; suffix?: string; icon?: string; color?: string }) => {
    const colors: Record<string, string> = { blue: 'border-blue-200 bg-blue-50', green: 'border-green-200 bg-green-50', amber: 'border-amber-200 bg-amber-50', purple: 'border-purple-200 bg-purple-50' };
    return (
        <div className={`rounded-xl p-4 border-2 ${colors[color]} transition-transform hover:scale-[1.02] hover:shadow-lg`}>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                {icon && <span>{icon}</span>}<span>{label}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">{value}</span>
                {suffix && <span className="text-sm text-gray-500">{suffix}</span>}
            </div>
        </div>
    );
};

// Score Ring - Circular Gauge
const ScoreRing = ({ value, max = 100, label, color = '#3B82F6' }: { value: number; max?: number; label: string; color?: string }) => {
    const pct = Math.min((value / max) * 100, 100);
    const circ = 2 * Math.PI * 36;
    const offset = circ - (pct / 100) * circ;
    return (
        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <svg className="w-20 h-20 -rotate-90"><circle cx="40" cy="40" r="36" stroke="#E5E7EB" strokeWidth="6" fill="none" />
                <circle cx="40" cy="40" r="36" stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease-out' }} />
            </svg>
            <span className="text-xl font-bold text-gray-900 -mt-12">{fmt(value, 0)}</span>
            <span className="text-xs text-gray-500 mt-8 font-medium">{label}</span>
        </div>
    );
};

// Margin Bar - Horizontal Progress
const MarginBar = ({ label, value, color = '#10B981' }: { label: string; value: number | null; color?: string }) => {
    const pct = value ? Math.min(value * 100, 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">{label}</span><span className="font-bold text-gray-900">{value ? fmtPct(value) : 'N/A'}</span></div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
        </div>
    );
};

// Tab Button - Light Theme
const TabBtn = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-gray-100'}`}>
        <span>{icon}</span><span className="hidden sm:inline">{label}</span>
    </button>
);

// TradingView Chart Component
const PriceChart = ({ ohlc, symbol }: { ohlc: OHLCData[]; symbol: string }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartType, setChartType] = useState<'candle' | 'line'>('candle');

    useEffect(() => {
        if (!chartRef.current || ohlc.length === 0 || typeof window === 'undefined') return;
        // @ts-ignore
        if (!window.LightweightCharts) return;

        chartRef.current.innerHTML = '';
        // @ts-ignore
        const chart = window.LightweightCharts.createChart(chartRef.current, {
            width: chartRef.current.clientWidth, height: 400,
            layout: { background: { color: '#FFFFFF' }, textColor: '#333' },
            grid: { vertLines: { color: '#E5E7EB' }, horzLines: { color: '#E5E7EB' } },
            rightPriceScale: { borderColor: '#E5E7EB' },
            timeScale: { borderColor: '#E5E7EB', timeVisible: true },
        });

        const data = [...ohlc].reverse().map(d => ({
            time: d.date, open: d.open, high: d.high, low: d.low, close: d.close,
        }));

        if (chartType === 'candle') {
            const series = chart.addCandlestickSeries({ upColor: '#22C55E', downColor: '#EF4444', borderUpColor: '#22C55E', borderDownColor: '#EF4444', wickUpColor: '#22C55E', wickDownColor: '#EF4444' });
            series.setData(data);
        } else {
            const series = chart.addLineSeries({ color: '#3B82F6', lineWidth: 2 });
            series.setData(data.map(d => ({ time: d.time, value: d.close })));
        }

        chart.timeScale().fitContent();
        const handleResize = () => chart.applyOptions({ width: chartRef.current?.clientWidth || 800 });
        window.addEventListener('resize', handleResize);
        return () => { window.removeEventListener('resize', handleResize); chart.remove(); };
    }, [ohlc, chartType]);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📈 Price Chart - {symbol}</h3>
                <div className="flex gap-2">
                    <button onClick={() => setChartType('candle')} className={`px-3 py-1.5 text-sm rounded-lg ${chartType === 'candle' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Candlestick</button>
                    <button onClick={() => setChartType('line')} className={`px-3 py-1.5 text-sm rounded-lg ${chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Line</button>
                </div>
            </div>
            <div ref={chartRef} className="w-full h-[400px]" />
        </div>
    );
};

// ============================================================================
// TAB CONTENT
// ============================================================================

// Overview Tab
const OverviewTab = ({ stock, stats, ohlc }: { stock: StockData; stats: StatisticsData | null; ohlc: OHLCData[] }) => {
    const w52High = useMemo(() => Math.max(...ohlc.slice(0, 252).map(d => d.high || 0).filter(h => h > 0) || [0]), [ohlc]);
    const w52Low = useMemo(() => Math.min(...ohlc.slice(0, 252).filter(d => d.low > 0).map(d => d.low) || [Infinity]), [ohlc]);
    const valScore = stats?.pe_ratio && stats.pe_ratio > 0 && stats.pe_ratio < 20 ? 85 : stats?.pe_ratio && stats.pe_ratio < 30 ? 70 : 50;
    const healthScore = stats?.current_ratio && stats.current_ratio > 1.5 ? 85 : stats?.current_ratio && stats.current_ratio > 1 ? 70 : 50;
    const profitScore = stats?.roe && stats.roe > 0.15 ? 90 : stats?.roe && stats.roe > 0.08 ? 70 : 50;

    return (
        <div className="space-y-8">
            {/* Hero Price Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                        <p className="text-blue-200 font-medium">Current Price</p>
                        <p className="text-5xl font-bold mt-1">{fmt(stock.last_price)} <span className="text-2xl text-blue-200">EGP</span></p>
                        <div className="flex items-center gap-4 mt-3 text-blue-100">
                            <span>Open: {fmt(stock.open_price)}</span><span>•</span><span>Prev: {fmt(stock.prev_close)}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${stock.change_percent >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            {stock.change_percent >= 0 ? '▲' : '▼'} {Math.abs(stock.change_percent).toFixed(2)}%
                        </div>
                        <p className="text-blue-200 mt-1">{stock.change_percent >= 0 ? '+' : ''}{fmt(stock.change)} EGP</p>
                        <p className="text-blue-300 text-sm mt-2">Volume: {fmtLarge(stock.volume)}</p>
                    </div>
                </div>
            </div>

            {/* Price Chart */}
            <PriceChart ohlc={ohlc} symbol={stock.symbol} />

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <MetricCard icon="💰" label="Market Cap" value={fmtLarge(stock.market_cap)} suffix="EGP" color="blue" />
                <MetricCard icon="📊" label="P/E Ratio" value={fmt(stats?.pe_ratio || stock.pe_ratio, 1)} color="purple" />
                <MetricCard icon="📈" label="ROE" value={stats?.roe ? fmtPct(stats.roe) : 'N/A'} color="green" />
                <MetricCard icon="💵" label="Dividend" value={stats?.dividend_yield ? fmtPct(stats.dividend_yield) : 'N/A'} color="amber" />
                <MetricCard icon="📉" label="52W High" value={fmt(w52High)} suffix="EGP" color="green" />
                <MetricCard icon="📉" label="52W Low" value={fmt(w52Low)} suffix="EGP" color="blue" />
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-6 border-2 border-green-200">
                    <h3 className="text-green-700 font-bold text-lg mb-4">🎯 Valuation Score</h3>
                    <ScoreRing value={valScore} label="Based on PE & PB" color="#22C55E" />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-200">
                    <h3 className="text-blue-700 font-bold text-lg mb-4">💪 Financial Health</h3>
                    <ScoreRing value={healthScore} label="Liquidity & Solvency" color="#3B82F6" />
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border-2 border-amber-200">
                    <h3 className="text-amber-700 font-bold text-lg mb-4">📈 Profitability</h3>
                    <ScoreRing value={profitScore} label="ROE & Margins" color="#F59E0B" />
                </div>
            </div>
        </div>
    );
};

// Statistics Tab
const StatisticsTab = ({ stats }: { stats: StatisticsData | null }) => {
    if (!stats) return <div className="text-center py-16 bg-white rounded-2xl border"><span className="text-5xl">📊</span><p className="text-gray-500 mt-4">No statistics available</p></div>;
    return (
        <div className="space-y-8">
            {/* Valuation */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">💰 Valuation Ratios</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="P/E Ratio" value={fmt(stats.pe_ratio, 2)} color="blue" />
                    <MetricCard label="Forward P/E" value={fmt(stats.forward_pe, 2)} color="blue" />
                    <MetricCard label="P/B Ratio" value={fmt(stats.pb_ratio, 2)} color="purple" />
                    <MetricCard label="P/S Ratio" value={fmt(stats.ps_ratio, 2)} color="purple" />
                    <MetricCard label="PEG Ratio" value={fmt(stats.peg_ratio, 2)} color="amber" />
                    <MetricCard label="P/FCF" value={fmt(stats.p_fcf, 2)} color="amber" />
                    <MetricCard label="EV/EBITDA" value={fmt(stats.ev_ebitda, 2)} color="green" />
                    <MetricCard label="EV/Sales" value={fmt(stats.ev_sales, 2)} color="green" />
                </div>
            </div>
            {/* Efficiency */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">⚡ Financial Efficiency</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="ROE" value={fmtPct(stats.roe)} color="green" />
                    <MetricCard label="ROA" value={fmtPct(stats.roa)} color="green" />
                    <MetricCard label="ROIC" value={fmtPct(stats.roic)} color="blue" />
                    <MetricCard label="ROCE" value={fmtPct(stats.roce)} color="blue" />
                    <MetricCard label="Asset Turn" value={fmt(stats.asset_turnover, 2)} color="purple" />
                    <MetricCard label="Earnings Yield" value={fmtPct(stats.earnings_yield)} color="amber" />
                    <MetricCard label="FCF Yield" value={fmtPct(stats.fcf_yield)} color="amber" />
                </div>
            </div>
            {/* Margins */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">📊 Profit Margins</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <MarginBar label="Gross Margin" value={stats.gross_margin} color="#22C55E" />
                        <MarginBar label="Operating Margin" value={stats.operating_margin} color="#3B82F6" />
                        <MarginBar label="Profit Margin" value={stats.profit_margin} color="#8B5CF6" />
                    </div>
                    <div className="space-y-4">
                        <MarginBar label="EBITDA Margin" value={stats.ebitda_margin} color="#F59E0B" />
                        <MarginBar label="FCF Margin" value={stats.fcf_margin} color="#10B981" />
                    </div>
                </div>
            </div>
            {/* Health & Technical */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">⚖️ Financial Health</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard label="Current Ratio" value={fmt(stats.current_ratio, 2)} color="green" />
                        <MetricCard label="Quick Ratio" value={fmt(stats.quick_ratio, 2)} color="green" />
                        <MetricCard label="Debt/Equity" value={fmt(stats.debt_equity, 2)} color="amber" />
                        <MetricCard label="Interest Cov" value={fmt(stats.interest_coverage, 2)} color="blue" />
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">📉 Technical Indicators</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard label="Beta (5Y)" value={fmt(stats.beta_5y, 2)} color="purple" />
                        <MetricCard label="RSI (14)" value={fmt(stats.rsi_14, 0)} color="purple" />
                        <MetricCard label="MA 50D" value={fmt(stats.ma_50d, 2)} color="blue" />
                        <MetricCard label="MA 200D" value={fmt(stats.ma_200d, 2)} color="blue" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Dividends Tab
const DividendsTab = ({ dividends, symbol }: { dividends: DividendData[]; symbol: string }) => {
    const total = dividends.reduce((s, d) => s + (d.dividend_amount || 0), 0);
    const latest = dividends[0]?.dividend_amount || 0;
    const yearlyData = useMemo(() => {
        const g: Record<string, number> = {};
        dividends.forEach(d => { const y = new Date(d.ex_date).getFullYear().toString(); g[y] = (g[y] || 0) + (d.dividend_amount || 0); });
        return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
    }, [dividends]);

    if (!dividends.length) return <div className="text-center py-16 bg-white rounded-2xl border"><span className="text-5xl">💰</span><p className="text-gray-500 mt-4">No dividend history for {symbol}</p></div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-100 to-white rounded-2xl p-6 border-2 border-green-300">
                    <p className="text-green-700 font-semibold">Latest Dividend</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{fmt(latest)} <span className="text-lg text-gray-500">EGP</span></p>
                    <p className="text-gray-500 text-sm mt-1">{dividends[0]?.ex_date}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-white rounded-2xl p-6 border-2 border-blue-300">
                    <p className="text-blue-700 font-semibold">Total Dividends</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{fmt(total)} <span className="text-lg text-gray-500">EGP</span></p>
                    <p className="text-gray-500 text-sm mt-1">{dividends.length} payments</p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-white rounded-2xl p-6 border-2 border-amber-300">
                    <p className="text-amber-700 font-semibold">Average Payment</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{fmt(total / dividends.length)} <span className="text-lg text-gray-500">EGP</span></p>
                </div>
            </div>
            {yearlyData.length > 1 && (
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">Annual Dividend Trend</h3>
                    <div className="flex items-end gap-3 h-48">
                        {yearlyData.map(([y, amt]) => {
                            const max = Math.max(...yearlyData.map(d => d[1] as number));
                            const h = (amt / max) * 100;
                            return (<div key={y} className="flex-1 flex flex-col items-center">
                                <div className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg transition-all hover:from-green-400" style={{ height: `${h}%` }} />
                                <span className="text-xs text-gray-500 mt-2">{y}</span><span className="text-xs font-bold text-gray-700">{fmt(amt, 2)}</span>
                            </div>);
                        })}
                    </div>
                </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full"><thead className="bg-gray-50"><tr className="text-gray-600 text-xs uppercase">
                    <th className="py-3 px-4 text-left">Ex-Date</th><th className="py-3 px-4 text-right">Amount</th><th className="py-3 px-4 text-left hidden md:table-cell">Record Date</th><th className="py-3 px-4 text-left hidden md:table-cell">Pay Date</th>
                </tr></thead><tbody className="divide-y divide-gray-100">
                        {dividends.map((d, i) => (<tr key={i} className="hover:bg-gray-50"><td className="py-3 px-4 text-gray-700">{d.ex_date}</td><td className="py-3 px-4 text-right font-semibold text-green-600">{fmt(d.dividend_amount)} EGP</td><td className="py-3 px-4 text-gray-500 hidden md:table-cell">{d.record_date || '-'}</td><td className="py-3 px-4 text-gray-500 hidden md:table-cell">{d.pay_date || '-'}</td></tr>))}
                    </tbody></table>
            </div>
        </div>
    );
};

// History Tab
const HistoryTab = ({ ohlc, symbol }: { ohlc: OHLCData[]; symbol: string }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center"><h3 className="font-bold text-gray-900">Price History ({ohlc.length} days)</h3>
            <button onClick={() => { const csv = ['Date,Open,High,Low,Close,Volume', ...ohlc.map(d => `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`)].join('\n'); const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${symbol}_history.csv`; a.click(); }} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold">📊 Export Excel</button>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-h-[600px] overflow-y-auto">
            <table className="w-full"><thead className="bg-gray-50 sticky top-0"><tr className="text-gray-600 text-xs uppercase">
                <th className="py-3 px-4 text-left">Date</th><th className="py-3 px-4 text-right">Open</th><th className="py-3 px-4 text-right">High</th><th className="py-3 px-4 text-right">Low</th><th className="py-3 px-4 text-right">Close</th><th className="py-3 px-4 text-right">Volume</th>
            </tr></thead><tbody className="divide-y divide-gray-100">
                    {ohlc.slice(0, 100).map((d, i) => (<tr key={i} className="hover:bg-gray-50 text-sm"><td className="py-2 px-4 text-gray-700">{d.date}</td><td className="py-2 px-4 text-right text-gray-500">{fmt(d.open)}</td><td className="py-2 px-4 text-right text-green-600">{fmt(d.high)}</td><td className="py-2 px-4 text-right text-red-500">{fmt(d.low)}</td><td className="py-2 px-4 text-right font-semibold text-gray-900">{fmt(d.close)}</td><td className="py-2 px-4 text-right text-gray-500">{d.volume?.toLocaleString()}</td></tr>))}
                </tbody></table>
        </div>
    </div>
);

// Profile Tab
const ProfileTab = ({ stock }: { stock: StockData }) => (
    <div className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Company Overview</h3>
            <p className="text-gray-600 leading-relaxed">{stock.name_en} is a company listed on the Egyptian Stock Exchange (EGX) under the symbol {stock.symbol}, operating in the {stock.sector_name || 'Financial Services'} sector.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ l: 'Symbol', v: stock.symbol }, { l: 'Name', v: stock.name_en }, { l: 'Arabic', v: stock.name_ar || 'N/A' }, { l: 'Sector', v: stock.sector_name || 'N/A' }, { l: 'Exchange', v: 'EGX - Egypt' }, { l: 'Currency', v: 'EGP' }, { l: 'Market Cap', v: fmtLarge(stock.market_cap) + ' EGP' }, { l: 'Updated', v: stock.last_updated ? new Date(stock.last_updated).toLocaleString() : 'N/A' }].map((x, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-gray-500 text-xs uppercase font-semibold">{x.l}</p><p className="text-gray-900 font-semibold mt-1">{x.v}</p></div>
            ))}
        </div>
    </div>
);

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function EGXStockProfilePage() {
    const params = useParams();
    const symbol = (params?.symbol as string)?.toUpperCase() || '';
    const [stock, setStock] = useState<StockData | null>(null);
    const [stats, setStats] = useState<StatisticsData | null>(null);
    const [ohlc, setOhlc] = useState<OHLCData[]>([]);
    const [dividends, setDividends] = useState<DividendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        if (!symbol) return;
        (async () => {
            setLoading(true);
            const [stockR, statsR, ohlcR, divR] = await Promise.allSettled([
                fetch(`${API_BASE}/api/v1/egx/stock/${symbol}`).then(r => r.ok ? r.json() : null),
                fetch(`${API_BASE}/api/v1/egx/statistics/${symbol}`).then(r => r.ok ? r.json() : null),
                fetch(`${API_BASE}/api/v1/egx/ohlc/${symbol}?limit=500`).then(r => r.ok ? r.json() : []),
                fetch(`${API_BASE}/api/v1/egx/dividends/${symbol}`).then(r => r.ok ? r.json() : [])
            ]);
            if (stockR.status === 'fulfilled') setStock(stockR.value);
            if (statsR.status === 'fulfilled') setStats(statsR.value);
            if (ohlcR.status === 'fulfilled') setOhlc(ohlcR.value || []);
            if (divR.status === 'fulfilled') setDividends(divR.value || []);
            setLoading(false);
        })();
    }, [symbol]);

    if (loading) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto" /><p className="text-gray-500 mt-4">Loading {symbol}...</p></div></div>);
    if (!stock) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><span className="text-6xl">🔍</span><h1 className="text-2xl font-bold text-gray-900 mt-4">Stock Not Found</h1><Link href="/egx" className="text-blue-600 hover:underline mt-4 block">← Back to EGX</Link></div></div>);

    return (
        <div className="min-h-screen bg-gray-50">
            <Script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js" strategy="beforeInteractive" />

            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-3"><Link href="/egx" className="hover:text-blue-600">🇪🇬 EGX</Link><span>/</span><span className="text-gray-900 font-medium">{symbol}</span></div>
                    <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-3"><h1 className="text-3xl font-bold text-gray-900">{symbol}</h1><span className={`px-2 py-1 rounded-full text-xs font-bold ${stock.change_percent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{stock.change_percent >= 0 ? '▲' : '▼'} {Math.abs(stock.change_percent).toFixed(2)}%</span></div>
                            <p className="text-gray-600 mt-1">{stock.name_en}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">{stock.sector_name || 'EGX'}</span>
                        </div>
                        <div className="text-right"><p className="text-4xl font-bold text-gray-900">{fmt(stock.last_price)} <span className="text-xl text-gray-500">EGP</span></p><p className={`text-lg font-semibold ${stock.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stock.change_percent >= 0 ? '+' : ''}{fmt(stock.change)} ({stock.change_percent >= 0 ? '+' : ''}{fmt(stock.change_percent)}%)</p></div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4"><div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                {[{ id: 'overview', icon: '📊', l: 'Overview' }, { id: 'statistics', icon: '📋', l: 'Statistics' }, { id: 'dividends', icon: '💰', l: 'Dividends' }, { id: 'history', icon: '📈', l: 'History' }, { id: 'profile', icon: '🏢', l: 'Profile' }].map(t => (<TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.l} />))}
            </div></div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {tab === 'overview' && <OverviewTab stock={stock} stats={stats} ohlc={ohlc} />}
                {tab === 'statistics' && <StatisticsTab stats={stats} />}
                {tab === 'dividends' && <DividendsTab dividends={dividends} symbol={symbol} />}
                {tab === 'history' && <HistoryTab ohlc={ohlc} symbol={symbol} />}
                {tab === 'profile' && <ProfileTab stock={stock} />}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center border-t border-gray-200"><p className="text-gray-500 text-sm">Last Updated: {stock.last_updated ? new Date(stock.last_updated).toLocaleString() : 'N/A'} • Egyptian Stock Exchange</p></div>
        </div>
    );
}
