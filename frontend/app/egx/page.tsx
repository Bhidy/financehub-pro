'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';

// Types
interface EGXStock {
    symbol: string;
    name_en: string;
    sector_name: string;
    market_code: string;
    currency: string;
    market_cap: number;
    last_price: number;
    change_percent: number;
    volume: number;
    pe_ratio: number;
    dividend_yield: number;
    revenue: number;
    net_income: number;
    last_updated: string;
}

interface EGXStats {
    total_stocks: number;
    total_ohlc_records: number;
    stocks_with_history: number;
    market_overview: {
        total_market_cap: number;
        avg_change: number;
        total_volume: number;
        advancing: number;
        declining: number;
        unchanged: number;
    };
}

// Helper functions
const formatNumber = (num: number | null, decimals = 2) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const formatMarketCap = (num: number | null) => {
    if (!num) return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
};

// Excel Export Function
const exportToExcel = (data: EGXStock[], filename: string = 'egx_stocks') => {
    // Create CSV content
    const headers = [
        'Symbol', 'Company Name', 'Sector', 'Price (EGP)', 'Change %',
        'Market Cap', 'Volume', 'P/E Ratio', 'Dividend Yield %', 'Revenue', 'Net Income'
    ];

    const csvContent = [
        headers.join(','),
        ...data.map(stock => [
            stock.symbol,
            `"${stock.name_en?.replace(/"/g, '""') || ''}"`,
            `"${stock.sector_name || ''}"`,
            stock.last_price || '',
            stock.change_percent || '',
            stock.market_cap || '',
            stock.volume || '',
            stock.pe_ratio || '',
            stock.dividend_yield || '',
            stock.revenue || '',
            stock.net_income || ''
        ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// API Functions (using internal Next.js API routes)
const API_BASE = '/api/v1';

const fetchEGXStocks = async (limit = 300): Promise<EGXStock[]> => {
    try {
        const res = await fetch(`${API_BASE}/egx/stocks?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch');
        return await res.json();
    } catch (e) {
        console.error('Error fetching EGX stocks:', e);
        return [];
    }
};

const fetchEGXStats = async (): Promise<EGXStats | null> => {
    try {
        const res = await fetch(`${API_BASE}/egx/stats`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        // Transform API response to match interface
        return {
            total_stocks: data.total_stocks || 223,
            total_ohlc_records: data.total_ohlc || 0,
            stocks_with_history: data.total_stocks || 0,
            market_overview: {
                total_market_cap: 0,
                avg_change: 0,
                total_volume: data.total_volume || 0,
                advancing: data.gainers || 0,
                declining: data.losers || 0,
                unchanged: data.unchanged || 0
            }
        };
    } catch {
        return null;
    }
};

// Components
const StatCard = ({ title, value, subtitle, icon, color = 'blue' }: {
    title: string; value: string; subtitle?: string; icon: string; color?: string
}) => {
    const colorClasses: Record<string, string> = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-200/50',
        green: 'from-emerald-500 to-emerald-600 shadow-emerald-200/50',
        red: 'from-red-500 to-red-600 shadow-red-200/50',
        amber: 'from-amber-500 to-amber-600 shadow-amber-200/50',
        teal: 'from-teal-500 to-teal-600 shadow-teal-200/50',
    };

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${colorClasses[color]} rounded-2xl p-5 text-white shadow-xl`}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/80 text-sm font-medium">{title}</p>
                    <p className="text-2xl font-bold text-white mt-1">{value}</p>
                    {subtitle && <p className="text-white/60 text-xs mt-1">{subtitle}</p>}
                </div>
                <div className="text-4xl opacity-60">{icon}</div>
            </div>
        </div>
    );
};

const StockRow = ({ stock, rank }: { stock: EGXStock; rank: number }) => {
    const changeColor = stock.change_percent > 0 ? 'text-emerald-600' : stock.change_percent < 0 ? 'text-red-600' : 'text-slate-500';
    const changeBg = stock.change_percent > 0 ? 'bg-emerald-50' : stock.change_percent < 0 ? 'bg-red-50' : 'bg-slate-50';

    return (
        <tr className="border-b border-slate-100 hover:bg-blue-50/50 transition-all group">
            <td className="py-3 px-3 text-slate-500 text-sm font-mono">{rank}</td>
            <td className="py-3 px-3">
                <Link href={`/egx/${stock.symbol}`} className="font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    {stock.symbol}
                </Link>
            </td>
            <td className="py-3 px-3">
                <span className="text-slate-700 text-sm group-hover:text-slate-900 transition-colors">
                    {stock.name_en?.slice(0, 40)}{stock.name_en?.length > 40 ? '...' : ''}
                </span>
            </td>
            <td className="py-3 px-3">
                <span className="text-slate-600 text-xs bg-slate-100 px-2 py-0.5 rounded-full">
                    {stock.sector_name || 'N/A'}
                </span>
            </td>
            <td className="py-3 px-3 text-right">
                <span className="text-slate-900 font-bold">{formatNumber(stock.last_price)}</span>
                <span className="text-slate-400 text-xs ml-1">EGP</span>
            </td>
            <td className="py-3 px-3 text-right">
                <span className={`${changeColor} ${changeBg} px-2 py-1 rounded-full text-sm font-bold`}>
                    {stock.change_percent > 0 ? '+' : ''}{formatNumber(stock.change_percent)}%
                </span>
            </td>
            <td className="py-3 px-3 text-right text-slate-600 text-sm font-mono">
                {formatMarketCap(stock.market_cap)}
            </td>
            <td className="py-3 px-3 text-right text-slate-600 text-sm font-mono">
                {stock.volume ? stock.volume.toLocaleString() : '-'}
            </td>
            <td className="py-3 px-3 text-right text-slate-600 text-sm">
                {stock.pe_ratio ? formatNumber(stock.pe_ratio, 1) : '-'}
            </td>
            <td className="py-3 px-3 text-right text-slate-600 text-sm">
                {stock.dividend_yield ? `${formatNumber(stock.dividend_yield, 2)}%` : '-'}
            </td>
            <td className="py-3 px-3 text-center">
                <Link
                    href={`/egx/${stock.symbol}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                >
                    View
                </Link>
            </td>
        </tr>
    );
};

// Main Page Component
export default function EGXMarketPage() {
    const [stocks, setStocks] = useState<EGXStock[]>([]);
    const [stats, setStats] = useState<EGXStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('market_cap');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Fetch data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [stocksData, statsData] = await Promise.all([
                fetchEGXStocks(300),
                fetchEGXStats()
            ]);
            setStocks(stocksData);
            setStats(statsData);
            setLoading(false);
        };
        loadData();
    }, [sortBy]);

    // Get unique sectors for filter
    const sectors = useMemo(() => {
        const uniqueSectors = new Set(stocks.map(s => s.sector_name).filter(Boolean));
        return ['all', ...Array.from(uniqueSectors).sort()];
    }, [stocks]);

    // Filter and sort stocks
    const filteredStocks = useMemo(() => {
        let result = [...stocks];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(s =>
                s.symbol.toLowerCase().includes(query) ||
                s.name_en?.toLowerCase().includes(query)
            );
        }

        // Sector filter
        if (sectorFilter !== 'all') {
            result = result.filter(s => s.sector_name === sectorFilter);
        }

        // Sort
        result.sort((a, b) => {
            const aVal = a[sortBy as keyof EGXStock] ?? 0;
            const bVal = b[sortBy as keyof EGXStock] ?? 0;
            const multiplier = sortOrder === 'desc' ? -1 : 1;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return (aVal - bVal) * multiplier;
            }
            return 0;
        });

        return result;
    }, [stocks, searchQuery, sectorFilter, sortBy, sortOrder]);

    // Pagination
    const paginatedStocks = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredStocks.slice(start, start + itemsPerPage);
    }, [filteredStocks, currentPage]);

    const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);

    // Handle sort column click
    const handleSort = useCallback((column: string) => {
        if (sortBy === column) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(column);
            setSortOrder('desc');
        }
    }, [sortBy]);

    // Sort indicator
    const SortIndicator = ({ column }: { column: string }) => {
        if (sortBy !== column) return null;
        return <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-12">
            {/* Hero Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="text-5xl">🇪🇬</div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight">Egyptian Stock Exchange (EGX)</h1>
                                <p className="text-emerald-100 mt-1">
                                    Real-time data for <span className="text-white font-bold">{stats?.total_stocks || 223}</span> Egyptian stocks
                                </p>
                            </div>
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={() => exportToExcel(filteredStocks, 'egx_stocks')}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all shadow-lg backdrop-blur-sm"
                        >
                            <span>📊</span>
                            <span>Export to Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <StatCard
                        title="Total Stocks"
                        value={stats?.total_stocks?.toString() || '223'}
                        subtitle="Listed companies"
                        icon="🏦"
                        color="blue"
                    />
                    <StatCard
                        title="Market Cap"
                        value={stats?.market_overview?.total_market_cap ? formatMarketCap(stats.market_overview.total_market_cap) : 'N/A'}
                        subtitle="Total EGX value"
                        icon="💰"
                        color="amber"
                    />
                    <StatCard
                        title="Advancing"
                        value={stats?.market_overview?.advancing?.toString() || '0'}
                        subtitle="Stocks up today"
                        icon="📈"
                        color="green"
                    />
                    <StatCard
                        title="Declining"
                        value={stats?.market_overview?.declining?.toString() || '0'}
                        subtitle="Stocks down today"
                        icon="📉"
                        color="red"
                    />
                    <StatCard
                        title="Avg Change"
                        value={stats?.market_overview?.avg_change ? `${formatNumber(stats.market_overview.avg_change)}%` : 'N/A'}
                        subtitle="Market momentum"
                        icon="⚡"
                        color="purple"
                    />
                </div>
            </div>

            {/* Filters & Controls */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-lg shadow-slate-100/50">
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex flex-wrap gap-3">
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search stocks..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-64 pl-10"
                                />
                                <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
                            </div>

                            {/* Sector Filter */}
                            <select
                                value={sectorFilter}
                                onChange={(e) => { setSectorFilter(e.target.value); setCurrentPage(1); }}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                                {sectors.map(sector => (
                                    <option key={sector} value={sector}>
                                        {sector === 'all' ? 'All Sectors' : sector}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>Showing {paginatedStocks.length} of {filteredStocks.length} stocks</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stocks Table */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-teal-600 sticky top-0">
                                <tr className="text-slate-400 text-xs uppercase tracking-wider">
                                    <th className="py-4 px-3 text-left font-semibold">#</th>
                                    <th className="py-4 px-3 text-left font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('symbol')}>
                                        Symbol <SortIndicator column="symbol" />
                                    </th>
                                    <th className="py-4 px-3 text-left font-semibold">Company Name</th>
                                    <th className="py-4 px-3 text-left font-semibold">Sector</th>
                                    <th className="py-4 px-3 text-right font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('last_price')}>
                                        Price <SortIndicator column="last_price" />
                                    </th>
                                    <th className="py-4 px-3 text-right font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('change_percent')}>
                                        Change <SortIndicator column="change_percent" />
                                    </th>
                                    <th className="py-4 px-3 text-right font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('market_cap')}>
                                        Market Cap <SortIndicator column="market_cap" />
                                    </th>
                                    <th className="py-4 px-3 text-right font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('volume')}>
                                        Volume <SortIndicator column="volume" />
                                    </th>
                                    <th className="py-4 px-3 text-right font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('pe_ratio')}>
                                        P/E <SortIndicator column="pe_ratio" />
                                    </th>
                                    <th className="py-4 px-3 text-right font-semibold cursor-pointer hover:text-white" onClick={() => handleSort('dividend_yield')}>
                                        Yield <SortIndicator column="dividend_yield" />
                                    </th>
                                    <th className="py-4 px-3 text-center font-semibold">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan={11} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                                <span className="text-slate-400">Loading EGX market data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedStocks.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-16 text-center text-slate-400">
                                            <span className="text-4xl block mb-2">🔍</span>
                                            No stocks found matching your filters
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedStocks.map((stock, index) => (
                                        <StockRow
                                            key={stock.symbol}
                                            stock={stock}
                                            rank={(currentPage - 1) * itemsPerPage + index + 1}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center justify-between">
                            <div className="text-sm text-slate-400">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 hover:bg-blue-50 hover:border-blue-200 transition-all font-medium"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 hover:bg-blue-50 hover:border-blue-200 transition-all font-medium"
                                >
                                    Prev
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 hover:bg-blue-50 hover:border-blue-200 transition-all font-medium"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-50 hover:bg-blue-50 hover:border-blue-200 transition-all font-medium"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg">
                    <p className="text-slate-500 text-sm">
                        Data Source: <span className="text-slate-700 font-medium">S&P Global Market Intelligence via StockAnalysis.com</span>
                    </p>
                    <p className="text-slate-400 text-xs mt-2">
                        EGX Market Hours: Sun-Thu, 10:00-14:30 (Egypt Time, UTC+2) • Auto-updated every 15 minutes
                    </p>
                </div>
            </div>
        </div>
    );
}
