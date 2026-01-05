"use client";

import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LineChart, Line } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Table as TableIcon, BarChart3, Download, Calendar } from 'lucide-react';
import clsx from 'clsx';

interface FinancialStatement {
    fiscal_year: string;
    end_date: string;
    revenue: number;
    net_income: number;
    eps: number;
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    raw_data: Record<string, any>; // Full data
}

interface FinancialsTabProps {
    symbol: string;
}

const formatNumber = (num: number) => {
    if (!num) return '-';
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
};

const formatCurrency = (num: number) => {
    if (!num) return '-';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

// Map raw keys to readable labels
const FIELD_MAPS = {
    income: [
        { label: 'Revenue', key: 'revenue', bold: true },
        { label: 'Cost of Revenue', key: 'costOfRevenue' },
        { label: 'Gross Profit', key: 'grossProfit', bold: true, color: 'text-blue-600' },
        { label: 'R&D Expenses', key: 'researchAndDevelopmentExpenses' },
        { label: 'SG&A Expenses', key: 'sellingGeneralAndAdministrativeExpenses' },
        { label: 'Operating Income', key: 'operatingIncome', bold: true },
        { label: 'Interest Expense', key: 'interestExpense' },
        { label: 'Income Before Tax', key: 'incomeBeforeTax' },
        { label: 'Income Tax', key: 'incomeTaxExpense' },
        { label: 'Net Income', key: 'netIncome', bold: true, color: 'text-green-600' },
        { label: 'EPS', key: 'eps', isRatio: true },
        { label: 'EBITDA', key: 'ebitda', bold: true },
    ],
    balance: [
        { label: 'Cash & Equivalents', key: 'cashAndCashEquivalents' },
        { label: 'Short Term Investments', key: 'shortTermInvestments' },
        { label: 'Total Current Assets', key: 'totalCurrentAssets', bold: true },
        { label: 'Property, Plant & Equipment', key: 'propertyPlantAndEquipmentNet' },
        { label: 'Long Term Investments', key: 'longTermInvestments' },
        { label: 'Total Assets', key: 'totalAssets', bold: true, color: 'text-blue-600' },
        { header: 'Liabilities & Equity' },
        { label: 'Total Current Liabilities', key: 'totalCurrentLiabilities', bold: true },
        { label: 'Long Term Debt', key: 'longTermDebt' },
        { label: 'Total Liabilities', key: 'totalLiabilities', bold: true },
        { label: 'Retained Earnings', key: 'retainedEarnings' },
        { label: 'Total Equity', key: 'totalStockholderEquity', bold: true, color: 'text-green-600' },
    ],
    cash: [
        { label: 'Net Income', key: 'netIncome' },
        { label: 'Depreciation & Amortization', key: 'depreciationAndAmortization' },
        { label: 'Stock Based Compensation', key: 'stockBasedCompensation' },
        { label: 'Operating Cash Flow', key: 'netCashProvidedByOperatingActivities', bold: true, color: 'text-blue-600' },
        { label: 'Capex', key: 'capitalExpenditure' },
        { label: 'Investing Cash Flow', key: 'netCashUsedForInvestingActivities', bold: true },
        { label: 'Debt Repayment', key: 'debtRepayment' },
        { label: 'Dividends Paid', key: 'commonStockDividendPaid' },
        { label: 'Financing Cash Flow', key: 'netCashUsedProvidedByFinancingActivities', bold: true },
        { label: 'Free Cash Flow', key: 'freeCashFlow', bold: true, color: 'text-green-600' },
    ]
};

export default function FinancialsTab({ symbol }: FinancialsTabProps) {
    const [period, setPeriod] = useState<'annual' | 'quarterly'>('annual');
    const [view, setView] = useState<'income' | 'balance' | 'cash'>('income');
    const [data, setData] = useState<FinancialStatement[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch data when period changes
    useMemo(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/v1/egx/financials/${symbol}?period=${period}`);
                if (res.ok) {
                    const json = await res.json();
                    // Sort descending by date
                    setData(json.sort((a: any, b: any) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()));
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchData();
    }, [symbol, period]);

    // Prepare chart data (reverse for chronological order)
    const chartData = useMemo(() => {
        return [...data].reverse().map(d => ({
            year: d.fiscal_year || new Date(d.end_date).getFullYear().toString(),
            Revenue: d.revenue || d.raw_data?.revenue || 0,
            NetIncome: d.net_income || d.raw_data?.netIncome || 0,
            FCF: d.raw_data?.freeCashFlow || 0,
            OperatingMargin: d.revenue ? ((d.raw_data?.operatingIncome || 0) / d.revenue) * 100 : 0
        }));
    }, [data]);

    const activeFields = FIELD_MAPS[view];

    // Helper to get value from raw_data or top-level props
    const getValue = (item: FinancialStatement, key: string) => {
        if (key in item && (item as any)[key] !== null) return (item as any)[key];
        return item.raw_data?.[key] || 0;
    };

    if (loading && data.length === 0) {
        return <div className="p-12 text-center text-gray-500">Loading financials...</div>;
    }

    if (!loading && data.length === 0) {
        return <div className="p-12 text-center text-gray-500">No financial data available for this period.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-1">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button onClick={() => setPeriod('annual')} className={clsx("px-4 py-2 text-sm font-bold rounded-lg transition-all", period === 'annual' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>Annual</button>
                    <button onClick={() => setPeriod('quarterly')} className={clsx("px-4 py-2 text-sm font-bold rounded-lg transition-all", period === 'quarterly' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700")}>Quarterly</button>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto">
                    {[
                        { id: 'income', label: 'Income Statement', icon: TableIcon },
                        { id: 'balance', label: 'Balance Sheet', icon: TableIcon },
                        { id: 'cash', label: 'Cash Flow', icon: BarChart3 },
                    ].map(v => (
                        <button
                            key={v.id}
                            onClick={() => setView(v.id as any)}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-all",
                                view === v.id ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <v.icon className="w-4 h-4" />
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs Net Income */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Performance Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(v) => formatNumber(v)} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: '#F3F4F6' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                formatter={(v: number) => formatNumber(v)}
                            />
                            <Legend />
                            <Bar dataKey="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            <Bar dataKey="NetIncome" fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Margins Trend */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Operating Margin Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="year" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                formatter={(v: number) => `${v.toFixed(2)}%`}
                            />
                            <Area type="monotone" dataKey="OperatingMargin" stroke="#F59E0B" fill="url(#marginGrad)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left py-4 px-6 text-sm font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 w-64">Metric</th>
                                {data.map((d, i) => (
                                    <th key={i} className="text-right py-4 px-6 text-sm font-bold text-gray-600 min-w-[120px]">
                                        {d.fiscal_year || new Date(d.end_date).getFullYear()}
                                        <div className="text-[10px] text-gray-400 font-normal">{new Date(d.end_date).toLocaleDateString()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {activeFields.map((field, i) => {
                                if ('header' in field) {
                                    return (
                                        <tr key={i} className="bg-gray-50/50">
                                            <td colSpan={data.length + 1} className="py-2 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                {field.header}
                                            </td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className={clsx(
                                            "py-3 px-6 text-sm text-gray-700 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 border-r border-transparent group-hover:border-blue-100",
                                            field.bold && "font-bold"
                                        )}>
                                            {field.label}
                                        </td>
                                        {data.map((d, j) => {
                                            const val = getValue(d, field.key!);
                                            return (
                                                <td key={j} className={clsx(
                                                    "text-right py-3 px-6 text-sm font-mono",
                                                    field.bold && "font-bold",
                                                    field.color || "text-gray-600"
                                                )}>
                                                    {field.isRatio ? val.toFixed(2) : formatCurrency(val)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="text-center text-xs text-gray-400 mt-4">
                All figures in EGP unless otherwise noted
            </div>
        </div>
    );
}
