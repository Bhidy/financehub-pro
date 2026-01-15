"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("dark"); // Default to dark as per original design
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        // Check local storage or system preference
        const savedTheme = localStorage.getItem("theme") as Theme;

        // Mobile version defaults to light, others dark
        let defaultTheme: Theme = "dark";
        if (pathname?.startsWith("/mobile-ai-analyst")) {
            defaultTheme = "light";
        }

        const initialTheme = savedTheme || defaultTheme;

        setTheme(initialTheme);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(initialTheme);

        // World-class color-scheme management
        document.documentElement.style.colorScheme = initialTheme;
    }, []);

    const handleSetTheme = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem("theme", newTheme);
        document.documentElement.classList.remove("light", "dark");
        document.documentElement.classList.add(newTheme);

        // Sync with browser color-scheme
        document.documentElement.style.colorScheme = newTheme;
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
