/**
 * BRANDED NEWS COVER — the only image a news surface may show.
 *
 * WHY THIS EXISTS
 * News rows carry `image_url` scraped from the originating publisher. Those
 * photos are third-party editorial images: they are off-brand, unpredictable in
 * subject and crop, and not ours to republish. The article page rendered them
 * directly, which is how a street-market photo ended up illustrating a CPI
 * story.
 *
 * Every news surface — article hero, cards, OG/Twitter images, JSON-LD — must
 * resolve its image through this helper. Never read `article.image_url`.
 *
 * The static pages use the browser twin, public/assets/news-covers.js, whose
 * getUrl() also resolves to the generic per-language cover. Both are gated by
 * scripts/verify-route-aliases.mjs.
 */

/** Absolute-from-root path to the branded cover for a language. */
export function newsCoverPath(lang: 'ar' | 'en'): string {
    return `/assets/news-covers/${lang === 'ar' ? 'ar' : 'en'}-generic.webp`;
}

/** Fully-qualified URL, for metadata and structured data. */
export function newsCoverUrl(siteUrl: string, lang: 'ar' | 'en'): string {
    return `${siteUrl}${newsCoverPath(lang)}`;
}
