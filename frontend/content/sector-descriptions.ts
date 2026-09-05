/**
 * SECTOR DESCRIPTIONS — what each EGX sector groups, in plain factual terms.
 *
 * The sector hubs listed companies and nothing else: fifteen Arabic and one
 * English sector page rendered under 300 words server-side (audit 2026-09-05),
 * because a small sector is a short table. A reader landing from "قطاع
 * الاتصالات في البورصة" is asking what the sector IS before asking who is in
 * it. These are definitional, name no company, recommend nothing, and are
 * keyed by the exact `sector_name` values in market_tickers so a renamed
 * sector fails loudly (no description) rather than showing the wrong one.
 */

export type SectorDescription = { en: string; ar: string };

export const SECTOR_DESCRIPTIONS: Record<string, SectorDescription> = {
    Finance: {
        en: 'Banks, investment banks, holding companies and other deposit-taking or lending institutions. Bank earnings move with interest-rate spreads, loan growth and provisioning for bad loans; the sector is the largest by market value on the Egyptian Exchange and the core of the EGX 30.',
        ar: 'البنوك وبنوك الاستثمار والشركات القابضة وغيرها من مؤسسات قبول الودائع والإقراض. تتحرك أرباح البنوك مع هوامش أسعار الفائدة ونمو الإقراض ومخصصات القروض المتعثرة، وهو أكبر القطاعات بالقيمة السوقية في البورصة المصرية ونواة مؤشر EGX 30.',
    },
    'Financial Services': {
        en: 'Non-bank financial companies: brokerages, asset managers, leasing and consumer-finance firms, payment processors and insurers. Revenue follows trading volumes, assets under management and the volume of financing written, so the sector tends to amplify market cycles.',
        ar: 'الشركات المالية غير المصرفية: شركات السمسرة وإدارة الأصول والتأجير التمويلي والتمويل الاستهلاكي ومعالجة المدفوعات والتأمين. تتبع الإيرادات أحجام التداول والأصول المُدارة وحجم التمويل الممنوح، ولذلك يميل القطاع إلى تضخيم دورات السوق.',
    },
    'Process Industries': {
        en: 'Producers that transform raw inputs at scale: chemicals, fertilisers, textiles, paper pulp and agricultural processing. Margins depend on feedstock and energy costs and on export prices, which makes the sector sensitive to the exchange rate and to natural-gas pricing.',
        ar: 'منتجون يحوّلون المدخلات الخام على نطاق واسع: الكيماويات والأسمدة والمنسوجات وعجائن الورق والتصنيع الزراعي. تعتمد الهوامش على تكلفة المدخلات والطاقة وعلى أسعار التصدير، ما يجعل القطاع حساساً لسعر الصرف وتسعير الغاز الطبيعي.',
    },
    'Non-Energy Minerals': {
        en: 'Steel, aluminium, cement, ceramics and other building and industrial materials. Demand tracks construction and infrastructure spending; costs track energy prices and import tariffs, so profitability swings with both the building cycle and the currency.',
        ar: 'الحديد والصلب والألومنيوم والأسمنت والسيراميك وغيرها من مواد البناء والمواد الصناعية. يتبع الطلب الإنفاق على البناء والبنية التحتية، وتتبع التكاليف أسعار الطاقة والرسوم الجمركية، فتتقلب الربحية مع دورة البناء وسعر العملة معاً.',
    },
    'Producer Manufacturing': {
        en: 'Makers of industrial equipment, cables, engines, vehicles and building components sold to other businesses. Order books follow capital spending by utilities, contractors and manufacturers, so the sector moves with investment cycles rather than consumer spending.',
        ar: 'صانعو المعدات الصناعية والكابلات والمحركات والمركبات ومكونات البناء التي تُباع لشركات أخرى. تتبع دفاتر الطلبات الإنفاق الرأسمالي للمرافق والمقاولين والمصنّعين، فيتحرك القطاع مع دورات الاستثمار لا مع الإنفاق الاستهلاكي.',
    },
    'Consumer Non-Durables': {
        en: 'Food, beverages, tobacco, dairy, personal-care and other goods bought repeatedly. Volumes are relatively steady through the cycle; what moves earnings is pricing power against input-cost inflation and the exchange rate on imported ingredients and packaging.',
        ar: 'الأغذية والمشروبات والتبغ والألبان ومنتجات العناية الشخصية وغيرها من السلع التي تُشترى بشكل متكرر. الأحجام مستقرة نسبياً عبر الدورة الاقتصادية، وما يحرّك الأرباح هو القدرة التسعيرية أمام تضخم تكاليف المدخلات وسعر صرف المكونات والتغليف المستوردة.',
    },
    'Consumer Durables': {
        en: 'Appliances, furniture, vehicles and other long-lived household purchases. Demand is deferrable, so sales fall first in a downturn and recover with consumer credit and confidence; imported components make margins currency-sensitive.',
        ar: 'الأجهزة المنزلية والأثاث والسيارات وغيرها من المشتريات المنزلية طويلة العمر. الطلب قابل للتأجيل، فتتراجع المبيعات أولاً في فترات الركود وتتعافى مع الائتمان الاستهلاكي والثقة، وتجعل المكونات المستوردة الهوامش حساسة للعملة.',
    },
    Communications: {
        en: 'Telecom operators and network providers: mobile, fixed-line, broadband and wholesale connectivity. Revenue is subscription-based and comparatively stable; capital intensity, spectrum costs and regulated tariffs shape returns.',
        ar: 'مشغّلو الاتصالات ومزوّدو الشبكات: الهاتف المحمول والثابت والإنترنت عريض النطاق والربط بالجملة. الإيرادات قائمة على الاشتراكات ومستقرة نسبياً، وتحدد كثافة رأس المال وتكاليف الترددات والتعريفات المنظّمة العوائد.',
    },
    'Technology Services': {
        en: 'Software, IT services, data processing, outsourcing and digital-payment platforms. Growth follows enterprise digitisation and the shift of payments online; a large share of revenue is often earned in foreign currency from export contracts.',
        ar: 'البرمجيات وخدمات تكنولوجيا المعلومات ومعالجة البيانات والتعهيد ومنصات الدفع الرقمي. يتبع النمو رقمنة الشركات وانتقال المدفوعات إلى الإنترنت، وغالباً ما يُكتسب جزء كبير من الإيرادات بالعملة الأجنبية من عقود التصدير.',
    },
    'Electronic Technology': {
        en: 'Electronics, satellites, telecom equipment and defence or aerospace hardware. Projects are long-cycle and contract-driven, so results arrive in lumps tied to delivery milestones rather than in a steady quarterly rhythm.',
        ar: 'الإلكترونيات والأقمار الصناعية ومعدات الاتصالات وعتاد الدفاع والفضاء. المشاريع طويلة الدورة وقائمة على العقود، فتأتي النتائج على دفعات مرتبطة بمراحل التسليم لا بإيقاع ربع سنوي منتظم.',
    },
    'Industrial Services': {
        en: 'Oilfield and drilling services, engineering contractors and environmental or infrastructure service companies. Work is awarded through tenders and priced per project, so backlog and utilisation matter more than any single quarter.',
        ar: 'خدمات حقول النفط والحفر ومقاولو الهندسة وشركات الخدمات البيئية أو خدمات البنية التحتية. تُمنح الأعمال بالمناقصات وتُسعّر لكل مشروع، ولذلك تهم الأعمال المتعاقد عليها ومعدل التشغيل أكثر من أي ربع سنة منفرد.',
    },
    'Commercial Services': {
        en: 'Business-to-business services: advertising, printing, facilities, security and professional services. Contracts are typically short and renewable, so revenue tracks general business activity closely and with little lag.',
        ar: 'خدمات الأعمال بين الشركات: الإعلان والطباعة وإدارة المرافق والأمن والخدمات المهنية. العقود عادةً قصيرة وقابلة للتجديد، فتتبع الإيرادات النشاط الاقتصادي العام عن قرب وبتأخر ضئيل.',
    },
    'Distribution Services': {
        en: 'Wholesalers and distributors of pharmaceuticals, food, fuel and industrial goods. Margins are thin and earned on volume and working-capital discipline; the sector is a direct read on the flow of goods through the economy.',
        ar: 'تجار الجملة وموزعو الأدوية والأغذية والوقود والسلع الصناعية. الهوامش ضئيلة وتُكتسب من الحجم وانضباط رأس المال العامل، والقطاع قراءة مباشرة لتدفق السلع عبر الاقتصاد.',
    },
    'Consumer Services': {
        en: 'Hotels, tourism, education, restaurants, media and entertainment. Tourism-linked names move with visitor arrivals and the currency; education providers with enrolment and regulated fees; media with advertising spend.',
        ar: 'الفنادق والسياحة والتعليم والمطاعم والإعلام والترفيه. تتحرك الأسماء المرتبطة بالسياحة مع أعداد الزوار وسعر العملة، وشركات التعليم مع الالتحاق والرسوم المنظّمة، والإعلام مع الإنفاق الإعلاني.',
    },
    'Health Technology': {
        en: 'Pharmaceutical manufacturers and medical-device makers. Prices for many medicines are regulated, so earnings hinge on approved price adjustments, the cost of imported active ingredients and the exchange rate.',
        ar: 'مصنّعو الأدوية وصانعو الأجهزة الطبية. أسعار كثير من الأدوية منظّمة، فتتوقف الأرباح على تعديلات الأسعار المعتمدة وتكلفة المواد الفعالة المستوردة وسعر الصرف.',
    },
    'Health Services': {
        en: 'Hospitals, clinics, laboratories and healthcare operators. Revenue grows with bed capacity, patient volumes and the mix of insured versus out-of-pocket care; staffing and medical-supply costs set the margin.',
        ar: 'المستشفيات والعيادات والمعامل ومشغّلو الرعاية الصحية. تنمو الإيرادات مع الطاقة السريرية وأعداد المرضى ومزيج الرعاية المؤمّن عليها مقابل المدفوعة مباشرة، وتحدد تكاليف الكوادر والمستلزمات الطبية الهامش.',
    },
    Transportation: {
        en: 'Shipping, ports, container handling, logistics and passenger transport. Volumes follow trade flows through the Suez Canal corridor and domestic freight; fuel costs and freight rates drive margins.',
        ar: 'الشحن والموانئ وتداول الحاويات والخدمات اللوجستية ونقل الركاب. تتبع الأحجام تدفقات التجارة عبر ممر قناة السويس والشحن المحلي، وتقود تكاليف الوقود وأسعار الشحن الهوامش.',
    },
    Utilities: {
        en: 'Electricity, gas distribution and water companies. Tariffs are regulated and demand is steady, so these are among the least volatile earners on the exchange; returns depend on tariff decisions and the cost of capital.',
        ar: 'شركات الكهرباء وتوزيع الغاز والمياه. التعريفات منظّمة والطلب مستقر، فهي من أقل الأرباح تقلباً في البورصة، وتعتمد العوائد على قرارات التعريفة وتكلفة رأس المال.',
    },
    'Basic Resources': {
        en: 'Mining, quarrying and primary metals. Output is sold at world prices, usually in dollars, so revenue rises with global commodity prices and with a weaker pound, while local energy and labour costs set the floor.',
        ar: 'التعدين والمحاجر والمعادن الأولية. يُباع الإنتاج بالأسعار العالمية وغالباً بالدولار، فترتفع الإيرادات مع أسعار السلع العالمية ومع ضعف الجنيه، بينما تحدد تكاليف الطاقة والعمالة المحلية الحد الأدنى.',
    },
    'Retail Trade': {
        en: 'Supermarkets, department stores, e-commerce and specialty retailers. Same-store sales, footfall and inventory turns are the operating measures; consumer purchasing power and inflation set the backdrop.',
        ar: 'السوبر ماركت والمتاجر الكبرى والتجارة الإلكترونية ومتاجر التخصص. مبيعات الفروع القائمة وحركة الزوار ودوران المخزون هي مقاييس التشغيل، وتشكّل القوة الشرائية للمستهلك والتضخم الخلفية.',
    },
    'Energy Minerals': {
        en: 'Oil and gas producers, refiners and petroleum-product companies. Earnings follow crude and product prices and the agreements that govern local supply; the sector is a currency and commodity exposure in one.',
        ar: 'منتجو النفط والغاز والمصافي وشركات المنتجات البترولية. تتبع الأرباح أسعار الخام والمنتجات والاتفاقيات التي تحكم الإمداد المحلي، والقطاع تعرّض للعملة والسلع في آن واحد.',
    },
    'Contracting and Construction Engineering': {
        en: 'Contractors, engineering firms, real-estate developers and land-reclamation companies. Revenue is recognised as projects progress and as property is delivered, so reported earnings lag sales and cash collection can stretch over years.',
        ar: 'المقاولون وشركات الهندسة والمطورون العقاريون وشركات استصلاح الأراضي. تُثبَت الإيرادات مع تقدم المشاريع ومع تسليم العقارات، فتتأخر الأرباح المعلنة عن المبيعات وقد يمتد تحصيل النقد سنوات.',
    },
    'Paper and Packaging': {
        en: 'Paper mills, carton and flexible-packaging producers. Demand follows consumer-goods and export volumes; pulp and polymer input costs, mostly imported, drive margins.',
        ar: 'مصانع الورق ومنتجو الكرتون والتغليف المرن. يتبع الطلب أحجام السلع الاستهلاكية والصادرات، وتقود تكاليف عجائن الورق والبوليمرات، المستوردة غالباً، الهوامش.',
    },
    Miscellaneous: {
        en: 'Companies whose activities do not fit a single sector, including diversified holding companies and firms mid-way through a change of business. Each should be read on its own segment disclosures rather than as a group.',
        ar: 'شركات لا تندرج أنشطتها تحت قطاع واحد، ومنها الشركات القابضة المتنوعة والشركات في منتصف تغيير نشاطها. تُقرأ كل منها وفق إفصاحات قطاعاتها لا كمجموعة.',
    },
};

export const sectorDescription = (sectorName: string, lang: 'en' | 'ar'): string | null => {
    const d = SECTOR_DESCRIPTIONS[sectorName];
    return d ? d[lang] : null;
};
