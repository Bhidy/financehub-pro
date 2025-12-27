"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTickers } from '@/lib/api';
import { useToast } from './ToastProvider';
import clsx from 'clsx';

interface PriceAlert {
    id: string;
    symbol: string;
    targetPrice: number;
    condition: 'above' | 'below';
    enabled: boolean;
}

export default function AlertManager() {
    const { data: tickers = [] } = useQuery({ queryKey: ["tickers"], queryFn: fetchTickers });
    const { showToast } = useToast();

    const [alerts, setAlerts] = useState<PriceAlert[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newAlert, setNewAlert] = useState({
        symbol: '2222.SR',
        targetPrice: 0,
        condition: 'above' as 'above' | 'below'
    });

    // Check alerts every 30 seconds
    useEffect(() => {
        const checkAlerts = () => {
            alerts.forEach((alert) => {
                if (!alert.enabled) return;

                const ticker = tickers.find((t: any) => t.symbol === alert.symbol);
                if (!ticker) return;

                const currentPrice = ticker.last_price;
                const triggered =
                    (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
                    (alert.condition === 'below' && currentPrice <= alert.targetPrice);

                if (triggered) {
                    showToast(
                        `🔔 ${alert.symbol} is now ${alert.condition} ${alert.targetPrice.toFixed(2)} (Current: ${currentPrice.toFixed(2)})`,
                        'warning',
                        10000
                    );

                    // Disable alert after triggering
                    setAlerts((prev) =>
                        prev.map((a) => (a.id === alert.id ? { ...a, enabled: false } : a))
                    );
                }
            });
        };

        const interval = setInterval(checkAlerts, 30000);
        return () => clearInterval(interval);
    }, [alerts, tickers, showToast]);

    const addAlert = () => {
        const alert: PriceAlert = {
            id: Date.now().toString(),
            symbol: newAlert.symbol,
            targetPrice: newAlert.targetPrice,
            condition: newAlert.condition,
            enabled: true
        };

        setAlerts((prev) => [...prev, alert]);
        setShowModal(false);
        showToast(`Alert created for ${alert.symbol}`, 'success');

        setNewAlert({ symbol: '2222.SR', targetPrice: 0, condition: 'above' });
    };

    const deleteAlert = (id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        showToast('Alert deleted', 'info');
    };

    const toggleAlert = (id: string) => {
        setAlerts((prev) =>
            prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
        );
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">Price Alerts</h2>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                    + New Alert
                </button>
            </div>

            {alerts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <div className="text-4xl mb-3">🔔</div>
                    <p className="font-bold">No active alerts</p>
                    <p className="text-sm">Create an alert to get notified when a price target is reached</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={clsx(
                                "border rounded-lg p-4 flex items-center gap-4 transition-all",
                                alert.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-50"
                            )}
                        >
                            <button
                                onClick={() => toggleAlert(alert.id)}
                                className={clsx(
                                    "w-12 h-6 rounded-full transition-colors relative",
                                    alert.enabled ? "bg-emerald-500" : "bg-slate-300"
                                )}
                            >
                                <div
                                    className={clsx(
                                        "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                                        alert.enabled ? "left-6" : "left-0.5"
                                    )}
                                />
                            </button>

                            <div className="flex-1">
                                <div className="font-bold text-slate-900 font-mono">{alert.symbol}</div>
                                <div className="text-sm text-slate-500 font-medium">
                                    Notify when price goes{' '}
                                    <span className={clsx("font-bold", alert.condition === 'above' ? "text-emerald-600" : "text-red-600")}>
                                        {alert.condition}
                                    </span>{' '}
                                    {alert.targetPrice.toFixed(2)}
                                </div>
                            </div>

                            <button
                                onClick={() => deleteAlert(alert.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors px-2"
                            >
                                🗑️
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Create Price Alert</h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Symbol</label>
                                <select
                                    value={newAlert.symbol}
                                    onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold font-mono"
                                >
                                    {tickers.map((t: any) => (
                                        <option key={t.symbol} value={t.symbol}>
                                            {t.symbol} - {t.name_en}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Condition</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setNewAlert({ ...newAlert, condition: 'above' })}
                                        className={clsx(
                                            "p-3 rounded-lg font-bold border-2 transition-all",
                                            newAlert.condition === 'above'
                                                ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                                                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                                        )}
                                    >
                                        📈 Above
                                    </button>
                                    <button
                                        onClick={() => setNewAlert({ ...newAlert, condition: 'below' })}
                                        className={clsx(
                                            "p-3 rounded-lg font-bold border-2 transition-all",
                                            newAlert.condition === 'below'
                                                ? "bg-red-50 border-red-600 text-red-900"
                                                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                                        )}
                                    >
                                        📉 Below
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newAlert.targetPrice}
                                    onChange={(e) => setNewAlert({ ...newAlert, targetPrice: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-bold font-mono text-lg"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={addAlert}
                                disabled={newAlert.targetPrice <= 0}
                                className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Create Alert
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
