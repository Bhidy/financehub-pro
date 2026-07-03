/**
 * Bilingual financial glossary — 30 core EGX / investing terms.
 * Hand-authored content (EN + AR), fully static: imported by
 * app/Learn/glossary and app/ar/Learn/glossary. No db access.
 *
 * Definitions are textbook-standard and purely factual (no advice), with an
 * EGX/Egypt angle where natural. Arabic uses the financial register actually
 * used in the Egyptian market (كوبون، مكرر الربحية، وثائق الصناديق…).
 */

export type GlossaryTerm = {
    slug: string;
    en: { term: string; definition: string; related?: string[] };
    ar: { term: string; definition: string };
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
    {
        slug: 'stock',
        en: {
            term: 'Stock',
            definition:
                'A stock, or share, is a security that represents a unit of ownership in a company. Shareholders participate in the company’s profits through dividends and in changes to its value through the share price. On the Egyptian Exchange (EGX), listed company shares are bought and sold in Egyptian pounds during official trading sessions.',
            related: ['stock-market', 'eps', 'dividend'],
        },
        ar: {
            term: 'سهم',
            definition:
                'السهم هو ورقة مالية تمثل حصة ملكية في شركة مساهمة. يشارك حامل السهم في أرباح الشركة من خلال التوزيعات النقدية وفي تغيّر قيمتها من خلال سعر السهم في السوق. وتُتداول أسهم الشركات المقيدة في البورصة المصرية بالجنيه المصري خلال جلسات التداول الرسمية.',
        },
    },
    {
        slug: 'stock-market',
        en: {
            term: 'Stock Market',
            definition:
                'The stock market is an organized marketplace where shares of listed companies are bought and sold at prices set by supply and demand. In Egypt this role is played by the Egyptian Exchange (EGX), which runs the trading sessions and listing and disclosure rules under the supervision of the Financial Regulatory Authority (FRA).',
            related: ['stock', 'egx-30', 'broker'],
        },
        ar: {
            term: 'سوق الأسهم (البورصة)',
            definition:
                'سوق الأسهم أو البورصة هو سوق منظم تُشترى فيه وتُباع أسهم الشركات المقيدة بأسعار تحددها قوى العرض والطلب. وفي مصر تقوم البورصة المصرية بهذا الدور، حيث تدير جلسات التداول وقواعد القيد والإفصاح تحت رقابة الهيئة العامة للرقابة المالية.',
        },
    },
    {
        slug: 'egx-30',
        en: {
            term: 'EGX 30 Index',
            definition:
                'The EGX 30 is the benchmark index of the Egyptian Exchange, tracking the 30 most liquid and actively traded listed companies. Constituents are weighted by market capitalization adjusted for free float, and the index composition is reviewed semi-annually. It is the most widely quoted gauge of the Egyptian stock market’s overall performance.',
            related: ['stock-market', 'free-float', 'market-cap'],
        },
        ar: {
            term: 'مؤشر EGX 30',
            definition:
                'مؤشر EGX 30 هو المؤشر الرئيسي للبورصة المصرية، ويقيس أداء أكبر 30 شركة مقيدة من حيث السيولة والنشاط. تُحسب أوزان الشركات في المؤشر وفقًا للقيمة السوقية المعدلة بالأسهم الحرة، وتُراجع مكوناته بصفة دورية كل ستة أشهر. ويُعد المقياس الأكثر استخدامًا للتعبير عن أداء سوق الأسهم المصرية بوجه عام.',
        },
    },
    {
        slug: 'mutual-fund',
        en: {
            term: 'Mutual Fund',
            definition:
                'A mutual fund is a pooled investment vehicle that collects money from many investors and invests it in a portfolio of securities run by a professional fund manager. Investors own units (documents) of the fund rather than the underlying securities, and the unit price is derived from the fund’s net asset value (NAV). In Egypt, mutual funds are typically sponsored by banks and investment firms and are regulated by the Financial Regulatory Authority.',
            related: ['nav', 'etf', 'money-market-fund', 'portfolio'],
        },
        ar: {
            term: 'صندوق استثمار',
            definition:
                'صندوق الاستثمار هو وعاء استثماري يجمع أموال عدد كبير من المستثمرين ويستثمرها في محفظة أوراق مالية يديرها مدير استثمار محترف. يمتلك المستثمر وثائق في الصندوق بدلًا من الأوراق المالية نفسها، ويُحدَّد سعر الوثيقة بناءً على صافي قيمة أصول الصندوق. وفي مصر تُنشئ البنوك وشركات الاستثمار معظم الصناديق، وتخضع جميعها لرقابة الهيئة العامة للرقابة المالية.',
        },
    },
    {
        slug: 'nav',
        en: {
            term: 'Net Asset Value (NAV)',
            definition:
                'Net asset value (NAV) is the value of a fund’s total assets minus its liabilities, usually expressed per unit or per share. It is the price at which investors subscribe to or redeem mutual-fund units. Egyptian mutual funds publish updated NAVs on their dealing days, most commonly daily or weekly.',
            related: ['mutual-fund', 'etf', 'money-market-fund'],
        },
        ar: {
            term: 'صافي قيمة الأصول',
            definition:
                'صافي قيمة الأصول هو إجمالي أصول الصندوق مطروحًا منه التزاماته، ويُعبَّر عنه عادةً لكل وثيقة. وهو السعر الذي يكتتب به المستثمرون في وثائق صناديق الاستثمار أو يستردونها به. وتعلن صناديق الاستثمار المصرية صافي قيمة أصولها في أيام التعامل، يوميًا أو أسبوعيًا في الغالب.',
        },
    },
    {
        slug: 'dividend',
        en: {
            term: 'Dividend',
            definition:
                'A dividend is a distribution of part of a company’s profits to its shareholders, usually paid in cash per share. In the Egyptian market the cash dividend is commonly called the “coupon” and must be approved by the company’s general assembly before payment. Companies may also distribute profits as bonus shares instead of cash.',
            related: ['dividend-yield', 'ex-dividend-date', 'eps'],
        },
        ar: {
            term: 'التوزيعات النقدية (الكوبون)',
            definition:
                'التوزيعات النقدية هي جزء من أرباح الشركة يُوزَّع على المساهمين، ويُحدد عادةً كمبلغ نقدي لكل سهم. وفي السوق المصرية يُعرف التوزيع النقدي باسم «الكوبون»، ولا يُصرف إلا بعد اعتماده من الجمعية العامة للشركة. وقد توزع الشركات أرباحها أيضًا في صورة أسهم مجانية بدلًا من النقد.',
        },
    },
    {
        slug: 'dividend-yield',
        en: {
            term: 'Dividend Yield',
            definition:
                'Dividend yield is the annual cash dividend per share expressed as a percentage of the current share price. It measures the income a shareholder receives from distributions relative to the market price of the stock. Because the calculation uses the market price, the yield rises when the price falls and falls when the price rises, assuming the dividend is unchanged.',
            related: ['dividend', 'ex-dividend-date', 'pe-ratio'],
        },
        ar: {
            term: 'عائد التوزيعات',
            definition:
                'عائد التوزيعات هو نسبة التوزيعات النقدية السنوية للسهم إلى سعره الحالي في السوق. ويقيس الدخل الذي يحصل عليه المساهم من التوزيعات مقارنةً بسعر السهم. ولأن الحساب يعتمد على سعر السوق، يرتفع العائد عند انخفاض السعر وينخفض عند ارتفاعه إذا ظل التوزيع ثابتًا.',
        },
    },
    {
        slug: 'ex-dividend-date',
        en: {
            term: 'Ex-Dividend Date',
            definition:
                'The ex-dividend date is the first trading day on which a stock trades without the right to the most recently declared dividend. Investors who buy the share on or after this date are not entitled to that payment, which goes to shareholders recorded before it. On the Egyptian Exchange, the share price is typically adjusted downward by the coupon amount at the open of the ex-dividend session.',
            related: ['dividend', 'dividend-yield'],
        },
        ar: {
            term: 'تاريخ الاستحقاق',
            definition:
                'تاريخ الاستحقاق هو أول يوم تداول يُتداول فيه السهم من دون الحق في آخر توزيعات معلنة. فمن يشتري السهم في هذا اليوم أو بعده لا يستحق الكوبون، الذي يذهب إلى المساهمين المقيدين قبل هذا التاريخ. وفي البورصة المصرية يُعدَّل سعر السهم عادةً بخصم قيمة الكوبون عند افتتاح جلسة الاستحقاق.',
        },
    },
    {
        slug: 'market-cap',
        en: {
            term: 'Market Capitalization',
            definition:
                'Market capitalization is the total market value of a company’s outstanding shares, calculated as the share price multiplied by the number of issued shares. It is the standard measure used to rank the size of listed companies and to weight them in indices such as the EGX 30. Market cap changes continuously as the share price moves.',
            related: ['stock', 'egx-30', 'free-float'],
        },
        ar: {
            term: 'القيمة السوقية',
            definition:
                'القيمة السوقية هي إجمالي قيمة أسهم الشركة في السوق، وتُحسب بضرب سعر السهم في عدد الأسهم المُصدرة. وهي المقياس المعتمد لترتيب الشركات المقيدة حسب الحجم ولتحديد أوزانها في المؤشرات مثل EGX 30. وتتغير القيمة السوقية باستمرار مع تحرك سعر السهم.',
        },
    },
    {
        slug: 'pe-ratio',
        en: {
            term: 'Price-to-Earnings (P/E) Ratio',
            definition:
                'The price-to-earnings ratio divides a company’s share price by its earnings per share, showing how many pounds investors pay for each pound of annual profit. It is one of the most widely used valuation multiples for comparing listed companies within the same sector. A trailing P/E uses reported earnings, while a forward P/E uses forecast earnings.',
            related: ['eps', 'pb-ratio', 'market-cap'],
        },
        ar: {
            term: 'مكرر الربحية',
            definition:
                'مكرر الربحية هو ناتج قسمة سعر السهم على ربحية السهم، ويوضح عدد الجنيهات التي يدفعها المستثمرون مقابل كل جنيه من الأرباح السنوية. وهو من أكثر مضاعفات التقييم استخدامًا للمقارنة بين الشركات المقيدة في القطاع نفسه. ويُحسب المكرر إما على أساس الأرباح المحققة أو على أساس الأرباح المتوقعة.',
        },
    },
    {
        slug: 'pb-ratio',
        en: {
            term: 'Price-to-Book (P/B) Ratio',
            definition:
                'The price-to-book ratio compares a company’s share price with its book value per share, which is shareholders’ equity divided by the number of shares. A ratio of 1 means the stock trades at exactly its accounting net worth. The multiple is used widely for valuing banks and other asset-heavy businesses on the EGX.',
            related: ['pe-ratio', 'eps', 'market-cap'],
        },
        ar: {
            term: 'مكرر القيمة الدفترية',
            definition:
                'مكرر القيمة الدفترية يقارن سعر السهم بنصيبه من القيمة الدفترية، أي حقوق المساهمين مقسومة على عدد الأسهم. فإذا كان المكرر يساوي واحدًا، فمعنى ذلك أن السهم يُتداول عند صافي قيمته المحاسبية بالضبط. ويُستخدم هذا المكرر على نطاق واسع في تقييم البنوك والشركات كثيفة الأصول في البورصة المصرية.',
        },
    },
    {
        slug: 'eps',
        en: {
            term: 'Earnings per Share (EPS)',
            definition:
                'Earnings per share is a company’s net profit attributable to shareholders divided by the weighted average number of outstanding shares. It expresses how much profit the company generated for each share during a period. EPS is the denominator of the P/E ratio and a core input in equity valuation.',
            related: ['pe-ratio', 'dividend', 'stock'],
        },
        ar: {
            term: 'ربحية السهم',
            definition:
                'ربحية السهم هي صافي أرباح الشركة العائدة على المساهمين مقسومة على المتوسط المرجح لعدد الأسهم القائمة. وتعبّر عن نصيب كل سهم من الأرباح خلال فترة مالية معينة. وتُعد ربحية السهم أساس حساب مكرر الربحية وأحد المدخلات الرئيسية في تقييم الأسهم.',
        },
    },
    {
        slug: 'ipo',
        en: {
            term: 'Initial Public Offering (IPO)',
            definition:
                'An initial public offering is the first sale of a company’s shares to the public, after which the shares are listed and traded on an exchange. Companies use IPOs to raise capital or to allow existing owners to sell part of their stakes. On the Egyptian Exchange, offerings are usually split into a public retail tranche and a private-placement tranche for institutions.',
            related: ['stock', 'stock-market', 'free-float'],
        },
        ar: {
            term: 'الطرح العام الأولي',
            definition:
                'الطرح العام الأولي هو أول بيع لأسهم شركة للجمهور، وبعده تُقيَّد الأسهم وتُتداول في البورصة. تلجأ الشركات إلى الطرح لزيادة رأس المال أو لتمكين الملاك الحاليين من بيع جزء من حصصهم. وفي البورصة المصرية يُقسَّم الطرح عادةً إلى شريحة طرح عام للأفراد وشريحة طرح خاص للمؤسسات.',
        },
    },
    {
        slug: 'bull-market',
        en: {
            term: 'Bull Market',
            definition:
                'A bull market is a sustained period of rising share prices, typically defined as a gain of 20% or more from a recent low. It is usually accompanied by strong trading activity and optimism about the economy and corporate earnings. The opposite condition is a bear market.',
            related: ['bear-market', 'volatility', 'stock-market'],
        },
        ar: {
            term: 'السوق الصاعد',
            definition:
                'السوق الصاعد هو فترة ممتدة من ارتفاع أسعار الأسهم، وتُعرَّف عادةً بارتفاع بنسبة 20% أو أكثر من أدنى مستوى حديث. ويصاحبها في الغالب نشاط تداول قوي وتفاؤل بشأن الاقتصاد وأرباح الشركات. وعكسها السوق الهابط.',
        },
    },
    {
        slug: 'bear-market',
        en: {
            term: 'Bear Market',
            definition:
                'A bear market is a prolonged period of falling share prices, conventionally defined as a decline of 20% or more from a recent peak. It typically reflects pessimism about economic conditions or corporate profits and is often accompanied by lower trading volumes. The opposite condition is a bull market.',
            related: ['bull-market', 'volatility', 'circuit-breaker'],
        },
        ar: {
            term: 'السوق الهابط',
            definition:
                'السوق الهابط هو فترة ممتدة من تراجع أسعار الأسهم، ويُعرَّف تقليديًا بانخفاض بنسبة 20% أو أكثر من أعلى مستوى حديث. ويعكس عادةً تشاؤمًا تجاه الأوضاع الاقتصادية أو أرباح الشركات، وكثيرًا ما يصاحبه انخفاض في أحجام التداول. وعكسه السوق الصاعد.',
        },
    },
    {
        slug: 'volatility',
        en: {
            term: 'Volatility',
            definition:
                'Volatility measures how much and how quickly a security’s price moves over time, commonly calculated as the standard deviation of returns. Higher volatility means larger and more frequent price swings in both directions. Exchanges such as the EGX apply daily price limits partly to contain extreme intraday volatility.',
            related: ['circuit-breaker', 'liquidity', 'bear-market'],
        },
        ar: {
            term: 'التذبذب',
            definition:
                'التذبذب هو مقياس لمدى وسرعة تغيّر سعر الورقة المالية عبر الزمن، ويُحسب عادةً بالانحراف المعياري للعوائد. وكلما ارتفع التذبذب زادت حدة تحركات السعر صعودًا وهبوطًا وزاد تكرارها. وتطبّق البورصات، ومنها البورصة المصرية، حدودًا سعرية يومية للحد من التذبذب الحاد خلال الجلسة.',
        },
    },
    {
        slug: 'liquidity',
        en: {
            term: 'Liquidity',
            definition:
                'Liquidity is the ease with which an asset can be bought or sold quickly without materially moving its price. A liquid stock has many active buyers and sellers, narrow bid-ask spreads, and high trading volumes. Liquidity is a key criterion for selecting the constituents of the EGX 30 index.',
            related: ['volatility', 'free-float', 'order-book'],
        },
        ar: {
            term: 'السيولة',
            definition:
                'السيولة هي سهولة شراء الأصل أو بيعه بسرعة دون تأثير ملموس في سعره. فالسهم المتمتع بالسيولة يتوافر له مشترون وبائعون نشطون، وفارق ضيق بين سعري الطلب والعرض، وأحجام تداول مرتفعة. وتُعد السيولة معيارًا أساسيًا في اختيار مكونات مؤشر EGX 30.',
        },
    },
    {
        slug: 'diversification',
        en: {
            term: 'Diversification',
            definition:
                'Diversification is the practice of spreading investments across different securities, sectors, or asset classes so that no single position dominates the portfolio’s outcome. Because asset prices do not all move together, combining them reduces the impact of any one investment’s losses on the whole portfolio. Mutual funds provide built-in diversification by holding many securities in one vehicle.',
            related: ['portfolio', 'mutual-fund', 'volatility'],
        },
        ar: {
            term: 'التنويع',
            definition:
                'التنويع هو توزيع الاستثمارات على أوراق مالية وقطاعات وفئات أصول مختلفة بحيث لا يهيمن مركز واحد على نتيجة المحفظة. ولأن أسعار الأصول لا تتحرك جميعها في اتجاه واحد، يقلّل الجمع بينها أثر خسائر أي استثمار منفرد على المحفظة ككل. وتوفر صناديق الاستثمار تنويعًا جاهزًا لاحتوائها على عدد كبير من الأوراق المالية في وعاء واحد.',
        },
    },
    {
        slug: 'portfolio',
        en: {
            term: 'Portfolio',
            definition:
                'A portfolio is the complete collection of financial assets held by an investor, such as stocks, bonds, fund units, and cash. Its composition — the weights assigned to each asset class and security — determines the portfolio’s overall risk and return profile. In Egypt, investors’ securities are recorded centrally with Misr for Central Clearing, Depository and Registry (MCDR).',
            related: ['diversification', 'broker', 'stock'],
        },
        ar: {
            term: 'المحفظة الاستثمارية',
            definition:
                'المحفظة الاستثمارية هي مجموع الأصول المالية التي يمتلكها المستثمر من أسهم وسندات ووثائق صناديق ونقد. ويحدد تكوين المحفظة — أي أوزان كل فئة أصول وكل ورقة مالية — مستوى المخاطر والعائد الإجمالي لها. وفي مصر تُقيَّد الأوراق المالية للمستثمرين مركزيًا لدى شركة مصر للمقاصة والإيداع والقيد المركزي.',
        },
    },
    {
        slug: 'broker',
        en: {
            term: 'Broker',
            definition:
                'A broker is a licensed firm that executes buy and sell orders in the market on behalf of investors in exchange for a commission. In Egypt, brokerage companies must be licensed by the Financial Regulatory Authority and be members of the Egyptian Exchange to trade on it. Investors open a trading account and a unified investor code through a broker before placing orders.',
            related: ['order-book', 'limit-order', 'market-order'],
        },
        ar: {
            term: 'شركة السمسرة',
            definition:
                'شركة السمسرة هي شركة مرخصة تنفّذ أوامر الشراء والبيع في السوق نيابةً عن المستثمرين مقابل عمولة. وفي مصر يجب أن تحصل شركات السمسرة على ترخيص من الهيئة العامة للرقابة المالية وأن تكون عضوًا في البورصة المصرية للتداول فيها. ويفتح المستثمر حساب تداول وكودًا موحدًا عن طريق شركة السمسرة قبل إدخال الأوامر.',
        },
    },
    {
        slug: 'order-book',
        en: {
            term: 'Order Book',
            definition:
                'The order book is the electronic record of all outstanding buy and sell orders for a security, arranged by price level and time of entry. It shows the quantities bid and offered at each price, with the best bid and best ask forming the market’s current spread. Trades occur when incoming orders match existing orders on the opposite side of the book.',
            related: ['limit-order', 'market-order', 'liquidity'],
        },
        ar: {
            term: 'دفتر الأوامر',
            definition:
                'دفتر الأوامر هو السجل الإلكتروني لجميع أوامر الشراء والبيع القائمة على ورقة مالية، مرتبةً حسب مستوى السعر ووقت الإدخال. ويعرض الكميات المطلوبة والمعروضة عند كل سعر، حيث يشكّل أفضل سعر طلب وأفضل سعر عرض الفارق السعري الحالي في السوق. وتُنفَّذ الصفقات عندما تتطابق الأوامر الواردة مع أوامر قائمة في الاتجاه المقابل.',
        },
    },
    {
        slug: 'limit-order',
        en: {
            term: 'Limit Order',
            definition:
                'A limit order is an instruction to buy or sell a security at a specified price or better — no higher than the limit for a buy, and no lower for a sell. The order rests in the order book until it is matched, cancelled, or expires. It guarantees the execution price but not that the order will be filled.',
            related: ['market-order', 'order-book', 'broker'],
        },
        ar: {
            term: 'أمر محدد',
            definition:
                'الأمر المحدد هو أمر بشراء أو بيع ورقة مالية عند سعر محدد أو أفضل منه، فلا يُنفَّذ الشراء بأعلى من السعر المحدد ولا البيع بأدنى منه. ويظل الأمر قائمًا في دفتر الأوامر حتى يُنفَّذ أو يُلغى أو تنتهي صلاحيته. وهو يضمن سعر التنفيذ لكنه لا يضمن إتمام التنفيذ نفسه.',
        },
    },
    {
        slug: 'market-order',
        en: {
            term: 'Market Order',
            definition:
                'A market order is an instruction to buy or sell a security immediately at the best price currently available in the order book. It prioritizes speed and certainty of execution over price. In fast-moving or thinly traded stocks, the final execution price can differ noticeably from the last quoted price.',
            related: ['limit-order', 'order-book', 'liquidity'],
        },
        ar: {
            term: 'أمر سوق',
            definition:
                'أمر السوق هو أمر بشراء أو بيع ورقة مالية فورًا بأفضل سعر متاح في دفتر الأوامر وقت الإدخال. وتُقدَّم فيه سرعة التنفيذ وضمانه على اعتبارات السعر. وفي الأسهم سريعة الحركة أو منخفضة السيولة قد يختلف سعر التنفيذ النهائي بوضوح عن آخر سعر معلن.',
        },
    },
    {
        slug: 'circuit-breaker',
        en: {
            term: 'Circuit Breaker',
            definition:
                'A circuit breaker is an exchange mechanism that temporarily halts or restricts trading when a stock or index moves beyond preset thresholds. Its purpose is to pause the market during sharp swings so that new information can be absorbed in an orderly way. The Egyptian Exchange applies daily price limits to listed shares and can suspend a stock temporarily when those thresholds are reached.',
            related: ['volatility', 'stock-market', 'bear-market'],
        },
        ar: {
            term: 'قاطع التداول',
            definition:
                'قاطع التداول هو آلية تستخدمها البورصة لوقف التداول مؤقتًا أو تقييده عندما يتجاوز سهم أو مؤشر حدودًا سعرية محددة مسبقًا. والهدف منه تهدئة السوق أثناء التحركات الحادة لإتاحة الوقت لاستيعاب المعلومات الجديدة بشكل منظم. وتطبّق البورصة المصرية حدودًا سعرية يومية على الأسهم المقيدة ويمكنها إيقاف السهم مؤقتًا عند بلوغ تلك الحدود.',
        },
    },
    {
        slug: 'free-float',
        en: {
            term: 'Free Float',
            definition:
                'Free float is the portion of a company’s shares available for trading by the public, excluding stakes held by founders, governments, strategic investors, and other long-term holders. A larger free float generally supports higher liquidity in the stock. EGX indices, including the EGX 30, weight companies by their free-float-adjusted market capitalization.',
            related: ['market-cap', 'egx-30', 'liquidity'],
        },
        ar: {
            term: 'الأسهم الحرة',
            definition:
                'الأسهم الحرة هي نسبة أسهم الشركة المتاحة للتداول الحر أمام الجمهور، بعد استبعاد حصص المؤسسين والحكومة والمستثمرين الاستراتيجيين وغيرهم من الملاك طويلي الأجل. وكلما اتسع نطاق الأسهم الحرة ارتفعت سيولة السهم في الغالب. وتُحسب أوزان الشركات في مؤشرات البورصة المصرية، ومنها EGX 30، وفقًا للقيمة السوقية المعدلة بالأسهم الحرة.',
        },
    },
    {
        slug: 'rights-issue',
        en: {
            term: 'Rights Issue',
            definition:
                'A rights issue is a capital increase in which a company offers existing shareholders the right to subscribe to new shares, usually at a set price and in proportion to their holdings. Shareholders may exercise the rights, let them lapse, or sell them where trading is permitted. On the Egyptian Exchange, subscription rights are separated from the shares and traded as instruments in their own right during the subscription period.',
            related: ['ipo', 'stock', 'free-float'],
        },
        ar: {
            term: 'أسهم حقوق الاكتتاب',
            definition:
                'حقوق الاكتتاب هي زيادة في رأس المال تمنح فيها الشركة مساهميها الحاليين حق الاكتتاب في أسهم جديدة بسعر محدد وبنسبة ما يملكونه من أسهم. ويجوز للمساهم استخدام الحق أو التنازل عنه أو بيعه حيثما يُسمح بتداوله. وفي البورصة المصرية تُفصل حقوق الاكتتاب عن الأسهم وتُتداول بوصفها ورقة مالية مستقلة خلال فترة الاكتتاب.',
        },
    },
    {
        slug: 'stock-split',
        en: {
            term: 'Stock Split',
            definition:
                'A stock split divides each existing share into several shares of lower par value, increasing the share count while leaving the company’s total market value unchanged. The share price adjusts proportionally, so the value of each shareholder’s stake is not affected. Companies listed on the EGX have used splits to lower the price per share and broaden trading in the stock.',
            related: ['stock', 'market-cap', 'eps'],
        },
        ar: {
            term: 'تجزئة الأسهم',
            definition:
                'تجزئة الأسهم هي تقسيم كل سهم قائم إلى عدة أسهم بقيمة اسمية أقل، بحيث يزيد عدد الأسهم دون أن تتغير القيمة السوقية الإجمالية للشركة. ويُعدَّل سعر السهم بالنسبة نفسها، فلا تتأثر قيمة ما يملكه المساهم. وقد لجأت شركات مقيدة في البورصة المصرية إلى التجزئة لخفض سعر السهم الواحد وتنشيط تداوله.',
        },
    },
    {
        slug: 'etf',
        en: {
            term: 'Exchange-Traded Fund (ETF)',
            definition:
                'An exchange-traded fund is an investment fund whose units are listed and traded on the exchange throughout the session, like a stock. Most ETFs passively track an index by holding its constituents in the same weights. ETFs listed on the Egyptian Exchange track benchmarks such as the EGX 30, giving exposure to the whole index in a single trade.',
            related: ['mutual-fund', 'nav', 'egx-30'],
        },
        ar: {
            term: 'صندوق المؤشرات المتداول',
            definition:
                'صندوق المؤشرات المتداول هو صندوق استثمار تُقيَّد وثائقه وتُتداول في البورصة طوال الجلسة مثل الأسهم تمامًا. وتتبع معظم هذه الصناديق مؤشرًا معينًا تتبعًا سلبيًا من خلال امتلاك مكوناته بالأوزان نفسها. وتتيح الصناديق المتداولة في البورصة المصرية، التي تتبع مؤشرات مثل EGX 30، شراء أداء المؤشر كاملًا في صفقة واحدة.',
        },
    },
    {
        slug: 'money-market-fund',
        en: {
            term: 'Money Market Fund',
            definition:
                'A money market fund is a mutual fund that invests in short-term, low-risk instruments such as treasury bills, bank deposits, and short-dated debt. It aims to preserve capital and deliver returns close to prevailing short-term interest rates, with daily or near-daily liquidity. In Egypt these funds — widely offered by banks and often called liquidity or cash funds — publish their NAV daily.',
            related: ['mutual-fund', 'nav', 'liquidity'],
        },
        ar: {
            term: 'صندوق النقد (صندوق السيولة)',
            definition:
                'صندوق النقد هو صندوق استثمار يوظّف أمواله في أدوات قصيرة الأجل منخفضة المخاطر مثل أذون الخزانة والودائع البنكية وأدوات الدين قصيرة الأجل. ويهدف إلى الحفاظ على رأس المال وتحقيق عائد قريب من أسعار الفائدة قصيرة الأجل السائدة مع إتاحة سيولة شبه يومية. وتنتشر هذه الصناديق في مصر عبر البنوك وتُعرف أيضًا بصناديق السيولة، وتعلن صافي قيمة أصولها يوميًا.',
        },
    },
    {
        slug: 'shariah-compliant',
        en: {
            term: 'Shariah-Compliant Investing',
            definition:
                'A Shariah-compliant investment conforms to Islamic law: it avoids interest-based income, excessive uncertainty, and prohibited business activities, and it passes financial-ratio screens on debt levels and interest income. Compliance is certified and monitored by a Shariah supervisory board. The Egyptian market includes Shariah-compliant mutual funds and screened stock lists for investors who require them.',
            related: ['mutual-fund', 'etf', 'stock'],
        },
        ar: {
            term: 'متوافق مع الشريعة',
            definition:
                'الاستثمار المتوافق مع الشريعة هو استثمار يلتزم بأحكام الشريعة الإسلامية، فيتجنب العائد القائم على الفائدة (الربا) والغرر والأنشطة المحرّمة، ويخضع لمعايير مالية بشأن نسب الديون والدخل من الفوائد. وتتولى هيئة رقابة شرعية اعتماد التوافق ومراجعته بصفة دورية. وتضم السوق المصرية صناديق استثمار متوافقة مع الشريعة وقوائم أسهم مجازة شرعًا للمستثمرين الراغبين في ذلك.',
        },
    },
];

