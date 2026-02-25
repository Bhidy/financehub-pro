"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Tag } from "lucide-react";
import type { MarketNewsItem } from "@/lib/api";
import {
    formatNewsDate,
    resolveNewsImageSrc,
    sanitizeNewsText,
    splitNewsParagraphs,
} from "@/lib/news-display";

async function fetchNewsArticleById(id: number): Promise<MarketNewsItem | null> {
    const response = await fetch(
        `/api/v1/news?id=${id}&source_country=EG&limit=1`,
        { cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch article (${response.status})`);
    }

    const rows = (await response.json()) as MarketNewsItem[];
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
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

    return (
        <div className="min-h-screen bg-slate-950 text-white [font-family:var(--font-manrope)]">
            <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_15%_20%,rgba(249,115,22,0.25),transparent_40%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.25),transparent_40%),linear-gradient(135deg,#0f172a,#111827_55%,#020617)]">
                <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="relative mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
                    <Link
                        href="/news"
                        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Egypt Market News
                    </Link>

                    {isLoading ? (
                        <div className="space-y-3">
                            <div className="h-6 w-3/4 animate-pulse rounded bg-slate-800/80" />
                            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-800/80" />
                        </div>
                    ) : isError || !validId || !article ? (
                        <div className="rounded-2xl border border-dashed border-white/20 bg-slate-900/60 px-6 py-10">
                            <h1 className="text-xl font-extrabold">Article not available</h1>
                            <p className="mt-2 text-sm text-slate-400">
                                The requested article could not be found in the Egypt market feed.
                            </p>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-2xl font-extrabold leading-tight md:text-3xl">{title}</h1>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                                {article.symbol && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-300/35 bg-orange-400/10 px-2.5 py-1 font-semibold text-orange-200">
                                        <Tag className="h-3 w-3" />
                                        {article.symbol}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-slate-300">
                                    <CalendarDays className="h-3 w-3" />
                                    {formatNewsDate(article.published_at || article.published_date_raw)}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {!isLoading && !isError && validId && article && (
                <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
                    {imageSrc && (
                        <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageSrc}
                                alt={title}
                                className="h-auto w-full object-cover"
                            />
                        </div>
                    )}

                    <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-[0_22px_45px_-35px_rgba(14,165,233,0.8)] md:p-8">
                        {bodyParagraphs.length > 0 ? (
                            <div className="space-y-5 text-[15px] leading-8 text-slate-200 md:text-base">
                                {bodyParagraphs.map((paragraph, idx) => (
                                    <p key={idx}>{paragraph}</p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No article content available.</p>
                        )}
                    </article>
                </div>
            )}
        </div>
    );
}
