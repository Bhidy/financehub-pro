import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_URL } from '@/lib/seo';
import PublicPageShell, { Breadcrumbs, breadcrumbJsonLd } from '@/components/seo/PublicPageShell';
import JsonLd from '@/components/seo/JsonLd';

/**
 * /contact and /ar/contact — one renderer, two URLs.
 *
 * THREE THINGS WERE WRONG:
 *  1. `/ar/contact` returned 404. `/ar/editorial-policy` and `/ar/corrections`
 *     both exist, so the trust cluster had an Arabic hole in exactly the page a
 *     reader reaches when something looks wrong — on a site that defaults to
 *     Arabic.
 *  2. The English page carried ONE tacked-on Arabic paragraph, which is not a
 *     bilingual page: it is an English page with an Arabic footnote.
 *  3. At 234 server-rendered words it was the thinnest YMYL surface on the
 *     site, and it named none of the things a contact page owes a reader —
 *     what we can and cannot help with, what a useful correction report
 *     contains, and where the editorial and corrections policies live.
 *
 * ONE RENDERER, NOT TWO PAGES, deliberately. Every bilingual page in this repo
 * that was written twice has drifted: the labels get localized and the
 * sentences do not. A shared COPY record makes that structurally impossible.
 *
 * NOTHING IS INVENTED. No postal address, no phone number, no named staff, no
 * response-time promise — none of that is known, and a fabricated SLA on a
 * financial site is worse than a short page.
 */

export type Lang = 'en' | 'ar';

const PATH = { en: '/contact', ar: '/ar/contact' } as const;

const SUPPORT = 'support@startamarkets.com';
const CORRECTIONS = 'corrections@startamarkets.com';
const PRIVACY = 'privacy@startamarkets.com';

