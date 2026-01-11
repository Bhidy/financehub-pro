"use client";

import { useState } from 'react';
import { clsx } from 'clsx';
import { FileText, DollarSign, Activity } from 'lucide-react';

interface FinancialStatementsProps {
    data: {
        income_statement?: any[];
        balance_sheet?: any[];
        cash_flow?: any[];
    };
    currency?: string;
}

const TAB_CONFIG = [
    { id: 'income_statement', label: 'Income Statement', icon: FileText },
    { id: 'balance_sheet', label: 'Balance Sheet', icon: DollarSign },
    { id: 'cash_flow', label: 'Cash Flow', icon: Activity },
];

const formatNumber = (num: any) => {
    if (num === null || num === undefined) return '-';
    const n = Number(num);
    if (isNaN(n)) return num; // Return as is if string (e.g. date)

    // Billion
    if (Math.abs(n) >= 1.0e+9) {
        return (n / 1.0e+9).toFixed(2) + "B";
    }
    // Million
    if (Math.abs(n) >= 1.0e+6) {
        return (n / 1.0e+6).toFixed(2) + "M";
    }
    // Thousand
    if (Math.abs(n) >= 1.0e+3) {
        return (n / 1.0e+3).toFixed(2) + "K";
    }
    return n.toLocaleString();
};

export default function FinancialStatements({ data, currency = 'EGP' }: FinancialStatementsProps) {
    const [activeTab, setActiveTab] = useState('income_statement');

    const activeData = data?.[activeTab as keyof typeof data] || [];

    // If no data
    if (!activeData || activeData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">No Financial Data Available</h3>
                <p className="text-slate-500 text-sm mt-1">Detailed statements are not currently available for this company.</p>
            </div>
        );
    }

    // Extract columns (keys) from the first item, excluding 'symbol' etc if needed
    // Usually first item has all keys.
    // Note: YahooQuery returns specific keys. We might want to filter or order them.
    // For now, let's just dump the raw table but formatted nicely.

    // Common important keys to prioritize at top if we were transposing. 
    // Here we list rows as years usually? 
    // Wait, YahooQuery returns list of records. Each record is a Year/Date.
    // So distinct keys are Columns. Rows are Periods.

    const columns = Object.keys(activeData[0]).filter(k => k !== 'symbol' && k !== 'periodType' && k !== 'currencyCode');
    // Sort columns? 'asOfDate' should be first.
    const dateKey = columns.find(c => c.toLowerCase().includes('date')) || 'asOfDate';
    const otherCols = columns.filter(c => c !== dateKey).sort();
    const sortedCols = [dateKey, ...otherCols];

    // Transpose for better readability? 
    // Standard financial view: Columns = Years, Rows = Metrics.
    // Let's Transpose.

    const transposedData: any = {};
    sortedCols.forEach(metric => {
        if (metric === dateKey) return;
        transposedData[metric] = activeData.map(period => period[metric]);
    });

    const periods = activeData.map(period => period[dateKey]);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto">
                {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={clsx(
                                "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="p-6 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr>
                            <th className="py-3 px-4 text-slate-500 font-medium bg-slate-50/50 rounded-l-xl w-1/3">
                                Metric ({currency})
                            </th>
                            {periods.map((date: string, idx: number) => (
                                <th key={idx} className={clsx("py-3 px-4 text-slate-700 font-bold bg-slate-50/50 whitespace-nowrap", idx === periods.length - 1 && "rounded-r-xl")}>
                                    {date}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {Object.keys(transposedData).map((metric) => (
                            <tr key={metric} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="py-3 px-4 font-medium text-slate-600 capitalize">
                                    {metric.replace(/([A-Z])/g, ' $1').trim()} {/* CamelCase to Title Case */}
                                </td>
                                {transposedData[metric].map((val: any, idx: number) => (
                                    <td key={idx} className="py-3 px-4 font-mono text-slate-700">
                                        {formatNumber(val)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                    Data provided by Yahoo Finance • Values in {currency}
                </p>
            </div>
        </div>
    );
}
