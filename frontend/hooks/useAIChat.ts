"use client";

/**
 * ⚠️ ============================================================================
 * ⚠️ PROTECTED CODE - DO NOT MODIFY WITHOUT EXPLICIT USER REQUEST
 * ⚠️ ============================================================================
 * 
 * The ChatResponse interface defines the 4-Layer Response Structure:
 *   - conversational_text (Layer 1: Greeting/Opening)
 *   - cards (Layer 2: Data Cards)
 *   - learning_section (Layer 3: Educational bullets)
 *   - follow_up_prompt (Layer 4: Suggested next action)
 * 
 * AI Agents: DO NOT modify these type definitions without explicit user request.
 * See GEMINI.md section "🔒 PROTECTED: 4-Layer Chatbot Response Structure"
 * ⚠️ ============================================================================
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, fetchSessionMessages } from "@/lib/api";

// ============================================================
// Types matching backend ChatResponse schema - PROTECTED
// ============================================================

export interface Card {
    type: string;
    title?: string;
    data: Record<string, any>;
}

export interface ChartPayload {
    type: "candlestick" | "line" | "bar" | "pie" | "donut" | "column" | "radar" | "area" | "heatmap" | "treemap" | "radialBar" | "gauge" | "financial_growth";
    symbol: string;
    title: string;
    data: Array<{
        time?: string;
        label?: string;
        value?: number;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
        revenue?: number;
        net_income?: number;
        operating_income?: number;
    }>;
    range: string;
}

export interface Action {
    label: string;
    label_ar?: string;
    action_type: "query" | "navigate" | "filter";
    payload: string;
}

export interface ResponseMeta {
    intent: string;
    confidence: number;
    entities: Record<string, any>;
    latency_ms: number;
    cached: boolean;
    as_of?: string;
    answer_grounding?: {
        grounded: boolean;
        as_of?: string | null;
        period?: string | null;
        source_tables: string[];
        missing_requirements: string[];
        analysis_confidence: number;
    };
}

export interface ChatResponse {
    success?: boolean; // Backend execution status (true=pass, false=fail)
    response_status?: "pass" | "fail"; // Frontend-normalized status for UI/QA hooks
    message_text: string;
    conversational_text?: string; // New Hybrid Layer
    framework_text?: string; // NEW: Analytical framework section
    fact_explanations?: Record<string, string>; // Legacy Fact Layer

    // NEW: Structured Response Components (HTML Mockup Match)
    data_card?: {
        label?: string;
        icon?: string;
        price: string;
        change: string;
        change_positive: boolean;
        volume_context?: string;
    };
    bull_case?: {
        variant: 'success' | 'warning' | 'info' | 'neutral';
        title: string;
        items: string[];
    };
    bear_case?: {
        variant: 'success' | 'warning' | 'info' | 'neutral';
        title: string;
        items: string[];
    };
    insight_cards?: Array<{
        variant: 'success' | 'warning' | 'info' | 'neutral';
        title: string;
        items: string[];
    }>;
    stock_list?: Array<{
        ticker: string;
        company_name: string;
        score: number;
        metrics: Record<string, string>;
    }>;
    macro_score?: {
        score: number;
        max_score?: number;
        assessment: string;
        assessment_detail?: string;  // NEW: Extended assessment
        factors: Array<{
            name: string;
            points: number;
            max_points: number;
            status: 'positive' | 'neutral' | 'negative';
        }>;
        positives?: string[];  // NEW: What's working
        negatives?: string[];  // NEW: Concerns
    };
    comparison_table?: {
        headers: string[];
        rows: Array<{ metric: string; values: string[] }>;
        personality_profiles?: Record<string, string>;
    };
    educational_cards?: Array<{
        variant: 'definition' | 'example' | 'formula' | 'when_misleading';
        title: string;
        content: string;
    }>;
    disclaimer_card?: {
        icon?: string;
        title?: string;
        text?: string;
    };

    // NEW: Premium World-Class Components (Phase 2)
    framework_card?: {
        icon?: string;
        title: string;
        subtitle?: string;
        items: string[];
        border_color?: 'blue' | 'green' | 'amber' | 'teal';
    };
    character_cards?: Array<{
        emoji: string;
        nickname: string;
        ticker: string;
        company_name?: string;
        profile: string;
        good: string[];
        bad: string[];
    }>;
    quantified_drivers?: {
        title?: string;
        icon?: string;
        drivers: Array<{
            name: string;
            impact: string;
            detail?: string;
        }>;
        total_impact?: string;
    };
    index_composition?: {
        index_name: string;
        icon?: string;
        sectors: Array<{
            name: string;
            weight: string;
            constituents: string[];
        }>;
        recent_changes?: {
            added?: string[];
            removed?: string[];
        };
        top_by_weight?: Array<{ ticker: string; weight: string }>;
        characteristics?: string;
    };

    // Existing structured components
    learning_section?: {  // Educational bullets
        title: string;
        items: string[];
    };
    follow_up_prompt?: string;  // Soft follow-up suggestion
    followups?: Array<{
        text: string;
        payload: string;
        type: string;
        anchor_symbol?: string | null;
        anchor_symbols?: string[];
    }>; // Dynamic follow-up chips

    // UI elements
    message_text_ar?: string;
    language: "ar" | "en" | "mixed";
    cards: Card[];
    chart?: ChartPayload;
    actions: Action[];
    disclaimer?: string;
    meta: ResponseMeta;
    session_id?: string; // Top-level or from meta
    message_id?: number; // DB message ID for sharing isolated chats
}


export interface Message {
    id?: number;
    role: "user" | "assistant";
    content: string;
    response?: ChatResponse; // Full structured response
    data?: any; // Legacy compatibility
    isHistorical?: boolean;
}

const ensureArray = <T = any>(value: any): T[] => Array.isArray(value) ? value : [];

const GLOBAL_OPENING_STRIP_PATTERNS: RegExp[] = [
    /You are absolutely focusing on the right metrics here\. Validating this specific angle reveals the true underlying trend of the asset\.\s*/i,
    /Here is the complete picture based on the (?:latest available data|today(?:'|’)s session activity)\.\s*Let(?:'|’)s go through the numbers step-by-step\.?\s*/i,
    /إليك الصورة الكاملة بناءً على (?:أحدث البيانات المتاحة|نشاط جلسة اليوم)\.\s*دعنا نستعرض الأرقام خطوة بخطوة\.?\s*/i,
];

