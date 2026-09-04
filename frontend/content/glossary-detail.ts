/**
 * DEPTH LAYER FOR THE GLOSSARY, keyed by term slug.
 *
 * The glossary shipped as one definition paragraph per language, which rendered
 * ~200-260 words per page — thin enough that the site's own SEO auditor flagged
 * all 86 term pages (43 terms x 2 languages) at MEDIUM. Padding the definition
 * would have been the wrong fix: a definition should stay tight and quotable,
 * because that is the part an answer engine lifts.
 *
 * Instead each term gains three things a reader actually wants after the
 * definition — a worked example, why the number is used, and the mistake people
 * make with it — plus, where one exists, a link to the page on this site that
 * shows the term as live data. That last part turns the glossary from a
 * dead-end into an entry point.
 *
 * Kept SEPARATE from content/glossary-terms.ts on purpose (the same reasoning
 * as content/learn-faqs.ts): editing depth can never corrupt the definitions,
 * and a term with no entry here simply renders as it did before.
 *
 * Egypt discipline: no tax rate, price limit, settlement window or trading time
 * is stated as a specific number anywhere in this file. Those change, and a
 * stale figure on a financial site is worse than no figure. Concepts are
 * explained and the reader is pointed at the FRA, the EGX or the prospectus.
 */

export type GlossaryDepth = {
    /** A concrete illustration, with numbers where numbers help. */
    example: string;
    /** What the term is actually used for in practice. */
    whyItMatters: string;
    /** The misreading that most often causes a bad decision. */
    mistake: string;
};

export type GlossaryDetailEntry = {
    en: GlossaryDepth;
    ar: GlossaryDepth;
};

