/**
 * GA4 event helpers (master-plan 4.4 — organic-conversion measurement).
 * gtag is loaded by the root layout / static heads; every call is guarded so
 * SSR, blocked analytics, or the Capacitor shell can never throw.
 */

declare global {
    interface Window {
        gtag?: (...args: unknown[]) => void;
    }
}

export function track(event: string, params?: Record<string, unknown>): void {
    try {
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
            window.gtag('event', event, params || {});
        }
    } catch {
        // analytics must never break the product
    }
}

let aichatFirstMessageSent = false;

/** Fires `aichat_first_message` once per page load (KPI: organic → AI usage). */
export function trackAiChatFirstMessage(): void {
    if (aichatFirstMessageSent) return;
    aichatFirstMessageSent = true;
    track('aichat_first_message');
}
