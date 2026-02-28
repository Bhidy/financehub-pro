"use client";

import { useMemo } from "react";
import clsx from "clsx";

interface SparklineProps {
    data: number[];
    trend?: "up" | "down" | "neutral";
    width?: number;
    height?: number;
    className?: string;
}

export default function Sparkline({
    data,
    trend = "neutral",
    width = 80,
    height = 32,
    className
}: SparklineProps) {
    const points = useMemo(() => {
        if (!data || data.length === 0) return "";
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        return data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            return `${x},${y}`;
        }).join(" ");
    }, [data, width, height]);

    if (!data || data.length === 0) return null;

    const strokeColor = trend === "up"
        ? "stroke-emerald-500"
        : trend === "down"
            ? "stroke-red-500"
            : "stroke-slate-400 dark:stroke-slate-500";

    const gradientId = `sparkline-gradient-${trend}-${Math.random().toString(36).substr(2, 9)}`;
    const fillColor = trend === "up" ? "#10B981" : trend === "down" ? "#EF4444" : "#94A3B8";

    // Polygon points for the filled area underneath the line
    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
        <svg
            width={width}
            height={height}
            className={clsx("overflow-visible drop-shadow-sm", className)}
            viewBox={`0 -2 ${width} ${height + 4}`}
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={fillColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon
                points={areaPoints}
                fill={`url(#${gradientId})`}
                className="opacity-50"
            />
            <polyline
                points={points}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={strokeColor}
            />
        </svg>
    );
}
