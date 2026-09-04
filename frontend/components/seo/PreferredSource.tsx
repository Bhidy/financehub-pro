'use client';

import { useEffect, useRef } from 'react';

/**
 * GOOGLE PREFERRED SOURCES BUTTON.
 *
 * Google shipped an embeddable button on 2026-08-20 that lets a reader mark a
 * site as a preferred source; Google then shows it more often in Search,
 * Discover and News. The implementation is exactly two things — publisher.js
 * and an element carrying `google-add-preferred-source-btn` — taken from
 * Google's own Search Central documentation, not reconstructed from a blog post.
 *
 * ELIGIBILITY: domain and subdomain level only. startamarkets.com qualifies;
 * a subdirectory would not.
 *
 * PLACEMENT IS DELIBERATELY NARROW. Google's guidance is to put it where a
 * returning reader can act on a good experience — the end of a high-value
 * article — and explicitly NOT on every surface before you know whether it
 * helps or interrupts. So this renders at the foot of a news article and
 * nowhere else: not on the hubs, the fund pages or the homepage.
 *
 * NO CLAIMS ARE MADE FOR IT. The copy says what the button does. It promises
 * the reader nothing about rankings and describes Starta as nothing it is not.
 *
 * WHY THIS IS A CLIENT COMPONENT, and why the script is injected rather than
 * rendered: publisher.js reads `data-theme` at initialisation, and the server
 * cannot know the reader's theme (it is a client toggle on `<html data-theme>`).
 * Rendering an async <script> tag alongside the element makes the two race.
 * Setting the attribute in an effect and injecting the script immediately
 * afterwards makes the order guaranteed instead of likely — and avoids
 * dangerouslySetInnerHTML, which has no place in a component that ships on
 * every article.
 *
 * ON SUBRESOURCE INTEGRITY: no `integrity` hash is set, deliberately. Google
 * serves publisher.js from a managed, continuously-updated endpoint and
 * publishes no hash for it; pinning one would silently disable the button the
 * next time Google ships a change. The mitigation that does apply — restricting
 * what this origin may load — belongs in the CSP, not in a stale hash here.
 */

const SCRIPT_SRC = 'https://news.google.com/swg/js/v1/publisher.js';

const COPY = {
    en: {
        title: 'Follow Starta in Google',
        body: 'Mark Starta Markets as a preferred source and Google will show our Egyptian market coverage more often in Search, Discover and News.',
    },
    ar: {
        title: 'تابع ستارتا في جوجل',
        body: 'اجعل ستارتا ماركتس مصدراً مفضلاً لديك، وسيعرض جوجل تغطيتنا للسوق المصري بشكل أكبر في البحث و Discover والأخبار.',
    },
} as const;

export default function PreferredSource({ lang }: { lang: 'en' | 'ar' }) {
    const slotRef = useRef<HTMLDivElement | null>(null);
    const t = COPY[lang];

    useEffect(() => {
        const btn = slotRef.current;
        if (!btn) return;
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            btn.setAttribute('data-theme', 'dark');
        }
        // One tag per document even if a route renders this twice.
        if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) return;
        const s = document.createElement('script');
        s.async = true;
        s.src = SCRIPT_SRC;
        document.head.appendChild(s);
    }, []);

    return (
        <aside
            className="mt-10 rounded-2xl border border-border bg-surface p-5 sm:p-6"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
            <h2 className="text-base font-bold tracking-[-0.01em] text-main sm:text-lg">{t.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{t.body}</p>
            <div className="mt-4">
                {/* Google renders the button into this element. */}
                <div ref={slotRef} google-add-preferred-source-btn="" data-lang={lang} data-theme="light" />
            </div>
        </aside>
    );
}
