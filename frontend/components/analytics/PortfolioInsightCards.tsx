"use client";

import { motion } from "framer-motion";
import { Gauge, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

interface PortfolioHealthProps {
    score?: number;
    beta?: number;
    diversityScore?: number;
}

export function PortfolioHealth({ score = 85, beta = 1.12, diversityScore = 92 }: PortfolioHealthProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const data = [{ name: 'Score', value: score, fill: '#10B981' }]; // Emerald-500

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden group"
        >
            {/* Dynamic Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-500" />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        AI Health Audit
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Risk-Adjusted Rating</p>
                </div>
            </div>

            <div className="flex items-center justify-between">
                {/* Radial Chart */}
                <div className="w-32 h-32 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="80%"
                            outerRadius="100%"
                            barSize={10}
                            data={data}
                            startAngle={90}
                            endAngle={-270}
                        >
                            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                            <RadialBar
                                background
                                dataKey="value"
                                cornerRadius={30 / 2}
                                fill="#10B981"
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{score}</span>
                        <span className="text-[9px] font-black uppercase text-emerald-500">Excellent</span>
                    </div>
                </div>

                {/* Metrics */}
                <div className="space-y-4 flex-1 pl-6">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Portfolio Beta</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">{beta}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full w-[60%]" />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Diversification</span>
                            <span className="text-xs font-black text-slate-900 dark:text-white">{diversityScore}/100</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full w-[92%]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                            Your portfolio outperforms 85% of peers in this volatility range.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// -------------------------------------------------------------
// ANALYTICS WRAPPER
// -------------------------------------------------------------
import { Radar, RadarChart, PolarGrid, PolarRadiusAxis } from 'recharts';

export function RiskRadar() {
    const data = [
        { subject: 'Growth', A: 120, fullMark: 150 },
        { subject: 'Value', A: 98, fullMark: 150 },
        { subject: 'Income', A: 86, fullMark: 150 },
        { subject: 'Safety', A: 99, fullMark: 150 },
        { subject: 'Momentum', A: 85, fullMark: 150 },
        { subject: 'Quality', A: 65, fullMark: 150 },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="h-full bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden group"
        >
            {/* Gradient Accent */}
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-500" />

            <div className="flex justify-between items-start mb-2 relative z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-indigo-500" />
                        Factor Exposure
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Multi-Factor Analysis</p>
                </div>
            </div>

            <div className="h-[200px] w-full relative -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                        <Radar
                            name="Portfolio"
                            dataKey="A"
                            stroke="#6366F1"
                            strokeWidth={3}
                            fill="#6366F1"
                            fillOpacity={0.2}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
