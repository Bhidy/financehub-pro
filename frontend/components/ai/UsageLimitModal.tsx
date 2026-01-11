"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, CheckCircle, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface UsageLimitModalProps {
    isOpen: boolean;
    onClose?: () => void;
    remainingQuestions?: number;
    isMobile?: boolean;
}

export function UsageLimitModal({ isOpen, onClose, remainingQuestions = 0, isMobile = false }: UsageLimitModalProps) {
    const router = useRouter();

    const benefits = [
        "Unlimited AI questions & analysis",
        "Full access to all market data",
        "Personalized watchlists & alerts",
        "Priority support & updates",
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
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/20 max-w-md w-full overflow-hidden">
                            {/* Header with gradient */}
                            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 p-8 text-center relative overflow-hidden">
                                {/* Decorative circles */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <Lock className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        You've Used Your Free Questions!
                                    </h2>
                                    <p className="text-blue-100 text-sm">
                                        Register now for unlimited access to Finny AI
                                    </p>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {/* Benefits */}
                                <div className="space-y-3 mb-6">
                                    <p className="text-sm font-semibold text-slate-700 mb-3">
                                        What you'll get with a free account:
                                    </p>
                                    {benefits.map((benefit, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * idx }}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <span className="text-slate-700 text-sm">{benefit}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* CTA Buttons */}
                                <div className="space-y-3">
                                    <button
                                        onClick={() => router.push(isMobile ? "/mobile-ai-analyst/register" : "/register")}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-blue-500/20 transition-all active:scale-[0.98] group"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Register Free Now
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>

                                    <button
                                        onClick={() => router.push(isMobile ? "/mobile-ai-analyst/login" : "/login")}
                                        className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all active:scale-[0.98]"
                                    >
                                        Already have an account? Login
                                    </button>
                                </div>

                                {/* Footer note */}
                                <p className="text-center text-xs text-slate-400 mt-4">
                                    Free forever • No credit card required
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