const COPY = {
    en: {
        title: 'Contact Starta Markets',
        description:
            'Contact Starta Markets: support, data corrections and privacy enquiries for the bilingual Egyptian Exchange and mutual-fund research platform.',
        h1: 'Contact Starta Markets',
        lede: 'We read everything. Email is the only channel — there is no phone line and no chat queue, so a written message with a link in it gets the fastest answer.',
        channelsH2: 'Where to write',
        channels: [
            { label: 'Support and general enquiries', email: SUPPORT, note: 'Product questions, account help, anything that is not working' },
            { label: 'Data corrections', email: CORRECTIONS, note: 'A price, NAV, return or statement that looks wrong' },
            { label: 'Privacy', email: PRIVACY, note: 'Data-protection questions and requests about your own data' },
        ],
        correctionH2: 'Reporting a figure that looks wrong',
        correctionLede:
            'Corrections are the messages we act on fastest, and the ones most often unactionable. A report we can check contains four things:',
        correctionItems: [
            'The page URL — not the fund or company name. The same fund appears on several pages and they read different columns.',
            'The exact figure you are looking at, copied as shown.',
            'What you believe it should be, and where you saw that. A fund manager’s own factsheet is the strongest source.',
            'Roughly when you saw it. Prices and NAVs carry an as-of timestamp, and a figure that was right this morning can look wrong this evening.',
        ],
        cannotH2: 'What we cannot help with',
        cannotLede:
            'Starta Markets is an information platform, not a broker and not an advisor. Some requests we have to decline outright:',
        cannotItems: [
            'We cannot tell you what to buy or sell, or review your portfolio. That is regulated advice, and we are not licensed to give it.',
            'We cannot open an account, place a trade, or move money. We hold no client funds and execute nothing.',
            'We cannot forecast a price, a NAV or a return. Every figure on the site is historical or current; none of it is a projection.',
        ],
        policiesH2: 'Policies',
        policiesLede: 'How the newsroom works, how corrections are handled, and where the data comes from:',
        links: { editorial: 'Editorial policy', corrections: 'Corrections policy', about: 'About and data sources', privacy: 'Privacy', terms: 'Terms' },
        crumbHome: 'Home',
        crumb: 'Contact',
        altLabel: 'اتصل بنا بالعربية',
    },
    ar: {
        title: 'اتصل بستارتا ماركتس — الدعم وتصحيح البيانات',
        description:
            'تواصل مع ستارتا ماركتس: الدعم وتصحيح البيانات واستفسارات الخصوصية لمنصة أبحاث البورصة المصرية وصناديق الاستثمار ثنائية اللغة.',
        h1: 'اتصل بستارتا ماركتس',
        lede: 'نقرأ كل رسالة. البريد الإلكتروني هو القناة الوحيدة — لا يوجد خط هاتفي ولا محادثة مباشرة، ولذلك فإن رسالة مكتوبة تتضمن رابطاً تحصل على أسرع رد.',
        channelsH2: 'إلى أين تكتب',
        channels: [
            { label: 'الدعم والاستفسارات العامة', email: SUPPORT, note: 'أسئلة عن المنصة، أو مساعدة في الحساب، أو أي شيء لا يعمل' },
            { label: 'تصحيح البيانات', email: CORRECTIONS, note: 'سعر أو صافي قيمة وثيقة أو عائد أو بيان مالي يبدو غير صحيح' },
            { label: 'الخصوصية', email: PRIVACY, note: 'أسئلة وطلبات تتعلق بحماية بياناتك الشخصية' },
        ],
        correctionH2: 'الإبلاغ عن رقم يبدو خاطئاً',
        correctionLede:
            'بلاغات التصحيح هي الرسائل التي نتعامل معها بأسرع ما يمكن، وهي أيضاً الأكثر تعذراً على التنفيذ. البلاغ الذي نستطيع فحصه يتضمن أربعة أشياء:',
        correctionItems: [
            'رابط الصفحة، لا اسم الصندوق أو الشركة. الصندوق نفسه يظهر في عدة صفحات وكل منها يقرأ أعمدة مختلفة.',
            'الرقم الذي تنظر إليه بالضبط، منسوخاً كما هو معروض.',
            'الرقم الذي تعتقد أنه الصحيح، ومن أين رأيته. النشرة الرسمية لمدير الصندوق هي أقوى مصدر.',
            'متى رأيته تقريباً. الأسعار وصافي قيمة الوثيقة تحمل ختم وقت، والرقم الصحيح صباحاً قد يبدو خاطئاً مساءً.',
        ],
        cannotH2: 'ما لا نستطيع مساعدتك فيه',
        cannotLede:
            'ستارتا ماركتس منصة معلومات، وليست شركة وساطة ولا مستشاراً مالياً. هناك طلبات نعتذر عنها صراحةً:',
        cannotItems: [
            'لا نستطيع أن نخبرك بما تشتريه أو تبيعه، ولا مراجعة محفظتك. هذه مشورة خاضعة للتنظيم ولسنا مرخصين لتقديمها.',
            'لا نستطيع فتح حساب أو تنفيذ صفقة أو تحويل أموال. لا نحتفظ بأموال عملاء ولا ننفّذ أي أوامر.',
            'لا نستطيع التنبؤ بسعر أو بصافي قيمة وثيقة أو بعائد. كل رقم على الموقع تاريخي أو حالي، ولا شيء منه توقّع.',
        ],
        policiesH2: 'السياسات',
        policiesLede: 'كيف تعمل غرفة التحرير، وكيف تُعالج التصحيحات، ومن أين تأتي البيانات:',
        links: { editorial: 'سياسة التحرير', corrections: 'سياسة التصحيحات', about: 'من نحن ومصادر البيانات', privacy: 'الخصوصية', terms: 'الشروط' },
        crumbHome: 'الرئيسية',
        crumb: 'اتصل بنا',
        altLabel: 'Contact in English',
    },
} as const;

