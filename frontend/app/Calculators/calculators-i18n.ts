/**
 * Bilingual (EN/AR) label dictionaries for the Wealth Calculators page.
 * Per-URL bilingual (SSR): /Calculators = English LTR, /ar/Calculators =
 * Arabic RTL. Content is shown in one language per URL — never mixed. Every
 * user-visible string lives here so the client components stay
 * language-agnostic. Plain data only (no functions) so the whole object
 * serializes across the server→client boundary; strings with `{...}`
 * placeholders are interpolated in the client via `tpl()`.
 */

export type Lang = 'en' | 'ar';

export type CurrencyCode = 'EGP' | 'USD' | 'SAR' | 'AED';

export type CalcLabels = {
    breadcrumbs: { home: string; calculators: string };
    hero: {
        kicker: string;
        title: string;
        subtitle: string;
    };
    tabs: {
        retirement: string;
        retirementSub: string;
        investment: string;
        investmentSub: string;
    };
    common: {
        /** "e.g. {v}" placeholder prefix for example values. */
        eg: string;
        /** Year pluralization pieces consumed by calc-shared's formatYears():
         *  1 → year1, 2 → year2, 3–10 → "{n} {yearsFew}", else → "{n} {yearsMany}". */
        year1: string;
        year2: string;
        yearsFew: string;
        yearsMany: string;
        /** Axis tick "Y{n}". */
        yearTick: string;
    };
    currency: {
        label: string;
        names: Record<CurrencyCode, string>;
        /** Display symbol/prefix used before amounts (Western digits kept). */
        symbols: Record<CurrencyCode, string>;
    };
    ret: {
        stepLabels: [string, string, string, string, string];
        stepTitles: [string, string, string, string, string];
        fields: {
            currentAge: { label: string; tip: string };
            retireAge: { label: string; tip: string };
            lifeExpectancy: { label: string; tip: string };
            currentMonthlySalary: { label: string; tip: string };
            currentAnnualSalary: { label: string; note: string };
            salaryIncrease: { label: string; tip: string };
            savePercent: { label: string; tip: string };
            currentSavings: { label: string; tip: string };
            returnBefore: { label: string; tip: string };
            returnAfter: { label: string; tip: string };
            inflation: { label: string; tip: string };
            retireMonthlySalary: { label: string; suffix: string; tip: string };
            retireAnnualSalary: { label: string; note: string };
            inflAdjMonthly: { label: string; note: string };
            inflAdjAnnual: { label: string; note: string };
            otherMonthlyIncome: { label: string; tip: string };
            otherAnnualIncome: { label: string; note: string };
            otherIncomeIncrease: { label: string; tip: string };
            otherAssets: { label: string; tip: string };
        };
        nav: { next: string; back: string; calculate: string; editInputs: string; startOver: string };
        errors: {
            summaryTitle: string;
            currentAge: string;
            retireAge: string;
            retireAgeOrder: string;
            lifeExpectancy: string;
            lifeExpectancyOrder: string;
            currentSalary: string;
            retireSalary: string;
        };
        results: {
            totalNeeded: string;
            totalAvailable: string;
            shortfall: string;
            additionalMonthly: string;
            savingsRateTitle: string;
            currentLabel: string;
            goalLabel: string;
            onTrackTitle: string;
            /** {avail} {need} {surplus} */
            onTrackBody: string;
            actionTitle: string;
            /** {short} {cur} {goal} {monthly} {years} */
            actionBody: string;
            scenarioTitle: string;
            currentPlan: string;
            goalPlan: string;
            scSavingsRate: string;
            scAnnualContribution: string;
            scTotalAtRetirement: string;
            scShortfall: string;
            scFundsLast: string;
            tabChart: string;
            tabGoalTable: string;
            tabCurrentTable: string;
            chartTitle: string;
            /** {p} */
            goalTableTitle: string;
            /** {p} */
            currentTableTitle: string;
            legendGoal: string;
            legendCurrent: string;
            legendRetirement: string;
            chartNote: string;
        };
        table: {
            year: string;
            age: string;
            ret: string;
            salary: string;
            contrib: string;
            otherInc: string;
            payout: string;
            interest: string;
            balance: string;
            start: string;
        };
        chart: {
            /** {y} */
            fundsRunOut: string;
            /** {v} */
            retirementPoint: string;
            /** {v} {y} */
            peak: string;
        };
        disclaimer: {
            title: string;
            base: string;
            taxUS: string;
            /** {name} = currency display name */
            taxOther: string;
        };
    };
    inv: {
        title: string;
        subtitle: string;
        riskTitle: string;
        presets: { conservative: string; moderate: string; aggressive: string };
        /** "{r}% return · {v}% volatility" */
        presetMeta: string;
        inputs: {
            initial: string;
            monthly: string;
            years: string;
            expReturn: string;
            volatility: string;
        };
        stats: {
            finalValue: string;
            /** {p} */
            totalReturnPct: string;
            invested: string;
            /** {years} = pre-pluralized duration phrase from formatYears(). */
            investedSub: string;
            gains: string;
            gainsSub: string;
        };
        chart: {
            title: string;
            legendPortfolio: string;
            legendInvested: string;
        };
        mc: {
            title: string;
            sub: string;
            worst: string;
            expected: string;
            best: string;
        };
        disclaimer: string;
    };
};

