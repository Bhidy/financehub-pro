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
