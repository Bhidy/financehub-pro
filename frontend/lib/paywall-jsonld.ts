/**
 * ============================================================================
 * PAYWALL / REGISTRATION-WALL STRUCTURED DATA
 * ============================================================================
 *
 * WHY THIS IS NOT OPTIONAL
 * When a page sends content to the browser and then withholds it from the
 * visitor — which is exactly what a blurred gate does — a crawler receives more
 * than a person does. Google treats that as CLOAKING unless the page declares
 * the gate in structured data. The declaration is `isAccessibleForFree: false`,
 * optionally narrowed with `hasPart` naming the CSS class that wraps the gated
 * region. Google applies the same rule to a free REGISTRATION wall as to a paid
 * subscription; there is no lighter treatment for "it's only a sign-up".
 *
 * The cost of getting this wrong is not theoretical. The Wall Street Journal
 * lost roughly 44% of its search traffic when it changed its gating model
 * without the corresponding markup — on a domain with authority this site does
 * not have.
 *
 * This site already had a gate on the fund analytics and emitted NO such markup.
 *
 * WHAT THIS DOES NOT LICENCE
 * Emitting the markup does not make it safe to gate anything. See
 * REGISTRATION_STRATEGY.md: content that answers a search query stays open, and
 * this helper exists only for the derived, personal blocks that legitimately sit
 * behind an account. Declaring a gate correctly and placing it wrongly still
 * costs the ranking — it just does so honestly.
 */

import { GATED_CLASS } from "./gate-i18n";

/**
 * The `hasPart` fragment to merge into a page's existing CreativeWork JSON-LD
 * (Article, NewsArticle, WebPage, and the other CreativeWork subtypes Google
 * supports for this).
 *
 * Merge it into the node that already describes the page rather than emitting a
 * second, competing node — two CreativeWork nodes for one URL is its own
 * problem. `isAccessibleForFree: true` on the parent is correct and deliberate:
 * the PAGE is free, only the named part is not, which is what a registration
 * wall over one section actually means.
 */
export function gatedPart() {
    return {
        isAccessibleForFree: true,
        hasPart: {
            "@type": "WebPageElement",
            isAccessibleForFree: false,
            // Class selector only — Google does not accept id or attribute
            // selectors here. Must stay in step with GATED_CLASS; build-gated.
            cssSelector: `.${GATED_CLASS}`,
        },
    } as const;
}

/**
 * Merge the declaration into an existing JSON-LD object. Returns a new object;
 * the input is not mutated.
 *
 * Pass `gated: false` for a page that renders no gate at all — it then declares
 * plainly that everything is free, which is the honest signal for a Tier 1 page
 * and costs nothing to state.
 */
export function withGateDeclaration<T extends Record<string, unknown>>(
    node: T,
    gated: boolean
): T & Record<string, unknown> {
    if (!gated) return { ...node, isAccessibleForFree: true };
    return { ...node, ...gatedPart() };
}