/** Look up a term by slug (undefined for unknown slugs → caller calls notFound). */
export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
    return GLOSSARY_TERMS.find((t) => t.slug === slug);
}

/**
 * First sentence of a definition (used for index snippets + meta descriptions).
 * Definitions are authored without dotted abbreviations, so the first "." is
 * always a sentence boundary in both languages.
 */
export function firstSentence(text: string): string {
    const match = text.match(/^[^.]*\./);
    return match ? match[0] : text;
}

/**
 * Related terms for a slug: its curated related[] list plus the next 3
 * catalogue neighbors (wrapping), de-duplicated, never including itself.
 */
export function relatedGlossaryTerms(slug: string): GlossaryTerm[] {
    const idx = GLOSSARY_TERMS.findIndex((t) => t.slug === slug);
    if (idx === -1) return GLOSSARY_TERMS.slice(0, 3);
    const curated = GLOSSARY_TERMS[idx].en.related ?? [];
    const neighbors = [1, 2, 3].map(
        (offset) => GLOSSARY_TERMS[(idx + offset) % GLOSSARY_TERMS.length].slug
    );
    const seen = new Set<string>([slug]);
    const slugs: string[] = [];
    for (const s of [...curated, ...neighbors]) {
        if (!seen.has(s)) {
            seen.add(s);
            slugs.push(s);
        }
    }
    return slugs
        .map((s) => getGlossaryTerm(s))
        .filter((t): t is GlossaryTerm => t !== undefined);
}

