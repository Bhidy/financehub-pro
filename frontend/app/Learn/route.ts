import { renderStaticHub, esc, escUrl, jsonLdScript, hreflangLinks } from '@/lib/static-hub';
import { learnPath, SITE_URL, absUrl } from '@/lib/seo';
import learnTopics from '@/content/learn-topics.generated';

/**
 * /Learn — the designed Learn hub, now served with its topic grid rendered
 * server-side.
 *
 * Before: 151 words, ZERO structured data, 19 internal links (all chrome) and
 * no link to any of the 20 Learn topic pages — the education cluster had no
 * crawlable entry point from its own hub.
 *
 * The topic data is static (content/learn-topics.generated.ts), so this render
 * is deterministic and can be cached at the edge for a day; it changes only on
 * deploy.
 */
export const dynamic = 'force-static';
export const revalidate = 86400;

type Topic = {
    slug: string;
    accent?: string;
    coverImageEn?: string;
    coverImageAr?: string;
    en: { category?: string; title: string; summary?: string; readTime?: string };
    ar: { category?: string; title: string; summary?: string; readTime?: string };
};

export async function GET() {
    const topics = learnTopics as unknown as Topic[];

    // The grid the page's own script rebuilds on load. Markup mirrors the
    // designed card (same utility classes) so there is no visual step between
    // the server render and the client render.
    const cards = topics
        .map((t) => {
            const href = learnPath(t.slug, t.ar?.title, 'en');
            return (
                `<a href="${escUrl(href)}" class="learn-card group block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--teal)]">` +
                `<span class="block text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">${esc(t.en.category || 'Learn')}</span>` +
                `<h3 class="mt-2 text-base font-bold leading-snug text-[var(--ink)]">${esc(t.en.title)}</h3>` +
                (t.en.summary ? `<p class="mt-2 text-sm leading-relaxed text-[var(--muted)]">${esc(t.en.summary)}</p>` : '') +
                (t.en.readTime ? `<span class="mt-3 block text-xs text-[var(--muted)]">${esc(t.en.readTime)}</span>` : '') +
                `</a>`
            );
        })
        .join('');

    // ItemList carries the crawl path into all 20 topic pages; DefinedTermSet
    // would misdescribe them (they are articles, not term definitions).
    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Starta Academy — investing and Egyptian market lessons',
        numberOfItems: topics.length,
        itemListElement: topics.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: t.en.title,
            url: absUrl(learnPath(t.slug, t.ar?.title, 'en')),
        })),
    };

    const breadcrumb = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Learn' },
        ],
    };

    return renderStaticHub({
        file: 'learn.html',
        injections: [{ id: 'topicsGrid', html: cards }],
        // /Learn is a single-URL page whose language follows the stored
        // preference, so both hreflang values point at it — a self-referencing
        // pair, which is valid, rather than a link to an /ar/Learn that 308s
        // straight back here.
        head: hreflangLinks('/Learn', '/Learn') + jsonLdScript(itemList) + jsonLdScript(breadcrumb),
        cacheSeconds: 86400,
    });
}
