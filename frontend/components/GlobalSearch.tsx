"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, X, TrendingUp, DollarSign, FileText, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
// Import centralized fetchers and types
import {
    fetchTickers,
    fetchFunds,
    fetchCorporateActions,
    fetchInsiderTrading,
    Ticker,
    MutualFund,
    CorporateAction,
    InsiderTransaction
} from "@/lib/api";

interface SearchResult {
    type: "stock" | "fund" | "action" | "insider";
    id: string | number;
    title: string;
    subtitle: string;
    link: string;
}

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const router = useRouter();

    // Open/close with Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Fetch data for search using centralized API functions
    const { data: tickers } = useQuery({
        queryKey: ["tickers"],
        queryFn: fetchTickers,
    });

    const { data: funds } = useQuery({
        queryKey: ["funds"],
        queryFn: fetchFunds,
    });

    const { data: actions } = useQuery({
        queryKey: ["actions"],
        queryFn: async () => fetchCorporateActions(), // Fetches default limit
    });

    const { data: insider } = useQuery({
        queryKey: ["insider"],
        queryFn: async () => fetchInsiderTrading(50),
    });

    // Search function
    const performSearch = useCallback((searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const q = searchQuery.toLowerCase();
        const searchResults: SearchResult[] = [];

        // Search stocks
        tickers?.forEach((ticker: Ticker) => {
            if (
                ticker.symbol.toLowerCase().includes(q) ||
                ticker.name_en?.toLowerCase().includes(q)
            ) {
                searchResults.push({
                    type: "stock",
                    id: ticker.symbol,
                    title: ticker.symbol,
                    subtitle: ticker.name_en || "",
                    link: `/symbol/${ticker.symbol}`,
                });
            }
        });

        // Search funds via type assertion or check if it's array
        if (Array.isArray(funds)) {
            funds.forEach((fund: MutualFund) => {
                if (fund.fund_name.toLowerCase().includes(q)) {
                    searchResults.push({
                        type: "fund",
                        id: fund.fund_id,
                        title: fund.fund_name,
                        subtitle: `NAV: SAR ${Number(fund.latest_nav).toFixed(2)}`,
                        link: "/funds",
                    });
                }
            });
        }

        // Search corporate actions
        if (Array.isArray(actions)) {
            actions.forEach((action: CorporateAction) => {
                if (action.symbol.toLowerCase().includes(q)) {
                    searchResults.push({
                        type: "action",
                        id: action.id,
                        title: `${action.symbol} - ${action.action_type}`,
                        subtitle: `${action.description} (${new Date(action.ex_date).toLocaleDateString()})`,
                        link: `/symbol/${action.symbol}?tab=events`, // Deep link to events tab
                    });
                }
            });
        }

        // Search insider trades
        if (Array.isArray(insider)) {
            insider.forEach((trade: InsiderTransaction) => {
                if (
                    trade.symbol.toLowerCase().includes(q) ||
                    trade.insider_name.toLowerCase().includes(q)
                ) {
                    searchResults.push({
                        type: "insider",
                        id: trade.id,
                        title: `${trade.symbol} - ${trade.insider_name}`,
                        subtitle: `${trade.transaction_type}: ${(Number(trade.value) / 1000000).toFixed(1)}M SAR`,
                        link: "/insider-trading",
                    });
                }
            });
        }

        setResults(searchResults.slice(0, 10));
    }, [tickers, funds, actions, insider]);

    useEffect(() => {
        performSearch(query);
    }, [query, performSearch]);

    const handleSelect = (link: string) => {
        router.push(link);
        setIsOpen(false);
        setQuery("");
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "stock": return <TrendingUp className="w-5 h-5 text-blue-600" />;
            case "fund": return <DollarSign className="w-5 h-5 text-green-600" />;
            case "action": return <FileText className="w-5 h-5 text-purple-600" />;
            case "insider": return <Users className="w-5 h-5 text-amber-600" />;
            default: return <Search className="w-5 h-5 text-slate-400" />;
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
                <Search className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-600 font-medium">Search</span>
                <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono font-bold text-slate-500 bg-white border border-slate-300 rounded shadow-sm">
                    ⌘K
                </kbd>
            </button>
        );
    }

    // Use portal to render modal at body level, escaping all stacking contexts
    const modalContent = (
        <>
            {/* Backdrop - covers everything */}
            <div
                className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9998] transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            {/* Search Modal - centered on screen */}
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4 pointer-events-none">
                <div className="w-full max-w-2xl pointer-events-auto">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                        {/* Search Input */}
                        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                            <Search className="w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search stocks, funds, events, insiders..."
                                className="flex-1 text-lg outline-none text-slate-900 placeholder:text-slate-400 font-medium bg-transparent"
                                autoFocus
                            />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Results */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {results.length === 0 && query && (
                                <div className="p-12 text-center text-slate-500">
                                    <p className="font-medium">No results found for &quot;{query}&quot;</p>
                                </div>
                            )}

                            {results.length === 0 && !query && (
                                <div className="p-12 text-center text-slate-500">
                                    <Search className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                                    <p className="text-sm font-medium text-slate-600">Start typing to search globally</p>
                                    <div className="mt-2 text-xs text-slate-400">
                                        Supports: Symbols (2222), Companies (Aramco), Funds, Actions
                                    </div>
                                </div>
                            )}

                            {results.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.id}-${idx}`}
                                    onClick={() => handleSelect(result.link)}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0 group"
                                >
                                    <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm group-hover:border-slate-200 group-hover:shadow-md transition-all">
                                        {getIcon(result.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900">{result.title}</div>
                                        <div className="text-sm text-slate-500 font-medium">{result.subtitle}</div>
                                    </div>
                                    <div className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-500 uppercase tracking-wide group-hover:bg-slate-200 transition-colors">
                                        {result.type}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-sm">↑↓</kbd> Navigate</span>
                                <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-sm">↵</kbd> Select</span>
                            </div>
                            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-sm">ESC</kbd> Close</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    // Render to document.body to escape all stacking contexts
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return null;
}
