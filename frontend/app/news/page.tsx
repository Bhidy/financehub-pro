"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, ExternalLink, Filter, Newspaper, Search, Sparkles, Tag } from "lucide-react";
import { fetchNews, type MarketNewsItem } from "@/lib/api";

const DAY_WINDOWS = [7, 30, 90];

function formatDate(value?: string | null): string {
    if (!value) return "Unknown date";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleString();
}

function formatRelative(value?: string | null): string {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function snippet(text?: string | null): string {
    if (!text) return "No article body available.";
    const compact = text.replace(/\s+/g, " ").trim();
    if (compact.length <= 230) return compact;
    return `${compact.slice(0, 230)}...`;
}

export default function MarketNewsPage() {
    const [search, setSearch] = useState("");
    const [windowDays, setWindowDays] = useState(30);
    const [symbolFilter, setSymbolFilter] = useState("ALL");

    const { data: news = [], isLoading } = useQuery<MarketNewsItem[]>({
        queryKey: ["market-news-egx", windowDays],
        queryFn: async () =>
            fetchNews({
                limit: 600,
                source_country: "EG",
                source_section: "eg/pulse/stocks",
                days: windowDays,
            }),
        refetchInterval: 1000 * 60 * 10,
    });

    const symbols = useMemo(() => {
        const uniq = new Set<string>();
        for (const item of news) {
            if (item.symbol) uniq.add(item.symbol);
        }
        return ["ALL", ...Array.from(uniq).sort()];
    }, [news]);

    const filteredNews = useMemo(() => {
        const q = search.trim().toLowerCase();
        return news
            .filter((item) => {
                if (symbolFilter !== "ALL" && item.symbol !== symbolFilter) return false;
                if (!q) return true;
                return (
                    (item.headline || "").toLowerCase().includes(q) ||
                    (item.symbol || "").toLowerCase().includes(q) ||
                    (item.source || "").toLowerCase().includes(q) ||
                    (item.article_body || "").toLowerCase().includes(q)
                );
            })
            .sort((a, b) => {
                const da = new Date(a.published_at || 0).getTime();
                const db = new Date(b.published_at || 0).getTime();
                return db - da;
            });
    }, [news, search, symbolFilter]);

    const coverage = useMemo(() => {
        const total = filteredNews.length;
        const withImage = filteredNews.filter((n) => Boolean(n.image_url)).length;
        const withBody = filteredNews.filter((n) => Boolean(n.article_body)).length;
        return { total, withImage, withBody };
    }, [filteredNews]);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.35),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.35),transparent_40%),linear-gradient(135deg,#0f172a,#111827_55%,#020617)]">
                <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-10 md:px-8 md:pt-14">
                    <div className="mb-8 flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            EGX Intelligence Feed
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                            <Clock3 className="h-3.5 w-3.5" />
                            Refreshed Every 2 Hours
                        </span>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">
                                Egypt Market News
                                <span className="block text-orange-300">Full Articles. Live Coverage.</span>
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm text-slate-200/80 md:text-base">
                                Premium EGX news stream with complete article text, publication timestamps, and original media from Mubasher.
                            </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                                <p className="text-xs uppercase tracking-wider text-slate-300">Articles</p>
                                <p className="mt-2 text-2xl font-black">{coverage.total}</p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                                <p className="text-xs uppercase tracking-wider text-slate-300">With Image</p>
                                <p className="mt-2 text-2xl font-black">{coverage.withImage}</p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                                <p className="text-xs uppercase tracking-wider text-slate-300">With Body</p>
                                <p className="mt-2 text-2xl font-black">{coverage.withBody}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
                <div className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur md:grid-cols-[1.6fr_auto_auto] md:items-center">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search headline, symbol, source, article text..."
                            className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-orange-300/60 focus:ring-2 focus:ring-orange-300/20"
                        />
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                        <Filter className="h-4 w-4 text-slate-400" />
                        <select
                            value={symbolFilter}
                            onChange={(e) => setSymbolFilter(e.target.value)}
                            className="bg-transparent text-sm text-slate-200 outline-none"
                        >
                            {symbols.map((symbol) => (
                                <option key={symbol} value={symbol} className="bg-slate-900">
                                    {symbol}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        {DAY_WINDOWS.map((days) => (
                            <button
                                key={days}
                                onClick={() => setWindowDays(days)}
                                className={clsx(
                                    "rounded-xl px-3 py-2 text-xs font-bold tracking-wide transition",
                                    days === windowDays
                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                                        : "border border-white/10 bg-slate-900/70 text-slate-300 hover:border-orange-300/40 hover:text-orange-200"
                                )}
                            >
                                {days}D
                            </button>
                        ))}
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 9 }).map((_, idx) => (
                            <div key={idx} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
                                <div className="h-44 animate-pulse bg-slate-800/80" />
                                <div className="space-y-3 p-4">
                                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800/80" />
                                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800/80" />
                                    <div className="h-20 animate-pulse rounded bg-slate-800/80" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/20 bg-slate-900/60 px-6 py-20 text-center">
                        <Newspaper className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                        <h3 className="text-lg font-bold text-slate-300">No matching news</h3>
                        <p className="text-sm text-slate-500">Adjust filters or search terms to view EGX articles.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredNews.map((item) => (
                            <article
                                key={item.id}
                                className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_20px_45px_-32px_rgba(14,165,233,0.8)] transition hover:-translate-y-0.5 hover:border-cyan-300/35"
                            >
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
                                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-800">
                                        {item.image_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={item.image_url}
                                                alt={item.headline}
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-[radial-gradient(circle_at_top,#0ea5e9_0%,#111827_45%,#020617_100%)]" />
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-3">
                                            <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                                                <span className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-2 py-0.5 font-semibold uppercase tracking-wide text-cyan-100">
                                                    {item.source || "Mubasher"}
                                                </span>
                                                <span className="rounded-full border border-white/20 bg-black/35 px-2 py-0.5 font-semibold text-slate-200">
                                                    {formatRelative(item.published_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </a>

                                <div className="space-y-3 p-4">
                                    <h2 className="min-h-[3.8rem] text-base font-extrabold leading-snug text-white">
                                        {item.headline}
                                    </h2>
                                    <p
                                        className="text-sm leading-relaxed text-slate-300/90"
                                        style={{
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                        }}
                                    >
                                        {snippet(item.article_body)}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        {item.symbol && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/35 bg-orange-400/10 px-2.5 py-1 font-semibold text-orange-200">
                                                <Tag className="h-3 w-3" />
                                                {item.symbol}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-slate-300">
                                            <CalendarDays className="h-3 w-3" />
                                            {formatDate(item.published_at)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <Link
                                            href={`/egx${item.symbol ? `/${item.symbol}` : ""}`}
                                            className="text-xs font-semibold text-slate-400 transition hover:text-cyan-300"
                                        >
                                            {item.symbol ? `View ${item.symbol}` : "Market Context"}
                                        </Link>
                                        <a
                                            href={item.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/35 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
                                        >
                                            Full Article
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
