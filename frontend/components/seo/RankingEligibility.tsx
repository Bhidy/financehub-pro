import { rankingEligibility, RANKING_REASON_LABELS, type RankingReason } from '@/lib/fund-stats';

/**
 * RANKING ELIGIBILITY — the block that says, on the ranking page itself, how
 * many funds of the current universe are ranked and exactly why each of the
 * others is not. Deterministic: every count is derived from the same rows the
 * tables are built from, through the same rankingEligibility() rule, so the
 * page can never rank N funds and explain M.
 *
 * Until 2026-09-05 the page said "138 funds ranked" beside a directory of 207
 * with no account of the other 69. The audit's requirement is a published
 * eligible count, excluded count and one reason per exclusion.
 */
type Row = Record<string, unknown>;

export function eligibilitySummary(rows: Row[]) {
    const counts: Record<RankingReason, number> = { ranked: 0, no_history: 0, history_lt_1y: 0, series_gap: 0, suppressed: 0 };
    for (const r of rows) counts[rankingEligibility(r).reason]++;
    const excluded = rows.length - counts.ranked;
    return { total: rows.length, ranked: counts.ranked, excluded, counts };
}

const COPY = {
    en: {
        h: 'Who is ranked, and who is not',
        lede: (t: number, r: number, x: number) =>
            `Of the ${t} Egyptian mutual funds with a current NAV, ${r} are ranked and ${x} are listed but not ranked. A fund is ranked only when our audited engine could compute its trailing 12-month return from the manager's published NAV history; an excluded fund still shows every figure it can honestly support on its own page.`,
        rule: 'Rules, in order: (1) a NAV series we hold and recompute daily; (2) at least 12 months of history; (3) a published NAV within 10% of the window of the 12-month anchor date, or the return is withheld rather than estimated; (4) no data-quality flag on the series (a redenomination artefact the cleaner could not repair suppresses ranking).',
        colReason: 'Reason', colFunds: 'Funds',
    },
    ar: {
        h: 'من يُرتَّب ومن لا يُرتَّب',
        lede: (t: number, r: number, x: number) =>
            `من بين ${t} صندوق استثمار مصري له صافي قيمة أصول حديث، يُرتَّب ${r} صندوقًا ويُدرَج ${x} صندوقًا دون ترتيب. لا يُرتَّب الصندوق إلا عندما يستطيع محرّكنا المُدقَّق حساب عائد آخر 12 شهرًا من سجل صافي قيمة الأصول الذي ينشره المدير؛ ويظل الصندوق المستبعد يعرض على صفحته كل رقم يمكنه إثباته بأمانة.`,
        rule: 'القواعد بالترتيب: (1) سلسلة صافي قيمة أصول نحتفظ بها ونعيد حسابها يوميًا؛ (2) سجل لا يقل عن 12 شهرًا؛ (3) إفصاح منشور في حدود 10% من النافذة حول تاريخ الإسناد قبل 12 شهرًا، وإلا يُحجب العائد بدلًا من تقديره؛ (4) لا يوجد تحذير جودة على السلسلة (خلل إعادة التقييم الذي لم يستطع المنظّف إصلاحه يمنع الترتيب).',
        colReason: 'السبب', colFunds: 'عدد الصناديق',
    },
};

export default function RankingEligibility({ rows, lang }: { rows: Row[]; lang: 'en' | 'ar' }) {
    const s = eligibilitySummary(rows);
    const t = COPY[lang];
    const reasons = (Object.keys(s.counts) as RankingReason[]).filter((k) => k !== 'ranked' && s.counts[k] > 0);
    return (
        <section className="mt-10 max-w-3xl" aria-labelledby="ranking-eligibility" data-ranking-eligible={s.ranked} data-ranking-excluded={s.excluded}>
            <h2 id="ranking-eligibility" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
                <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
                {t.h}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">{t.lede(s.total, s.ranked, s.excluded)}</p>
            <p className="mt-2 text-sm leading-6 text-muted">{t.rule}</p>
            {reasons.length > 0 && (
                <table className="mt-4 w-full max-w-xl text-sm">
                    <thead>
                        <tr className={`border-b border-border text-xs font-bold uppercase tracking-wide text-muted ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                            <th className="py-2">{t.colReason}</th>
                            <th className={`py-2 ${lang === 'ar' ? 'text-left' : 'text-right'}`}>{t.colFunds}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reasons.map((k) => (
                            <tr key={k} className="border-b border-border/60 last:border-0">
                                <td className="py-2 text-muted">{RANKING_REASON_LABELS[k][lang]}</td>
                                <td className={`py-2 tabular-nums font-semibold text-main ${lang === 'ar' ? 'text-left' : 'text-right'}`} dir="ltr">{s.counts[k]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}
