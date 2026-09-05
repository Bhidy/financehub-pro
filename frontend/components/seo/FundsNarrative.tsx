import Link from 'next/link';
import type { FundsNarrative, NarrativeItem, Lang } from '@/lib/funds-narrative';
import { pct } from '@/lib/funds-narrative';

/** The answer-first sections of the money pages. Server component; all data. */
export default function FundsNarrativeSections({ lang, n, asOfIso = null }: { lang: Lang; n: FundsNarrative; asOfIso?: string | null }) {
    const ar = lang === 'ar';
    const H = ({ children }: { children: React.ReactNode }) => (
        <h2 className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
            <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
            {children}
        </h2>
    );
    // `lead`: the first item of the overall top-5 is the site's 12-month leader;
    // its figure is tagged so the live audit can assert the homepage prints the
    // same value (METRIC_DRIFT_ACROSS_SURFACES).
    const List = ({ items, lead = false }: { items: NarrativeItem[]; lead?: boolean }) => (
        <ol className="mt-3 space-y-2">
            {items.map((x, i) => (
                <li key={x.id} className="flex flex-wrap items-baseline gap-x-2 text-[15px] leading-relaxed">
                    <span className="font-mono text-xs text-muted">{i + 1}.</span>
                    <Link href={encodeURI(x.href)} prefetch={false} className="font-semibold text-starta-darkTeal hover:underline">{x.name}</Link>
                    <span className="text-muted">{ar ? 'عائد 12 شهرًا' : '1-year return'}</span>
                    <strong
                        className={x.ret1y !== null && x.ret1y < 0 ? 'text-red-700' : 'text-emerald-700'}
                        data-metric={lead && i === 0 ? 'lead_fund_return_1y' : undefined}
                        data-as-of={lead && i === 0 ? asOfIso ?? undefined : undefined}
                    >
                        {pct(x.ret1y, lang)}
                    </strong>
                    {x.issuer && <span className="text-sm text-muted">· {x.issuer}</span>}
                </li>
            ))}
        </ol>
    );
    return (
        <>
            {n.intro && <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-main">{n.intro}</p>}
            {n.top5.length >= 3 && (
                <section className="mt-8" aria-label={ar ? 'أفضل 5 صناديق' : 'Best 5 funds'}>
                    <H>{ar ? 'أفضل 5 صناديق استثمار في مصر 2026' : 'Best 5 mutual funds in Egypt (2026)'}</H>
                    <List items={n.top5} lead />
                </section>
            )}
            {n.moneyMarket.length > 0 && (
                <section className="mt-8" aria-label={ar ? 'أفضل صناديق العائد اليومي' : 'Best daily-yield funds'}>
                    <H>{ar ? 'أفضل صندوق عائد يومي في مصر (صناديق أسواق النقد)' : 'Best daily-yield funds in Egypt (money market)'}</H>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                        {ar
                            ? 'صناديق أسواق النقد تستثمر في أذون الخزانة والودائع قصيرة الأجل، تُسعَّر يوميًا وتسمح بالاسترداد في أي يوم عمل، وهي الأقل تقلبًا.'
                            : 'Money-market funds hold treasury bills and short-term deposits, price daily, allow redemption on any business day, and are the least volatile category.'}
                    </p>
                    <List items={n.moneyMarket} />
                </section>
            )}
            {n.shariah.length > 0 && (
                <section className="mt-8" aria-label={ar ? 'الصناديق الإسلامية' : 'Shariah-compliant funds'}>
                    <H>{ar ? 'أفضل صناديق الاستثمار الإسلامية (المتوافقة مع الشريعة)' : 'Best Shariah-compliant funds in Egypt'}</H>
                    <List items={n.shariah} />
                </section>
            )}
            <section className="mt-8" aria-label={ar ? 'صناديق بالدولار' : 'Dollar funds'}>
                <H>{ar ? 'صناديق الاستثمار بالدولار في مصر' : 'Dollar-denominated funds in Egypt'}</H>
                {n.usd.length ? (
                    <List items={n.usd} />
                ) : (
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                        {ar ? 'لا تشمل بياناتنا حاليًا صناديق مقوّمة بالدولار ذات عائد منشور لآخر 12 شهرًا؛ تظهر هنا تلقائيًا عند توفرها.' : 'No USD-denominated fund with a published 12-month return is in our data today; they appear here automatically when available.'}
                    </p>
                )}
            </section>
            <section className="mt-8" aria-label={ar ? 'كيف تشتري' : 'How to buy'}>
                <H>{ar ? 'كيف تشتري وثائق صندوق استثمار في مصر' : 'How to buy mutual fund units in Egypt'}</H>
                <ol className="mt-3 max-w-3xl list-decimal space-y-1.5 ps-5 text-[15px] leading-relaxed">
                    {n.howToBuy.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
            </section>
        </>
    );
}
