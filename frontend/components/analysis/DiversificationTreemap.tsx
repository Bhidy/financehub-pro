"use client";

import { useMemo } from "react";
import {
    Treemap,
    ResponsiveContainer,
    Tooltip,
} from "recharts";

interface DiversificationTreemapProps {
    data: { name: string; value: number }[]; // Name = Sector, Value = Weight
}

const COLORS = [
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#ec4899", // Pink
    "#06b6d4", // Cyan
    "#6366f1", // Indigo
];

// Custom Content for Treemap Node
const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, name, value, percent } = props;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: COLORS[index % COLORS.length] || "#000",
                    stroke: "#fff",
                    strokeWidth: 2,
                    strokeOpacity: 1,
                    fillOpacity: 0.8
                }}
                rx={8}
                ry={8}
            />
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                    dy={-6} // Offset to top
                >
                    {name}
                </text>
            )}
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={10}
                    dy={12} // Offset to bottom
                >
                    {value.toFixed(1)}%
                </text>
            )}
        </g>
    );
};

export function DiversificationTreemap({ data }: DiversificationTreemapProps) {
    if (!data || data.length === 0) return null;

    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}

                    dataKey="value"
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomizedContent />}
                >
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', background: '#0f172a', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: number | undefined) => [value ? `${value.toFixed(2)}%` : '', 'Weight']}
                    />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
}
