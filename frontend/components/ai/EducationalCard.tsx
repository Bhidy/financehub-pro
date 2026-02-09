"use client";

import React, { useState } from "react";
import { BookOpen, Calculator, Lightbulb, AlertTriangle, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

// ============================================================================
// EducationalCard - Enterprise Component for Financial Term Education
// Matches HTML Mockup: Scenario 6 "What Does ROE Mean?"
// ============================================================================

export interface EducationalSection {
    type: "definition" | "formula" | "example" | "when_misleading" | "practical_application";
    title: string;
    content: string | string[];
}

export interface EducationalCardProps {
    data: {
        term: string;
        icon?: string;
        sections: EducationalSection[];
    };
    language?: "en" | "ar";
}

// Section styling configuration
const sectionConfig = {
    definition: {
        icon: BookOpen,
        bg: "bg-blue-50 dark:bg-blue-500/10",
        border: "border-blue-200 dark:border-blue-500/20",
        iconBg: "bg-blue-100 dark:bg-blue-500/20",
        iconColor: "text-blue-600 dark:text-blue-400",
        titleColor: "text-blue-800 dark:text-blue-300"
    },
    formula: {
        icon: Calculator,
        bg: "bg-purple-50 dark:bg-purple-500/10",
        border: "border-purple-200 dark:border-purple-500/20",
        iconBg: "bg-purple-100 dark:bg-purple-500/20",
        iconColor: "text-purple-600 dark:text-purple-400",
        titleColor: "text-purple-800 dark:text-purple-300"
    },
    example: {
        icon: Lightbulb,
        bg: "bg-emerald-50 dark:bg-emerald-500/10",
        border: "border-emerald-200 dark:border-emerald-500/20",
        iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        titleColor: "text-emerald-800 dark:text-emerald-300"
    },
    when_misleading: {
        icon: AlertTriangle,
        bg: "bg-amber-50 dark:bg-amber-500/10",
        border: "border-amber-200 dark:border-amber-500/20",
        iconBg: "bg-amber-100 dark:bg-amber-500/20",
        iconColor: "text-amber-600 dark:text-amber-400",
        titleColor: "text-amber-800 dark:text-amber-300"
    },
    practical_application: {
        icon: Wrench,
        bg: "bg-teal-50 dark:bg-teal-500/10",
        border: "border-teal-200 dark:border-teal-500/20",
        iconBg: "bg-teal-100 dark:bg-teal-500/20",
        iconColor: "text-teal-600 dark:text-teal-400",
        titleColor: "text-teal-800 dark:text-teal-300"
    }
};

function SectionContent({ section, isRtl }: { section: EducationalSection; isRtl: boolean }) {
    const config = sectionConfig[section.type] || sectionConfig.definition;
    const Icon = config.icon;

    const renderContent = () => {
        if (Array.isArray(section.content)) {
            return (
                    <ul className="space-y-2 mt-2">
                        {section.content.map((item, idx) => (
                            <li key={idx} className={clsx("flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300", isRtl ? "text-right" : "text-left")}>
                                <span className={clsx("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", config.iconColor.replace("text-", "bg-"))} />
                                <span>{item}</span>
                            </li>
                    ))}
                </ul>
            );
        }

        // Formula display with code styling
        if (section.type === "formula") {
            return (
                <div className="mt-3 p-4 bg-slate-900 dark:bg-black/40 rounded-xl font-mono text-sm text-white overflow-x-auto">
                    <code>{section.content}</code>
                </div>
            );
        }

        return (
            <p className={clsx("mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed", isRtl ? "text-right" : "text-left")}>
                {section.content}
            </p>
        );
    };

    return (
        <div className={clsx(
            "p-4 rounded-xl border transition-all duration-300",
            config.bg,
            config.border
        )}>
            <div className="flex items-center gap-2">
                <div className={clsx("p-1.5 rounded-lg", config.iconBg)}>
                    <Icon size={14} className={clsx("stroke-[2.5]", config.iconColor)} />
                </div>
                <h4 className={clsx("font-bold text-sm uppercase tracking-wider", config.titleColor)}>
                    {section.title}
                </h4>
            </div>
            {renderContent()}
        </div>
    );
}

export function EducationalCard({ data, language = "en" }: EducationalCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const isRtl = language === "ar";
    const ui = language === "ar"
        ? {
            financialTerm: "مصطلح مالي",
            showLess: "عرض أقل",
            showMore: "عرض المزيد",
            moreSections: "أقسام إضافية",
            educationalContent: "محتوى تعليمي • لأغراض التعلم",
        }
        : {
            financialTerm: "Financial Term",
            showLess: "Show Less",
            showMore: "Show More",
            moreSections: "more sections",
            educationalContent: "Educational Content • For Learning Purposes",
        };

    // Show first 2 sections by default, rest collapsed
    const visibleSections = isExpanded ? data.sections : data.sections.slice(0, 2);
    const hasMoreSections = data.sections.length > 2;

    return (
        <div className="bg-white dark:bg-[#1A1F2E] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden my-4 transition-all duration-300" dir={isRtl ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                        <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="text-white/60 text-xs font-bold uppercase tracking-widest">
                            {ui.financialTerm}
                        </div>
                        <h3 className="text-white font-bold text-2xl tracking-tight mt-0.5">
                            {data.icon && <span className={isRtl ? "ml-2" : "mr-2"}>{data.icon}</span>}
                            {data.term}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Sections */}
            <div className="p-6 space-y-4">
                {visibleSections.map((section, idx) => (
                    <SectionContent key={idx} section={section} isRtl={isRtl} />
                ))}
            </div>

            {/* Expand/Collapse Button */}
            {hasMoreSections && (
                <div className="px-6 pb-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 transition-colors"
                    >
                        {isExpanded ? (
                            <>
                                <ChevronUp size={16} />
                                <span>{ui.showLess}</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown size={16} />
                                <span>{ui.showMore} ({data.sections.length - 2} {ui.moreSections})</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <BookOpen size={12} />
                    <span>{ui.educationalContent}</span>
                </div>
            </div>
        </div>
    );
}

export default EducationalCard;
