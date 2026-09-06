/**
 * ============================================================================
 * THE STARTA LOGO — one mark, one wordmark, one component
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The brand had FIVE different marks in production at once. The landing page
 * and every public surface (static pages, PublicPageShell, SiteNav, the mobile
 * drawer) drew a teal tile carrying the letter S beside the wordmark STARTA.
 * The signed-in app pages each invented their own:
 *
 *   /login            a lucide BarChart3 glyph  + "Starta"
 *   /register         a lucide TrendingUp glyph + "Starta"
 *   /forgot-password  a lucide TrendingUp glyph + "Starta"
 *   /settings         a lucide TrendingUp glyph + "Starta", and the glyph was
 *                     `text-slate-900 dark:text-white`, so in the LIGHT theme a
 *                     near-black icon sat on a teal tile
 *   /mobile           a bespoke S-with-arrow SVG    + "STARTA"
 *
 * …plus two wordmark casings and three tracking values. A visitor signing in
 * met a different brand than the one on the page they came from.
 *
 * THE CONTRACT — the landing page is canonical
 *   MARK      a teal tile, `bg-starta-teal`, with a white `S` in the display
 *             face. Never a stock icon: a chart glyph is what every other
 *             fintech uses and it is not this company's mark.
 *   WORDMARK  "STARTA", uppercase, display face, bold, tracking-widest.
 *   TONE      `default` follows the theme token (--c-text-main) for public
 *             chrome; `onDark` is the fixed-white variant for the auth pages'
 *             dark hero panel, which is dark in BOTH themes.
 *
 * Use this component for every React surface. The static HTML pages carry the
 * same markup inline (they cannot import React) and the mobile drawer builds it
 * in `starta-mobile-nav.js`; all three are checked by
 * scripts/verify-route-aliases.mjs, which fails the build if a brand tile is
 * given a lucide icon or the wordmark loses its casing.
 */

import Link from "next/link";

type LogoSize = "sm" | "md" | "lg";
type LogoTone = "default" | "onDark";

/** Tile / wordmark geometry per size. Matches the public chrome exactly. */
const SIZES: Record<LogoSize, { tile: string; glyph: string; word: string; gap: string }> = {
    // The nav bar on every public page.
    sm: { tile: "w-8 h-8 rounded", glyph: "text-xl", word: "text-lg", gap: "gap-3" },
    // The footer lockup, and the auth pages' hero panel.
    md: { tile: "w-9 h-9 rounded-xl", glyph: "text-xl", word: "text-xl", gap: "gap-3" },
    // Standalone lockups with room to breathe.
    lg: { tile: "w-11 h-11 rounded-xl", glyph: "text-2xl", word: "text-2xl", gap: "gap-3.5" },
};

export interface StartaLogoProps {
    size?: LogoSize;
    tone?: LogoTone;
    /** Wrap in a link to the given href. Omit for a decorative lockup. */
    href?: string;
    /** Mark only, no wordmark — for tight rails and avatars. */
    markOnly?: boolean;
    className?: string;
}

export function StartaLogo({
    size = "sm",
    tone = "default",
    href,
    markOnly = false,
    className = "",
}: StartaLogoProps) {
    const s = SIZES[size];
    // `text-main` is the theme token used across the public chrome; the auth
    // hero panel is dark in both themes, so it opts out with tone="onDark".
    const wordColor = tone === "onDark" ? "text-white" : "text-main";

    const lockup = (
        <>
            <span
                className={`${s.tile} bg-starta-teal flex items-center justify-center font-display font-bold text-white ${s.glyph} leading-none shrink-0`}
                aria-hidden="true"
            >
                S
            </span>
            {!markOnly && (
                <span className={`${s.word} font-display font-bold ${wordColor} tracking-widest leading-none`}>
                    STARTA
                </span>
            )}
        </>
    );

    const shell = `inline-flex items-center ${s.gap} ${className}`.trim();

    if (href) {
        return (
            <Link href={href} prefetch={false} className={`${shell} group`} aria-label="Starta Markets">
                {lockup}
            </Link>
        );
    }

    return (
        <span className={shell} aria-label="Starta Markets" role="img">
            {lockup}
        </span>
    );
}

export default StartaLogo;
