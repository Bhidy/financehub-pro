"use client";

import { useState, useEffect, useCallback } from 'react';

export interface ChatSession {
    id: string;
    title: string;
    preview: string;
    timestamp: number;
    messages: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}

const STORAGE_KEY = 'finny_mobile_chat_history';
const MAX_SESSIONS = 20;

export function useMobileChatHistory() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    // Load sessions from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored) as ChatSession[];
                setSessions(parsed);
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
        }
    }, []);

    // Save sessions to localStorage
    const persistSessions = useCallback((newSessions: ChatSession[]) => {
        try {
            // Keep only the most recent sessions
            const trimmed = newSessions.slice(0, MAX_SESSIONS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
            setSessions(trimmed);
        } catch (e) {
            console.error('Failed to save chat history:', e);
        }
    }, []);

    // Create a new session
    const createSession = useCallback(() => {
        const id = `session_${Date.now()}`;
        setCurrentSessionId(id);
        return id;
    }, []);

    // Save/update a session
    const saveSession = useCallback((messages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
        if (messages.length < 2) return; // Don't save empty sessions

        const userMessage = messages.find(m => m.role === 'user');
        if (!userMessage) return;

        const sessionId = currentSessionId || `session_${Date.now()}`;

        const session: ChatSession = {
            id: sessionId,
            title: userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : ''),
            preview: messages[messages.length - 1]?.content.slice(0, 80) || '',
            timestamp: Date.now(),
            messages: messages.filter(m => m.role === 'user' || m.role === 'assistant'),
        };

        // Update or add session
        const existingIndex = sessions.findIndex(s => s.id === sessionId);
        let newSessions: ChatSession[];

        if (existingIndex >= 0) {
            newSessions = [...sessions];
            newSessions[existingIndex] = session;
        } else {
            newSessions = [session, ...sessions];
        }

        persistSessions(newSessions);
        setCurrentSessionId(sessionId);
    }, [currentSessionId, sessions, persistSessions]);

    // Load a session
    const loadSession = useCallback((sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            setCurrentSessionId(sessionId);
            return session.messages;
        }
        return null;
    }, [sessions]);

    // Delete a session
    const deleteSession = useCallback((sessionId: string) => {
        const newSessions = sessions.filter(s => s.id !== sessionId);
        persistSessions(newSessions);
        if (currentSessionId === sessionId) {
            setCurrentSessionId(null);
        }
    }, [sessions, currentSessionId, persistSessions]);

    // Clear all sessions
    const clearAllSessions = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSessions([]);
        setCurrentSessionId(null);
    }, []);

    return {
        sessions,
        currentSessionId,
        createSession,
        saveSession,
        loadSession,
        deleteSession,
        clearAllSessions,
    };
}
