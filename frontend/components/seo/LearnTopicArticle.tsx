import Link from 'next/link';
import { SITE_URL, learnPath, DEFAULT_OG_IMAGE} from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';
import topicsJson from '@/content/learn-topics.generated';
import { LEARN_FAQS, faqPageJsonLd } from '@/content/learn-faqs';
import learnImageSizes from '@/lib/learn-image-sizes.json';
import { publisherRef } from '@/lib/structured-data';

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
    coverImageEn?: string;
    coverImageAr?: string;
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
    const imageSizes = learnImageSizes as Record<string, { w: number; h: number }>;
    const coverSize = coverImage ? imageSizes[coverImage] : undefined;
    // Canonical per language: AR URLs carry the Arabic-title slug.
    const path = learnPath(topic.slug, topic.ar.title, lang);
    const related = nextTopics(topic.slug);
    const faqs = LEARN_FAQS[topic.slug]?.[lang] ?? [];
    const faqJsonLd = faqPageJsonLd(topic.slug, lang);

    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: content.title,
        description: content.summary,
        inLanguage: lang,
        mainEntityOfPage: SITE_URL + encodeURI(path),
        image: coverImage ? SITE_URL + coverImage : DEFAULT_OG_IMAGE,
        publisher: publisherRef(),
        author: {
            '@type': 'Organization',
            name: 'Starta Markets',
            url: SITE_URL,
            sameAs: ['https://www.linkedin.com/company/starta-markets'],
            publishingPrinciples: `${SITE_URL}/editorial-policy`,
        },
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
        <PublicPageShell
            lang={arabic ? 'ar' : 'en'}
            altHref={encodeURI(learnPath(topic.slug, topic.ar.title, arabic ? 'en' : 'ar'))}
            persistLang
        >
            <link rel="stylesheet" href="/assets/starta-learn.css" />
            <JsonLd data={articleJsonLd} />
            {faqJsonLd && <JsonLd data={faqJsonLd} />}
            <JsonLd
                data={breadcrumbJsonLd(
                    crumbs.map(({ href, label }) => ({ url: href, label })),
                    SITE_URL
                )}
            />
            <Breadcrumbs lang={lang} items={crumbs} />


            {coverImage && (
            <div className="learn-cover-wrap">

                {/* Cover. Dimensions come from the file itself (lib/learn-image-sizes.json):
                    the markup used to claim 1200×675 for every image while the covers are
                    920×690, so the browser upscaled them 1.21× — that, not the assets, is
                    why they looked low-resolution. max-width caps at the real pixel width so
                    the image is never drawn larger than it is, and never cropped. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={coverImage}
                    alt={content.title}
                    width={coverSize?.w}
                    height={coverSize?.h}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="learn-cover-img block rounded-2xl border border-border"
                    style={coverSize ? { maxWidth: `min(100%, ${coverSize.w}px)` } : undefined}
                />
            </div>
            )}
            <article lang={lang} className="learn-article">
                <p className="text-sm font-semibold text-starta-darkTeal">
                    {content.category}
                    <span className="font-normal text-muted"> · {content.readTime}</span>
                </p>
                <h1 className="mt-1 text-2xl font-extrabold leading-snug text-main sm:text-3xl">
                    {content.title}
                </h1>
                <p className="mt-3 text-lg font-semibold leading-relaxed text-main">{content.summary}</p>

                <p className="mt-6 text-[1.05rem] leading-relaxed text-main">{content.intro}</p>

                {content.sections.map((section) => (
                    <section key={section.heading} className="mt-8">
                        <h2 className="text-xl font-bold text-main">{section.heading}</h2>
                        <p className="mt-2 text-[1.05rem] leading-relaxed text-main">{section.body}</p>
                        {section.bullets && section.bullets.length > 0 && (
                            <ul className="mt-3 list-disc space-y-1 ps-6 text-[1.05rem] leading-relaxed text-main">
                                {section.bullets.map((bullet) => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                        )}
                        {section.image && (
                            <figure className="learn-figure">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={section.image.src}
                                    alt={section.image.alt || section.heading}
                                    width={imageSizes[section.image.src]?.w}
                                    height={imageSizes[section.image.src]?.h}
                                    loading="lazy"
                                    decoding="async"
                                    className="mx-auto block"
                                    style={
                                        imageSizes[section.image.src]
                                            ? { maxWidth: `min(100%, ${imageSizes[section.image.src].w}px)` }
                                            : undefined
                                    }
                                />
                                {section.image.caption && (
                                    <figcaption className="mt-2 text-sm text-muted">
                                        {section.image.caption}
                                    </figcaption>
                                )}
                            </figure>
                        )}
                    </section>
                ))}

                <p className="mt-8 rounded-xl border border-teal-100 bg-teal-50 p-4 text-[1.05rem] leading-relaxed text-main">
                    {arabic ? (
                        <>
                            طبّق ما تعلمته —{' '}
                            <Link href={arabic ? '/ar/Funds' : '/Funds'} className="font-semibold text-starta-darkTeal hover:underline">
                                استكشف صناديق الاستثمار المصرية
                            </Link>{' '}
                            أو{' '}
                            <Link href={arabic ? '/ar/Funds/Compare' : '/Funds/Compare'} className="font-semibold text-starta-darkTeal hover:underline">
                                قارن بين الصناديق
                            </Link>
                            .
                        </>
                    ) : (
                        <>
                            Put it into practice —{' '}
                            <Link href={arabic ? '/ar/Funds' : '/Funds'} className="font-semibold text-starta-darkTeal hover:underline">
                                explore Egyptian mutual funds
                            </Link>{' '}
                            or{' '}
                            <Link href={arabic ? '/ar/Funds/Compare' : '/Funds/Compare'} className="font-semibold text-starta-darkTeal hover:underline">
                                compare funds side by side
                            </Link>
                            .
                        </>
                    )}
                </p>
            </article>

            {faqs.length > 0 && (
                <section className="mt-10 border-t border-border pt-6" lang={lang}>
                    <h2 className="text-xl font-bold text-main">
                        {arabic ? 'الأسئلة الشائعة' : 'Frequently asked questions'}
                    </h2>
                    <dl className="mt-4 space-y-5">
                        {faqs.map((f) => (
                            <div key={f.q}>
                                <dt className="font-semibold text-main">{f.q}</dt>
                                <dd className="mt-1 text-[1.05rem] leading-relaxed text-muted">{f.a}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}

            <section className="mt-10 border-t border-border pt-6">
                <h2 className="text-lg font-bold text-main">
                    {arabic ? 'تابع التعلّم' : 'Continue learning'}
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                    {related.map((t) => (
                        <li key={t.slug}>
                            <Link
                                href={encodeURI(learnPath(t.slug, t.ar.title, lang))}
                                className="text-sm font-medium text-main hover:text-starta-darkTeal"
                            >
                                {(arabic ? t.ar : t.en).title}
                            </Link>
                        </li>
                    ))}
                </ul>
                <p className="mt-4 text-sm">
                    <Link href={arabic ? '/ar/Learn' : '/Learn'} className="font-semibold text-starta-darkTeal hover:underline">
                        {arabic ? 'كل دروس التعلّم ←' : 'All learn topics →'}
                    </Link>
                </p>
            </section>
        </PublicPageShell>
    );
}
