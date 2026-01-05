'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area, LineChart, Line, Legend } from 'recharts';

// ============================================================================
// TYPES
// ============================================================================
interface StockData {
    symbol: string; name_en: string; name_ar?: string; sector_name: string;
    market_code: string; currency: string; market_cap: number; last_price: number;
    change: number; change_percent: number; volume: number; pe_ratio: number;
    pb_ratio: number; dividend_yield: number; high: number; low: number;
    open_price: number; prev_close: number; last_updated: string;
    revenue?: number; net_income?: number;
}

interface StatisticsData {
    // Valuation
    pe_ratio: number; forward_pe: number; ps_ratio: number; pb_ratio: number;
    peg_ratio: number; p_fcf: number; p_ocf: number; p_tbv: number;
    // Enterprise
    enterprise_value: number; ev_ebitda: number; ev_sales: number;
    // Efficiency
    roe: number; roa: number; roic: number; roce: number; asset_turnover: number;
    // Margins
    gross_margin: number; operating_margin: number; pretax_margin: number;
    profit_margin: number; ebitda_margin: number; fcf_margin: number;
    // Health
    current_ratio: number; quick_ratio: number; debt_equity: number;
    debt_ebitda: number; debt_fcf: number; interest_coverage: number;
    // Technical
    beta_5y: number; rsi_14: number; ma_50d: number; ma_200d: number;
    price_change_52w: number; avg_volume_20d: number;
    // Financials TTM
    revenue_ttm: number; net_income_ttm: number; eps_ttm: number;
    ebitda_ttm: number; fcf_ttm: number; ocf_ttm: number;
    // Balance Sheet
    cash_ttm: number; total_debt: number; net_cash: number;
    book_value: number; bvps: number; working_capital: number;
    // Dividends
    dividend_yield: number; payout_ratio: number; dps: number;
    earnings_yield: number; fcf_yield: number;
    // Ownership
    shares_outstanding: number; float_shares: number;
    insider_ownership: number; institutional_ownership: number;
    // Scores
    altman_z_score: number; piotroski_f_score: number;
    effective_tax_rate: number; fcf_per_share: number;
}

interface DividendData { ex_date: string; dividend_amount: number; record_date?: string; pay_date?: string; currency: string; }
interface OHLCData { date: string; open: number; high: number; low: number; close: number; volume: number; }

// ============================================================================
// HELPERS & FORMATTERS
// ============================================================================
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const fmt = (n: number | null | undefined, d = 2): string => (n == null || isNaN(n)) ? '-' : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtPct = (n: number | null | undefined): string => (n == null || isNaN(n)) ? '-' : `${(n * 100).toFixed(2)}%`;
const fmtLarge = (n: number | null | undefined): string => { if (!n || isNaN(n)) return '-'; if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)}T`; if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`; if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`; if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`; return n.toLocaleString(); };
const hasValue = (n: any): boolean => n != null && !isNaN(n) && n !== 0;

// Chart Colors
const COLORS = { blue: '#3B82F6', green: '#22C55E', amber: '#F59E0B', red: '#EF4444', purple: '#8B5CF6', teal: '#14B8A6', pink: '#EC4899', indigo: '#6366F1' };
const PIE_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6'];

// ============================================================================
// PREMIUM COMPONENTS
// ============================================================================

// Metric Card
const MetricCard = ({ label, value, icon, color = 'blue', subtitle }: { label: string; value: string; icon?: string; color?: string; subtitle?: string }) => {
    const bgColors: Record<string, string> = { blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200', amber: 'bg-amber-50 border-amber-200', purple: 'bg-purple-50 border-purple-200', teal: 'bg-teal-50 border-teal-200', red: 'bg-red-50 border-red-200' };
    return (
        <div className={`rounded-2xl p-5 border-2 ${bgColors[color] || bgColors.blue} transition-all hover:shadow-lg hover:scale-[1.02]`}>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider">
                {icon && <span className="text-base">{icon}</span>}<span>{label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900 mt-2">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
};

// Section Header
const SectionHeader = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
    <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-2xl">{icon}</span>{title}
        </h3>
        {subtitle && <p className="text-gray-500 text-sm mt-1 ml-9">{subtitle}</p>}
    </div>
);

// Progress Bar
const ProgressBar = ({ label, value, max = 1, color = '#3B82F6' }: { label: string; value: number | null; max?: number; color?: string }) => {
    const pct = value ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600 font-medium">{label}</span><span className="font-bold text-gray-900">{value ? fmtPct(value) : '-'}</span></div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.max(pct, 0)}%`, backgroundColor: color }} />
            </div>
        </div>
    );
};

// Circular Gauge
const CircleGauge = ({ value, max = 100, label, color = '#3B82F6', size = 100 }: { value: number; max?: number; label: string; color?: string; size?: number }) => {
    const pct = Math.min((value / max) * 100, 100);
    const r = (size / 2) - 8;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <div className="flex flex-col items-center p-4 bg-white rounded-2xl border-2 border-gray-100 shadow-sm">
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth="8" fill="none" />
                <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <span className="text-2xl font-black text-gray-900 -mt-[60px]">{fmt(value, 0)}</span>
            <span className="text-xs text-gray-500 mt-10 font-semibold text-center">{label}</span>
        </div>
    );
};

