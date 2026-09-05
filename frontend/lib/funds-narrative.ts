import { fundPath } from '@/lib/seo';
import { ltrNum } from '@/lib/bidi';
import { categoryOfFund } from '@/content/fund-categories';

/**
 * ANSWER-FIRST NARRATIVE FOR THE MONEY PAGES (2026-09-05).
 *
 * The page that ranks first for "أفضل صناديق الاستثمار في مصر 2026" is a
 * narrative ranking: Google's snippet for it names a fund and its return in a
 * sentence. Ours was a table with a descriptive intro, so the snippet was the
 * meta description and none of the "People also ask" questions (best 5,
 * best daily-yield fund, Shariah funds, dollar funds, how to buy) had an
 * answer on the page. Everything below is generated from the same ranked
 * rows the tables use — names, returns and counts are data, refreshed daily;
 * only the connective copy is written.
 */
type Row = Record<string, unknown>;
export type Lang = 'en' | 'ar';

const str = (r: Row, k: string): string | null => (typeof r[k] === 'string' && (r[k] as string).trim() ? (r[k] as string).trim() : null);
const num = (r: Row, k: string): number | null => {
    const v = r[k];
    const n = typeof v === 'number' ? v : v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
};

const CATEGORY_KEY_TO_NAME: Record<string, string> = {
    // The shared matcher's keys are HYPHENATED ('money-market', 'fixed-income').
    'money-market': 'Money Market Funds',
    'fixed-income': 'Fixed Income Funds',
    equity: 'Equity Funds',
    balanced: 'Balanced Funds',
    shariah: 'Shariah-Compliant Funds',
};
export function categoryOf(r: Row): string {
    const c = categoryOfFund(r as { fund_type?: unknown; fund_type_en?: unknown; classification_en?: unknown; is_shariah?: unknown });
    return (c && CATEGORY_KEY_TO_NAME[c.key]) || 'Other Funds';
}
const isShariah = (r: Row): boolean =>
    r.is_shariah === true ||
    /shariah|islamic/i.test(`${str(r, 'fund_type_en') || ''} ${str(r, 'classification_en') || ''} ${str(r, 'fund_name_en') || ''}`) ||
    /شريعة|إسلامي|الإسلامية|متوافق/.test(`${str(r, 'fund_type') || ''} ${str(r, 'fund_name') || ''}`);
const isUsd = (r: Row): boolean => /usd/i.test(str(r, 'fund_type') || '') || /usd|dollar|\$/i.test(str(r, 'currency') || '') || /دولار/.test(`${str(r, 'currency') || ''} ${str(r, 'fund_name') || ''}`) || /\bUSD\b|dollar/i.test(str(r, 'fund_name_en') || '');

export type NarrativeItem = { id: number; name: string; href: string; ret1y: number | null; issuer: string | null; minSubscription: number | null };
export type FundsNarrative = {
    intro: string;
    top5: NarrativeItem[];
    moneyMarket: NarrativeItem[];
    shariah: NarrativeItem[];
    usd: NarrativeItem[];
    howToBuy: string[];
    faq: Array<{ q: string; a: string }>;
};