/** Tiny `{key}` interpolator for the label templates above. */
export function tpl(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

const EN: CalcLabels = {
    breadcrumbs: { home: 'Home', calculators: 'Wealth Calculators' },
    hero: {
        kicker: 'STARTA TOOLS',
        title: 'Wealth Calculators',
        subtitle:
            'Plan your retirement and project your investment growth — free, private, and built for the Egyptian investor.',
    },
    tabs: {
        retirement: 'Retirement Planner',
        retirementSub: '5-step wizard',
        investment: 'Investment Growth',
        investmentSub: 'Compound growth simulator',
    },
    common: {
        eg: 'e.g. {v}',
        year1: '1 year',
        year2: '2 years',
        yearsFew: 'years',
        yearsMany: 'years',
        yearTick: 'Y{n}',
    },
    currency: {
        label: 'Currency',
        names: { EGP: 'Egyptian Pound', USD: 'US Dollar', SAR: 'Saudi Riyal', AED: 'UAE Dirham' },
        symbols: { EGP: 'EGP', USD: '$', SAR: 'SAR', AED: 'AED' },
    },
    ret: {
        stepLabels: ['Personal', 'Income', 'Returns', 'Needs', 'Results'],
        stepTitles: [
            'Personal Information',
            'Income & Savings',
            'Returns & Inflation',
            'Retirement Needs',
            'Results',
        ],
        fields: {
            currentAge: {
                label: 'Current Age',
                tip: 'Your age today. Used to calculate how many years you have to save.',
            },
            retireAge: {
                label: 'Retirement Age',
                tip: 'The age you plan to stop working and start withdrawing savings.',
            },
            lifeExpectancy: {
                label: 'Life Expectancy',
                tip: 'How long you expect to live. Determines how many years your savings must last.',
            },
            currentMonthlySalary: {
                label: 'Current Monthly Salary',
                tip: 'Your gross monthly salary before taxes. Annual amount shown below.',
            },
            currentAnnualSalary: { label: 'Current Annual Salary', note: '(auto-calculated from monthly)' },
            salaryIncrease: {
                label: 'Annual Salary Increase',
                tip: 'Expected yearly percentage raise in your salary until retirement.',
            },
            savePercent: {
                label: '% of Salary Saved',
                tip: 'What percentage of your salary you currently save for retirement each year.',
            },
            currentSavings: {
                label: 'Current Retirement Savings',
                tip: 'Total amount you already have saved in all retirement accounts today.',
            },
            returnBefore: {
                label: 'Return Before Retirement',
                tip: 'Expected annual return on your investments while you are still working and contributing.',
            },
            returnAfter: {
                label: 'Return After Retirement',
                tip: 'Expected annual return on your investments after you retire. Usually lower due to safer investments.',
            },
            inflation: {
                label: 'Annual Inflation',
                tip: 'Expected yearly increase in cost of living. Used to calculate future salary needs.',
            },
            retireMonthlySalary: {
                label: 'Monthly Salary Needed in Retirement',
                suffix: "(in today's money)",
                tip: "How much monthly income you think you'll need when retired, in today's purchasing power. We calculate the future inflated value below.",
            },
            retireAnnualSalary: { label: 'Annual Salary Needed', note: '(auto-calculated from monthly)' },
            inflAdjMonthly: { label: 'Inflation-Adjusted Monthly at Retirement', note: '(future value)' },
            inflAdjAnnual: { label: 'Inflation-Adjusted Annual at Retirement', note: '(future value)' },
            otherMonthlyIncome: {
                label: 'Other Monthly Retirement Income',
                tip: 'Guaranteed monthly income in retirement such as pension, social security, or rental income.',
            },
            otherAnnualIncome: { label: 'Other Annual Retirement Income', note: '(auto-calculated)' },
            otherIncomeIncrease: {
                label: 'Other Income Annual Increase',
                tip: 'How much you expect other retirement income to grow each year.',
            },
            otherAssets: {
                label: 'Other Assets at Retirement',
                tip: "Lump sum assets you'll have at retirement such as pension payout, property sale, or inheritance.",
            },
        },
        nav: {
            next: 'Next',
            back: 'Back',
            calculate: 'Calculate',
            editInputs: 'Edit Inputs',
            startOver: 'Start Over',
        },
        errors: {
            summaryTitle: 'Please fix the following before calculating:',
            currentAge: 'Please enter your Current Age.',
            retireAge: 'Please enter your Retirement Age.',
            retireAgeOrder: 'Retirement Age must be greater than Current Age.',
            lifeExpectancy: 'Please enter Life Expectancy.',
            lifeExpectancyOrder: 'Life Expectancy must be greater than Retirement Age.',
            currentSalary: 'Please enter your Current Monthly Salary.',
            retireSalary: 'Please enter Monthly Salary Needed in Retirement.',
        },
        results: {
            totalNeeded: 'Total Needed at Retirement',
            totalAvailable: 'Total Available at Retirement',
            shortfall: 'Shortfall',
            additionalMonthly: 'Additional Monthly Savings Needed',
            savingsRateTitle: 'Savings Rate: Current vs. Goal',
            currentLabel: 'Current',
            goalLabel: 'Goal',
            onTrackTitle: 'On Track!',
            onTrackBody:
                "Great news! Your current savings plan should fund your retirement. You'll have {avail} available and need {need}. Surplus: {surplus}.",
            actionTitle: 'Action Needed',
            actionBody:
                'Shortfall of {short}. Increase savings from {cur} to {goal} (add {monthly}/month). At current rate, funds last ~{years} years.',
            scenarioTitle: 'Scenario Comparison',
            currentPlan: 'Current Plan',
            goalPlan: 'Goal Plan',
            scSavingsRate: 'Savings Rate',
            scAnnualContribution: 'Annual Contribution',
            scTotalAtRetirement: 'Total at Retirement',
            scShortfall: 'Shortfall',
            scFundsLast: 'Funds Last',
            tabChart: 'Comparison Chart',
            tabGoalTable: 'Goal Table',
            tabCurrentTable: 'Current Table',
            chartTitle: 'Current vs. Goal — Balance Over Time',
            goalTableTitle: 'Goal Scenario — Saving {p} of Salary',
            currentTableTitle: 'Current Scenario — Saving {p} of Salary',
            legendGoal: 'Goal Scenario (line, funded through life expectancy)',
            legendCurrent: 'Current Scenario (bars, stop when funds run out)',
            legendRetirement: 'Retirement Year',
            chartNote:
                'If the Goal line rises well above its "Retirement" marker before coming back down, that\'s because your after-retirement return is lower than inflation: withdrawals start out smaller than the portfolio\'s growth, so the balance keeps climbing for a while before inflation-linked withdrawals catch up and bring it to zero by life expectancy, as designed.',
        },
        table: {
            year: 'Year',
            age: 'Age',
            ret: 'Return',
            salary: 'Salary',
            contrib: 'Contrib',
            otherInc: 'Other Inc',
            payout: 'Payout',
            interest: 'Interest',
            balance: 'Balance',
            start: 'Start',
        },
        chart: {
            fundsRunOut: 'Funds run out (Y{y})',
            retirementPoint: 'Retirement: {v}',
            peak: 'Peak: {v} (Y{y})',
        },
        disclaimer: {
            title: 'Important Disclaimer',
            base: 'Results are only rough estimates, largely because of uncertainty in the rates of return, inflation, future salary, willpower to continue saving, unexpected life events, and other assumptions. By default, interest is compounded annually and the payout is withdrawn at the beginning of the period. This calculator and its contents should not be construed as professional financial advice. It may not be suitable for your specific situation.',
            taxUS: "This calculator does not model taxes or contribution limits. If you're using it for US retirement accounts, keep in mind that IRS contribution limits, the pre-tax (Traditional) versus post-tax (Roth) distinction, and required minimum distributions are United States-specific rules not reflected here — check with a US tax or financial advisor for guidance on your specific accounts.",
            taxOther:
                'This calculator does not model taxes, social security, pensions, zakat, or other country-specific obligations. Retirement account rules and tax treatment for {name} — and for every currency/jurisdiction, since these rules vary widely from country to country — are not modeled here. IRS rules (Traditional/Roth accounts, contribution limits, required distributions) are specific to the United States and do not apply. Consult a local tax or financial advisor for the rules that apply where you live.',
        },
    },
    inv: {
        title: 'Investment Growth',
        subtitle:
            'Project the compound growth of a monthly investment plan, with a Monte Carlo best/expected/worst range.',
        riskTitle: 'Risk Profile',
        presets: { conservative: 'Conservative', moderate: 'Moderate', aggressive: 'Aggressive' },
        presetMeta: '{r}% return · {v}% volatility',
        inputs: {
            initial: 'Initial Investment',
            monthly: 'Monthly Contribution',
            years: 'Investment Horizon',
            expReturn: 'Expected Annual Return',
            volatility: 'Volatility',
        },
        stats: {
            finalValue: 'Final Value',
            totalReturnPct: '+{p}% total return',
            invested: 'Total Invested',
            investedSub: 'Over {years}',
            gains: 'Gains',
            gainsSub: 'Profit from compound growth',
        },
        chart: {
            title: 'Growth vs. Amount Invested',
            legendPortfolio: 'Portfolio Value',
            legendInvested: 'Amount Invested',
        },
        mc: {
            title: 'Range of Outcomes',
            sub: '400 Monte Carlo simulations at your chosen volatility',
            worst: 'Worst Case (10th percentile)',
            expected: 'Expected (median)',
            best: 'Best Case (90th percentile)',
        },
        disclaimer:
            'Projections assume a constant expected annual return and are for illustration only — not investment advice. Actual market returns vary from year to year. Monthly contributions are credited at each year-end without intra-year compounding.',
    },
};

const AR: CalcLabels = {
    breadcrumbs: { home: 'الرئيسية', calculators: 'حاسبات الثروة' },
    hero: {
        kicker: 'أدوات ستارتا',
        title: 'حاسبات الثروة',
        subtitle: 'خطّط لتقاعدك وتوقّع نمو استثماراتك — أدوات مجانية وخاصة صُممت للمستثمر المصري.',
    },
    tabs: {
        retirement: 'مخطّط التقاعد',
        retirementSub: 'معالج من 5 خطوات',
        investment: 'نمو الاستثمار',
        investmentSub: 'محاكي النمو التراكمي',
    },
    common: {
        eg: 'مثال: {v}',
        year1: 'سنة واحدة',
        year2: 'سنتان',
        yearsFew: 'سنوات',
        yearsMany: 'سنة',
        yearTick: 'س{n}',
    },
    currency: {
        label: 'العملة',
        names: { EGP: 'الجنيه المصري', USD: 'الدولار الأمريكي', SAR: 'الريال السعودي', AED: 'الدرهم الإماراتي' },
        symbols: { EGP: 'ج.م', USD: '$', SAR: 'ر.س', AED: 'د.إ' },
    },
    ret: {
        stepLabels: ['شخصي', 'الدخل', 'العوائد', 'الاحتياجات', 'النتائج'],
        stepTitles: [
            'البيانات الشخصية',
            'الدخل والادخار',
            'العوائد والتضخم',
            'احتياجات التقاعد',
            'النتائج',
        ],
        fields: {
            currentAge: {
                label: 'العمر الحالي',
                tip: 'عمرك اليوم. يُستخدم لحساب عدد سنوات الادخار المتبقية أمامك.',
            },
            retireAge: {
                label: 'سن التقاعد',
                tip: 'السن الذي تخطط فيه للتوقف عن العمل وبدء السحب من مدخراتك.',
            },
            lifeExpectancy: {
                label: 'العمر المتوقع',
                tip: 'العمر الذي تتوقع أن تعيشه. يحدد عدد السنوات التي يجب أن تكفيك فيها مدخراتك.',
            },
            currentMonthlySalary: {
                label: 'الراتب الشهري الحالي',
                tip: 'راتبك الشهري الإجمالي قبل الضرائب. يظهر المبلغ السنوي أدناه.',
            },
            currentAnnualSalary: { label: 'الراتب السنوي الحالي', note: '(يُحسب تلقائيًا من الشهري)' },
            salaryIncrease: {
                label: 'الزيادة السنوية في الراتب',
                tip: 'نسبة الزيادة السنوية المتوقعة في راتبك حتى التقاعد.',
            },
            savePercent: {
                label: 'نسبة الادخار من الراتب',
                tip: 'النسبة التي تدخرها حاليًا من راتبك للتقاعد كل عام.',
            },
            currentSavings: {
                label: 'مدخرات التقاعد الحالية',
                tip: 'إجمالي ما ادخرته بالفعل حتى اليوم في جميع حسابات التقاعد.',
            },
            returnBefore: {
                label: 'العائد السنوي قبل التقاعد',
                tip: 'العائد السنوي المتوقع على استثماراتك أثناء سنوات العمل والادخار.',
            },
            returnAfter: {
                label: 'العائد السنوي بعد التقاعد',
                tip: 'العائد السنوي المتوقع على استثماراتك بعد التقاعد، وعادةً يكون أقل لاعتماد استثمارات أكثر أمانًا.',
            },
            inflation: {
                label: 'التضخم السنوي',
                tip: 'الزيادة السنوية المتوقعة في تكلفة المعيشة. تُستخدم لحساب احتياجاتك المستقبلية.',
            },
            retireMonthlySalary: {
                label: 'الراتب الشهري المطلوب عند التقاعد',
                suffix: '(بقيمة اليوم)',
                tip: 'الدخل الشهري الذي تعتقد أنك ستحتاجه بعد التقاعد بالقوة الشرائية الحالية. نحسب القيمة المستقبلية المعدّلة بالتضخم أدناه.',
            },
            retireAnnualSalary: { label: 'الراتب السنوي المطلوب', note: '(يُحسب تلقائيًا من الشهري)' },
            inflAdjMonthly: { label: 'الشهري المعدَّل بالتضخم عند التقاعد', note: '(قيمة مستقبلية)' },
            inflAdjAnnual: { label: 'السنوي المعدَّل بالتضخم عند التقاعد', note: '(قيمة مستقبلية)' },
            otherMonthlyIncome: {
                label: 'دخل شهري آخر عند التقاعد',
                tip: 'دخل شهري مضمون بعد التقاعد مثل المعاش أو التأمينات الاجتماعية أو دخل الإيجار.',
            },
            otherAnnualIncome: { label: 'الدخل السنوي الآخر عند التقاعد', note: '(يُحسب تلقائيًا)' },
            otherIncomeIncrease: {
                label: 'الزيادة السنوية للدخل الآخر',
                tip: 'النسبة التي تتوقع أن ينمو بها دخلك الآخر كل عام.',
            },
            otherAssets: {
                label: 'أصول أخرى عند التقاعد',
                tip: 'أصول تحصل عليها دفعة واحدة عند التقاعد مثل مكافأة نهاية الخدمة أو بيع عقار أو ميراث.',
            },
        },
        nav: {
            next: 'التالي',
            back: 'رجوع',
            calculate: 'احسب النتائج',
            editInputs: 'تعديل المدخلات',
            startOver: 'البدء من جديد',
        },
        errors: {
            summaryTitle: 'يرجى تصحيح ما يلي قبل الحساب:',
            currentAge: 'يرجى إدخال عمرك الحالي.',
            retireAge: 'يرجى إدخال سن التقاعد.',
            retireAgeOrder: 'يجب أن يكون سن التقاعد أكبر من العمر الحالي.',
            lifeExpectancy: 'يرجى إدخال العمر المتوقع.',
            lifeExpectancyOrder: 'يجب أن يكون العمر المتوقع أكبر من سن التقاعد.',
            currentSalary: 'يرجى إدخال راتبك الشهري الحالي.',
            retireSalary: 'يرجى إدخال الراتب الشهري المطلوب عند التقاعد.',
        },
        results: {
            totalNeeded: 'إجمالي المطلوب عند التقاعد',
            totalAvailable: 'إجمالي المتاح عند التقاعد',
            shortfall: 'العجز',
            additionalMonthly: 'الادخار الشهري الإضافي المطلوب',
            savingsRateTitle: 'معدل الادخار: الحالي مقابل المستهدف',
            currentLabel: 'الحالي',
            goalLabel: 'المستهدف',
            onTrackTitle: 'أنت على المسار الصحيح!',
            onTrackBody:
                'أخبار رائعة! خطتك الحالية للادخار كفيلة بتمويل تقاعدك. سيتوفر لديك {avail} بينما تحتاج {need}. الفائض: {surplus}.',
            actionTitle: 'مطلوب إجراء',
            actionBody:
                'لديك عجز قدره {short}. ارفع معدل الادخار من {cur} إلى {goal} (أضف {monthly} شهريًا). بالمعدل الحالي ستكفي أموالك نحو {years} سنة.',
            scenarioTitle: 'مقارنة السيناريوهات',
            currentPlan: 'الخطة الحالية',
            goalPlan: 'الخطة المستهدفة',
            scSavingsRate: 'معدل الادخار',
            scAnnualContribution: 'المساهمة السنوية',
            scTotalAtRetirement: 'الإجمالي عند التقاعد',
            scShortfall: 'العجز',
            scFundsLast: 'مدة كفاية الأموال',
            tabChart: 'رسم المقارنة',
            tabGoalTable: 'جدول الخطة المستهدفة',
            tabCurrentTable: 'جدول الخطة الحالية',
            chartTitle: 'الحالي مقابل المستهدف — الرصيد عبر الزمن',
            goalTableTitle: 'السيناريو المستهدف — ادخار {p} من الراتب',
            currentTableTitle: 'السيناريو الحالي — ادخار {p} من الراتب',
            legendGoal: 'السيناريو المستهدف (خط، مموَّل حتى العمر المتوقع)',
            legendCurrent: 'السيناريو الحالي (أعمدة، تتوقف عند نفاد الأموال)',
            legendRetirement: 'سنة التقاعد',
            chartNote:
                'إذا ارتفع خط السيناريو المستهدف كثيرًا فوق نقطة «التقاعد» قبل أن يعود للانخفاض، فسبب ذلك أن عائدك بعد التقاعد أقل من التضخم: تبدأ السحوبات أصغر من نمو المحفظة فيواصل الرصيد الصعود لفترة، قبل أن تلحق به السحوبات المرتبطة بالتضخم وتوصله إلى الصفر عند العمر المتوقع، كما هو مُصمَّم.',
        },
        table: {
            year: 'السنة',
            age: 'العمر',
            ret: 'العائد',
            salary: 'الراتب',
            contrib: 'المساهمة',
            otherInc: 'دخل آخر',
            payout: 'السحب',
            interest: 'الفائدة',
            balance: 'الرصيد',
            start: 'البداية',
        },
        chart: {
            fundsRunOut: 'نفاد الأموال (س{y})',
            retirementPoint: 'التقاعد: {v}',
            peak: 'الذروة: {v} (س{y})',
        },
        disclaimer: {
            title: 'تنبيه مهم',
            base: 'النتائج تقديرات تقريبية فقط، ويرجع ذلك أساسًا إلى عدم اليقين بشأن معدلات العائد والتضخم والراتب المستقبلي والاستمرارية في الادخار وأحداث الحياة غير المتوقعة وغيرها من الافتراضات. افتراضيًا، يُحسب العائد مركّبًا سنويًا ويُسحب المبلغ في بداية كل فترة. لا يجوز اعتبار هذه الحاسبة أو محتواها نصيحة مالية مهنية، وقد لا تناسب وضعك الخاص.',
            taxUS: 'لا تُحاكي هذه الحاسبة الضرائب أو حدود المساهمات. إذا كنت تستخدمها لحسابات التقاعد الأمريكية، فتذكّر أن حدود مساهمات مصلحة الضرائب الأمريكية (IRS)، والتمييز بين الحسابات قبل الضريبة (Traditional) وبعدها (Roth)، والتوزيعات الدنيا الإلزامية، قواعد خاصة بالولايات المتحدة غير ممثَّلة هنا — راجع مستشارًا ضريبيًا أو ماليًا أمريكيًا بشأن حساباتك.',
            taxOther:
                'لا تُحاكي هذه الحاسبة الضرائب أو التأمينات الاجتماعية أو المعاشات أو الزكاة أو غيرها من الالتزامات الخاصة بكل دولة. قواعد حسابات التقاعد والمعاملة الضريبية الخاصة بـ{name} — ولكل عملة ودولة، لأن هذه القواعد تختلف كثيرًا من بلد لآخر — غير ممثَّلة هنا. قواعد مصلحة الضرائب الأمريكية (حسابات Traditional/Roth وحدود المساهمات والتوزيعات الإلزامية) خاصة بالولايات المتحدة ولا تنطبق. استشر مستشارًا ضريبيًا أو ماليًا محليًا لمعرفة القواعد المطبقة في بلدك.',
        },
    },
    inv: {
        title: 'نمو الاستثمار',
        subtitle: 'توقّع النمو التراكمي لخطة استثمار شهرية، مع نطاق أفضل/متوقع/أسوأ عبر محاكاة مونت كارلو.',
        riskTitle: 'ملف المخاطر',
        presets: { conservative: 'متحفظ', moderate: 'متوازن', aggressive: 'جريء' },
        presetMeta: 'عائد {r}% · تقلب {v}%',
        inputs: {
            initial: 'مبلغ الاستثمار المبدئي',
            monthly: 'المساهمة الشهرية',
            years: 'مدة الاستثمار',
            expReturn: 'العائد السنوي المتوقع',
            volatility: 'التقلب السنوي',
        },
        stats: {
            finalValue: 'القيمة النهائية',
            totalReturnPct: '+{p}% عائد إجمالي',
            invested: 'إجمالي المستثمر',
            investedSub: 'على مدى {years}',
            gains: 'الأرباح',
            gainsSub: 'أرباح النمو التراكمي',
        },
        chart: {
            title: 'النمو مقابل المبلغ المستثمر',
            legendPortfolio: 'قيمة المحفظة',
            legendInvested: 'المبلغ المستثمر',
        },
        mc: {
            title: 'نطاق النتائج المحتملة',
            sub: '400 محاكاة مونت كارلو عند مستوى التقلب المختار',
            worst: 'أسوأ الحالات (المئين 10)',
            expected: 'المتوقع (الوسيط)',
            best: 'أفضل الحالات (المئين 90)',
        },
        disclaimer:
            'التوقعات تفترض عائدًا سنويًا متوقعًا ثابتًا وهي للتوضيح فقط — وليست نصيحة استثمارية. عوائد الأسواق الفعلية تتغير من عام لآخر. تُضاف المساهمات الشهرية في نهاية كل سنة دون تركيب خلال السنة.',
    },
};

export function calcLabels(lang: Lang): CalcLabels {
    return lang === 'ar' ? AR : EN;
}
