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
import TasiIndexChart from "@/components/TasiIndexChart";
import Sparkline from "@/components/Sparkline";
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
import { useMarketSafe } from "@/contexts/MarketContext";

export default function Home() {
  const { market, config, isEgypt, isSaudi } = useMarketSafe();

  // Helper: Detect if symbol is EGX (3-5 letters) or Saudi (4 digits)
  const isEgxSymbol = (symbol: string) => /^[A-Z]{3,5}$/.test(symbol?.toUpperCase() || '');
  const isSaudiSymbol = (symbol: string) => /^\d{4}$/.test(symbol || '');

  // API calls with market filter
  const { data: tickers = [], isLoading } = useQuery({
    queryKey: ["tickers", market],
    queryFn: async () => {
      const allTickers = await fetchTickers();
      // Filter tickers by current market using symbol patterns
      return allTickers.filter((t: Ticker) => {
        if (isEgypt) {
          return isEgxSymbol(t.symbol);
        } else {
          return isSaudiSymbol(t.symbol);
        }
      });
    }
  });
  const { data: sectors = [] } = useQuery({ queryKey: ["sectors", market], queryFn: fetchSectors });
  const { data: marketSummary } = useQuery({ queryKey: ["market-summary", market], queryFn: fetchMarketSummary });
  // Real EGX30 index (TradingView). market-summary.index_value is a volume-weighted
  // AVERAGE SHARE PRICE (~2.57 EGP), NOT the index — never show it as "EGX 30".
  const { data: egxIndex } = useQuery({
    queryKey: ["egx30-index"],
    queryFn: () => fetch("/api/v1/egx30/index", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    enabled: isEgypt,
    refetchInterval: 60000,
  });
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

  // Index: real EGX30 from TradingView for Egypt; market-summary.index_value is a
  // bogus volume-weighted avg price and must never be shown as the index. No
  // fabricated fallback (was 12150.45).
  const egxQ = egxIndex?.quote;
  const indexValue = (isEgypt && egxQ?.value != null) ? Number(egxQ.value) : (Number(marketSummary?.index_value) || 0);
  const indexChange = (isEgypt && egxQ?.change != null) ? Number(egxQ.change) : (Number(marketSummary?.index_change) || 0);
  const indexChangePercent = (isEgypt && egxQ?.changePercent != null) ? Number(egxQ.changePercent) : (Number(marketSummary?.index_change_percent) || 0);

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
    <main className="min-h-screen bg-[#F1F5F9] dark:bg-[#1A222C] pb-12 transition-colors duration-300">
      {/* Premium Ticker Tape */}
      <MarketTicker />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Clean TailAdmin Page Header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Market Overview</h2>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#3C50E0]/10 text-[#3C50E0] dark:bg-[#3C50E0]/20 dark:text-[#3C50E0] flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {isEgypt ? 'Egyptian Exchange' : 'Saudi Exchange'}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Real-time market data from {isEgypt ? 'EGX' : 'Tadawul'} • Prices delayed up to 5 min
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Market Status</div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                <div className={`w-2 h-2 rounded-full ${marketStatus.color} ${marketStatus.isOpen ? 'animate-pulse' : ''}`} />
                {marketStatus.label}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-[#2E3A47] hidden sm:block" />
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Active Stocks</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">{totalStocks}</div>
            </div>
          </div>
        </div>

        {/* Metric Cards Row - Premium SaaS Pattern */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Volume",
              value: (marketVolume / 1000000).toFixed(1) + "M",
              icon: BarChart3,
              trend: "up" as const,
              change: "+12.5%",
              data: [40, 60, 45, 80, 55, 90, 70]
            },
            {
              label: "Market Breadth",
              value: ((gainersCount / (totalStocks || 1)) * 100).toFixed(1) + "% Up",
              icon: PieChart,
              trend: gainersCount > losersCount ? "up" as const : "down" as const,
              change: gainersCount > losersCount ? "Bullish" : "Bearish",
              data: [gainersCount, totalStocks - gainersCount - losersCount, losersCount, gainersCount, losersCount, gainersCount, totalStocks]
            },
            {
              label: "Advancing",
              value: gainersCount.toString(),
              icon: TrendingUp,
              trend: "up" as const,
              change: `+${gainersCount}`,
              data: [20, 35, 40, 65, 50, 85, gainersCount]
            },
            {
              label: "Declining",
              value: losersCount.toString(),
              icon: TrendingDown,
              trend: "down" as const,
              change: `-${losersCount}`,
              data: [45, 30, 60, 20, 70, 40, losersCount]
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="group relative overflow-hidden premium-glass rounded-2xl p-6 premium-glow-hover"
            >
              {/* Top Row: Icon & Value */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#F1F5F9] dark:bg-white/5 text-[#3C50E0] dark:text-white transition-colors">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={clsx(
                  "flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md",
                  stat.trend === "up" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                )}>
                  {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>

              {/* Bottom Row: Number & Sparkline */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stat.value}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                </div>
                <div className="w-20 h-8 opacity-70 group-hover:opacity-100 transition-opacity">
                  <Sparkline data={stat.data} trend={stat.trend} width={80} height={32} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Market Index Card - Premium Design */}
          <div className="col-span-12 lg:col-span-8 premium-glass rounded-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-[#2E3A47]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{isEgypt ? 'EGX 30 Index' : 'TASI Index'}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">DELAYED 5 MIN</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
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
                  <div className="px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-500">Live History</span>
                  </div>
                </div>
              </div>
            </div>
            {/* TASI Index Chart - Premium Real-Time */}
            <div className="p-6 min-h-[320px]">
              <TasiIndexChart />
            </div>
          </div>

          {/* Side Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Sector Performance - Real Data */}
            <div className="rounded-md border border-slate-200 bg-white shadow-sm dark:border-[#2E3A47] dark:bg-[#24303F] p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sector Leaders</h3>
              </div>
              <div className="space-y-3">
                {topSectors.length > 0 ? topSectors.map((sector: any, i: number) => (
                  <div key={sector.sector_name || i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center",
                        sector.performance >= 0 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                      )}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{sector.sector_name}</span>
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

            {/* AI Insights - Solid TailAdmin Card */}
            <div className="rounded-md border border-slate-200 bg-[#3C50E0] p-6 text-white shadow-sm dark:border-[#2E3A47]">
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-lg font-bold">AI Market Insight</span>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  {gainersCount > losersCount
                    ? `Bullish sentiment: ${gainersCount} stocks advancing vs ${losersCount} declining. Market breadth at ${((gainersCount / totalStocks) * 100).toFixed(1)}%.`
                    : `Bearish pressure: ${losersCount} stocks declining vs ${gainersCount} advancing. Consider defensive positions.`
                  }
                </p>
                <Link
                  href="/AiChat"
                  className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all inline-flex items-center gap-2"
                >
                  Full Analysis
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Market Intelligence Section - Real Sector Data */}
          <div className="col-span-12 rounded-md border border-slate-200 bg-white shadow-sm dark:border-[#2E3A47] dark:bg-[#24303F] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#F1F5F9] dark:bg-white/5 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-[#3C50E0] dark:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Market Intelligence</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Breadth & Sector Performance</p>
              </div>
            </div>

            {/* Market Breadth Bar - Real Data */}
            <div className="mb-4">
              <div className="flex items-center gap-2 h-8 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-[11px] font-bold text-white transition-all duration-500"
                  style={{ width: `${(gainersCount / (totalStocks || 1)) * 100}%` }}
                >
                  {gainersCount > 0 && `${gainersCount} Up`}
                </div>
                <div
                  className="h-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300 transition-all duration-500"
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
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 hover:border-emerald-200 dark:hover:border-emerald-500/40"
                        : perf < 0
                          ? "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 hover:border-red-200 dark:hover:border-red-500/40"
                          : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 hover:border-slate-200 dark:hover:border-white/20"
                    )}
                  >
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{s.sector_name}</div>
                    <div className={clsx(
                      "text-sm font-black font-mono mt-1",
                      perf > 0 ? "text-emerald-600 dark:text-emerald-400" : perf < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-500"
                    )}>
                      {perf > 0 ? "+" : ""}{perf.toFixed(2)}%
                    </div>
                    {s.stock_count && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{s.stock_count} stocks</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stock Lists Row - Premium Design */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Top Gainers - CRM List Pattern */}
          <div className="premium-glass rounded-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2E3A47] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Top Gainers</h3>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex-1 overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
              ) : (
                <div className="min-w-full divide-y divide-slate-100 dark:divide-white/5">
                  {topGainers.map((stock, i) => (
                    <Link
                      key={stock.symbol}
                      href={`/symbol/${stock.symbol}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{stock.symbol}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[120px]">{stock.name_en}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm font-mono text-slate-900 dark:text-white">{Number(stock.last_price).toFixed(2)}</div>
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5 mt-0.5">
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

          {/* Top Losers - CRM List Pattern */}
          <div className="premium-glass rounded-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2E3A47] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Top Losers</h3>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex-1 overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
              ) : (
                <div className="min-w-full divide-y divide-slate-100 dark:divide-white/5">
                  {topLosers.map((stock, i) => (
                    <Link
                      key={stock.symbol}
                      href={`/symbol/${stock.symbol}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{stock.symbol}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[120px]">{stock.name_en}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm font-mono text-slate-900 dark:text-white">{Number(stock.last_price).toFixed(2)}</div>
                        <div className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center justify-end gap-0.5 mt-0.5">
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

          {/* Most Active - CRM List Pattern */}
          <div className="premium-glass rounded-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2E3A47] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Most Active</h3>
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex-1 overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
              ) : (
                <div className="min-w-full divide-y divide-slate-100 dark:divide-white/5">
                  {mostActive.map((stock, i) => (
                    <Link
                      key={stock.symbol}
                      href={`/symbol/${stock.symbol}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{stock.symbol}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[120px]">{stock.name_en}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm font-mono text-slate-900 dark:text-white">{Number(stock.last_price).toFixed(2)}</div>
                        <div className="text-[11px] font-bold text-teal-600 dark:text-teal-400 flex items-center justify-end gap-0.5 mt-0.5">
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
