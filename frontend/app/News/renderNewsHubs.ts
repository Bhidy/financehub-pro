import { notFound } from 'next/navigation';
import { getNewsWindow } from '@/lib/public-data';
import { renderNewsHub, type NewsArticleRow } from '@/lib/news-hub';
import {
    NEWS_TOPICS, MIN_ARTICLES_PER_TOPIC, findNewsTopic, newsTopicPath, topicOfArticle,
} from '@/content/news-topics';

/**
 * NEWS HUBS — the front hub in each language, and one archive per topic.
 *
 * News is roughly half this site's URLs and, until now, every article was an
 * orphan: /News showed the latest few, the sitemap held the rest, nothing
 * grouped them. investing.com runs 22 news categories. And /ar/News simply
 * 404'd, while ~76% of the articles are Arabic.
 */

const PER_HUB = 40;

const toRow = (a: Record<string, unknown>): NewsArticleRow => ({
    id: a.id as number,
    headline: (a.headline as string) || '',
    published_at: a.published_at,
    symbol: (a.symbol as string) || null,
});

/** Articles a language should show. The feed is mixed, and an Arabic hub full
 *  of English headlines is the "no English in Arabic mode" failure again. */
const isArabicHeadline = (h: unknown): boolean => typeof h === 'string' && /[؀-ۿ]/.test(h);

function forLang(rows: Array<Record<string, unknown>>, lang: 'en' | 'ar') {
    const wanted = rows.filter((a) => (lang === 'ar' ? isArabicHeadline(a.headline) : !isArabicHeadline(a.headline)));
    // If a language has too little of its own, fall back to the full feed
    // rather than publishing an empty hub.
    return wanted.length >= 10 ? wanted : rows;
}

const topicLinks = (lang: 'en' | 'ar', exclude?: string) =>
    NEWS_TOPICS.filter((t) => t.slug !== exclude).map((t) => ({
        href: newsTopicPath(t, lang),
        label: lang === 'ar' ? t.nameAr : t.nameEn,
    }));

/** The front news hub for a language. */
export async function renderNewsFront(lang: 'en' | 'ar') {
    const isAr = lang === 'ar';
    let rows: Array<Record<string, unknown>> = [];
    try {
        rows = await getNewsWindow();
    } catch (error) {
        console.error('[hub:news] query failed:', (error as Error).message);
    }
    const articles = forLang(rows, lang).slice(0, PER_HUB).map(toRow);

    return renderNewsHub({
        lang,
        canonical: isAr ? '/ar/News' : '/News',
        altPath: isAr ? '/News' : '/ar/News',
        title: isAr
            ? 'أخبار البورصة المصرية والاقتصاد — تحديث مستمر | Starta Markets'
            : 'Egyptian Market News — EGX & Economy | Starta Markets',
        description: isAr
            ? 'أحدث أخبار البورصة المصرية والاقتصاد والشركات، مصنّفة حسب الموضوع ومحدثة على مدار اليوم.'
            : 'Latest Egyptian Exchange, economy and company news, grouped by topic and updated through the day.',
        heading: isAr ? 'أخبار السوق' : 'Market news',
        intro: isAr
            ? 'أحدث تغطية للبورصة المصرية والاقتصاد المصري والشركات المقيدة، مصنّفة حسب الموضوع.'
            : 'The latest coverage of the Egyptian Exchange, the Egyptian economy and listed companies, grouped by topic.',
        articles,
        crumbs: [
            { name: isAr ? 'الرئيسية' : 'Home', url: isAr ? '/ar' : '/' },
            { name: isAr ? 'أخبار السوق' : 'News' },
        ],
        siblings: topicLinks(lang),
    });
}

/** A topic archive. */
export async function renderNewsTopic(slug: string, lang: 'en' | 'ar') {
    const topic = findNewsTopic(slug);
    if (!topic) notFound();
    const isAr = lang === 'ar';

    let rows: Array<Record<string, unknown>> = [];
    try {
        rows = await getNewsWindow();
    } catch (error) {
        console.error('[hub:news-topic] query failed:', (error as Error).message);
    }
    const inTopic = rows.filter((a) => topicOfArticle(a.source_section)?.slug === topic.slug);
    // Data gate: a topic with too few articles is a thin archive, not a page.
    if (inTopic.length < MIN_ARTICLES_PER_TOPIC) notFound();

    const articles = forLang(inTopic, lang).slice(0, PER_HUB).map(toRow);

    return renderNewsHub({
        lang,
        canonical: newsTopicPath(topic, lang),
        altPath: newsTopicPath(topic, isAr ? 'en' : 'ar'),
        title: `${isAr ? topic.titleAr : topic.titleEn} | Starta Markets`,
        description: isAr ? topic.descAr : topic.descEn,
        heading: isAr ? topic.nameAr : topic.nameEn,
        intro: isAr ? topic.introAr : topic.introEn,
        articles,
        crumbs: [
            { name: isAr ? 'الرئيسية' : 'Home', url: isAr ? '/ar' : '/' },
            { name: isAr ? 'أخبار السوق' : 'News', url: isAr ? '/ar/News' : '/News' },
            { name: isAr ? topic.nameAr : topic.nameEn },
        ],
        siblings: topicLinks(lang, topic.slug),
    });
}

/** Topics that currently clear the publish threshold — used by the sitemap so
 *  it can never advertise a topic archive the page would 404. */
export async function livePublishedTopics(): Promise<string[]> {
    const rows = await getNewsWindow();
    return NEWS_TOPICS.filter(
        (t) => rows.filter((a) => topicOfArticle(a.source_section)?.slug === t.slug).length >= MIN_ARTICLES_PER_TOPIC
    ).map((t) => t.slug);
}