/**
 * Contextual in-site links per term (deep links into the live product pages).
 * Bilingual labels so the EN and AR term pages stay perfectly mirrored.
 */
export const GLOSSARY_SITE_LINKS: Record<string, Array<{ href: string; en: string; ar: string }>> = {
    stock: [{ href: '/companies', en: 'Browse all EGX-listed companies', ar: 'تصفح جميع الشركات المقيدة في البورصة المصرية' }],
    'stock-market': [{ href: '/Market-Pulse', en: 'See today’s EGX market pulse', ar: 'تابع نبض السوق المصرية اليوم' }],
    'egx-30': [{ href: '/Market-Pulse', en: 'Track the EGX 30 live on Market Pulse', ar: 'تابع مؤشر EGX 30 لحظيًا في نبض السوق' }],
    'mutual-fund': [{ href: '/Funds', en: 'Compare Egyptian mutual funds and their NAVs', ar: 'قارن صناديق الاستثمار المصرية وصافي قيمة أصولها' }],
    nav: [{ href: '/Funds', en: 'See daily NAVs for Egyptian funds', ar: 'اطلع على صافي قيمة الأصول اليومي للصناديق المصرية' }],
    'market-cap': [{ href: '/companies', en: 'Compare EGX companies by market cap', ar: 'قارن شركات البورصة المصرية حسب القيمة السوقية' }],
    etf: [{ href: '/Funds', en: 'Explore listed Egyptian funds', ar: 'استكشف الصناديق المصرية المتاحة' }],
    'money-market-fund': [{ href: '/Funds', en: 'Compare Egyptian money market funds', ar: 'قارن صناديق النقد والسيولة المصرية' }],
    'shariah-compliant': [{ href: '/Funds', en: 'Find Shariah-compliant Egyptian funds', ar: 'ابحث عن الصناديق المصرية المتوافقة مع الشريعة' }],
};
