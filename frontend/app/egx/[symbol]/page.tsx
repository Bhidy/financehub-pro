'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// Types
interface OHLCData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adj_close: number;
    volume: number;
    change_percent: number;
}

interface StockDetail {
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

interface ProfileData {
    symbol: string;
    description: string;
    website: string;
    industry: string;
    sector: string;
    employees: number;
    ceo: string;
    founded: string;
    headquarters: string;
}

interface DividendData {
    ex_date: string;
    payment_date: string;
    record_date: string;
    amount: number;
}

// Helpers
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Export to Excel function
const exportToExcel = (data: OHLCData[], symbol: string) => {
    const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume', 'Change %'];
    const csvContent = [
        headers.join(','),
        ...data.map(d => [
            d.date, d.open, d.high, d.low, d.close, d.adj_close, d.volume, d.change_percent
        ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${symbol}_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// Tab Components
const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${active
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
    >
        {children}
    </button>
);

// Overview Tab
const OverviewTab = ({ stock, ohlc }: { stock: StockDetail; ohlc: OHLCData[] }) => {
    const weekHigh = useMemo(() => Math.max(...ohlc.slice(0, 252).map(d => d.high || 0)), [ohlc]);
    const weekLow = useMemo(() => Math.min(...ohlc.slice(0, 252).filter(d => d.low > 0).map(d => d.low)), [ohlc]);

    return (
        <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm">Current Price</p>
                        <p className="text-4xl font-bold text-white">{formatNumber(stock.last_price)} <span className="text-lg text-slate-400">EGP</span></p>
                    </div>
                    <div className={`text-3xl font-bold ${stock.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stock.change_percent >= 0 ? '+' : ''}{formatNumber(stock.change_percent)}%
                    </div>
                </div>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Market Cap', value: formatMarketCap(stock.market_cap), suffix: 'EGP' },
                    { label: 'P/E Ratio', value: formatNumber(stock.pe_ratio, 1), suffix: '' },
                    { label: 'Dividend Yield', value: stock.dividend_yield ? `${formatNumber(stock.dividend_yield)}%` : 'N/A', suffix: '' },
                    { label: 'Volume', value: stock.volume?.toLocaleString() || 'N/A', suffix: '' },
                    { label: '52W High', value: formatNumber(weekHigh), suffix: 'EGP' },
                    { label: '52W Low', value: formatNumber(weekLow), suffix: 'EGP' },
                    { label: 'Revenue (TTM)', value: formatMarketCap(stock.revenue), suffix: '' },
                    { label: 'Net Income', value: formatMarketCap(stock.net_income), suffix: '' },
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                        <p className="text-slate-400 text-xs uppercase tracking-wider">{stat.label}</p>
                        <p className="text-white text-lg font-semibold mt-1">{stat.value} <span className="text-slate-500 text-sm">{stat.suffix}</span></p>
                    </div>
                ))}
            </div>

            {/* Simple Price Chart */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <h3 className="text-white font-semibold mb-4">Price Chart (6 Months)</h3>
                <div className="flex items-end gap-1 h-40">
                    {[...ohlc].reverse().slice(-120).map((d, i) => {
                        const prices = ohlc.map(x => x.close).filter(x => x > 0);
                        const min = Math.min(...prices);
                        const max = Math.max(...prices);
                        const range = max - min || 1;
                        const height = ((d.close - min) / range) * 100;
                        const color = d.change_percent >= 0 ? 'bg-emerald-500' : 'bg-red-500';

                        return (
                            <div
                                key={i}
                                className={`${color} rounded-t opacity-60 hover:opacity-100 transition-opacity`}
                                style={{ height: `${Math.max(height, 2)}%`, flex: 1 }}
                                title={`${d.date}: ${formatNumber(d.close)} EGP`}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// History Tab with Export
const HistoryTab = ({ ohlc, symbol }: { ohlc: OHLCData[]; symbol: string }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Price History ({ohlc.length} records)</h3>
            <button
                onClick={() => exportToExcel(ohlc, symbol)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
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
                        <th className="py-3 px-4 text-right">Change</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                    {ohlc.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-800/50 text-sm">
                            <td className="py-2 px-4 text-slate-300">{d.date}</td>
                            <td className="py-2 px-4 text-right text-slate-400">{formatNumber(d.open)}</td>
                            <td className="py-2 px-4 text-right text-emerald-400">{formatNumber(d.high)}</td>
                            <td className="py-2 px-4 text-right text-red-400">{formatNumber(d.low)}</td>
                            <td className="py-2 px-4 text-right text-white font-medium">{formatNumber(d.close)}</td>
                            <td className="py-2 px-4 text-right text-slate-400">{d.volume?.toLocaleString()}</td>
                            <td className={`py-2 px-4 text-right ${d.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {d.change_percent >= 0 ? '+' : ''}{formatNumber(d.change_percent)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// Profile Tab
const ProfileTab = ({ profile, stock }: { profile: ProfileData | null; stock: StockDetail }) => (
    <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <h3 className="text-white font-semibold mb-4">Company Overview</h3>
            <p className="text-slate-300 leading-relaxed">
                {profile?.description || `${stock.name_en} is a company listed on the Egyptian Stock Exchange (EGX) under the symbol ${stock.symbol}, operating in the ${stock.sector_name || 'Financial Services'} sector.`}
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
                { label: 'CEO', value: profile?.ceo || 'N/A' },
                { label: 'Industry', value: profile?.industry || stock.sector_name || 'N/A' },
                { label: 'Sector', value: profile?.sector || stock.sector_name || 'N/A' },
                { label: 'Employees', value: profile?.employees?.toLocaleString() || 'N/A' },
                { label: 'Founded', value: profile?.founded || 'N/A' },
                { label: 'Headquarters', value: profile?.headquarters || 'Egypt' },
                { label: 'Website', value: profile?.website || 'N/A', isLink: true },
                { label: 'Exchange', value: 'Egyptian Stock Exchange (EGX)' },
            ].map((item, i) => (
                <div key={i} className="bg-slate-800/40 rounded-lg p-4 border border-slate-700/30">
                    <p className="text-slate-500 text-xs uppercase tracking-wider">{item.label}</p>
                    {item.isLink && item.value !== 'N/A' ? (
                        <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-1 block">
                            {item.value}
                        </a>
                    ) : (
                        <p className="text-white mt-1">{item.value}</p>
                    )}
                </div>
            ))}
        </div>
    </div>
);

// Dividends Tab
const DividendsTab = ({ dividends, symbol }: { dividends: DividendData[]; symbol: string }) => (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Dividend History</h3>
            {dividends.length > 0 && (
                <button
                    onClick={() => {
                        const headers = ['Ex-Date', 'Payment Date', 'Record Date', 'Amount (EGP)'];
                        const csv = [
                            headers.join(','),
                            ...dividends.map(d => [d.ex_date, d.payment_date, d.record_date, d.amount].join(','))
                        ].join('\n');
                        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = `${symbol}_dividends.csv`;
                        link.click();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm"
                >
                    📊 Export
                </button>
            )}
        </div>

        {dividends.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700/50 text-center">
                <span className="text-4xl block mb-4">💰</span>
                <p className="text-slate-400">No dividend history available for {symbol}</p>
            </div>
        ) : (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-900/80">
                        <tr className="text-slate-400 text-xs uppercase">
                            <th className="py-3 px-4 text-left">Ex-Date</th>
                            <th className="py-3 px-4 text-left">Payment Date</th>
                            <th className="py-3 px-4 text-left">Record Date</th>
                            <th className="py-3 px-4 text-right">Amount (EGP)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                        {dividends.map((d, i) => (
                            <tr key={i} className="hover:bg-slate-800/50">
                                <td className="py-3 px-4 text-slate-300">{d.ex_date}</td>
                                <td className="py-3 px-4 text-slate-400">{d.payment_date || '-'}</td>
                                <td className="py-3 px-4 text-slate-400">{d.record_date || '-'}</td>
                                <td className="py-3 px-4 text-right text-emerald-400 font-medium">{formatNumber(d.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

// Main Component
export default function EGXStockDetailPage() {
    const params = useParams();
    const symbol = (params?.symbol as string)?.toUpperCase() || '';

    const [stock, setStock] = useState<StockDetail | null>(null);
    const [ohlc, setOhlc] = useState<OHLCData[]>([]);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [dividends, setDividends] = useState<DividendData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!symbol) return;

        const loadData = async () => {
            setLoading(true);

            try {
                const [stockRes, ohlcRes] = await Promise.all([
                    fetch(`${API_BASE}/api/egx/stock/${symbol}`),
                    fetch(`${API_BASE}/api/egx/ohlc/${symbol}?period=max`)
                ]);

                if (stockRes.ok) setStock(await stockRes.json());
                if (ohlcRes.ok) setOhlc(await ohlcRes.json());

                // Try to fetch profile and dividends (may not exist)
                try {
                    const profileRes = await fetch(`${API_BASE}/api/egx/profile/${symbol}`);
                    if (profileRes.ok) setProfile(await profileRes.json());
                } catch { }

                try {
                    const divRes = await fetch(`${API_BASE}/api/egx/dividends/${symbol}`);
                    if (divRes.ok) setDividends(await divRes.json());
                } catch { }

            } catch (e) {
                console.error('Error loading data:', e);
            }

            setLoading(false);
        };

        loadData();
    }, [symbol]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-slate-400 mt-4">Loading {symbol}...</p>
                </div>
            </div>
        );
    }

    if (!stock) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <span className="text-6xl block mb-4">🔍</span>
                    <h1 className="text-2xl font-bold text-white">Stock Not Found</h1>
                    <p className="text-slate-400 mt-2">{symbol} is not available</p>
                    <Link href="/egx" className="text-blue-400 hover:underline mt-4 inline-block">
                        ← Back to EGX Market
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900/20 via-slate-800 to-blue-900/20 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
                        <Link href="/egx" className="hover:text-blue-400">🇪🇬 EGX</Link>
                        <span>/</span>
                        <span className="text-white font-medium">{symbol}</span>
                    </div>

                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white">{symbol}</h1>
                            <p className="text-slate-400 mt-1">{stock.name_en}</p>
                            {stock.sector_name && (
                                <span className="inline-block mt-2 px-3 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-full">
                                    {stock.sector_name}
                                </span>
                            )}
                        </div>

                        <div className="text-right">
                            <p className="text-4xl font-bold text-white">
                                {formatNumber(stock.last_price)} <span className="text-xl text-slate-400">EGP</span>
                            </p>
                            <p className={`text-xl font-semibold mt-1 ${stock.change_percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {stock.change_percent >= 0 ? '+' : ''}{formatNumber(stock.change_percent)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex flex-wrap gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
                    {[
                        { id: 'overview', label: 'Overview', icon: '📊' },
                        { id: 'history', label: 'History', icon: '📈' },
                        { id: 'profile', label: 'Profile', icon: '🏢' },
                        { id: 'dividends', label: 'Dividends', icon: '💰' },
                    ].map(tab => (
                        <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
                            <span className="mr-1">{tab.icon}</span>
                            {tab.label}
                        </TabButton>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === 'overview' && <OverviewTab stock={stock} ohlc={ohlc} />}
                {activeTab === 'history' && <HistoryTab ohlc={ohlc} symbol={symbol} />}
                {activeTab === 'profile' && <ProfileTab profile={profile} stock={stock} />}
                {activeTab === 'dividends' && <DividendsTab dividends={dividends} symbol={symbol} />}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 py-8 text-center text-slate-500 text-sm">
                <p>Last Updated: {stock.last_updated ? new Date(stock.last_updated).toLocaleString() : 'N/A'}</p>
            </div>
        </div>
    );
}
