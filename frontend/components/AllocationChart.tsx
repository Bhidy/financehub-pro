"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface AllocationChartProps {
    data: { sector: string; value: number; percent: number }[];
}

export function AllocationChart({ data }: AllocationChartProps) {
    const COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#DB2777', '#EF4444', '#F59E0B', '#10B981', '#06B6D4', '#0EA5E9'];

    // Simplify data for chart
    const chartData = data.map((d) => ({ name: d.sector, value: d.value }));

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#151925] border border-white/5 rounded-[32px] p-6 shadow-xl h-[400px] flex flex-col"
        >
            <h3 className="text-lg font-bold text-white mb-4">Allocation</h3>

            <div className="flex-1 flex flex-col md:flex-row items-center gap-8">
                {/* DONUT CHART */}
                <div className="w-full h-[250px] md:w-1/2 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                {COLORS.map((c, i) => (
                                    <linearGradient key={i} id={`color-${i}`} x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor={c} />
                                        <stop offset="100%" stopColor={c} stopOpacity={0.8} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#color-${index % COLORS.length})`} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(val: any) => `SAR ${Number(val).toLocaleString()}`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="text-2xl font-black text-white">{data.length}</span>
                            <p className="text-[10px] uppercase text-slate-400 font-bold">Sectors</p>
                        </div>
                    </div>
                </div>

                {/* LEGEND */}
                <div className="w-full md:w-1/2 overflow-y-auto max-h-[250px] custom-scrollbar pr-2 space-y-3">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-sm font-medium text-slate-300 group-hover:text-white truncate max-w-[120px]" title={item.sector}>
                                    {item.sector}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-sm font-bold text-white">{item.percent.toFixed(1)}%</span>
                                <span className="block text-xs text-slate-500">SAR {(item.value / 1000).toFixed(1)}k</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
