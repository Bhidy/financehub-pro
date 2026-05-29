"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Activity,
    CalendarDays,
    Database,
    Layers,
    RefreshCw,
} from "lucide-react";

type TabCard = {
    title: string;
    text: string;
    table_rows: string[][];
    list_items: string[];
};

type TabPayload = {
    tab: string;
    cards: TabCard[];
    standalone_tables: { table_index: number; rows: string[][] }[];
    full_text: string;
};

type ProfileRow = {
    symbol: string;
    company_name: string | null;
    exchange_code: string | null;
    source_url: string;
    as_of_date: string | null;
    last_price: string | null;
    currency: string | null;
    change_percent: string | null;
    change_value: string | null;
    best_bid: string | null;
    best_ask: string | null;
    performance_1w: string | null;
    performance_1m: string | null;
    performance_3m: string | null;
    disclaimer: string | null;
    header_raw: string | null;
    tabs: Record<string, TabPayload>;
    extracted_at: string;
};

type ProfileApiResponse = {
    profile: ProfileRow;
    available_symbols: Array<{
        symbol: string;
        company_name: string | null;
        extracted_at: string;
    }>;
};

const TAB_ORDER = ["overview", "quote", "corporate_actions", "news", "research"] as const;

const tabTitle = (value: string): string =>
    value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

const compact = (value?: string | null): string =>
    (value || "").replace(/\s+/g, " ").trim();

const valueClass = (value?: string | null): string => {
    const safe = compact(value);
    if (safe.startsWith("-")) return "text-rose-500 dark:text-rose-300";
    if (safe.startsWith("+")) return "text-emerald-600 dark:text-emerald-300";
    return "text-slate-900 dark:text-white";
};

