"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
    Activity, BarChart3, MessageSquare, Users, TrendingUp, TrendingDown,
    AlertTriangle, Clock, Globe, Inbox, ChevronRight, Download, RefreshCw,
    CheckCircle, XCircle, HelpCircle, Zap, Filter, Info, ArrowUpRight, ArrowDownRight,
    Search, LayoutDashboard, Flag, UserCheck, Sparkles, ThumbsUp, ThumbsDown, Eye, X
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface HealthKPIs {
    total_chats: number;
    trend_chats: number;
    total_messages: number;
    trend_messages: number;
    unique_users: number;
    trend_users: number;
    guest_sessions: number;
    success_rate: number;
    trend_success: number;
    failure_rate: number;
    trend_failure: number;
    out_of_scope_count: number;
    avg_messages_per_session: number;
    period: string;
}

interface TopQuestion {
    normalized_text: string;
    count: number;
    percentage: number;
    top_intent: string;
    success_rate: number;
}

interface UnresolvedQuery {
    id: number;
    raw_text: string;
    language: string;
    detected_intent: string;
    confidence: number;
    failure_reason: string;
    admin_status: string;
    created_at: string;
}

interface IntentPerformance {
    intent: string;
    volume: number;
    success_rate: number;
    avg_confidence: number;
    avg_latency_ms: number;
    failure_rate: number;
}

interface ResolverStats {
    method: string;
    count: number;
    percentage: number;
}

interface SessionFunnel {
    step: string;
    count: number;
    percentage: number;
}

interface PerformanceMetrics {
    avg_latency_ms: number;
    p95_latency_ms: number;
    error_rate: number;
    timeout_count: number;
}

interface LanguageStats {
    language: string;
    count: number;
    percentage: number;
    failure_rate: number;
}

interface DemandInsight {
    query_text: string;
    volume: number;
    growth_rate: number;
    intent: string;
    is_new: boolean;
}

interface ProductHealthSummary {
    status: string;
    improvements: string[];
    degradations: string[];
    top_issues: string[];
    decision_needed: boolean;
}

interface ChatFeedbackReport {
    id: number;
    session_id: string;
    user_id: string;
    message_id: string;
    feedback_type: string;
    report_text: string | null;
    created_at: string;
    raw_query: string | null;
}

interface GeoEntry {
    country_code: string;
    country_name: string;
    users: number;
    messages: number;
    percentage: number;
}

interface NewsletterFunnelStep {
    lesson: number;
    count: number;
    percentage: number;
}

type NewsletterEmailTypeKey = "weekly_pulse" | "monthly_dive" | "academy" | "flash_alerts";

interface NewsletterEmailTypeAnalytics {
    key: NewsletterEmailTypeKey;
    label: string;
    subscriber_count: number;
    sent_total: number;
    last_sent: string | null;
    last_dispatch_sent_count: number;
    last_dispatch_error_count: number;
    preview_available: boolean;
}

interface NewsletterPreviewRecipient {
    email: string;
    full_name: string | null;
    template_variant: string | null;
    lesson_number: number | null;
    sent_at: string;
}

interface NewsletterLatestPreview {
    email_type: NewsletterEmailTypeKey;
    label: string;
    total_sent: number;
    last_dispatch_at: string | null;
    last_dispatch_sent_count: number;
    last_dispatch_error_count: number;
    preview_available: boolean;
    subject: string | null;
    html: string | null;
    template_variant: string | null;
    lesson_number: number | null;
    recipient_email: string | null;
    recipient_name: string | null;
    recipients: NewsletterPreviewRecipient[];
}

interface NewsletterAnalytics {
    total_subscribers: number;
    active_subscribers: number;
    unsubscribed_count: number;
    retention_rate: number;
    weekly_pulse_count: number;
    monthly_dive_count: number;
    academy_count: number;
    flash_alerts_count: number;
    academy_funnel: NewsletterFunnelStep[];
    last_weekly_sent: string | null;
    last_monthly_sent: string | null;
    last_academy_sent: string | null;
    last_flash_sent: string | null;
    is_scheduler_running: boolean;
    email_types: NewsletterEmailTypeAnalytics[];
}

const NEWSLETTER_TYPE_META: Record<NewsletterEmailTypeKey, { color: string; accent: string; shortLabel: string }> = {
    weekly_pulse: { color: "bg-[#6366F1]", accent: "text-[#6366F1]", shortLabel: "Weekly" },
    monthly_dive: { color: "bg-[#0EA5E9]", accent: "text-[#0EA5E9]", shortLabel: "Monthly" },
    academy: { color: "bg-starta-teal", accent: "text-starta-teal", shortLabel: "Academy" },
    flash_alerts: { color: "bg-[#F97316]", accent: "text-[#F97316]", shortLabel: "Flash" },
};

// ============================================================
// TOOLTIP COMPONENT
// ============================================================

type TooltipSide = "top" | "right";
type TooltipPlacement = "top" | "right" | "bottom" | "left";

