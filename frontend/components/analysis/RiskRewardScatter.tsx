"use client";

import { useMemo } from "react";
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Label,
    ReferenceLine
} from "recharts";

interface HoldingData {
    symbol: string;
    beta: number; // Risk
    returnPotential: number; // Estimated Annual Return %
    weight: number;
}

interface RiskRewardScatterProps {
    holdings: HoldingData[];
}

export function RiskRewardScatter({ holdings }: RiskRewardScatterProps) {

    const data = useMemo(() => holdings.map(h => ({
        x: h.beta,
        y: h.returnPotential,
        z: h.weight, // Bubble Size
        name: h.symbol
    })), [holdings]);

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

                    <XAxis
                        type="number"
                        dataKey="x"
                        name="Risk (Beta)"
                        stroke="#94a3b8"
                        label={{ value: "Risk (Beta)", position: "insideBottom", offset: -10, fill: "#94a3b8" }}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        name="Return (%)"
                        stroke="#94a3b8"
                        label={{ value: "Forecast Return (%)", angle: -90, position: "insideLeft", fill: "#94a3b8" }}
                    />

                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-white/10">
                                        <p className="font-bold text-lg mb-1">{d.name}</p>
                                        <p className="text-sm text-slate-400">Beta: <span className="text-white font-mono">{d.x.toFixed(2)}</span></p>
                                        <p className="text-sm text-slate-400">Return: <span className="text-emerald-400">+{d.y.toFixed(1)}%</span></p>
                                        <p className="text-xs text-slate-500 mt-1">Weight: {d.z.toFixed(1)}%</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Efficient Frontier Mock Line */}
                    <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 2, y: 20 }]} stroke="#64748b" strokeDasharray="3 3" />

                    <Scatter name="Holdings" data={data} fill="#8b5cf6">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.x > 1.5 ? "#ef4444" : entry.y > 15 ? "#10b981" : "#3b82f6"} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
