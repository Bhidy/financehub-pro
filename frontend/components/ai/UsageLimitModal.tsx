"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, CheckCircle, ArrowRight, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface UsageLimitModalProps {
    isOpen: boolean;
    onClose?: () => void;
    remainingQuestions?: number;
    isMobile?: boolean;
}

export default function UsageLimitModal({ isOpen, onClose, remainingQuestions = 0, isMobile = false }: UsageLimitModalProps) {
    const router = useRouter();

    const benefits = [
        "Advanced AI market analysis",
        "Instant answers on Egypt stocks",
        "Deep technical & fundamental insights",
        "Real-time market intelligence",
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
                        className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md z-50 transition-colors duration-300"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800/50 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 max-w-md w-full overflow-hidden relative transition-colors duration-300">
                            {/* Ambient Glow */}
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
                            <div className="absolute top-10 right-10 w-64 h-64 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

                            {/* Header */}
                            <div className="p-8 text-center relative">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="flex justify-center mb-6"
                                >
                                    <div className="w-24 h-24 relative flex items-center justify-center">
                                        <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl" />
                                        <img src="/app-icon.png" alt="Starta" className="w-24 h-24 object-contain relative z-10 drop-shadow-2xl" />
                                    </div>
                                </motion.div>

                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors">
                                    Unlock Full Access
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto transition-colors">
                                    You've reached your free question limit. Create a free account to keep asking Starta.
                                </p>
                            </div>

                            {/* Content */}
                            <div className="px-6 pb-8">
                                {/* Benefits */}
                                <div className="space-y-3 mb-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/50 transition-colors">
                                    {benefits.map((benefit, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.2 + (idx * 0.1) }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                                                <CheckCircle className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                                            </div>
                                            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors">{benefit}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* CTA Buttons */}
                                <div className="space-y-3">
                                    <button
                                        onClick={() => router.push(isMobile ? "/mobile-ai-analyst/register" : "/register")}
                                        className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 dark:shadow-teal-900/20 ring-1 ring-white/10 transition-all active:scale-[0.98] group relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <Sparkles className="w-5 h-5" />
                                        Register Free Now
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => router.push(isMobile ? "/mobile-ai-analyst/login" : "/login")}
                                        className="w-full py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl font-semibold transition-all active:scale-[0.98]"
                                    >
                                        Already have an account? Login
                                    </button>
                                </div>

                                {/* Footer note */}
                                <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-6 uppercase tracking-wider font-medium transition-colors">
                                    No credit card required
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )
            }
        </AnimatePresence >
    );
}
