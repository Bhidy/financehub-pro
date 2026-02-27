"use client";

import Link from "next/link";
import clsx from "clsx";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    CalendarDays,
    Clock3,
    Newspaper,
    Tag,
} from "lucide-react";
import type { MarketNewsItem } from "@/lib/api";
import {
    formatNewsDate,
    formatNewsRelative,
    resolveNewsImageSrc,
    sanitizeNewsText,
    splitNewsParagraphs,
} from "@/lib/news-display";

async function fetchNewsArticleById(id: number): Promise<MarketNewsItem | null> {
    const response = await fetch(`/api/v1/news?id=${id}&source_country=EG&limit=1`, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch article (${response.status})`);
    }

    const rows = (await response.json()) as MarketNewsItem[];
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

function estimateReadingMinutes(paragraphs: string[]): number {
    const words = paragraphs.reduce((sum, paragraph) => {
        const count = paragraph.trim().split(/\s+/).filter(Boolean).length;
        return sum + count;
    }, 0);

    if (words === 0) return 1;
    return Math.max(1, Math.round(words / 220));
}

export default function NewsArticlePage() {
    const params = useParams<{ id: string }>();
    const articleId = Number(params?.id);
    const validId = Number.isInteger(articleId) && articleId > 0;

    const { data: article, isLoading, isError } = useQuery({
        queryKey: ["news-article", articleId],
        queryFn: async () => fetchNewsArticleById(articleId),
        enabled: validId,
    });

    const title = sanitizeNewsText(article?.headline);
    const bodyParagraphs = splitNewsParagraphs(article?.article_body);
    const imageSrc = resolveNewsImageSrc(article?.image_url);
    const readingMinutes = estimateReadingMinutes(bodyParagraphs);
    const highlightSource = bodyParagraphs.find((paragraph) => paragraph.trim().length > 0) ?? "";
    const highlightParagraph = highlightSource
        ? highlightSource.replace(/\s+/g, " ").trim().slice(0, 360) + (highlightSource.length > 360 ? "..." : "")
        : "No highlights available for this article.";

    return (
        <div className="min-h-[100dvh] finhub-page bg-slate-50 dark:bg-[#071121] text-slate-900 dark:text-white [font-family:var(--font-manrope)]">
            <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 md:px-8 md:pt-8">
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-[radial-gradient(circle_at_10%_20%,rgba(20,184,166,0.18),transparent_45%),radial-gradient(circle_at_92%_12%,rgba(14,165,233,0.22),transparent_40%),linear-gradient(125deg,#ffffff,#f7fbff_42%,#e9f7ff_100%)] shadow-[0_24px_64px_-42px_rgba(15,23,42,0.35)] dark:border-cyan-300/20 dark:bg-[radial-gradient(circle_at_10%_20%,rgba(20,184,166,0.22),transparent_45%),radial-gradient(circle_at_92%_12%,rgba(14,165,233,0.24),transparent_40%),linear-gradient(125deg,#081427,#0a1c36_45%,#071526_100%)] dark:shadow-[0_32px_72px_-42px_rgba(6,182,212,0.35)]">
                    <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:32px_32px] dark:opacity-20" />

                    <div className="relative px-5 py-6 md:px-8 md:py-8">
                        <Link
                            href="/news"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white/70 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-400/60 hover:text-cyan-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-cyan-300/45 dark:hover:text-cyan-200"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Egypt Market News
                        </Link>

                        {isLoading ? (
                            <div className="mt-6 space-y-3">
                                <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/70" />
                                <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/70" />
                                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/70" />
                            </div>
                        ) : isError || !validId || !article ? (
                            <div className="mt-6 rounded-2xl border border-dashed border-slate-300/80 bg-white/70 px-6 py-10 dark:border-white/20 dark:bg-white/5">
                                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Article not available</h1>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    The requested article could not be found in the Egypt market feed.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-6 max-w-4xl">
                                <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-900 dark:text-white md:text-[2.1rem]">
                                    {title}
                                </h1>

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                                    {article.symbol && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/60 bg-cyan-50 px-2.5 py-1 font-semibold text-cyan-700 dark:border-cyan-300/35 dark:bg-cyan-400/10 dark:text-cyan-200">
                                            <Tag className="h-3 w-3" />
                                            {article.symbol}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/70 px-2.5 py-1 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-200">
                                        <CalendarDays className="h-3 w-3" />
                                        {formatNewsDate(article.published_at || article.published_date_raw)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/70 px-2.5 py-1 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-200">
                                        <Clock3 className="h-3 w-3" />
                                        {formatNewsRelative(article.published_at || article.published_date_raw)}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/70 px-2.5 py-1 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-200">
                                        <Clock3 className="h-3 w-3" />
                                        {readingMinutes} min read
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!isLoading && !isError && validId && article && (
                <div className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-6">
                            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-[#081326] dark:shadow-[0_30px_70px_-44px_rgba(6,182,212,0.4)]">
                                {imageSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={imageSrc} alt={title} className="h-auto w-full object-cover" />
                                ) : (
                                    <div className="relative flex aspect-[16/9] items-center justify-center bg-[radial-gradient(circle_at_top,#14b8a6_0%,#dbeafe_45%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,#0ea5e9_0%,#0f1d36_45%,#060f1f_100%)]">
                                        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.22)_1px,transparent_1px)] [background-size:32px_32px]" />
                                        <div className="relative text-center">
                                            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-cyan-700 shadow-lg dark:bg-white/10 dark:text-cyan-200">
                                                <Newspaper className="h-7 w-7" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{article.symbol || "EGX News"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_64px_-46px_rgba(15,23,42,0.46)] dark:border-white/10 dark:bg-gradient-to-b dark:from-[#09152a] dark:to-[#060f1f] dark:shadow-[0_28px_68px_-44px_rgba(6,182,212,0.36)] md:p-8">
                                {bodyParagraphs.length > 0 ? (
                                    <div className="space-y-6">
                                        {bodyParagraphs.map((paragraph, idx) => {
                                            const isQuote = /^["“]/.test(paragraph.trim());
                                            const isLeadParagraph = idx === 0 && !isQuote;
                                            return (
                                                <p
                                                    key={idx}
                                                    className={clsx(
                                                        "text-[1.01rem] leading-8 text-slate-700 dark:text-slate-200",
                                                        idx === 0 && "text-[1.08rem] font-medium leading-9 text-slate-800 dark:text-slate-100",
                                                        isLeadParagraph &&
                                                        "first-letter:mr-1.5 first-letter:float-left first-letter:text-4xl first-letter:font-black first-letter:leading-[0.88] first-letter:text-cyan-600 dark:first-letter:text-cyan-300",
                                                        isQuote &&
                                                        "rounded-2xl border-l-4 border-cyan-400/80 bg-cyan-50 px-4 py-3 text-slate-700 dark:border-cyan-300/50 dark:bg-cyan-400/10 dark:text-cyan-100"
                                                    )}
                                                >
                                                    {paragraph}
                                                </p>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">No article content available.</p>
                                )}
                            </article>
                        </div>

                        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
                            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_22px_60px_-44px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-[#081326] dark:shadow-[0_22px_56px_-38px_rgba(6,182,212,0.36)]">
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
                                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                                    Story Highlights
                                </h3>

                                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                                    {highlightParagraph}
                                </div>

                                <div className="mt-4 rounded-2xl border border-cyan-300/55 bg-cyan-50/70 px-3 py-3 text-xs leading-relaxed text-cyan-800 dark:border-cyan-300/30 dark:bg-cyan-400/10 dark:text-cyan-100">
                                    Premium editorial digest focused on key information clarity and reading flow.
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            )}
        </div>
    );
}
