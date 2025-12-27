"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, TrendingDown, Activity, Clock, DollarSign, BarChart3, Zap } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { fetchTickers, fetchIntraday, fetchOrderBook } from "@/lib/api";

export default function IntradayTradingPage() {
    const [selectedSymbol, setSelectedSymbol] = useState("4002");
    const [interval, setInterval] = useState("1m");

    // Fetch available symbols
    const { data: tickers } = useQuery({
        queryKey: ["tickers"],
        queryFn: async () => {
            const data = await fetchTickers();
            return data.slice(0, 10); // Top 10 most liquid
        },
    });

    // Fetch intraday bars
    const { data: intradayBars, isLoading: barsLoading } = useQuery({
        queryKey: ["intraday", selectedSymbol, interval],
        queryFn: async () => {
            const data = await fetchIntraday(selectedSymbol, interval, 300);
            return data.reverse(); // Oldest to newest for chart
        },
        refetchInterval: 60000, // Refresh every minute
    });

    // Fetch order book (Level 2)
    const { data: orderBook } = useQuery({
        queryKey: ["orderbook", selectedSymbol],
        queryFn: () => fetchOrderBook(selectedSymbol),
        refetchInterval: 10000, // Refresh every 10 seconds
    });

    const selectedTicker = tickers?.find((t: any) => t.symbol === selectedSymbol);
    const latestBar = intradayBars?.[intradayBars.length - 1];
    const change = latestBar ? ((parseFloat(latestBar.close) - parseFloat(intradayBars[0].open)) / parseFloat(intradayBars[0].open) * 100) : 0;

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">Intraday Trading Desk</h1>
                            <p className="text-blue-100 text-sm font-medium">Live 1-minute bars • Level 2 order book • Pro interface</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Symbol Selector & Controls */}
                <div className="bg-white rounded-2xl shadow-lg p-4 mb-4 border border-gray-200">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Symbol Dropdown */}
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">Select Symbol</label>
                            <select
                                value={selectedSymbol}
                                onChange={(e) => setSelectedSymbol(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none"
                            >
                                {tickers?.map((ticker: any) => (
                                    <option key={ticker.symbol} value={ticker.symbol}>
                                        {ticker.symbol} - {ticker.name_en}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Interval Selector */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Interval</label>
                            <div className="flex gap-2">
                                {["1m", "5m", "15m"].map((int) => (
                                    <button
                                        key={int}
                                        onClick={() => setInterval(int)}
                                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${interval === int
                                            ? "bg-blue-600 text-white shadow-lg"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                    >
                                        {int}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Live Status */}
                        <div className="bg-green-100 border border-green-500 rounded-lg px-4 py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-green-600 text-sm font-bold">LIVE</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Price Header */}
                {selectedTicker && latestBar && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-4 border border-gray-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-800 mb-1">{selectedTicker.symbol}</h2>
                                <p className="text-sm text-gray-500">{selectedTicker.name_en}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-bold text-gray-800 mb-1">
                                    SAR {parseFloat(latestBar.close).toFixed(2)}
                                </div>
                                <div className={`text-lg font-semibold flex items-center justify-end gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {change >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Open</div>
                                <div className="text-lg font-bold text-gray-800">{parseFloat(intradayBars?.[0]?.open || 0).toFixed(2)}</div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">High</div>
                                <div className="text-lg font-bold text-green-600">
                                    {Math.max(...(intradayBars?.map((b: any) => parseFloat(b.high)) || [0])).toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Low</div>
                                <div className="text-lg font-bold text-red-600">
                                    {Math.min(...(intradayBars?.map((b: any) => parseFloat(b.low)) || [999999])).toFixed(2)}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-xs text-gray-500">Volume</div>
                                <div className="text-lg font-bold text-blue-600">
                                    {((intradayBars?.reduce((sum: number, b: any) => sum + parseInt(b.volume), 0) || 0) / 1000000).toFixed(1)}M
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <BarChart3 className="text-blue-600" />
                            Intraday Chart ({interval.toUpperCase()})
                        </h3>
                        {barsLoading ? (
                            <div className="h-96 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-cyan-500"></div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={400}>
                                <ComposedChart data={intradayBars}>
                                    <XAxis
                                        dataKey="timestamp"
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        tickFormatter={(time) => new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    />
                                    <YAxis
                                        domain={['auto', 'auto']}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                                        labelStyle={{ color: '#e2e8f0' }}
                                        formatter={(value: any) => [`SAR ${parseFloat(value).toFixed(2)}`, '']}
                                        labelFormatter={(time) => new Date(time).toLocaleTimeString()}
                                    />
                                    <Line
                                        type="stepAfter"
                                        dataKey="close"
                                        stroke="#06b6d4"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <Bar dataKey="volume" fill="#3b82f6" opacity={0.3} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    {/* Order Book */}
                    <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Activity className="text-cyan-400" />
                            Order Book (L2)
                        </h3>
                        {orderBook ? (
                            <div>
                                {/* Asks (Sellers) */}
                                <div className="mb-4">
                                    <div className="text-xs text-red-400 font-bold mb-2">ASKS (SELLERS)</div>
                                    <div className="space-y-1">
                                        {orderBook.asks?.slice().reverse().map((ask: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-red-500/10 rounded">
                                                <span className="text-red-400 font-mono">{ask.price.toFixed(2)}</span>
                                                <span className="text-slate-400">{(ask.size / 1000).toFixed(1)}K</span>
                                                <span className="text-xs text-slate-500">{ask.orders}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Spread */}
                                <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-2 mb-4 text-center">
                                    <div className="text-xs text-yellow-400 font-bold">SPREAD</div>
                                    <div className="text-lg font-mono text-white">
                                        {orderBook.spread?.toFixed(4)} SAR
                                    </div>
                                </div>

                                {/* Bids (Buyers) */}
                                <div>
                                    <div className="text-xs text-green-400 font-bold mb-2">BIDS (BUYERS)</div>
                                    <div className="space-y-1">
                                        {orderBook.bids?.map((bid: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-green-500/10 rounded">
                                                <span className="text-green-400 font-mono">{bid.price.toFixed(2)}</span>
                                                <span className="text-slate-400">{(bid.size / 1000).toFixed(1)}K</span>
                                                <span className="text-xs text-slate-500">{bid.orders}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-slate-500">
                                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Loading order book...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Time & Sales (Latest Trades) */}
                <div className="mt-4 bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="text-cyan-400" />
                        Recent Bars (Last 10)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="px-4 py-2 text-left text-xs text-slate-400">Time</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-400">Open</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-400">High</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-400">Low</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-400">Close</th>
                                    <th className="px-4 py-2 text-right text-xs text-slate-400">Volume</th>
                                </tr>
                            </thead>
                            <tbody>
                                {intradayBars?.slice(-10).reverse().map((bar: any, idx: number) => {
                                    const open = parseFloat(bar.open) || 0;
                                    const high = parseFloat(bar.high) || 0;
                                    const low = parseFloat(bar.low) || 0;
                                    const close = parseFloat(bar.close) || 0;
                                    const volume = parseInt(bar.volume) || 0;

                                    return (
                                        <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                            <td className="px-4 py-2 text-sm text-slate-300">
                                                {new Date(bar.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right font-mono text-white">{open.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-sm text-right font-mono text-green-400">{high.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-sm text-right font-mono text-red-400">{low.toFixed(2)}</td>
                                            <td className={`px-4 py-2 text-sm text-right font-mono font-bold ${close >= open ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {close.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-right text-blue-400">
                                                {(volume / 1000).toFixed(1)}K
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
