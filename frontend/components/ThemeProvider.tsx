"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark"); // Default to dark

    useEffect(() => {
        // Public-chrome pages (PublicPageShell renders .seo-shell) are themed
        // by /assets/starta-theme.js, which shares this "theme" storage key
        // but defaults to LIGHT like the designed static pages. Don't re-apply
        // the app's dark default here, or SSR pages flip dark after hydration.
        if (document.querySelector(".seo-shell")) return;

        // Check localStorage or System Preference on mount
        const savedTheme = localStorage.getItem("theme") as Theme | null;
        const resolvedTheme = savedTheme || "dark";
        
        setTheme(resolvedTheme);
        
        // Sync DOM on mount
        if (resolvedTheme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
            document.documentElement.style.colorScheme = "light";
        } else {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            document.documentElement.setAttribute("data-theme", "dark");
            document.documentElement.style.colorScheme = "dark";
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "dark" ? "light" : "dark";

        // 1. Update State (Trigger UI Re-render)
        setTheme(newTheme);

        // 2. Persist
        localStorage.setItem("theme", newTheme);

        // 3. Sync DOM
        if (newTheme === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
            document.documentElement.style.colorScheme = "light";
        } else {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            document.documentElement.setAttribute("data-theme", "dark");
            document.documentElement.style.colorScheme = "dark";
        }
        
        // Dispatch custom event for vanilla JS compatibility
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
