"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, ArrowRight, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

interface UsageLimitModalProps {
    isOpen: boolean;
    onClose?: () => void;
    remainingQuestions?: number;
    isMobile?: boolean;
}

export default function UsageLimitModal({ isOpen, onClose, isMobile = false }: UsageLimitModalProps) {
    const router = useRouter();

    const benefits = [
        {
            icon: TrendingUp,
            text: "Fundamental Financial Insights",
            sub: "Earnings, valuation, and performance explained"
        },
        {
            icon: ShieldCheck,
            text: "Verified Market Data",
            sub: "Insights generated only from real market data — no assumptions"
        },
        {
            icon: Sparkles,
            text: "Context-Aware AI Analysis",
            sub: "Understands your questions and delivers clear financial insights"
        },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] transition-all duration-300"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-[32px] shadow-2xl shadow-teal-900/20 max-w-sm w-full overflow-hidden relative pointer-events-auto">

                            {/* Premium Decorative Background */}
                            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#13b8a6]/10 to-transparent" />
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#13b8a6]/20 rounded-full blur-[60px]" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#13b8a6] to-transparent opacity-50" />

                            <div className="relative p-6 px-8 flex flex-col items-center text-center">

                                {/* ENHANCED ANIMATED ICON */}
                                <motion.div
                                    animate={{
                                        y: [0, -6, 0],
                                        boxShadow: [
                                            "0 10px 30px -5px rgba(19, 184, 166, 0.3)",
                                            "0 20px 40px -5px rgba(19, 184, 166, 0.5)",
                                            "0 10px 30px -5px rgba(19, 184, 166, 0.3)"
                                        ]
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#13b8a6] to-[#0f8f82] flex items-center justify-center mb-6 ring-4 ring-[#13b8a6]/10 relative group"
                                >
                                    <div className="absolute inset-0 bg-white/10 rounded-3xl animate-pulse" />
                                    {/* Lock Icon with subtle wiggle on hover/loop */}
                                    <motion.div
                                        animate={{ rotate: [0, -5, 5, 0] }}
                                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                    >
                                        <Lock className="w-9 h-9 text-white drop-shadow-md" />
                                    </motion.div>

                                    {/* Decorative Sparkle */}
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm"
                                    >
                                        <Sparkles className="w-3 h-3 text-[#13b8a6]" />
                                    </motion.div>
                                </motion.div>

                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                    Limit Reached
                                </h2>

                                <p className="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed mb-8">
                                    You've used your <span className="font-bold text-slate-900 dark:text-white">5 free questions</span>.
                                    <br />
                                    Register now for <span className="text-[#13b8a6] font-bold">unlimited access</span>.
                                </p>

                                {/* Benefits List */}
                                <div className="w-full space-y-3 mb-8">
                                    {benefits.map((b, i) => (
                                        <div key={i} className="flex items-start gap-3.5 text-left p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
                                            <div className="w-8 h-8 rounded-full bg-[#13b8a6]/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <b.icon className="w-4 h-4 text-[#13b8a6]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight mb-1">
                                                    {b.text}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                                                    {b.sub}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Actions */}
                                <button
                                    onClick={() => router.push(isMobile ? "/mobile-ai-analyst/register" : "/register")}
                                    className="w-full py-3.5 bg-gradient-to-r from-[#13b8a6] to-[#0d9488] hover:from-[#2dd4bf] hover:to-[#14b8a6] text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-[#13b8a6]/25 transition-all active:scale-[0.98] group relative overflow-hidden mb-3"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        Register for Free
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                                </button>

                                <button
                                    onClick={() => router.push(isMobile ? "/mobile-ai-analyst/login" : "/login")}
                                    className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Already have an account? <span className="underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4">Log in</span>
                                </button>

                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
