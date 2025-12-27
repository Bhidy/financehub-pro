"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchMyWatchlists, createWatchlist, deleteWatchlist,
    addWatchlistItem, removeWatchlistItem,
    fetchMyAlerts, createAlert, deleteAlert
} from "@/lib/api";
import clsx from "clsx";
import { useState } from "react";
import Link from "next/link";
import {
    List, Bell, Trash2, Plus, Search,
    ArrowUpRight, ArrowDownRight, Eye,
    AlertTriangle, Check, X
} from "lucide-react";

export default function WatchlistPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<"watchlists" | "alerts">("watchlists");
    const [newWatchlistName, setNewWatchlistName] = useState("");
    const [showCreateWL, setShowCreateWL] = useState(false);

    // Watchlist Item Form
    const [addItemSymbol, setAddItemSymbol] = useState("");
    const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);

    // Alert Form
    const [alertForm, setAlertForm] = useState({ symbol: "", target: "", condition: "ABOVE" });
    const [showAlertForm, setShowAlertForm] = useState(false);

    // --- Queries ---
    const { data: watchlists, isLoading: loadWL } = useQuery({
        queryKey: ["watchlists"],
        queryFn: () => fetchMyWatchlists()
    });

    const { data: alerts, isLoading: loadAlerts } = useQuery({
        queryKey: ["alerts"],
        queryFn: () => fetchMyAlerts()
    });

    // --- Mutations ---

    const createWLMut = useMutation({
        mutationFn: (name: string) => createWatchlist(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchlists"] });
            setNewWatchlistName("");
            setShowCreateWL(false);
        }
    });

    const deleteWLMut = useMutation({
        mutationFn: (id: string) => deleteWatchlist(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    });

    const addItemMut = useMutation({
        mutationFn: (vars: { wId: string, sym: string }) => addWatchlistItem(vars.wId, vars.sym),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["watchlists"] });
            setAddItemSymbol("");
        }
    });

    const removeItemMut = useMutation({
        mutationFn: (vars: { wId: string, sym: string }) => removeWatchlistItem(vars.wId, vars.sym),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watchlists"] })
    });

    const createAlertMut = useMutation({
        mutationFn: (vars: any) => createAlert(vars.symbol, Number(vars.target), vars.condition),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["alerts"] });
            setShowAlertForm(false);
            setAlertForm({ symbol: "", target: "", condition: "ABOVE" });
        }
    });

    const deleteAlertMut = useMutation({
        mutationFn: (id: string) => deleteAlert(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] })
    });

    if (loadWL || loadAlerts) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Market Focus</h1>
                            <p className="text-slate-500 font-medium">Watchlists & Smart Alerts</p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab("watchlists")}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                    activeTab === "watchlists" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Watchlists
                            </button>
                            <button
                                onClick={() => setActiveTab("alerts")}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                    activeTab === "alerts" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Price Alerts
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                {activeTab === "watchlists" ? (
                    <div className="space-y-8">
                        {/* Watchlist Controls */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <List className="w-5 h-5 text-blue-500" />
                                My Watchlists
                            </h2>
                            <button
                                onClick={() => setShowCreateWL(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New List
                            </button>
                        </div>

                        {showCreateWL && (
                            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-lg shadow-blue-500/5 max-w-md animate-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">List Name</label>
                                <div className="flex gap-2">
                                    <input
                                        autoFocus
                                        className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg font-bold outline-none focus:border-blue-500"
                                        placeholder="e.g. Tech Growth"
                                        value={newWatchlistName}
                                        onChange={e => setNewWatchlistName(e.target.value)}
                                    />
                                    <button
                                        onClick={() => createWLMut.mutate(newWatchlistName)}
                                        disabled={!newWatchlistName}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold"
                                    >
                                        Create
                                    </button>
                                    <button
                                        onClick={() => setShowCreateWL(false)}
                                        className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Watchlists Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {watchlists?.map((wl: any) => (
                                <div key={wl.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow group">
                                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                        <h3 className="font-bold text-lg text-slate-800">{wl.name}</h3>
                                        <button
                                            onClick={() => deleteWLMut.mutate(wl.id)}
                                            className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex flex-wrap gap-2 mb-4 min-h-[50px]">
                                            {wl.items.length === 0 && (
                                                <p className="text-slate-400 text-sm italic w-full text-center py-4">No symbols tracked</p>
                                            )}
                                            {wl.items.map((item: any) => (
                                                <div key={item.symbol} className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
                                                    <Link href={`/symbol/${item.symbol}`} className="font-bold text-slate-700 hover:text-blue-600">
                                                        {item.symbol}
                                                    </Link>
                                                    <button
                                                        onClick={() => removeItemMut.mutate({ wId: wl.id, sym: item.symbol })}
                                                        className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <input
                                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold uppercase placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                                placeholder="Add Symbol (e.g. 1120)"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.currentTarget.value;
                                                        if (val) {
                                                            addItemMut.mutate({ wId: wl.id, sym: val.toUpperCase() });
                                                            e.currentTarget.value = "";
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(!watchlists || watchlists.length === 0) && !showCreateWL && (
                                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                                    <Eye className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <h3 className="font-bold text-slate-400">No Watchlists Yet</h3>
                                    <button
                                        onClick={() => setShowCreateWL(true)}
                                        className="text-blue-600 font-bold text-sm mt-2 hover:underline"
                                    >
                                        Create your first watchlist
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Alert Controls */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Bell className="w-5 h-5 text-orange-500" />
                                Active Alerts
                            </h2>
                            <button
                                onClick={() => setShowAlertForm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New Alert
                            </button>
                        </div>

                        {showAlertForm && (
                            <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-lg shadow-orange-500/5 max-w-2xl mx-auto animate-in slide-in-from-top-2">
                                <h3 className="font-black text-lg mb-4 text-slate-800">Set Price Alert</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Symbol</label>
                                        <input
                                            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold uppercase outline-none focus:border-orange-500"
                                            placeholder="1120"
                                            value={alertForm.symbol}
                                            onChange={e => setAlertForm({ ...alertForm, symbol: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Condition</label>
                                        <select
                                            className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold outline-none focus:border-orange-500 bg-white"
                                            value={alertForm.condition}
                                            onChange={e => setAlertForm({ ...alertForm, condition: e.target.value })}
                                        >
                                            <option value="ABOVE">Goes Above</option>
                                            <option value="BELOW">Goes Below</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-slate-400 font-bold">SAR</span>
                                            <input
                                                type="number"
                                                className="w-full pl-12 pr-3 py-2 border-2 border-slate-200 rounded-lg font-bold outline-none focus:border-orange-500"
                                                placeholder="0.00"
                                                value={alertForm.target}
                                                onChange={e => setAlertForm({ ...alertForm, target: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => setShowAlertForm(false)}
                                        className="px-4 py-2 text-slate-500 font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => createAlertMut.mutate(alertForm)}
                                        disabled={!alertForm.symbol || !alertForm.target}
                                        className="px-6 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50"
                                    >
                                        Create Alert
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Symbol</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Condition</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Target Price</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {alerts?.map((alert: any) => (
                                        <tr key={alert.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4">
                                                <Link href={`/symbol/${alert.symbol}`} className="font-black text-slate-800 hover:text-orange-600">
                                                    {alert.symbol}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded-md text-xs font-bold uppercase",
                                                    alert.condition === "ABOVE" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    Is {alert.condition}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">
                                                SAR {Number(alert.target_price).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {alert.triggered_at ? (
                                                    <span className="flex items-center justify-center gap-1 text-xs font-bold text-orange-600">
                                                        <AlertTriangle className="w-4 h-4" /> Triggered
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center justify-center gap-1 text-xs font-bold text-green-600">
                                                        <Check className="w-4 h-4" /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => deleteAlertMut.mutate(alert.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!alerts || alerts.length === 0) && (
                                        <tr>
                                            <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                                                No price alerts set
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
