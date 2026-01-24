// @ts-nocheck
"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Users, Building2, Activity, BarChart3, Bell } from "lucide-react";
import {
    fetchFunds,
    fetchEtfs,
    fetchCorporateActions,
    fetchInsiderTrading,
    fetchAnalystRatings,
    fetchMarketBreadth,
    fetchEconomicIndicators
} from "@/lib/api";

export default function DataExplorerPage() {
    const [activeTab, setActiveTab] = useState<"funds" | "etfs" | "actions" | "insider" | "ratings" | "breadth" | "indicators">("funds");

    // Fetch all data categories
    const { data: funds } = useQuery({
        queryKey: ["funds"],
        queryFn: fetchFunds
    });

    const { data: etfs } = useQuery({
        queryKey: ["etfs"],
        queryFn: fetchEtfs
    });

    const { data: corporateActions } = useQuery({
        queryKey: ["corporate-actions"],
        queryFn: () => fetchCorporateActions()
    });

    const { data: insiderTrades } = useQuery({
        queryKey: ["insider-trading"],
        queryFn: () => fetchInsiderTrading(50)
    });

    const { data: ratings } = useQuery({
        queryKey: ["analyst-ratings"],
        queryFn: () => fetchAnalystRatings(50)
    });

    const { data: breadth } = useQuery({
        queryKey: ["market-breadth"],
        queryFn: () => fetchMarketBreadth()
    });

    const { data: indicators } = useQuery({
        queryKey: ["economic-indicators"],
        queryFn: () => fetchEconomicIndicators(30)
    });

    const tabs = [
        { id: "funds", label: "Mutual Funds", icon: DollarSign, count: funds?.length || 0 },
        { id: "etfs", label: "ETFs", icon: BarChart3, count: etfs?.length || 0 },
        { id: "actions", label: "Corporate Actions", icon: Building2, count: corporateActions?.length || 0 },
        { id: "insider", label: "Insider Trading", icon: Users, count: insiderTrades?.length || 0 },
        { id: "ratings", label: "Analyst Ratings", icon: TrendingUp, count: ratings?.length || 0 },
        { id: "breadth", label: "Market Breadth", icon: Activity, count: breadth?.length || 0 },
        { id: "indicators", label: "Economic Indicators", icon: Bell, count: indicators?.length || 0 },
    ];

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500 text-white">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                            📊
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Complete Data Explorer</h1>
                            <p className="text-blue-100 font-medium">All 37,739 records across 14 data categories</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Tab Navigation */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === tab.id
                                ? "bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg scale-105"
                                : "bg-white text-slate-700 hover:bg-slate-100 shadow"
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? "bg-white/20" : "bg-slate-200"
                                }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-xl border border-slate-200">

                    {/* Mutual Funds */}
                    {activeTab === "funds" && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <DollarSign className="text-emerald-600" />
                                Mutual Funds ({funds?.length || 0})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {funds?.map((fund: any) => (
                                    <div key={fund.fund_id} className="border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-slate-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-slate-900 text-sm">{fund.fund_name}</h3>
                                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">
                                                {fund.fund_type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mb-3">{fund.manager_name}</p>
                                        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                            <div>
                                                <div className="text-xs text-slate-500">Latest NAV</div>
                                                <div className="text-lg font-bold text-emerald-600">
                                                    SAR {parseFloat(fund.latest_nav).toFixed(2)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">Expense Ratio</div>
                                                <div className="text-sm font-semibold text-slate-700">
                                                    {parseFloat(fund.expense_ratio).toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ETFs */}
                    {activeTab === "etfs" && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <BarChart3 className="text-blue-600" />
                                Exchange Traded Funds ({etfs?.length || 0})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {etfs?.map((etf: any) => (
                                    <div key={etf.etf_id} className="border-2 border-blue-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-all">
                                        <h3 className="font-bold text-xl text-slate-900 mb-2">{etf.etf_name}</h3>
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-sm text-slate-600">Tracking:</span>
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                                {etf.tracking_index}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-slate-500">Expense Ratio</div>
                                                <div className="text-lg font-bold text-blue-600">
                                                    {parseFloat(etf.expense_ratio).toFixed(2)}%
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">Avg Spread</div>
                                                <div className="text-lg font-bold text-slate-700">
                                                    {parseFloat(etf.average_spread).toFixed(2)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Corporate Actions */}
                    {activeTab === "actions" && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Building2 className="text-orange-600" />
                                Corporate Actions ({corporateActions?.length || 0})
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-orange-100 to-amber-100">
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Symbol</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Ex-Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-700">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {corporateActions?.map((action: any, idx: number) => (
                                            <tr key={action.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                                <td className="px-4 py-3 font-bold text-blue-600">{action.symbol}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${action.action_type === 'DIVIDEND' ? 'bg-green-100 text-green-700' :
                                                        action.action_type === 'SPLIT' ? 'bg-blue-100 text-blue-700' :
                                                            action.action_type === 'RIGHTS' ? 'bg-teal-100 text-teal-700' :
                                                                'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {action.action_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-emerald-600">
                                                    {parseFloat(action.amount).toFixed(2)} SAR
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {new Date(action.ex_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700">
                                                    {action.description}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Insider Trading */}
                    {activeTab === "insider" && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Users className="text-amber-600" />
                                Insider Trading ({insiderTrades?.length || 0})
                            </h2>
                            <div className="space-y-3">
                                {insiderTrades?.map((trade: any) => (
                                    <div key={trade.id} className="border-l-4 border-amber-500 bg-gradient-to-r from-amber-50 to-white p-4 rounded-r-xl hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-lg text-slate-900">{trade.symbol}</span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${trade.transaction_type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {trade.transaction_type}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-700">
                                                    <span className="font-semibold">{trade.insider_name}</span>
                                                    <span className="text-slate-500"> ({trade.insider_role})</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500">Value</div>
                                                <div className="text-lg font-bold text-emerald-600">
                                                    SAR {parseFloat(trade.value).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-between text-xs text-slate-600">
                                            <span>{parseFloat(trade.shares).toLocaleString()} shares @ SAR {parseFloat(trade.price).toFixed(2)}</span>
                                            <span>{new Date(trade.transaction_date).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Analyst Ratings */}
                    {activeTab === "ratings" && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <TrendingUp className="text-green-600" />
                                Analyst Ratings ({ratings?.length || 0})
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ratings?.map((rating: any) => (
                                    <div key={rating.id} className="border border-green-200 rounded-xl p-4 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="font-bold text-xl text-slate-900">{rating.symbol}</span>
                                                <p className="text-xs text-slate-600">{rating.analyst_firm}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${rating.rating === 'STRONG BUY' ? 'bg-green-600 text-white' :
                                                rating.rating === 'BUY' ? 'bg-green-100 text-green-700' :
                                                    rating.rating === 'HOLD' ? 'bg-yellow-100 text-yellow-700' :
                                                        rating.rating === 'SELL' ? 'bg-red-100 text-red-700' :
                                                            'bg-red-600 text-white'
                                                }`}>
                                                {rating.rating}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div className="text-xs text-slate-500">Price Target</div>
                                                <div className="text-lg font-bold text-green-600">
                                                    SAR {parseFloat(rating.price_target).toFixed(2)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-slate-500">Upside</div>
                                                <div className={`text-lg font-bold ${parseFloat(rating.target_upside) > 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {parseFloat(rating.target_upside) > 0 ? '+' : ''}{parseFloat(rating.target_upside).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-xs text-slate-500">
                                            {rating.analyst_name} • {new Date(rating.rating_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Market Breadth */}
                    {activeTab === "breadth" && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Activity className="text-blue-600" />
                                Market Breadth ({breadth?.length || 0} days)
                            </h2>
                            <div className="space-y-3">
                                {breadth?.map((day: any) => {
                                    const advanceRatio = (day.advancing / day.total_stocks) * 100;
                                    return (
                                        <div key={day.date} className="border border-blue-200 rounded-xl p-4 bg-gradient-to-r from-blue-50 to-white">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-bold text-lg text-slate-900">
                                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${advanceRatio > 60 ? 'bg-green-100 text-green-700' :
                                                    advanceRatio > 40 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                    {advanceRatio.toFixed(0)}% Advancing
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 text-center">
                                                <div>
                                                    <div className="text-xs text-slate-500">Advancing</div>
                                                    <div className="text-xl font-bold text-green-600">{day.advancing}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500">Declining</div>
                                                    <div className="text-xl font-bold text-red-600">{day.declining}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500">New Highs</div>
                                                    <div className="text-xl font-bold text-emerald-600">{day.new_highs}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500">New Lows</div>
                                                    <div className="text-xl font-bold text-orange-600">{day.new_lows}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Economic Indicators */}
                    {activeTab === "indicators" && (
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Bell className="text-red-600" />
                                Economic Indicators (Latest Values)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {indicators?.slice(0, 21).map((ind: any, idx: number) => {
                                    // Group by indicator to get latest
                                    const isFirst = idx === 0 || indicators[idx - 1]?.indicator_code !== ind.indicator_code;
                                    if (!isFirst) return null;

                                    return (
                                        <div key={`${ind.indicator_code}-${ind.date}`} className="border-2 border-slate-200 rounded-xl p-4 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg transition-all">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                                                {ind.indicator_code.replace(/_/g, ' ')}
                                            </div>
                                            <div className="text-3xl font-bold text-slate-900 mb-1">
                                                {parseFloat(ind.value).toFixed(2)}
                                            </div>
                                            <div className="text-sm text-slate-600">{ind.unit}</div>
                                            <div className="mt-2 text-xs text-slate-500">{ind.source}</div>
                                        </div>
                                    );
                                }).filter(Boolean)}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </main>
    );
}
