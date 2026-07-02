import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import topicsJson from '@/content/learn-topics.generated';

/**
 * Shared server-rendered Learn topic article, used by both the EN
 * (/Learn/{slug}) and AR (/ar/Learn/{slug}) routes. Content comes from
 * data/learn-topics.json only — fully static, no db access.
 */

export type LearnSectionImage = {
    src: string;
    alt?: string;
    caption?: string;
};

export type LearnSection = {
    heading: string;
    body: string;
    bullets?: string[];
    image?: LearnSectionImage;
    /** Decorative visual spec used by the interactive app shell; ignored here. */
    visual?: unknown;
};

export type LearnTopicContent = {
    category: string;
    title: string;
    summary: string;
    readTime: string;
    intro: string;
    sections: LearnSection[];
};

export type LearnTopic = {
    slug: string;
    accent: string;
    icon: string;
    coverImageEn: string;
    coverImageAr: string;
    en: LearnTopicContent;
    ar: LearnTopicContent;
};

export const learnTopics = topicsJson as LearnTopic[];

/** The 3 topics following `slug` in catalogue order (wrapping), for "Continue learning". */
function nextTopics(slug: string): LearnTopic[] {
    const idx = learnTopics.findIndex((t) => t.slug === slug);
    if (idx === -1) return learnTopics.slice(0, 3);
    return [1, 2, 3].map((offset) => learnTopics[(idx + offset) % learnTopics.length]);
}

export default function LearnTopicArticle({ topic, lang }: { topic: LearnTopic; lang: 'en' | 'ar' }) {
    const arabic = lang === 'ar';
    const content = arabic ? topic.ar : topic.en;
    const coverImage = arabic ? topic.coverImageAr : topic.coverImageEn;
    const basePath = arabic ? '/ar/Learn' : '/Learn';
    const path = `${basePath}/${topic.slug}`;
    const related = nextTopics(topic.slug);

    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: content.title,
        description: content.summary,
        inLanguage: lang,
        mainEntityOfPage: SITE_URL + path,
        image: SITE_URL + coverImage,
        publisher: { '@id': `${SITE_URL}/#organization` },
        author: { '@type': 'Organization', name: 'Starta Markets' },
    };

    const crumbs = arabic
        ? [
              { href: '/', label: 'الرئيسية' },
              { href: '/Learn', label: 'تعلّم' },
              { label: content.title },
          ]
        : [
              { href: '/', label: 'Home' },
              { href: '/Learn', label: 'Learn' },
              { label: content.title },
          ];

    return (
        <PublicPageShell dir={arabic ? 'rtl' : 'ltr'}>
            <JsonLd data={articleJsonLd} />
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs items={crumbs} />

            <article lang={lang}>
                <p className="text-sm font-semibold text-teal-600">
                    {content.category}
                    <span className="font-normal text-slate-500"> · {content.readTime}</span>
                </p>
                <h1 className="mt-1 text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">
                    {content.title}
                </h1>
                <p className="mt-3 text-lg font-semibold leading-relaxed text-slate-700">{content.summary}</p>

                {/* Local static covers; plain <img> keeps these pages zero-JS like the News article page. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={coverImage}
                    alt={content.title}
                    width={1200}
                    height={675}
                    loading="eager"
                    className="mt-5 h-auto w-full rounded-xl border border-slate-200 object-cover"
                />

                <p className="mt-6 text-[1.05rem] leading-relaxed text-slate-700">{content.intro}</p>

                {content.sections.map((section) => (
                    <section key={section.heading} className="mt-8">
                        <h2 className="text-xl font-bold text-slate-900">{section.heading}</h2>
                        <p className="mt-2 text-[1.05rem] leading-relaxed text-slate-700">{section.body}</p>
                        {section.bullets && section.bullets.length > 0 && (
                            <ul className="mt-3 list-disc space-y-1 ps-6 text-[1.05rem] leading-relaxed text-slate-700">
                                {section.bullets.map((bullet) => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                        )}
                        {section.image && (
                            <figure className="mt-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={section.image.src}
                                    alt={section.image.alt || section.heading}
                                    width={1200}
                                    height={675}
                                    loading="lazy"
                                    className="h-auto w-full rounded-xl border border-slate-200"
                                />
                                {section.image.caption && (
                                    <figcaption className="mt-2 text-sm text-slate-500">
                                        {section.image.caption}
                                    </figcaption>
                                )}
                            </figure>
                        )}
                    </section>
                ))}

                <p className="mt-8 rounded-xl border border-teal-100 bg-teal-50 p-4 text-[1.05rem] leading-relaxed text-slate-700">
                    {arabic ? (
                        <>
                            طبّق ما تعلمته —{' '}
                            <Link href="/Funds" className="font-semibold text-teal-600 hover:underline">
                                استكشف صناديق الاستثمار المصرية
                            </Link>{' '}
                            أو{' '}
                            <Link href="/AiChat" className="font-semibold text-teal-600 hover:underline">
                                اسأل المحلل الذكي
                            </Link>
                            .
                        </>
                    ) : (
                        <>
                            Put it into practice —{' '}
                            <Link href="/Funds" className="font-semibold text-teal-600 hover:underline">
                                explore Egyptian mutual funds
                            </Link>{' '}
                            or{' '}
                            <Link href="/AiChat" className="font-semibold text-teal-600 hover:underline">
                                ask the AI analyst
                            </Link>
                            .
                        </>
                    )}
                </p>
            </article>

            <section className="mt-10 border-t border-slate-200 pt-6">
                <h2 className="text-lg font-bold text-slate-900">
                    {arabic ? 'تابع التعلّم' : 'Continue learning'}
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                    {related.map((t) => (
                        <li key={t.slug}>
                            <Link
                                href={`${basePath}/${t.slug}`}
                                className="text-sm font-medium text-slate-700 hover:text-teal-600"
                            >
                                {(arabic ? t.ar : t.en).title}
                            </Link>
                        </li>
                    ))}
                </ul>
                <p className="mt-4 text-sm">
                    <Link href="/Learn" className="font-semibold text-teal-600 hover:underline">
                        {arabic ? 'كل دروس التعلّم ←' : 'All learn topics →'}
                    </Link>
                </p>
            </section>
        </PublicPageShell>
    );
}
