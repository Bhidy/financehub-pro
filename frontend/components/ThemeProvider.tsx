"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** THE site-wide theme contract, in one place:
 *  - LIGHT is the product default on EVERY surface (static pages, public
 *    server pages and the app pages alike). DARK is opt-in via the toggle.
 *  - The OS preference is deliberately NOT consulted.
 *  - Both representations are stamped together: the data-theme attribute
 *    (public chrome --c-* tokens) and the .light/.dark class (Tailwind
 *    `dark:` variants + app tokens), so no surface can render half-themed.
 * This provider previously defaulted to DARK and force-applied it on every
 * non-.seo-shell page, which flipped a light user to dark the moment they
 * opened /login, /register or /settings. Never reintroduce a second default.
 */
function readStoredTheme(): Theme {
    try {
        return localStorage.getItem("theme") === "dark" ? "dark" : "light";
    } catch {
        return "light";
    }
}

function applyThemeToDocument(theme: Theme) {
    const el = document.documentElement;
    el.classList.remove("light", "dark");
    el.classList.add(theme);
    el.setAttribute("data-theme", theme);
    el.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Matches the root layout's SSR default and its pre-paint boot script.
    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
        // The layout's boot script already resolved and applied this before
        // first paint; re-read so React state agrees with the DOM.
        const resolved = readStoredTheme();
        setTheme(resolved);
        applyThemeToDocument(resolved);

        // Mirror toggles coming from the static-page engine
        // (/assets/starta-theme.js drives the shared public header toggle).
        const onExternalChange = (event: Event) => {
            const next = (event as CustomEvent<{ theme?: string }>).detail?.theme;
            if (next === "dark" || next === "light") setTheme(next);
        };
        document.addEventListener("starta:themechange", onExternalChange);
        return () => document.removeEventListener("starta:themechange", onExternalChange);
    }, []);

    const toggleTheme = () => {
        const newTheme: Theme = theme === "dark" ? "light" : "dark";
        setTheme(newTheme);
        try {
            localStorage.setItem("theme", newTheme);
        } catch { /* private mode */ }
        applyThemeToDocument(newTheme);
        // Keep the vanilla-JS engine (static pages / shared header) in step.
        document.dispatchEvent(new CustomEvent("starta:themechange", { detail: { theme: newTheme } }));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
