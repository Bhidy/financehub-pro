import { readFileSync } from 'node:fs';
import { localizedHref } from '@/lib/localized-href';
import { langSeedScript as langSeedScriptFromContract } from '@/lib/lang';
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

/**
 * SERVER-SIDE DICTIONARY PASS — the missing half of localizing a designed shell.
 *
 * Every designed shell bakes its ENGLISH markup defaults into the file and
 * translates them on load: `setLanguage()` walks `[data-key]` and writes
 * `translations[lang][key]` into each element, and starta-i18n.js does the
 * same for the shared nav/footer chrome. `heroText` localized the twelve
 * headline keys server-side; the other ~45 keyed strings on /ar/Funds
 * (Filters, Reset all, Search fund, Fund type, Manager, Issuer, Risk,
 * Management fee, Grid/Table, the table headers, the empty-state copy, the
 * primary nav) still left the server in English inside an `<html lang="ar">`
 * document — verified in the served HTML on 2026-09-05 for Googlebot,
 * OAI-SearchBot, bingbot and PerplexityBot alike.
 *
 * So the server now applies the shells' OWN dictionaries: the page's inline
 * `const translations = {…}` and the shared `var SHARED = {…}` in
 * public/assets/starta-i18n.js. Same keys, same values, same precedence as
 * the client (page dictionary wins over shared chrome), so the served Arabic
 * is byte-for-byte what the visitor sees after hydration, and `data-key`
 * stays in place so the in-page language toggle keeps working both ways.
 * verify-i18n-coverage.mjs already guarantees both dictionaries are complete.
 */
type Dictionary = Record<string, Record<string, string>>;
const dictCache = new Map<string, Dictionary | null>();

/**
 * Extract a `<name> = {…};` object literal from our own script source and
 * parse it. The dictionaries are flat objects of string values written as a
 * JS literal (unquoted keys, trailing commas, occasional single quotes), so
 * they are tokenised into strict JSON and parsed with JSON.parse — no code is
 * ever evaluated, and a literal this tokeniser cannot express (a function, a
 * template string) fails loudly instead of being guessed.
 */
function extractObjectLiteral(source: string, declaration: RegExp): Record<string, unknown> | null {
    const m = declaration.exec(source);
    if (!m) return null;
    const start = m.index + m[0].length - 1; // index of the opening brace
    let depth = 0;
    let inStr: string | null = null;
    let end = -1;
    for (let j = start; j < source.length; j++) {
        const ch = source[j];
        if (inStr) {
            if (ch === '\\') { j++; continue; }
            if (ch === inStr) inStr = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
        if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) { end = j; break; }
    }
    if (end === -1) return null;
    try {
        return JSON.parse(objectLiteralToJson(source.slice(start, end + 1))) as Record<string, unknown>;
    } catch (error) {
        console.error('[static-hub] dictionary literal is not a plain string map:', (error as Error).message);
        return null;
    }
}

/** JS object literal (string values only) → strict JSON text. */
function objectLiteralToJson(literal: string): string {
    let out = '';
    let i = 0;
    while (i < literal.length) {
        const ch = literal[i];
        if (ch === '"' || ch === "'") {
            // String: re-emit double-quoted with JSON escaping.
            let j = i + 1;
            let value = '';
            while (j < literal.length && literal[j] !== ch) {
                if (literal[j] === '\\') {
                    const next = literal[j + 1];
                    // JS single-char escapes that JSON also accepts pass through;
                    // an escaped quote of the other kind is just that character.
                    if (next === ch) value += ch;
                    else if ('\\/bfnrt"'.includes(next)) value += `\\${next}`;
                    else if (next === 'u') value += `\\u`;
                    else value += next;
                    j += 2;
                    continue;
                }
                value += literal[j];
                j++;
            }
            out += JSON.stringify(value);
            i = j + 1;
            continue;
        }
        if (ch === '/' && literal[i + 1] === '/') {
            // Line comment inside the literal.
            const nl = literal.indexOf('\n', i);
            i = nl === -1 ? literal.length : nl;
            continue;
        }
        if (ch === '/' && literal[i + 1] === '*') {
            const close = literal.indexOf('*/', i + 2);
            i = close === -1 ? literal.length : close + 2;
            continue;
        }
        if (/[A-Za-z_$]/.test(ch)) {
            // Bare identifier — only valid as a key.
            let j = i;
            while (j < literal.length && /[\w$]/.test(literal[j])) j++;
            const ident = literal.slice(i, j);
            const rest = literal.slice(j).match(/^\s*:/);
            if (!rest) throw new Error(`unexpected identifier "${ident}"`);
            out += JSON.stringify(ident);
            i = j;
            continue;
        }
        if (ch === ',') {
            // Drop a trailing comma before a closing brace.
            const rest = literal.slice(i + 1).match(/^\s*}/);
            if (rest) { i++; continue; }
        }
        out += ch;
        i++;
    }
    return out;
}

