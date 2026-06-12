"use client";

import { useMemo } from "react";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

interface OwnershipData {
    type: string;
    percent: number;
    value?: number;
}

interface OwnershipDonutProps {
    data: OwnershipData[];
}

const COLORS = {
    "General Public": "#94a3b8", // Slate
    "Institutions": "#3b82f6",   // Blue
    "Individual Insiders": "#f59e0b", // Amber
    "Private Companies": "#8b5cf6",   // Violet
    "State or Government": "#10b981", // Emerald
    "VC/PE Firms": "#ef4444"          // Red
};

export function OwnershipDonut({ data }: OwnershipDonutProps) {

    // Ensure valid data
    const chartData = useMemo(() => {
        return data.filter(d => d.percent > 0).map(d => ({
            ...d,
            fill: (COLORS as any)[d.type] || "#cbd5e1"
        }));
    }, [data]);

    return (
        <div className="w-full h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="percent"
                        stroke="none"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value) => {
                            // recharts ValueType is string|number|array — coerce defensively (typing tightened in newer recharts).
                            const n = Number(value);
                            return [Number.isFinite(n) && n !== 0 ? `${n.toFixed(1)}%` : '', 'Ownership'];
                        }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                        formatter={(value, entry: any) => <span className="text-slate-500 font-bold ml-1 text-xs">{value} ({entry.payload.percent.toFixed(1)}%)</span>}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="block text-3xl font-black text-slate-800 dark:text-white">
                    {chartData.find(d => d.type === "Institutions")?.percent.toFixed(0) || 0}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Institutional
                </span>
            </div>
        </div>
    );
}
