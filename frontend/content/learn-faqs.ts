/**
 * Per-topic FAQs for the Learn academy, keyed by topic slug. Kept OUT of the
 * generated learn-topics pipeline (public/data/learn-topics.js) on purpose:
 * this is purely additive content the SSR article surfaces as visible Q&A plus
 * FAQPage JSON-LD — the highest-leverage GEO win on the Learn pages (AI answer
 * engines and rich results quote FAQ pairs directly). Editing here can never
 * regress the designed static Learn pages, which don't read this module.
 *
 * Every answer is plain, factual, and Egypt/EGX-aware where natural. Not advice.
 */

export type Faq = { q: string; a: string };
export type BilingualFaqs = { en: Faq[]; ar: Faq[] };

export const LEARN_FAQS: Record<string, BilingualFaqs> = {
    'what-is-the-stock-market': {
        en: [
            { q: 'How does the stock market work?', a: 'A stock market is a regulated marketplace where buyers and sellers trade shares of listed companies. An exchange matches orders, sets a transparent price for each share, and settles the trade so ownership passes safely from seller to buyer.' },
            { q: 'What is the Egyptian Exchange (EGX)?', a: 'The Egyptian Exchange (EGX) is Egypt’s main stock exchange, based in Cairo. Its benchmark index, the EGX 30, tracks the 30 largest and most actively traded companies, and it is regulated by the Financial Regulatory Authority (FRA).' },
            { q: 'How do I start investing in the stock market in Egypt?', a: 'You open an account with a broker licensed by the FRA, get a Unified Investor Code from Misr for Central Clearing (MCDR), fund the account, and then place buy or sell orders. Start by understanding the company and the risk before you invest.' },
            { q: 'Why do share prices go up and down?', a: 'Prices move with the balance of buyers and sellers. Earnings results, interest rates, currency moves, sector news and overall sentiment all shift how much investors are willing to pay, so prices rise when demand outweighs supply and fall when it doesn’t.' },
        ],
        ar: [
            { q: 'كيف تعمل سوق الأسهم؟', a: 'سوق الأسهم هي سوق منظمة يتداول فيها المشترون والبائعون أسهم الشركات المدرجة. تطابق البورصة الأوامر، وتحدد سعرًا شفافًا لكل سهم، ثم تسوّي الصفقة لتنتقل الملكية بأمان من البائع إلى المشتري.' },
            { q: 'ما هي البورصة المصرية (EGX)؟', a: 'البورصة المصرية (EGX) هي السوق الرئيسية للأسهم في مصر ومقرها القاهرة. ويقيس مؤشرها الرئيسي EGX30 أداء أكبر 30 شركة وأكثرها تداولًا، وتشرف عليها الهيئة العامة للرقابة المالية (FRA).' },
            { q: 'كيف أبدأ الاستثمار في البورصة المصرية؟', a: 'تفتح حسابًا لدى شركة سمسرة مرخّصة من الهيئة العامة للرقابة المالية، وتحصل على كود موحّد للمستثمر من شركة مصر للمقاصة (MCDR)، ثم تموّل الحساب وتنفّذ أوامر البيع والشراء. ابدأ بفهم الشركة والمخاطر قبل الاستثمار.' },
            { q: 'لماذا ترتفع أسعار الأسهم وتنخفض؟', a: 'تتحرك الأسعار مع توازن المشترين والبائعين. فنتائج الأرباح وأسعار الفائدة وتحركات العملة وأخبار القطاع والمزاج العام كلها تغيّر ما يرغب المستثمرون في دفعه، فيرتفع السعر عندما يفوق الطلب المعروض وينخفض في العكس.' },
        ],
    },
    'what-is-a-mutual-fund': {
        en: [
            { q: 'What is a mutual fund?', a: 'A mutual fund pools money from many investors and a professional manager invests it in a diversified portfolio of assets — such as stocks, bonds or money-market instruments — on their behalf. Each investor owns units representing a share of the whole portfolio.' },
            { q: 'How do mutual funds work in Egypt?', a: 'Egyptian mutual funds are usually launched by banks or asset managers and regulated by the FRA. You subscribe by buying units at the fund’s net asset value (NAV); the manager invests the pool, and you can redeem units back at the prevailing NAV.' },
            { q: 'Are mutual funds good for beginners?', a: 'They can be, because they offer instant diversification and professional management without needing to pick individual stocks. Still, funds carry risk and fees, and returns are not guaranteed, so match the fund’s strategy to your goals and risk tolerance.' },
            { q: 'What fees do mutual funds charge?', a: 'Most funds charge an annual management fee and may add subscription or redemption fees. These costs are taken from the fund and reduce your net return, so compare the total expense against a fund’s track record.' },
        ],
        ar: [
            { q: 'ما هو صندوق الاستثمار؟', a: 'صندوق الاستثمار يجمّع أموال عدد كبير من المستثمرين ليستثمرها مدير محترف في محفظة متنوعة من الأصول — كالأسهم أو السندات أو أدوات أسواق النقد — نيابةً عنهم. ويملك كل مستثمر وثائق (وحدات) تمثّل حصته من المحفظة.' },
            { q: 'كيف تعمل صناديق الاستثمار في مصر؟', a: 'تُطلق الصناديق المصرية عادةً من بنوك أو شركات إدارة أصول وتخضع لرقابة الهيئة العامة للرقابة المالية. تشترك بشراء وثائق بسعر صافي قيمة الأصول (NAV)، ويستثمر المدير الأموال، ويمكنك استرداد الوثائق بسعر صافي القيمة السائد.' },
            { q: 'هل الصناديق مناسبة للمبتدئين؟', a: 'قد تكون كذلك، لأنها توفّر تنويعًا فوريًا وإدارة محترفة دون الحاجة لاختيار أسهم فردية. لكنها تحمل مخاطر ورسومًا، والعوائد غير مضمونة، لذا اختر الصندوق الذي تتوافق استراتيجيته مع أهدافك وقدرتك على تحمل المخاطر.' },
            { q: 'ما الرسوم التي تتقاضاها الصناديق؟', a: 'تتقاضى معظم الصناديق رسم إدارة سنويًا، وقد تضيف رسوم اشتراك أو استرداد. تُخصم هذه التكاليف من الصندوق وتقلّل عائدك الصافي، لذا قارن إجمالي التكلفة مع سجل أداء الصندوق.' },
        ],
    },
    'how-nav-works': {
        en: [
            { q: 'What is NAV (net asset value)?', a: 'NAV is the per-unit value of a mutual fund: the total value of everything the fund owns, minus its liabilities, divided by the number of units outstanding. It is the price at which you buy or redeem fund units.' },
            { q: 'How is a fund’s NAV calculated?', a: 'The manager values all the fund’s holdings at current market prices, subtracts fees and other liabilities, then divides by the total units. Most Egyptian funds strike a NAV daily or weekly.' },
            { q: 'Why does a fund’s NAV change?', a: 'NAV moves as the market prices of the fund’s underlying holdings change. If the fund’s stocks and bonds rise in value, the NAV rises; if they fall, it drops. Dividends received and fees charged also affect it.' },
            { q: 'Is a fund with a lower NAV cheaper?', a: 'No. A low NAV does not mean a fund is cheap or a bargain — it only reflects the per-unit price. What matters is the fund’s return, risk and costs, not the absolute NAV number.' },
        ],
        ar: [
            { q: 'ما هو صافي قيمة الأصول (NAV)؟', a: 'صافي قيمة الأصول هو قيمة الوحدة الواحدة في الصندوق: إجمالي قيمة ما يملكه الصندوق مطروحًا منه التزاماته، مقسومًا على عدد الوحدات القائمة. وهو السعر الذي تشتري به الوحدات أو تستردها.' },
            { q: 'كيف يُحسب صافي قيمة الأصول؟', a: 'يقيّم المدير جميع أصول الصندوق بأسعار السوق الحالية، ويطرح الرسوم والالتزامات الأخرى، ثم يقسم على إجمالي الوحدات. وتحتسب معظم الصناديق المصرية صافي القيمة يوميًا أو أسبوعيًا.' },
            { q: 'لماذا يتغيّر صافي قيمة الأصول؟', a: 'يتحرك صافي القيمة مع تغيّر أسعار السوق لأصول الصندوق. فإذا ارتفعت قيمة أسهمه وسنداته ارتفع صافي القيمة، وإذا انخفضت انخفض. كما تؤثر فيه التوزيعات المحصّلة والرسوم المخصومة.' },
            { q: 'هل الصندوق ذو صافي القيمة الأقل أرخص؟', a: 'لا. انخفاض صافي القيمة لا يعني أن الصندوق رخيص أو صفقة رابحة — فهو يعكس سعر الوحدة فقط. المهم هو عائد الصندوق ومخاطره وتكاليفه، وليس الرقم المطلق لصافي القيمة.' },
        ],
    },
    'fund-types-explained': {
        en: [
            { q: 'What are the main types of mutual funds?', a: 'The common types are equity funds (mostly stocks), fixed-income funds (bonds and treasury bills), money-market funds (short-term, low-risk instruments), and balanced funds that mix stocks and bonds. Each sits at a different point on the risk-and-return scale.' },
            { q: 'What is a money market fund?', a: 'A money market fund invests in short-term, low-risk instruments such as treasury bills and bank deposits. It aims for capital preservation and steady, modest returns, which makes it one of the lowest-risk fund categories in Egypt.' },
            { q: 'What is the difference between equity and fixed-income funds?', a: 'Equity funds invest mainly in shares and target higher long-term growth with higher volatility. Fixed-income funds invest in bonds and treasury bills, aiming for steadier income and lower risk, usually with lower expected returns.' },
            { q: 'Which fund type is the least risky?', a: 'Money-market funds are generally the least risky, followed by fixed-income funds, then balanced funds, with equity funds carrying the most risk and the highest return potential.' },
        ],
        ar: [
            { q: 'ما الأنواع الرئيسية لصناديق الاستثمار؟', a: 'أشهر الأنواع: صناديق الأسهم (أسهم في الأساس)، وصناديق الدخل الثابت (سندات وأذون خزانة)، وصناديق أسواق النقد (أدوات قصيرة الأجل منخفضة المخاطر)، والصناديق المتوازنة التي تمزج بين الأسهم والسندات. ويقع كل نوع عند نقطة مختلفة على مقياس المخاطرة والعائد.' },
            { q: 'ما هو صندوق أسواق النقد؟', a: 'يستثمر صندوق أسواق النقد في أدوات قصيرة الأجل منخفضة المخاطر مثل أذون الخزانة والودائع البنكية. ويهدف إلى الحفاظ على رأس المال وتحقيق عوائد ثابتة متواضعة، مما يجعله من أقل فئات الصناديق مخاطرةً في مصر.' },
            { q: 'ما الفرق بين صناديق الأسهم وصناديق الدخل الثابت؟', a: 'تستثمر صناديق الأسهم في الأسهم أساسًا وتستهدف نموًا أعلى على المدى الطويل مع تقلب أكبر. أما صناديق الدخل الثابت فتستثمر في السندات وأذون الخزانة بهدف دخل أكثر ثباتًا ومخاطر أقل، وعادةً بعوائد متوقعة أدنى.' },
            { q: 'أي نوع من الصناديق أقل مخاطرة؟', a: 'صناديق أسواق النقد هي الأقل مخاطرةً عمومًا، تليها صناديق الدخل الثابت، ثم الصناديق المتوازنة، بينما تحمل صناديق الأسهم أكبر قدر من المخاطرة وأعلى إمكانية للعائد.' },
        ],
    },
    'risk-and-return-for-beginners': {
        en: [
            { q: 'What is the relationship between risk and return?', a: 'Higher potential returns almost always come with higher risk. Safer assets like treasury bills pay less but rarely lose value, while stocks can grow faster but swing more. Investing is about choosing a level of risk you can live with.' },
            { q: 'What does volatility mean?', a: 'Volatility measures how much an investment’s price moves up and down over time. High volatility means larger, faster swings in both directions; low volatility means steadier prices. It is a common proxy for risk.' },
            { q: 'How much risk should a beginner take?', a: 'That depends on your goals, time horizon and comfort with losses. A longer horizon can absorb more short-term ups and downs, while money you need soon belongs in lower-risk assets. Never invest money you cannot afford to lose.' },
            { q: 'Can you lose all your money in the stock market?', a: 'A single stock can in theory go to zero, which is why diversification matters. A broad, diversified portfolio is very unlikely to lose everything, but it can still fall in value, sometimes sharply, over short periods.' },
        ],
        ar: [
            { q: 'ما العلاقة بين المخاطرة والعائد؟', a: 'العوائد الأعلى المحتملة تأتي غالبًا مع مخاطر أعلى. فالأصول الأكثر أمانًا مثل أذون الخزانة تدفع أقل لكنها نادرًا ما تفقد قيمتها، بينما قد تنمو الأسهم أسرع لكنها أكثر تقلبًا. والاستثمار هو اختيار مستوى من المخاطرة يمكنك تحمّله.' },
            { q: 'ماذا يعني التقلب؟', a: 'التقلب يقيس مدى تحرّك سعر الاستثمار صعودًا وهبوطًا بمرور الوقت. فالتقلب المرتفع يعني تحركات أكبر وأسرع في الاتجاهين، والتقلب المنخفض يعني أسعارًا أكثر ثباتًا. وهو مؤشر شائع على المخاطرة.' },
            { q: 'ما حجم المخاطرة المناسب للمبتدئ؟', a: 'يعتمد ذلك على أهدافك وأفقك الزمني وقدرتك على تحمّل الخسائر. فالأفق الأطول يمكنه استيعاب تقلبات قصيرة الأجل أكثر، أما الأموال التي تحتاجها قريبًا فمكانها الأصول الأقل مخاطرة. ولا تستثمر أبدًا مالًا لا تحتمل خسارته.' },
            { q: 'هل يمكن أن تخسر كل أموالك في البورصة؟', a: 'قد يهبط سهم واحد نظريًا إلى الصفر، ولهذا يهمّ التنويع. فمن غير المرجّح إطلاقًا أن تخسر محفظة متنوعة واسعة كل شيء، لكنها قد تنخفض في قيمتها، أحيانًا بحدة، خلال فترات قصيرة.' },
        ],
    },
    'diversification-made-simple': {
        en: [
            { q: 'What is diversification?', a: 'Diversification means spreading your money across many different investments — companies, sectors and asset types — so that no single loss can sink your whole portfolio. It is often summarised as "don’t put all your eggs in one basket."' },
            { q: 'Why does diversification reduce risk?', a: 'Different assets rarely move in perfect lockstep. When one holding falls, another may hold steady or rise, smoothing your overall return. Diversification cannot remove all risk, but it reduces the impact of any one investment going wrong.' },
            { q: 'How many stocks make a diversified portfolio?', a: 'There is no exact number, but holding shares across many companies and sectors — rather than two or three — greatly cuts single-company risk. For most investors, a diversified mutual fund achieves this more simply than buying dozens of stocks.' },
            { q: 'Do mutual funds provide diversification?', a: 'Yes. A single fund typically holds many securities across sectors, giving instant diversification with one purchase — one of the main reasons beginners choose funds over individual stocks.' },
        ],
        ar: [
            { q: 'ما هو التنويع؟', a: 'التنويع يعني توزيع أموالك على استثمارات مختلفة كثيرة — شركات وقطاعات وأنواع أصول — حتى لا تُغرق خسارة واحدة محفظتك بالكامل. ويُلخَّص غالبًا بعبارة: "لا تضع كل البيض في سلة واحدة".' },
            { q: 'لماذا يقلّل التنويع المخاطر؟', a: 'نادرًا ما تتحرك الأصول المختلفة بتزامن تام. فعندما يهبط أحد الأصول قد يثبت آخر أو يرتفع، مما يخفّف عائدك الإجمالي. والتنويع لا يزيل كل المخاطر، لكنه يقلّل أثر تعثّر أي استثمار منفرد.' },
            { q: 'كم عدد الأسهم التي تكوّن محفظة متنوعة؟', a: 'لا يوجد رقم دقيق، لكن امتلاك أسهم في شركات وقطاعات كثيرة — بدلًا من اثنين أو ثلاثة — يقلّل كثيرًا مخاطر الشركة الواحدة. ولمعظم المستثمرين، يحقق صندوق استثمار متنوّع ذلك أبسط من شراء عشرات الأسهم.' },
            { q: 'هل توفّر الصناديق التنويع؟', a: 'نعم. يحتفظ الصندوق الواحد عادةً بأوراق مالية كثيرة عبر قطاعات مختلفة، فيمنحك تنويعًا فوريًا بعملية شراء واحدة — وهو من أهم أسباب تفضيل المبتدئين للصناديق على الأسهم الفردية.' },
        ],
    },
    'read-a-fund-factsheet': {
        en: [
            { q: 'What is a fund factsheet?', a: 'A factsheet is a short, regular summary of a mutual fund. It shows the fund’s objective, strategy, top holdings, past performance, risk level and fees — the key facts you need before investing, on one or two pages.' },
            { q: 'What should I look for in a factsheet?', a: 'Check the fund’s objective and asset mix, its returns over several periods, the risk indicators, the expense/management fee, the fund size, and its benchmark. Read them together rather than chasing the highest headline return.' },
            { q: 'What is an expense ratio?', a: 'The expense ratio (or management fee) is the annual cost of running the fund, expressed as a percentage of assets. It is deducted from the fund and directly reduces your return, so lower is generally better for similar strategies.' },
            { q: 'What does past performance tell you?', a: 'Past performance shows how the fund has done historically, which is useful context — but it does not guarantee future results. Markets change, so weigh performance alongside strategy, risk and cost.' },
        ],
        ar: [
            { q: 'ما هي نشرة بيانات الصندوق (Factsheet)؟', a: 'نشرة البيانات ملخص قصير ودوري للصندوق. تعرض هدف الصندوق واستراتيجيته وأكبر استثماراته وأداءه السابق ومستوى مخاطره ورسومه — أي الحقائق الأساسية التي تحتاجها قبل الاستثمار، في صفحة أو صفحتين.' },
            { q: 'ما الذي أبحث عنه في نشرة البيانات؟', a: 'راجع هدف الصندوق ومزيج أصوله، وعوائده عبر فترات عدة، ومؤشرات المخاطر، ورسم الإدارة، وحجم الصندوق، ومؤشره الاسترشادي. واقرأها مجتمعةً بدلًا من ملاحقة أعلى عائد معلن.' },
            { q: 'ما هو معدل المصروفات (نسبة الرسوم)؟', a: 'معدل المصروفات (أو رسم الإدارة) هو التكلفة السنوية لتشغيل الصندوق كنسبة من الأصول. يُخصم من الصندوق ويقلّل عائدك مباشرةً، لذا فالأقل أفضل عمومًا للاستراتيجيات المتماثلة.' },
            { q: 'ماذا يخبرك الأداء السابق؟', a: 'يوضح الأداء السابق كيف أدى الصندوق تاريخيًا، وهو سياق مفيد — لكنه لا يضمن النتائج المستقبلية. فالأسواق تتغير، لذا وازن بين الأداء والاستراتيجية والمخاطر والتكلفة.' },
        ],
    },
    'what-are-dividends': {
        en: [
            { q: 'What is a dividend?', a: 'A dividend is a share of a company’s profits paid out to shareholders, usually in cash. Not all companies pay dividends — some reinvest profits for growth instead — and the amount is decided by the company’s board and general assembly.' },
            { q: 'How are dividends paid on the EGX?', a: 'An EGX-listed company announces a dividend, an ex-dividend date and a payment date. You must own the shares before the ex-dividend date to receive that payout; the cash is then credited to eligible shareholders on the payment date.' },
            { q: 'What is the ex-dividend date?', a: 'The ex-dividend date is the first day a share trades without the right to the declared dividend. To receive the dividend you must hold the shares before this date — buy on or after it and the seller keeps the payout.' },
            { q: 'What is dividend yield?', a: 'Dividend yield is the annual dividend per share divided by the current share price, shown as a percentage. It tells you the cash income you earn for each pound invested at today’s price, but a very high yield can also signal a falling price or an unsustainable payout.' },
        ],
        ar: [
            { q: 'ما هي التوزيعات (الأرباح الموزعة)؟', a: 'التوزيع هو حصة من أرباح الشركة تُدفع للمساهمين، نقدًا في الغالب. ولا تدفع كل الشركات توزيعات — فبعضها يعيد استثمار الأرباح للنمو — ويحدّد المبلغ مجلس إدارة الشركة والجمعية العمومية.' },
            { q: 'كيف تُدفع التوزيعات في البورصة المصرية؟', a: 'تعلن الشركة المدرجة توزيعًا وتاريخ عدم أحقية وتاريخ صرف. ويجب أن تمتلك السهم قبل تاريخ عدم الأحقية لتستحق التوزيع، ثم يُقيَّد المبلغ للمساهمين المستحقين في تاريخ الصرف.' },
            { q: 'ما هو تاريخ عدم الأحقية؟', a: 'تاريخ عدم الأحقية هو أول يوم يُتداول فيه السهم دون حق التوزيع المعلن. ولتستحق التوزيع يجب أن تمتلك السهم قبل هذا التاريخ — ومن يشتري فيه أو بعده لا يستحق التوزيع بل يبقى للبائع.' },
            { q: 'ما هو عائد التوزيع؟', a: 'عائد التوزيع هو التوزيع السنوي للسهم مقسومًا على سعره الحالي، ويُعرض كنسبة مئوية. ويخبرك بالدخل النقدي مقابل كل جنيه مستثمر بسعر اليوم، لكن العائد المرتفع جدًا قد يشير أيضًا إلى هبوط السعر أو توزيع غير مستدام.' },
        ],
    },
    'support-and-resistance-basics': {
        en: [
            { q: 'What are support and resistance?', a: 'Support is a price level where buying tends to be strong enough to stop a fall, and resistance is a level where selling tends to cap a rise. Traders watch these levels because prices often pause or reverse near them.' },
            { q: 'How do traders use support and resistance?', a: 'Many traders look to buy near support and sell near resistance, or wait for a clear break of a level to signal a new move. They are tools for framing risk, not guarantees of what the price will do next.' },
            { q: 'What happens when a price breaks resistance?', a: 'A convincing break above resistance can signal further upside, and old resistance sometimes becomes new support. But breaks can be false, so traders usually seek confirmation such as higher volume before acting.' },
            { q: 'Are support and resistance reliable?', a: 'They are useful guides, not certainties. Levels can hold, break, or reverse, and they work best combined with other analysis and sound risk management rather than used on their own.' },
        ],
        ar: [
            { q: 'ما هما الدعم والمقاومة؟', a: 'الدعم مستوى سعري يكون الشراء عنده قويًا بما يكفي لوقف الهبوط، والمقاومة مستوى يكبح البيع عنده الصعود. ويراقب المتداولون هذه المستويات لأن الأسعار غالبًا ما تتوقف أو تنعكس بالقرب منها.' },
            { q: 'كيف يستخدم المتداولون الدعم والمقاومة؟', a: 'يسعى كثيرون للشراء قرب الدعم والبيع قرب المقاومة، أو ينتظرون كسرًا واضحًا للمستوى ليشير إلى حركة جديدة. وهي أدوات لتأطير المخاطرة لا ضمانات لما سيفعله السعر لاحقًا.' },
            { q: 'ماذا يحدث عند كسر المقاومة؟', a: 'قد يشير الكسر المقنع فوق المقاومة إلى مزيد من الصعود، وأحيانًا تتحول المقاومة القديمة إلى دعم جديد. لكن الكسور قد تكون كاذبة، لذا يبحث المتداولون عادةً عن تأكيد مثل ارتفاع أحجام التداول قبل التحرك.' },
            { q: 'هل الدعم والمقاومة موثوقان؟', a: 'هما دليلان مفيدان لا يقينان. فالمستويات قد تصمد أو تُكسر أو تنعكس، وتعمل بأفضل صورة عند دمجها مع تحليل آخر وإدارة سليمة للمخاطر بدلًا من استخدامها منفردة.' },
        ],
    },
    'long-term-investing-vs-trading': {
        en: [
            { q: 'What is the difference between investing and trading?', a: 'Investing means buying assets to hold for years, letting company growth and compounding build wealth. Trading means buying and selling frequently to profit from short-term price moves. They need different skills, time and risk tolerance.' },
            { q: 'Is long-term investing better than trading?', a: 'For most people, long-term investing is simpler, cheaper in fees and taxes, and less stressful, and it benefits from compounding. Active trading can work but demands more time, skill and discipline, and many traders underperform a patient buy-and-hold approach.' },
            { q: 'What is compounding?', a: 'Compounding is earning returns on your past returns as well as your original capital. Reinvesting gains and dividends over many years can grow a modest sum substantially, which is why starting early matters so much.' },
            { q: 'How long should I hold a stock?', a: 'There is no fixed rule, but long-term investors often hold quality companies for years, reviewing them as the business and their goals change rather than reacting to every price swing. Your time horizon should match why you invested.' },
        ],
        ar: [
            { q: 'ما الفرق بين الاستثمار والمضاربة؟', a: 'الاستثمار هو شراء أصول للاحتفاظ بها سنوات، تاركًا نمو الشركات والتراكم يبنيان الثروة. أما المضاربة فهي بيع وشراء متكرر للربح من تحركات الأسعار قصيرة الأجل. وكل منهما يتطلب مهارات ووقتًا وقدرة مختلفة على تحمل المخاطر.' },
            { q: 'هل الاستثمار طويل الأجل أفضل من المضاربة؟', a: 'لمعظم الناس، الاستثمار طويل الأجل أبسط وأقل تكلفةً في الرسوم والضرائب وأقل توترًا، ويستفيد من التراكم. وقد تنجح المضاربة النشطة لكنها تتطلب وقتًا ومهارة وانضباطًا أكبر، وكثير من المضاربين يحققون أداءً أدنى من نهج الشراء والاحتفاظ الصبور.' },
            { q: 'ما هو التراكم (الفائدة المركبة)؟', a: 'التراكم هو تحقيق عوائد على عوائدك السابقة إضافةً إلى رأس مالك الأصلي. وإعادة استثمار الأرباح والتوزيعات عبر سنوات كثيرة يمكن أن ينمّي مبلغًا متواضعًا نموًا كبيرًا، ولهذا يهمّ البدء مبكرًا كثيرًا.' },
            { q: 'كم من الوقت ينبغي أن أحتفظ بالسهم؟', a: 'لا قاعدة ثابتة، لكن المستثمرين طويلي الأجل يحتفظون غالبًا بالشركات الجيدة سنوات، ويراجعونها مع تغيّر أعمالها وأهدافهم بدلًا من التفاعل مع كل تذبذب سعري. وينبغي أن يتوافق أفقك الزمني مع سبب استثمارك.' },
        ],
    },
    'how-to-start-investing-in-funds-egypt': {
        en: [
            { q: 'How do I buy a mutual fund in Egypt?', a: 'Egyptian funds are distributed by the bank that sponsors them or the asset manager that runs them, usually through a branch or the distributor\'s own channels rather than an open exchange. You subscribe for units priced from the fund\'s net asset value at its next valuation, not at a price you negotiate. Ask your bank which funds it distributes and request the prospectus before subscribing.' },
            { q: 'How much money do I need to start?', a: 'Funds set their own minimum subscription and it varies widely; some publish a minimum and many do not disclose one in the data available publicly. The fund\'s prospectus states its minimum, so that document rather than a comparison site is where to confirm it.' },
            { q: 'What documents do I need?', a: 'Distributors apply standard know-your-customer requirements, so expect to provide identification and to complete the distributor\'s own account and suitability forms. The exact list is set by the distributor, and asking them directly before you visit saves a second trip.' },
            { q: 'Is my money locked in?', a: 'Fund units are generally redeemable under the fund\'s dealing schedule rather than locked for a fixed term, but some funds apply a redemption charge if you sell within a defined period. What you receive on redemption is the unit value at that valuation, which may be more or less than you paid.' },
        ],
        ar: [
            { q: 'كيف أشتري صندوق استثمار في مصر؟', a: 'تُوزَّع الصناديق المصرية عبر البنك الراعي لها أو مدير الأصول الذي يديرها، عادةً في فرع أو عبر قنوات الموزّع نفسه لا في سوق مفتوح. وتشترك في وثائق مسعّرة من صافي قيمة أصول الصندوق عند تقييمه التالي، لا بسعر تتفاوض عليه. اسأل بنكك عن الصناديق التي يوزّعها واطلب نشرة الاكتتاب قبل الاشتراك.' },
            { q: 'كم أحتاج من المال للبدء؟', a: 'يحدد كل صندوق حد اشتراك أدنى خاصاً به ويتفاوت كثيراً؛ فبعضها ينشر حداً أدنى وكثير منها لا يفصح عنه في البيانات المتاحة للعموم. وتذكر نشرة اكتتاب الصندوق حده الأدنى، فهي المستند الذي يُتحقق منه لا موقع للمقارنة.' },
            { q: 'ما المستندات المطلوبة؟', a: 'يطبّق الموزّعون متطلبات «اعرف عميلك» المعتادة، فتوقّع تقديم إثبات هوية واستيفاء نماذج فتح الحساب وتقييم الملاءمة الخاصة بالموزّع. والقائمة الدقيقة يحددها الموزّع، وسؤاله مباشرةً قبل الزيارة يوفّر عليك رحلة ثانية.' },
            { q: 'هل أموالي محتجزة؟', a: 'وثائق الصناديق قابلة للاسترداد عموماً وفق جدول تعامل الصندوق لا محتجزة لمدة ثابتة، لكن بعض الصناديق يطبّق عمولة استرداد إذا بعت خلال فترة محددة. وما تحصل عليه عند الاسترداد هو قيمة الوثيقة عند ذلك التقييم، وقد تكون أكثر أو أقل مما دفعت.' },
        ],
    },
    'savings-certificates-vs-funds': {
        en: [
            { q: 'Which is better, a savings certificate or a mutual fund?', a: 'Neither is better in the abstract because they solve different problems. A certificate states a return in advance and the bank owes you that return plus your principal at maturity; a fund gives you units in a portfolio whose value moves and promises nothing. Money you may need soon and want protected in amount suits the first; money you can leave for years is a different question.' },
            { q: 'Can I lose money in a mutual fund?', a: 'Yes. A fund\'s unit value can fall, and redeeming when it has fallen realises that loss. This is the structural difference from a certificate, where the bank owes you the principal at maturity.' },
            { q: 'Does a certificate protect me from inflation?', a: 'No. A certificate\'s rate is nominal, so it fixes the number of pounds you receive but not what those pounds will buy. If prices rise faster than the stated rate over the term, the money grows nominally and shrinks in purchasing power.' },
            { q: 'Can I hold both?', a: 'Yes, and most people are answering two questions at once. A reserve you may need within a year and money you can leave untouched for several years have different requirements, and there is no contradiction in holding a different product for each.' },
        ],
        ar: [
            { q: 'أيهما أفضل، شهادة الادخار أم صندوق الاستثمار؟', a: 'لا أفضلية مطلقة لأيهما لأنهما يحلان مشكلتين مختلفتين. فالشهادة تعلن عائداً مقدماً ويصبح البنك مديناً لك به وبأصل المبلغ عند الاستحقاق؛ أما الصندوق فيمنحك وثائق في محفظة تتحرك قيمتها ولا يعد بشيء. فالمال الذي قد تحتاجه قريباً وتريد حماية مبلغه يناسبه الأول؛ والمال الذي يمكنك تركه سنوات سؤال مختلف.' },
            { q: 'هل يمكن أن أخسر في صندوق استثمار؟', a: 'نعم. فقيمة وثيقة الصندوق قد تنخفض، والاسترداد عند انخفاضها يحقق تلك الخسارة. وهذا هو الفارق الهيكلي عن الشهادة التي يكون البنك فيها مديناً لك بأصل المبلغ عند الاستحقاق.' },
            { q: 'هل تحميني الشهادة من التضخم؟', a: 'لا. فعائد الشهادة اسمي، أي أنه يثبّت عدد الجنيهات التي تتسلمها لا ما ستشتريه تلك الجنيهات. فإذا ارتفعت الأسعار أسرع من العائد المعلن خلال المدة، ينمو المال اسمياً ويتقلص في قوته الشرائية.' },
            { q: 'هل يمكنني الجمع بينهما؟', a: 'نعم، ومعظم الناس يجيبون عن سؤالين في وقت واحد. فالاحتياطي الذي قد تحتاجه خلال عام والمال الذي يمكنك تركه دون مساس عدة سنوات لهما متطلبات مختلفة، ولا تناقض في أن يحمل كل منهما منتجاً مختلفاً.' },
        ],
    },
    'money-market-funds-explained': {
        en: [
            { q: 'What does a money market fund invest in?', a: 'Short-dated instruments such as treasury bills, bank deposits and similar obligations that mature in months rather than years. Because the holdings mature quickly their prices barely move with interest-rate changes, which is why the unit value tends to rise in small increments rather than swing.' },
            { q: 'Are money market funds safe?', a: 'They are low in variability, which is not the same as guaranteed. The unit price is not fixed, no return is promised, and the fund is not a deposit carrying a bank\'s obligation. The steadiness comes from what the fund holds, not from a guarantee.' },
            { q: 'Why did my money market fund\'s return fall?', a: 'Most likely because short-term interest rates fell. What this category earns tracks prevailing short-term rates minus costs, so the return is largely a property of the rate environment rather than of the individual fund.' },
            { q: 'Are they suitable for long-term investing?', a: 'They are built for money whose amount you want kept stable and reachable, such as a reserve or a near-term commitment. Over a long horizon they are likely to lag options that accept more variability, because low variability and high long-run return are not available in the same instrument.' },
        ],
        ar: [
            { q: 'فيمَ يستثمر صندوق أسواق النقد؟', a: 'في أدوات قصيرة الأجل كأذون الخزانة والودائع البنكية والالتزامات المشابهة التي تستحق خلال شهور لا سنوات. ولأن هذه الأصول تستحق سريعاً فإن أسعارها تكاد لا تتحرك مع تغيّر أسعار الفائدة، ولهذا تميل قيمة الوثيقة إلى الصعود بخطى صغيرة بدل التأرجح.' },
            { q: 'هل صناديق أسواق النقد آمنة؟', a: 'هي منخفضة التقلب، وهذا ليس كالمضمون. فسعر الوثيقة غير ثابت، ولا عائد موعوداً به، والصندوق ليس وديعة تحمل التزاماً على بنك. والثبات نابع مما يحتفظ به الصندوق لا من ضمان.' },
            { q: 'لماذا انخفض عائد صندوق أسواق النقد لديّ؟', a: 'على الأرجح لأن أسعار الفائدة قصيرة الأجل انخفضت. فما تحققه هذه الفئة يتبع أسعار الفائدة قصيرة الأجل السائدة مطروحاً منها التكاليف، ولذا فالعائد خاصية في بيئة الفائدة أكثر منه في الصندوق نفسه.' },
            { q: 'هل تناسب الاستثمار طويل الأجل؟', a: 'هي مصممة لمال تريد إبقاء مبلغه مستقراً وفي المتناول، كاحتياطي أو التزام قريب. وعلى أفق طويل يُرجَّح أن تتخلف عن خيارات تقبل تقلباً أكبر، لأن انخفاض التقلب وارتفاع العائد الطويل لا يجتمعان في أداة واحدة.' },
        ],
    },
    'gold-funds-explained': {
        en: [
            { q: 'How is a gold fund different from buying gold?', a: 'A gold fund gives you a claim on a portfolio tied to gold rather than a physical object you store. That removes purity verification, storage, insurance and the difficulty of finding a fair price when selling, and it avoids the making charge embedded in jewellery.' },
            { q: 'Why did my gold fund move differently from the gold price?', a: 'Gold is priced internationally in dollars, so a pound-denominated holding depends on both the dollar gold price and the pound\'s exchange rate. The two do not have to move together, so a local gain or loss can come from either or both.' },
            { q: 'Does a gold fund pay dividends?', a: 'No. Gold produces no income, so the entire return is the change in price. Holding it therefore carries an opportunity cost equal to what the money could have earned elsewhere, plus the fund\'s management fee, which is charged regardless of price direction.' },
            { q: 'Is gold a low-risk investment?', a: 'No. It is often called a safe haven, which describes how it sometimes behaves in a crisis rather than how much it varies. Gold has had long stretches of falling prices, and a fund tracking it inherits that. Its usefulness comes from behaving differently to other holdings, not from being safe.' },
        ],
        ar: [
            { q: 'كيف يختلف صندوق الذهب عن شراء الذهب؟', a: 'يمنحك صندوق الذهب حقاً في محفظة مرتبطة بالذهب بدل شيء مادي تخزّنه. وهذا يزيل التحقق من العيار والتخزين والتأمين وصعوبة إيجاد سعر عادل عند البيع، ويتجنّب أجرة المصنعية المضمّنة في المشغولات.' },
            { q: 'لماذا تحرك صندوق الذهب لديّ بشكل مختلف عن سعر الذهب؟', a: 'يُسعَّر الذهب عالمياً بالدولار، لذا تتوقف الحيازة المقوَّمة بالجنيه على سعر الذهب بالدولار وعلى سعر صرف الجنيه معاً. وليس بالضرورة أن يتحرك الاثنان معاً، فقد يأتي المكسب أو الخسارة محلياً من أيهما أو منهما معاً.' },
            { q: 'هل يوزّع صندوق الذهب أرباحاً؟', a: 'لا. فالذهب لا يدرّ دخلاً، وعائده كله تغيّر السعر. ولذا فالاحتفاظ به ينطوي على تكلفة فرصة تعادل ما كان يمكن أن يحققه المال في مكان آخر، إضافةً إلى رسوم إدارة الصندوق التي تُحتسب بصرف النظر عن اتجاه السعر.' },
            { q: 'هل الذهب استثمار منخفض المخاطر؟', a: 'لا. يوصف كثيراً بالملاذ الآمن، وهو وصف لسلوكه أحياناً وقت الأزمات لا لمقدار تقلبه. فقد شهد الذهب فترات طويلة من انخفاض الأسعار، والصندوق الذي يتتبعه يرث ذلك. ونفعه من اختلاف سلوكه عن باقي الحيازات لا من كونه آمناً.' },
        ],
    },
    'shariah-compliant-investing': {
        en: [
            { q: 'What makes a fund Shariah-compliant?', a: 'Two screens. An activity screen excludes impermissible businesses such as conventional banking and insurance, alcohol, tobacco and gambling. A financial screen limits how much interest-bearing debt a company may carry relative to its size, because a company can be in a permissible line of business and still be financed in a way that fails the test.' },
            { q: 'Who decides whether a fund is compliant?', a: 'A Shariah supervisory board of qualified scholars appointed by the fund. It approves the screening methodology, reviews holdings against it and issues the opinion the fund relies on. Different boards can reach different conclusions on marginal cases, so two compliant funds may hold somewhat different portfolios.' },
            { q: 'What is purification?', a: 'Even a screened portfolio can receive small amounts of non-qualifying income, such as interest on cash held between transactions. Purification means the fund calculates that portion and directs it to charity instead of distributing it to investors. The prospectus states whether and how the fund purifies.' },
            { q: 'Do Shariah-compliant funds perform better?', a: 'Compliance is a constraint applied for religious reasons, not a performance claim. Screening changes what a fund can own — excluding conventional banks removes a large part of the Egyptian market\'s listed value — so a compliant fund is structurally more concentrated elsewhere and will diverge from a conventional one in both directions.' },
        ],
        ar: [
            { q: 'ما الذي يجعل الصندوق متوافقاً مع الشريعة؟', a: 'تصفيتان. تصفية النشاط تستبعد الأعمال غير الجائزة كالبنوك والتأمين التقليدي والكحول والتبغ والميسر. وتصفية مالية تحدّ من حجم الديون ذات الفائدة التي يجوز أن تحملها الشركة قياساً إلى حجمها، إذ قد تعمل الشركة في نشاط جائز ومع ذلك تُموَّل بطريقة لا تجتاز الاختبار.' },
            { q: 'من يقرر توافق الصندوق؟', a: 'هيئة رقابة شرعية من علماء مؤهلين يعيّنها الصندوق. وهي تعتمد منهجية التصفية وتراجع المكوّنات على أساسها وتصدر الفتوى التي يستند إليها الصندوق. وقد تختلف الهيئات في الحالات الحدّية، فقد تحمل محفظتا صندوقين متوافقين اختلافات بعض الشيء.' },
            { q: 'ما هو التطهير؟', a: 'حتى المحفظة المصفّاة قد تتلقى مبالغ يسيرة من دخل غير جائز، كفائدة على النقد المحتفظ به بين المعاملات. والتطهير أن يحسب الصندوق ذلك الجزء ويوجّهه إلى وجوه الخير بدل توزيعه على المستثمرين. وتذكر نشرة الاكتتاب ما إذا كان الصندوق يطهّر وكيف.' },
            { q: 'هل تحقق الصناديق المتوافقة أداءً أفضل؟', a: 'التوافق قيد يُطبَّق لأسباب دينية لا ادعاء بشأن الأداء. فالتصفية تغيّر ما يمكن للصندوق امتلاكه — واستبعاد البنوك التقليدية يزيل جزءاً كبيراً من القيمة المقيدة في السوق المصري — ما يجعل الصندوق المتوافق أكثر تركزاً هيكلياً في غيرها ويجعله يتباعد عن التقليدي في الاتجاهين.' },
        ],
    },
    'inflation-and-real-returns': {
        en: [
            { q: 'What is the difference between a nominal and a real return?', a: 'A nominal return tells you how many more pounds you have; a real return tells you how much more you can buy. Roughly, the real return is the nominal return minus inflation over the same period. Every return figure you see is nominal unless it says otherwise.' },
            { q: 'Can I lose money even with a positive return?', a: 'Yes, in purchasing-power terms. If a holding gains ten per cent while the general price level rises fifteen, the pound figure rose and what it buys fell. Both statements are true at once, which is why quoting only the nominal figure is misleading.' },
            { q: 'Do guaranteed products protect against inflation?', a: 'No. A guarantee removes the risk that the number falls, not the risk that prices rise faster than the number. The guarantee is denominated in pounds, and inflation is precisely a change in what a pound is worth, so a product can be completely safe in the sense it promises and still lose purchasing power.' },
            { q: 'Which investments beat inflation?', a: 'No asset reliably beats inflation over every period. Assets that have historically outpaced it have also had long stretches of not doing so. The useful habit is not to search for a guaranteed answer but to convert every return you are shown into real terms before comparing it with anything else.' },
        ],
        ar: [
            { q: 'ما الفرق بين العائد الاسمي والحقيقي؟', a: 'العائد الاسمي يخبرك بكم جنيهاً صار لديك أكثر؛ والعائد الحقيقي يخبرك بكم صار بوسعك أن تشتري أكثر. وتقريباً، العائد الحقيقي هو الاسمي مطروحاً منه التضخم خلال الفترة نفسها. وكل رقم عائد تراه اسمي ما لم يُذكر خلاف ذلك.' },
            { q: 'هل يمكن أن أخسر رغم تحقيق عائد موجب؟', a: 'نعم، من حيث القوة الشرائية. فإذا ربحت حيازة عشرة في المئة بينما ارتفع المستوى العام للأسعار خمسة عشر، فقد ارتفع رقم الجنيهات وانخفض ما تشتريه. والعبارتان صحيحتان معاً، ولهذا فذكر الرقم الاسمي وحده مضلّل.' },
            { q: 'هل تحمي المنتجات المضمونة من التضخم؟', a: 'لا. فالضمان يزيل خطر انخفاض الرقم لا خطر ارتفاع الأسعار أسرع منه. والضمان مقوَّم بالجنيه، والتضخم هو بالضبط تغيّر في قيمة الجنيه، ولذا قد يكون المنتج آمناً تماماً بالمعنى الذي يَعِد به ومع ذلك يفقد قوة شرائية.' },
            { q: 'ما الاستثمارات التي تتفوق على التضخم؟', a: 'لا أصل يتفوق على التضخم بشكل موثوق في كل فترة. فالأصول التي سبقته تاريخياً مرّت أيضاً بفترات طويلة لم تفعل فيها ذلك. والعادة النافعة ليست البحث عن إجابة مضمونة بل تحويل كل عائد يُعرض عليك إلى قيمة حقيقية قبل مقارنته بأي شيء آخر.' },
        ],
    },
    'understanding-fund-fees': {
        en: [
            { q: 'How is the management fee charged?', a: 'As an annual percentage of the fund\'s net assets, not of your gains. It accrues continuously and is deducted from the fund\'s own assets, so the published unit price is already net of it. You never receive a bill, and it applies whether the fund rises or falls.' },
            { q: 'What is the average mutual fund fee in Egypt?', a: 'It varies widely by fund type, so a single market-wide average mixes products with very different costs to run. Money market and fixed income funds sit at the low end and equity funds at the high end. Comparing a fund against the median of its own category is more informative than against a market average.' },
            { q: 'Are subscription and redemption fees included?', a: 'Usually not in published data. In the figures we receive, a management fee is disclosed for roughly half of Egyptian funds while subscription and redemption charges appear for only a handful, and no fund reports a consolidated total expense ratio. A missing figure means unpublished, not zero — check the prospectus.' },
            { q: 'Does a lower fee mean a better fund?', a: 'No. A fee is a certain annual cost and a return is not certain at all, so the fee is the part you can compare with confidence. But two funds in the same category can differ in strategy, holdings and risk, and none of that appears in the fee.' },
        ],
        ar: [
            { q: 'كيف تُحتسب رسوم الإدارة؟', a: 'كنسبة سنوية من صافي أصول الصندوق لا من أرباحك. وتُستحق باستمرار وتُخصم من أصول الصندوق نفسه، فيكون سعر الوثيقة المنشور صافياً منها. ولا تتلقى فاتورة قط، وتُطبَّق سواء ارتفع الصندوق أو انخفض.' },
            { q: 'ما متوسط رسوم صناديق الاستثمار في مصر؟', a: 'يتفاوت كثيراً حسب نوع الصندوق، فالمتوسط السوقي الواحد يخلط منتجات تختلف تكلفة تشغيلها اختلافاً كبيراً. فصناديق أسواق النقد والدخل الثابت في الطرف الأدنى وصناديق الأسهم في الأعلى. ومقارنة الصندوق بوسيط فئته أنفع من مقارنته بمتوسط السوق.' },
            { q: 'هل تشمل عمولات الاشتراك والاسترداد؟', a: 'غالباً لا في البيانات المنشورة. ففي الأرقام التي تصلنا يُفصح عن رسوم الإدارة لنحو نصف الصناديق المصرية بينما تظهر عمولات الاشتراك والاسترداد لعدد قليل جداً، ولا يفصح أي صندوق عن نسبة مصروفات إجمالية موحّدة. وغياب الرقم يعني عدم الإفصاح لا الصفر — راجع نشرة الاكتتاب.' },
            { q: 'هل انخفاض الرسوم يعني صندوقاً أفضل؟', a: 'لا. فالرسم تكلفة سنوية مؤكدة والعائد غير مؤكد إطلاقاً، لذا فالرسم هو الجزء الذي يمكنك مقارنته بثقة. لكن صندوقين في الفئة نفسها قد يختلفان في الاستراتيجية والمكوّنات والمخاطر، ولا شيء من ذلك يظهر في الرسم.' },
        ],
    },
    'choosing-a-fund-for-your-goal': {
        en: [
            { q: 'How do I choose the right mutual fund?', a: 'Work from your situation to the fund rather than from last year\'s performance backwards. Settle how long the money can stay invested and how large a fall you would sit through without selling; those two answers largely determine the category. Only then compare funds within that category on cost, consistency and what they actually hold.' },
            { q: 'Should I pick the fund with the highest return?', a: 'A single strong year can come from one position or from a category-wide tailwind that lifted every competitor, so it is weak evidence on its own. More informative is how the fund behaved in a bad period, whether the record covers enough time to mean anything, and whether the way it earned its return matches its stated policy.' },
            { q: 'How do I know my risk tolerance?', a: 'Not by how you feel in a calm month. The practical test is to name a number: the loss at which you would stop following the plan. Then choose something whose plausible bad year sits inside that number, because an investor who holds a modest fund through a downturn ends up ahead of one who sells an ambitious fund at the bottom.' },
            { q: 'How many funds should I hold?', a: 'There is no fixed answer, but holding several funds that all do the same job adds complexity without adding much diversification. What matters is whether your holdings collectively match your horizons — short-horizon money and long-horizon money have different requirements and can sensibly sit in different products.' },
        ],
        ar: [
            { q: 'كيف أختار الصندوق المناسب؟', a: 'انطلق من وضعك إلى الصندوق لا من أداء العام الماضي رجوعاً. احسم المدة التي يمكن أن يبقى فيها المال مستثمراً وحجم التراجع الذي ستتحمله دون أن تبيع؛ فهاتان الإجابتان تحددان الفئة إلى حد بعيد. وعندها فقط قارن الصناديق داخل تلك الفئة من حيث التكلفة والانتظام وما تحتفظ به فعلاً.' },
            { q: 'هل أختار الصندوق صاحب أعلى عائد؟', a: 'العام القوي الواحد قد يأتي من مركز واحد أو من رياح مواتية شملت الفئة كلها ورفعت كل المنافسين، فهو دليل ضعيف بمفرده. والأكثر إفادة هو كيف تصرف الصندوق في فترة سيئة، وهل يغطي السجل مدة كافية ليعني شيئاً، وهل تتسق طريقة تحقيقه للعائد مع سياسته المعلنة.' },
            { q: 'كيف أعرف قدرتي على تحمل المخاطر؟', a: 'ليس بما تشعر به في شهر هادئ. فالاختبار العملي أن تسمّي رقماً: الخسارة التي عندها ستتوقف عن اتّباع الخطة. ثم اختر ما يقع عامه السيئ المحتمل داخل ذلك الرقم، لأن من يحتفظ بصندوق متواضع خلال هبوط ينتهي متقدماً على من يبيع صندوقاً طموحاً في القاع.' },
            { q: 'كم صندوقاً ينبغي أن أمتلك؟', a: 'لا إجابة ثابتة، لكن امتلاك عدة صناديق تؤدي كلها الوظيفة نفسها يضيف تعقيداً دون أن يضيف تنويعاً يُذكر. والمهم هو هل تتطابق حيازاتك مجتمعةً مع آفاقك الزمنية — فمال الأفق القصير ومال الأفق الطويل لهما متطلبات مختلفة ويصح أن يكونا في منتجين مختلفين.' },
        ],
    },
};

/** FAQPage JSON-LD for a topic's FAQs in the given language, or null if none. */
export function faqPageJsonLd(slug: string, lang: 'en' | 'ar') {
    const faqs = LEARN_FAQS[slug]?.[lang];
    if (!faqs || faqs.length === 0) return null;
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
    };
}