// Tab Button
const TabBtn = ({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: string; label: string; count?: number }) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-600 hover:bg-blue-50'}`}>
        <span>{icon}</span><span className="hidden sm:inline">{label}</span>
        {count !== undefined && <span className={`px-2 py-0.5 text-xs rounded-full ${active ? 'bg-white/20' : 'bg-gray-100'}`}>{count}</span>}
    </button>
);

// TradingView Chart
const PriceChart = ({ ohlc, symbol }: { ohlc: OHLCData[]; symbol: string }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartType, setChartType] = useState<'candle' | 'line' | 'area'>('candle');
    const [period, setPeriod] = useState('1y');

    useEffect(() => {
        if (!chartRef.current || ohlc.length === 0 || typeof window === 'undefined') return;
        // @ts-ignore
        if (!window.LightweightCharts) return;

        chartRef.current.innerHTML = '';
        // @ts-ignore
        const chart = window.LightweightCharts.createChart(chartRef.current, {
            width: chartRef.current.clientWidth, height: 450,
            layout: { background: { color: '#FFFFFF' }, textColor: '#374151' },
            grid: { vertLines: { color: '#F3F4F6' }, horzLines: { color: '#F3F4F6' } },
            rightPriceScale: { borderColor: '#E5E7EB' },
            timeScale: { borderColor: '#E5E7EB', timeVisible: true },
        });

        const data = [...ohlc].reverse().map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.close }));

        if (chartType === 'candle') {
            const series = chart.addCandlestickSeries({ upColor: '#22C55E', downColor: '#EF4444', borderUpColor: '#16A34A', borderDownColor: '#DC2626', wickUpColor: '#22C55E', wickDownColor: '#EF4444' });
            series.setData(data);
        } else if (chartType === 'area') {
            const series = chart.addAreaSeries({ topColor: 'rgba(59, 130, 246, 0.4)', bottomColor: 'rgba(59, 130, 246, 0.0)', lineColor: '#3B82F6', lineWidth: 2 });
            series.setData(data.map(d => ({ time: d.time, value: d.close })));
        } else {
            const series = chart.addLineSeries({ color: '#3B82F6', lineWidth: 2 });
            series.setData(data.map(d => ({ time: d.time, value: d.close })));
        }

        // Add volume
        const volSeries = chart.addHistogramSeries({ color: '#94A3B8', priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.85, bottom: 0 } });
        volSeries.setData([...ohlc].reverse().map(d => ({ time: d.date, value: d.volume, color: d.close >= d.open ? '#22C55E50' : '#EF444450' })));

        chart.timeScale().fitContent();
        const resize = () => chart.applyOptions({ width: chartRef.current?.clientWidth || 800 });
        window.addEventListener('resize', resize);
        return () => { window.removeEventListener('resize', resize); chart.remove(); };
    }, [ohlc, chartType]);

    if (ohlc.length === 0) return <div className="bg-white rounded-2xl border-2 border-gray-100 p-12 text-center"><span className="text-5xl">📈</span><p className="text-gray-500 mt-4">No price data available</p></div>;

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-gray-900">📈 {symbol} Price Chart</h3>
                <div className="flex gap-2">
                    {['candle', 'line', 'area'].map(t => (
                        <button key={t} onClick={() => setChartType(t as any)} className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${chartType === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t}</button>
                    ))}
                </div>
            </div>
            <div ref={chartRef} className="w-full h-[450px]" />
        </div>
    );
};

