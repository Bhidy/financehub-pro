"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchTickers,
  fetchSectors,
  fetchMarketSummary,
  Ticker,
} from "@/lib/api";
import { useMemo, useState } from "react";
import clsx from "clsx";
import MarketTicker from "@/components/MarketTicker";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Target,
  Sparkles,
  Clock,
  Building2,
  ChevronRight
} from "lucide-react";

export default function Home() {
  const { data: tickers = [], isLoading } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });
  const { data: sectors = [] } = useQuery({ queryKey: ["sectors"], queryFn: fetchSectors });
  const { data: marketSummary } = useQuery({ queryKey: ["market-summary"], queryFn: fetchMarketSummary });
  const [chartPeriod, setChartPeriod] = useState("1D");

  // Computed Lists - wrapped with safe array handling
  const topGainers = useMemo(() => {
    if (!tickers || tickers.length === 0) return [];
    return [...tickers].sort((a: Ticker, b: Ticker) => (b.change_percent || 0) - (a.change_percent || 0)).slice(0, 5);
  }, [tickers]);

  const topLosers = useMemo(() => {
    if (!tickers || tickers.length === 0) return [];
    return [...tickers].sort((a: Ticker, b: Ticker) => (a.change_percent || 0) - (b.change_percent || 0)).slice(0, 5);
  }, [tickers]);

  const mostActive = useMemo(() => {
    if (!tickers || tickers.length === 0) return [];
    return [...tickers].sort((a: Ticker, b: Ticker) => Number(b.volume || 0) - Number(a.volume || 0)).slice(0, 5);
  }, [tickers]);

  // Market Stats from real data - with safe fallbacks
  const marketVolume = marketSummary?.total_volume || (tickers?.reduce((acc: number, t: Ticker) => acc + (Number(t.volume) || 0), 0) || 0);
  const totalStocks = marketSummary?.total_stocks || tickers?.length || 0;
  const gainersCount = marketSummary?.advancing || tickers?.filter((t: Ticker) => (t.change || 0) > 0).length || 0;
  const losersCount = marketSummary?.declining || tickers?.filter((t: Ticker) => (t.change || 0) < 0).length || 0;
  const unchangedCount = marketSummary?.unchanged || Math.max(0, (totalStocks - gainersCount - losersCount));

  // Index values from market summary
  const indexValue = Number(marketSummary?.index_value) || 12150.45;
  const indexChange = Number(marketSummary?.index_change) || 0;
  const indexChangePercent = Number(marketSummary?.index_change_percent) || 0;

  // Top performing sectors (sorted by performance)
  const topSectors = useMemo(() => {
    if (!sectors || sectors.length === 0) return [];
    return [...sectors]
      .filter((s: any) => s.performance !== null && s.performance !== undefined)
      .sort((a: any, b: any) => (Number(b.performance) || 0) - (Number(a.performance) || 0))
      .slice(0, 4);
  }, [sectors]);

  // Dynamic Market Status Calculation (Saudi Market: 10 AM - 3 PM, Sun-Thu)
  const marketStatus = useMemo(() => {
    const now = new Date();
    // Saudi time is UTC+3
    const saudiOffset = 3 * 60; // minutes
    const saudiTime = new Date(now.getTime() + (saudiOffset + now.getTimezoneOffset()) * 60000);
    const hour = saudiTime.getHours();
    const day = saudiTime.getDay(); // 0=Sunday, 6=Saturday

    // Market is open: Sunday(0) to Thursday(4), 10 AM to 3 PM Saudi
    const isTradingDay = day >= 0 && day <= 4;
    const isTradingHours = hour >= 10 && hour < 15;
    const isOpen = isTradingDay && isTradingHours;

    return {
      isOpen,
      label: isOpen ? "MARKET OPEN" : "MARKET CLOSED",
      color: isOpen ? "bg-emerald-400" : "bg-red-400",
      shadow: isOpen ? "shadow-emerald-400/50" : "shadow-red-400/50"
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pb-12">
      {/* Premium Ticker Tape */}
      <MarketTicker />

      {/* Hero Header - Premium Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 text-white">
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black tracking-tight">Market Overview</h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Saudi Exchange
                </span>
              </div>
              <p className="text-blue-100 font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Real-time market data from Tadawul • <span className="text-blue-200 text-sm">Prices delayed up to 5 min</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-blue-200 font-medium">Market Status</div>
                <div className="flex items-center gap-2 font-bold">
                  <div className={`w-2 h-2 rounded-full ${marketStatus.color} ${marketStatus.isOpen ? 'animate-pulse' : ''} shadow-lg ${marketStatus.shadow}`} />
                  {marketStatus.label}
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
        {/* Quick Stats Row - Premium Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Volume",
              value: (marketVolume / 1000000).toFixed(1) + "M",
              icon: BarChart3,
              bg: "from-blue-500 to-blue-600",
              shadow: "shadow-blue-500/20"
            },
            {
              label: "Market Breadth",
              value: ((gainersCount / (totalStocks || 1)) * 100).toFixed(1) + "% Up",
              icon: PieChart,
              bg: "from-teal-500 to-teal-600",
              shadow: "shadow-teal-500/20"
            },
            {
              label: "Gainers",
              value: gainersCount.toString(),
              icon: TrendingUp,
              bg: "from-emerald-500 to-emerald-600",
              shadow: "shadow-emerald-500/20"
            },
            {
              label: "Losers",
              value: losersCount.toString(),
              icon: TrendingDown,
              bg: "from-red-500 to-red-600",
              shadow: "shadow-red-500/20"
            },
          ].map((stat, i) => (
            <div
              key={i}
              className={clsx(
                "relative overflow-hidden rounded-2xl p-5 text-white shadow-xl",
                `bg-gradient-to-br ${stat.bg} ${stat.shadow}`
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
          {/* TASI Index Card - Premium Design */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">TASI Index</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">DELAYED 5 MIN</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-5xl font-black text-slate-900 tracking-tight font-mono">
                      {indexValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <div className={clsx(
                      "flex flex-col text-lg font-bold",
                      indexChange >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      <span className="flex items-center gap-1">
                        {indexChange >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        {indexChange >= 0 ? "+" : ""}{indexChange.toFixed(2)}
                      </span>
                      <span className="text-sm">({indexChange >= 0 ? "+" : ""}{indexChangePercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["1D", "1W", "1M", "1Y"].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setChartPeriod(tf)}
                      className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        chartPeriod === tf
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
            {/* Chart Area - Real Bar Chart from tickers data */}
            <div className="h-64 p-6 bg-gradient-to-b from-white to-blue-50/30">
              <div className="w-full h-full flex items-end gap-[2px]">
                {(tickers || []).slice(0, 60).map((ticker: Ticker, i: number) => {
                  const changePercent = ticker.change_percent ?? 0;
                  const change = ticker.change ?? 0;
                  const normalizedChange = Math.min(Math.max(changePercent, -5), 5);
                  const height = 50 + (normalizedChange * 8);
                  const isUp = change >= 0;
                  return (
                    <div
                      key={ticker.symbol}
                      className={clsx(
                        "flex-1 rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer",
                        isUp ? "bg-gradient-to-t from-emerald-500 to-emerald-400" : "bg-gradient-to-t from-red-500 to-red-400"
                      )}
                      style={{ height: `${Math.max(height, 10)}%` }}
                      title={`${ticker.symbol}: ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Side Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            {/* Sector Performance - Real Data */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-slate-800">Sector Leaders</h3>
              </div>
              <div className="space-y-3">
                {topSectors.length > 0 ? topSectors.map((sector: any, i: number) => (
                  <div key={sector.sector_name || i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center",
                        sector.performance >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                      )}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[100px]">{sector.sector_name}</span>
                    </div>
                    <span className={clsx(
                      "text-sm font-bold font-mono",
                      sector.performance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {sector.performance >= 0 ? "+" : ""}{Number(sector.performance).toFixed(2)}%
                    </span>
                  </div>
                )) : (
                  <div className="text-sm text-slate-400 text-center py-4">Loading sectors...</div>
                )}
              </div>
            </div>

            {/* AI Insights - Premium Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-xl shadow-orange-200/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-bold">AI Market Insight</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  {gainersCount > losersCount
                    ? `Bullish sentiment: ${gainersCount} stocks advancing vs ${losersCount} declining. Market breadth at ${((gainersCount / totalStocks) * 100).toFixed(1)}%.`
                    : `Bearish pressure: ${losersCount} stocks declining vs ${gainersCount} advancing. Consider defensive positions.`
                  }
                </p>
                <Link
                  href="/ai-analyst"
                  className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-2"
                >
                  Full Analysis
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Market Intelligence Section - Real Sector Data */}
          <div className="col-span-12 bg-white rounded-2xl border border-slate-100 shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Market Intelligence</h3>
                <p className="text-xs text-slate-500">Breadth & Sector Performance</p>
              </div>
            </div>

            {/* Market Breadth Bar - Real Data */}
            <div className="mb-4">
              <div className="flex items-center gap-2 h-8 rounded-full overflow-hidden bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white transition-all duration-500"
                  style={{ width: `${(gainersCount / (totalStocks || 1)) * 100}%` }}
                >
                  {gainersCount > 0 && `${gainersCount} Up`}
                </div>
                <div
                  className="h-full bg-slate-300 flex items-center justify-center text-[11px] font-bold text-slate-600 transition-all duration-500"
                  style={{ width: `${(unchangedCount / (totalStocks || 1)) * 100}%` }}
                >
                  {unchangedCount > 0 && `${unchangedCount} Flat`}
                </div>
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center text-[11px] font-bold text-white transition-all duration-500"
                  style={{ width: `${(losersCount / (totalStocks || 1)) * 100}%` }}
                >
                  {losersCount > 0 && `${losersCount} Down`}
                </div>
              </div>
            </div>

            {/* Compact Sector Heatmap Grid - Real Data */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {sectors.slice(0, 12).map((s: any, idx: number) => {
                const perf = Number(s.performance) || 0;
                return (
                  <div
                    key={s.sector_name || idx}
                    className={clsx(
                      "p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer text-center",
                      perf > 0
                        ? "bg-emerald-50 border-emerald-100 hover:border-emerald-200"
                        : perf < 0
                          ? "bg-red-50 border-red-100 hover:border-red-200"
                          : "bg-slate-50 border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <div className="text-xs font-bold text-slate-700 truncate">{s.sector_name}</div>
                    <div className={clsx(
                      "text-sm font-black font-mono mt-1",
                      perf > 0 ? "text-emerald-600" : perf < 0 ? "text-red-600" : "text-slate-500"
                    )}>
                      {perf > 0 ? "+" : ""}{perf.toFixed(2)}%
                    </div>
                    {s.stock_count && (
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.stock_count} stocks</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stock Lists Row - Premium Design */}
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
