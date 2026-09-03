/**
 * COPY FOR THE FUND FEE COMPARISON PAGE, BOTH LANGUAGES.
 *
 * Scope is deliberately narrow and stated on the page itself: of the fee
 * columns our dataset carries, only fee_management is actually populated
 * (~103 funds). Subscription and redemption charges have a published value for
 * a handful of funds, and administration, custody, performance and total
 * expense ratio have none at all. Presenting those as "0%" would be a false
 * statement about a real cost, so they are excluded and their absence is
 * disclosed rather than hidden.
 *
 * YMYL: nothing here may frame a lower fee as a better investment. A fee is an
 * arithmetic certainty; a return is not. The copy says exactly that and stops.
 */

export type Lang = 'en' | 'ar';
type S = Record<Lang, string>;
const s = (en: string, ar: string): S => ({ en, ar });

export const FEES = {
    h1: s(
        'Egyptian Mutual Fund Fees Compared',
        'مقارنة رسوم صناديق الاستثمار في مصر'
    ),
    title: s(
        'Mutual Fund Fees in Egypt — Management Fee Compared by Fund',
        'رسوم صناديق الاستثمار في مصر — مقارنة رسوم الإدارة لكل صندوق'
    ),
    description: s(
        'Annual management fee for every Egyptian mutual fund that publishes one, grouped by fund type with the median for each category. Money market, fixed income, equity, balanced, gold and Shariah-compliant funds.',
        'رسوم الإدارة السنوية لكل صندوق استثمار مصري يفصح عنها، مجمّعة حسب نوع الصندوق مع الوسيط لكل فئة — صناديق أسواق النقد والدخل الثابت والأسهم والمتوازنة والذهب والمتوافقة مع الشريعة.'
    ),
    intro: (funds: number, categories: number): S =>
        s(
            `The annual management fee charged by ${funds} Egyptian mutual funds that publish one, grouped across ${categories} fund types. Fees are shown next to the median for their own category, because what counts as a high fee for a money market fund is not what counts as a high fee for an equity fund.`,
            `رسوم الإدارة السنوية التي يتقاضاها ${funds} صندوق استثمار مصري تفصح عنها، مجمّعة على ${categories} أنواع من الصناديق. وتُعرض الرسوم إلى جوار وسيط فئتها، لأن ما يُعدّ رسماً مرتفعاً لصندوق أسواق نقد ليس هو ما يُعدّ مرتفعاً لصندوق أسهم.`
        ),

    cols: {
        fund: s('Fund', 'الصندوق'),
        manager: s('Manager', 'مدير الاستثمار'),
        fee: s('Management fee', 'رسوم الإدارة'),
        vsMedian: s('vs category median', 'مقابل وسيط الفئة'),
    },
    categoryMedian: s('Category median', 'وسيط الفئة'),
    lowest: s('Lowest', 'الأدنى'),
    highest: s('Highest', 'الأعلى'),
    fundsCounted: (n: number): S => s(`${n} funds`, `${n} صندوق`),
    noFee: s('Not published', 'غير مفصح عنه'),

    /* ── long-form body ─────────────────────────────────────────────────── */

    whatIsH2: s('What the management fee is', 'ما هي رسوم الإدارة'),
    whatIs: s(
        'The management fee is what the asset manager charges each year to run the fund, quoted as a percentage of the fund’s net assets rather than of your gains. It is accrued continuously and deducted from the fund’s own assets, which means the unit price you see published has already had it taken out — you never receive a separate bill for it, and it does not appear as a line on your statement. It is also charged whether the fund rises or falls: the percentage applies to the assets under management, not to performance. That is the single most important property of a fee. A return is uncertain and is a forecast the moment anyone states it in advance; a fee is a known, contractual amount that applies every year regardless of what the market does.',
        'رسوم الإدارة هي ما يتقاضاه مدير الاستثمار سنوياً مقابل إدارة الصندوق، وتُحتسب كنسبة مئوية من صافي أصول الصندوق لا من أرباحك. وتُستحق باستمرار وتُخصم من أصول الصندوق نفسه، ما يعني أن سعر الوثيقة المعلن قد خُصمت منه بالفعل — فلا تتلقى فاتورة منفصلة بها ولا تظهر كبند في كشف حسابك. كما تُحتسب سواء ارتفع الصندوق أو انخفض: فالنسبة تُطبَّق على الأصول المُدارة لا على الأداء. وهذه أهم خاصية في الرسوم على الإطلاق. فالعائد غير مؤكد ويصبح توقعاً بمجرد أن يذكره أحد مقدماً، أما الرسم فمبلغ تعاقدي معلوم يُطبَّق كل عام مهما فعل السوق.'
    ),

    notIncludedH2: s('What this page does not include', 'ما لا تشمله هذه الصفحة'),
    notIncluded: s(
        'This is a comparison of management fees only — it is not a total cost of ownership. Egyptian funds may also apply a subscription charge when you buy, a redemption charge when you sell within a defined holding period, and administrative, custody and audit expenses borne by the fund. A small number of funds additionally charge a performance fee above a stated hurdle. We publish a figure only where the fund itself publishes one, and for those items almost no Egyptian fund does: our dataset carries a subscription or redemption charge for only a handful of funds, and no fund at all reports a consolidated total expense ratio. Showing those columns filled with zeros would state something false about a real cost, so they are left out and their absence named here instead. Treat the number in this table as the largest recurring charge you can verify, not as the whole of what the fund costs.',
        'هذه مقارنة لرسوم الإدارة فقط — وليست إجمالي تكلفة الاستثمار. فقد تطبّق الصناديق المصرية أيضاً عمولة اشتراك عند الشراء، وعمولة استرداد عند البيع خلال فترة احتفاظ محددة، ومصروفات إدارية وحفظ ومراجعة يتحملها الصندوق. ويتقاضى عدد محدود من الصناديق رسم أداء يتجاوز حداً معلناً. ولا ننشر رقماً إلا حين ينشره الصندوق نفسه، وفي هذه البنود لا يكاد يفعل ذلك أي صندوق مصري: فبياناتنا تتضمن عمولة اشتراك أو استرداد لعدد قليل جداً من الصناديق، ولا يفصح أي صندوق عن نسبة مصروفات إجمالية موحّدة. وعرض تلك الأعمدة مملوءة بأصفار سيكون تقريراً كاذباً عن تكلفة حقيقية، لذا استُبعدت وذُكر غيابها هنا بدلاً من ذلك. فتعامل مع الرقم في هذا الجدول باعتباره أكبر رسم متكرر يمكنك التحقق منه، لا باعتباره كل ما يكلفه الصندوق.'
    ),

    comparabilityH2: s(
        'Why fees only compare within the same fund type',
        'لماذا تُقارن الرسوم داخل النوع الواحد فقط'
    ),
    comparability: s(
        'Ranking every fund in the market on one fee list would be the wrong comparison. A money market fund holds treasury bills and bank deposits and requires little research to run, so it charges near the bottom of the range. An equity fund runs company analysis, and a fund tracking gold or holding foreign assets carries custody arrangements a local fixed income fund does not. Those are different jobs, and their fees are set accordingly. A money market fund is not "cheap" because it charges less than an equity fund — it is priced for what it does. The only comparison that tells you something is between funds doing the same job, which is why each table below carries its own category median and each fund is shown as a difference from that median rather than from a market-wide average.',
        'ترتيب كل صناديق السوق في قائمة رسوم واحدة سيكون مقارنة خاطئة. فصندوق أسواق النقد يحتفظ بأذون خزانة وودائع بنكية ولا يتطلب تشغيله بحثاً كبيراً، لذا تأتي رسومه قرب أدنى النطاق. أما صندوق الأسهم فيقوم بتحليل الشركات، والصندوق الذي يتتبع الذهب أو يحتفظ بأصول خارجية تترتب عليه ترتيبات حفظ لا يتحملها صندوق دخل ثابت محلي. فهذه وظائف مختلفة، وتُسعَّر رسومها تبعاً لذلك. وصندوق أسواق النقد ليس «رخيصاً» لأن رسومه أقل من صندوق أسهم — بل هو مُسعَّر مقابل ما يفعله. والمقارنة الوحيدة التي تخبرك بشيء هي بين صناديق تؤدي الوظيفة نفسها، ولهذا يحمل كل جدول أدناه وسيط فئته ويُعرض كل صندوق كفارق عن ذلك الوسيط لا عن متوسط السوق ككل.'
    ),

    arithmeticH2: s('What a fee difference actually costs', 'ماذا يكلّفك فارق الرسوم فعلياً'),
    arithmetic: s(
        'The arithmetic is simple and worth doing before you compare anything else. A management fee of 1.5% on a holding of EGP 100,000 is EGP 1,500 a year; the same holding in a fund charging 0.5% is EGP 500. The one percentage point between them is EGP 1,000 every year, taken out whether that year was good or bad, and it keeps being taken for as long as you hold the fund. That is the entire claim this page makes about fees, and it is a statement of arithmetic rather than of outcome. It does not follow that the cheaper fund will do better — two funds in the same category can differ in strategy, in the risk they take and in what they hold, and none of that is visible in a fee. The fee tells you the certain part of the cost. Everything else about the fund still has to be read.',
        'الحساب بسيط ويستحق أن تجريه قبل أي مقارنة أخرى. فرسم إدارة قدره ١٫٥٪ على استثمار بمئة ألف جنيه يساوي ١٬٥٠٠ جنيه سنوياً، بينما الاستثمار نفسه في صندوق يتقاضى ٠٫٥٪ يساوي ٥٠٠ جنيه. والنقطة المئوية الواحدة بينهما تعني ألف جنيه كل عام، تُخصم سواء كان العام جيداً أو سيئاً، وتستمر في الخصم طوال فترة احتفاظك بالصندوق. هذا هو كل ما تدّعيه هذه الصفحة بشأن الرسوم، وهو تقرير حسابي لا تقرير عن النتائج. ولا يترتب عليه أن الصندوق الأقل رسوماً سيحقق أداءً أفضل — فصندوقان في الفئة نفسها قد يختلفان في الاستراتيجية وفي حجم المخاطرة وفيما يحتفظان به، ولا شيء من ذلك يظهر في الرسم. الرسم يخبرك بالجزء المؤكد من التكلفة. أما بقية ما يخص الصندوق فما زال عليك قراءته.'
    ),

    verifyH2: s('Where to verify a fee', 'أين تتحقق من الرسوم'),
    verify: s(
        'The binding figure is the one in the fund’s own prospectus and its published fact sheet, not on any comparison site including this one. Fees can be revised, and a manager may apply a different rate to a specific unit class. Egyptian funds are licensed and supervised by the Financial Regulatory Authority, and the prospectus filed with it is the document that governs what you are actually charged. Ask the bank or manager distributing the fund for the current prospectus before you subscribe, and check the subscription and redemption terms in it — those are the charges this page cannot show you.',
        'الرقم الملزم هو المذكور في نشرة اكتتاب الصندوق نفسها وفي بياناته المنشورة، لا في أي موقع للمقارنة بما في ذلك هذا الموقع. فالرسوم قابلة للتعديل، وقد يطبّق المدير نسبة مختلفة على فئة وثائق بعينها. والصناديق المصرية مرخّصة وخاضعة لإشراف الهيئة العامة للرقابة المالية، والنشرة المودعة لديها هي المستند الحاكم لما تُحاسَب عليه فعلاً. اطلب من البنك أو مدير الاستثمار الموزّع للصندوق النشرة السارية قبل الاشتراك، وراجع فيها شروط الاشتراك والاسترداد — فهذه هي الرسوم التي لا تستطيع هذه الصفحة عرضها.'
    ),

    coverageNote: (withFee: number, total: number): S =>
        s(
            `${withFee} of the ${total} funds we track publish a management fee. The rest are listed on the funds directory without one; a blank is a fund that does not disclose the figure, not a fund that charges nothing.`,
            `${withFee} من أصل ${total} صندوق نتابعها تفصح عن رسوم الإدارة. أما البقية فمُدرجة في دليل الصناديق دون رسم؛ والفراغ يعني صندوقاً لا يفصح عن الرقم، لا صندوقاً بلا رسوم.`
        ),

    disclaimer: s(
        'Fees are shown as published by each fund and may be revised. This page is informational and is not investment advice or a recommendation of any fund.',
        'تُعرض الرسوم كما يفصح عنها كل صندوق وقد يتم تعديلها. هذه الصفحة معلوماتية ولا تمثل مشورة استثمارية ولا توصية بأي صندوق.'
    ),

    faq: (funds: number) => [
        {
            q: s(
                'What is the average management fee for mutual funds in Egypt?',
                'ما متوسط رسوم إدارة صناديق الاستثمار في مصر؟'
            ),
            a: s(
                `Across the ${funds} Egyptian funds that publish a management fee, the rate varies widely by fund type — money market and fixed income funds sit at the low end and equity funds at the high end. Each category table on this page shows its own median, which is a more useful reference than a single market-wide average that mixes fund types with very different costs to run.`,
                `بين ${funds} صندوقاً مصرياً تفصح عن رسوم الإدارة، تتباين النسبة تبايناً كبيراً حسب نوع الصندوق — فصناديق أسواق النقد والدخل الثابت في الطرف الأدنى وصناديق الأسهم في الأعلى. ويعرض كل جدول فئة في هذه الصفحة وسيطه الخاص، وهو مرجع أنفع من متوسط سوقي واحد يخلط أنواع صناديق تختلف تكلفة تشغيلها اختلافاً كبيراً.`
            ),
        },
        {
            q: s(
                'Is the management fee deducted from my returns?',
                'هل تُخصم رسوم الإدارة من عوائدي؟'
            ),
            a: s(
                'It is deducted from the fund’s assets rather than billed to you, so the published unit price is already net of it. You do not pay it separately, and the performance figures shown for a fund are after the management fee has been taken.',
                'تُخصم من أصول الصندوق ولا تُحصَّل منك مباشرة، لذا فإن سعر الوثيقة المعلن صافٍ منها بالفعل. فأنت لا تدفعها بشكل منفصل، وأرقام الأداء المعروضة للصندوق هي بعد خصم رسوم الإدارة.'
            ),
        },
        {
            q: s(
                'Does this page show subscription and redemption fees?',
                'هل تعرض هذه الصفحة عمولات الاشتراك والاسترداد؟'
            ),
            a: s(
                'No. Almost no Egyptian fund publishes those figures in the data we receive, so showing the column would mean showing zeros that are not true. Check the fund’s prospectus for its subscription and redemption terms before subscribing.',
                'لا. فلا يكاد أي صندوق مصري ينشر تلك الأرقام في البيانات التي تصلنا، وعرض العمود سيعني عرض أصفار غير صحيحة. راجع نشرة اكتتاب الصندوق لمعرفة شروط الاشتراك والاسترداد قبل الاشتراك.'
            ),
        },
        {
            q: s(
                'Does a lower fee mean a better fund?',
                'هل يعني انخفاض الرسوم أن الصندوق أفضل؟'
            ),
            a: s(
                'No. A fee is a certain annual cost and a return is not certain at all, so the fee is the part you can compare with confidence — but two funds in the same category can differ in strategy, holdings and risk, and none of that shows up in the fee. Use it as one input alongside the fund’s mandate and its published record.',
                'لا. فالرسم تكلفة سنوية مؤكدة والعائد غير مؤكد إطلاقاً، لذا فالرسم هو الجزء الذي يمكنك مقارنته بثقة — لكن صندوقين في الفئة نفسها قد يختلفان في الاستراتيجية والمكوّنات والمخاطر، ولا شيء من ذلك يظهر في الرسم. استخدمه كمعطى واحد إلى جانب سياسة الصندوق الاستثمارية وسجله المنشور.'
            ),
        },
    ],
};

export const t = (v: S, lang: Lang): string => v[lang];