function readDictionary(file: string): Dictionary | null {
    if (dictCache.has(file)) return dictCache.get(file) ?? null;
    let dict: Dictionary | null = null;
    try {
        const source = readFileSync(path.join(process.cwd(), 'public', file), 'utf8');
        const obj = extractObjectLiteral(source, /\b(?:const|var|let)\s+(?:translations|SHARED)\s*=\s*\{/);
        if (obj && typeof obj === 'object') dict = obj as Dictionary;
    } catch (error) {
        console.error(`[static-hub] cannot read dictionary from public/${file}:`, (error as Error).message);
    }
    dictCache.set(file, dict);
    return dict;
}

/** The shared nav/footer chrome dictionary every static page loads. */
const SHARED_I18N_FILE = 'assets/starta-i18n.js';

/**
 * Apply `dict[lang]` to every `data-key` element in the shell, the way the
 * client's applier does — innerHTML replaced wholesale, attribute kept.
 * Elements whose content nests the same tag are skipped (a regex cannot find
 * their closing tag safely); that is reported, never guessed.
 */
function applyDictionary(html: string, dict: Record<string, string>, label: string): string {
    const open = /<(\w+)([^>]*?)\sdata-key="([^"]+)"([^>]*)>/g;
    let out = '';
    let cursor = 0;
    let m: RegExpExecArray | null;
    while ((m = open.exec(html)) !== null) {
        const [tag, name, , key] = m;
        const value = dict[key];
        if (value === undefined) continue;
        const start = m.index + tag.length;
        const close = `</${name}>`;
        const end = html.indexOf(close, start);
        if (end === -1) continue;
        const inner = html.slice(start, end);
        if (new RegExp(`<${name}\\b`, 'i').test(inner)) {
            console.error(`[static-hub] ${label}: data-key="${key}" nests another <${name}> — left as markup default`);
            continue;
        }
        out += html.slice(cursor, start) + value;
        cursor = end;
        open.lastIndex = end + close.length;
    }
    return out + html.slice(cursor);
}

/**
 * Input placeholders are not `data-key`ed — the client sets them from the
 * dictionary by element id. Translate any placeholder whose English text is a
 * dictionary value (search box, NAV min/max), by reverse lookup on the same
 * dictionary, so the mapping cannot drift from the client's.
 */
function applyPlaceholders(html: string, en: Record<string, string>, target: Record<string, string>): string {
    const byEnglish = new Map<string, string>();
    for (const [k, v] of Object.entries(en)) if (typeof v === 'string') byEnglish.set(v, k);
    return html.replace(/(<input\b[^>]*?\splaceholder=")([^"]*)(")/g, (whole, pre: string, text: string, post: string) => {
        const key = byEnglish.get(text);
        const value = key ? target[key] : undefined;
        return value ? `${pre}${value.replace(/"/g, '&quot;')}${post}` : whole;
    });
}

/**
 * Localize a designed shell into `lang` with its own dictionaries. Runs
 * BEFORE `heroText`, so page-specific headings still win.
 */
