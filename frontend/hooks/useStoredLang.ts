/**
 * ============================================================================
 * STORED-LANGUAGE HOOK — single-URL pages (mechanism #2)
 * ============================================================================
 *
 * The site runs TWO i18n mechanisms side by side:
 *
 *   1. URL-based  — SEO/server pages have real /ar twins (/RiskAssessment ↔
 *                   /ar/RiskAssessment). The URL *is* the language.
 *   2. Storage-based — single-URL pages (static /Funds, /News, /Learn and the
 *                   React app pages such as /login, /register,
 *                   /forgot-password) read the language from storage.
 *
 * This hook implements mechanism #2 and MUST resolve the language exactly the
 * way `public/assets/starta-lang-boot.js` does, or a visitor would see one
 * language in the chrome and another in the page body:
 *
 *   localStorage "starta-lang" (canonical) || "lang" (legacy fallback)
 *   → "en" only when the stored value is literally "en"
 *   → otherwise "ar" (the site DEFAULT is Arabic)
 *
 * HYDRATION SAFETY
 * ----------------
 * localStorage does not exist on the server, so the value cannot be known at
 * SSR time. `useSyncExternalStore` is the sanctioned React primitive for this:
 * the server snapshot (and the first, hydrating client render) returns the
 * documented default, and React re-renders with the real stored value straight
 * after hydration commits. Reading storage in the render body — or in a
 * useState initialiser — would produce the server/client mismatch this repo has
 * already been bitten by, so do not "simplify" this to that.
 */

"use client";

import { useSyncExternalStore } from "react";

export type StoredLang = "en" | "ar";

// Keys and the resolution rule come from the ONE contract (lib/lang.ts R4);
// this hook is only the React binding for it.
import { LANG_STORAGE_KEY as STORAGE_KEY, LANG_LEGACY_KEY as LEGACY_STORAGE_KEY, DEFAULT_LANG, resolveStoredLang } from "@/lib/lang";

/**
 * Event any client code can dispatch on `window` after changing the stored
 * language, so subscribers in the same document update without a reload.
 * (The native `storage` event only fires in OTHER tabs.)
 */
export const LANG_CHANGE_EVENT = "starta-lang-change";

/**
 * Resolve the stored language with the exact lang-boot rule.
 * Safe to call on the server / with storage disabled — falls back to Arabic.
 */
export function readStoredLang(): StoredLang {
    if (typeof window === "undefined") return DEFAULT_LANG;
    try {
        return resolveStoredLang(
            window.localStorage.getItem(STORAGE_KEY) ||
            window.localStorage.getItem(LEGACY_STORAGE_KEY),
        );
    } catch {
        // Storage unavailable (privacy mode): keep the Arabic default.
        return DEFAULT_LANG;
    }
}

function subscribe(onStoreChange: () => void): () => void {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(LANG_CHANGE_EVENT, onStoreChange);
    return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(LANG_CHANGE_EVENT, onStoreChange);
    };
}

/** Stable server/hydration snapshot: the site default language. */
function getServerSnapshot(): StoredLang {
    return DEFAULT_LANG;
}

/**
 * Current language for storage-based pages. Returns "ar" during SSR and the
 * hydrating render, then the visitor's real preference once mounted.
 */
export function useStoredLang(): StoredLang {
    return useSyncExternalStore(subscribe, readStoredLang, getServerSnapshot);
}
