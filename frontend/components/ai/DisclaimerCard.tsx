"use client";

import React from "react";
import { AlertTriangle, Info, Shield } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// DisclaimerCard - Enterprise Component for Regulatory Compliance
// Matches HTML Mockup: Disclaimer styling with orange border
// ============================================================================

export interface DisclaimerCardProps {
    data: {
        icon?: string;
        title?: string;
        text: string;
        variant?: "warning" | "info" | "regulatory";
    };
    language?: "en" | "ar";
}

const variantConfig = {
    warning: {
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-l-4 border-amber-500",
        iconBg: "bg-amber-100 dark:bg-amber-500/20",
        iconColor: "text-amber-600 dark:text-amber-400",
        titleColor: "text-amber-800 dark:text-amber-300",
        textColor: "text-amber-700 dark:text-amber-300/90",
        Icon: AlertTriangle
    },
    info: {
        bg: "bg-blue-50 dark:bg-blue-500/10",
        border: "border-l-4 border-blue-500",
        iconBg: "bg-blue-100 dark:bg-blue-500/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        titleColor: "text-blue-800 dark:text-blue-300",
        textColor: "text-blue-700 dark:text-blue-300/90",
        Icon: Info
    },
    regulatory: {
        bg: "bg-slate-50 dark:bg-slate-800/50",
        border: "border-l-4 border-slate-400",
        iconBg: "bg-slate-200 dark:bg-slate-700",
        iconColor: "text-slate-600 dark:text-slate-400",
        titleColor: "text-slate-800 dark:text-slate-200",
        textColor: "text-slate-600 dark:text-slate-400",
        Icon: Shield
    }
};

export function DisclaimerCard({ data, language = "en" }: DisclaimerCardProps) {
    const variant = data.variant || "warning";
    const config = variantConfig[variant];
    const IconComponent = config.Icon;
    const isRtl = language === "ar";
    const defaultTitle = language === "ar" ? "تنبيه" : "Notice";

    return (
        <div className={clsx(
            "p-4 rounded-xl my-4 transition-all duration-300",
            config.bg,
            config.border,
            isRtl ? "border-r-4 border-l-0" : ""
        )} dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={clsx(
                    "p-2 rounded-lg shrink-0",
                    config.iconBg
                )}>
                    {data.icon ? (
                        <span className="text-lg">{data.icon}</span>
                    ) : (
                        <IconComponent size={16} className={clsx("stroke-[2.5]", config.iconColor)} />
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {(data.title || defaultTitle) && (
                        <h5 className={clsx(
                            "font-bold text-sm mb-1",
                            config.titleColor
                        )}>
                            {data.title || defaultTitle}
                        </h5>
                    )}
                    <p className={clsx(
                        "text-sm leading-relaxed",
                        config.textColor
                    )}>
                        {data.text}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default DisclaimerCard;
