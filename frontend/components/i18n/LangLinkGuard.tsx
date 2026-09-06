'use client';

/**
 * ============================================================================
 * LANGUAGE LINK GUARD — the safety net the React tree never had
 * ============================================================================
 *
 * ══ THE DEFECT THIS EXISTS TO END ═══════════════════════════════════════════
 * Reported on /ar/symbol/COMI: every item in the header nav opened the ENGLISH
 * page. Measured in a real browser, five links on that page carried Arabic
 * labels and English destinations:
 *
 *     /Funds «الصناديق الاستثمارية»   /Market-Pulse «نبض السوق»
 *     /News «أخبار السوق»             /Learn «تعلّم»
 *
 * That page rendered its own hand-written nav with raw hrefs. It has been
 * rewritten to read lib/nav.json through localizedHref — but the same defect
 * had already been fixed, one call site at a time, in the nav, the breadcrumbs,
 * the footer, the mobile drawer and the static CTAs. Fixing call sites does not
 * end a class of bug; it only ends one instance of it and waits for the next.
 *
 * ══ WHY THE STATIC PAGES NEVER HAD THIS BUG ═════════════════════════════════
 * Because they DO have a net. public/assets/starta-lang-boot.js installs a
 * delegated, capture-phase anchor localizer on every static page: whatever an
 * author writes, the href is corrected before the browser acts on it. Nothing
 * equivalent ever existed on the React side, so ~40 server routes and every
 * client island depended entirely on each author remembering `localizedHref`
 * at each call site. The symbol page is what forgetting looks like.
 *
 * This file is that same net, for the React tree. Mounted once in
 * app/layout.tsx, it covers every React route — server-rendered pages, client
 * islands, and anything added later by anyone.
 *
 * ══ WHY IT NEEDS ITS OWN HANDLER AND CANNOT REUSE THE STATIC ONE ════════════
 * The static localizer rewrites the href ATTRIBUTE. That is enough for a plain
 * <a>, and it is not enough here: next/link navigates from its own `href` prop
 * and never reads the attribute back, so an attribute rewrite would be silently
 * ignored on exactly the links this tree is built from. So a left click on a
 * link that needs correcting is cancelled and re-issued at the right URL.
 *
 * The navigation is a full document load rather than router.push, deliberately:
 *   · every correction it makes is a cross-LANGUAGE move, which changes the
 *     document's tree, its <html lang/dir> and its shell — a soft transition
 *     between them buys nothing;
 *   · several Arabic twins (/ar/Funds, /ar/News, /ar/Learn, /ar/Market-Pulse)
 *     are Route Handlers serving designed HTML shells, not React pages, and the
 *     client router cannot soft-navigate into those;
 *   · it only ever fires on links that are WRONG today. A link that is already
 *     correct is never touched, so no working navigation is made slower.
 *
 * ══ WHAT IT DELIBERATELY DOES NOT TOUCH ═════════════════════════════════════
 *   · anything already under /ar
 *   · routes with no Arabic twin (single-URL pages carry language in storage)
 *   · external hosts, mailto:, tel:, #fragments, download links, target=_blank
 *   · modified clicks (⌘/ctrl/shift/alt/middle) — those get the attribute
 *     rewrite instead, so "open in new tab" lands on the right page without
 *     the guard hijacking the gesture
 *   · the language switcher, which points at the other tree ON PURPOSE and is
 *     marked with data-lang-switch (see the EN/ع control in PublicPageShell)
 *
 * ══ AND IT IS INVISIBLE TO SEARCH AND ANSWER ENGINES ════════════════════════
 * It renders nothing, adds nothing to the document, and removes nothing. Every
 * href in the server HTML is exactly what it was; a crawler reads the same
 * bytes. It only acts on a real interaction in a real browser.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { localizedHref } from '@/lib/localized-href';
import { readStoredLang } from '@/hooks/useStoredLang';
import type { Lang } from '@/lib/lang';

/**
 * THE LANGUAGE, resolved the way lib/lang.ts mandates and in that order:
 * R3 — an /ar URL is an explicit language choice and outranks storage;
 * R4 — otherwise the ONE resolver reads the ONE pair of keys.
 *
 * Note it never consults <html lang>. The root layout stamps that from the
 * request URL, which is right for a twinned route and wrong for a single-URL
 * page: /symbol/COMI renders in Arabic for a reader whose stored preference is
 * Arabic while the document still says lang="en". Trusting that attribute here
 * would leave precisely those readers on the English tree.
 */
function currentLang(): Lang {
    if (typeof window === 'undefined') return 'en';
    if (/^\/ar(\/|$)/.test(window.location.pathname)) return 'ar';
    return readStoredLang();
}

/** The anchor a click landed on, if it is an internal link we may rewrite. */
function candidate(event: Event): HTMLAnchorElement | null {
    const target = event.target as Element | null;
    if (!target || typeof target.closest !== 'function') return null;
    const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return null;

    // Same-document, same-origin, ordinary navigation only.
    if (anchor.hasAttribute('download')) return null;
    if (anchor.target && anchor.target !== '_self') return null;
    // The EN / ع control and the "…in English" cross-links point at the other
    // tree BY DESIGN. Correcting them would make the language switcher unable
    // to switch language.
    if (anchor.hasAttribute('data-lang-switch')) return null;
    if ((anchor.getAttribute('hreflang') || '').toLowerCase() === 'en') return null;

    const href = anchor.getAttribute('href') || '';
    // A single leading slash: internal path. "//host" is protocol-relative and
    // therefore external.
    if (!href.startsWith('/') || href.startsWith('//')) return null;
    return anchor;
}

export default function LangLinkGuard() {
    const pathname = usePathname();

    useEffect(() => {
        /**
         * Remember the ORIGINAL, language-neutral href once, and always
         * recompute from it. Rewriting in place is one-way: after an Arabic
         * middle-click the anchor would hold "/ar/…" for ever, so toggling back
         * to English and clicking it again would still open the Arabic page.
         * (The static twin learned this the same way.)
         */
        const neutral = (anchor: HTMLAnchorElement): string => {
            let base = anchor.getAttribute('data-starta-href');
            if (base === null) {
                base = anchor.getAttribute('href') || '';
                anchor.setAttribute('data-starta-href', base);
            }
            return base;
        };

        // Modified clicks and middle clicks: correct the attribute and let the
        // browser do what the reader asked, in the right tree.
        const onPointerDown = (event: Event) => {
            const anchor = candidate(event);
            if (!anchor) return;
            const wanted = localizedHref(neutral(anchor), currentLang());
            if (wanted !== anchor.getAttribute('href')) anchor.setAttribute('href', wanted);
        };

        // Plain left click: next/link would navigate from its own prop, so the
        // attribute rewrite alone is not enough. Cancel and re-issue.
        const onClick = (event: MouseEvent) => {
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const anchor = candidate(event);
            if (!anchor) return;

            const base = neutral(anchor);
            const wanted = localizedHref(base, currentLang());
            if (wanted === base) return;                 // already right: never intervene
            anchor.setAttribute('href', wanted);

            // Capture phase, so this runs before next/link's own handler; the
            // cancellation is what makes Link stand down.
            event.preventDefault();
            event.stopPropagation();
            window.location.assign(wanted);
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('click', onClick, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('click', onClick, true);
        };
        // Re-armed per route so a client-side navigation between the trees
        // re-reads the language; the listeners themselves are delegated and do
        // not care what is on the page.
    }, [pathname]);

    return null;
}
