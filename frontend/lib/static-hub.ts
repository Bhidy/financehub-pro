import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * SERVER-SIDE CONTENT INJECTION FOR THE DESIGNED STATIC HUBS.
 *
 * /Funds, /News, /Learn and /Market-Pulse are hand-designed static pages whose
 * content containers are filled client-side (`grid.innerHTML = …`). To a
 * crawler they were 143-179 words with no structured data and almost no
 * internal links — the funds hub exposed FOUR links and not one fund name.
 *
 * The design is canonical and must not be replaced by a plain server page, so
 * these routes now serve the SAME designed HTML file with real, current markup
 * injected into the (empty) content containers before it leaves the server.
 * The page's own script still runs and overwrites each container with the
 * interactive version, so what a human sees is byte-identical to before; what
 * a crawler sees is the same content the human ends up with, rendered ahead of
 * time. Substance is identical in both — this is hybrid rendering, not
 * cloaking.
 *
 * FAILURE POLICY: every failure degrades to "serve what we serve today".
 * An unreadable shell falls back to the static asset, a missing container is
 * skipped, and a failed query simply omits its block. This route can return a
 * broken page only if the static file itself is broken.
 */

/** Per-process cache: the shell cannot change within a deployment. */
const shellCache = new Map<string, string | null>();

function readShell(file: string): string | null {
    if (shellCache.has(file)) return shellCache.get(file) ?? null;
    let html: string | null = null;
    try {
        // `public/` is not part of the serverless bundle by default; the route's
        // entry in `outputFileTracingIncludes` (next.config.ts) puts it there.
        html = readFileSync(path.join(process.cwd(), 'public', file), 'utf8');
    } catch (error) {
        console.error(`[static-hub] cannot read public/${file}:`, (error as Error).message);
        html = null;
    }
    shellCache.set(file, html);
    return html;
}

/**
 * HTML-escape a value destined for text content or an attribute.
 * Every injected string passes through here: the data is fund names, headlines
 * and manager names read from Postgres, i.e. untrusted as far as markup goes.
 */
