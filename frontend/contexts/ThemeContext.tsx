"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Stamp BOTH theme representations on <html>:
 *  - data-theme  → the public-site chrome tokens (--c-*), shared with the
 *                  static pages and /assets/starta-theme.js
 *  - .light/.dark class → Tailwind `dark:` variants and the app tokens
 * Keeping them in lockstep is what stops a page from rendering half-dark or
 * flipping theme when the user crosses between static and React surfaces.
 */
function applyThemeToDocument(theme: Theme) {
    const el = document.documentElement;
    el.setAttribute("data-theme", theme);
    el.classList.remove("light", "dark");
    el.classList.add(theme);
    el.style.colorScheme = theme;
}

function readStoredTheme(): Theme {
    try {
        const saved = localStorage.getItem("theme");
        // LIGHT is the product default everywhere. The OS preference is
        // deliberately NOT consulted — theme changes only when the user asks.
        return saved === "dark" ? "dark" : "light";
    } catch {
        return "light";
    }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("light"); // Default to light (dark is opt-in via toggle)
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // The root layout's boot script already applied this before paint;
        // re-applying keeps React state and the DOM in agreement.
        const initialTheme = readStoredTheme();
        setTheme(initialTheme);
        applyThemeToDocument(initialTheme);

        // The static-page engine (/assets/starta-theme.js, used by the shared
        // header toggle on server-rendered pages) announces its changes. Mirror
        // them so this provider never drifts from the DOM.
        const onExternalChange = (event: Event) => {
            const next = (event as CustomEvent<{ theme?: string }>).detail?.theme;
            if (next === "dark" || next === "light") {
                setTheme(next);
                applyThemeToDocument(next);
            }
        };
        document.addEventListener("starta:themechange", onExternalChange);
        return () => document.removeEventListener("starta:themechange", onExternalChange);
    }, []);

    const handleSetTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        try {
            localStorage.setItem("theme", newTheme);
        } catch { /* private mode */ }
        applyThemeToDocument(newTheme);
    };

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";
        handleSetTheme(newTheme);
    };

    // Avoid hydration mismatch by rendering only after mount, or accept the risk for theme
    // For critical visual consistency, we ideally want to block, but simple return is okay here
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
