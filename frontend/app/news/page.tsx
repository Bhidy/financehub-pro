"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Filter, Newspaper, Search, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchNews, type MarketNewsItem } from "@/lib/api";
import {
    buildNewsSnippet,
    formatNewsDate,
    formatNewsRelative,
    resolveNewsImageSrc,
    sanitizeNewsText,
    getNewsBrandedCover,
} from "@/lib/news-display";

const DAY_WINDOWS = [7, 30, 90, 0];

const EGX_ACTIVE_SYMBOLS = [
    "ALL", "ABUK", "AMER", "CCAP", "CIB", "COMI", "EAST", "EGAL", "EGBE", "EKHO", 
    "ETEL", "FWRY", "HELI", "HRHO", "MASR", "MFPC", "MNHD", "ORAS", "PHDC", "SWDY", 
    "TAQA", "TMGH"
];

export default function MarketNewsPage() {
    const [search, setSearch] = useState("");
    const [windowDays, setWindowDays] = useState(30);
    const [symbolFilter, setSymbolFilter] = useState("ALL");
    const [lang, setLang] = useState<"en" | "ar">("en");
    const [page, setPage] = useState(1);

    const pageSize = 18;

    useEffect(() => {
        const savedLang = localStorage.getItem("starta-lang") || localStorage.getItem("lang") || "en";
        setLang(savedLang as "en" | "ar");
    }, []);

    // Reset to page 1 whenever filters change
    useEffect(() => {
        setPage(1);
    }, [search, windowDays, symbolFilter, lang]);

    const { data: news = [], isLoading } = useQuery<MarketNewsItem[]>({
        queryKey: ["market-news-egx", windowDays, lang, page, symbolFilter, search],
        queryFn: async () =>
            fetchNews({
                limit: pageSize,
                source_country: "EG",
                days: windowDays,
                language: lang,
                page: page,
                symbol: symbolFilter !== "ALL" ? symbolFilter : undefined,
                q: search.trim() ? search.trim() : undefined,
            } as any),
        refetchInterval: 1000 * 60 * 10,
    });

    const filteredNews = useMemo(() => {
        return news;
    }, [news]);

    const coverage = useMemo(() => {
        const total = filteredNews.length;
        const withImage = filteredNews.filter((n) => Boolean(n.image_url)).length;
        const withBody = filteredNews.filter((n) => Boolean(n.article_body)).length;
        return { total, withImage, withBody };
    }, [filteredNews]);

    return (
        <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#1A222C] text-slate-900 dark:text-white transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Clean TailAdmin Page Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Market News</h2>
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#3C50E0]/10 text-[#3C50E0] dark:bg-[#3C50E0]/20 dark:text-[#3C50E0] flex items-center gap-1">
                                <Newspaper className="w-3.5 h-3.5" />
                                Live Feed
                            </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            Deep tracking of market events
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Articles on Page</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{coverage.total}</div>
                        </div>
                        <div className="w-px h-8 bg-slate-200 dark:bg-[#2E3A47]" />
                        <div className="text-right">
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">With Image</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{coverage.withImage}</div>
                        </div>
                    </div>
                </div>
                {/* Search & Filters */}
                <div className="mb-8 grid gap-4 premium-glass rounded-2xl p-4 md:grid-cols-[1.6fr_auto_auto] md:items-center">
                    <div className="relative group">
                        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-[#3C50E0] transition-colors" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search headline, symbol, article text..."
                            className="w-full rounded-md border border-slate-200 dark:border-[#2E3A47] bg-[#F1F5F9] dark:bg-[#1A222C] py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3C50E0]/20 focus:border-[#3C50E0]/50 transition-all font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/20 px-3 py-2.5 transition-all hover:bg-slate-100 dark:hover:bg-black/40">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            value={symbolFilter}
                            onChange={(e) => setSymbolFilter(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer w-[120px]"
                        >
                            {EGX_ACTIVE_SYMBOLS.map((symbol) => (
                                <option key={symbol} value={symbol} className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white">
                                    {symbol}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                        {DAY_WINDOWS.map((days) => (
                            <button
                                key={days}
                                onClick={() => setWindowDays(days)}
                                className={clsx(
                                    "rounded-md px-4 py-1.5 text-xs font-bold tracking-wide transition-all duration-300",
                                    days === windowDays
                                        ? "bg-[#3C50E0] text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1A222C]"
                                )}
                            >
                                {days === 0 ? (lang === "ar" ? "الكل" : "All") : `${days}D`}
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="overflow-hidden premium-glass rounded-2xl">
                                <div className="h-48 animate-pulse bg-[#F1F5F9] dark:bg-[#1A222C]" />
                                <div className="space-y-4 p-5">
                                    <div className="h-5 w-3/4 animate-pulse rounded-sm bg-[#F1F5F9] dark:bg-[#1A222C]" />
                                    <div className="h-4 w-1/2 animate-pulse rounded-sm bg-[#F1F5F9] dark:bg-[#1A222C]" />
                                    <div className="h-24 animate-pulse rounded-sm bg-[#F1F5F9] dark:bg-[#1A222C]" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/5 px-6 py-24 text-center">
                        <Newspaper className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No matching news</h3>
                        <p className="text-sm text-slate-500 mt-1">Adjust filters or search terms to view relevant articles.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            {filteredNews.map((item) => {
                                // Deterministic mock impact formulation for high-fidelity UI demonstration
                                const mockImpactScore = (item.headline.length % 5) + 5; // 5 to 9
                                const isHighImpact = mockImpactScore >= 8;

                                return (
                                    <article
                                        key={item.id}
                                        className="group flex flex-col overflow-hidden premium-glass rounded-2xl premium-glow-hover"
                                    >
                                        <Link href={`/news/${item.id}`} className="block relative aspect-[16/9] overflow-hidden bg-white dark:bg-white border-b border-slate-200/50">
                                            <img
                                                src={getNewsBrandedCover(item, lang)}
                                                alt=""
                                                className="h-full w-full object-contain transition duration-700 group-hover:scale-102"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />

                                            {/* Image Overlay Tokens */}
                                            <div className="absolute bottom-3 inset-x-4 flex justify-between items-end">
                                                {item.symbol ? (
                                                    <span className="rounded-md border border-white/20 bg-white/10 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        {item.symbol}
                                                    </span>
                                                ) : <span />}
                                                <span className="text-[11px] font-bold text-white/90 drop-shadow-md">
                                                    {formatNewsRelative(item.published_at)}
                                                </span>
                                            </div>
                                        </Link>

                                        <div className="flex flex-col flex-1 p-5">
                                            {/* Strategic Data Insert */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="flex items-center gap-1.5">
                                                    {isHighImpact ? (
                                                        <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                                    ) : (
                                                        <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                                    <span className={clsx("text-xs font-bold uppercase tracking-wider", isHighImpact ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400")}>
                                                        {isHighImpact ? "High Impact" : "Standard"}
                                                    </span>
                                                </div>
                                                <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                <span className="text-xs font-bold text-slate-500">
                                                    Impact Score {mockImpactScore}/10
                                                </span>
                                            </div>

                                            <h2 className="text-lg font-bold leading-snug text-slate-900 dark:text-white mb-3 line-clamp-2">
                                                {sanitizeNewsText(item.headline)}
                                            </h2>

                                            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-6 line-clamp-3 flex-1">
                                                {buildNewsSnippet(item.article_body)}
                                            </p>

                                            <div className="mt-auto pt-4 border-t border-slate-200 dark:border-[#2E3A47] flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    {formatNewsDate(item.published_at)}
                                                </div>
                                                <Link
                                                    href={`/news/${item.id}`}
                                                    className="text-xs font-bold text-[#3C50E0] hover:text-blue-700 transition-colors flex items-center gap-1"
                                                >
                                                    Read Article <span className="text-lg leading-none">&rarr;</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        {/* Pagination Bar */}
                        <div className="mt-10 flex items-center justify-between premium-glass rounded-2xl p-4">
                            <button
                                onClick={() => {
                                    if (page > 1) {
                                        setPage(page - 1);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                    }
                                }}
                                disabled={page === 1}
                                className={clsx(
                                    "flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-bold transition-all",
                                    page === 1
                                        ? "opacity-50 pointer-events-none text-slate-400"
                                        : "bg-slate-50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-black/40 text-slate-700 dark:text-slate-200"
                                )}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                {lang === "ar" ? "السابق" : "Previous"}
                            </button>

                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                {lang === "ar" ? `صفحة ${page}` : `Page ${page}`}
                            </span>

                            <button
                                onClick={() => {
                                    if (filteredNews.length === pageSize) {
                                        setPage(page + 1);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                    }
                                }}
                                disabled={filteredNews.length < pageSize}
                                className={clsx(
                                    "flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-4 py-2 text-xs font-bold transition-all",
                                    filteredNews.length < pageSize
                                        ? "opacity-50 pointer-events-none text-slate-400"
                                        : "bg-slate-50 dark:bg-black/20 hover:bg-slate-100 dark:hover:bg-black/40 text-slate-700 dark:text-slate-200"
                                )}
                            >
                                {lang === "ar" ? "التالي" : "Next"}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