async function fetchProfile(symbol: string): Promise<ProfileApiResponse> {
    const params = new URLSearchParams();
    if (symbol) params.set("symbol", symbol);

    const response = await fetch(`/api/v1/company-profile-v2?${params.toString()}`, {
        cache: "no-store",
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Failed to fetch profile v2 (${response.status})`);
    }
    return (await response.json()) as ProfileApiResponse;
}

function DataTable({ rows }: { rows: string[][] }) {
    if (!rows?.length) return null;
    const [first, ...rest] = rows;
    const hasHeader = first.length > 1;
    const bodyRows = hasHeader ? rest : rows;

    return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-cyan-300/15 bg-white/60 dark:bg-white/[0.03]">
            <table className="min-w-full text-sm">
                {hasHeader && (
                    <thead className="bg-slate-50 dark:bg-white/[0.04]">
                        <tr>
                            {first.map((cell, idx) => (
                                <th
                                    key={`h-${idx}`}
                                    className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300"
                                >
                                    {compact(cell) || "—"}
                                </th>
                            ))}
                        </tr>
                    </thead>
                )}
                <tbody>
                    {bodyRows.map((row, ridx) => (
                        <tr
                            key={`r-${ridx}`}
                            className="border-t border-slate-200/70 dark:border-white/8"
                        >
                            {row.map((cell, cidx) => (
                                <td
                                    key={`c-${ridx}-${cidx}`}
                                    className="px-3 py-2 align-top text-slate-700 dark:text-slate-200"
                                >
                                    {compact(cell) || "—"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function EgxProfileV2Page() {
    const [symbol, setSymbol] = useState("");
    const [activeTab, setActiveTab] = useState<(typeof TAB_ORDER)[number]>("overview");

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ["egx-company-profile-v2", symbol || "__latest__"],
        queryFn: async () => fetchProfile(symbol),
        refetchInterval: 1000 * 60 * 15,
    });

    const profile = data?.profile;
    const selectValue = symbol || profile?.symbol || "";
    const tabs = (profile?.tabs || {}) as Record<string, TabPayload>;
    const activeTabData = tabs[activeTab];

    const cards = useMemo(() => activeTabData?.cards || [], [activeTabData]);
    const standaloneTables = useMemo(
        () => activeTabData?.standalone_tables || [],
        [activeTabData]
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#071121] text-slate-900 dark:text-white [font-family:var(--font-manrope)]">
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
                <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.2),transparent_40%),radial-gradient(circle_at_100%_20%,rgba(14,165,233,0.22),transparent_40%),linear-gradient(135deg,#ffffff,#f7fbff_48%,#e7f6ff)] p-5 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.45)] dark:border-cyan-300/20 dark:bg-[radial-gradient(circle_at_0%_0%,rgba(20,184,166,0.22),transparent_40%),radial-gradient(circle_at_100%_20%,rgba(14,165,233,0.24),transparent_40%),linear-gradient(135deg,#081427,#0a1c36_52%,#071526)] dark:shadow-[0_30px_72px_-44px_rgba(6,182,212,0.38)] md:p-7">
                    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(148,163,184,0.26)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.26)_1px,transparent_1px)] [background-size:30px_30px] dark:opacity-20" />
                    <div className="relative">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/60 bg-cyan-50/80 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-cyan-700 dark:border-cyan-300/35 dark:bg-cyan-400/10 dark:text-cyan-200">
                                    <Layers className="h-3.5 w-3.5" />
                                    Company Profile 2
                                </div>
                                <h1 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                                    Egypt Market Stock Profile
                                </h1>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                                    Full tab-by-tab extraction from Rubix secure profile page.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/70 p-2 dark:border-white/10 dark:bg-white/[0.04]">
                                <select
                                    value={selectValue}
                                    onChange={(event) => setSymbol(event.target.value)}
                                    className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-[#0b1730] dark:text-slate-100"
                                >
                                    {(data?.available_symbols || []).map((entry) => (
                                        <option key={entry.symbol} value={entry.symbol}>
                                            {entry.symbol} {entry.company_name ? `• ${entry.company_name}` : ""}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => refetch()}
                                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/60 bg-cyan-50 px-3 py-2 text-sm font-bold text-cyan-700 transition hover:bg-cyan-100 dark:border-cyan-300/35 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400/20"
                                >
                                    <RefreshCw className={clsx("h-4 w-4", isFetching && "animate-spin")} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-6">
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Symbol</p>
                                <p className="mt-1 text-lg font-black">{profile?.symbol || "—"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Price</p>
                                <p className="mt-1 text-lg font-black">
                                    {compact(profile?.last_price)} {compact(profile?.currency)}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Change</p>
                                <p className={clsx("mt-1 text-lg font-black", valueClass(profile?.change_percent))}>
                                    {compact(profile?.change_percent)} ({compact(profile?.change_value)})
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Best Bid</p>
                                <p className="mt-1 text-lg font-black">{compact(profile?.best_bid) || "—"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Best Ask</p>
                                <p className="mt-1 text-lg font-black">{compact(profile?.best_ask) || "—"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">As Of</p>
                                <p className="mt-1 text-sm font-bold">
                                    {compact(profile?.as_of_date) || compact(profile?.extracted_at) || "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_24px_66px_-46px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-[#081326] dark:shadow-[0_28px_70px_-42px_rgba(6,182,212,0.35)] md:p-6">
                    {isLoading ? (
                        <div className="grid gap-4 md:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"
                                />
                            ))}
                        </div>
                    ) : isError || !profile ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-white/20">
                            <p className="text-lg font-bold">Profile data unavailable</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {error instanceof Error ? error.message : "Run scraper and retry."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-5 flex flex-wrap gap-2">
                                {TAB_ORDER.map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={clsx(
                                            "rounded-xl border px-4 py-2 text-sm font-bold transition",
                                            activeTab === tab
                                                ? "border-cyan-400/70 bg-cyan-50 text-cyan-700 dark:border-cyan-300/40 dark:bg-cyan-400/15 dark:text-cyan-200"
                                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-cyan-300/35 dark:hover:text-cyan-200"
                                        )}
                                    >
                                        {tabTitle(tab)}
                                    </button>
                                ))}
                            </div>

                            <div className="mb-5 grid gap-3 md:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        <Layers className="h-3.5 w-3.5" /> Cards
                                    </div>
                                    <p className="mt-1 text-xl font-black">{cards.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        <Database className="h-3.5 w-3.5" /> Standalone Tables
                                    </div>
                                    <p className="mt-1 text-xl font-black">{standaloneTables.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        <Activity className="h-3.5 w-3.5" /> 1W / 1M / 3M
                                    </div>
                                    <p className="mt-1 text-sm font-bold">
                                        {compact(profile.performance_1w)} | {compact(profile.performance_1m)} |{" "}
                                        {compact(profile.performance_3m)}
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                        <CalendarDays className="h-3.5 w-3.5" /> Last Extract
                                    </div>
                                    <p className="mt-1 text-sm font-bold">{compact(profile.extracted_at)}</p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {cards.map((card, idx) => (
                                    <article
                                        key={`${card.title}-${idx}`}
                                        className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_18px_45px_-38px_rgba(15,23,42,0.48)] dark:border-white/10 dark:bg-white/[0.02] dark:shadow-[0_16px_40px_-32px_rgba(6,182,212,0.28)]"
                                    >
                                        <h3 className="text-base font-black leading-tight">
                                            {compact(card.title) || `Section ${idx + 1}`}
                                        </h3>

                                        {card.table_rows?.length > 0 ? (
                                            <div className="mt-3">
                                                <DataTable rows={card.table_rows} />
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                                {compact(card.text) || "No text content in this card."}
                                            </p>
                                        )}

                                        {card.list_items?.length > 0 && (
                                            <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.02]">
                                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    List Items
                                                </p>
                                                <div className="space-y-1">
                                                    {card.list_items.slice(0, 8).map((item, itemIdx) => (
                                                        <p
                                                            key={`${item}-${itemIdx}`}
                                                            className="text-xs text-slate-600 dark:text-slate-300"
                                                        >
                                                            {item}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>

                            {standaloneTables.length > 0 && (
                                <div className="mt-6 space-y-4">
                                    {standaloneTables.map((table) => (
                                        <div key={table.table_index} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                                                Standalone Table #{table.table_index}
                                            </p>
                                            <DataTable rows={table.rows} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