export const GLOSSARY_DETAIL: Record<string, GlossaryDetailEntry> = {
    'stock': {
        en: {
            example: 'If a company has issued 1,000,000 shares and you hold 10,000, you own one per cent of it — one per cent of its profits when they are distributed, and one per cent of any vote at a general assembly.',
            whyItMatters: 'Owning a share means your return comes from two separate places: the dividends the company chooses to pay, and the change in the price others will pay for the share. Those two can move in opposite directions in the same year.',
            mistake: 'Treating the share price as the company\'s value. Price is per share, so a 5 EGP share is not cheaper than a 500 EGP share until you know how many shares exist — market capitalisation is the figure that answers that.',
        },
        ar: {
            example: 'إذا أصدرت شركة مليون سهم وكنت تملك عشرة آلاف، فأنت تملك واحداً في المئة منها — واحداً في المئة من أرباحها عند توزيعها، وواحداً في المئة من أي تصويت في الجمعية العامة.',
            whyItMatters: 'امتلاك السهم يعني أن عائدك يأتي من مصدرين منفصلين: التوزيعات التي تقرر الشركة دفعها، وتغيّر السعر الذي يدفعه الآخرون مقابل السهم. وقد يتحرك الاثنان في اتجاهين متعاكسين في العام نفسه.',
            mistake: 'اعتبار سعر السهم قيمةً للشركة. فالسعر لكل سهم، ولذا فالسهم بخمسة جنيهات ليس أرخص من سهم بخمسمئة حتى تعرف عدد الأسهم القائمة — والقيمة السوقية هي الرقم الذي يجيب عن ذلك.',
        },
    },
    'stock-market': {
        en: {
            example: 'A company that needs capital to build a factory can sell shares to investors instead of borrowing. The investors get a claim on future profits; the company gets money it does not have to repay on a schedule.',
            whyItMatters: 'The market performs two jobs at once: it lets companies raise money, and it gives existing owners a way to sell without asking the company for their money back. The second job is what makes the first one possible.',
            mistake: 'Thinking that when you buy a share your money goes to the company. It goes to whoever sold you the share. The company only receives money when it issues new shares, such as at an IPO or a rights issue.',
        },
        ar: {
            example: 'الشركة التي تحتاج رأس مال لبناء مصنع يمكنها بيع أسهم للمستثمرين بدل الاقتراض. فيحصل المستثمرون على حق في أرباح مستقبلية، وتحصل الشركة على مال لا تلتزم بسداده وفق جدول.',
            whyItMatters: 'يؤدي السوق وظيفتين في آن: يتيح للشركات جمع الأموال، ويمنح الملاك الحاليين وسيلة للبيع دون مطالبة الشركة باسترداد أموالهم. والوظيفة الثانية هي ما يجعل الأولى ممكنة.',
            mistake: 'الظن بأن مالك يذهب إلى الشركة عند شراء السهم. بل يذهب إلى من باعك السهم. ولا تتلقى الشركة مالاً إلا حين تصدر أسهماً جديدة، كما في الطرح العام أو زيادة رأس المال.',
        },
    },
    'egx-30': {
        en: {
            example: 'If the index stands at 30,000 and rises to 30,300, it has gained one per cent — but that one per cent is a weighted average, so a large constituent moving two per cent can lift it more than a small one moving ten.',
            whyItMatters: 'It is the number quoted when anyone says the Egyptian market rose or fell, and it is the benchmark most local equity funds are measured against. Knowing it is free-float weighted tells you whose performance it is actually reporting.',
            mistake: 'Assuming the index describes your holdings. It reflects thirty large companies weighted by tradable value; a portfolio of small caps can fall in a month the index rises, without either figure being wrong.',
        },
        ar: {
            example: 'إذا كان المؤشر عند ٣٠٬٠٠٠ وارتفع إلى ٣٠٬٣٠٠، فقد ربح واحداً في المئة — لكن هذا الواحد في المئة متوسط مرجّح، فتحرك شركة كبيرة بنسبة اثنين في المئة قد يرفعه أكثر من تحرك شركة صغيرة بعشرة.',
            whyItMatters: 'هو الرقم الذي يُذكر حين يقول أحد إن السوق المصري ارتفع أو انخفض، وهو المؤشر القياسي الذي تُقاس عليه معظم صناديق الأسهم المحلية. ومعرفة أنه مرجّح بالأسهم الحرة تخبرك عن أداء مَن يبلّغ فعلاً.',
            mistake: 'افتراض أن المؤشر يصف حيازاتك. فهو يعكس ثلاثين شركة كبيرة مرجّحة بالقيمة القابلة للتداول؛ وقد تنخفض محفظة من الشركات الصغيرة في شهر يرتفع فيه المؤشر دون أن يكون أي من الرقمين خاطئاً.',
        },
    },
    'mutual-fund': {
        en: {
            example: 'A fund with 500 million EGP of assets and 50 million units outstanding has a net asset value of 10 EGP per unit. Subscribe with 10,000 EGP and you receive 1,000 units at that valuation.',
            whyItMatters: 'A fund gives a small saver access to a diversified, professionally managed portfolio that would be impractical to assemble individually, and it prices units from the portfolio\'s own value rather than from what another buyer will pay.',
            mistake: 'Expecting a fund to be safe because it is diversified. Diversification reduces the risk of any single holding ruining you; it does not remove the risk of the whole market falling, and an equity fund falls when equities fall.',
        },
        ar: {
            example: 'صندوق لديه أصول بقيمة ٥٠٠ مليون جنيه و٥٠ مليون وثيقة قائمة يكون صافي قيمة أصوله ١٠ جنيهات للوثيقة. فإذا اشتركت بعشرة آلاف جنيه حصلت على ألف وثيقة عند ذلك التقييم.',
            whyItMatters: 'يمنح الصندوق المدّخر الصغير وصولاً إلى محفظة متنوعة تُدار باحتراف يصعب تكوينها فردياً، ويسعّر الوثائق من قيمة المحفظة نفسها لا مما سيدفعه مشترٍ آخر.',
            mistake: 'توقّع أن يكون الصندوق آمناً لأنه متنوع. فالتنويع يقلل خطر أن تدمّرك حيازة واحدة؛ لكنه لا يزيل خطر هبوط السوق كله، وصندوق الأسهم ينخفض حين تنخفض الأسهم.',
        },
    },
    'nav': {
        en: {
            example: 'A fund holding 200 million EGP of assets with 4 million EGP of liabilities has 196 million EGP net. Divided by 20 million units, the NAV is 9.80 EGP per unit — the price at which units are issued and redeemed.',
            whyItMatters: 'NAV is what makes a fund\'s price honest: it is computed from what the portfolio is actually worth, not negotiated between buyer and seller. It is also already net of the management fee, which is deducted inside the fund.',
            mistake: 'Comparing two funds by their NAV per unit. A 100 EGP unit is not more expensive than a 10 EGP unit — it just means fewer units were issued for the same money. Only the percentage change in NAV is comparable.',
        },
        ar: {
            example: 'صندوق يحتفظ بأصول قيمتها ٢٠٠ مليون جنيه وعليه التزامات بأربعة ملايين يكون صافيه ١٩٦ مليون جنيه. وبقسمته على ٢٠ مليون وثيقة يكون صافي قيمة الأصول ٩٫٨٠ جنيه للوثيقة — وهو السعر الذي تُصدر به الوثائق وتُسترد.',
            whyItMatters: 'صافي قيمة الأصول هو ما يجعل سعر الصندوق أميناً: فهو محسوب مما تساويه المحفظة فعلاً لا متفاوضاً عليه بين بائع ومشترٍ. وهو أيضاً صافٍ بالفعل من رسوم الإدارة التي تُخصم داخل الصندوق.',
            mistake: 'مقارنة صندوقين بصافي قيمة الأصول للوثيقة. فالوثيقة بمئة جنيه ليست أغلى من وثيقة بعشرة — بل يعني ذلك فقط أن وثائق أقل أُصدرت مقابل المال نفسه. والقابل للمقارنة هو نسبة التغير في صافي قيمة الأصول وحدها.',
        },
    },
    'dividend': {
        en: {
            example: 'A company earning 5 EGP per share may distribute 2 EGP and retain 3 to reinvest. The 2 EGP arrives as cash; the 3 EGP stays in the business and should, if invested well, show up later in the share price.',
            whyItMatters: 'Dividends are the part of a return you receive without selling anything, which matters to anyone using a holding for income rather than growth. They also signal what management believes about the durability of earnings.',
            mistake: 'Reading a large dividend as strength. A company can pay out more than it earns by drawing on reserves or borrowing, and a payout that is not covered by earnings is usually a temporary one.',
        },
        ar: {
            example: 'شركة تربح خمسة جنيهات للسهم قد توزّع جنيهين وتحتجز ثلاثة لإعادة استثمارها. فيصل الجنيهان نقداً؛ وتبقى الثلاثة في النشاط ويُفترض أن تظهر لاحقاً في سعر السهم إن أُحسن استثمارها.',
            whyItMatters: 'التوزيعات هي الجزء من العائد الذي تتسلمه دون أن تبيع شيئاً، وهو ما يهم كل من يستخدم حيازته للدخل لا للنمو. وهي تشير أيضاً إلى ما تعتقده الإدارة بشأن استدامة الأرباح.',
            mistake: 'قراءة التوزيع الكبير على أنه قوة. فقد توزّع الشركة أكثر مما تربح بالسحب من الاحتياطيات أو بالاقتراض، والتوزيع غير المغطّى بالأرباح يكون مؤقتاً عادةً.',
        },
    },
    'dividend-yield': {
        en: {
            example: 'A share priced at 40 EGP paying 3.20 EGP a year yields 8 per cent. If the price falls to 32 EGP and the payout is unchanged, the yield becomes 10 per cent — the yield rose because the price fell, not because anything improved.',
            whyItMatters: 'Yield lets you compare the income from shares of very different prices on one scale, and against alternatives such as a deposit or a bill. It is the income half of a total return, with price change being the other half.',
            mistake: 'Chasing the highest yield on a screen. An unusually high yield is frequently a falling price pricing in a cut to the dividend, so the yield you see is one the company may not pay again.',
        },
        ar: {
            example: 'سهم سعره ٤٠ جنيهاً ويوزّع ٣٫٢٠ جنيه سنوياً يعطي عائداً ٨ في المئة. فإذا انخفض السعر إلى ٣٢ جنيهاً وبقي التوزيع كما هو صار العائد ١٠ في المئة — ارتفع العائد لأن السعر انخفض لا لأن شيئاً تحسّن.',
            whyItMatters: 'يتيح لك العائد مقارنة الدخل من أسهم تختلف أسعارها اختلافاً كبيراً على مقياس واحد، ومقارنته ببدائل كالوديعة أو أذون الخزانة. وهو نصف العائد الكلي الخاص بالدخل، والنصف الآخر تغيّر السعر.',
            mistake: 'مطاردة أعلى عائد في قائمة. فالعائد المرتفع على غير المعتاد كثيراً ما يكون سعراً هابطاً يسعّر خفضاً مرتقباً للتوزيع، فيكون العائد الذي تراه عائداً قد لا تدفعه الشركة مجدداً.',
        },
    },
    'ex-dividend-date': {
        en: {
            example: 'If a share trades at 50 EGP and is about to pay a 2 EGP dividend, it will typically open around 48 EGP on the ex-dividend date. Nothing has gone wrong — the cash has simply moved from the company to the shareholders of record.',
            whyItMatters: 'It settles who receives a declared distribution. Buy on or after the ex-date and the seller keeps that payment, which is why the date matters more than the payment date to anyone timing a purchase.',
            mistake: 'Buying just before the ex-date to capture the dividend. The price adjusts by roughly the dividend, so you are exchanging part of the share\'s value for cash rather than gaining anything.',
        },
        ar: {
            example: 'إذا كان السهم يُتداول عند ٥٠ جنيهاً وعلى وشك توزيع جنيهين، فسيفتح عادةً قرب ٤٨ جنيهاً في تاريخ نزول الكوبون. ولم يحدث خطأ — بل انتقل النقد ببساطة من الشركة إلى المساهمين المقيدين.',
            whyItMatters: 'يحسم هذا التاريخ من يتسلم التوزيع المعلن. فالشراء في تاريخ نزول الكوبون أو بعده يعني أن البائع يحتفظ بذلك التوزيع، ولهذا يهم هذا التاريخ أكثر من تاريخ الصرف لمن يوقّت شراءه.',
            mistake: 'الشراء قبيل تاريخ نزول الكوبون لاقتناص التوزيع. فالسعر يُعدَّل بمقدار التوزيع تقريباً، أي أنك تستبدل جزءاً من قيمة السهم بنقد لا أن تكسب شيئاً.',
        },
    },
    'market-cap': {
        en: {
            example: 'A company with 200 million shares trading at 75 EGP has a market capitalisation of 15 billion EGP. A company with 2 billion shares at 7.50 EGP has exactly the same market value, despite a share price ten times lower.',
            whyItMatters: 'It is the only figure that lets you compare the size of two companies, and it drives index weighting and which funds are permitted to hold a stock. It is also the denominator in most valuation ratios.',
            mistake: 'Confusing market value with what the business owns. Market cap is what buyers are currently willing to pay for the equity; total assets and book value describe the company\'s own balance sheet, and the two can differ enormously.',
        },
        ar: {
            example: 'شركة لديها ٢٠٠ مليون سهم تُتداول عند ٧٥ جنيهاً تبلغ قيمتها السوقية ١٥ مليار جنيه. وشركة لديها ملياري سهم عند ٧٫٥٠ جنيه لها القيمة السوقية نفسها تماماً، رغم أن سعر سهمها أقل بعشر مرات.',
            whyItMatters: 'هي الرقم الوحيد الذي يتيح مقارنة حجم شركتين، وهي تحدد الترجيح في المؤشرات وأي الصناديق يجوز لها الاحتفاظ بالسهم. وهي أيضاً المقام في معظم نسب التقييم.',
            mistake: 'الخلط بين القيمة السوقية وما تملكه الشركة. فالقيمة السوقية ما يرغب المشترون في دفعه حالياً مقابل حقوق الملكية؛ أما إجمالي الأصول والقيمة الدفترية فتصف ميزانية الشركة نفسها، وقد يتباعد الاثنان تباعداً هائلاً.',
        },
    },
    'pe-ratio': {
        en: {
            example: 'A share at 60 EGP earning 6 EGP per share trades on a P/E of 10 — you are paying ten pounds for each pound of annual earnings. At the same price with earnings of 3 EGP, the P/E is 20.',
            whyItMatters: 'It converts price into a multiple of earnings, which is the only way to compare what you are paying across companies of different sizes and share prices. Comparing it against sector peers is where it carries information.',
            mistake: 'Reading a low P/E as cheap. A low multiple often means the market expects those earnings to fall, and a high one can reflect earnings expected to grow. The ratio is a question about expectations, not an answer about value.',
        },
        ar: {
            example: 'سهم بستين جنيهاً يربح ستة جنيهات للسهم يُتداول بمكرر ربحية ١٠ — أي أنك تدفع عشرة جنيهات مقابل كل جنيه من الأرباح السنوية. وبالسعر نفسه مع أرباح ثلاثة جنيهات يصير المكرر ٢٠.',
            whyItMatters: 'يحوّل المكرر السعر إلى مضاعف للأرباح، وهي الطريقة الوحيدة لمقارنة ما تدفعه بين شركات تختلف أحجامها وأسعار أسهمها. وتظهر فائدته عند مقارنته بنظرائه في القطاع.',
            mistake: 'قراءة المكرر المنخفض على أنه رخص. فالمضاعف المنخفض كثيراً ما يعني أن السوق يتوقع تراجع تلك الأرباح، والمرتفع قد يعكس أرباحاً يُتوقع نموها. فالنسبة سؤال عن التوقعات لا إجابة عن القيمة.',
        },
    },
    'pb-ratio': {
        en: {
            example: 'A bank whose book value is 40 EGP per share trading at 60 EGP has a P/B of 1.5. At 30 EGP it would trade at 0.75 — below the accounting value of its net assets.',
            whyItMatters: 'It is most useful for banks and asset-heavy businesses, where the balance sheet is a meaningful description of what the company is. For a company whose value is people or brand, book value captures little of it.',
            mistake: 'Assuming below book value means a bargain. A company can trade under book because the market doubts those assets are worth their stated value, or because it is expected to lose money and erode them.',
        },
        ar: {
            example: 'بنك قيمته الدفترية ٤٠ جنيهاً للسهم ويُتداول عند ٦٠ جنيهاً يكون مضاعف قيمته الدفترية ١٫٥. وعند ٣٠ جنيهاً يُتداول عند ٠٫٧٥ — أي دون القيمة المحاسبية لصافي أصوله.',
            whyItMatters: 'يفيد أكثر ما يفيد مع البنوك والأنشطة كثيفة الأصول، حيث تكون الميزانية وصفاً ذا معنى لما تمثله الشركة. أما الشركة التي تكمن قيمتها في أفرادها أو علامتها فلا تلتقط القيمة الدفترية منها الكثير.',
            mistake: 'افتراض أن التداول دون القيمة الدفترية صفقة رابحة. فقد تُتداول الشركة دون قيمتها الدفترية لأن السوق يشك في أن تلك الأصول تساوي قيمتها المعلنة، أو لأنه يتوقع خسائر تآكلها.',
        },
    },
    'eps': {
        en: {
            example: 'A company earning 900 million EGP with 300 million shares outstanding reports earnings per share of 3 EGP. If it issues 100 million new shares and profit is unchanged, EPS falls to 2.25 EGP.',
            whyItMatters: 'EPS puts profit on a per-share basis, which is the only form in which it is comparable to a share price. It is the denominator of the P/E ratio and the figure most commonly quoted when results are announced.',
            mistake: 'Assuming rising EPS means a growing business. EPS can rise because profit grew, or because the share count shrank through a buyback, or because of a one-off gain — the three have very different implications.',
        },
        ar: {
            example: 'شركة تربح ٩٠٠ مليون جنيه ولديها ٣٠٠ مليون سهم قائم تعلن ربحية سهم قدرها ٣ جنيهات. فإذا أصدرت ١٠٠ مليون سهم جديد وبقي الربح كما هو انخفضت ربحية السهم إلى ٢٫٢٥ جنيه.',
            whyItMatters: 'تضع ربحية السهم الربح على أساس السهم الواحد، وهي الصورة الوحيدة التي يصبح فيها قابلاً للمقارنة بسعر السهم. وهي مقام مكرر الربحية والرقم الأكثر ذكراً عند إعلان النتائج.',
            mistake: 'افتراض أن ارتفاع ربحية السهم يعني نمو النشاط. فقد ترتفع لأن الربح نما، أو لأن عدد الأسهم تقلص بإعادة شراء، أو بسبب مكسب غير متكرر — وللثلاثة دلالات مختلفة تماماً.',
        },
    },
    'ipo': {
        en: {
            example: 'A family-owned company sells 30 per cent of its shares to the public at a set offer price. The founders convert part of their ownership into cash, or the company raises new money, and from listing day the price is set by the market.',
            whyItMatters: 'An IPO is the moment a private company becomes publicly priced and subject to disclosure obligations. It is also one of the few occasions when money paid by investors actually reaches the company rather than a previous shareholder.',
            mistake: 'Assuming the offer price is a fair value. It is a price negotiated between the seller and its advisers, and the seller has more information about the business than any buyer does.',
        },
        ar: {
            example: 'شركة عائلية تبيع ٣٠ في المئة من أسهمها للجمهور بسعر طرح محدد. فيحوّل المؤسسون جزءاً من ملكيتهم إلى نقد، أو تجمع الشركة أموالاً جديدة، ومن يوم القيد يحدد السوق السعر.',
            whyItMatters: 'الطرح العام هو اللحظة التي تصبح فيها الشركة الخاصة مسعّرة علناً وخاضعة لالتزامات الإفصاح. وهو أيضاً من المناسبات القليلة التي تصل فيها أموال المستثمرين إلى الشركة نفسها لا إلى مساهم سابق.',
            mistake: 'افتراض أن سعر الطرح قيمة عادلة. فهو سعر متفاوض عليه بين البائع ومستشاريه، والبائع يملك عن النشاط معلومات أكثر مما يملكه أي مشترٍ.',
        },
    },
    'bull-market': {
        en: {
            example: 'A market that rises steadily for two years, with each pullback shallower than the last and buyers returning quickly after bad news, is behaving as a bull market regardless of what any single day looks like.',
            whyItMatters: 'The label describes a prolonged direction, which matters because the same investment behaviour produces very different results depending on which regime it is applied in. It is only ever identified with hindsight.',
            mistake: 'Treating a bull market as evidence of skill. When most things are rising, a rising portfolio says little about the decisions inside it, and confidence built in that period is often tested badly in the next one.',
        },
        ar: {
            example: 'سوق يرتفع باطراد لعامين، مع تراجعات كل واحد منها أقل عمقاً من سابقه وعودة سريعة للمشترين بعد الأخبار السيئة، هو سوق صاعد بصرف النظر عن شكل أي يوم بمفرده.',
            whyItMatters: 'يصف الوصف اتجاهاً ممتداً، وهذا مهم لأن السلوك الاستثماري نفسه يعطي نتائج شديدة الاختلاف تبعاً للنظام السائد الذي يُطبَّق فيه. ولا يُحدَّد إلا بأثر رجعي.',
            mistake: 'اعتبار السوق الصاعد دليلاً على المهارة. فحين يرتفع معظم شيء، لا تقول المحفظة المرتفعة الكثير عن القرارات داخلها، والثقة المبنية في تلك الفترة كثيراً ما تُختبر بقسوة في التالية.',
        },
    },
    'bear-market': {
        en: {
            example: 'A decline of twenty per cent or more from a recent peak, sustained rather than momentary, is the conventional threshold. The 2008 and 2020 declines are the reference points most investors have in mind.',
            whyItMatters: 'Bear markets are when the gap between a plan and an investor\'s behaviour becomes expensive, because the decision to sell is made under the strongest possible pressure to make it.',
            mistake: 'Believing you will act calmly because you intend to. The practical safeguard is to hold something whose plausible bad year is inside a loss you have already decided you could sit through.',
        },
        ar: {
            example: 'تراجع بنسبة عشرين في المئة أو أكثر من قمة قريبة، ممتد لا لحظي، هو الحد المتعارف عليه. وتراجعا ٢٠٠٨ و٢٠٢٠ هما المرجعان في ذهن معظم المستثمرين.',
            whyItMatters: 'الأسواق الهابطة هي حين تصبح الفجوة بين الخطة وسلوك المستثمر مكلفة، لأن قرار البيع يُتخذ تحت أقوى ضغط ممكن لاتخاذه.',
            mistake: 'الاعتقاد بأنك ستتصرف بهدوء لمجرد أنك تنوي ذلك. والضمانة العملية أن تحتفظ بما يقع عامه السيئ المحتمل داخل خسارة قررت سلفاً أنك تحتملها.',
        },
    },
    'volatility': {
        en: {
            example: 'Two shares can both end a year up ten per cent while one moved within a narrow band all year and the other fell thirty per cent mid-year before recovering. The second is far more volatile despite the identical result.',
            whyItMatters: 'Volatility describes the path, not the destination, and the path is what determines whether you are still holding at the end. It is also the input behind risk labels on fund fact sheets.',
            mistake: 'Equating volatility with risk of loss. A volatile holding may recover fully; a stable one may erode quietly through inflation. They are different risks and one does not substitute for the other.',
        },
        ar: {
            example: 'قد ينهي سهمان عاماً بارتفاع عشرة في المئة بينما تحرك أحدهما في نطاق ضيق طوال العام وانخفض الآخر ثلاثين في المئة في منتصفه قبل أن يتعافى. والثاني أشد تقلباً بكثير رغم تطابق النتيجة.',
            whyItMatters: 'يصف التقلب المسار لا الوجهة، والمسار هو ما يحدد ما إذا كنت لا تزال محتفظاً في النهاية. وهو أيضاً المُدخل وراء تصنيفات المخاطر في بيانات الصناديق.',
            mistake: 'مساواة التقلب بخطر الخسارة. فالحيازة المتقلبة قد تتعافى تماماً؛ والمستقرة قد تتآكل بهدوء بفعل التضخم. وهما خطران مختلفان لا يحل أحدهما محل الآخر.',
        },
    },
    'liquidity': {
        en: {
            example: 'A share trading tens of thousands of times a day can be sold in size without moving the price much. One trading a few times a week may have no buyer near the last quoted price when you want out.',
            whyItMatters: 'Liquidity determines whether the price you see is a price you can actually get. It matters most at exactly the moment you least want it to — when many holders want to sell at once.',
            mistake: 'Reading a last traded price on an illiquid share as a valuation. If the last trade was small and days old, it tells you what one buyer paid, not what your holding is worth.',
        },
        ar: {
            example: 'سهم يُتداول عشرات الآلاف من المرات يومياً يمكن بيعه بكميات دون تحريك السعر كثيراً. أما الذي يُتداول بضع مرات أسبوعياً فقد لا تجد له مشترياً قرب آخر سعر معلن حين تريد الخروج.',
            whyItMatters: 'تحدد السيولة ما إذا كان السعر الذي تراه سعراً يمكنك الحصول عليه فعلاً. وهي تهم أكثر ما تهم في اللحظة التي لا تريد فيها ذلك — حين يريد كثير من الملاك البيع دفعةً واحدة.',
            mistake: 'قراءة آخر سعر تداول لسهم ضعيف السيولة باعتباره تقييماً. فإذا كانت الصفقة الأخيرة صغيرة وقديمة بأيام فهي تخبرك بما دفعه مشترٍ واحد لا بما تساويه حيازتك.',
        },
    },
    'diversification': {
        en: {
            example: 'Ten shares that are all Egyptian banks are far less diversified than they look: they share a regulator, an economy, an interest-rate environment and a customer base, so they tend to fall together.',
            whyItMatters: 'Diversification is the one improvement available without giving up expected return — it reduces the damage any single failure can do. That is why it is the first thing a fund provides.',
            mistake: 'Counting holdings instead of exposures. Twenty positions driven by the same underlying factor behave like one position; genuine diversification comes from holding things that respond to different forces.',
        },
        ar: {
            example: 'عشرة أسهم كلها لبنوك مصرية أقل تنوعاً بكثير مما تبدو: فهي تتشارك جهة رقابية واقتصاداً وبيئة أسعار فائدة وقاعدة عملاء، ولذا تميل إلى الهبوط معاً.',
            whyItMatters: 'التنويع هو التحسين الوحيد المتاح دون التنازل عن العائد المتوقع — فهو يقلل الضرر الذي يمكن أن يسببه أي إخفاق منفرد. ولهذا هو أول ما يوفره الصندوق.',
            mistake: 'عدّ الحيازات بدل عدّ الانكشافات. فعشرون مركزاً تحركها العوامل الأساسية نفسها تتصرف كمركز واحد؛ والتنويع الحقيقي يأتي من الاحتفاظ بأشياء تستجيب لقوى مختلفة.',
        },
    },
    'portfolio': {
        en: {
            example: 'A portfolio might hold a money market fund for a near-term commitment, an equity fund for money that can stay a decade, and a cash reserve — three holdings answering three different questions.',
            whyItMatters: 'The portfolio, not any single holding, is what actually determines your outcome. A position that looks reckless alone can be sensible as a small part of a whole, and the reverse is equally true.',
            mistake: 'Judging each holding on its own performance. The right question is what a holding does for the portfolio — something that falls when everything else rises may be doing exactly its job.',
        },
        ar: {
            example: 'قد تحتفظ المحفظة بصندوق أسواق نقد لالتزام قريب، وصندوق أسهم لمال يمكن أن يبقى عقداً، واحتياطي نقدي — ثلاث حيازات تجيب عن ثلاثة أسئلة مختلفة.',
            whyItMatters: 'المحفظة لا أي حيازة منفردة هي ما يحدد نتيجتك فعلاً. فالمركز الذي يبدو متهوراً بمفرده قد يكون رشيداً كجزء صغير من كل، والعكس صحيح تماماً.',
            mistake: 'الحكم على كل حيازة بأدائها وحدها. فالسؤال الصحيح ما الذي تفعله الحيازة للمحفظة — وما ينخفض حين يرتفع كل شيء آخر قد يكون يؤدي وظيفته بالضبط.',
        },
    },
    'broker': {
        en: {
            example: 'You place an order with a licensed brokerage, which routes it to the exchange and, once executed, arranges settlement. The shares are registered to you centrally rather than held in the broker\'s name.',
            whyItMatters: 'A broker is the only route a retail investor has to the exchange, and the licence is what makes that route supervised. Commission and the quality of execution are both part of what you are paying for.',
            mistake: 'Choosing purely on commission. The lowest published rate is not the lowest total cost once minimum charges, execution quality and the reliability of the platform are included.',
        },
        ar: {
            example: 'تضع أمراً لدى شركة سمسرة مرخّصة، فتوجّهه إلى البورصة وترتّب التسوية بعد التنفيذ. وتُقيَّد الأسهم باسمك مركزياً لا باسم السمسار.',
            whyItMatters: 'السمسار هو الطريق الوحيد للمستثمر الفرد إلى البورصة، والترخيص هو ما يجعل ذلك الطريق خاضعاً للإشراف. والعمولة وجودة التنفيذ كلاهما جزء مما تدفع مقابله.',
            mistake: 'الاختيار على أساس العمولة وحدها. فأدنى سعر معلن ليس أدنى تكلفة إجمالية متى أُدخلت الحدود الدنيا للرسوم وجودة التنفيذ وموثوقية المنصة.',
        },
    },
    'order-book': {
        en: {
            example: 'The book might show buyers stacked at 24.90, 24.85 and 24.80 and sellers at 25.00, 25.05 and 25.10. The gap between the best of each side — 24.90 and 25.00 — is the spread.',
            whyItMatters: 'The book is where the price actually comes from: it is the live record of what buyers will pay and sellers will accept, and its depth tells you how much size the market can absorb.',
            mistake: 'Assuming the quoted price is available in any quantity. The best bid may be for a few hundred shares; a larger order walks down the book and fills at progressively worse prices.',
        },
        ar: {
            example: 'قد يُظهر السجل مشترين متراصين عند ٢٤٫٩٠ و٢٤٫٨٥ و٢٤٫٨٠ وبائعين عند ٢٥٫٠٠ و٢٥٫٠٥ و٢٥٫١٠. والفارق بين أفضل سعر في كل جانب — ٢٤٫٩٠ و٢٥٫٠٠ — هو الفرق السعري.',
            whyItMatters: 'من سجل الأوامر يأتي السعر فعلاً: فهو السجل الحي لما سيدفعه المشترون وما سيقبله البائعون، وعمقه يخبرك بحجم ما يستطيع السوق استيعابه.',
            mistake: 'افتراض أن السعر المعلن متاح بأي كمية. فقد يكون أفضل عرض شراء لبضع مئات من الأسهم؛ والأمر الأكبر ينزل في السجل ويُنفَّذ بأسعار أسوأ تدريجياً.',
        },
    },
    'limit-order': {
        en: {
            example: 'You want a share currently at 25.00 but only at 24.50. A limit order at 24.50 waits in the book and executes only if a seller comes down to your price — otherwise it simply does not fill.',
            whyItMatters: 'A limit order is how you control the price you pay, which matters most in an illiquid share where a market order can execute far from the last quote.',
            mistake: 'Setting a limit and forgetting it. An unfilled order is a decision still pending, and a limit left far from the market can execute months later under conditions you would no longer choose.',
        },
        ar: {
            example: 'تريد سهماً سعره الآن ٢٥٫٠٠ لكن عند ٢٤٫٥٠ فقط. فالأمر المحدد عند ٢٤٫٥٠ ينتظر في السجل ولا يُنفَّذ إلا إذا نزل بائع إلى سعرك — وإلا فلا يُنفَّذ ببساطة.',
            whyItMatters: 'الأمر المحدد هو وسيلتك للتحكم في السعر الذي تدفعه، وهو ما يهم أكثر في سهم ضعيف السيولة حيث قد يُنفَّذ الأمر السوقي بعيداً عن آخر سعر.',
            mistake: 'وضع حد ثم نسيانه. فالأمر غير المنفَّذ قرار لا يزال معلقاً، والحد المتروك بعيداً عن السوق قد يُنفَّذ بعد شهور في ظروف ما كنت لتختارها.',
        },
    },
    'market-order': {
        en: {
            example: 'A market order to buy executes against the best available sell orders immediately, taking 25.00, then 25.05, then 25.10 if your size exceeds what is offered at each level.',
            whyItMatters: 'It prioritises certainty of execution over certainty of price, which is the right trade-off when you need to be in or out and the share is liquid enough that the difference is small.',
            mistake: 'Using one in a thin or fast-moving market. With little depth in the book, a market order can fill far from the price you saw, and the fill is not reversible once done.',
        },
        ar: {
            example: 'أمر سوقي للشراء يُنفَّذ فوراً مقابل أفضل أوامر البيع المتاحة، فيأخذ ٢٥٫٠٠ ثم ٢٥٫٠٥ ثم ٢٥٫١٠ إذا تجاوز حجمك المعروض عند كل مستوى.',
            whyItMatters: 'يقدّم يقين التنفيذ على يقين السعر، وهي المقايضة الصحيحة حين تحتاج الدخول أو الخروج ويكون السهم سائلاً بما يجعل الفارق ضئيلاً.',
            mistake: 'استخدامه في سوق ضعيف السيولة أو سريع الحركة. فمع قلة العمق في السجل قد يُنفَّذ الأمر السوقي بعيداً عن السعر الذي رأيته، والتنفيذ غير قابل للتراجع بعد وقوعه.',
        },
    },
    'circuit-breaker': {
        en: {
            example: 'A share moving sharply on an unconfirmed rumour may be halted. Trading stops, the exchange seeks clarification from the company, and the pause gives every participant the same information before dealing resumes.',
            whyItMatters: 'Halts exist to prevent price discovery from happening in a panic, when the loudest information is often the least reliable. They protect the process, not any particular investor.',
            mistake: 'Reading a halt as a verdict on the company. A pause is a procedural response to disorderly movement or pending news, and the price can resume in either direction once it lifts.',
        },
        ar: {
            example: 'سهم يتحرك بحدة على شائعة غير مؤكدة قد يُوقَف. فيتوقف التداول وتطلب البورصة إيضاحاً من الشركة، وتمنح الوقفة كل المشاركين المعلومات نفسها قبل استئناف التعامل.',
            whyItMatters: 'توجد وقفات التداول لمنع اكتشاف السعر وسط الذعر، حين تكون أعلى المعلومات صوتاً أقلها موثوقية في الغالب. وهي تحمي العملية لا مستثمراً بعينه.',
            mistake: 'قراءة الوقف باعتباره حكماً على الشركة. فالوقفة استجابة إجرائية لحركة غير منتظمة أو خبر مرتقب، وقد يستأنف السعر في أي من الاتجاهين بعد رفعها.',
        },
    },
    'free-float': {
        en: {
            example: 'A company with one billion shares where founders and the state hold 700 million has a free float of 300 million — only those are realistically available to trade.',
            whyItMatters: 'Free float determines how much of a company the market can actually buy and sell, which drives its liquidity and its weight in a float-adjusted index such as the EGX 30.',
            mistake: 'Using total market capitalisation to judge tradability. A large company with a small float can be harder to build or exit a position in than a smaller company that is mostly public.',
        },
        ar: {
            example: 'شركة لديها مليار سهم يحتفظ المؤسسون والدولة بسبعمئة مليون منها تكون أسهمها الحرة ثلاثمئة مليون — وهي وحدها المتاحة واقعياً للتداول.',
            whyItMatters: 'تحدد نسبة الأسهم الحرة كم من الشركة يمكن للسوق شراؤه وبيعه فعلاً، وهو ما يحرّك سيولتها ووزنها في مؤشر معدّل بالأسهم الحرة مثل EGX 30.',
            mistake: 'استخدام إجمالي القيمة السوقية للحكم على قابلية التداول. فالشركة الكبيرة ذات النسبة الحرة الصغيرة قد يصعب بناء مركز فيها أو الخروج منه أكثر من شركة أصغر معظمها مطروح للجمهور.',
        },
    },
    'rights-issue': {
        en: {
            example: 'A company offers existing holders the right to buy one new share for every four held, at a price below the market. Take it up and your percentage stays the same; decline and your stake is diluted.',
            whyItMatters: 'It is how a listed company raises fresh capital from its own owners, and it is one of the few times money from shareholders reaches the company itself. The discount is not a gift — it compensates for the dilution.',
            mistake: 'Ignoring the offer as noise. Doing nothing is an active choice to be diluted, and rights often have value that can be sold if you do not want to subscribe.',
        },
        ar: {
            example: 'شركة تمنح المساهمين الحاليين حق شراء سهم جديد مقابل كل أربعة يملكونها بسعر دون السوق. فإن اكتتبت بقيت نسبتك كما هي؛ وإن امتنعت خُففت حصتك.',
            whyItMatters: 'هكذا تجمع الشركة المقيدة رأس مال جديداً من ملاكها أنفسهم، وهي من المرات القليلة التي تصل فيها أموال المساهمين إلى الشركة ذاتها. والخصم ليس هبة — بل تعويض عن التخفيف.',
            mistake: 'تجاهل العرض باعتباره ضجيجاً. فعدم الفعل اختيار فعلي بأن تُخفَّف حصتك، ولحقوق الاكتتاب قيمة كثيراً ما يمكن بيعها إن لم ترغب في الاكتتاب.',
        },
    },
    'stock-split': {
        en: {
            example: 'A two-for-one split turns one share worth 200 EGP into two shares worth 100 EGP each. Your holding\'s total value is identical the instant before and after.',
            whyItMatters: 'Splits lower the price of a single share, which can widen the pool of buyers able to deal in round amounts. The economics of the company are entirely unchanged.',
            mistake: 'Treating a split as good news about value. Nothing about the business changed — only the number of slices. Any price move around a split reflects what people infer from it, not the split itself.',
        },
        ar: {
            example: 'تجزئة بنسبة اثنين إلى واحد تحوّل سهماً قيمته ٢٠٠ جنيه إلى سهمين قيمة كل منهما ١٠٠ جنيه. وتظل القيمة الإجمالية لحيازتك متطابقة قبل التجزئة وبعدها مباشرة.',
            whyItMatters: 'تخفض التجزئة سعر السهم الواحد، وهو ما قد يوسّع قاعدة المشترين القادرين على التعامل بكميات كاملة. أما اقتصاديات الشركة فلا تتغير إطلاقاً.',
            mistake: 'اعتبار التجزئة خبراً ساراً عن القيمة. فلم يتغير شيء في النشاط — بل عدد الشرائح فقط. وأي حركة سعرية حول التجزئة تعكس ما يستنتجه الناس منها لا التجزئة نفسها.',
        },
    },
    'etf': {
        en: {
            example: 'An ETF tracking the EGX 30 holds the index constituents in their index weights, so its unit price moves with the index rather than with a manager\'s selections.',
            whyItMatters: 'An ETF combines the diversification of a fund with the ability to trade during the session, and index-tracking versions typically cost less to run than funds that pick holdings.',
            mistake: 'Assuming any ETF is passive and cheap. The structure describes how it trades, not what it holds; the cost and the strategy are stated in its own documents and vary widely.',
        },
        ar: {
            example: 'صندوق مؤشرات متداول يتتبع EGX 30 يحتفظ بمكونات المؤشر بأوزانها فيه، فيتحرك سعر وثيقته مع المؤشر لا مع اختيارات مدير.',
            whyItMatters: 'يجمع صندوق المؤشرات المتداول بين تنويع الصندوق وإمكان التداول خلال الجلسة، وعادةً ما تكون النسخ المتتبعة للمؤشرات أقل تكلفةً في التشغيل من الصناديق التي تنتقي مكوناتها.',
            mistake: 'افتراض أن كل صندوق مؤشرات متداول سلبي ورخيص. فالهيكل يصف كيفية تداوله لا ما يحتفظ به؛ والتكلفة والاستراتيجية مذكورتان في مستنداته وتتفاوتان كثيراً.',
        },
    },
    'money-market-fund': {
        en: {
            example: 'A money market fund holding treasury bills and bank deposits maturing within months sees its unit value grind upward in small increments rather than swing, because short maturities barely reprice.',
            whyItMatters: 'It is the standard home for money whose amount you want kept reasonably stable and reachable — an emergency reserve, or a sum committed to something in the near future.',
            mistake: 'Judging one by last year\'s return. What this category earns tracks prevailing short-term rates minus costs, so last year\'s figure largely reports last year\'s rates, not the fund\'s quality.',
        },
        ar: {
            example: 'صندوق أسواق نقد يحتفظ بأذون خزانة وودائع بنكية تستحق خلال شهور ترتفع قيمة وثيقته بخطى صغيرة بدل التأرجح، لأن الآجال القصيرة تكاد لا يُعاد تسعيرها.',
            whyItMatters: 'هو البيت المعتاد لمال تريد إبقاء مبلغه مستقراً نسبياً وفي المتناول — احتياطي طوارئ، أو مبلغ مرتبط بشيء قريب.',
            mistake: 'الحكم عليه بعائد العام الماضي. فما تحققه هذه الفئة يتبع أسعار الفائدة قصيرة الأجل السائدة مطروحاً منها التكاليف، ولذا فرقم العام الماضي يبلّغ في معظمه عن أسعار العام الماضي لا عن جودة الصندوق.',
        },
    },
    'shariah-compliant': {
        en: {
            example: 'A compliant equity fund excludes conventional banks and insurers, alcohol, tobacco and gambling, and applies a limit on how much interest-bearing debt a company may carry relative to its size.',
            whyItMatters: 'Compliance is verified by a Shariah supervisory board that approves the methodology and reviews holdings against it, so it is an audited constraint rather than a marketing description.',
            mistake: 'Reading compliance as a performance claim. Screening out conventional banks removes a large part of the Egyptian market\'s listed value, so a compliant fund is structurally concentrated elsewhere and will diverge in both directions.',
        },
        ar: {
            example: 'صندوق أسهم متوافق يستبعد البنوك وشركات التأمين التقليدية والكحول والتبغ والميسر، ويطبّق حداً على ما يجوز أن تحمله الشركة من ديون ذات فائدة قياساً إلى حجمها.',
            whyItMatters: 'يتحقق من التوافق هيئة رقابة شرعية تعتمد المنهجية وتراجع المكوّنات على أساسها، فهو قيد مُدقَّق لا وصف تسويقي.',
            mistake: 'قراءة التوافق باعتباره ادعاءً بشأن الأداء. فاستبعاد البنوك التقليدية يزيل جزءاً كبيراً من القيمة المقيدة في السوق المصري، ما يجعل الصندوق المتوافق مركّزاً هيكلياً في غيرها ويجعله يتباعد في الاتجاهين.',
        },
    },
    'unified-investor-code': {
        en: {
            example: 'Before your first EGX trade you are issued a single code that identifies you across every broker and custodian, so your holdings are recorded centrally rather than separately at each intermediary.',
            whyItMatters: 'It is what makes ownership portable and verifiable: you can move between brokers without your shares having to move, because the registry identifies the owner, not the broker.',
            mistake: 'Assuming a brokerage account is the record of ownership. The central record is the authoritative one, which is why the code rather than the account is what follows you.',
        },
        ar: {
            example: 'قبل أول تعامل لك في البورصة يُصدر لك كود واحد يعرّفك لدى كل السماسرة وأمناء الحفظ، فتُقيَّد حيازاتك مركزياً لا لدى كل وسيط على حدة.',
            whyItMatters: 'هو ما يجعل الملكية قابلة للنقل والتحقق: إذ يمكنك الانتقال بين السماسرة دون أن تنتقل أسهمك، لأن السجل يعرّف المالك لا السمسار.',
            mistake: 'افتراض أن حساب السمسرة هو سجل الملكية. فالسجل المركزي هو المرجع، ولهذا فالكود لا الحساب هو ما يتبعك.',
        },
    },
    'coupon': {
        en: {
            example: 'On a bond, the coupon is the periodic interest paid on the face value. In Egyptian market usage the same word is commonly applied to a share\'s dividend distribution and its ex-date.',
            whyItMatters: 'Knowing which sense is meant prevents real confusion: a bond coupon is contractual and scheduled, while a dividend is declared at the company\'s discretion and can be reduced or skipped.',
            mistake: 'Treating the two as equivalent obligations. A missed bond coupon is a default; a suspended dividend is a decision the company is entitled to make.',
        },
        ar: {
            example: 'في السند، الكوبون هو الفائدة الدورية المدفوعة على القيمة الاسمية. وفي الاستخدام السائد بالسوق المصري تُطلق الكلمة نفسها عادةً على توزيع أرباح السهم وتاريخ نزوله.',
            whyItMatters: 'معرفة المعنى المقصود تمنع لبساً حقيقياً: فكوبون السند تعاقدي ومجدول، أما التوزيع فيُعلن بتقدير الشركة ويمكن خفضه أو تخطيه.',
            mistake: 'التعامل مع الاثنين كالتزامين متكافئين. فتخلّف السند عن كوبون تعثّر؛ أما تعليق التوزيع فقرار يحق للشركة اتخاذه.',
        },
    },
    'fra': {
        en: {
            example: 'A mutual fund cannot be offered to the public until its prospectus is filed with and approved by the Authority, and the fund then reports to it on an ongoing basis.',
            whyItMatters: 'The FRA is the reason a licensed fund\'s disclosures are enforceable rather than promotional. Checking that a product and its distributor are licensed is the most basic protection available to a retail investor.',
            mistake: 'Reading regulation as a guarantee of outcome. Supervision governs conduct, disclosure and licensing — it does not promise that a licensed investment will make money.',
        },
        ar: {
            example: 'لا يجوز طرح صندوق استثمار على الجمهور قبل إيداع نشرة اكتتابه لدى الهيئة واعتمادها، ثم يقدّم الصندوق تقاريره إليها بصفة مستمرة.',
            whyItMatters: 'الهيئة هي السبب في أن إفصاحات الصندوق المرخّص واجبة النفاذ لا ترويجية. والتحقق من ترخيص المنتج وموزّعه أبسط حماية متاحة للمستثمر الفرد.',
            mistake: 'قراءة الرقابة باعتبارها ضماناً للنتيجة. فالإشراف يحكم السلوك والإفصاح والترخيص — ولا يَعِد بأن الاستثمار المرخّص سيحقق ربحاً.',
        },
    },
    'settlement-t2': {
        en: {
            example: 'You buy on a Sunday and the trade settles a set number of business days later. Between execution and settlement the trade is agreed but the exchange of cash for shares has not yet completed.',
            whyItMatters: 'The gap explains things that otherwise look like errors: why a purchase may not be immediately sellable, and why entitlement to a dividend depends on settlement rather than on the day you clicked buy.',
            mistake: 'Assuming ownership is instant. Confirm the current settlement cycle with your broker or the exchange before planning a sale that depends on it — cycles differ by instrument and can be changed.',
        },
        ar: {
            example: 'تشتري يوم الأحد فتُسوّى الصفقة بعد عدد محدد من أيام العمل. وبين التنفيذ والتسوية تكون الصفقة متفقاً عليها لكن تبادل النقد بالأسهم لم يكتمل بعد.',
            whyItMatters: 'تفسّر هذه الفجوة أموراً تبدو أخطاءً لولاها: لماذا قد لا يكون المشترى قابلاً للبيع فوراً، ولماذا يتوقف استحقاق التوزيع على التسوية لا على يوم ضغطك على الشراء.',
            mistake: 'افتراض أن الملكية فورية. تحقق من دورة التسوية السارية لدى سمسارك أو البورصة قبل التخطيط لبيع يعتمد عليها — فالدورات تختلف باختلاف الأداة وقابلة للتغيير.',
        },
    },
    'stamp-duty': {
        en: {
            example: 'On a transaction the duty is applied to the value traded and collected by the broker alongside commission, so it appears in the contract note rather than being paid separately.',
            whyItMatters: 'It is a cost that applies to the trade itself regardless of whether you made a profit, which means frequent trading multiplies it in a way a buy-and-hold approach does not.',
            mistake: 'Confusing it with tax on gains. The two are separate charges with different bases, and rates and exemptions are set by law and change — confirm the current position with the tax authority or your broker.',
        },
        ar: {
            example: 'تُطبَّق الضريبة على قيمة الصفقة ويحصّلها السمسار إلى جانب العمولة، فتظهر في إشعار التنفيذ لا تُدفع على حدة.',
            whyItMatters: 'هي تكلفة تُطبَّق على التعامل نفسه بصرف النظر عن تحقيقك ربحاً، ما يعني أن كثرة التداول تضاعفها على نحو لا يفعله نهج الشراء والاحتفاظ.',
            mistake: 'الخلط بينها وبين الضريبة على الأرباح. فهما رسمان منفصلان بأساسين مختلفين، والأسعار والإعفاءات يحددها القانون وتتغير — تحقق من الوضع الساري لدى مصلحة الضرائب أو سمسارك.',
        },
    },
    'capital-gains-tax': {
        en: {
            example: 'If you buy at 30 EGP and sell at 40 EGP, the taxable gain arises on the 10 EGP difference, not on the full 40 EGP of sale proceeds.',
            whyItMatters: 'Tax applies to the realised gain, so it is triggered by selling rather than by a holding rising in value. That distinction is what makes the timing of a sale a tax question as well as an investment one.',
            mistake: 'Assuming a single rate applies to everyone. Treatment varies by investor type and instrument and has changed more than once — confirm the current rate, exemptions and filing duties with the tax authority or a qualified adviser.',
        },
        ar: {
            example: 'إذا اشتريت بثلاثين جنيهاً وبعت بأربعين، ينشأ الربح الخاضع للضريبة على فارق العشرة جنيهات لا على حصيلة البيع كاملةً وقدرها أربعون.',
            whyItMatters: 'تُطبَّق الضريبة على الربح المحقق، فيستحقها البيع لا مجرد ارتفاع قيمة الحيازة. وهذا التمييز هو ما يجعل توقيت البيع مسألة ضريبية بقدر ما هو مسألة استثمارية.',
            mistake: 'افتراض سريان سعر واحد على الجميع. فالمعاملة تختلف باختلاف نوع المستثمر والأداة وقد تغيّرت أكثر من مرة — تحقق من السعر الساري والإعفاءات وواجبات الإقرار لدى مصلحة الضرائب أو مستشار مؤهل.',
        },
    },
    'treasury-bills': {
        en: {
            example: 'A bill with a face value of 100,000 EGP maturing in three months is sold at a discount — you pay less than face value now and receive the full amount at maturity, and the difference is your return.',
            whyItMatters: 'Bills are the short-dated instrument money market funds are largely built from, so their yields are the main driver of what that whole fund category earns.',
            mistake: 'Calling them risk-free without qualification. They carry minimal credit risk relative to other domestic borrowers, but their real return still depends on inflation over the same period.',
        },
        ar: {
            example: 'أذن بقيمة اسمية مئة ألف جنيه يستحق بعد ثلاثة أشهر يُباع بخصم — تدفع الآن أقل من القيمة الاسمية وتتسلم المبلغ كاملاً عند الاستحقاق، والفارق هو عائدك.',
            whyItMatters: 'الأذون هي الأداة قصيرة الأجل التي تُبنى منها صناديق أسواق النقد إلى حد بعيد، ولذا فعوائدها المحرك الرئيسي لما تحققه تلك الفئة كلها.',
            mistake: 'وصفها بأنها خالية من المخاطر دون تحفظ. فهي تحمل مخاطر ائتمانية دنيا مقارنةً بمقترضين محليين آخرين، لكن عائدها الحقيقي يظل متوقفاً على التضخم خلال الفترة نفسها.',
        },
    },
    'treasury-bonds': {
        en: {
            example: 'A bond paying a periodic coupon over several years returns the face value at maturity. If market rates rise afterwards, the bond\'s price in the meantime falls, because its fixed coupon is now less attractive.',
            whyItMatters: 'Bonds are how longer-dated fixed income funds generate their return, and their sensitivity to rate changes is why such funds move more than money market funds do.',
            mistake: 'Assuming a bond cannot lose value. Held to maturity you receive the face value, but sold beforehand you receive the market price, which moves inversely to interest rates.',
        },
        ar: {
            example: 'سند يدفع كوبوناً دورياً على مدى سنوات يردّ القيمة الاسمية عند الاستحقاق. فإذا ارتفعت أسعار الفائدة في السوق بعد ذلك انخفض سعر السند في الأثناء، لأن كوبونه الثابت صار أقل جاذبية.',
            whyItMatters: 'السندات هي كيف تحقق صناديق الدخل الثابت الأطول أجلاً عوائدها، وحساسيتها لتغيّر أسعار الفائدة هي سبب تحرك تلك الصناديق أكثر من صناديق أسواق النقد.',
            mistake: 'افتراض أن السند لا يمكن أن يفقد قيمته. فالاحتفاظ حتى الاستحقاق يعيد إليك القيمة الاسمية، أما البيع قبله فيعطيك سعر السوق الذي يتحرك عكسياً مع أسعار الفائدة.',
        },
    },
    'bank-cd': {
        en: {
            example: 'You deposit a sum for a fixed term at a declared rate. The bank owes you that rate plus your principal at maturity, and breaking the certificate early typically costs part of the return earned so far.',
            whyItMatters: 'A certificate is the most common savings alternative to a fund in Egypt, and the structural difference matters: with a certificate you are a creditor of the bank, with a fund you are a part-owner of a portfolio.',
            mistake: 'Reading a guaranteed rate as a guaranteed gain. The guarantee is denominated in pounds; if prices rise faster than the rate over the term, the money grows nominally and shrinks in purchasing power.',
        },
        ar: {
            example: 'تودع مبلغاً لمدة محددة بعائد معلن. فيصبح البنك مديناً لك بذلك العائد وبأصل المبلغ عند الاستحقاق، وكسر الشهادة مبكراً يكلفك عادةً جزءاً من العائد المستحق حتى تاريخه.',
            whyItMatters: 'الشهادة هي البديل الادخاري الأشيع للصندوق في مصر، والفارق الهيكلي مهم: فمع الشهادة أنت دائن للبنك، ومع الصندوق أنت مالك لحصة في محفظة.',
            mistake: 'قراءة العائد المضمون على أنه مكسب مضمون. فالضمان مقوَّم بالجنيه؛ وإذا ارتفعت الأسعار أسرع من العائد خلال المدة نما المال اسمياً وتقلص في قوته الشرائية.',
        },
    },
    'mcdr': {
        en: {
            example: 'After a trade executes, the depository is where the change of ownership is actually recorded and where the cash and securities legs are settled against each other.',
            whyItMatters: 'Central depository records are the authoritative statement of who owns what, which is why shares are not held in a broker\'s name and why moving brokers does not move your holdings.',
            mistake: 'Thinking your broker holds your shares. The depository holds the record; the broker is the route to the market and the servicer of your account, not the owner of your securities.',
        },
        ar: {
            example: 'بعد تنفيذ الصفقة، تكون شركة الإيداع والقيد المركزي هي حيث يُقيَّد انتقال الملكية فعلاً وحيث تُسوّى ساقا النقد والأوراق المالية إحداهما مقابل الأخرى.',
            whyItMatters: 'سجلات الإيداع المركزي هي البيان المرجعي لمن يملك ماذا، ولهذا لا تُحفظ الأسهم باسم السمسار ولا تنتقل حيازاتك عند تغيير السمسار.',
            mistake: 'الظن بأن سمسارك يحتفظ بأسهمك. فشركة الإيداع تحتفظ بالسجل؛ أما السمسار فطريقك إلى السوق ومقدّم الخدمة لحسابك لا مالك أوراقك المالية.',
        },
    },
    'circuit-breaker-egx': {
        en: {
            example: 'A share approaching its daily limit stops moving further in that direction for the session even though orders keep arriving, which is why a price can appear frozen while news is still developing.',
            whyItMatters: 'Limits cap how far a single session can carry a price, which slows disorderly moves but also means a share can take several sessions to reach a level the market has already decided on.',
            mistake: 'Reading a frozen price as a settled one. The limit constrains the session, not the eventual price — and the specific percentages and thresholds are set by the exchange and change, so confirm them with the EGX.',
        },
        ar: {
            example: 'سهم يقترب من حده اليومي يتوقف عن التحرك أبعد في ذلك الاتجاه لبقية الجلسة رغم استمرار ورود الأوامر، ولهذا قد يبدو السعر متجمداً بينما لا تزال الأخبار تتطور.',
            whyItMatters: 'تحدّ القيود من المدى الذي تحمل إليه الجلسة الواحدة السعر، ما يبطئ الحركات غير المنتظمة لكنه يعني أيضاً أن السهم قد يحتاج عدة جلسات ليبلغ مستوى حسمه السوق بالفعل.',
            mistake: 'قراءة السعر المتجمد على أنه سعر مستقر. فالحد يقيّد الجلسة لا السعر النهائي — والنسب والعتبات المحددة تضعها البورصة وتتغير، فتحقق منها لدى البورصة المصرية.',
        },
    },
    'egx-trading-hours': {
        en: {
            example: 'Because the week runs Sunday to Thursday, news breaking on a Friday or Saturday is absorbed into prices at the Sunday open rather than during the weekend.',
            whyItMatters: 'The calendar differs from Monday-to-Friday markets, so an Egyptian holder reacting to international news may face a gap of days before being able to act on it.',
            mistake: 'Assuming session times are fixed. Opening and closing times and holiday schedules are set by the exchange and are adjusted — for Ramadan among other reasons — so confirm the current session with the EGX before relying on it.',
        },
        ar: {
            example: 'لأن الأسبوع يمتد من الأحد إلى الخميس، فإن الأخبار التي تظهر يوم الجمعة أو السبت تُستوعب في الأسعار عند افتتاح الأحد لا خلال العطلة.',
            whyItMatters: 'يختلف التقويم عن أسواق الاثنين إلى الجمعة، ولذا قد يواجه المستثمر المصري الذي يستجيب لأخبار عالمية فجوة أيام قبل أن يتمكن من التصرف.',
            mistake: 'افتراض ثبات مواعيد الجلسة. فمواعيد الافتتاح والإغلاق وجداول العطلات تحددها البورصة وتُعدَّل — لأسباب منها شهر رمضان — فتحقق من الجلسة السارية لدى البورصة المصرية قبل الاعتماد عليها.',
        },
    },
    'foreign-ownership-limit': {
        en: {
            example: 'A company in a regulated sector may cap the proportion of its shares that non-Egyptian investors can hold. Once the cap is reached, further foreign buying is constrained regardless of demand.',
            whyItMatters: 'Caps and closely-held stakes both shrink the freely tradable portion, which feeds directly into liquidity and into a share\'s weight in a float-adjusted index such as the EGX 30.',
            mistake: 'Assuming a large company is easy to trade. Ownership restrictions and concentrated holdings can leave a small effective float, so size and tradability are separate questions.',
        },
        ar: {
            example: 'قد تضع شركة في قطاع منظّم حداً لنسبة أسهمها التي يجوز لغير المصريين امتلاكها. ومتى بُلغ الحد تُقيَّد مشتريات الأجانب الإضافية بصرف النظر عن الطلب.',
            whyItMatters: 'تقلّص الحدود والحصص المحتفظ بها بإحكام كلتاهما الجزء القابل للتداول بحرية، وهو ما ينعكس مباشرةً على السيولة وعلى وزن السهم في مؤشر معدّل بالأسهم الحرة مثل EGX 30.',
            mistake: 'افتراض سهولة تداول الشركة الكبيرة. فقيود الملكية والحيازات المركّزة قد تترك نسبة حرة فعلية صغيرة، فالحجم وقابلية التداول سؤالان منفصلان.',
        },
    },
};

/** Depth for a term in one language, or null when the term has no entry. */
export function glossaryDepth(slug: string, lang: 'en' | 'ar'): GlossaryDepth | null {
    return GLOSSARY_DETAIL[slug]?.[lang] ?? null;
}

