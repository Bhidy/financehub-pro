"use client";

import { useState, useRef, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Flag, Share2, Check, X, AlertTriangle, Link as LinkIcon, Twitter, Linkedin, Facebook } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

interface MessageFeedbackProps {
    messageId?: string;
    contentToShare?: string; // Text to share
    language?: "en" | "ar";
}

export function MessageFeedback({ messageId, contentToShare = "", language = "en" }: MessageFeedbackProps) {
    const [feedbackState, setFeedbackState] = useState<"like" | "dislike" | null>(null);
    const [copied, setCopied] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState<string | null>(null);
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const shareRef = useRef<HTMLDivElement>(null);

    const isAr = language === "ar";
    const dir = isAr ? "rtl" : "ltr";

    const t = ({
        en: {
            share: "Share",
            copied: "Copied!",
            reportMistake: "Report Mistake",
            reportSubmitted: "Thanks for your feedback",
            reportTitle: "What's wrong with this response?",
            reasons: [
                "Inaccurate financial data",
                "Formatting or display issue",
                "Irrelevant or unhelpful",
                "Other"
            ],
            submit: "Submit Report",
            cancel: "Cancel",
            shareMenu: {
                title: "Share conversation",
                copyLink: "Copy Link",
                twitter: "X (Twitter)",
                linkedin: "LinkedIn",
                facebook: "Facebook",
                whatsapp: "WhatsApp",
                copied: "Link copied!"
            }
        },
        ar: {
            share: "مشاركة",
            copied: "تم النسخ!",
            reportMistake: "الإبلاغ عن خطأ",
            reportSubmitted: "شكراً لملاحظاتك",
            reportTitle: "ما الخطأ في هذه الإجابة؟",
            reasons: [
                "بيانات مالية غير دقيقة",
                "مشكلة في التنسيق أو العرض",
                "غير مفيدة أو غير ذات صلة",
                "أخرى"
            ],
            submit: "إرسال التقرير",
            cancel: "إلغاء",
            shareMenu: {
                title: "مشاركة المحادثة",
                copyLink: "نسخ الرابط",
                twitter: "X (تويتر)",
                linkedin: "لينكد إن",
                facebook: "فيسبوك",
                whatsapp: "واتساب",
                copied: "تم نسخ الرابط!"
            }
        }
    } as any)[language] || {
        share: "Share",
        copied: "Copied!",
        reportMistake: "Report Mistake",
        reportSubmitted: "Thanks for your feedback",
        reportTitle: "What's wrong with this response?",
        reasons: [
            "Inaccurate financial data",
            "Formatting or display issue",
            "Irrelevant or unhelpful",
            "Other"
        ],
        submit: "Submit Report",
        cancel: "Cancel",
        shareMenu: {
            title: "Share conversation",
            copyLink: "Copy Link",
            twitter: "X (Twitter)",
            linkedin: "LinkedIn",
            facebook: "Facebook",
            whatsapp: "WhatsApp",
            copied: "Link copied!"
        }
    };

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/shared/${messageId}` : '';
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(contentToShare ? contentToShare.substring(0, 100) + '...' : 'Check out this analysis from Starta Markets AI');

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
                setShowShareModal(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => {
                setCopied(false);
                setShowShareModal(false);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleSocialShare = (platform: string) => {
        let url = '';
        switch (platform) {
            case 'twitter':
                url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
                break;
            case 'linkedin':
                url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'whatsapp':
                url = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
                break;
        }
        if (url) {
            window.open(url, '_blank', 'width=600,height=400');
            setShowShareModal(false);
        }
    };

    const handleFeedback = (type: "like" | "dislike") => {
        setFeedbackState(prev => prev === type ? null : type);
        // TODO: Send exact feedback to API/backend
    };

    const handleReportSubmit = () => {
        if (!reportReason) return;
        setReportSubmitted(true);
        // TODO: Send report to API/backend
        setTimeout(() => {
            setShowReportModal(false);
            setReportSubmitted(false);
            setReportReason(null);
        }, 2500);
    };

    // We render small discrete action buttons
    return (
        <div className="flex flex-col mt-3 border-t border-slate-100 dark:border-white/5 pt-2" dir={dir}>
            <div className={clsx("flex items-center gap-1", isAr ? "flex-row-reverse" : "flex-row")}>

                {/* Like Button */}
                <button
                    onClick={() => handleFeedback("like")}
                    className={clsx(
                        "p-1.5 rounded-md flex items-center justify-center transition-colors",
                        feedbackState === "like"
                            ? "text-[#13b8a6] bg-[#13b8a6]/10"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                    )}
                    title="Helpful"
                >
                    <ThumbsUp className="w-4 h-4" />
                </button>

                {/* Dislike Button */}
                <button
                    onClick={() => handleFeedback("dislike")}
                    className={clsx(
                        "p-1.5 rounded-md flex items-center justify-center transition-colors",
                        feedbackState === "dislike"
                            ? "text-rose-500 bg-rose-500/10"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                    )}
                    title="Not helpful"
                >
                    <ThumbsDown className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />

                {/* Report Mistake */}
                <button
                    onClick={() => setShowReportModal(true)}
                    className="px-2 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-1.5 transition-colors"
                >
                    <Flag className="w-3.5 h-3.5" />
                    {t.reportMistake}
                </button>

                <div className="flex-1" />

                {/* Share Button & Popover Container */}
                <div className="relative" ref={shareRef}>
                    <button
                        onClick={() => setShowShareModal(!showShareModal)}
                        disabled={!messageId} // Need a session ID to share effectively
                        className={clsx(
                            "px-2 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
                            showShareModal
                                ? "bg-[#13b8a6]/10 text-[#13b8a6]"
                                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5",
                            !messageId && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <Share2 className="w-3.5 h-3.5" />
                        {t.share}
                    </button>

                    {/* Premium Share Menu (Yahoo Finance Style) */}
                    <AnimatePresence>
                        {showShareModal && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                transition={{ duration: 0.15 }}
                                className={clsx(
                                    "absolute top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 overflow-hidden z-50",
                                    isAr ? "right-0 origin-top-right" : "left-0 sm:left-auto sm:right-0 origin-top-left sm:origin-top-right"
                                )}
                            >
                                <div className="p-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">
                                        {t.shareMenu.title}
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className="w-full text-left px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors flex items-center justify-between"
                                        dir={dir}
                                    >
                                        <div className="flex items-center gap-2">
                                            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                                            {t.shareMenu.copyLink}
                                        </div>
                                        {copied && <Check className="w-3.5 h-3.5 text-[#13b8a6]" />}
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-white/5 my-1" />

                                    <button
                                        onClick={() => handleSocialShare('twitter')}
                                        className="w-full text-left px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2"
                                        dir={dir}
                                    >
                                        <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />
                                        {t.shareMenu.twitter}
                                    </button>
                                    <button
                                        onClick={() => handleSocialShare('linkedin')}
                                        className="w-full text-left px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2"
                                        dir={dir}
                                    >
                                        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                                        {t.shareMenu.linkedin}
                                    </button>
                                    <button
                                        onClick={() => handleSocialShare('facebook')}
                                        className="w-full text-left px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2"
                                        dir={dir}
                                    >
                                        <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                                        {t.shareMenu.facebook}
                                    </button>

                                    {/* Custom WhatsApp Icon using SVG since Lucide doesn't have it natively built-in easily accessible here */}
                                    <button
                                        onClick={() => handleSocialShare('whatsapp')}
                                        className="w-full text-left px-2 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-md transition-colors flex items-center gap-2"
                                        dir={dir}
                                    >
                                        <svg className="w-3.5 h-3.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                        </svg>
                                        {t.shareMenu.whatsapp}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Inline Report Options (Expandable) */}
            <AnimatePresence>
                {showReportModal && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/10 text-sm">
                            {reportSubmitted ? (
                                <div className="flex items-center justify-center gap-2 py-4 text-[#13b8a6] font-medium">
                                    <Check className="w-5 h-5" />
                                    {t.reportSubmitted}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <div className={clsx("flex items-center justify-between", isAr ? "flex-row-reverse" : "flex-row")}>
                                        <div className={clsx("flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-xs tracking-wider", !isAr && "uppercase", isAr ? "flex-row-reverse" : "flex-row")}>
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                            {t.reportTitle}
                                        </div>
                                        <button
                                            onClick={() => setShowReportModal(false)}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" dir={dir}>
                                        {t.reasons.map((r: string, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => setReportReason(r)}
                                                className={clsx(
                                                    "px-3 py-2 rounded-lg text-xs transition-colors border",
                                                    isAr ? "text-right" : "text-left",
                                                    reportReason === r
                                                        ? "bg-[#13b8a6]/10 border-[#13b8a6]/30 text-[#13b8a6] font-medium"
                                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:border-[#13b8a6]/30"
                                                )}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={clsx("flex gap-2 mt-1", isAr ? "justify-start flex-row-reverse" : "justify-end flex-row")}>
                                        <button
                                            onClick={() => setShowReportModal(false)}
                                            className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        >
                                            {t.cancel}
                                        </button>
                                        <button
                                            onClick={handleReportSubmit}
                                            disabled={!reportReason}
                                            className="px-4 py-1.5 text-xs font-bold text-white bg-[#13b8a6] rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                                        >
                                            {t.submit}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
