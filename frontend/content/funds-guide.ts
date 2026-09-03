/**
 * THE FUND-SELECTION GUIDE that sits beneath the ranked table on the money page.
 *
 * WHY: head-to-head against the page that outranks us on this query, the gap is
 * not technical. Ours was ~585 words and 4 headings — a sorted table. Theirs is
 * ~1,400 words and 22 headings, and it answers the DECISION: why there is no
 * single best fund, how to read a return, what the fee actually costs, which
 * type suits which horizon. A searcher typing "أفضل صناديق الاستثمار في مصر"
 * is asking how to choose, not for a leaderboard.
 *
 * YMYL DISCIPLINE — every sentence here is mechanical or definitional:
 * how a return is computed, what a fee arithmetically removes, what a fund type
 * holds, how subscription and redemption work. Nothing recommends a fund, rates
 * suitability, or predicts a return. No figure is invented: the only numbers are
 * ones the reader can verify in the table above, and worked examples are marked
 * as arithmetic illustrations rather than expectations.
 */

export type GuideSection = {
    /** Stable id — used as the heading anchor. */
    id: string;
    headingEn: string;
    headingAr: string;
    /** Paragraphs. Rendered in order. */
    bodyEn: string[];
    bodyAr: string[];
};

export const FUNDS_GUIDE: GuideSection[] = [
    {
        id: 'no-single-best',
        headingEn: 'Why there is no single “best” fund',
        headingAr: 'لماذا لا يوجد صندوق واحد "أفضل"',
        bodyEn: [
            'A ranking by trailing return answers one question — which fund rose most over the past twelve months — and that is a record of the past, not a property of the fund. A money market fund and an equity fund are not competing for the same place in a portfolio: they hold different instruments, carry different volatility and are used over different horizons, so ordering them against each other on a single number compares things that are not alike.',
            'The table above is therefore sorted mechanically and grouped by category. The useful comparison is within a category — one money market fund against another — and against your own horizon and tolerance for a falling net asset value, neither of which a ranking can know.',
        ],
        bodyAr: [
            'الترتيب حسب العائد التاريخي يجيب على سؤال واحد — أي صندوق ارتفع أكثر خلال الاثني عشر شهراً الماضية — وهذا سجل لما مضى وليس صفة ثابتة في الصندوق. صندوق أسواق النقد وصندوق الأسهم لا يتنافسان على المكان نفسه داخل المحفظة: كل منهما يحتفظ بأدوات مختلفة، ويحمل تقلباً مختلفاً، ويُستخدم على أفق زمني مختلف، ولذلك فإن ترتيبهما معاً برقم واحد يقارن بين أشياء غير متماثلة.',
            'لهذا فإن الجدول أعلاه مرتب آلياً ومقسّم حسب الفئة. المقارنة المفيدة تكون داخل الفئة الواحدة — صندوق أسواق نقد مقابل آخر — وأمام أفقك الزمني ومدى تحمّلك لانخفاض صافي قيمة الأصول، وهما أمران لا يعرفهما أي ترتيب.',
        ],
    },
    {
        id: 'reading-returns',
        headingEn: 'How to read a fund’s return',
        headingAr: 'كيف تقرأ عائد الصندوق',
        bodyEn: [
            'Every return on this site is computed from the net asset value the fund manager publishes: the percentage change in NAV between two dates. A one-year return is the change over the trailing twelve months, not an annual rate the fund pays and not a forecast of the next twelve.',
            'Two funds can show the same one-year number and have reached it very differently — one in a straight line, the other after a sharp fall and recovery. That is why the category, the volatility and the length of the published history matter alongside the headline figure. A fund with two years of history and a fund with fifteen are not equally well described by the same percentage.',
        ],
        bodyAr: [
            'كل عائد على هذا الموقع محسوب من صافي قيمة الأصول التي ينشرها مدير الصندوق: نسبة التغير في صافي قيمة الأصول بين تاريخين. وعائد سنة هو التغير خلال آخر اثني عشر شهراً، وليس معدلاً سنوياً يدفعه الصندوق ولا توقعاً للاثني عشر شهراً القادمة.',
            'قد يُظهر صندوقان العائد نفسه لسنة ويكون كل منهما قد وصل إليه بطريقة مختلفة تماماً — أحدهما في خط صاعد مستقر والآخر بعد هبوط حاد ثم تعافٍ. لهذا فإن الفئة ودرجة التقلب وطول السجل المنشور لا تقل أهمية عن الرقم الرئيسي. فصندوق له سجل سنتين وآخر له خمسة عشر عاماً لا تصفهما النسبة نفسها بالدقة ذاتها.',
        ],
    },
    {
        id: 'fund-types',
        headingEn: 'The fund types available in Egypt, and how each behaves',
        headingAr: 'أنواع الصناديق المتاحة في مصر وكيف يتصرف كل نوع',
        bodyEn: [
            'Money market funds hold short-dated instruments — treasury bills, time deposits, short-term debt. They carry the lowest day-to-day variation of the categories listed here and are typically used for money held over short periods.',
            'Fixed income funds hold debt: government bonds, treasury bills and corporate issues. Their value moves with Egyptian interest rates and with the credit quality of what they hold, so a rate move affects them even when nothing about the issuer has changed.',
            'Equity funds invest mainly in shares listed on the Egyptian Exchange. Their net asset value moves with the market, which gives them the widest spread of outcomes in the table — both the largest gains and the largest falls.',
            'Balanced funds hold equities and debt together in proportions set by each fund’s own mandate, so they move less than a pure equity fund and more than a money market fund.',
            'Gold funds track the gold price through bullion or gold-linked instruments, so they follow the international gold price and the pound exchange rate rather than the local equity market.',
            'Shariah-compliant funds follow a mandate screened against Islamic finance rules and supervised by the fund’s own Shariah board. Compliance is as declared by each manager; this site reports that declaration and does not verify it independently.',
        ],
        bodyAr: [
            'صناديق أسواق النقد تحتفظ بأدوات قصيرة الأجل — أذون خزانة وودائع لأجل وأدوات دين قصيرة. وهي الأقل تبايناً من يوم لآخر بين الفئات المدرجة هنا، وتُستخدم عادةً للأموال المحتفظ بها لفترات قصيرة.',
            'صناديق الدخل الثابت تحتفظ بأدوات دين: سندات حكومية وأذون خزانة وسندات شركات. وتتحرك قيمتها مع أسعار الفائدة في مصر ومع الجودة الائتمانية لما تحتفظ به، لذا يؤثر تغير الفائدة عليها حتى دون أن يتغير شيء في جهة الإصدار.',
            'صناديق الأسهم تستثمر أساساً في الأسهم المقيدة بالبورصة المصرية. وتتحرك صافي قيمة أصولها مع السوق، ما يمنحها أوسع نطاق من النتائج في الجدول — أكبر المكاسب وأكبر الخسائر معاً.',
            'الصناديق المتوازنة تحتفظ بالأسهم وأدوات الدين معاً بنسب تحددها لائحة كل صندوق، فتتحرك أقل من صندوق الأسهم وأكثر من صندوق أسواق النقد.',
            'صناديق الذهب تتبع سعر الذهب عبر السبائك أو أدوات مرتبطة به، فتتحرك مع سعر الذهب العالمي وسعر صرف الجنيه لا مع سوق الأسهم المحلي.',
            'الصناديق المتوافقة مع الشريعة تتبع لائحة مفحوصة وفق قواعد التمويل الإسلامي وتحت إشراف هيئة الرقابة الشرعية الخاصة بالصندوق. والتوافق كما يعلنه كل مدير؛ ويعرض هذا الموقع ذلك الإعلان دون التحقق منه بشكل مستقل.',
        ],
    },
    {
        id: 'fees',
        headingEn: 'What the management fee actually costs',
        headingAr: 'ما الذي تكلفه رسوم الإدارة فعلياً',
        bodyEn: [
            'A management fee is charged on assets, not on profit, so it is deducted whether the fund rises or falls. It is already reflected in the published net asset value — the returns in the table are after the fee, not before it.',
            'The arithmetic is worth seeing plainly. On a holding of EGP 100,000, a fee of 0.5% a year removes EGP 500 annually while a fee of 1.5% removes EGP 1,500 — a difference of EGP 1,000 a year on the same balance, repeated every year the money stays invested. That is an illustration of the arithmetic, not a projection of any fund’s return.',
            'A fee only matters relative to what it buys. Comparing the fee of a money market fund with that of an equity fund tells you little; comparing two funds of the same type tells you something.',
        ],
        bodyAr: [
            'تُحتسب رسوم الإدارة على الأصول لا على الأرباح، أي أنها تُخصم سواء ارتفع الصندوق أو انخفض. وهي منعكسة بالفعل في صافي قيمة الأصول المنشورة — فالعوائد في الجدول بعد الرسوم وليست قبلها.',
            'ويستحق الأمر أن نرى الحساب بوضوح: على مبلغ 100,000 جنيه، تخصم رسوم قدرها 0.5% سنوياً مبلغ 500 جنيه في السنة، بينما تخصم رسوم قدرها 1.5% مبلغ 1,500 جنيه — بفارق 1,000 جنيه سنوياً على الرصيد نفسه، ويتكرر كل سنة يبقى فيها المال مستثمراً. وهذا توضيح حسابي وليس توقعاً لعائد أي صندوق.',
            'ولا تعني الرسوم شيئاً إلا مقارنةً بما تشتريه. فمقارنة رسوم صندوق أسواق نقد برسوم صندوق أسهم لا تفيد كثيراً، بينما مقارنة صندوقين من الفئة نفسها تفيد.',
        ],
    },
    {
        id: 'risk',
        headingEn: 'Risk, volatility and drawdown',
        headingAr: 'المخاطر والتقلب وأقصى انخفاض',
        bodyEn: [
            'Volatility measures how much a fund’s net asset value has varied around its own average. A higher figure means larger swings in both directions — it is a measure of variability, not of the chance of losing money.',
            'Maximum drawdown is a different and often more useful number: the largest peak-to-trough fall the fund has actually recorded. It answers “how bad has this already been”, which is a concrete historical fact rather than a statistical abstraction.',
            'Both describe the past. A fund that has never fallen sharply is not a fund that cannot; the record simply does not yet contain such a period.',
        ],
        bodyAr: [
            'يقيس التقلب مدى تباين صافي قيمة أصول الصندوق حول متوسطه. والرقم الأعلى يعني تذبذباً أكبر في الاتجاهين — فهو مقياس للتباين لا لاحتمال الخسارة.',
            'أما أقصى انخفاض فهو رقم مختلف وغالباً أكثر فائدة: أكبر هبوط سجله الصندوق فعلياً من قمة إلى قاع. وهو يجيب على سؤال «إلى أي مدى ساءت الأمور بالفعل»، وهي حقيقة تاريخية ملموسة لا تجريد إحصائي.',
            'وكلاهما يصف الماضي. فالصندوق الذي لم يهبط بحدة من قبل ليس صندوقاً لا يمكن أن يهبط؛ السجل ببساطة لم يتضمن بعد فترة كهذه.',
        ],
    },
    {
        id: 'horizon',
        headingEn: 'Matching a fund to a time horizon',
        headingAr: 'مواءمة الصندوق مع الأفق الزمني',
        bodyEn: [
            'The horizon is the length of time the money can stay invested without being needed. It matters because the categories differ far more in how they behave over months than in how they behave over years.',
            'Money held for a short and known period has little room to recover from a fall, which is why the lowest-variation categories are typically used for it. Money that can stay invested through a full market cycle can absorb a drawdown, which is what makes the higher-variation categories usable at all.',
            'This site does not assess which horizon applies to you. It publishes what each fund holds, how it has behaved and what it charges, so the comparison can be made against a horizon you already know.',
        ],
        bodyAr: [
            'الأفق الزمني هو المدة التي يمكن أن يبقى فيها المال مستثمراً دون الحاجة إليه. وهو مهم لأن الفروق بين الفئات في سلوكها عبر الشهور أكبر بكثير من الفروق في سلوكها عبر السنوات.',
            'فالمال المحتفظ به لفترة قصيرة ومعروفة لا يملك مجالاً كافياً للتعافي من هبوط، ولهذا تُستخدم له عادةً الفئات الأقل تبايناً. أما المال الذي يمكن أن يبقى مستثمراً خلال دورة سوق كاملة فيستطيع استيعاب الانخفاض، وهذا ما يجعل الفئات الأعلى تبايناً قابلة للاستخدام أصلاً.',
            'ولا يقيّم هذا الموقع أي أفق ينطبق عليك. فهو ينشر ما يحتفظ به كل صندوق وكيف تصرّف وما يتقاضاه، حتى تُجرى المقارنة أمام أفق تعرفه أنت.',
        ],
    },
    {
        id: 'how-to-subscribe',
        headingEn: 'How subscription and redemption work',
        headingAr: 'كيف يعمل الاشتراك والاسترداد',
        bodyEn: [
            'Units are bought and sold at the fund’s net asset value rather than at a price set by a market, so there is no bid-offer spread and no order book. Subscription is arranged through the bank or asset manager that offers the fund.',
            'Each fund sets its own subscription and redemption frequency — daily, weekly or otherwise — and its own minimum subscription. Those terms decide how quickly money can be taken out, which for a short horizon can matter more than the return.',
            'The per-fund pages on this site list the manager, the currency, the fee and the minimum where the manager publishes them, and link to the manager’s own disclosure.',
        ],
        bodyAr: [
            'تُشترى الوثائق وتُباع بصافي قيمة الأصول لا بسعر يحدده السوق، فلا يوجد فارق بين العرض والطلب ولا دفتر أوامر. ويتم الاشتراك عبر البنك أو شركة إدارة الأصول التي تطرح الصندوق.',
            'ويحدد كل صندوق دورية الاشتراك والاسترداد الخاصة به — يومية أو أسبوعية أو غير ذلك — كما يحدد الحد الأدنى للاشتراك. وهذه الشروط تحدد سرعة إخراج الأموال، وهو ما قد يكون أهم من العائد نفسه في الأفق القصير.',
            'وتعرض صفحات الصناديق على هذا الموقع مدير الصندوق والعملة والرسوم والحد الأدنى حيثما ينشرها المدير، مع رابط إلى إفصاحه الرسمي.',
        ],
    },
    {
        id: 'regulation',
        headingEn: 'Who regulates Egyptian mutual funds',
        headingAr: 'من ينظّم صناديق الاستثمار المصرية',
        bodyEn: [
            'Mutual funds in Egypt are licensed and supervised by the Financial Regulatory Authority (FRA). Each fund publishes a prospectus setting out its mandate, its fees and its dealing terms, and reports its net asset value on the schedule stated there.',
            'This site is not a fund manager, a distributor or an adviser. It reproduces published figures with the date they were published and links back to the source, so anything shown here can be checked against the manager’s own disclosure.',
        ],
        bodyAr: [
            'تخضع صناديق الاستثمار في مصر لترخيص وإشراف الهيئة العامة للرقابة المالية. وينشر كل صندوق نشرة اكتتاب توضح لائحته ورسومه وشروط التعامل عليه، ويعلن صافي قيمة أصوله وفق الجدول الوارد بها.',
            'وهذا الموقع ليس مديراً لصناديق ولا موزعاً ولا مستشاراً استثمارياً. فهو يعيد نشر الأرقام المعلنة مع تاريخ نشرها ويحيل إلى مصدرها، بحيث يمكن التحقق من أي رقم معروض هنا في إفصاح المدير نفسه.',
        ],
    },
];