// Ownership Pie Chart
const OwnershipPieChart = ({ insider, institutional }: { insider: number; institutional: number }) => {
    const public_pct = Math.max(0, 1 - (insider || 0) - (institutional || 0));
    const data = [
        { name: 'Institutional', value: (institutional || 0) * 100, color: COLORS.blue },
        { name: 'Public', value: public_pct * 100, color: COLORS.green },
        { name: 'Insider', value: (insider || 0) * 100, color: COLORS.amber },
    ].filter(d => d.value > 0);

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
            <SectionHeader icon="👥" title="Ownership Breakdown" />
            <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value.toFixed(1)}%`} labelLine={false}>
                        {data.map((entry, i) => <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-sm text-gray-600">{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Margins Donut Chart
const MarginsDonutChart = ({ stats }: { stats: StatisticsData }) => {
    const data = [
        { name: 'Operating', value: (stats.operating_margin || 0) * 100, color: COLORS.blue },
        { name: 'Profit', value: (stats.profit_margin || 0) * 100, color: COLORS.green },
        { name: 'Pretax', value: (stats.pretax_margin || 0) * 100, color: COLORS.purple },
    ].filter(d => d.value > 0);

    if (data.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
            <SectionHeader icon="📊" title="Margin Analysis" subtitle="How efficiently the company converts revenue to profit" />
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                        {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

// Financials Bar Chart
const FinancialsBarChart = ({ stats }: { stats: StatisticsData }) => {
    const data = [
        { name: 'Revenue', value: stats.revenue_ttm || 0 },
        { name: 'Net Income', value: stats.net_income_ttm || 0 },
        { name: 'FCF', value: stats.fcf_ttm || 0 },
        { name: 'Cash', value: stats.cash_ttm || 0 },
    ].filter(d => d.value !== 0);

    if (data.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
            <SectionHeader icon="💰" title="Financial Metrics (TTM)" subtitle="Trailing twelve months figures in EGP" />
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" tickFormatter={(v) => fmtLarge(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <Tooltip formatter={(v: number) => fmtLarge(v)} />
                    <Bar dataKey="value" fill={COLORS.blue} radius={[0, 8, 8, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// Health Radar Chart
const HealthRadarChart = ({ stats }: { stats: StatisticsData }) => {
    const normalize = (val: number, min: number, max: number) => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    const data = [
        { metric: 'ROE', value: normalize((stats.roe || 0) * 100, 0, 50), fullMark: 100 },
        { metric: 'Margin', value: normalize((stats.profit_margin || 0) * 100, 0, 50), fullMark: 100 },
        { metric: 'Dividend', value: normalize((stats.dividend_yield || 0) * 100, 0, 10), fullMark: 100 },
        { metric: 'Liquidity', value: normalize(stats.current_ratio || 0, 0, 3), fullMark: 100 },
        { metric: 'Value', value: normalize(100 - (stats.pe_ratio || 20), 0, 100), fullMark: 100 },
    ];

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
            <SectionHeader icon="🎯" title="Stock Health Radar" subtitle="Multi-dimensional analysis" />
            <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={data}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontWeight: 600, fill: '#6B7280' }} />
                    <Radar name="Score" dataKey="value" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};

// Dividend Trend Chart
const DividendTrendChart = ({ dividends }: { dividends: DividendData[] }) => {
    const yearlyData = useMemo(() => {
        const grouped: Record<string, number> = {};
        dividends.forEach(d => { const y = new Date(d.ex_date).getFullYear().toString(); grouped[y] = (grouped[y] || 0) + (d.dividend_amount || 0); });
        return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([year, amount]) => ({ year, amount }));
    }, [dividends]);

    if (yearlyData.length < 2) return null;

    return (
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
            <SectionHeader icon="📈" title="Dividend Trend" subtitle="Annual dividend payments over time" />
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={yearlyData}>
                    <defs>
                        <linearGradient id="divGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(2)} EGP`} />
                    <Area type="monotone" dataKey="amount" stroke={COLORS.green} fill="url(#divGrad)" strokeWidth={3} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// ============================================================================
// TAB CONTENT
// ============================================================================

