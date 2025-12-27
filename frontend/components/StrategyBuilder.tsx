"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchTickers, api, Ticker } from '@/lib/api';
import clsx from 'clsx';

interface StrategyRule {
    indicator: string;
    operator: string;
    value: number;
    action: string;
}

interface StrategyConfig {
    symbol: string;
    initial_capital: number;
    rules: StrategyRule[];
}

interface Trade {
    time: string;
    type: 'BUY' | 'SELL';
    price: number;
    qty: number;
    pnl?: number;
}

interface BacktestResult {
    final_capital: number;
    total_trades: number;
    equity_curve: any[]; // Keeping any for complex object if needed, or specific shape
    trades: Trade[];
}

export default function StrategyBuilder() {
    const { data: tickers = [] } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });

    const [config, setConfig] = useState<StrategyConfig>({
        symbol: "2222.SR",
        initial_capital: 10000,
        rules: [
            { indicator: 'RSI_14', operator: '<', value: 30, action: 'BUY' },
            { indicator: 'RSI_14', operator: '>', value: 70, action: 'SELL' }
        ]
    });

    const [results, setResults] = useState<BacktestResult | null>(null);

    const backtestMutation = useMutation({
        mutationFn: async (data: StrategyConfig) => {
            const res = await api.post("/backtest/run", data);
            return res.data;
        },
        onSuccess: (data: BacktestResult) => {
            setResults(data);
        }
    });

    const runBacktest = () => {
        backtestMutation.mutate(config);
    };

    const addRule = () => {
        setConfig(prev => ({
            ...prev,
            rules: [...prev.rules, { indicator: 'SMA_20', operator: '>', value: 0, action: 'BUY' }]
        }));
    };

    const updateRule = (idx: number, field: keyof StrategyRule, val: string | number) => {
        const newRules = [...config.rules];
        newRules[idx] = { ...newRules[idx], [field]: val };
        setConfig(prev => ({ ...prev, rules: newRules }));
    };

    const removeRule = (idx: number) => {
        const newRules = config.rules.filter((_, i) => i !== idx);
        setConfig(prev => ({ ...prev, rules: newRules }));
    };

    return (
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            {/* Left: Configuration */}
            <div className="col-span-12 lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-y-auto">
                <h2 className="text-lg font-bold text-slate-900 mb-6 font-sans">Strategy Configuration</h2>

                <div className="space-y-6">
                    {/* Symbol & Capital */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Symbol</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold"
                                value={config.symbol}
                                onChange={e => setConfig({ ...config, symbol: e.target.value })}
                            >
                                {tickers.map((t: Ticker) => (
                                    <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Capital ($)</label>
                            <input
                                type="number"
                                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm font-bold"
                                value={config.initial_capital}
                                onChange={e => setConfig({ ...config, initial_capital: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-4"></div>

                    {/* Rules Engine */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase">Trading Rules</label>
                            <button onClick={addRule} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100">+ Add Rule</button>
                        </div>

                        <div className="space-y-3">
                            {config.rules.map((rule, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-3 text-sm relative group">
                                    <button onClick={() => removeRule(idx)} className="absolute top-1 right-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100">×</button>
                                    <div className="flex gap-2 items-center mb-2">
                                        <span className="font-bold text-slate-400 text-xs">IF</span>
                                        <select
                                            value={rule.indicator}
                                            onChange={(e) => updateRule(idx, 'indicator', e.target.value)}
                                            className="bg-white border border-slate-200 rounded text-xs font-bold p-1"
                                        >
                                            <option value="RSI_14">RSI (14)</option>
                                            <option value="SMA_20">SMA (20)</option>
                                            <option value="SMA_50">SMA (50)</option>
                                            <option value="SMA_200">SMA (200)</option>
                                        </select>
                                        <select
                                            value={rule.operator}
                                            onChange={(e) => updateRule(idx, 'operator', e.target.value)}
                                            className="bg-white border border-slate-200 rounded text-xs font-bold p-1 w-12 text-center"
                                        >
                                            <option value="<">&lt;</option>
                                            <option value=">">&gt;</option>
                                            <option value="=">=</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={rule.value}
                                            onChange={(e) => updateRule(idx, 'value', e.target.value)}
                                            className="bg-white border border-slate-200 rounded text-xs font-bold p-1 w-16"
                                        />
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <span className="font-bold text-slate-400 text-xs">THEN</span>
                                        <select
                                            value={rule.action}
                                            onChange={(e) => updateRule(idx, 'action', e.target.value)}
                                            className={clsx("bg-white border border-slate-200 rounded text-xs font-bold p-1 flex-1", rule.action === 'BUY' ? 'text-emerald-600' : 'text-red-600')}
                                        >
                                            <option value="BUY">BUY - Enter Long</option>
                                            <option value="SELL">SELL - Exit Position</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={runBacktest}
                        disabled={backtestMutation.isPending}
                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        {backtestMutation.isPending ? "Simulating..." : "Run Backtest 🚀"}
                    </button>
                    {backtestMutation.error && (
                        <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded">
                            Simulation Error: {String(backtestMutation.error)}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Results */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                {results ? (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div className="text-xs text-slate-400 font-bold uppercase">Final Equity</div>
                                <div className={clsx("text-2xl font-bold font-mono", results.final_capital >= config.initial_capital ? "text-emerald-600" : "text-red-600")}>
                                    ${results.final_capital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div className="text-xs text-slate-400 font-bold uppercase">Total Trades</div>
                                <div className="text-2xl font-bold font-mono text-slate-900">{results.total_trades}</div>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div className="text-xs text-slate-400 font-bold uppercase">Return %</div>
                                <div className={clsx("text-2xl font-bold font-mono", results.final_capital >= config.initial_capital ? "text-emerald-600" : "text-red-600")}>
                                    {((results.final_capital - config.initial_capital) / config.initial_capital * 100).toFixed(2)}%
                                </div>
                            </div>
                            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                                <div className="text-xs text-slate-400 font-bold uppercase">Win Rate</div>
                                <div className="text-2xl font-bold font-mono text-slate-900">--%</div>
                            </div>
                        </div>

                        {/* Equity Chart (Using same TVChart for now, or simple placeholder) */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-[400px]">
                            <h3 className="text-sm font-bold text-slate-900 mb-4">Equity Curve</h3>
                            {/* In a real app, map equity_curve to TVChart data structure */}
                            <div className="h-full flex items-center justify-center text-slate-400 italic">
                                [Equity Chart Visual Placeholder - {results.equity_curve.length} data points]
                            </div>
                        </div>

                        {/* Trade Log */}
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Action</th>
                                        <th className="px-6 py-3 text-right">Price</th>
                                        <th className="px-6 py-3 text-right">Qty</th>
                                        <th className="px-6 py-3 text-right">P&L</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {results.trades.slice(0, 20).map((t: Trade, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50 font-mono">
                                            <td className="px-6 py-3 text-slate-600">{t.time.split('T')[0]}</td>
                                            <td className={clsx("px-6 py-3 font-bold", t.type === 'BUY' ? "text-emerald-600" : "text-red-600")}>{t.type}</td>
                                            <td className="px-6 py-3 text-right">{Number(t.price).toFixed(2)}</td>
                                            <td className="px-6 py-3 text-right">{t.qty}</td>
                                            <td className={clsx("px-6 py-3 text-right font-bold", (t.pnl || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                                                {t.pnl ? Number(t.pnl).toFixed(2) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                        <div className="text-4xl mb-4">🧪</div>
                        <p className="font-bold">Ready to Simulate</p>
                        <p className="text-sm">Configure your strategy rules on the left and click Run.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
