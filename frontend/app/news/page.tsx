"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "@/lib/api";
import { Newspaper, ExternalLink, Clock, Tag, Search } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

export default function MarketNewsPage() {
    const [search, setSearch] = useState("");

    const { data: news = [], isLoading } = useQuery({
        queryKey: ["news"],
        queryFn: async () => fetchNews()
    });

    const filteredNews = news.filter((item: any) =>
        item.headline.toLowerCase().includes(search.toLowerCase()) ||
        item.symbol?.toLowerCase().includes(search.toLowerCase()) ||
        item.source.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                                <Newspaper className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Market News</h1>
                                <p className="text-slate-500 font-medium text-sm">Real-time financial coverages & headlines</p>
                            </div>
                        </div>

                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                                placeholder="Search headlines, symbols..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
                                <div className="h-4 bg-slate-100 rounded w-3/4 mb-3" />
                                <div className="h-3 bg-slate-100 rounded w-1/4" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredNews.length > 0 ? filteredNews.map((item: any) => (
                            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md uppercase tracking-wider">
                                                {item.source}
                                            </span>
                                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(item.published_at).toLocaleString()}
                                            </span>
                                        </div>

                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group-hover:text-blue-600 transition-colors">
                                            <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">
                                                {item.headline}
                                            </h3>
                                        </a>

                                        <div className="flex items-center gap-3 mt-3">
                                            {item.symbol && (
                                                <Link href={`/symbol/${item.symbol}`} className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors">
                                                    <Tag className="w-3 h-3" />
                                                    {item.symbol}
                                                </Link>
                                            )}
                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:underline">
                                                Read Source <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                                <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h3 className="font-bold text-slate-400">No headlines found</h3>
                                <p className="text-sm text-slate-400">Try adjusting your search terms</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
