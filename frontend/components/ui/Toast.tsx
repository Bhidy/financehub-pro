"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useEffect } from "react";
import clsx from "clsx";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string;
    type?: ToastType;
    isVisible: boolean;
    onClose: () => void;
}

export function Toast({ message, type = "info", isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-[#10B981]" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const styles = {
        success: "border-[#10B981]/20 bg-[#10B981]/10 text-[#10B981]",
        error: "border-red-500/20 bg-red-500/10 text-red-500",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-500",
        info: "border-blue-500/20 bg-blue-500/10 text-blue-500"
    };

    const borderClass = styles[type].split(" ").find(c => c.startsWith("border")) || "border-slate-200";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-[90vw]"
                >
                    <div className={clsx(
                        "flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border",
                        "bg-white/95 dark:bg-[#0F172A]/95",
                        borderClass
                    )}>
                        <div className={clsx("p-2 rounded-full", styles[type])}>
                            {icons[type]}
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight capitalize">
                                {type}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {message}
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
