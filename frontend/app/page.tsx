"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchTickers,
  Ticker,
} from "@/lib/api";
import { useMemo } from "react";
import clsx from "clsx";
import MarketTicker from "@/components/MarketTicker";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  DollarSign,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Target
} from "lucide-react";

export default function Home() {
  const { data: tickers = [], isLoading } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });

  // Computed Lists
  const topGainers = useMemo(() => [...tickers].sort((a: Ticker, b: Ticker) => b.change_percent - a.change_percent).slice(0, 5), [tickers]);
  const topLosers = useMemo(() => [...tickers].sort((a: Ticker, b: Ticker) => a.change_percent - b.change_percent).slice(0, 5), [tickers]);
  const mostActive = useMemo(() => [...tickers].sort((a: Ticker, b: Ticker) => Number(b.volume) - Number(a.volume)).slice(0, 5), [tickers]);

  // Market Stats
  const marketVolume = useMemo(() => tickers.reduce((acc: number, t: Ticker) => acc + (Number(t.volume) || 0), 0), [tickers]);
  const marketTrend = useMemo(() => {
    if (!tickers.length) return 0;
    return (tickers.filter((t: Ticker) => t.change > 0).length / tickers.length) * 100;
  }, [tickers]);
  const totalStocks = tickers.length;
  const gainersCount = tickers.filter((t: Ticker) => t.change > 0).length;
  const losersCount = tickers.filter((t: Ticker) => t.change < 0).length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-12">
      {/* Premium Ticker Tape */}
      <MarketTicker />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black tracking-tight">Market Overview</h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm">
                  Saudi Exchange
                </span>
              </div>
              <p className="text-blue-100 font-medium">Real-time market data from Tadawul</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-blue-200 font-medium">Market Status</div>
                <div className="flex items-center gap-2 font-bold">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                  MARKET OPEN
                </div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-right">
                <div className="text-sm text-blue-200 font-medium">Active Stocks</div>
                <div className="text-2xl font-black">{totalStocks}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Volume",
              value: (marketVolume / 1000000).toFixed(1) + "M",
              icon: BarChart3,
              color: "blue",
              bg: "from-blue-500 to-blue-600"
            },
            {
              label: "Market Breadth",
              value: marketTrend.toFixed(1) + "% Up",
              icon: PieChart,
              color: "teal",
              bg: "from-teal-500 to-teal-600"
            },
            {
              label: "Gainers",
              value: gainersCount.toString(),
              icon: TrendingUp,
              color: "green",
              bg: "from-emerald-500 to-emerald-600"
            },
            {
              label: "Losers",
              value: losersCount.toString(),
              icon: TrendingDown,
              color: "red",
              bg: "from-red-500 to-red-600"
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={clsx(
                "relative overflow-hidden rounded-2xl p-5 text-white shadow-xl",
                `bg-gradient-to-br ${stat.bg}`
              )}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <stat.icon className="w-6 h-6 mb-3 opacity-80" />
              <div className="text-sm font-medium opacity-80">{stat.label}</div>
              <div className="text-2xl font-black">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* TASI Index Card */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">TASI Index</div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-5xl font-black text-slate-900 tracking-tight font-mono">12,150.45</span>
                    <div className="flex flex-col text-lg font-bold text-emerald-600">
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="w-5 h-5" />
                        +84.20
                      </span>
                      <span className="text-sm">(+0.72%)</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["1D", "1W", "1M", "1Y"].map((tf) => (
                    <button
                      key={tf}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        tf === "1D"
                          ? "bg-blue-500 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Chart Area */}
            <div className="h-64 p-6 bg-gradient-to-b from-white to-blue-50/30">
              <div className="w-full h-full flex items-end gap-1">
                {Array.from({ length: 50 }, (_, i) => {
                  const height = 30 + Math.sin(i / 5) * 20 + Math.random() * 30;
                  const isUp = Math.random() > 0.4;
                  return (
                    <div
                      key={i}
                      className={clsx(
                        "flex-1 rounded-t transition-all duration-300 hover:opacity-80",
                        isUp ? "bg-emerald-400" : "bg-red-400"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Sector Performance */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-800">Sector Leaders</h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Banks", change: 1.24, color: "emerald" },
                  { name: "Petrochemicals", change: 0.89, color: "emerald" },
                  { name: "Telecom", change: -0.45, color: "red" },
                  { name: "Real Estate", change: 0.32, color: "emerald" },
                ].map((sector, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm font-medium text-slate-700">{sector.name}</span>
                    <span className={clsx(
                      "text-sm font-bold",
                      sector.change >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {sector.change >= 0 ? "+" : ""}{sector.change}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl p-5 text-white shadow-xl shadow-orange-200/50">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5" />
                <span className="font-bold">AI Market Insight</span>
              </div>
              <p className="text-sm text-white/90 leading-relaxed">
                Banking sector showing strong momentum with SABB and Rajhi leading gains.
                Consider monitoring energy stocks for potential reversal signals.
              </p>
              <button className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all">
                View Full Analysis →
              </button>
            </div>
          </div>
        </div>

        {/* Stock Lists Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Top Gainers */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-emerald-100/30 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-bold">Top Gainers</h3>
              </div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {topGainers.map((stock, i) => (
                    <Link
                      key={stock.symbol}
                      href={`/symbol/${stock.symbol}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{stock.symbol}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[120px]">{stock.name_en}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-slate-900">{Number(stock.last_price).toFixed(2)}</div>
                        <div className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          +{Number(stock.change_percent).toFixed(2)}%
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Losers */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-red-100/30 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-red-500 to-rose-500 text-white">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                <h3 className="font-bold">Top Losers</h3>
              </div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {topLosers.map((stock, i) => (
                    <Link
                      key={stock.symbol}
                      href={`/symbol/${stock.symbol}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-red-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-red-700 transition-colors">{stock.symbol}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[120px]">{stock.name_en}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-slate-900">{Number(stock.last_price).toFixed(2)}</div>
                        <div className="text-sm font-bold text-red-600 flex items-center gap-1">
                          <ArrowDownRight className="w-3 h-3" />
                          {Number(stock.change_percent).toFixed(2)}%
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Most Active */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-blue-100/30 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <h3 className="font-bold">Most Active</h3>
              </div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {mostActive.map((stock, i) => (
                    <Link
                      key={stock.symbol}
                      href={`/symbol/${stock.symbol}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{stock.symbol}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[120px]">{stock.name_en}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold font-mono text-slate-900">{Number(stock.last_price).toFixed(2)}</div>
                        <div className="text-sm font-bold text-blue-600">
                          {(Number(stock.volume) / 1000000).toFixed(2)}M
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
