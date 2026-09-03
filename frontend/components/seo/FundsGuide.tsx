import { FUNDS_GUIDE } from '@/content/funds-guide';
import JsonLd from '@/components/seo/JsonLd';

/**
 * The fund-selection guide rendered beneath the ranked table on both money
 * pages. One component, both languages, so the English and Arabic versions
 * cannot drift.
 *
 * Headings carry stable ids so the sections are linkable and so an answer
 * engine quoting one can cite the exact anchor.
 */
export default function FundsGuide({ lang }: { lang: 'en' | 'ar' }) {
    const isAr = lang === 'ar';

    // Each section becomes a Q&A pair for answer engines: the heading is the
    // question a reader is asking, the first paragraph is the direct answer.
    const faq = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FUNDS_GUIDE.map((s) => ({
            '@type': 'Question',
            name: isAr ? s.headingAr : s.headingEn,
            acceptedAnswer: { '@type': 'Answer', text: (isAr ? s.bodyAr : s.bodyEn).join(' ') },
        })),
    };

    return (
        <>
            <JsonLd data={faq} />
            <section className="mt-12 max-w-3xl">
                <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                    <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                    {isAr ? 'كيف تختار صندوق الاستثمار المناسب' : 'How to choose a mutual fund'}
                </h2>
                <p className="mt-3 leading-relaxed text-muted">
                    {isAr
                        ? 'الترتيب أعلاه يخبرك بما حدث. هذا القسم يشرح كيف تقرأه: ما الذي يعنيه العائد فعلاً، وما الذي تكلفه الرسوم، وكيف تختلف الفئات، وما الذي يحدده الأفق الزمني.'
                        : 'The ranking above tells you what happened. This section explains how to read it: what a return actually measures, what a fee costs, how the categories differ, and what the horizon decides.'}
                </p>

                {FUNDS_GUIDE.map((s) => (
                    <div key={s.id} className="mt-8">
                        <h3 id={s.id} className="scroll-mt-24 text-base font-extrabold text-main">
                            {isAr ? s.headingAr : s.headingEn}
                        </h3>
                        {(isAr ? s.bodyAr : s.bodyEn).map((p, i) => (
                            <p key={i} className="mt-2.5 leading-relaxed text-muted">
                                {p}
                            </p>
                        ))}
                    </div>
                ))}

                <p className="mt-8 text-xs leading-relaxed text-muted">
                    {isAr
                        ? 'هذا القسم تعريفي ويشرح آلية عمل الصناديق. وهو لا يمثل توصية بشراء أو بيع أي صندوق ولا مشورة استثمارية، ولا يأخذ في الاعتبار ظروفك المالية. الأداء السابق لا يضمن النتائج المستقبلية.'
                        : 'This section is explanatory and describes how funds work. It is not a recommendation to buy or sell any fund, is not investment advice, and does not account for your circumstances. Past performance does not guarantee future results.'}
                </p>
            </section>
        </>
    );
}
