import { ImageResponse } from 'next/og';

/**
 * SHARED OPEN GRAPH CARD RENDERER.
 *
 * 29 of the 39 App Router templates declared their own `openGraph` block
 * WITHOUT an `images` key. In Next.js a page-level openGraph object replaces
 * the layout's, so every one of those pages shipped no social/SERP thumbnail
 * at all — a pure CTR loss on the money pages.
 *
 * Rather than patch 29 files with the same static PNG, each surface renders a
 * real card carrying its own data (a fund's NAV and one-year return, a stock's
 * price and change). Static file-convention images then cover everything else,
 * so no template can silently ship imageless again.
 *
 * BRAND: dark navy #0F172A ground, Midnight Teal #14B8A6 accent, Sora display
 * — the tokens in DESIGN_SYSTEM.md, not invented values.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const NAVY = '#0F172A';
const NAVY_2 = '#1E293B';
const TEAL = '#14B8A6';
const TEAL_DIM = '#0D9488';
const INK = '#F8FAFC';
const MUTED = '#94A3B8';
const UP = '#22C55E';
const DOWN = '#F43F5E';

/**
 * Font bytes for satori, which cannot read the woff2 files the site ships.
 * Fetched once per lambda and reused. A failure returns null and the card
 * renders in the default face rather than 500ing — an OG image is never worth
 * an error page.
 */
const fontCache = new Map<string, ArrayBuffer | null>();

async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
    const key = `${family}:${weight}`;
    if (fontCache.has(key)) return fontCache.get(key) ?? null;
    try {
        const css = await fetch(
            `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text.slice(0, 220))}`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StartaOG/1.0)' } }
        ).then((r) => r.text());
        const url = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/.exec(css)?.[1]
            ?? /src:\s*url\(([^)]+)\)/.exec(css)?.[1];
        if (!url) throw new Error('no font url in css');
        const buf = await fetch(url).then((r) => r.arrayBuffer());
        fontCache.set(key, buf);
        return buf;
    } catch {
        fontCache.set(key, null);
        return null;
    }
}

export type OgStat = { label: string; value: string; tone?: 'up' | 'down' | 'neutral' };

export type OgCard = {
    /** Small uppercase category line, e.g. "EGX · MUTUAL FUND". */
    eyebrow: string;
    /** The entity name — the one thing the card is about. */
    title: string;
    /** Optional second line (ticker, manager). */
    subtitle?: string;
    /** Up to four figures. Rendered as a row of tiles. */
    stats?: OgStat[];
    /** Right-hand accent line, e.g. "as of 3 September 2026". */
    footnote?: string;
    lang?: 'en' | 'ar';
};

export async function renderOgCard(card: OgCard): Promise<ImageResponse> {
    const isAr = card.lang === 'ar';
    const allText = [card.eyebrow, card.title, card.subtitle, card.footnote, ...(card.stats ?? []).flatMap((s) => [s.label, s.value])]
        .filter(Boolean)
        .join(' ');
    // Arabic needs the Arabic face; Latin uses the display face. One request
    // each, subset to the glyphs this card actually uses.
    const [display, body] = await Promise.all([
        loadFont(isAr ? 'IBM Plex Sans Arabic' : 'Sora', 700, allText),
        loadFont(isAr ? 'IBM Plex Sans Arabic' : 'Manrope', 500, allText),
    ]);
    const fonts = [
        ...(display ? [{ name: 'display', data: display, weight: 700 as const, style: 'normal' as const }] : []),
        ...(body ? [{ name: 'body', data: body, weight: 500 as const, style: 'normal' as const }] : []),
    ];

    const toneColor = (t?: string) => (t === 'up' ? UP : t === 'down' ? DOWN : INK);

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: NAVY,
                    padding: 64,
                    position: 'relative',
                    direction: isAr ? 'rtl' : 'ltr',
                    fontFamily: 'body',
                }}
            >
                {/* Accent rail — the brand's one bold move, not a gradient wash. */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 8, background: TEAL, display: 'flex' }} />
                <div
                    style={{
                        position: 'absolute',
                        bottom: -160,
                        [isAr ? 'left' : 'right']: -160,
                        width: 520,
                        height: 520,
                        borderRadius: 520,
                        background: TEAL_DIM,
                        opacity: 0.14,
                        display: 'flex',
                    }}
                />

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, color: TEAL, fontFamily: 'display' }}>
                        {card.eyebrow}
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            marginTop: 20,
                            fontSize: card.title.length > 52 ? 54 : 68,
                            lineHeight: 1.1,
                            color: INK,
                            fontFamily: 'display',
                            maxWidth: 1040,
                        }}
                    >
                        {card.title}
                    </div>
                    {card.subtitle ? (
                        <div style={{ display: 'flex', marginTop: 16, fontSize: 30, color: MUTED }}>{card.subtitle}</div>
                    ) : null}
                </div>

                {card.stats && card.stats.length > 0 ? (
                    <div style={{ display: 'flex', gap: 20, marginTop: 24 }}>
                        {card.stats.slice(0, 4).map((s) => (
                            <div
                                key={s.label}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: NAVY_2,
                                    border: `1px solid #334155`,
                                    borderRadius: 18,
                                    padding: '20px 26px',
                                    minWidth: 210,
                                }}
                            >
                                <div style={{ display: 'flex', fontSize: 20, color: MUTED }}>{s.label}</div>
                                <div
                                    style={{
                                        display: 'flex',
                                        marginTop: 10,
                                        fontSize: 40,
                                        color: toneColor(s.tone),
                                        fontFamily: 'display',
                                    }}
                                >
                                    {s.value}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', fontSize: 30, color: INK, fontFamily: 'display', letterSpacing: 6 }}>
                        STARTA
                    </div>
                    {card.footnote ? (
                        <div style={{ display: 'flex', fontSize: 22, color: MUTED }}>{card.footnote}</div>
                    ) : null}
                </div>
            </div>
        ),
        { ...OG_SIZE, fonts: fonts.length ? fonts : undefined }
    );
}
