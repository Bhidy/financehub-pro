import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

interface InsightCardProps {
    data: {
        title?: string;
        points: string[];
        variant?: 'bull' | 'bear';
    };
    variant_override?: 'bull' | 'bear';
}

export function InsightCard({ data, variant_override }: InsightCardProps) {
    // Determine variant from data or override
    const variant = variant_override || data.variant || 'bull';
    const isBull = variant === 'bull';

    // Styling constants (Strict Adherence to Mockup)
    const containerClasses = isBull
        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20"
        : "bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20";

    const titleColor = isBull
        ? "text-emerald-800 dark:text-emerald-200"
        : "text-red-800 dark:text-red-200";

    const iconBg = isBull
        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400";

    const bulletColor = isBull
        ? "bg-emerald-500"
        : "bg-red-500";

    const Icon = isBull ? TrendingUp : AlertTriangle;
    const defaultTitle = isBull ? "Bull Case Analysis" : "Bear Case Risks";

    return (
        <div className={clsx(
            "p-5 rounded-2xl border shadow-sm mb-4 transition-all hover:shadow-md",
            containerClasses
        )}>
            <div className="flex items-center gap-3 mb-4">
                <div className={clsx("p-2 rounded-xl", iconBg)}>
                    <Icon size={18} className="stroke-[2.5]" />
                </div>
                <h4 className={clsx("font-bold text-sm uppercase tracking-wider", titleColor)}>
                    {data.title || defaultTitle}
                </h4>
            </div>

            <ul className="space-y-3">
                {data.points.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className={clsx("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", bulletColor)} />
                        <span>{point}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
