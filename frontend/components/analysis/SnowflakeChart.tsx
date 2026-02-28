"use client";

import { useMemo } from "react";
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from "recharts";
import { AnalysisScore } from "@/lib/analysis-engine";
import { motion } from "framer-motion";

interface SnowflakeChartProps {
    score: AnalysisScore;
    comparisonScore?: AnalysisScore; // For Portfolio vs Market
    width?: number | string;
    height?: number | string;
    animate?: boolean;
}

export function SnowflakeChart({ score, comparisonScore, width = "100%", height = 350, animate = true }: SnowflakeChartProps) {

    const data = useMemo(() => [
        { subject: "Value", A: score.value, B: comparisonScore?.value || 0, fullMark: 6 },
        { subject: "Future", A: score.future, B: comparisonScore?.future || 0, fullMark: 6 },
        { subject: "Past", A: score.past, B: comparisonScore?.past || 0, fullMark: 6 },
        { subject: "Health", A: score.health, B: comparisonScore?.health || 0, fullMark: 6 },
        { subject: "Dividend", A: score.dividend, B: comparisonScore?.dividend || 0, fullMark: 6 },
    ], [score, comparisonScore]);

    // Dynamic Color based on Total Score (Green > Amber > Red)
    const mainColor = useMemo(() => {
        if (score.total > 18) return "#10B981"; // Emerald
        if (score.total > 10) return "#F59E0B"; // Amber
        return "#EF4444"; // Red
    }, [score.total]);

    return (
        <div className="relative flex items-center justify-center p-4">
            {/* Background Aurora Glow */}
            <div
                className="absolute inset-0 opacity-20 blur-3xl rounded-full"
                style={{ background: `radial-gradient(circle, ${mainColor} 0%, transparent 70%)` }}
            />

            <ResponsiveContainer width={width as any} height={height as any}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid gridType="polygon" stroke="rgba(148, 163, 184, 0.2)" />

                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    />

                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 6]}
                        tick={false}
                        axisLine={false}
                    />

                    {/* Comparison Layer (Portfolio/Market) */}
                    {comparisonScore && (
                        <Radar
                            name="Market/Portfolio"
                            dataKey="B"
                            stroke="#64748b"
                            strokeWidth={2}
                            fill="#64748b"
                            fillOpacity={0.1}
                        />
                    )}

                    {/* Main Layer (Stock) */}
                    <Radar
                        name="Analysis"
                        dataKey="A"
                        stroke={mainColor}
                        strokeWidth={3}
                        fill={mainColor}
                        fillOpacity={0.5}
                        isAnimationActive={animate}
                    />

                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(15, 23, 42, 0.9)', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        cursor={false}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