function stripGlobalBoilerplate(value: any): string {
    let text = String(value ?? "");
    for (const pattern of GLOBAL_OPENING_STRIP_PATTERNS) {
        text = text.replace(pattern, "");
    }
    return text.trim();
}

function canonicalizeCardType(value: any): string {
    const raw = String(value ?? "").trim();
    if (!raw) return raw;
    // Legacy backend enum serialization variants:
    // - CardType.STATS
    // - cardtype.stats
    if (/^cardtype\./i.test(raw)) {
        return raw.replace(/^cardtype\./i, "").toLowerCase();
    }
    if (/^CardType\./.test(raw)) {
        return raw.replace(/^CardType\./, "").toLowerCase();
    }
    return raw.toLowerCase();
}

function canonicalizeChartType(value: any): string {
    const raw = String(value ?? "").trim();
    if (!raw) return raw;
    if (/^charttype\./i.test(raw)) {
        return raw.replace(/^charttype\./i, "").toLowerCase();
    }
    if (/^ChartType\./.test(raw)) {
        return raw.replace(/^ChartType\./, "").toLowerCase();
    }
    return raw.toLowerCase();
}

function sanitizeChatResponse(raw: any): ChatResponse {
    const metaRaw = (raw && typeof raw.meta === "object") ? raw.meta : {};
    const confidence = Number(metaRaw?.confidence);
    const latencyMs = Number(metaRaw?.latency_ms);
    const normalizedCards = ensureArray<Card>(raw?.cards).map((c: any) => ({
        ...c,
        type: canonicalizeCardType(c?.type),
        data: (c?.data && typeof c.data === "object") ? c.data : {}
    }));
    const normalizedMessageText = stripGlobalBoilerplate(typeof raw?.message_text === "string"
        ? raw.message_text
        : String(raw?.conversational_text || raw?.message || ""));
    const normalizedConversationalText = stripGlobalBoilerplate(raw?.conversational_text || "");
    const backendStatus = raw?.response_status === "pass" || raw?.response_status === "fail"
        ? raw.response_status
        : undefined;
    const explicitSuccess = typeof raw?.success === "boolean" ? raw.success : undefined;
    const inferredSuccess = explicitSuccess ?? (backendStatus ? backendStatus === "pass" : true);
    const responseStatus: "pass" | "fail" = backendStatus ?? (inferredSuccess ? "pass" : "fail");
    const safeMessageText = normalizedMessageText
        || normalizedConversationalText
        || (inferredSuccess && normalizedCards.length > 0
            ? "Analysis is ready in the cards below."
            : "");
    const followupNoiseTokens = new Set(["ROE", "ROA", "EPS", "PE", "PB", "EGX", "TTM", "NPL", "NIM"]);
    const seenFollowupPayloads = new Set<string>();
    const seenFollowupTexts = new Set<string>();
    const normalizedFollowups = ensureArray(raw?.followups).map((f: any) => {
        const text = String(f?.text || "").trim();
        let payload = String(f?.payload || f?.text || "").trim();
        const anchor_symbol = f?.anchor_symbol ? String(f.anchor_symbol).trim().toUpperCase() : undefined;
        const anchor_symbols = ensureArray(f?.anchor_symbols).map((s: any) => String(s).trim().toUpperCase()).filter(Boolean);

        // Frontend safety-net: repair accidental self-compare payloads if an alternate anchor exists.
        if (/^compare\b/i.test(payload)) {
            const rawTokens = (payload.toUpperCase().match(/\b[A-Z0-9]{2,6}\b/g) || []).filter((tok) => !followupNoiseTokens.has(tok));
            const first = rawTokens[0];
            const second = rawTokens[1];
            const alternate = anchor_symbols.find((s: string) => s && s !== first);
            if (first && second && first === second && alternate) {
                payload = `Compare ${first} vs ${alternate}`;
            }
        }

        return {
            ...f,
            text,
            payload,
            type: String(f?.type || "next_step").trim().toLowerCase(),
            anchor_symbol,
            anchor_symbols,
        };
    }).filter((f: any) => {
        if (!f?.text || !f?.payload) return false;
        const payloadKey = String(f.payload).toLowerCase();
        const textKey = String(f.text).toLowerCase();
        if (seenFollowupPayloads.has(payloadKey) || seenFollowupTexts.has(textKey)) {
            return false;
        }
        seenFollowupPayloads.add(payloadKey);
        seenFollowupTexts.add(textKey);
        return true;
    });

    return {
        ...raw,
        success: inferredSuccess,
        response_status: responseStatus,
        message_id: raw?.message_id,
        message_text: safeMessageText,
        conversational_text: normalizedConversationalText,
        language: (raw?.language === "ar" || raw?.language === "en" || raw?.language === "mixed")
            ? raw.language
            : "en",
        cards: normalizedCards,
        actions: ensureArray<Action>(raw?.actions),
        chart: raw?.chart ? {
            ...raw.chart,
            type: canonicalizeChartType(raw?.chart?.type)
        } : raw?.chart,
        followups: normalizedFollowups,
        insight_cards: ensureArray(raw?.insight_cards),
        stock_list: ensureArray(raw?.stock_list),
        educational_cards: ensureArray(raw?.educational_cards),
        character_cards: ensureArray(raw?.character_cards),
        meta: {
            intent: typeof metaRaw?.intent === "string" ? metaRaw.intent : "UNKNOWN",
            confidence: Number.isFinite(confidence) ? confidence : 0,
            entities: (metaRaw?.entities && typeof metaRaw.entities === "object") ? metaRaw.entities : {},
            latency_ms: Number.isFinite(latencyMs) ? latencyMs : 0,
            cached: Boolean(metaRaw?.cached),
            as_of: metaRaw?.as_of,
            answer_grounding: metaRaw?.answer_grounding,
        }
    } as ChatResponse;
}