export function esc(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Escape a URL for an href: same escaping, plus a scheme allow-list. */
export function escUrl(value: unknown): string {
    const raw = String(value ?? '');
    // Only same-origin paths are ever injected; anything else is dropped rather
    // than emitted, so a bad row can never mint a javascript: link.
    if (!raw.startsWith('/')) return '#';
    return esc(encodeURI(raw));
}

export type Injection = {
    id: string;
    /** Markup to place inside it. Must already be escaped. */
    html: string;
    /**
     * 'insert' (default) — the container is EMPTY in the shell, so this appends
     *   at the open tag's end. No nesting analysis, no risk of swallowing
     *   sibling markup.
     * 'replace' — the container holds a placeholder (e.g. `--` for a live
     *   quote) that must be swapped, not prefixed. Only use on LEAF elements
     *   with no nested tags of the same name; the shell's live-value spans
     *   (#indexValue, #overviewDelta …) are exactly that.
     */
    mode?: 'insert' | 'replace';
};

function injectInto(shell: string, inj: Injection): string {
    const open = new RegExp(`<(\\w+)([^>]*\\bid="${inj.id}"[^>]*)>`);
    const m = open.exec(shell);
    if (!m) {
        console.error(`[static-hub] container #${inj.id} not found — skipping injection`);
        return shell;
    }
    const at = m.index + m[0].length;
    if ((inj.mode ?? 'insert') === 'insert') {
        return shell.slice(0, at) + inj.html + shell.slice(at);
    }
    // replace: swap everything up to this element's own closing tag. Bail out
    // rather than guess if the element turns out to contain nested markup —
    // a wrong slice here would corrupt the designed page.
    const close = `</${m[1]}>`;
    const end = shell.indexOf(close, at);
    if (end === -1) {
        console.error(`[static-hub] #${inj.id} has no ${close} — skipping`);
        return shell;
    }
    if (shell.slice(at, end).includes('<')) {
        console.error(`[static-hub] #${inj.id} is not a leaf element — skipping replace`);
        return shell;
    }
    return shell.slice(0, at) + inj.html + shell.slice(end);
}

/** Append markup immediately before </head> (hreflang links, JSON-LD). */
function injectHead(shell: string, html: string): string {
    const i = shell.search(/<\/head>/i);
    if (i === -1) {
        console.error('[static-hub] no </head> — skipping head injection');
        return shell;
    }
    return shell.slice(0, i) + html + shell.slice(i);
}

/**
 * A literal find/replace applied to the shell. Used for the few head-level and
 * hero-level edits a localized or filtered view of the SAME designed page
 * needs — swapping the <title>, the canonical, or the hero heading.
 *
 * Deliberately literal, not regex: every replacement names the exact bytes it
 * expects, and a miss is reported loudly rather than silently doing nothing.
 * That is what keeps this from becoming a way to quietly restyle a page.
 */
export type Replacement = { find: string; replace: string };

export type StaticHubOptions = {
    /** File under public/, e.g. 'news.html'. */
    file: string;
    /** Markup for each content container. */
    injections: Injection[];
    /** Exact-match head/hero edits (title, canonical, H1). */
    replacements?: Replacement[];
    /**
     * Replace the TEXT of an element carrying `data-key="…"`, and remove that
     * attribute so the page's own i18n pass cannot overwrite it on load.
     *
     * Whitespace-agnostic BY DESIGN. The first version matched exact bytes and
     * silently did nothing, because the designed file wraps the hero across
     * three lines while the pattern assumed single spaces — the category pages
     * shipped with the generic "Mutual Funds" heading and only a browser check
     * caught it. Anchors inside hand-formatted HTML must never be matched by
     * exact whitespace.
     */
    heroText?: Array<{
        dataKey: string;
        text: string;
        /**
         * Keep the `data-key` attribute instead of removing it.
         *
         * Removing it is right for a PAGE-SPECIFIC heading that has no entry in
         * the shell's own dictionary (the category and provider hubs): the
         * page's i18n pass would otherwise overwrite "صناديق أسواق النقد في مصر"
         * with the generic dictionary value on load.
         *
         * It is WRONG for a hub heading the dictionary already translates
         * (/ar/Funds, /ar/News, /ar/Learn). Those shells toggle language IN
         * PLACE — `langToggle` calls `setLanguage()`, it does not navigate — so
         * a heading with no `data-key` would stay frozen in Arabic when the
         * visitor switches to English. Keeping the key means the server render
         * and the client render produce the SAME string, and the toggle still
         * works both ways.
         */
        keepKey?: boolean;
    }>;
    /**
     * Rewrite the shell's <html lang>/<dir>.
     *
     * The designed shells are static files with `lang="en" dir="ltr"` baked in.
     * The App Router fix for this (middleware stamps x-starta-lang, the root
     * layout reads it) does NOT reach them — they never pass through that
     * layout. So serving one of them at an Arabic URL silently ships an
     * Arabic document declaring itself English, which is the exact defect that
     * cost the Arabic rankings in the first place. The SEO audit catches it,
     * but it should never be shipped: set this on every Arabic route.
     */
    lang?: 'en' | 'ar';
    /** Extra <head> markup — hreflang alternates, JSON-LD. Pre-escaped. */
    head?: string;
    /**
     * Edge TTL in seconds. Route Handlers (unlike force-dynamic pages) keep the
     * Cache-Control they set, so this is the one place page caching actually
     * takes effect on this stack.
     */
    cacheSeconds: number;
};

export async function renderStaticHub(opts: StaticHubOptions): Promise<Response> {
    const shell = readShell(opts.file);
    if (shell === null) {
        // Degrade to exactly today's behaviour rather than serve an error.
        return new Response(null, {
            status: 307,
            headers: { location: `/${opts.file}`, 'cache-control': 'no-store' },
        });
    }

    let html = shell;
    if (opts.lang) {
        const dir = opts.lang === 'ar' ? 'rtl' : 'ltr';
        const before = html;
        html = html.replace(
            /<html([^>]*)>/i,
            (_m, attrs: string) =>
                `<html${attrs
                    .replace(/\slang="[^"]*"/i, '')
                    .replace(/\sdir="[^"]*"/i, '')} lang="${opts.lang}" dir="${dir}">`
        );
        if (html === before) {
            console.error(`[static-hub] ${opts.file}: could not rewrite <html lang>`);
        }
    }
    for (const h of opts.heroText ?? []) {
        const re = new RegExp(`(<(\\w+)[^>]*?)\\s*data-key="${h.dataKey}"([^>]*>)([\\s\\S]*?)(</\\2>)`);
        const before = html;
        html = html.replace(re, (_m, open: string, _tag: string, rest: string, _inner: string, close: string) =>
            h.keepKey
                ? `${open} data-key="${h.dataKey}"${rest}${esc(h.text)}${close}`
                : `${open}${rest}${esc(h.text)}${close}`
        );
        if (html === before) {
            console.error(`[static-hub] ${opts.file}: no element with data-key="${h.dataKey}" — heading not localized`);
        }
    }
    for (const r of opts.replacements ?? []) {
        if (!html.includes(r.find)) {
            // Loud, not silent: a missed replacement means the shell changed
            // under us and the page would ship the wrong title or heading.
            console.error(`[static-hub] ${opts.file}: replacement target not found: ${r.find.slice(0, 80)}`);
            continue;
        }
        html = html.split(r.find).join(r.replace);
    }
    for (const inj of opts.injections) {
        if (inj.html) html = injectInto(html, inj);
    }
    if (opts.head) html = injectHead(html, opts.head);

    return new Response(html, {
        headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': `public, max-age=0, s-maxage=${opts.cacheSeconds}, stale-while-revalidate=${opts.cacheSeconds * 4}`,
        },
    });
}

/** `<script type="application/ld+json">` block, safely serialised. */
export function jsonLdScript(data: unknown): string {
    // `<` inside the JSON would otherwise be able to close the script element.
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return `<script type="application/ld+json">${json}</script>`;
}

/**
 * Seeds the language the designed static pages read from storage, BEFORE their
 * own boot script runs. Those pages are single-URL and pick their language
 * from localStorage; serving one of them at a language-scoped URL (/ar/Funds)
 * has to tell them which language that URL means. Same keys and same cookie
 * the rest of the site uses (PublicPageShell persistLang) — one contract.
 */
export function langSeedScript(lang: 'en' | 'ar'): string {
    return (
        `<script>try{localStorage.setItem('starta-lang','${lang}');` +
        `localStorage.setItem('lang','${lang}');` +
        `document.cookie='starta-lang=${lang};path=/;max-age=31536000;samesite=lax';}catch(e){}</script>`
    );
}

/** Reciprocal hreflang triple for a bilingual pair. */
export function hreflangLinks(en: string, ar: string): string {
    return (
        `<link rel="alternate" hreflang="en" href="https://startamarkets.com${en}">` +
        `<link rel="alternate" hreflang="ar" href="https://startamarkets.com${ar}">` +
        `<link rel="alternate" hreflang="x-default" href="https://startamarkets.com${ar}">`
    );
}