function localizeShell(html: string, file: string, lang: 'en' | 'ar', reserved: Set<string>): string {
    if (lang !== 'ar') return html; // the shells' markup default IS English
    const page = readDictionary(file);
    const shared = readDictionary(SHARED_I18N_FILE);
    // Keys a route edits through a LITERAL replacement anchor (compare-hub
    // matches `data-key="empty_cta">Go back to Funds</a>`) must keep their
    // markup default here, or the anchor stops matching and the route's own
    // localized edit is silently lost. The replacement then localizes them.
    const strip = (d: Record<string, string>) => Object.fromEntries(Object.entries(d).filter(([k]) => !reserved.has(k)));
    let out = html;
    // Client precedence: shared chrome applies first, the page dictionary
    // applies after and may override — replicate by applying page LAST.
    if (shared?.ar) out = applyDictionary(out, strip(shared.ar), `${file} (shared chrome)`);
    if (page?.ar) {
        out = applyDictionary(out, strip(page.ar), file);
        if (page.en) out = applyPlaceholders(out, page.en, page.ar);
    }
    // The language toggle shows the OTHER language: `langToggle.textContent =
    // lang === 'ar' ? 'EN' : 'AR'` in every shell.
    out = out.replace(/(<button\b[^>]*\bid="langToggle"[^>]*>)\s*AR\s*(<\/button>)/, '$1EN$2');
    if (!page && !shared) console.error(`[static-hub] ${file}: no dictionary found — Arabic labels not localized server-side`);
    return out;
}

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
    if (opts.lang === 'ar') {
        // Every shell anchor to a twinned route points at the Arabic twin. The
        // designed shells are written once, in English: an Arabic category hub
        // rendered from marketplace.html shipped a header reading HOME · MUTUAL
        // FUNDS · MARKET NEWS · LEARN that linked /, /Funds, /News and /Learn —
        // so to a crawler the Arabic hubs had no Arabic parents. Scripts
        // (starta-nav.js) relabel on load; the server must ship the right
        // hrefs, because that is what is crawled and what carries PageRank.
        html = html.replace(/(<a\b[^>]*?\shref=")(\/[^"]*)(")/g, (m, open: string, href: string, close: string) => {
            if (href.startsWith('/assets') || href.startsWith('/api') || href.startsWith('/_next')) return m;
            return `${open}${localizedHref(href, 'ar')}${close}`;
        });
    }
    if (opts.lang) {
        const reserved = new Set<string>();
        for (const r of opts.replacements ?? []) for (const m of r.find.matchAll(/data-key="([^"]+)"/g)) reserved.add(m[1]);
        html = localizeShell(html, opts.file, opts.lang, reserved);
    }
    for (const h of opts.heroText ?? []) {
        const re = new RegExp(`(<(\\w+)[^>]*?)\\s*data-key="${h.dataKey}"([^>]*>)([\\s\\S]*?)(</\\2>)`);
        // Presence is tested explicitly: comparing before/after misreported a
        // MISSING element whenever the dictionary pass had already written the
        // identical string (the replacement is then a legitimate no-op).
        if (!re.test(html)) {
            console.error(`[static-hub] ${opts.file}: no element with data-key="${h.dataKey}" — heading not localized`);
            continue;
        }
        html = html.replace(re, (_m, open: string, _tag: string, rest: string, _inner: string, close: string) =>
            h.keepKey
                ? `${open} data-key="${h.dataKey}"${rest}${esc(h.text)}${close}`
                : `${open}${rest}${esc(h.text)}${close}`
        );
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
    // ONE definition (lib/lang.ts). This used to carry its own copy of the keys
    // and the cookie; PublicPageShell carried a third. Three copies of one
    // contract is three chances for a key to drift and for storage to stop
    // agreeing with the URL.
    return langSeedScriptFromContract(lang);
}

/** Reciprocal hreflang triple for a bilingual pair. */
export function hreflangLinks(en: string, ar: string): string {
    return (
        `<link rel="alternate" hreflang="en" href="https://startamarkets.com${en}">` +
        `<link rel="alternate" hreflang="ar" href="https://startamarkets.com${ar}">` +
        `<link rel="alternate" hreflang="x-default" href="https://startamarkets.com${ar}">`
    );
}
