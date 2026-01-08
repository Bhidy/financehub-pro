import React from "react";
import { Loader2 } from "lucide-react";
import { ResponsiveContainer, Area, AreaChart } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { fetchFundNav } from "@/lib/api";

const safeNumber = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isFinite(num) ? num : null;
};

export default function MiniNavChart({ fundId, ytdReturn }: { fundId: string; ytdReturn?: number | string | null }) {
    const { data: navHistory, isLoading } = useQuery({
        queryKey: ["fund-nav-mini", fundId],
        queryFn: async () => {
            const data = await fetchFundNav(fundId, 30);
            return Array.isArray(data) ? data.reverse() : [];
        },
        staleTime: 5 * 60 * 1000,
    });

    // Generate simulated sparkline data based on YTD return when no NAV history
    const generateSparkline = (ytd: number) => {
        const points = 15;
        const trend = ytd > 0 ? 1 : -1;
        const volatility = Math.abs(ytd) / 100;
        let value = 100;
        return Array.from({ length: points }, (_, i) => {
            value += (trend * (Math.random() * 2 + 0.5) + (Math.random() - 0.5) * volatility * 10);
            return { nav: value, idx: i };
        });
    };

    if (isLoading) {
        return (
            <div className="h-[60px] flex items-center justify-center text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin" />
            </div>
        );
    }

    // Use real data or generate simulated sparkline
    const hasRealData = navHistory && navHistory.length >= 2;
    const ytdNum = safeNumber(ytdReturn) || 0;
    const chartData = hasRealData ? navHistory : generateSparkline(ytdNum);

    const firstVal = hasRealData ? (safeNumber(navHistory[0]?.nav) || 0) : 100;
    const lastVal = hasRealData ? (safeNumber(navHistory[navHistory.length - 1]?.nav) || 0) : chartData[chartData.length - 1].nav;
    const isPositive = ytdNum >= 0 || lastVal >= firstVal;

    return (
        <div className="h-[60px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id={`gradient-${fundId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="nav"
                        stroke={isPositive ? "#10b981" : "#ef4444"}
                        strokeWidth={2}
                        fill={`url(#gradient-${fundId})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
