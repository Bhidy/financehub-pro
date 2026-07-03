'use client';

/**
 * Theme toggle for the server-rendered shell. Drives the site's own theme
 * engine (window.StartaTheme from /assets/starta-theme.js) so behavior and
 * persistence are identical to the designed static pages. A client component
 * because the script's one-time DOMContentLoaded binding can't survive App
 * Router soft navigations. Icon opacity is handled by the shell's
 * [data-theme="light"] CSS — no inline-style syncing needed.
 */

declare global {
    interface Window {
        StartaTheme?: { apply: (theme: string) => string; current: () => string };
    }
}

export default function ThemeToggle() {
    const toggle = () => {
        const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        if (window.StartaTheme) {
            window.StartaTheme.apply(next);
        } else {
            // Same storage key as starta-theme.js and the app ThemeProvider.
            document.documentElement.setAttribute('data-theme', next);
            try { window.localStorage.setItem('theme', next); } catch { /* private mode */ }
        }
    };

    return (
        <button id="themeToggle" onClick={toggle} className="control-btn group relative" aria-label="Toggle theme">
            <svg className="w-5 h-5 absolute opacity-100 dark-icon transition-opacity duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg className="w-5 h-5 absolute opacity-0 light-icon transition-opacity duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
        </button>
    );
}
