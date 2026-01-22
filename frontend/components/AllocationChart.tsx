"use client";

import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';
import { useMarketSafe } from "@/contexts/MarketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { PieChart as PieIcon } from "lucide-react";

interface AllocationChartProps {
    data: { sector: string; value: number; percent: number }[];
}

export function AllocationChart({ data }: AllocationChartProps) {
    const { config } = useMarketSafe();
    const { theme } = useTheme();
    const currency = config.currency;
    const isDark = theme === 'dark';

    const COLORS = [
        '#14B8A6', // Midnight Teal
        '#3B82F6', // Trust Blue
        '#6366F1', // Indigo
        '#8B5CF6', // Violet
        '#EC4899', // Pink
        '#F59E0B', // Amber
        '#10B981', // Emerald
    ];

    const chartData = data.map((d) => ({ name: d.sector, value: d.value }));

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/10 dark:shadow-black/60 h-[480px] flex flex-col transition-colors duration-500 group"
        >
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Allocation</h3>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">Sector Exposure</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400">
                    <PieIcon className="w-5 h-5" />
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* DONUT CHART ZONE */}
                <div className="w-full h-[280px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={75}
                                outerRadius={95}
                                paddingAngle={8}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={6}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                        className="outline-none"
                                    />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{
                                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                                    borderRadius: '16px',
                                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                    color: isDark ? '#FFF' : '#000'
                                }}
                                itemStyle={{ color: isDark ? '#FFF' : '#000', fontWeight: 'bold' }}
                                formatter={(val: any) => `${currency} ${Number(val).toLocaleString()}`}
                            />
                        </RePieChart>
                    </ResponsiveContainer>

                    {/* Elite Center Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="block text-4xl font-black text-slate-900 dark:text-white leading-none">
                                {data.length}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                Sectors
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Legend Scroll */}
            <div className="mt-6 overflow-x-auto pb-2 flex gap-4 custom-scrollbar">
                {data.map((item, index) => (
                    <div
                        key={index}
                        className="flex flex-col gap-1 shrink-0 bg-slate-50 dark:bg-white/5 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-white/5 min-w-[120px]"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase truncate max-w-[80px]">
                                {item.sector}
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-slate-900 dark:text-white">{item.percent.toFixed(0)}%</span>
                            <span className="text-[10px] font-bold text-slate-400">{(item.value / 1000).toFixed(0)}k</span>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