export function contactMetadata(lang: Lang): Metadata {
    const t = COPY[lang];
    return {
        title: t.title,
        description: t.description,
        alternates: {
            canonical: PATH[lang],
            // x-default → Arabic: the site's default language is Arabic.
            languages: { en: PATH.en, ar: PATH.ar, 'x-default': PATH.ar },
        },
    };
}

export function renderContact(lang: Lang) {
    const isAr = lang === 'ar';
    const t = COPY[lang];
    const self = PATH[lang];
    const alt = isAr ? PATH.en : PATH.ar;
    const p = (en: string, ar: string) => (isAr ? ar : en);

    const crumbs = [{ href: isAr ? '/ar' : '/', url: isAr ? '/ar' : '/', label: t.crumbHome }, { label: t.crumb }];

    const list = (items: readonly string[]) => (
        <ul className="mt-3 max-w-3xl space-y-2 leading-relaxed text-muted">
            {items.map((x, i) => (
                <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-starta-teal" />
                    <span>{x}</span>
                </li>
            ))}
        </ul>
    );

    const h2 = (text: string, id: string) => (
        <h2 id={id} className="mt-10 flex scroll-mt-24 items-center gap-2.5 text-lg font-extrabold tracking-tight text-main">
            <span aria-hidden className="inline-block h-4 w-1 rounded-full bg-starta-teal" />
            {text}
        </h2>
    );

    return (
        <PublicPageShell lang={lang} altHref={alt} persistLang>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'ContactPage',
                    name: t.title,
                    url: `${SITE_URL}${self}`,
                    inLanguage: lang,
                    mainEntity: { '@id': `${SITE_URL}/#organization` },
                }}
            />
            <JsonLd data={breadcrumbJsonLd(crumbs, SITE_URL)} />
            <Breadcrumbs items={crumbs} />

            <h1 className="text-2xl font-extrabold text-main sm:text-3xl">{t.h1}</h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-main">{t.lede}</p>

            {h2(t.channelsH2, 'channels')}
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {t.channels.map((c) => (
                    <div key={c.label} className="rounded-xl border border-border bg-surface p-4">
                        <h3 className="text-sm font-bold text-main">{c.label}</h3>
                        <a href={`mailto:${c.email}`} className="mt-2 block break-all font-semibold text-starta-darkTeal hover:underline">
                            {c.email}
                        </a>
                        <p className="mt-1 text-sm text-muted">{c.note}</p>
                    </div>
                ))}
            </div>

            {h2(t.correctionH2, 'corrections')}
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">{t.correctionLede}</p>
            {list(t.correctionItems)}

            {h2(t.cannotH2, 'limits')}
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">{t.cannotLede}</p>
            {list(t.cannotItems)}

            {h2(t.policiesH2, 'policies')}
            <p className="mt-3 max-w-3xl leading-relaxed text-muted">{t.policiesLede}</p>
            <nav aria-label={t.policiesH2} className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
                <Link href={p('/editorial-policy', '/ar/editorial-policy')} className="text-muted hover:text-starta-darkTeal">
                    {t.links.editorial}
                </Link>
                <Link href={p('/corrections', '/ar/corrections')} className="text-muted hover:text-starta-darkTeal">
                    {t.links.corrections}
                </Link>
                <Link href={p('/about', '/ar/about')} className="text-muted hover:text-starta-darkTeal">
                    {t.links.about}
                </Link>
                <Link href="/privacy" className="text-muted hover:text-starta-darkTeal">
                    {t.links.privacy}
                </Link>
                <Link href="/terms" className="text-muted hover:text-starta-darkTeal">
                    {t.links.terms}
                </Link>
                <a href={alt} hrefLang={isAr ? 'en' : 'ar'} lang={isAr ? 'en' : 'ar'} className="text-muted hover:text-starta-darkTeal">
                    {t.altLabel}
                </a>
            </nav>
        </PublicPageShell>
    );
}
