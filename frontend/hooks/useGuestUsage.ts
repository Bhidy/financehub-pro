"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEY = "fh_guest_usage";
const QUESTION_LIMIT = 5;

// ============================================================
// DEVICE FINGERPRINT
// ============================================================

function generateDeviceFingerprint(): string {
    // Check if we already have a fingerprint
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

    // Simple hash function
    const str = components.join("|");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Add random component for uniqueness
    const fingerprint = `${Math.abs(hash).toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("fh_device_fp", fingerprint);

    return fingerprint;
}

// ============================================================
// HOOK
// ============================================================

interface GuestUsageState {
    questionCount: number;
    canAskQuestion: boolean;
    remainingQuestions: number;
    incrementUsage: () => void;
    resetUsage: () => void;
    deviceFingerprint: string;
}

export function useGuestUsage(): GuestUsageState {
    const { isAuthenticated } = useAuth();
    const [questionCount, setQuestionCount] = useState(0);
    const [deviceFingerprint, setDeviceFingerprint] = useState("");

    // Initialize from localStorage on mount
    useEffect(() => {
        if (typeof window === "undefined") return;

        const fp = generateDeviceFingerprint();
        setDeviceFingerprint(fp);

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                setQuestionCount(data.count || 0);
            } catch (e) {
                console.error("Failed to parse guest usage:", e);
            }
        }
    }, []);

    // Save to localStorage when count changes
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (deviceFingerprint) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                count: questionCount,
                fingerprint: deviceFingerprint,
                lastUpdated: Date.now()
            }));
        }
    }, [questionCount, deviceFingerprint]);

    const incrementUsage = useCallback(() => {
        if (!isAuthenticated) {
            setQuestionCount(prev => prev + 1);
        }
    }, [isAuthenticated]);

    const resetUsage = useCallback(() => {
        setQuestionCount(0);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Authenticated users always have unlimited access
    if (isAuthenticated) {
        return {
            questionCount: 0,
            canAskQuestion: true,
            remainingQuestions: Infinity,
            incrementUsage: () => { },
            resetUsage: () => { },
            deviceFingerprint,
        };
    }

    return {
        questionCount,
        canAskQuestion: questionCount < QUESTION_LIMIT,
        remainingQuestions: Math.max(0, QUESTION_LIMIT - questionCount),
        incrementUsage,
        resetUsage,
        deviceFingerprint,
    };
}