// ============================================================
// Hook
// ============================================================

// Helper to get or create device fingerprint (same logic as useGuestUsage)
function getDeviceFingerprint(): string {
    if (typeof window === 'undefined') return '';

    const stored = localStorage.getItem("fh_device_fp");
    if (stored) return stored;

    // Generate a new fingerprint using available browser data
    const components = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 0,
        (navigator as any).deviceMemory || 0,
    ];

    const str = components.join("|");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    const fingerprint = `${Math.abs(hash).toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("fh_device_fp", fingerprint);
    return fingerprint;
}

export function useAIChat(config?: {
    market?: string;
    onUsageLimitReached?: () => void;  // Callback when guest limit is exceeded
    lang?: 'en' | 'ar';
    sharedSessionId?: string; // Add support for read-only shared sessions
    isSharedMessageView?: boolean; // Support for isolated message sharing
}) {
    const [query, setQuery] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(config?.sharedSessionId || null);
    const sessionIdRef = useRef<string | null>(null); // Ref to avoid stale closures
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [usageLimitReached, setUsageLimitReached] = useState(false);
    const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");
    const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
    const hasArabicChars = (text?: string) => /[\u0600-\u06FF]/.test(text || "");

    // Initialize device fingerprint and session on mount (RUNS ONCE)
    // CRITICAL FIX: Was [config] which created infinite re-render loop because
    // config is a new object ref every render → triggers effect → state update → re-render → repeat
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDeviceFingerprint(getDeviceFingerprint());

            // Check if we are in shared read-only mode first
            if (config?.sharedSessionId) {
                // If there's a specific instruction to load a shared ID, don't fall back to local storage auth
                return;
            }

            // ROBUST SESSION MANAGEMENT (v2.2 FIX)
            // 1. Try to load specific session
            let activeSession = localStorage.getItem("fh_chat_session");

            // 2. If missing, generate immediately (Client-Side Authority)
            if (!activeSession) {
                activeSession = `sess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                localStorage.setItem("fh_chat_session", activeSession);
            }

            // 3. Set state and ref synchronously
            setSessionId(activeSession);
            sessionIdRef.current = activeSession;

            console.log(`[useAIChat] 🟢 Session Initialized: ${activeSession}`);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Keep Ref in sync with State
    useEffect(() => {
        if (sessionId) {
            sessionIdRef.current = sessionId;
            if (typeof window !== 'undefined') {
                localStorage.setItem("fh_chat_session", sessionId);
            }
        }
    }, [sessionId]);

    const systemMessageText = config?.lang === "ar"
        ? "تم تهيئة المحادثة. جاهز للمساعدة."
        : "Chat initialized. Ready to assist.";

    const SYSTEM_WELCOME_MESSAGE: Message = {
        role: "assistant",
        content: systemMessageText
    };

    const [messages, setMessages] = useState<Message[]>([SYSTEM_WELCOME_MESSAGE]);

    // CRITICAL FIX: Ref to track latest messages for mutation closure
    const messagesRef = useRef<Message[]>(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const mutation = useMutation({
        mutationFn: async (text: string) => {
            const history = messagesRef.current
                .filter(m => m.role !== 'assistant' || m.content !== SYSTEM_WELCOME_MESSAGE.content)
                .map(m => ({ role: m.role, content: m.content }));

            // CRITICAL FIX: Use Ref to get the absolutely latest session ID
            // preventing stale closure issues in the mutation callback
            const currentSessionId = sessionIdRef.current;

            console.log(`[useAIChat] 🚀 Sending Message: "${text.substring(0, 10)}..." | SessionID: ${currentSessionId}`);

            // RETRY LOGIC (Chief Expert Fix for Stability)
            // Attempt up to 3 times with exponential backoff
            let lastError;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const response = await sendChatMessage(text, history, currentSessionId, config?.market, deviceFingerprint, config?.lang);
                    return response;
                } catch (err) {
                    lastError = err;
                    console.warn(`[useAIChat] ⚠️ Attempt ${attempt + 1} failed. Retrying...`, err);
                    if (attempt < 2) {
                        // Wait 1s, then 2s
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                    }
                }
            }
            throw lastError;
        },
        onSuccess: (data: ChatResponse) => {
            const safeData = sanitizeChatResponse(data as any);
            // ... (rest of logic) ...

            // Store session ID for context (and persistence via effect)
            const newSessionId = safeData.session_id || safeData.meta?.entities?.session_id;
            if (newSessionId && sessionId !== newSessionId) {
                setSessionId(newSessionId);
                // Ref is updated by effect, but update immediate for safety in this cycle
                sessionIdRef.current = newSessionId;
                localStorage.setItem("fh_chat_session", newSessionId);
            }

            // Signal sidebars to refresh chat history
            setHistoryRefreshTrigger(prev => prev + 1);

            // Client-side filter: Remove "Technical" actions as per user request
            if (safeData.actions) {
                safeData.actions = safeData.actions.filter(action =>
                    !String(action?.label || "").toLowerCase().includes('technical')
                );
            }

            setMessages(prev => [
                ...prev,
                {
                    id: safeData.message_id,
                    role: "assistant",
                    content: safeData.message_text,
                    response: safeData,
                    data: safeData // Legacy compatibility
                }
            ]);
        },
        onError: (err: any) => {
            console.error("AI Chat Error:", err);
            const lastUserMessage = [...messagesRef.current].reverse().find(m => m.role === "user")?.content || "";
            const isArabic = config?.lang === "ar" || hasArabicChars(lastUserMessage);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: isArabic ? "خطأ في الاتصال. يرجى المحاولة مرة أخرى." : "Connection error. Please try again."
                }
            ]);
        }
    });

    const handleSend = useCallback(() => {
        if (!query.trim()) return;
        const text = query;
        setQuery("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        mutation.mutate(text);
    }, [query, mutation]);

    const handleAction = useCallback((action: Action) => {
        if (action.action_type === "query") {
            setQuery(action.payload);
            // Auto-send after slight delay
            setTimeout(() => {
                setMessages(prev => [...prev, { role: "user", content: action.payload }]);
                mutation.mutate(action.payload);
            }, 100);
        } else if (action.action_type === "navigate") {
            window.location.href = action.payload;
        }
    }, [mutation]);

    const clearHistory = useCallback(() => {
        setMessages([SYSTEM_WELCOME_MESSAGE]);
        setSessionId(null);
    }, []);

    const loadSession = useCallback(async (id: string, isShared: boolean = false) => {
        setIsHistoryLoading(true);
        try {
            // Use the correct public endpoint if it is a shared session/message
            const history = await (isShared ?
                (config?.isSharedMessageView ? (await import('@/lib/api')).fetchSharedMessagePair(id) : (await import('@/lib/api')).fetchSharedSessionMessages(id))
                : fetchSessionMessages(id));

            if (!history || history.length === 0) {
                setMessages([SYSTEM_WELCOME_MESSAGE]);
                setSessionId(id);
                return;
            }

            const newMessages: Message[] = history.map((msg: any) => {
                let response = undefined;
                try {
                    // Parse rich metadata for assistants
                    if (msg.role === 'assistant' && msg.meta) {
                        // Ensure meta is object
                        const meta = typeof msg.meta === 'string' ? JSON.parse(msg.meta) : msg.meta;

                        response = sanitizeChatResponse({
                            message_text: msg.content,
                            conversational_text: meta.conversational_text,
                            fact_explanations: meta.fact_explanations,
                            language: hasArabicChars(`${msg.content || ""} ${meta.conversational_text || ""}`) ? "ar" : "en",
                            cards: meta.cards || [],
                            chart: meta.chart,
                            actions: meta.actions || [],
                            meta: {
                                intent: meta.intent || "UNKNOWN",
                                confidence: meta.confidence || 1.0,
                                entities: {},
                                latency_ms: 0,
                                cached: true,
                                answer_grounding: meta.answer_grounding || meta?.meta?.answer_grounding,
                            },
                            // CRITICAL: Spread all other top-level fields (structured_narrative, comparison_table, etc.)
                            ...meta
                        });
                    }
                } catch (e) {
                    console.warn("Failed to parse message meta", e);
                }

                return {
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    response: response,
                    isHistorical: true
                };
            });

            setMessages(newMessages);
            setSessionId(id);
        } catch (e) {
            console.error("Failed to load session", e);
        } finally {
            setIsHistoryLoading(false);
        }
    }, []);

    // Direct send - bypasses query state (for auto-send from suggestions)
    const sendDirectMessage = useCallback((text: string) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { role: "user", content: text }]);
        mutation.mutate(text);
    }, [mutation]);

    // Effect to initialize device fingerprint (Client Side Only) AND load shared session if present
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDeviceFingerprint(getDeviceFingerprint());
        }

        if (config?.sharedSessionId) {
            loadSession(config.sharedSessionId, true);
        }
    }, [config?.sharedSessionId, loadSession]);

    // Keep history persistence
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    return {
        query,
        setQuery,
        messages,
        isLoading: mutation.isPending || isHistoryLoading,
        handleSend,
        handleAction,
        sendDirectMessage,
        clearHistory, // Acts as "New Chat"
        sessionId,
        loadSession, // Exported!
        usageLimitReached,  // Exposed for external monitoring
        historyRefreshTrigger // Signals to sync UI
    };
}