function nameOf(r: Row, lang: Lang): string {
    const ar = str(r, 'fund_name');
    const en = str(r, 'fund_name_en');
    return (lang === 'ar' ? ar || en : en || ar) || `Fund ${r.fund_id}`;
}
function issuerOf(r: Row, lang: Lang): string | null {
    return lang === 'ar' ? str(r, 'owner_name') || str(r, 'manager_name') || str(r, 'issuer_en') : str(r, 'owner_name_en') || str(r, 'manager_name_en') || str(r, 'issuer_en');
}
function item(r: Row, lang: Lang): NarrativeItem {
    return {
        id: Number(r.fund_id),
        name: nameOf(r, lang),
        href: fundPath(Number(r.fund_id), str(r, 'fund_name_en'), str(r, 'fund_name'), lang),
        ret1y: num(r, 'return_1y'),
        issuer: issuerOf(r, lang),
        minSubscription: num(r, 'min_subscription'),
    };
}
export function pct(v: number | null, lang: Lang): string {
    if (v === null) return lang === 'ar' ? 'غير متاح' : 'n/a';
    const s = `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
    return lang === 'ar' ? ltrNum(s) : s;
}
const joinNames = (xs: NarrativeItem[], lang: Lang) =>
    xs.map((x, i) => `${i + 1}) ${x.name} (${pct(x.ret1y, lang)})`).join(lang === 'ar' ? '، ' : ', ');

export function buildFundsNarrative(rows: Row[], lang: Lang, asOfHuman: string | null): FundsNarrative {
    const ranked = rows.filter((r) => num(r, 'return_1y') !== null);
    const top5 = ranked.slice(0, 5).map((r) => item(r, lang));
    const moneyMarket = ranked.filter((r) => categoryOf(r) === 'Money Market Funds').slice(0, 3).map((r) => item(r, lang));
    const shariah = ranked.filter(isShariah).slice(0, 3).map((r) => item(r, lang));
    const usd = ranked.filter(isUsd).slice(0, 5).map((r) => item(r, lang));
    const ar = lang === 'ar';
    const asOf = asOfHuman ? (ar ? `بحسب بيانات ${asOfHuman}` : `As of ${asOfHuman}`) : ar ? 'بحسب أحدث البيانات' : 'On the latest data';
    const [a, b, c] = top5;
    const intro = a
        ? ar
            ? `${asOf}، يتصدر «${a.name}» قائمة صناديق الاستثمار في مصر بعائد ${pct(a.ret1y, lang)} خلال آخر 12 شهرًا${b ? `، يليه «${b.name}» بعائد ${pct(b.ret1y, lang)}` : ''}${c ? `، ثم «${c.name}» بعائد ${pct(c.ret1y, lang)}` : ''}. الترتيب آلي من صافي قيمة الأصول المنشورة لكل صندوق ويُحدَّث يوميًا، وهو معلوماتي وليس توصية.`
            : `${asOf}, ${a.name} leads Egypt's mutual funds with a ${pct(a.ret1y, lang)} trailing 1-year return${b ? `, followed by ${b.name} (${pct(b.ret1y, lang)})` : ''}${c ? ` and ${c.name} (${pct(c.ret1y, lang)})` : ''}. The ranking is mechanical, from each fund's published NAVs, refreshes daily, and is information, not advice.`
        : '';
    const minSub = top5.find((x) => x.minSubscription !== null)?.minSubscription ?? null;
    const howToBuy = ar
        ? [
              'اختر الصندوق من الترتيب أعلاه، وراجع فئته ورسومه ومستوى مخاطرته في صفحته.',
              'افتح حسابًا لدى البنك أو شركة إدارة الأصول التي تطرح الصندوق (بطاقة الرقم القومي وإثبات عنوان عادةً).',
              `اشترِ وثائق الصندوق بالحد الأدنى للاشتراك المذكور في نشرة الاكتتاب${minSub !== null ? ` (مثال: ${ltrNum(minSub.toLocaleString('en-EG'))} جنيه لأحد الصناديق المتصدرة)` : ''}.`,
              'الاشتراك والاسترداد يتمان بسعر صافي قيمة الأصول في أيام التعامل المحددة لكل صندوق (يوميًا للصناديق النقدية، وأسبوعيًا لكثير من صناديق الأسهم).',
              'تابع صافي قيمة الأصول والعائد هنا؛ الأداء السابق لا يضمن النتائج المستقبلية.',
          ]
        : [
              'Pick a fund from the ranking above and read its category, fees and risk level on its page.',
              'Open an account with the bank or asset manager that offers it (national ID and proof of address, typically).',
              `Subscribe at the minimum stated in the prospectus${minSub !== null ? ` (for example EGP ${minSub.toLocaleString('en-EG')} for one of the leading funds)` : ''}.`,
              'Subscriptions and redemptions execute at NAV on each fund’s dealing days — daily for money-market funds, weekly for many equity funds.',
              'Track NAV and returns here; past performance does not guarantee future results.',
          ];
    const faq: Array<{ q: string; a: string }> = [];
    if (top5.length >= 3) {
        faq.push(
            ar
                ? { q: 'ما هي أفضل 5 صناديق استثمار في مصر لعام 2026؟', a: `حسب عائد آخر 12 شهرًا${asOfHuman ? ` حتى ${asOfHuman}` : ''}: ${joinNames(top5, lang)}. الترتيب آلي ويتغير مع كل تحديث لصافي قيمة الأصول.` }
                : { q: 'What are the best 5 mutual funds in Egypt for 2026?', a: `By trailing 1-year return${asOfHuman ? ` as of ${asOfHuman}` : ''}: ${joinNames(top5, lang)}. The order is mechanical and changes with every NAV update.` }
        );
    }
    if (moneyMarket.length) {
        const m = moneyMarket[0];
        faq.push(
            ar
                ? { q: 'ما هو أفضل صندوق عائد يومي في مصر؟', a: `بين صناديق أسواق النقد (العائد اليومي)، يتصدر «${m.name}» بعائد ${pct(m.ret1y, lang)} خلال 12 شهرًا${moneyMarket[1] ? `، يليه «${moneyMarket[1].name}» (${pct(moneyMarket[1].ret1y, lang)})` : ''}. هذه الصناديق تُسعَّر يوميًا وتسمح بالاسترداد في أي يوم عمل.` }
                : { q: 'Which is the best daily-yield (money market) fund in Egypt?', a: `Among money-market funds, ${m.name} leads with ${pct(m.ret1y, lang)} over 12 months${moneyMarket[1] ? `, followed by ${moneyMarket[1].name} (${pct(moneyMarket[1].ret1y, lang)})` : ''}. These funds price daily and allow redemption on any business day.` }
        );
    }
    if (shariah.length) {
        faq.push(
            ar
                ? { q: 'ما هي أفضل صناديق الاستثمار الإسلامية في مصر؟', a: `أعلى الصناديق المتوافقة مع الشريعة عائدًا خلال 12 شهرًا: ${joinNames(shariah, lang)}.` }
                : { q: 'What are the best Shariah-compliant funds in Egypt?', a: `The highest-returning Shariah-compliant funds over 12 months: ${joinNames(shariah, lang)}.` }
        );
    }
    faq.push(
        ar
            ? { q: 'هل توجد صناديق استثمار بالدولار في مصر؟', a: usd.length ? `نعم. تشمل بياناتنا ${ltrNum(String(usd.length))} صناديق مقوّمة بالدولار، أعلاها عائدًا «${usd[0].name}» (${pct(usd[0].ret1y, lang)}).` : 'لا تشمل بياناتنا حاليًا صناديق مقوّمة بالدولار ذات عائد منشور لآخر 12 شهرًا؛ تُضاف تلقائيًا عند توفرها.' }
            : { q: 'Are there dollar-denominated funds in Egypt?', a: usd.length ? `Yes. Our data covers ${usd.length} USD-denominated funds; the highest-returning is ${usd[0].name} (${pct(usd[0].ret1y, lang)}).` : 'Our data currently holds no USD-denominated fund with a published 12-month return; they appear automatically when available.' }
    );
    return { intro, top5, moneyMarket, shariah, usd, howToBuy, faq };
}