// Overview Tab
const OverviewTab = ({ stock, stats, ohlc, dividends }: { stock: StockData; stats: StatisticsData | null; ohlc: OHLCData[]; dividends: DividendData[] }) => {
    const w52High = useMemo(() => Math.max(...ohlc.slice(0, 252).map(d => d.high || 0).filter(h => h > 0), 0), [ohlc]);
    const w52Low = useMemo(() => { const lows = ohlc.slice(0, 252).filter(d => d.low > 0).map(d => d.low); return lows.length ? Math.min(...lows) : 0; }, [ohlc]);

    // Calculate scores
    const valScore = stats?.pe_ratio && stats.pe_ratio > 0 && stats.pe_ratio < 15 ? 90 : stats?.pe_ratio && stats.pe_ratio < 25 ? 70 : 50;
    const healthScore = stats?.current_ratio && stats.current_ratio > 2 ? 90 : stats?.current_ratio && stats.current_ratio > 1 ? 70 : 50;
    const profitScore = stats?.roe && stats.roe > 0.2 ? 90 : stats?.roe && stats.roe > 0.1 ? 70 : 50;

    return (
        <div className="space-y-8">
            {/* Hero Card */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl shadow-blue-500/20">
                <div className="flex flex-wrap justify-between items-start gap-6">
                    <div>
                        <p className="text-blue-200 font-semibold text-sm uppercase tracking-wider">Current Price</p>
                        <p className="text-6xl font-black mt-2">{fmt(stock.last_price)} <span className="text-2xl font-medium text-blue-200">EGP</span></p>
                        <div className="flex items-center gap-4 mt-4 text-blue-100 text-sm">
                            <span>Open: {fmt(stock.open_price)}</span>
                            <span className="w-1 h-1 rounded-full bg-blue-300"></span>
                            <span>High: {fmt(stock.high)}</span>
                            <span className="w-1 h-1 rounded-full bg-blue-300"></span>
                            <span>Low: {fmt(stock.low)}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-5xl font-black ${stock.change_percent >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                            {stock.change_percent >= 0 ? '▲' : '▼'} {Math.abs(stock.change_percent).toFixed(2)}%
                        </div>
                        <p className="text-blue-200 mt-2 text-lg">{stock.change_percent >= 0 ? '+' : ''}{fmt(stock.change)} EGP</p>
                        <p className="text-blue-300 text-sm mt-3">Vol: {fmtLarge(stock.volume)} | MCap: {fmtLarge(stock.market_cap)}</p>
                    </div>
                </div>
            </div>

            {/* Price Chart */}
            <PriceChart ohlc={ohlc} symbol={stock.symbol} />

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MetricCard icon="💰" label="Market Cap" value={fmtLarge(stock.market_cap)} color="blue" />
                <MetricCard icon="📊" label="P/E Ratio" value={fmt(stats?.pe_ratio || stock.pe_ratio, 1)} color="purple" />
                <MetricCard icon="📈" label="ROE" value={stats?.roe ? fmtPct(stats.roe) : '-'} color="green" />
                <MetricCard icon="💵" label="Div Yield" value={stats?.dividend_yield ? fmtPct(stats.dividend_yield) : '-'} color="amber" />
                <MetricCard icon="⬆️" label="52W High" value={fmt(w52High)} subtitle="EGP" color="green" />
                <MetricCard icon="⬇️" label="52W Low" value={fmt(w52Low)} subtitle="EGP" color="red" />
            </div>

            {/* Score Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-6 border-2 border-green-200">
                    <h3 className="text-green-700 font-bold text-lg mb-4 flex items-center gap-2">🎯 Valuation</h3>
                    <CircleGauge value={valScore} label="Based on PE & PB" color={COLORS.green} />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-6 border-2 border-blue-200">
                    <h3 className="text-blue-700 font-bold text-lg mb-4 flex items-center gap-2">💪 Financial Health</h3>
                    <CircleGauge value={healthScore} label="Liquidity & Solvency" color={COLORS.blue} />
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-6 border-2 border-amber-200">
                    <h3 className="text-amber-700 font-bold text-lg mb-4 flex items-center gap-2">📈 Profitability</h3>
                    <CircleGauge value={profitScore} label="ROE & Margins" color={COLORS.amber} />
                </div>
            </div>

            {/* Charts Row */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <OwnershipPieChart insider={stats.insider_ownership} institutional={stats.institutional_ownership} />
                    <HealthRadarChart stats={stats} />
                </div>
            )}
        </div>
    );
};

// Statistics Tab - ALL Fields
const StatisticsTab = ({ stats }: { stats: StatisticsData | null }) => {
    if (!stats) return <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-100"><span className="text-5xl">📋</span><p className="text-gray-500 mt-4 text-lg">No statistics available</p></div>;

    return (
        <div className="space-y-8">
            {/* Valuation Section */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                <SectionHeader icon="💰" title="Valuation Ratios" subtitle="How expensive is the stock relative to earnings and assets" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="P/E Ratio" value={fmt(stats.pe_ratio, 2)} color="blue" />
                    <MetricCard label="Forward P/E" value={fmt(stats.forward_pe, 2)} color="blue" />
                    <MetricCard label="P/B Ratio" value={fmt(stats.pb_ratio, 2)} color="purple" />
                    <MetricCard label="P/S Ratio" value={fmt(stats.ps_ratio, 2)} color="purple" />
                    <MetricCard label="P/TBV" value={fmt(stats.p_tbv, 2)} color="teal" />
                    <MetricCard label="P/FCF" value={fmt(stats.p_fcf, 2)} color="teal" />
                    <MetricCard label="PEG Ratio" value={fmt(stats.peg_ratio, 2)} color="amber" />
                    <MetricCard label="EV/EBITDA" value={fmt(stats.ev_ebitda, 2)} color="amber" />
                </div>
            </div>

            {/* Efficiency Section */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                <SectionHeader icon="⚡" title="Financial Efficiency" subtitle="How well the company uses its resources" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="ROE" value={fmtPct(stats.roe)} color="green" />
                    <MetricCard label="ROA" value={fmtPct(stats.roa)} color="green" />
                    <MetricCard label="ROIC" value={fmtPct(stats.roic)} color="teal" />
                    <MetricCard label="ROCE" value={fmtPct(stats.roce)} color="teal" />
                    <MetricCard label="Asset Turnover" value={fmt(stats.asset_turnover, 2)} color="blue" />
                    <MetricCard label="Earnings Yield" value={fmtPct(stats.earnings_yield)} color="amber" />
                    <MetricCard label="FCF Yield" value={fmtPct(stats.fcf_yield)} color="amber" />
                    <MetricCard label="Tax Rate" value={fmtPct(stats.effective_tax_rate)} color="red" />
                </div>
            </div>

            {/* Margins Section with Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                    <SectionHeader icon="📊" title="Profit Margins" />
                    <div className="space-y-4">
                        <ProgressBar label="Gross Margin" value={stats.gross_margin} color={COLORS.green} />
                        <ProgressBar label="Operating Margin" value={stats.operating_margin} color={COLORS.blue} />
                        <ProgressBar label="Pretax Margin" value={stats.pretax_margin} color={COLORS.purple} />
                        <ProgressBar label="Profit Margin" value={stats.profit_margin} color={COLORS.teal} />
                        <ProgressBar label="EBITDA Margin" value={stats.ebitda_margin} color={COLORS.amber} />
                        <ProgressBar label="FCF Margin" value={stats.fcf_margin} color={COLORS.pink} />
                    </div>
                </div>
                <MarginsDonutChart stats={stats} />
            </div>

            {/* Financial Health */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                <SectionHeader icon="⚖️" title="Financial Health" subtitle="Liquidity, solvency, and leverage metrics" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Current Ratio" value={fmt(stats.current_ratio, 2)} color="green" />
                    <MetricCard label="Quick Ratio" value={fmt(stats.quick_ratio, 2)} color="green" />
                    <MetricCard label="Debt/Equity" value={fmt(stats.debt_equity, 2)} color="amber" />
                    <MetricCard label="Debt/EBITDA" value={fmt(stats.debt_ebitda, 2)} color="amber" />
                    <MetricCard label="Debt/FCF" value={fmt(stats.debt_fcf, 2)} color="red" />
                    <MetricCard label="Interest Coverage" value={fmt(stats.interest_coverage, 2)} color="blue" />
                </div>
            </div>

            {/* Technical Indicators */}
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                <SectionHeader icon="📉" title="Technical Indicators" subtitle="Price momentum and volatility metrics" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Beta (5Y)" value={fmt(stats.beta_5y, 2)} color="purple" />
                    <MetricCard label="RSI (14)" value={fmt(stats.rsi_14, 0)} color="purple" />
                    <MetricCard label="MA 50D" value={fmt(stats.ma_50d, 2)} color="blue" />
                    <MetricCard label="MA 200D" value={fmt(stats.ma_200d, 2)} color="blue" />
                    <MetricCard label="52W Change" value={fmtPct(stats.price_change_52w)} color="green" />
                    <MetricCard label="Avg Vol 20D" value={fmtLarge(stats.avg_volume_20d)} color="teal" />
                </div>
            </div>

            {/* Balance Sheet */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                    <SectionHeader icon="🏦" title="Balance Sheet Highlights" />
                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard label="Cash" value={fmtLarge(stats.cash_ttm)} color="green" />
                        <MetricCard label="Total Debt" value={fmtLarge(stats.total_debt)} color="red" />
                        <MetricCard label="Net Cash" value={fmtLarge(stats.net_cash)} color="teal" />
                        <MetricCard label="Book Value" value={fmtLarge(stats.book_value)} color="blue" />
                        <MetricCard label="BVPS" value={fmt(stats.bvps, 2)} color="purple" />
                        <MetricCard label="Working Cap" value={fmtLarge(stats.working_capital)} color="amber" />
                    </div>
                </div>
                <FinancialsBarChart stats={stats} />
            </div>

            {/* Ownership & Scores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                    <SectionHeader icon="📋" title="Share Statistics" />
                    <div className="grid grid-cols-2 gap-4">
                        <MetricCard label="Shares Out" value={fmtLarge(stats.shares_outstanding)} color="blue" />
                        <MetricCard label="Float" value={fmtLarge(stats.float_shares)} color="blue" />
                        <MetricCard label="Insider Own" value={fmtPct(stats.insider_ownership)} color="amber" />
                        <MetricCard label="Institut Own" value={fmtPct(stats.institutional_ownership)} color="green" />
                        <MetricCard label="EPS (TTM)" value={fmt(stats.eps_ttm, 2)} color="purple" />
                        <MetricCard label="FCF/Share" value={fmt(stats.fcf_per_share, 2)} color="teal" />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
                    <SectionHeader icon="⭐" title="Quality Scores" subtitle="Financial health indicators" />
                    <div className="flex justify-around items-center h-48">
                        {hasValue(stats.piotroski_f_score) && (
                            <div className="text-center">
                                <div className="text-6xl font-black text-blue-600">{stats.piotroski_f_score}</div>
                                <div className="text-sm text-gray-500 mt-2">Piotroski F-Score</div>
                                <div className="text-xs text-gray-400">(out of 9)</div>
                            </div>
                        )}
                        {hasValue(stats.altman_z_score) && (
                            <div className="text-center">
                                <div className="text-6xl font-black text-green-600">{fmt(stats.altman_z_score, 2)}</div>
                                <div className="text-sm text-gray-500 mt-2">Altman Z-Score</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Dividends Tab
const DividendsTab = ({ dividends, stats, symbol }: { dividends: DividendData[]; stats: StatisticsData | null; symbol: string }) => {
    const total = dividends.reduce((s, d) => s + (d.dividend_amount || 0), 0);
    const latest = dividends[0]?.dividend_amount || 0;

    if (!dividends.length && !stats?.dividend_yield) return <div className="text-center py-16 bg-white rounded-2xl border-2 border-gray-100"><span className="text-5xl">💰</span><p className="text-gray-500 mt-4 text-lg">No dividend history for {symbol}</p></div>;

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl p-6 border-2 border-green-200">
                    <p className="text-green-700 font-bold text-sm">Dividend Yield</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">{stats?.dividend_yield ? fmtPct(stats.dividend_yield) : '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-6 border-2 border-blue-200">
                    <p className="text-blue-700 font-bold text-sm">DPS (Annual)</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">{fmt(stats?.dps, 2)} <span className="text-lg text-gray-500">EGP</span></p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl p-6 border-2 border-amber-200">
                    <p className="text-amber-700 font-bold text-sm">Payout Ratio</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">{stats?.payout_ratio ? fmtPct(stats.payout_ratio) : '-'}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                    <p className="text-purple-700 font-bold text-sm">Total Payments</p>
                    <p className="text-4xl font-black text-gray-900 mt-2">{dividends.length}</p>
                </div>
            </div>

            <DividendTrendChart dividends={dividends} />

            {/* History Table */}
            {dividends.length > 0 && (
                <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Payment History</h3>
                        <button onClick={() => { const csv = ['Ex-Date,Amount,Record,Pay'].concat(dividends.map(d => `${d.ex_date},${d.dividend_amount},${d.record_date || ''},${d.pay_date || ''}`)).join('\n'); const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${symbol}_dividends.csv`; a.click(); }} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-500">📊 Export</button>
                    </div>
                    <table className="w-full">
                        <thead className="bg-gray-50"><tr className="text-gray-500 text-xs uppercase"><th className="py-3 px-4 text-left">Ex-Date</th><th className="py-3 px-4 text-right">Amount</th><th className="py-3 px-4 text-left hidden md:table-cell">Record</th><th className="py-3 px-4 text-left hidden md:table-cell">Pay Date</th></tr></thead>
                        <tbody className="divide-y">{dividends.map((d, i) => (<tr key={i} className="hover:bg-gray-50"><td className="py-3 px-4 text-gray-700 font-medium">{d.ex_date}</td><td className="py-3 px-4 text-right font-bold text-green-600">{fmt(d.dividend_amount)} EGP</td><td className="py-3 px-4 text-gray-500 hidden md:table-cell">{d.record_date || '-'}</td><td className="py-3 px-4 text-gray-500 hidden md:table-cell">{d.pay_date || '-'}</td></tr>))}</tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

// History Tab
const HistoryTab = ({ ohlc, symbol }: { ohlc: OHLCData[]; symbol: string }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center"><h3 className="text-xl font-bold text-gray-900">📈 Price History ({ohlc.length} days)</h3>
            <button onClick={() => { const csv = ['Date,Open,High,Low,Close,Volume'].concat(ohlc.map(d => `${d.date},${d.open},${d.high},${d.low},${d.close},${d.volume}`)).join('\n'); const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${symbol}_history.csv`; a.click(); }} className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500">📊 Export Excel</button>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden max-h-[700px] overflow-y-auto">
            <table className="w-full"><thead className="bg-gray-50 sticky top-0"><tr className="text-gray-500 text-xs uppercase"><th className="py-3 px-4 text-left">Date</th><th className="py-3 px-4 text-right">Open</th><th className="py-3 px-4 text-right">High</th><th className="py-3 px-4 text-right">Low</th><th className="py-3 px-4 text-right">Close</th><th className="py-3 px-4 text-right">Volume</th></tr></thead>
                <tbody className="divide-y">{ohlc.slice(0, 150).map((d, i) => (<tr key={i} className="hover:bg-gray-50 text-sm"><td className="py-2 px-4 text-gray-700 font-medium">{d.date}</td><td className="py-2 px-4 text-right text-gray-500">{fmt(d.open)}</td><td className="py-2 px-4 text-right text-green-600 font-medium">{fmt(d.high)}</td><td className="py-2 px-4 text-right text-red-500 font-medium">{fmt(d.low)}</td><td className="py-2 px-4 text-right font-bold text-gray-900">{fmt(d.close)}</td><td className="py-2 px-4 text-right text-gray-500">{d.volume?.toLocaleString()}</td></tr>))}</tbody>
            </table>
        </div>
    </div>
);

// Profile Tab
const ProfileTab = ({ stock }: { stock: StockData }) => (
    <div className="space-y-6">
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🏢 Company Overview</h3>
            <p className="text-gray-600 leading-relaxed text-lg">{stock.name_en} is listed on the Egyptian Stock Exchange (EGX) under the symbol <span className="font-bold text-blue-600">{stock.symbol}</span>, operating in the {stock.sector_name || 'Financials'} sector. The company trades in Egyptian Pounds (EGP) and has a market capitalization of {fmtLarge(stock.market_cap)} EGP.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{ l: 'Symbol', v: stock.symbol, icon: '🏷️' }, { l: 'English Name', v: stock.name_en, icon: '🏢' }, { l: 'Arabic Name', v: stock.name_ar || '-', icon: '🔤' }, { l: 'Sector', v: stock.sector_name || '-', icon: '🏭' }, { l: 'Exchange', v: 'EGX - Cairo', icon: '🏛️' }, { l: 'Currency', v: 'EGP', icon: '💵' }, { l: 'Market Cap', v: fmtLarge(stock.market_cap) + ' EGP', icon: '💰' }, { l: 'Last Updated', v: stock.last_updated ? new Date(stock.last_updated).toLocaleString() : '-', icon: '🕐' }].map((x, i) => (
                <div key={i} className="bg-white rounded-xl p-5 border-2 border-gray-100 flex items-center gap-4">
                    <span className="text-2xl">{x.icon}</span>
                    <div><p className="text-gray-500 text-xs uppercase font-bold">{x.l}</p><p className="text-gray-900 font-bold mt-1">{x.v}</p></div>
                </div>
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
            try {
                const [stockR, statsR, ohlcR, divR] = await Promise.allSettled([
                    fetch(`${API_BASE}/api/v1/egx/stock/${symbol}`).then(r => r.ok ? r.json() : null),
                    fetch(`${API_BASE}/api/v1/egx/statistics/${symbol}`).then(r => r.ok ? r.json() : null),
                    fetch(`${API_BASE}/api/v1/egx/ohlc/${symbol}?period=1y`).then(r => r.ok ? r.json() : []),
                    fetch(`${API_BASE}/api/v1/egx/dividends/${symbol}`).then(r => r.ok ? r.json() : [])
                ]);
                if (stockR.status === 'fulfilled') setStock(stockR.value);
                if (statsR.status === 'fulfilled') setStats(statsR.value);
                if (ohlcR.status === 'fulfilled') setOhlc(Array.isArray(ohlcR.value) ? ohlcR.value : []);
                if (divR.status === 'fulfilled') setDividends(Array.isArray(divR.value) ? divR.value : []);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, [symbol]);

    if (loading) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto" /><p className="text-gray-500 mt-4 text-lg font-medium">Loading {symbol}...</p></div></div>);
    if (!stock) return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><span className="text-7xl">🔍</span><h1 className="text-3xl font-bold text-gray-900 mt-4">Stock Not Found</h1><p className="text-gray-500 mt-2">{symbol} is not available</p><Link href="/egx" className="text-blue-600 hover:underline mt-6 inline-block font-semibold">← Back to EGX Market</Link></div></div>);

    return (
        <div className="min-h-screen bg-gray-50">
            <Script src="https://unpkg.com/lightweight-charts@4.1.0/dist/lightweight-charts.standalone.production.js" strategy="beforeInteractive" />

            {/* Header */}
            <div className="bg-white border-b-2 border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-4"><Link href="/egx" className="hover:text-blue-600 font-medium">🇪🇬 EGX Market</Link><span>/</span><span className="text-gray-900 font-bold">{symbol}</span></div>
                    <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black text-gray-900">{symbol}</h1>
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${stock.change_percent >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {stock.change_percent >= 0 ? '▲' : '▼'} {Math.abs(stock.change_percent).toFixed(2)}%
                                </span>
                            </div>
                            <p className="text-gray-600 mt-2 text-lg">{stock.name_en}</p>
                            <span className="inline-block mt-3 px-4 py-1.5 bg-blue-100 text-blue-700 text-sm font-bold rounded-full">{stock.sector_name || 'EGX'}</span>
                        </div>
                        <div className="text-right">
                            <p className="text-5xl font-black text-gray-900">{fmt(stock.last_price)} <span className="text-xl text-gray-400">EGP</span></p>
                            <p className={`text-xl font-bold mt-1 ${stock.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {stock.change_percent >= 0 ? '+' : ''}{fmt(stock.change)} ({stock.change_percent >= 0 ? '+' : ''}{fmt(stock.change_percent)}%)
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border-2 border-gray-100 shadow-sm overflow-x-auto">
                    {[
                        { id: 'overview', icon: '📊', l: 'Overview' },
                        { id: 'statistics', icon: '📋', l: 'Statistics', count: stats ? 43 : 0 },
                        { id: 'dividends', icon: '💰', l: 'Dividends', count: dividends.length },
                        { id: 'history', icon: '📈', l: 'History', count: ohlc.length },
                        { id: 'profile', icon: '🏢', l: 'Profile' }
                    ].map(t => (<TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} icon={t.icon} label={t.l} count={t.count} />))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {tab === 'overview' && <OverviewTab stock={stock} stats={stats} ohlc={ohlc} dividends={dividends} />}
                {tab === 'statistics' && <StatisticsTab stats={stats} />}
                {tab === 'dividends' && <DividendsTab dividends={dividends} stats={stats} symbol={symbol} />}
                {tab === 'history' && <HistoryTab ohlc={ohlc} symbol={symbol} />}
                {tab === 'profile' && <ProfileTab stock={stock} />}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-center border-t-2 border-gray-100">
                <p className="text-gray-500 text-sm">Last Updated: {stock.last_updated ? new Date(stock.last_updated).toLocaleString() : '-'} • Egyptian Stock Exchange • Data auto-refreshed</p>
            </div>
        </div>
    );
}
