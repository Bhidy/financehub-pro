"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage, fetchSessionMessages } from "@/lib/api";

// ============================================================
// Types matching backend ChatResponse schema
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
}

export interface ChatResponse {
    message_text: string;
    message_text_ar?: string;
    language: "ar" | "en" | "mixed";
    cards: Card[];
    chart?: ChartPayload;
    actions: Action[];
    disclaimer?: string;
    meta: ResponseMeta;
    session_id?: string; // Top-level or from meta
}

export interface Message {
    role: "user" | "assistant";
    content: string;
    response?: ChatResponse; // Full structured response
    data?: any; // Legacy compatibility
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
}) {
    const [query, setQuery] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [usageLimitReached, setUsageLimitReached] = useState(false);  // Track limit status
    const [deviceFingerprint, setDeviceFingerprint] = useState<string>("");

    // Initialize device fingerprint on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setDeviceFingerprint(getDeviceFingerprint());
        }
    }, []);

    // Constant for the system initialization message
    const SYSTEM_WELCOME_MESSAGE: Message = {
        role: "assistant",
        content: "Chat initialized. Ready to assist."
    };

    // Initialize with system message to satisfy Desktop "Hero" view requirements (length === 1)
    const [messages, setMessages] = useState<Message[]>([SYSTEM_WELCOME_MESSAGE]);

    const mutation = useMutation({
        mutationFn: async (text: string) => {
            const history = messages
                .filter(m => m.role !== 'assistant' || m.content !== SYSTEM_WELCOME_MESSAGE.content)
                .map(m => ({ role: m.role, content: m.content }));

            // CRITICAL: Pass device fingerprint for guest tracking
            return await sendChatMessage(text, history, sessionId, config?.market, deviceFingerprint);
        },
        onSuccess: (data: ChatResponse) => {
            // =====================================================================
            // USAGE LIMIT CHECK - Detect backend's "limit reached" response
            // This should ONLY happen for guest users, never for authenticated users
            // =====================================================================
            if (data.meta?.intent === "USAGE_LIMIT_REACHED") {
                console.log("[useAIChat] 🚫 Guest usage limit reached - triggering modal");
                setUsageLimitReached(true);

                // Trigger callback if provided (for showing modal)
                if (config?.onUsageLimitReached) {
                    config.onUsageLimitReached();
                }

                // Remove the user's question that triggered the limit 
                // (they shouldn't see a failed attempt in their history)
                setMessages(prev => prev.slice(0, -1));
                return;  // Don't add the "limit reached" message to chat
            }

            // Reset limit flag on successful responses
            setUsageLimitReached(false);

            // Store session ID for context
            // Backend now returns session_id at top level, but fallback to meta just in case
            const newSessionId = data.session_id || data.meta?.entities?.session_id;
            if (newSessionId && sessionId !== newSessionId) {
                setSessionId(newSessionId);
            }

            // Client-side filter: Remove "Technical" actions as per user request
            if (data.actions) {
                data.actions = data.actions.filter(action =>
                    !action.label.toLowerCase().includes('technical')
                );
            }

            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: data.message_text,
                    response: data,
                    data: data // Legacy compatibility
                }
            ]);
        },
        onError: (err: any) => {
            console.error("AI Chat Error:", err);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: `Connection error. Please try again.`
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

    const loadSession = useCallback(async (id: string) => {
        setIsHistoryLoading(true);
        try {
            const history = await fetchSessionMessages(id);
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

                        response = {
                            message_text: msg.content,
                            language: "en",
                            cards: meta.cards || [],
                            chart: meta.chart,
                            actions: meta.actions || [],
                            meta: {
                                intent: meta.intent || "UNKNOWN",
                                confidence: meta.confidence || 1.0,
                                entities: {}, // Not fully preserved in simple migration
                                latency_ms: 0,
                                cached: true
                            }
                        } as ChatResponse;
                    }
                } catch (e) {
                    console.warn("Failed to parse message meta", e);
                }

                return {
                    role: msg.role,
                    content: msg.content,
                    response: response
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
        usageLimitReached  // Exposed for external monitoring
    };
}
