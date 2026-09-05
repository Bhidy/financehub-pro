import Link from 'next/link';
import { GLOSSARY_TERMS } from '@/content/glossary-terms';
import { glossaryPath } from '@/lib/seo';

/**
 * KEY TERMS — the definitions behind a data table, from the glossary.
 *
 * A dividends page with two rows, a price-history page for a thinly traded
 * share, or an Arabic company overview whose upstream description is
 * English-only, is a table with no explanation: 200-290 words server-side
 * (audit 2026-09-05, 58 such pages). The reader who reached it from "عائد
 * التوزيعات" or "تاريخ الاستحقاق" needs the meaning of the columns more than
 * a longer table. These are the glossary's own definitions — one vetted
 * source, both languages — so the same term can never be defined two ways on
 * two pages, and each links to its glossary entry.
 */
export default function KeyTerms({
    slugs,
    lang,
    heading,
}: {
    slugs: string[];
    lang: 'en' | 'ar';
    heading?: string;
}) {
    const isAr = lang === 'ar';
    const terms = slugs
        .map((slug) => GLOSSARY_TERMS.find((g) => g.slug === slug))
        .filter((g): g is (typeof GLOSSARY_TERMS)[number] => !!g);
    if (terms.length === 0) return null;
    return (
        <section className="mt-8 max-w-3xl" aria-label={heading ?? (isAr ? 'مصطلحات أساسية' : 'Key terms')}>
            <h2 className="text-lg font-bold text-main">{heading ?? (isAr ? 'مصطلحات أساسية في هذه الصفحة' : 'Key terms on this page')}</h2>
            <dl className="mt-3 space-y-3">
                {terms.map((g) => {
                    const term = isAr ? g.ar.term : g.en.term;
                    const definition = isAr ? g.ar.definition : g.en.definition;
                    return (
                        <div key={g.slug} className="rounded-xl border border-border bg-surface p-4">
                            <dt className="font-bold text-main">
                                <Link href={encodeURI(glossaryPath(g.slug, g.ar.term, lang))} prefetch={false} className="hover:text-starta-darkTeal">
                                    {term}
                                </Link>
                            </dt>
                            <dd className="mt-1 text-sm leading-relaxed text-muted">{definition}</dd>
                        </div>
                    );
                })}
            </dl>
        </section>
    );
}