function Tooltip({ content, children, side = "top" }: { content: string; children: React.ReactNode; side?: TooltipSide }) {
    const triggerRef = useRef<HTMLSpanElement | null>(null);
    const bubbleRef = useRef<HTMLDivElement | null>(null);
    const tooltipId = useId();
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number; placement: TooltipPlacement }>({
        x: 0,
        y: 0,
        placement: side === "right" ? "right" : "top",
    });

    useEffect(() => {
        if (!isOpen) return;

        const gap = 12;
        const viewportPadding = 12;
        const placementOrder: TooltipPlacement[] = side === "right"
            ? ["right", "top", "bottom", "left"]
            : ["top", "right", "left", "bottom"];

        const computePosition = () => {
            const trigger = triggerRef.current;
            const bubble = bubbleRef.current;
            if (!trigger || !bubble) return;

            const triggerRect = trigger.getBoundingClientRect();
            const bubbleRect = bubble.getBoundingClientRect();

            const candidate = (placement: TooltipPlacement) => {
                if (placement === "top") {
                    return {
                        x: triggerRect.left + (triggerRect.width - bubbleRect.width) / 2,
                        y: triggerRect.top - bubbleRect.height - gap,
                    };
                }
                if (placement === "bottom") {
                    return {
                        x: triggerRect.left + (triggerRect.width - bubbleRect.width) / 2,
                        y: triggerRect.bottom + gap,
                    };
                }
                if (placement === "left") {
                    return {
                        x: triggerRect.left - bubbleRect.width - gap,
                        y: triggerRect.top + (triggerRect.height - bubbleRect.height) / 2,
                    };
                }
                return {
                    x: triggerRect.right + gap,
                    y: triggerRect.top + (triggerRect.height - bubbleRect.height) / 2,
                };
            };

            const fits = (x: number, y: number) =>
                x >= viewportPadding &&
                y >= viewportPadding &&
                x + bubbleRect.width <= window.innerWidth - viewportPadding &&
                y + bubbleRect.height <= window.innerHeight - viewportPadding;

            let selectedPlacement: TooltipPlacement = placementOrder[0];
            let selectedPosition = candidate(selectedPlacement);

            for (const placement of placementOrder) {
                const nextPosition = candidate(placement);
                if (fits(nextPosition.x, nextPosition.y)) {
                    selectedPlacement = placement;
                    selectedPosition = nextPosition;
                    break;
                }
            }

            const clampedX = Math.min(
                Math.max(selectedPosition.x, viewportPadding),
                Math.max(viewportPadding, window.innerWidth - bubbleRect.width - viewportPadding),
            );
            const clampedY = Math.min(
                Math.max(selectedPosition.y, viewportPadding),
                Math.max(viewportPadding, window.innerHeight - bubbleRect.height - viewportPadding),
            );

            setPosition({
                x: clampedX,
                y: clampedY,
                placement: selectedPlacement,
            });
        };

        computePosition();
        window.addEventListener("resize", computePosition);
        window.addEventListener("scroll", computePosition, true);

        return () => {
            window.removeEventListener("resize", computePosition);
            window.removeEventListener("scroll", computePosition, true);
        };
    }, [content, isOpen, side]);

    const arrowClass = position.placement === "top"
        ? "left-1/2 top-full -translate-x-1/2 -translate-y-1/2 border-l-0 border-t-0"
        : position.placement === "bottom"
            ? "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 border-r-0 border-b-0"
            : position.placement === "left"
                ? "left-full top-1/2 -translate-x-1/2 -translate-y-1/2 border-b-0 border-l-0"
                : "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-t-0 border-r-0";

    return (
        <>
            <span
                ref={triggerRef}
                className="inline-flex items-center"
                aria-describedby={isOpen ? tooltipId : undefined}
                onMouseEnter={() => setIsOpen(true)}
                onMouseLeave={() => setIsOpen(false)}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setIsOpen(false)}
            >
                {children}
            </span>
            {isOpen && typeof document !== "undefined" && createPortal(
                <div
                    ref={bubbleRef}
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-none fixed z-[120] max-w-[280px] rounded-xl border border-border/80 bg-surface px-3.5 py-2.5 text-[11px] font-semibold leading-relaxed text-main shadow-[0_24px_70px_rgba(2,6,23,0.55)] backdrop-blur-md"
                    style={{ left: position.x, top: position.y }}
                >
                    <span
                        className={`absolute h-2.5 w-2.5 rotate-45 border border-border/80 bg-surface ${arrowClass}`}
                        aria-hidden="true"
                    />
                    {content}
                </div>,
                document.body
            )}
        </>
    );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function ChatbotAnalyticsPage() {
    const { user, isAuthenticated, getToken } = useAuth();

    // Filters
    const [period, setPeriod] = useState("30d");
    const [userType, setUserType] = useState("all");
    const [language, setLanguage] = useState("all");
    const [demandTab, setDemandTab] = useState<'demand' | 'questions'>('demand');

    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Data states
    const [healthKPIs, setHealthKPIs] = useState<HealthKPIs | null>(null);
    const [topQuestions, setTopQuestions] = useState<TopQuestion[]>([]);
    const [unresolvedQueries, setUnresolvedQueries] = useState<UnresolvedQuery[]>([]);
    const [intentPerformance, setIntentPerformance] = useState<IntentPerformance[]>([]);
    const [resolverStats, setResolverStats] = useState<ResolverStats[]>([]);
    const [sessionFunnel, setSessionFunnel] = useState<SessionFunnel[]>([]);
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
    const [languageStats, setLanguageStats] = useState<LanguageStats[]>([]);
    const [demandInsights, setDemandInsights] = useState<DemandInsight[]>([]);
    const [healthSummary, setHealthSummary] = useState<ProductHealthSummary | null>(null);
    const [feedbackReports, setFeedbackReports] = useState<ChatFeedbackReport[]>([]);
    const [geoDistribution, setGeoDistribution] = useState<GeoEntry[]>([]);
    const [newsletterStats, setNewsletterStats] = useState<NewsletterAnalytics | null>(null);
    const [selectedNewsletterType, setSelectedNewsletterType] = useState<NewsletterEmailTypeKey | null>(null);
    const [newsletterPreview, setNewsletterPreview] = useState<NewsletterLatestPreview | null>(null);
    const [newsletterPreviewLoading, setNewsletterPreviewLoading] = useState(false);
    const [newsletterPreviewError, setNewsletterPreviewError] = useState<string | null>(null);
    const [isNewsletterSectionOpen, setIsNewsletterSectionOpen] = useState(false);
    const [dataError, setDataError] = useState<string | null>(null);

    // No admin check here: app/admin/layout.tsx wraps every page under /admin in
    // AdminGate, which is the single authorization boundary. This page's own
    // copy used to router.push('/login') with no ?redirect=, which is how a
    // signed-in non-admin ended up staring at a login form.

    const getAdminRequestHeaders = () => {
        const token =
            getToken() ||
            (typeof window !== "undefined"
                ? localStorage.getItem("fh_auth_token") || localStorage.getItem("financehub_access_token")
                : null);

        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    const fetchAdminAnalytics = async <T,>(path: string): Promise<T> => {
        const response = await fetch(`/api/proxy/admin/analytics/${path}`, {
            headers: getAdminRequestHeaders(),
            cache: "no-store",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
            const detail =
                payload && typeof payload === "object" && "detail" in payload
                    ? String(payload.detail)
                    : payload && typeof payload === "object" && "error" in payload
                        ? String(payload.error)
                        : `Failed to load ${path}`;
            throw new Error(detail);
        }

        return payload as T;
    };

    // Fetch all data
    const fetchData = async () => {
        setIsLoading(true);
        setDataError(null);
        try {
            const ts = Date.now();
            const qs = `period=${period}&user_type=${userType}&language=${language}&t=${ts}`;

            const [
                health,
                questions,
                unresolved,
                intents,
                resolver,
                funnel,
                perf,
                lang,
                demand,
                summary,
                feedback,
                geo,
                newsletter,
            ] = await Promise.allSettled([
                fetchAdminAnalytics<HealthKPIs>(`health?${qs}`),
                fetchAdminAnalytics<TopQuestion[]>(`questions?${qs}&limit=20`),
                fetchAdminAnalytics<UnresolvedQuery[]>(`unresolved?${qs}&status=pending&limit=50`),
                fetchAdminAnalytics<IntentPerformance[]>(`intents?${qs}`),
                fetchAdminAnalytics<ResolverStats[]>(`resolver?${qs}`),
                fetchAdminAnalytics<SessionFunnel[]>(`sessions/funnel?${qs}`),
                fetchAdminAnalytics<PerformanceMetrics>(`performance?${qs}`),
                fetchAdminAnalytics<LanguageStats[]>(`language?${qs}`),
                fetchAdminAnalytics<DemandInsight[]>(`demand/trending?${qs}&limit=10`),
                fetchAdminAnalytics<ProductHealthSummary>(`health/summary?period=${period}`),
                fetchAdminAnalytics<ChatFeedbackReport[]>(`feedback?limit=50`),
                fetchAdminAnalytics<GeoEntry[]>(`geo?period=${period}`),
                fetchAdminAnalytics<NewsletterAnalytics>(`newsletter`),
            ]);

            if (health.status === "fulfilled") setHealthKPIs(health.value);
            if (questions.status === "fulfilled") setTopQuestions(questions.value);
            if (unresolved.status === "fulfilled") setUnresolvedQueries(unresolved.value);
            if (intents.status === "fulfilled") setIntentPerformance(intents.value);
            if (resolver.status === "fulfilled") setResolverStats(resolver.value);
            if (funnel.status === "fulfilled") setSessionFunnel(funnel.value);
            if (perf.status === "fulfilled") setPerformanceMetrics(perf.value);
            if (lang.status === "fulfilled") setLanguageStats(lang.value);
            if (demand.status === "fulfilled") setDemandInsights(demand.value);
            if (summary.status === "fulfilled") setHealthSummary(summary.value);
            if (feedback.status === "fulfilled") setFeedbackReports(feedback.value);
            if (geo.status === "fulfilled") setGeoDistribution(geo.value);
            if (newsletter.status === "fulfilled") setNewsletterStats(newsletter.value);

            const failures = [
                health,
                questions,
                unresolved,
                intents,
                resolver,
                funnel,
                perf,
                lang,
                demand,
                summary,
                feedback,
                geo,
                newsletter,
            ].filter((result) => result.status === "rejected");

            if (failures.length > 0) {
                const isTotalFailure = failures.length === 13;
                const firstFailure = failures[0];
                const reason = firstFailure.status === "rejected" ? firstFailure.reason : null;
                const message = reason instanceof Error ? reason.message : "Analytics requests failed.";

                setDataError(
                    isTotalFailure
                        ? `Failed to load analytics data. ${message}`
                        : `Some analytics panels could not be loaded. ${message}`
                );
            }

            setLastRefresh(new Date());
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
            setDataError(error instanceof Error ? error.message : "Failed to load analytics data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            fetchData();
        }
    }, [period, userType, language, isAuthenticated, user]);

    useEffect(() => {
        if (!selectedNewsletterType) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [selectedNewsletterType]);

    // Export to CSV
    const exportToCSV = (data: any[], filename: string) => {
        if (!data.length) return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => Object.values(row).join(','));
        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Mark query as resolved
    const resolveQuery = async (id: number, status: 'resolved' | 'ignored') => {
        try {
            const response = await fetch(`/api/proxy/admin/analytics/unresolved/${id}/resolve?status=${status}`, {
                method: 'POST',
                headers: getAdminRequestHeaders(),
                body: JSON.stringify({}),
            });

            if (!response.ok) {
                throw new Error(`Failed to update query status (${response.status})`);
            }

            setUnresolvedQueries(prev => prev.filter(q => q.id !== id));
        } catch (error) {
            console.error("Failed to resolve query:", error);
        }
    };

    const openNewsletterPreview = async (emailType: NewsletterEmailTypeAnalytics) => {
        setSelectedNewsletterType(emailType.key);
        setNewsletterPreview(null);
        setNewsletterPreviewError(null);
        setNewsletterPreviewLoading(true);

        try {
            const response = await fetch(`/api/proxy/admin/analytics/newsletter/preview?email_type=${emailType.key}`, {
                headers: getAdminRequestHeaders(),
                cache: "no-store",
            });

            const preview = await response.json().catch(() => null);

            if (!response.ok) {
                const detail =
                    preview && typeof preview === "object" && "detail" in preview
                        ? String(preview.detail)
                        : `Preview request failed with status ${response.status}`;
                throw new Error(detail);
            }

            if (!preview) {
                throw new Error("Preview payload missing.");
            }

            setNewsletterPreview(preview);
        } catch (error) {
            console.error("Failed to fetch newsletter preview:", error);
            setNewsletterPreviewError("Failed to load the latest archived email preview.");
        } finally {
            setNewsletterPreviewLoading(false);
        }
    };

    const closeNewsletterPreview = () => {
        setSelectedNewsletterType(null);
        setNewsletterPreview(null);
        setNewsletterPreviewError(null);
        setNewsletterPreviewLoading(false);
    };

    // Loading / signed-out / not-an-admin are all rendered by AdminGate in the
    // layout; by the time this component mounts the viewer IS an admin.

    const newsletterEmailTypes = newsletterStats?.email_types?.length ? newsletterStats.email_types : newsletterStats ? [
        {
            key: "weekly_pulse" as const,
            label: "Weekly Pulse",
            subscriber_count: newsletterStats.weekly_pulse_count,
            sent_total: 0,
            last_sent: newsletterStats.last_weekly_sent,
            last_dispatch_sent_count: 0,
            last_dispatch_error_count: 0,
            preview_available: false,
        },
        {
            key: "monthly_dive" as const,
            label: "Monthly Deep Dive",
            subscriber_count: newsletterStats.monthly_dive_count,
            sent_total: 0,
            last_sent: newsletterStats.last_monthly_sent,
            last_dispatch_sent_count: 0,
            last_dispatch_error_count: 0,
            preview_available: false,
        },
        {
            key: "academy" as const,
            label: "Starta Academy",
            subscriber_count: newsletterStats.academy_count,
            sent_total: 0,
            last_sent: newsletterStats.last_academy_sent,
            last_dispatch_sent_count: 0,
            last_dispatch_error_count: 0,
            preview_available: false,
        },
        {
            key: "flash_alerts" as const,
            label: "Flash Alerts",
            subscriber_count: newsletterStats.flash_alerts_count,
            sent_total: 0,
            last_sent: newsletterStats.last_flash_sent,
            last_dispatch_sent_count: 0,
            last_dispatch_error_count: 0,
            preview_available: false,
        },
    ] : [];
    const selectedNewsletterMeta = selectedNewsletterType ? NEWSLETTER_TYPE_META[selectedNewsletterType] : null;
    const newsletterSectionPanelId = "newsletter-engagement-panel";
    const newsletterSectionTriggerId = "newsletter-engagement-trigger";

    return (
        // No page background and no min-h-screen: AdminShell owns the canvas
        // now. The two fixed inset-0 "ambient glow" blobs that used to sit here
        // were removed with it — fixed positioning is viewport-relative, so
        // they painted across the console rail as well as the content column.
        <div>
            {/* 1. TOP HEADER & FILTERS.
                Static on mobile, sticky from lg up: the shell already pins a
                bar at top:0 on small screens, and two elements both sticking to
                top:0 overlap each other. */}
            <header className="static lg:sticky lg:top-0 z-20 w-full bg-surface border-b border-border">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                        {/* Title */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-page rounded-md flex items-center justify-center shadow-sm border border-border">
                                <LayoutDashboard className="w-5 h-5 text-starta-teal" />
                            </div>
                            <div>
                                <h1 className="font-display text-xl font-bold text-main">Analytics</h1>
                            </div>
                        </div>

                        {/* Global Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3">

                            {/* User Type */}
                            <Tooltip content="Filter by user authentication status">
                                <div className="relative group">
                                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-starta-teal transition-colors" />
                                    <select
                                        value={userType}
                                        onChange={(e) => setUserType(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-page border border-border rounded-md text-sm font-medium text-main focus:ring-1 focus:ring-starta-teal outline-none appearance-none cursor-pointer shadow-sm"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="user">Registered</option>
                                        <option value="guest">Guests</option>
                                    </select>
                                </div>
                            </Tooltip>

                            {/* Language */}
                            <Tooltip content="Filter by detected conversation language">
                                <div className="relative group">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-starta-teal transition-colors" />
                                    <select
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                        className="pl-9 pr-4 py-2 bg-page border border-border rounded-md text-sm font-medium text-main focus:ring-1 focus:ring-starta-teal outline-none appearance-none cursor-pointer shadow-sm"
                                    >
                                        <option value="all">All Languages</option>
                                        <option value="en">English (EN)</option>
                                        <option value="ar">Arabic (AR)</option>
                                    </select>
                                </div>
                            </Tooltip>

                            <div className="h-6 w-px bg-panel mx-1"></div>

                            {/* Period Selection */}
                            <Tooltip content="Select time range for all metrics">
                                <div className="flex bg-page rounded-md p-1 border border-border shadow-sm">
                                    {['today', '7d', '30d'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setPeriod(p)}
                                            className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${period === p
                                                ? 'bg-surface text-starta-teal shadow-sm border border-border'
                                                : 'text-muted hover:text-main'
                                                }`}
                                        >
                                            {p === 'today' ? '24H' : p.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </Tooltip>

                            <Tooltip content="Refresh all data">
                                <button
                                    onClick={fetchData}
                                    className="p-2.5 bg-page rounded-md transition-colors border border-border text-muted shadow-sm"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-starta-teal' : ''}`} />
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {dataError && (
                    <section className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-5 py-4 text-amber-900 shadow-sm">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold">Analytics data issue detected</p>
                                <p className="mt-1 text-sm text-amber-800/90">{dataError}</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* 2. PRODUCT HEALTH SUMMARY (NEW) */}


                {/* 3. EXECUTIVE KPI ROW */}
                <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <OverviewCard
                        icon={MessageSquare}
                        label="Total Chats"
                        value={healthKPIs?.total_chats ?? 0}
                        trend={healthKPIs?.trend_chats}
                        tooltip="Total unique chat sessions started in period"
                        color="blue"
                    />
                    <OverviewCard
                        icon={BarChart3}
                        label="Messages"
                        value={healthKPIs?.total_messages ?? 0}
                        trend={healthKPIs?.trend_messages}
                        tooltip="Total individual messages exchanged"
                        color="indigo"
                    />
                    <OverviewCard
                        icon={Users}
                        label="Active Users"
                        value={healthKPIs?.unique_users ?? 0}
                        trend={healthKPIs?.trend_users}
                        tooltip="Unique registered users who interacted"
                        color="purple"
                    />
                    <OverviewCard
                        icon={CheckCircle}
                        label="Success Rate"
                        value={`${healthKPIs?.success_rate ?? 0}%`}
                        trend={healthKPIs?.trend_success}
                        tooltip="Percentage of queries with successful data response"
                        color="green"
                        inverseTrend={false}
                    />
                    <OverviewCard
                        icon={XCircle}
                        label="Failure Rate"
                        value={`${healthKPIs?.failure_rate ?? 0}%`}
                        trend={healthKPIs?.trend_failure}
                        tooltip="Percentage of queries that failed or triggered fallback"
                        color="red"
                        inverseTrend={true}
                    />
                    <OverviewCard
                        icon={Globe}
                        label="Guest Sessions"
                        value={healthKPIs?.guest_sessions ?? 0}
                        trend={null}
                        tooltip="Sessions by unregistered users"
                        color="orange"
                    />
                    <OverviewCard
                        icon={Clock}
                        label="Avg Latency"
                        value={`${performanceMetrics?.avg_latency_ms?.toFixed(0) ?? 0}ms`}
                        trend={null}
                        tooltip="Average response time per message"
                        color="teal"
                        inverseTrend={true}
                    />
                </section>

                {/* ============================================================ */}
                {/* NEWSLETTER ANALYTICS (NEW PHASE 4) */}
                {/* ============================================================ */}
                <section className="space-y-4">
                    <h2>
                        <button
                            id={newsletterSectionTriggerId}
                            type="button"
                            aria-controls={newsletterSectionPanelId}
                            aria-expanded={isNewsletterSectionOpen}
                            onClick={() => setIsNewsletterSectionOpen((open) => !open)}
                            className="group flex w-full flex-col gap-4 rounded-2xl border border-border/80 bg-surface px-5 py-4 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-starta-teal/20 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-starta-teal/40 focus-visible:ring-offset-2 focus-visible:ring-offset-page md:flex-row md:items-center md:justify-between"
                        >
                            <span className="flex min-w-0 items-center gap-3">
                                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-starta-teal/15 bg-starta-teal/10 shadow-[0_10px_30px_rgba(60,80,224,0.08)]">
                                    <Inbox className="w-5 h-5 text-starta-teal" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-xl font-bold text-main">
                                        Newsletter & Engagement
                                    </span>
                                    <span className="mt-1 block text-sm text-muted">
                                        Subscriber health, list distribution, and dispatch telemetry
                                    </span>
                                </span>
                            </span>

                            <span className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                                <span className={newsletterStats
                                    ? newsletterStats.is_scheduler_running
                                        ? "flex items-center gap-1.5 text-sm font-medium text-[#10B981]"
                                        : "flex items-center gap-1.5 text-sm font-medium text-amber-500"
                                    : "flex items-center gap-1.5 text-sm font-medium text-muted"}
                                >
                                    <span className={`h-2 w-2 rounded-full ${newsletterStats
                                        ? newsletterStats.is_scheduler_running
                                            ? "bg-[#10B981] animate-pulse"
                                            : "bg-amber-500"
                                        : "bg-muted"}`
                                    }></span>
                                    {newsletterStats
                                        ? `Scheduler: ${newsletterStats.is_scheduler_running ? "Active Dispatching" : "Idle / Waiting"}`
                                        : "Scheduler: Data unavailable"}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted transition-colors duration-300 group-hover:border-starta-teal/20 group-hover:text-starta-teal">
                                    {isNewsletterSectionOpen ? "Hide details" : "Show details"}
                                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isNewsletterSectionOpen ? "rotate-90 text-starta-teal" : ""}`} />
                                </span>
                            </span>
                        </button>
                    </h2>

                    <AnimatePresence initial={false}>
                        {isNewsletterSectionOpen && (
                            <motion.div
                                id={newsletterSectionPanelId}
                                role="region"
                                aria-labelledby={newsletterSectionTriggerId}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="overflow-hidden"
                            >
                                {newsletterStats ? (
                                    <div className="grid gap-6 pt-2 md:grid-cols-3">
                                        {/* Card 1: Subscriber Base */}
                                        <div className="bg-surface border border-border shadow-sm rounded-xl p-6 transition-shadow hover:shadow-md">
                                            <div className="mb-4 flex items-center justify-between">
                                                <h3 className="flex items-center gap-2 font-semibold text-main">
                                                    <Users className="h-5 w-5 text-starta-teal" />
                                                    Subscribers
                                                </h3>
                                                <span className="text-2xl font-bold text-main">{newsletterStats.active_subscribers}</span>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted">Total Opt-ins</span>
                                                    <span className="font-medium text-main">{newsletterStats.total_subscribers}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted">Unsubscribed</span>
                                                    <span className="font-medium text-red-500">{newsletterStats.unsubscribed_count}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted">Retention Rate</span>
                                                    <span className="font-medium text-[#10B981]">{newsletterStats.retention_rate.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: List Distribution */}
                                        <div className="bg-surface border border-border shadow-sm rounded-xl p-6 transition-shadow hover:shadow-md">
                                            <h3 className="mb-4 flex items-center gap-2 font-semibold text-main">
                                                <BarChart3 className="h-5 w-5 text-starta-teal" />
                                                Active Lists
                                            </h3>
                                            <div className="space-y-3">
                                                {newsletterEmailTypes.map((list) => {
                                                    const meta = NEWSLETTER_TYPE_META[list.key];
                                                    return (
                                                        <button
                                                            key={list.key}
                                                            type="button"
                                                            onClick={() => openNewsletterPreview(list)}
                                                            className="flex w-full items-center gap-3 rounded-xl border border-border/70 bg-surface px-3 py-3 text-left transition-colors hover:bg-page"
                                                        >
                                                            <div className={`h-2 w-2 rounded-full ${meta.color}`} />
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-main">{list.label}</span>
                                                                    <Eye className={`h-3.5 w-3.5 ${meta.accent}`} />
                                                                </div>
                                                                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
                                                                    <span>{list.subscriber_count} subscribed</span>
                                                                    <span>{list.sent_total} sent</span>
                                                                </div>
                                                            </div>
                                                            <div className="h-1.5 w-16 flex-shrink-0 overflow-hidden rounded-full bg-panel">
                                                                <div
                                                                    className={`h-full ${meta.color}`}
                                                                    style={{ width: `${(list.subscriber_count / Math.max(newsletterStats.active_subscribers, 1)) * 100}%` }}
                                                                />
                                                            </div>
                                                            <ChevronRight className="h-4 w-4 text-muted" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Card 3: Dispatch Health */}
                                        <div className="bg-surface border border-border shadow-sm rounded-xl p-6 transition-shadow hover:shadow-md">
                                            <h3 className="mb-4 flex items-center gap-2 font-semibold text-main">
                                                <Zap className="h-5 w-5 text-amber-500" />
                                                Last Dispatch
                                            </h3>
                                            <div className="space-y-3">
                                                {newsletterEmailTypes.map((dispatch) => {
                                                    const meta = NEWSLETTER_TYPE_META[dispatch.key];
                                                    return (
                                                        <div key={dispatch.key} className="flex items-start justify-between gap-4 text-sm">
                                                            <div>
                                                                <span className="font-medium text-main">{meta.shortLabel}</span>
                                                                <p className="mt-1 text-[11px] text-muted">
                                                                    {dispatch.last_dispatch_sent_count} sent / {dispatch.last_dispatch_error_count} failed
                                                                </p>
                                                            </div>
                                                            {dispatch.last_sent ? (
                                                                <span className="text-right font-medium text-main">
                                                                    {new Date(dispatch.last_sent).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            ) : (
                                                                <span className="italic text-muted">Never</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {!newsletterEmailTypes.length && (
                                                    <div className="text-sm italic text-muted">No dispatch telemetry yet</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="pt-2">
                                        <div className="bg-surface border border-border shadow-sm rounded-xl border-dashed p-6 text-center">
                                            <Inbox className="mx-auto h-8 w-8 text-muted" />
                                            <p className="mt-3 text-sm font-semibold text-main">Newsletter analytics is currently unavailable</p>
                                            <p className="mt-1 text-xs text-muted">The section stays visible so you can retry without losing context.</p>
                                            <button
                                                type="button"
                                                onClick={fetchData}
                                                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-main transition-colors hover:bg-page"
                                            >
                                                <RefreshCw className="h-3.5 w-3.5" />
                                                Retry Newsletter Data
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* 4. MAIN CONTENT GRID */}
                <div className="grid lg:grid-cols-3 gap-8 relative z-10">

                    {/* LEFT COLUMN: 2/3 Width */}
                    <div className="lg:col-span-2 space-y-8 lg:h-full lg:min-h-0 lg:flex lg:flex-col">

                        {/* DEMAND INTELLIGENCE & TOP QUESTIONS — TABBED */}
                        <section className="relative group bg-surface border border-border shadow-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md duration-300 lg:h-full lg:min-h-0 lg:flex lg:flex-col">
                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-page rounded-md flex items-center justify-center border border-border">
                                        {demandTab === 'demand' ? <TrendingUp className="w-6 h-6 text-starta-teal" /> : <HelpCircle className="w-6 h-6 text-starta-teal" />}
                                    </div>
                                    <div>
                                        <h2 className="font-display font-bold text-xl text-main flex items-center gap-2">
                                            {demandTab === 'demand' ? 'Demand Intelligence' : 'Top Questions'}
                                            <Tooltip content={demandTab === 'demand' ? 'Trending topics based on volume growth' : 'Most frequently asked questions'}>
                                                <Info className="w-4 h-4 text-muted cursor-help" />
                                            </Tooltip>
                                        </h2>
                                        <p className="text-sm text-muted font-medium mt-0.5">
                                            {demandTab === 'demand' ? 'Market query velocity & trends' : 'Highest volume user inquiries'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {demandTab === 'questions' && (
                                        <button
                                            onClick={() => exportToCSV(topQuestions, 'top_questions')}
                                            className="text-xs font-medium text-starta-teal hover:text-starta-darkTeal flex items-center gap-1"
                                        >
                                            <Download className="w-3 h-3" /> CSV
                                        </button>
                                    )}
                                    <div className="flex bg-page rounded-lg p-1 border border-border">
                                        <button
                                            onClick={() => setDemandTab('demand')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${demandTab === 'demand' ? 'bg-surface text-starta-teal shadow-sm border border-border' : 'text-muted hover:text-main'}`}
                                        >
                                            <TrendingUp className="w-3.5 h-3.5 inline-block mr-1" />Demand
                                        </button>
                                        <button
                                            onClick={() => setDemandTab('questions')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${demandTab === 'questions' ? 'bg-surface text-starta-teal shadow-sm border border-border' : 'text-muted hover:text-main'}`}
                                        >
                                            <HelpCircle className="w-3.5 h-3.5 inline-block mr-1" />Questions
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* TAB: Demand Intelligence */}
                            {demandTab === 'demand' && (
                                <div className="overflow-x-auto overflow-y-auto max-h-[300px] custom-scrollbar lg:max-h-none lg:min-h-0 lg:flex-1">
                                    <table className="w-full relative">
                                        <thead className="sticky top-0 z-20 bg-page text-left text-xs font-bold text-muted uppercase tracking-wider shadow-sm after:content-[''] after:absolute after:-bottom-[1px] after:left-0 after:right-0 after:border-b after:border-border">
                                            <tr>
                                                <th className="px-6 py-3">Trending Query</th>
                                                <th className="px-6 py-3">Volume</th>
                                                <th className="px-6 py-3">Growth</th>
                                                <th className="px-6 py-3">Intent</th>
                                                <th className="px-6 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {demandInsights.length === 0 ? (
                                                <tr><td colSpan={5} className="p-8 text-center text-muted">No trending data available</td></tr>
                                            ) : (
                                                demandInsights.map((d, i) => (
                                                    <tr key={i} className="hover:bg-page transition-colors">
                                                        <td className="px-6 py-4 font-medium text-main">{d.query_text}</td>
                                                        <td className="px-6 py-4 text-muted">{d.volume}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`flex items-center gap-1 font-bold ${d.growth_rate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {d.growth_rate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                                {Math.abs(d.growth_rate)}%
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-muted font-mono uppercase">{d.intent}</td>
                                                        <td className="px-6 py-4">
                                                            {d.is_new ? (
                                                                <span className="px-2 py-0.5 rounded bg-starta-teal/15 text-blue-700 text-xs font-bold">NEW</span>
                                                            ) : (
                                                                <span className="text-xs text-muted">Recurring</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* TAB: Top Questions */}
                            {demandTab === 'questions' && (
                                <div className="divide-y divide-border max-h-[300px] overflow-y-auto custom-scrollbar lg:max-h-none lg:min-h-0 lg:flex-1">
                                    {topQuestions.length === 0 ? (
                                        <div className="p-8 text-center text-muted">No data yet</div>
                                    ) : (
                                        topQuestions.map((q, i) => (
                                            <div key={i} className="p-4 hover:bg-page transition-colors group">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <span className="w-6 h-6 rounded-full bg-panel flex items-center justify-center text-xs font-bold text-muted">
                                                            {i + 1}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-main truncate pr-4">{q.normalized_text}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] uppercase font-bold text-muted">{q.top_intent}</span>
                                                                <div className="w-1 h-1 bg-muted rounded-full"></div>
                                                                <span className={`text-[10px] font-bold ${q.success_rate > 80 ? 'text-green-600' : 'text-orange-600'}`}>
                                                                    {q.success_rate.toFixed(0)}% Success
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-base font-bold text-main">{q.count}</p>
                                                        <p className="text-xs text-muted">requests</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </section>


                    </div>

                    {/* RIGHT COLUMN: 1/3 Width */}
                    <div className="space-y-8">

                        {/* SYSTEM PERFORMANCE (Right Top) */}
                        <section className="relative group bg-surface border border-border shadow-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md duration-300">
                            <div className="p-6 border-b border-border flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-page rounded-md flex items-center justify-center border border-border">
                                        <Activity className="w-6 h-6 text-starta-teal" />
                                    </div>
                                    <h2 className="font-display font-bold text-xl text-main">System Health</h2>
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-500 tracking-widest">ONLINE</span>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4 relative z-10">
                                <div className="p-5 rounded-2xl bg-page border border-border/[0.05] hover:border-starta-teal/30 transition-all hover:bg-page group/bg-surface border-border">
                                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 group-hover/card:text-starta-teal transition-colors">Avg Latency</p>
                                    <p className="text-2xl font-black text-main">
                                        {performanceMetrics?.avg_latency_ms?.toFixed(0) || 0}<span className="text-sm font-medium text-muted ml-1">ms</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-page border border-border/[0.05] hover:border-starta-teal/30 transition-all hover:bg-page group/bg-surface border-border">
                                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 group-hover/card:text-starta-teal transition-colors">P95 Latency</p>
                                    <p className="text-2xl font-black text-main">
                                        {performanceMetrics?.p95_latency_ms?.toFixed(0) || 0}<span className="text-sm font-medium text-muted ml-1">ms</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-page border border-border/[0.05] hover:border-starta-teal/30 transition-all hover:bg-page group/bg-surface border-border">
                                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 group-hover/card:text-starta-teal transition-colors">Throughput</p>
                                    <p className="text-2xl font-black text-main">
                                        {((healthKPIs?.total_messages || 0) / (30 * 24)).toFixed(1)}<span className="text-xs font-bold text-muted ml-1">MSG/HR</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-page border border-border/[0.05] hover:border-starta-teal/30 transition-all hover:bg-page group/bg-surface border-border">
                                    <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 group-hover/card:text-starta-teal transition-colors">Error Rate</p>
                                    <p className={`text-2xl font-black ${(performanceMetrics?.error_rate ?? 0) > 1 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {performanceMetrics?.error_rate || 0}<span className="text-sm font-medium text-muted ml-1">%</span>
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Right column: only System Health remains */}

                        {/* USER GEOGRAPHY */}
                        <section className="relative group bg-surface border border-border shadow-sm rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-md duration-300">
                            <div className="p-6 border-b border-border flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-page rounded-md flex items-center justify-center border border-border">
                                        <Globe className="w-6 h-6 text-starta-teal" />
                                    </div>
                                    <div>
                                        <h2 className="font-display font-bold text-xl text-main">User Geography</h2>
                                        <p className="text-sm text-muted font-medium mt-0.5">All users by country</p>
                                    </div>
                                </div>
                                <Tooltip content="Country detected via IP geolocation for all users">
                                    <Info className="w-4 h-4 text-muted cursor-help" />
                                </Tooltip>
                            </div>
                            <div className="p-4 max-h-[300px] overflow-y-auto custom-scrollbar relative z-10">
                                {geoDistribution.length === 0 ? (
                                    <div className="p-6 text-center text-muted text-sm">
                                        <Globe className="w-8 h-8 mx-auto mb-2 text-muted" />
                                        <p>No geo data yet. Data populates as users interact with the chatbot.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {geoDistribution.map((g, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-page border border-border/[0.05] hover:border-starta-teal/30 transition-all group/geo">
                                                <span className="text-2xl flex-shrink-0" title={g.country_name}>
                                                    {g.country_code.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)))}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-sm font-bold text-main truncate">{g.country_name}</span>
                                                        <span className="text-xs font-bold text-muted ml-2 shrink-0">{g.percentage}%</span>
                                                    </div>
                                                    <div className="w-full bg-panel rounded-full h-1.5">
                                                        <div
                                                            className="h-1.5 rounded-full bg-gradient-to-r from-starta-accent to-starta-teal transition-all duration-500"
                                                            style={{ width: `${Math.min(g.percentage, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] font-bold text-muted">{g.users} sessions</span>
                                                        <span className="text-[10px] font-bold text-muted">{g.messages} msgs</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>

                    </div>
                </div>

                {/* 6. USER FEEDBACK REPORTS (Full Width) */}
                <section className="bg-surface backdrop-blur-xl rounded-2xl border border-border/[0.08] shadow-sm overflow-hidden relative group mt-8">
                    <div className="p-8 border-b border-border/[0.08] relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-page rounded-md flex items-center justify-center border border-border">
                                <MessageSquare className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h2 className="font-display font-bold text-xl text-main flex items-center gap-2">
                                    User Feedback Reports
                                    <Tooltip content="Direct feedback from users (thumbs up/down and text reports)">
                                        <Info className="w-4 h-4 text-muted cursor-help" />
                                    </Tooltip>
                                </h2>
                                <p className="text-sm text-muted font-medium mt-0.5">Continuous improvement signal</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full">
                            <thead className="bg-page text-left text-xs font-bold text-muted uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">User / Session</th>
                                    <th className="px-6 py-4">Query Context</th>
                                    <th className="px-6 py-4">Feedback</th>
                                    <th className="px-6 py-4 w-1/3">Report Text</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {feedbackReports?.length > 0 ? feedbackReports.map((q, i) => (
                                    <tr key={i} className="hover:bg-page transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-xs font-medium text-muted">
                                                <Clock className="w-3 h-3" />
                                                {new Date(q.created_at).toLocaleTimeString()}
                                            </div>
                                            <div className="text-[10px] text-muted mt-1">{new Date(q.created_at).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="w-3 h-3 text-muted" />
                                                <span className="text-xs font-bold text-main">
                                                    {q.user_id.startsWith('guest_') ? `Guest (${q.user_id.split('_')[1]})` : q.user_id}
                                                </span>
                                            </div>
                                            <div className="text-[10px] text-muted font-mono">Session: {q.session_id.substring(0, 12)}...</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-main line-clamp-2">"{q.raw_query || 'Unknown Query'}"</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                {q.feedback_type === 'like' ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        <ThumbsUp className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-bold uppercase">Like</span>
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                                        <ThumbsDown className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-bold uppercase">Dislike</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {q.report_text ? (
                                                <p className="text-sm text-main bg-page p-3 rounded-xl border border-border">
                                                    {q.report_text}
                                                </p>
                                            ) : (
                                                <span className="text-xs text-muted italic">No text provided</span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted">
                                            <div className="flex flex-col items-center">
                                                <CheckCircle className="w-8 h-8 text-muted mb-2" />
                                                <span>No feedback reports recorded yet.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {selectedNewsletterType && (
                    <div className="fixed inset-0 z-[70] flex">
                        {/* Backdrop */}
                        <button
                            type="button"
                            aria-label="Close preview"
                            onClick={closeNewsletterPreview}
                            className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity"
                        />

                        {/* Panel — full viewport height, split layout */}
                        <div className="relative z-10 flex w-full h-full">

                            {/* LEFT SIDEBAR — scrollable meta panel */}
                            <div className="relative w-full max-w-[420px] flex-shrink-0 h-full flex flex-col bg-surface border-r border-border/80 overflow-hidden">

                                {/* Header */}
                                <div className="flex-shrink-0 px-6 pt-6 pb-5 border-b border-border">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${selectedNewsletterMeta?.accent ?? 'text-starta-teal'} bg-current/10 border border-current/20`}
                                                style={{
                                                    backgroundColor: selectedNewsletterType === 'weekly_pulse' ? 'rgba(60,80,224,0.08)' :
                                                        selectedNewsletterType === 'monthly_dive' ? 'rgba(14,165,233,0.08)' :
                                                            selectedNewsletterType === 'academy' ? 'rgba(20,184,166,0.08)' : 'rgba(249,115,22,0.08)',
                                                    borderColor: selectedNewsletterType === 'weekly_pulse' ? 'rgba(60,80,224,0.2)' :
                                                        selectedNewsletterType === 'monthly_dive' ? 'rgba(14,165,233,0.2)' :
                                                            selectedNewsletterType === 'academy' ? 'rgba(20,184,166,0.2)' : 'rgba(249,115,22,0.2)',
                                                }}
                                            >
                                                <Zap className="w-3 h-3" />
                                                Real Email Archive
                                            </div>
                                            <h3 className="mt-3 text-xl font-black text-main tracking-tight">
                                                {newsletterPreview?.label ?? newsletterEmailTypes.find(item => item.key === selectedNewsletterType)?.label ?? "Newsletter Preview"}
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeNewsletterPreview}
                                            className="rounded-xl p-2 text-muted transition-all hover:bg-panel hover:text-main"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div className="flex-shrink-0 px-6 py-4 border-b border-border">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="rounded-2xl bg-page p-3.5 border border-border/50">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-muted">Total Sent</p>
                                            <p className="mt-1.5 text-2xl font-black text-main tabular-nums">{newsletterPreview?.total_sent ?? 0}</p>
                                        </div>
                                        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-3.5 border border-emerald-200/50">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700/70">Delivered</p>
                                            <p className="mt-1.5 text-2xl font-black text-emerald-700 tabular-nums">{newsletterPreview?.last_dispatch_sent_count ?? 0}</p>
                                        </div>
                                        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 p-3.5 border border-rose-200/50">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-rose-600/70">Failed</p>
                                            <p className="mt-1.5 text-2xl font-black text-rose-600 tabular-nums">{newsletterPreview?.last_dispatch_error_count ?? 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metadata section — scrollable */}
                                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">

                                    {/* Subject */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-2">Subject Line</p>
                                        <div className="rounded-xl bg-page border border-border/50 px-4 py-3">
                                            <p className="text-sm font-semibold text-main leading-relaxed">
                                                {newsletterPreview?.subject ?? "No archived subject available"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Last Sent */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-1.5">Last Dispatch</p>
                                            <p className="text-sm font-semibold text-main">
                                                {newsletterPreview?.last_dispatch_at
                                                    ? new Date(newsletterPreview.last_dispatch_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : "Never"}
                                            </p>
                                            {newsletterPreview?.last_dispatch_at && (
                                                <p className="text-[11px] text-muted mt-0.5">
                                                    {new Date(newsletterPreview.last_dispatch_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-1.5">Template</p>
                                            <p className="text-sm font-semibold text-main">
                                                {newsletterPreview?.template_variant || selectedNewsletterType?.replace('_', ' ') || "—"}
                                            </p>
                                            {newsletterPreview?.lesson_number && (
                                                <p className="text-[11px] text-muted mt-0.5">Lesson {newsletterPreview.lesson_number}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Last Successful Recipient */}
                                    {newsletterPreview?.recipient_email && (
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted mb-2">Last Successful Recipient</p>
                                            <div className="flex items-center gap-3 rounded-xl bg-emerald-50/50 border border-emerald-200/50 px-4 py-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-main truncate">{newsletterPreview.recipient_email}</p>
                                                    {newsletterPreview.recipient_name && (
                                                        <p className="text-[11px] text-muted">{newsletterPreview.recipient_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recipients List */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted">
                                                Latest Dispatch Recipients
                                            </p>
                                            <span className="text-[10px] font-bold text-muted bg-panel px-2 py-0.5 rounded-full">
                                                {(newsletterPreview?.recipients ?? []).length}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                                            {(newsletterPreview?.recipients ?? []).length > 0 ? (
                                                newsletterPreview?.recipients.map((recipient) => (
                                                    <div key={`${recipient.email}-${recipient.sent_at}`} className="flex items-center gap-2.5 rounded-xl bg-page border border-border/50 px-3 py-2.5 transition-colors hover:bg-panel">
                                                        <div className="w-6 h-6 rounded-full bg-panel flex items-center justify-center flex-shrink-0">
                                                            <span className="text-[10px] font-bold text-muted">
                                                                {(recipient.full_name || recipient.email).charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-main truncate">{recipient.email}</p>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                                                                {recipient.full_name && <span>{recipient.full_name}</span>}
                                                                {recipient.lesson_number != null && <span>L{recipient.lesson_number}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-border p-4 text-center">
                                                    <p className="text-xs text-muted">No archived recipients for this dispatch yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT PANEL — full-height email preview */}
                            <div className="flex-1 h-full flex flex-col bg-panel">
                                {/* Preview header bar */}
                                <div className="flex-shrink-0 px-6 py-3 border-b border-border/50 bg-surface backdrop-blur-sm flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Eye className={`w-4 h-4 ${selectedNewsletterMeta?.accent ?? 'text-starta-teal'}`} />
                                        <span className="text-xs font-bold text-muted uppercase tracking-wider">Email Preview</span>
                                    </div>
                                    {newsletterPreview?.preview_available && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live Archive
                                        </span>
                                    )}
                                </div>

                                {/* Preview content — full remaining height */}
                                <div className="flex-1 min-h-0">
                                    {newsletterPreviewLoading ? (
                                        <div className="flex h-full items-center justify-center">
                                            <div className="text-center">
                                                <RefreshCw className={`h-10 w-10 animate-spin mx-auto ${selectedNewsletterMeta?.accent ?? 'text-starta-teal'}`} />
                                                <p className="mt-4 text-sm font-medium text-muted">Loading email archive…</p>
                                            </div>
                                        </div>
                                    ) : newsletterPreviewError ? (
                                        <div className="flex h-full items-center justify-center p-8 text-center">
                                            <div>
                                                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                                                    <XCircle className="h-8 w-8 text-rose-500" />
                                                </div>
                                                <p className="text-sm font-semibold text-main">{newsletterPreviewError}</p>
                                                <p className="mt-2 text-xs text-muted">Try refreshing the page or check server logs.</p>
                                            </div>
                                        </div>
                                    ) : newsletterPreview?.preview_available && newsletterPreview.html ? (
                                        <iframe
                                            title={`${newsletterPreview.label} preview`}
                                            srcDoc={newsletterPreview.html}
                                            className="w-full h-full bg-surface border-0"
                                            sandbox=""
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center p-8 text-center">
                                            <div className="max-w-sm">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4`}
                                                    style={{
                                                        backgroundColor: selectedNewsletterType === 'weekly_pulse' ? 'rgba(60,80,224,0.08)' :
                                                            selectedNewsletterType === 'monthly_dive' ? 'rgba(14,165,233,0.08)' :
                                                                selectedNewsletterType === 'academy' ? 'rgba(20,184,166,0.08)' : 'rgba(249,115,22,0.08)',
                                                    }}
                                                >
                                                    <Eye className={`h-8 w-8 ${selectedNewsletterMeta?.accent ?? 'text-starta-teal'}`} />
                                                </div>
                                                <p className="text-sm font-semibold text-main">
                                                    No archived HTML preview available
                                                </p>
                                                <p className="mt-2 text-xs text-muted leading-relaxed">
                                                    This template hasn&apos;t been dispatched yet with the new archiving system. Future sends will automatically save the rendered HTML here for instant preview.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

// ============================================================
// OVERVIEW CARD COMPONENT (Renamed & Enhanced)
// ============================================================

function OverviewCard({ icon: Icon, label, value, trend, tooltip, color, inverseTrend = false }: {
    icon: any;
    label: string;
    value: string | number;
    trend: number | null | undefined;
    tooltip: string;
    color: string;
    inverseTrend?: boolean;
}) {
    // Seven pastel hues used to sit here — blue, indigo, purple, green, red,
    // orange, teal — one per card, which is an evenly distributed palette with
    // no dominant ground: the exact opposite of the landing page, which commits
    // to ONE accent on a near-white field. Colour now MEANS something. Most
    // metrics are quiet; only the two that carry a judgement are coloured.
    const colorClasses: Record<string, string> = {
        neutral: 'text-muted bg-page border border-border',
        brand: 'text-starta-teal bg-starta-teal/10 border border-starta-teal/20',
        success: 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20',
        danger: 'text-red-600 bg-red-500/10 border border-red-500/20',
    };
    // Legacy names still passed by the cards above.
    const colorAlias: Record<string, string> = {
        blue: 'brand', indigo: 'brand', teal: 'brand',
        purple: 'neutral', orange: 'neutral',
        green: 'success', red: 'danger',
    };

    const isPositive = trend && trend > 0;
    const isNeutral = trend === 0;

    // Determine trend color
    let trendColor = 'text-muted';
    let TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
    let trendBg = 'bg-panel';

    if (trend !== null && trend !== undefined && !isNeutral) {
        if (inverseTrend) {
            trendColor = isPositive ? 'text-red-500' : 'text-emerald-500';
            trendBg = isPositive ? 'bg-red-50' : 'bg-emerald-50';
        } else {
            trendColor = isPositive ? 'text-emerald-500' : 'text-red-500';
            trendBg = isPositive ? 'bg-emerald-50' : 'bg-red-50';
        }
    }

    return (
        <div className="bg-surface rounded-md p-5 border border-border shadow-sm transition-all relative group flex flex-col justify-between h-full overflow-hidden">
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className={`p-3 rounded-xl ${colorClasses[colorAlias[color] ?? color] ?? colorClasses.neutral}`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                </div>
                {trend !== null && trend !== undefined && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trendColor} ${trendBg}`}>
                        <TrendIcon className="w-3 h-3" />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-main tracking-tight">{value}</h3>
                </div>
            </div>

            <Tooltip content={tooltip}>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Info className="w-4 h-4 text-muted" />
                </div>
            </Tooltip>
        </div>
    );
}
