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
    ReferenceLine,
    Label
} from "recharts";
import { Ticker } from "@/lib/api";

interface PeersScatterProps {
    currentStock: { symbol: string; pe: number; growth: number; marketCap: number; };
    peers: { symbol: string; pe: number; growth: number; marketCap: number; }[];
}

export function PeersScatter({ currentStock, peers }: PeersScatterProps) {

    const data = useMemo(() => {
        return [
            ...peers.map(p => ({ ...p, isCurrent: false, fill: "#94a3b8" })),
            { ...currentStock, isCurrent: true, fill: "#3b82f6" } // Blue for current
        ];
    }, [peers, currentStock]);

    const domainX = [0, Math.max(...data.map(d => d.pe)) * 1.1];
    const domainY = [Math.min(...data.map(d => d.growth)) * 1.1, Math.max(...data.map(d => d.growth)) * 1.1];

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                        type="number"
                        dataKey="pe"
                        name="PE Ratio"
                        unit="x"
                        domain={domainX}
                        stroke="#94a3b8"
                        fontSize={12}
                    >
                        <Label value="PE Ratio (Valuation)" offset={-10} position="insideBottom" fill="#94a3b8" fontSize={12} />
                    </XAxis>
                    <YAxis
                        type="number"
                        dataKey="growth"
                        name="Earnings Growth"
                        unit="%"
                        domain={domainY}
                        stroke="#94a3b8"
                        fontSize={12}
                    >
                        <Label value="Earnings Growth %" angle={-90} position="insideLeft" fill="#94a3b8" fontSize={12} />
                    </YAxis>
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-white/10">
                                        <p className="font-bold text-lg mb-1">{d.symbol}</p>
                                        <p className="text-sm text-slate-400">PE: <span className="text-white font-mono">{d.pe.toFixed(1)}x</span></p>
                                        <p className="text-sm text-slate-400">Growth: <span className={d.growth > 0 ? "text-emerald-400" : "text-rose-400"}>{d.growth.toFixed(1)}%</span></p>
                                        <p className="text-xs text-slate-500 mt-1">Cap: ${(d.marketCap / 1e9).toFixed(1)}B</p>
                                        {d.isCurrent && <span className="inline-block mt-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] rounded">CURRENT</span>}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Scatter
                        name="Peers"
                        data={data}
                        shape="circle"
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.isCurrent ? "#3b82f6" : "#64748b"}
                                fillOpacity={entry.isCurrent ? 1 : 0.6}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
