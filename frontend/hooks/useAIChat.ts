"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { sendChatMessage } from "@/lib/api";

export interface Message {
    role: "user" | "assistant";
    content: string;
    data?: any;
}

export function useAIChat() {
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hello! I am your AI Market Analyst. Ask me about stock prices, valuations, or news."
        }
    ]);

    const mutation = useMutation({
        mutationFn: async (text: string) => {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            return await sendChatMessage(text, history);
        },
        onSuccess: (data) => {
            setMessages(prev => [
                ...prev,
                { role: "assistant", content: data.reply, data: data.data }
            ]);
        },
        onError: (err: any) => {
            console.error("AI Chat Error:", err);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: `System Error: ${err.message || "Connection to Market Brain Failed"}. Please check network.`
                }
            ]);
        }
    });

    const handleSend = () => {
        if (!query.trim()) return;
        const text = query;
        setQuery("");
        setMessages(prev => [...prev, { role: "user", content: text }]);
        mutation.mutate(text);
    };

    return {
        query,
        setQuery,
        messages,
        isLoading: mutation.isPending,
        handleSend
    };
}
