"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/lib/api";

// ============================================================
// Types matching backend ChatResponse schema
// ============================================================

export interface Card {
    type: string;
    title?: string;
    data: Record<string, any>;
}

export interface ChartPayload {
    type: "candlestick" | "line" | "bar";
    symbol: string;
    title: string;
    data: Array<{
        time: string;
        open?: number;
        high?: number;
        low?: number;
        close?: number;
        volume?: number;
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

export function useAIChat() {
    const [query, setQuery] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hello! I'm your financial assistant. Ask me about stock prices, charts, financials, or dividends."
        }
    ]);

    const mutation = useMutation({
        mutationFn: async (text: string) => {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            return await sendChatMessage(text, history, sessionId);
        },
        onSuccess: (data: ChatResponse) => {
            // Store session ID for context
            if (!sessionId && data.meta?.entities?.session_id) {
                setSessionId(data.meta.entities.session_id);
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
        setMessages([{
            role: "assistant",
            content: "Chat cleared. How can I help you?"
        }]);
        setSessionId(null);
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
        isLoading: mutation.isPending,
        handleSend,
        handleAction,
        sendDirectMessage,
        clearHistory,
        sessionId
    };
}
