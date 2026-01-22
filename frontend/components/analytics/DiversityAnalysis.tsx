
import { motion } from "framer-motion";
import { PieChart as PieIcon, Layers } from "lucide-react";
import { ResponsiveContainer, PieChart as RePieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { useTheme } from "@/contexts/ThemeContext";

interface DiversityProps {
    data: { name: string; value: number; percent: number }[];
    type: 'Sector' | 'Asset Class';
}

const COLORS_SECTOR = [
    '#14B8A6', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'
];

const COLORS_ASSET = [
    '#3B82F6', // Stocks - Blue
    '#10B981', // Cash - Emerald
    '#F59E0B', // Funds - Amber
    '#8B5CF6', // Crypto - Violet
];

export function DiversityCard({ data, type }: DiversityProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const colors = type === 'Sector' ? COLORS_SECTOR : COLORS_ASSET;

    // Calculate dominant
    const dominant = [...data].sort((a, b) => b.value - a.value)[0];
    const isConcentrationRisk = dominant && dominant.percent > 40;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#151925] border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 shadow-2xl shadow-slate-900/5 dark:shadow-black/60 relative overflow-hidden group h-full flex flex-col"
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        {type === 'Sector' ? <PieIcon className="w-5 h-5 text-teal-500" /> : <Layers className="w-5 h-5 text-blue-500" />}
                        {type} Mix
                    </h3>
                    <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-1">Diversity Analysis</p>
                </div>
            </div>

            <div className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                color: isDark ? '#FFF' : '#000',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}
                            itemStyle={{ color: isDark ? '#FFF' : '#000' }}
                        />
                    </RePieChart>
                </ResponsiveContainer>

                {/* Center Content */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        {dominant && (
                            <>
                                <span className={clsx("block text-2xl font-black leading-none", isConcentrationRisk ? "text-rose-500" : "text-slate-900 dark:text-white")}>
                                    {dominant.percent.toFixed(0)}%
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase max-w-[60px] block mx-auto truncate mt-1">
                                    {dominant.name}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Warning if High Concentration */}
            {isConcentrationRisk && (
                <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">High Concentration Risk</span>
                </div>
            )}
        </motion.div>
    );
}

// Helper to clsx since not imported
import clsx from "clsx";
