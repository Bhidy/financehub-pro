/**
 * portfolio-detail.js — Portfolio dashboard logic.
 * Renders KPI strip, performance chart, holdings table,
 * allocation charts, AI insights, risk panel, transactions.
 */
(function () {
    'use strict';

    /* ─── State ───────────────────────────────────────────────────────── */
    var lang     = localStorage.getItem('starta-lang') || localStorage.getItem('lang') || 'en';
    var pfId     = location.pathname.split('/').filter(Boolean)[1] || 'demo';

    /* ─── Nav translations ────────────────────────────────────────────── */
    var NAV = {
        en: { nav_home: 'HOME', nav_funds: 'MUTUAL FUNDS', nav_pulse: 'MARKET PULSE',
              nav_news: 'MARKET NEWS', nav_learn: 'LEARN', nav_portfolio: 'PORTFOLIO', nav_about: 'ABOUT US' },
        ar: { nav_home: 'الرئيسية', nav_funds: 'الصناديق الاستثمارية', nav_pulse: 'نبض السوق',
              nav_news: 'أخبار السوق', nav_learn: 'تعلّم', nav_portfolio: 'المحفظة', nav_about: 'معلومات عنا' }
    };
    function applyNavLang(l) {
        var map = NAV[l] || NAV.en;
        document.querySelectorAll('[data-key]').forEach(function(el) {
            if (map[el.dataset.key]) el.textContent = map[el.dataset.key];
        });
    }
    var portfolio, metrics;
    var perfChart = null, allocChart = null;
    var chartPeriod = '3M', chartMode = 'value', showBenchmark = true;
    var holdingsTab = 'overview';
    var contribTab  = 'gainers';

    /* ─── Translations ────────────────────────────────────────────────── */
    var T = {
        en: {
            totalValue: 'Total Portfolio Value', todayPL: "Today's P/L",
            totalGain: 'Total Gain', totalReturn: 'Total Return',
            cashBal: 'Cash Balance', invested: 'Invested Amount',
            dividends: 'Dividends (YTD)', vsEgx: 'vs EGX30 (YTD)',
            outperform: 'Outperforming', underperform: 'Underperforming',
            perfTitle: 'Portfolio Performance', bestDay: 'Best Day',
            worstDay: 'Worst Day', maxDD: 'Max Drawdown', recovery: 'Recovery',
            winRate: 'Win Rate', positiveDays: 'Positive Days',
            assetAlloc: 'Asset Allocation', sectorAlloc: 'Sector Allocation',
            aiInsights: 'AI Insights', beta: 'Beta',
            holdings: 'Holdings', overview: 'Overview', performance: 'Performance',
            allocation: 'Allocation', dividendTab: 'Dividends',
            symbol: 'Symbol', company: 'Company', qty: 'Qty',
            avgCost: 'Avg Cost', lastPrice: 'Last Price', mktValue: 'Market Value',
            weight: 'Weight', dayChange: 'Day Change', totalPL: 'Total P/L',
            totalRet: 'Total Return %', action: 'Action',
            topContrib: 'Top Contributors', gainers: 'Gainers', losers: 'Losers',
            riskMetrics: 'Risk Metrics', volatility: 'Volatility (Ann.)',
            sharpe: 'Sharpe Ratio', sortino: 'Sortino Ratio',
            maxDrawdown: 'Max Drawdown', recentTx: 'Recent Transactions',
            divIncome: 'Dividend Income', ytdDivs: 'YTD Dividends',
            addTx: 'Add Transaction', viewAll: 'View all',
            buy: 'Buy', sell: 'Sell', deposit: 'Deposit', withdraw: 'Withdrawal',
            dividend: 'Dividend', fee: 'Fee',
            txDate: 'Date', txSymbol: 'Symbol', txQty: 'Quantity', txPrice: 'Price',
            txComm: 'Commission', txTax: 'Tax', txNotes: 'Notes',
            txAmount: 'Amount', cancel: 'Cancel', submit: 'Add',
            noPortfolio: 'Portfolio not found.', back: '← Back to Portfolios',
            outperformBy: 'Outperforming EGX30 by',
            insightPortfolio: 'Portfolio Performance',
            insightConc: 'Concentration Risk',
            insightDiv: 'Dividend Income',
            insightBenchmark: 'Benchmark Comparison',
        },
        ar: {
            totalValue: 'إجمالي قيمة المحفظة', todayPL: 'أرباح/خسائر اليوم',
            totalGain: 'إجمالي الربح', totalReturn: 'إجمالي العائد',
            cashBal: 'الرصيد النقدي', invested: 'المبلغ المستثمر',
            dividends: 'التوزيعات (هذا العام)', vsEgx: 'مقابل EGX30 (هذا العام)',
            outperform: 'متفوق', underperform: 'أدنى من المؤشر',
            perfTitle: 'أداء المحفظة', bestDay: 'أفضل يوم',
            worstDay: 'أسوأ يوم', maxDD: 'أقصى تراجع', recovery: 'وقت التعافي',
            winRate: 'معدل الربح', positiveDays: 'الأيام الإيجابية',
            assetAlloc: 'توزيع الأصول', sectorAlloc: 'توزيع القطاعات',
            aiInsights: 'تحليلات الذكاء الاصطناعي', beta: 'بيتا',
            holdings: 'المحفظة', overview: 'نظرة عامة', performance: 'الأداء',
            allocation: 'التخصيص', dividendTab: 'التوزيعات',
            symbol: 'الرمز', company: 'الشركة', qty: 'الكمية',
            avgCost: 'متوسط التكلفة', lastPrice: 'آخر سعر', mktValue: 'القيمة السوقية',
            weight: 'الوزن', dayChange: 'تغيير اليوم', totalPL: 'إجمالي الربح/الخسارة',
            totalRet: 'إجمالي العائد %', action: 'إجراء',
            topContrib: 'أبرز المساهمين', gainers: 'الرابحون', losers: 'الخاسرون',
            riskMetrics: 'مقاييس المخاطر', volatility: 'التقلب (سنوي)',
            sharpe: 'نسبة شارب', sortino: 'نسبة سورتينو',
            maxDrawdown: 'أقصى تراجع', recentTx: 'آخر المعاملات',
            divIncome: 'دخل التوزيعات', ytdDivs: 'التوزيعات (هذا العام)',
            addTx: 'إضافة معاملة', viewAll: 'عرض الكل',
            buy: 'شراء', sell: 'بيع', deposit: 'إيداع', withdraw: 'سحب',
            dividend: 'توزيع', fee: 'رسوم',
            txDate: 'التاريخ', txSymbol: 'الرمز', txQty: 'الكمية', txPrice: 'السعر',
            txComm: 'العمولة', txTax: 'الضريبة', txNotes: 'ملاحظات',
            txAmount: 'المبلغ', cancel: 'إلغاء', submit: 'إضافة',
            noPortfolio: 'المحفظة غير موجودة.', back: '→ العودة للمحافظ',
            outperformBy: 'يتفوق على EGX30 بنسبة',
            insightPortfolio: 'أداء المحفظة',
            insightConc: 'مخاطر التركيز',
            insightDiv: 'دخل التوزيعات',
            insightBenchmark: 'مقارنة المؤشر',
        }
    };
    function t(key) { return (T[lang] || T.en)[key] || key; }
    function fmt(n, d) { return PFStore.fmt(n, d === undefined ? 2 : d); }
    function pct(n, forceSign) {
        var sign = (forceSign !== false && n >= 0) ? '+' : '';
        return sign + fmt(n, 2) + '%';
    }
    function money(n) { return fmt(Math.abs(n), 2); }
    function escHtml(s) { return String(s).replace(/[&<>"']/g, function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

    /* ─── Load portfolio ──────────────────────────────────────────────── */
    function load() {
        portfolio = PFStore.get(pfId);
        if (!portfolio) { renderNotFound(); return; }
        document.title = portfolio.name + ' | Starta Markets';
        metrics = PFStore.computeMetrics(portfolio);
        renderHeader();
        renderBody();
    }

    function renderNotFound() {
        document.getElementById('pfDashBody').innerHTML =
            '<div class="pf-empty"><p>' + t('noPortfolio') + '</p>' +
            '<a href="/Portfolio" class="pf-btn pf-btn--primary" style="margin-top:1rem;">' + t('back') + '</a></div>';
    }

    /* ─── Header / KPI strip ──────────────────────────────────────────── */
    function renderHeader() {
        var todayClass  = metrics.todayGain  >= 0 ? 'pf-pos' : 'pf-neg';
        var gainClass   = metrics.totalGain  >= 0 ? 'pf-pos' : 'pf-neg';
        var retClass    = metrics.totalReturn >= 0 ? 'pf-pos' : 'pf-neg';
        var egxDiff     = 6.12; // demo outperformance
        var egxClass    = egxDiff >= 0 ? 'pf-pos' : 'pf-neg';
        var egxLabel    = egxDiff >= 0 ? t('outperform') : t('underperform');

        var kpis = [
            kpi(t('totalValue'),  portfolio.currency + ' ' + fmt(metrics.totalValue), null),
            kpi(t('todayPL'),     (metrics.todayGain >= 0 ? '+' : '') + fmt(metrics.todayGain), pct(metrics.todayPct), todayClass),
            kpi(t('totalGain'),   (metrics.totalGain >= 0 ? '+' : '') + fmt(metrics.totalGain), null, gainClass),
            kpi(t('totalReturn'), pct(metrics.totalReturn), null, retClass),
            kpi(t('cashBal'),     portfolio.currency + ' ' + fmt(metrics.cashBalance), null),
            kpi(t('invested'),    portfolio.currency + ' ' + fmt(metrics.invested), null),
            kpi(t('dividends'),   portfolio.currency + ' ' + fmt(metrics.dividendsYTD), null),
            kpi(t('vsEgx'),       (egxDiff >= 0 ? '+' : '') + fmt(egxDiff, 2) + '%', egxLabel, egxClass),
        ];

        document.getElementById('pfDashHeader').innerHTML =
            '<div class="pf-dash-header-inner">' +
                '<div class="pf-selector-wrap">' +
                    '<select class="pf-selector" id="pfSelector">' +
                    PFStore.getAll().map(function(p){
                        var displayName = (lang === 'ar' && p.nameAr) ? p.nameAr : p.name;
                        return '<option value="' + p.id + '"' + (p.id === pfId ? ' selected' : '') + '>' + escHtml(displayName) + '</option>';
                    }).join('') +
                    '</select>' +
                    (portfolio.isDefault ? '<span class="pf-badge-neu" style="font-size:.68rem;">' + (lang==='ar'?'الافتراضية':'Default') + '</span>' : '') +
                '</div>' +
                '<div class="pf-kpi-strip">' + kpis.join('') + '</div>' +
                '<button class="pf-btn pf-btn--primary pf-btn--sm" id="addTxBtn" style="flex-shrink:0;">+ ' + t('addTx') + '</button>' +
            '</div>';

        document.getElementById('pfSelector').addEventListener('change', function() {
            window.location.href = '/Portfolio/' + this.value;
        });
        document.getElementById('addTxBtn').addEventListener('click', openAddTxModal);
    }

    function kpi(label, value, sub, cls) {
        return '<div class="pf-kpi">' +
            '<div class="pf-kpi__label">' + label + '</div>' +
            '<div class="pf-kpi__value pf-num' + (cls ? ' ' + cls : '') + '">' + escHtml(String(value)) + '</div>' +
            (sub ? '<div class="pf-kpi__sub' + (cls ? ' ' + cls : '') + '">' + escHtml(String(sub)) + '</div>' : '') +
        '</div>';
    }

    /* ─── Body layout ─────────────────────────────────────────────────── */
    function renderBody() {
        document.getElementById('pfDashBody').innerHTML =
            '<!-- Chart + Right panel -->' +
            '<div class="pf-main-grid">' +
                '<div class="pf-card pf-chart-card" id="chartCard"></div>' +
                '<div class="pf-right" id="pfRight"></div>' +
            '</div>' +
            '<!-- AI Insights full-width -->' +
            '<div id="pfInsightsFull"></div>' +
            '<!-- Holdings -->' +
            '<div class="pf-holdings-section" id="holdingsSection"></div>' +
            '<!-- Bottom row -->' +
            '<div class="pf-bottom-grid" id="bottomGrid"></div>';

        renderChartCard();
        renderRightPanel();
        renderAIInsightsFull();
        renderHoldings(holdingsTab);
        renderBottomGrid();
    }

    /* ─── Performance chart ───────────────────────────────────────────── */
    var PERIODS = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '6M': 180, 'YTD': 150, '1Y': 365, 'All': 400 };

    function renderChartCard() {
        var el = document.getElementById('chartCard');
        var todaySign = metrics.todayGain >= 0 ? '+' : '';
        var periodBtns = Object.keys(PERIODS).map(function(p){
            return '<button class="pf-period-btn' + (p === chartPeriod ? ' active' : '') + '" data-period="' + p + '">' + p + '</button>';
        }).join('');
        var modeBtns = ['value','return','drawdown'].map(function(m){
            var label = m === 'value' ? 'Value' : m === 'return' ? 'Return' : 'Drawdown';
            return '<button class="pf-mode-btn' + (m === chartMode ? ' active' : '') + '" data-mode="' + m + '">' + label + '</button>';
        }).join('');

        el.innerHTML =
            '<div class="pf-chart-top">' +
                '<div class="pf-chart-headline">' +
                    '<h2>' + t('perfTitle') + '</h2>' +
                    '<span class="pf-num">' + portfolio.currency + ' ' + fmt(metrics.totalValue) + '</span>' +
                '</div>' +
                '<div class="pf-chart-controls">' +
                    '<div class="pf-period-strip">' + periodBtns + '</div>' +
                    '<div class="pf-mode-strip">' + modeBtns + '</div>' +
                    '<div class="pf-benchmark-toggle' + (showBenchmark ? ' active' : '') + '" id="benchToggle">' +
                        '<div class="dot"></div>' + portfolio.benchmark +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="pf-chart-wrap"><canvas id="perfChart"></canvas></div>' +
            '<div class="pf-chart-stats">' +
                stat(t('bestDay'),    '+2.89%', 'pf-pos') +
                stat(t('worstDay'),   '-1.34%', 'pf-neg') +
                stat(t('maxDD'),      '-4.23%', 'pf-neg') +
                stat(t('recovery'),   '18 ' + (lang==='ar'?'يوم':'days'), '') +
                stat(t('winRate'),    '64.3%', '') +
                stat(t('positiveDays'), '43 / 67', '') +
            '</div>';

        // Wire period buttons
        el.querySelectorAll('.pf-period-btn').forEach(function(btn){
            btn.addEventListener('click', function(){
                el.querySelectorAll('.pf-period-btn').forEach(function(b){ b.classList.remove('active'); });
                btn.classList.add('active');
                chartPeriod = btn.dataset.period;
                updateChart();
            });
        });
        el.querySelectorAll('.pf-mode-btn').forEach(function(btn){
            btn.addEventListener('click', function(){
                el.querySelectorAll('.pf-mode-btn').forEach(function(b){ b.classList.remove('active'); });
                btn.classList.add('active');
                chartMode = btn.dataset.mode;
                updateChart();
            });
        });
        document.getElementById('benchToggle').addEventListener('click', function(){
            showBenchmark = !showBenchmark;
            this.classList.toggle('active', showBenchmark);
            if (perfChart) {
                perfChart.data.datasets[1].hidden = !showBenchmark;
                perfChart.update('none');
            }
        });

        initChart();
    }

    function stat(label, val, cls) {
        return '<div class="pf-stat"><div class="pf-stat__label">' + label + '</div>' +
            '<div class="pf-stat__value' + (cls ? ' ' + cls : '') + '">' + val + '</div></div>';
    }

    function initChart() {
        var isDark = document.documentElement.dataset.theme !== 'light';
        var gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        var tickColor = isDark ? '#9ca6b5' : '#5b6677';
        var data = PFStore.generateChartData(PERIODS[chartPeriod] || 90);

        var ctx = document.getElementById('perfChart').getContext('2d');

        // Gradient fill
        var grad = ctx.createLinearGradient(0, 0, 0, 240);
        grad.addColorStop(0,   'rgba(20,184,166,0.28)');
        grad.addColorStop(0.7, 'rgba(20,184,166,0.04)');
        grad.addColorStop(1,   'rgba(20,184,166,0.00)');

        if (perfChart) perfChart.destroy();
        perfChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: portfolio.name,
                        data: chartMode === 'value'    ? data.portfolio :
                              chartMode === 'return'   ? toReturn(data.portfolio) :
                                                         toDrawdown(data.portfolio),
                        borderColor: '#14b8a6',
                        backgroundColor: chartMode === 'value' ? grad : 'rgba(20,184,166,0.08)',
                        borderWidth: 2,
                        fill: chartMode !== 'drawdown',
                        tension: 0.35, pointRadius: 0, pointHoverRadius: 5,
                        pointHoverBackgroundColor: '#14b8a6',
                    },
                    {
                        label: portfolio.benchmark,
                        data: chartMode === 'value'  ? data.benchmark :
                              chartMode === 'return' ? toReturn(data.benchmark) :
                                                       toDrawdown(data.benchmark),
                        borderColor: '#64748b',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [5, 4],
                        fill: false,
                        tension: 0.35, pointRadius: 0, pointHoverRadius: 4,
                        hidden: !showBenchmark,
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                animation: { duration: 400 },
                scales: {
                    x: {
                        grid: { color: gridColor, drawBorder: false },
                        ticks: { font: { family: 'IBM Plex Mono', size: 10 }, color: tickColor, maxTicksLimit: 8, maxRotation: 0 }
                    },
                    y: {
                        position: 'right',
                        grid: { color: gridColor, drawBorder: false },
                        ticks: {
                            font: { family: 'IBM Plex Mono', size: 10 }, color: tickColor,
                            callback: function(v) {
                                if (chartMode === 'return' || chartMode === 'drawdown') return v.toFixed(1) + '%';
                                return v >= 1e6 ? (v/1e6).toFixed(2) + 'M' : v >= 1e3 ? (v/1e3).toFixed(0) + 'K' : v;
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#0b0c0d' : '#ffffff',
                        borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
                        borderWidth: 1,
                        titleFont: { family: 'Manrope', size: 12, weight: '700' },
                        bodyFont:  { family: 'IBM Plex Mono', size: 12 },
                        titleColor: isDark ? '#eef2f6' : '#0f172a',
                        bodyColor:  isDark ? '#9ca6b5' : '#5b6677',
                        padding: 12,
                        callbacks: {
                            label: function(ctx) {
                                var v = ctx.raw;
                                if (chartMode === 'return' || chartMode === 'drawdown') return ' ' + ctx.dataset.label + ': ' + (v>=0?'+':'') + v.toFixed(2) + '%';
                                return ' ' + ctx.dataset.label + ': ' + portfolio.currency + ' ' + v.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    function updateChart() {
        if (!perfChart) return;
        var data = PFStore.generateChartData(PERIODS[chartPeriod] || 90);
        perfChart.data.labels = data.labels;
        perfChart.data.datasets[0].data = chartMode === 'value' ? data.portfolio : chartMode === 'return' ? toReturn(data.portfolio) : toDrawdown(data.portfolio);
        perfChart.data.datasets[1].data = chartMode === 'value' ? data.benchmark : chartMode === 'return' ? toReturn(data.benchmark) : toDrawdown(data.benchmark);
        var isFill = chartMode === 'value';
        var ctx = document.getElementById('perfChart').getContext('2d');
        if (isFill) {
            var g = ctx.createLinearGradient(0,0,0,240);
            g.addColorStop(0, 'rgba(20,184,166,0.28)'); g.addColorStop(1, 'rgba(20,184,166,0.00)');
            perfChart.data.datasets[0].backgroundColor = g;
        } else {
            perfChart.data.datasets[0].backgroundColor = 'rgba(20,184,166,0.08)';
        }
        perfChart.data.datasets[0].fill = isFill;
        perfChart.update('active');
    }

    function toReturn(arr) {
        if (!arr.length) return [];
        var base = arr[0];
        return arr.map(function(v){ return base > 0 ? ((v - base) / base) * 100 : 0; });
    }

    function toDrawdown(arr) {
        var peak = arr[0], result = [];
        arr.forEach(function(v){
            if (v > peak) peak = v;
            result.push(peak > 0 ? ((v - peak) / peak) * 100 : 0);
        });
        return result;
    }

    /* ─── Right panel ─────────────────────────────────────────────────── */
    function renderRightPanel() {
        var right = document.getElementById('pfRight');
        right.innerHTML =
            '<div class="pf-card pf-panel" id="allocPanel">' + renderAllocPanel() + '</div>' +
            '<div class="pf-card pf-panel" id="sectorPanel">' + renderSectorPanel() + '</div>';

        initAllocChart();
    }

    function renderAllocPanel() {
        var items = metrics.holdings.slice(0, 5);
        var others = 100 - items.reduce(function(s, h){ return s + h.weight; }, 0);
        var legend = items.map(function(h){
            return '<div class="pf-legend-row">' +
                '<div class="pf-legend-dot" style="background:' + h.color + '"></div>' +
                '<span class="pf-legend-name">' + h.symbol + '</span>' +
                '<span class="pf-legend-pct">' + h.weight.toFixed(1) + '%</span>' +
            '</div>';
        }).join('');
        if (others > 0.5) legend += '<div class="pf-legend-row"><div class="pf-legend-dot" style="background:#475569"></div><span class="pf-legend-name">Others</span><span class="pf-legend-pct">' + others.toFixed(1) + '%</span></div>';

        return '<div class="pf-panel__title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>' + t('assetAlloc') + '</div>' +
            '<div class="pf-donut-wrap">' +
                '<div class="pf-donut-canvas-wrap"><canvas id="allocChart"></canvas>' +
                    '<div class="pf-donut-center"><span>' + metrics.holdingsCount + '</span><span>' + (lang==='ar'?'أسهم':'Stocks') + '</span></div>' +
                '</div>' +
                '<div class="pf-donut-legend">' + legend + '</div>' +
            '</div>';
    }

    function initAllocChart() {
        var canvas = document.getElementById('allocChart');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var data = metrics.holdings.slice(0, 5);
        var labels = data.map(function(h){ return h.symbol; });
        var values = data.map(function(h){ return h.weight; });
        var colors = data.map(function(h){ return h.color; });
        var remaining = 100 - values.reduce(function(s,v){ return s+v; },0);
        if (remaining > 0.5) { labels.push('Other'); values.push(remaining); colors.push('#475569'); }

        if (allocChart) allocChart.destroy();
        allocChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }]
            },
            options: {
                responsive: false, maintainAspectRatio: false,
                cutout: '72%',
                plugins: { legend: { display: false }, tooltip: {
                    callbacks: { label: function(c){ return ' ' + c.label + ': ' + c.raw.toFixed(1) + '%'; } }
                }}
            }
        });
    }

    function renderSectorPanel() {
        var sectors = metrics.sectors;
        var max = Math.max.apply(null, Object.values(sectors));
        var rows = Object.entries(sectors).sort(function(a,b){ return b[1]-a[1]; }).map(function(kv){
            var pctVal = kv[1].toFixed(1);
            var barPct = max > 0 ? (kv[1] / max) * 100 : 0;
            return '<div class="pf-sector-row">' +
                '<div class="pf-sector-meta"><span class="pf-sector-name">' + kv[0] + '</span><span class="pf-sector-pct">' + pctVal + '%</span></div>' +
                '<div class="pf-sector-bar-track"><div class="pf-sector-bar-fill" style="width:' + barPct.toFixed(1) + '%"></div></div>' +
            '</div>';
        }).join('');

        return '<div class="pf-panel__title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' + t('sectorAlloc') + '</div>' +
            '<div class="pf-sector-list">' + rows + '</div>';
    }

    function renderInsightsPanel() {
        var best  = metrics.bestHolder;
        var worst = metrics.worstHolder;
        var maxWeight = metrics.holdings.length ? metrics.holdings[0].weight : 0;
        var concRisk  = maxWeight > 25;

        var insights = [
            {
                icon: '📈', cls: 'green',
                title: t('insightPortfolio'),
                detail: (lang === 'ar'
                    ? 'محفظتك تتفوق على EGX30 بنسبة +6.12% من بداية العام. اختيارك في قطاع البنوك والعقارات يقود الأداء.'
                    : 'Your portfolio is outperforming EGX30 by +6.12% YTD. Your stock selection in Banks and Real Estate is driving performance.')
            },
            {
                icon: '⚠️', cls: concRisk ? 'amber' : 'teal',
                title: t('insightConc'),
                detail: (lang === 'ar'
                    ? 'تخصيصك لـ ' + (best ? best.symbol : '') + ' (' + (best ? best.weight.toFixed(1) : '0') + '%) ' + (concRisk ? 'أعلى من الحد الموصى به (25%). فكر في إعادة التوازن.' : 'ضمن النطاق الموصى به.')
                    : 'Your allocation to ' + (best ? best.symbol : '') + ' (' + (best ? best.weight.toFixed(1) : '0') + '%) is ' + (concRisk ? 'above recommended limit (25%). Consider rebalancing.' : 'within recommended range.'))
            },
            {
                icon: '💰', cls: 'blue',
                title: t('insightDiv'),
                detail: (lang === 'ar'
                    ? 'دخل التوزيعات هذا العام: ' + portfolio.currency + ' ' + fmt(metrics.dividendsYTD) + '. ارتفاع 18.4% مقارنة بالعام الماضي.'
                    : "Dividend income this year: " + portfolio.currency + " " + fmt(metrics.dividendsYTD) + ". Up 18.4% vs last year.")
            },
        ];

        return '<div class="pf-panel__title">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="m9 12 2 2 4-4"/></svg>' +
                t('aiInsights') +
                '<span class="pf-insights-beta">Beta</span>' +
            '</div>' +
            '<div class="pf-insights">' +
            insights.map(function(ins){
                return '<div class="pf-insight">' +
                    '<div class="pf-insight-icon pf-insight-icon--' + ins.cls + '">' + ins.icon + '</div>' +
                    '<div class="pf-insight-body">' +
                        '<div class="pf-insight-title">' + ins.title + '</div>' +
                        '<div class="pf-insight-detail">' + ins.detail + '</div>' +
                    '</div></div>';
            }).join('') +
            '</div>';
    }

    /* ─── AI Insights (full-width) ───────────────────────────────────── */
    function renderAIInsightsFull() {
        var el = document.getElementById('pfInsightsFull');
        if (!el) return;
        var best      = metrics.bestHolder;
        var maxWeight = metrics.holdings.length ? metrics.holdings[0].weight : 0;
        var concRisk  = maxWeight > 25;

        var insights = [
            {
                icon: '📈', cls: 'green',
                title: t('insightPortfolio'),
                detail: (lang === 'ar'
                    ? 'محفظتك تتفوق على EGX30 بنسبة +6.12% من بداية العام. اختيارك في قطاع البنوك والعقارات يقود الأداء.'
                    : 'Your portfolio is outperforming EGX30 by +6.12% YTD. Your stock selection in Banks and Real Estate is driving performance.'),
                stat: '+6.12%', statCls: 'pf-pos'
            },
            {
                icon: concRisk ? '⚠️' : '✓', cls: concRisk ? 'amber' : 'teal',
                title: t('insightConc'),
                detail: (lang === 'ar'
                    ? 'تخصيصك لـ ' + (best ? best.symbol : '') + ' (' + (best ? best.weight.toFixed(1) : '0') + '%) ' + (concRisk ? 'أعلى من الحد الموصى به (25%). فكر في إعادة التوازن.' : 'ضمن النطاق الموصى به.')
                    : 'Your allocation to ' + (best ? best.symbol : '') + ' (' + (best ? best.weight.toFixed(1) : '0') + '%) is ' + (concRisk ? 'above recommended limit (25%). Consider rebalancing.' : 'within recommended range.')),
                stat: best ? best.weight.toFixed(1) + '%' : '—', statCls: concRisk ? '' : 'pf-pos'
            },
            {
                icon: '💰', cls: 'blue',
                title: t('insightDiv'),
                detail: (lang === 'ar'
                    ? 'دخل التوزيعات هذا العام: ' + portfolio.currency + ' ' + fmt(metrics.dividendsYTD) + '. ارتفاع 18.4% مقارنة بالعام الماضي.'
                    : 'Dividend income this year: ' + portfolio.currency + ' ' + fmt(metrics.dividendsYTD) + '. Up 18.4% vs last year.'),
                stat: '+18.4%', statCls: 'pf-pos'
            },
        ];

        el.innerHTML =
            '<div class="pf-insights-full">' +
                '<div class="pf-insights-full-head">' +
                    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="m9 12 2 2 4-4"/></svg>' +
                    t('aiInsights') +
                    '<span class="pf-insights-beta">Beta</span>' +
                '</div>' +
                '<div class="pf-insights-full-grid">' +
                insights.map(function(ins){
                    return '<div class="pf-insight-wide">' +
                        '<div class="pf-insight-wide-top">' +
                            '<div class="pf-insight-icon pf-insight-icon--' + ins.cls + '">' + ins.icon + '</div>' +
                            '<div class="pf-insight-wide-stat pf-num ' + ins.statCls + '">' + ins.stat + '</div>' +
                        '</div>' +
                        '<div class="pf-insight-title">' + ins.title + '</div>' +
                        '<div class="pf-insight-detail">' + ins.detail + '</div>' +
                    '</div>';
                }).join('') +
                '</div>' +
            '</div>';
    }

    /* ─── Holdings table ──────────────────────────────────────────────── */
    function renderHoldings(tab) {
        holdingsTab = tab;
        var sec = document.getElementById('holdingsSection');
        if (!sec) return;

        var tabs = ['overview','performance','allocation','dividendTab'].map(function(k){
            return '<button class="pf-tab' + (holdingsTab === k ? ' active' : '') + '" data-tab="' + k + '">' + t(k) + '</button>';
        }).join('');

        var tableHtml = holdingsTab === 'overview'     ? holdingsOverview()     :
                        holdingsTab === 'performance'   ? holdingsPerformance()  :
                        holdingsTab === 'allocation'    ? holdingsAllocation()   :
                                                          holdingsDividends();

        sec.innerHTML =
            '<div class="pf-holdings-head">' +
                '<div class="pf-tabs">' + tabs + '</div>' +
                '<div style="display:flex;gap:.5rem;">' +
                    '<button class="pf-btn pf-btn--sm" id="holdAddTx">+ ' + t('addTx') + '</button>' +
                '</div>' +
            '</div>' +
            '<div class="pf-table-wrap">' + tableHtml + '</div>';

        sec.querySelectorAll('.pf-tab').forEach(function(tab){
            tab.addEventListener('click', function(){ renderHoldings(tab.dataset.tab); });
        });
        var addBtn = sec.querySelector('#holdAddTx');
        if (addBtn) addBtn.addEventListener('click', openAddTxModal);
    }

    function holdingsOverview() {
        var ths = [t('symbol'), t('qty'), t('avgCost'), t('lastPrice'), t('mktValue'), t('weight'), t('dayChange'), t('totalPL'), t('action')];
        var rows = metrics.holdings.map(function(h){
            var dayClass = h.dayChange >= 0 ? 'pf-pos' : 'pf-neg';
            var plClass  = h.totalGain  >= 0 ? 'pf-pos' : 'pf-neg';
            return '<tr>' +
                '<td>' + symChip(h) + '</td>' +
                '<td class="num">' + h.quantity.toLocaleString() + '</td>' +
                '<td class="num">' + fmt(h.avgCost) + '</td>' +
                '<td class="num">' + fmt(h.lastPrice) + '</td>' +
                '<td class="num">' + fmt(h.marketValue) + '</td>' +
                '<td class="num">' + h.weight.toFixed(1) + '%</td>' +
                '<td class="num"><span class="' + dayClass + ' pf-num">' + (h.dayChange >= 0 ? '+' : '') + fmt(h.dayChange) + '</span>' +
                    '<br><span class="' + dayClass + ' pf-num" style="font-size:.7rem;">' + pct(h.dayChangePct) + '</span></td>' +
                '<td class="num"><span class="' + plClass + ' pf-num">' + (h.totalGain >= 0 ? '+' : '') + fmt(h.totalGain) + '</span>' +
                    '<br><span class="' + plClass + ' pf-num" style="font-size:.7rem;">' + pct(h.totalReturn) + '</span></td>' +
                '<td><button class="pf-action-btn" title="Actions">⋮</button></td>' +
            '</tr>';
        }).join('');
        return thTable(ths) + '<tbody>' + rows + '</tbody></table>';
    }

    function holdingsPerformance() {
        var ths = [t('symbol'), t('avgCost'), t('lastPrice'), t('totalPL'), t('totalRet'), t('dayChange')];
        var rows = metrics.holdings.map(function(h){
            var plCls = h.totalGain  >= 0 ? 'pf-pos' : 'pf-neg';
            var dayCls = h.dayChange >= 0 ? 'pf-pos' : 'pf-neg';
            return '<tr><td>' + symChip(h) + '</td>' +
                '<td class="num">' + fmt(h.avgCost) + '</td>' +
                '<td class="num">' + fmt(h.lastPrice) + '</td>' +
                '<td class="num ' + plCls + '">' + (h.totalGain >= 0 ? '+' : '-') + money(h.totalGain) + '</td>' +
                '<td class="num ' + plCls + '">' + (h.totalReturn >= 0 ? '+' : '') + fmt(h.totalReturn) + '%</td>' +
                '<td class="num ' + dayCls + '">' + (h.dayChange >= 0 ? '+' : '') + fmt(h.dayChange) + ' (' + pct(h.dayChangePct) + ')</td>' +
            '</tr>';
        }).join('');
        return thTable(ths) + '<tbody>' + rows + '</tbody></table>';
    }

    function holdingsAllocation() {
        var ths = [t('symbol'), t('mktValue'), t('weight'), (lang==='ar'?'القطاع':'Sector')];
        var total = metrics.totalMarketValue;
        var rows = metrics.holdings.map(function(h){
            var barW = total > 0 ? (h.marketValue / total) * 100 : 0;
            return '<tr><td>' + symChip(h) + '</td>' +
                '<td class="num">' + portfolio.currency + ' ' + fmt(h.marketValue) + '</td>' +
                '<td><div style="display:flex;align-items:center;gap:.5rem;">' +
                    '<div style="flex:1;height:4px;background:var(--line);border-radius:999px;"><div style="height:100%;background:' + h.color + ';width:' + barW.toFixed(1) + '%;border-radius:999px;"></div></div>' +
                    '<span class="pf-num" style="font-size:.75rem;min-width:3rem;">' + h.weight.toFixed(1) + '%</span>' +
                '</div></td>' +
                '<td><span class="pf-badge-neu">' + h.sector + '</span></td>' +
            '</tr>';
        }).join('');
        return thTable(ths) + '<tbody>' + rows + '</tbody></table>';
    }

    function holdingsDividends() {
        var divs = portfolio.transactions.filter(function(t){ return t.type === 'dividend'; })
            .sort(function(a,b){ return b.date.localeCompare(a.date); });
        if (!divs.length) return '<div class="pf-empty">' + (lang==='ar'?'لا توجد توزيعات مسجلة.':'No dividends recorded.') + '</div>';
        var ths = [(lang==='ar'?'التاريخ':'Date'), t('symbol'), (lang==='ar'?'المبلغ':'Amount')];
        var rows = divs.map(function(d){
            return '<tr><td>' + d.date + '</td>' +
                '<td>' + (d.symbol ? symChipBySymbol(d.symbol) : '-') + '</td>' +
                '<td class="num pf-pos">+' + portfolio.currency + ' ' + fmt(d.amount || 0) + '</td>' +
            '</tr>';
        }).join('');
        return thTable(ths) + '<tbody>' + rows + '</tbody></table>';
    }

    function thTable(ths) {
        return '<table class="pf-table"><thead><tr>' +
            ths.map(function(h, i){ return '<th' + (i > 0 ? ' class="num"' : '') + '>' + h + '</th>'; }).join('') +
        '</tr></thead>';
    }

    function symChip(h) {
        return '<div class="pf-sym">' +
            '<div class="pf-sym-chip" style="background:' + h.color + '">' + h.symbol.slice(0,3) + '</div>' +
            '<div class="pf-sym-info"><div class="sym-code">' + h.symbol + '</div>' +
            '<div class="sym-name">' + (lang==='ar' ? escHtml(h.companyNameAr||h.companyName) : escHtml(h.companyName)) + '</div></div>' +
        '</div>';
    }

    function symChipBySymbol(sym) {
        var meta = PFStore.symMeta(sym);
        return '<div class="pf-sym"><div class="pf-sym-chip" style="background:' + meta.color + ';width:1.7rem;height:1.7rem;font-size:.58rem;">' + sym.slice(0,3) + '</div>' +
            '<span style="font-family:var(--pf-mono);font-size:.78rem;font-weight:700;">' + sym + '</span></div>';
    }

    /* ─── Bottom grid ─────────────────────────────────────────────────── */
    function renderBottomGrid() {
        var bg = document.getElementById('bottomGrid');
        bg.innerHTML =
            '<div class="pf-card pf-contrib-panel" id="contribPanel">' + renderContrib() + '</div>' +
            '<div class="pf-card pf-risk-panel">' + renderRiskPanel() + '</div>' +
            '<div class="pf-card pf-tx-panel">' + renderTxPanel() + '</div>' +
            '<div class="pf-card pf-div-panel">' + renderDivPanel() + '</div>';

        bg.querySelectorAll('.pf-contrib-tab').forEach(function(tab){
            tab.addEventListener('click', function(){
                contribTab = tab.dataset.tab;
                document.getElementById('contribPanel').innerHTML = renderContrib();
                document.getElementById('contribPanel').querySelectorAll('.pf-contrib-tab').forEach(function(t2){
                    t2.addEventListener('click', function(){ contribTab = t2.dataset.tab; document.getElementById('contribPanel').innerHTML = renderContrib(); wireContrib(); });
                });
            });
        });
    }

    function renderContrib() {
        var sorted = metrics.holdings.slice().sort(function(a,b){
            return contribTab === 'gainers' ? b.totalGain - a.totalGain : a.totalGain - b.totalGain;
        });
        var rows = sorted.slice(0,5).map(function(h){
            var cls = h.totalGain >= 0 ? 'pf-pos' : 'pf-neg';
            var sign = h.totalGain >= 0 ? '+' : '';
            return '<div class="pf-contrib-row">' +
                '<div class="pf-contrib-chip" style="background:' + h.color + '">' + h.symbol.slice(0,3) + '</div>' +
                '<span class="pf-contrib-name">' + h.symbol + '</span>' +
                '<div class="pf-contrib-val">' +
                    '<span class="' + cls + '">' + sign + fmt(h.totalGain) + '</span>' +
                    '<span>' + pct(h.totalReturn) + '</span>' +
                '</div></div>';
        }).join('');
        var tabBtns = '<div class="pf-contrib-tabs">' +
            '<button class="pf-contrib-tab' + (contribTab==='gainers'?' active':'') + '" data-tab="gainers">' + t('gainers') + '</button>' +
            '<button class="pf-contrib-tab' + (contribTab==='losers'?' active':'') + '" data-tab="losers">'  + t('losers')  + '</button>' +
        '</div>';
        return '<div class="pf-panel__title">' + t('topContrib') + '</div>' + tabBtns + rows;
    }

    function renderRiskPanel() {
        return '<div class="pf-panel__title">' + t('riskMetrics') + '</div>' +
            '<div class="pf-risk-grid">' +
                riskItem(lang==='ar'?'بيتا':'Beta',         '0.92', lang==='ar'?'نسبة إلى EGX30':'vs EGX30') +
                riskItem(t('volatility'),                    '14.32%', lang==='ar'?'انحراف معياري سنوي':'Annual std dev') +
                riskItem(t('sharpe'),                        '1.45', lang==='ar'?'معدل عائد خالي من المخاطر 25.5%':'Risk-free: 25.5%') +
                riskItem(t('sortino'),                       '1.87', lang==='ar'?'مبني على انحراف الخسائر':'Based on downside') +
                riskItem(t('maxDrawdown'),                   '-4.23%', lang==='ar'?'آخر 90 يومًا':'Last 90 days') +
                riskItem(lang==='ar'?'الانحراف المعياري':'Std Deviation', '11.87%', '') +
            '</div>';
    }

    function riskItem(label, val, small) {
        return '<div class="pf-risk-item"><label>' + label + '</label><span>' + val + '</span>' + (small ? '<small>' + small + '</small>' : '') + '</div>';
    }

    function renderTxPanel() {
        var txs = portfolio.transactions.filter(function(t){ return t.type !== 'deposit' && t.type !== 'withdrawal'; })
            .sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,5);
        var rows = txs.map(function(tx){
            var iconCls = tx.type === 'buy' ? 'buy' : tx.type === 'sell' ? 'sell' : tx.type === 'dividend' ? 'div' : 'dep';
            var iconChar = tx.type === 'buy' ? '↑' : tx.type === 'sell' ? '↓' : tx.type === 'dividend' ? '$' : '↔';
            var amount = tx.type === 'buy' || tx.type === 'sell' ? (tx.quantity * tx.price) : (tx.amount || 0);
            var amtCls = tx.type === 'sell' || tx.type === 'dividend' ? 'pf-pos' : tx.type === 'buy' ? 'pf-neg' : '';
            var sign   = tx.type === 'sell' || tx.type === 'dividend' ? '+' : tx.type === 'buy' ? '-' : '';
            return '<div class="pf-tx-row">' +
                '<div class="pf-tx-icon pf-tx-icon--' + iconCls + '">' + iconChar + '</div>' +
                '<div class="pf-tx-info"><strong>' + (tx.symbol || t(tx.type)) + '</strong>' +
                    '<span>' + tx.type.toUpperCase() + ' · ' + tx.date + '</span></div>' +
                '<div class="pf-tx-amount"><strong class="' + amtCls + '">' + sign + portfolio.currency + ' ' + fmt(amount) + '</strong>' +
                    (tx.quantity ? '<span>' + tx.quantity + ' ' + (lang==='ar'?'سهم':'shares') + '</span>' : '') +
                '</div></div>';
        }).join('');
        return '<div class="pf-panel__title" style="display:flex;justify-content:space-between;">' +
                t('recentTx') + '<button class="pf-view-all" onclick="window.location.href=\'/Portfolio/' + pfId + '\'">View all →</button>' +
            '</div>' + rows;
    }

    function renderDivPanel() {
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        var monthsAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
        var vals = [0,0,0,2800,0,11780,14800,0,0,0,0,0];
        var max = Math.max.apply(null, vals);
        var bars = vals.map(function(v, i){
            var h = max > 0 ? (v / max) * 100 : 0;
            var isDim = v === 0;
            return '<div class="pf-div-bar-wrap">' +
                '<div class="pf-div-bar' + (isDim?' pf-div-bar--dim':'') + '" style="height:' + h + '%"></div>' +
                '<span class="pf-div-month">' + (lang==='ar' ? monthsAr[i].slice(0,3) : months[i]) + '</span>' +
            '</div>';
        }).join('');
        return '<div class="pf-panel__title">' + t('divIncome') + '</div>' +
            '<div class="pf-div-chart">' + bars + '</div>' +
            '<div class="pf-div-footer"><label>' + t('ytdDivs') + '</label><span class="pf-pos pf-num">+' + portfolio.currency + ' ' + fmt(metrics.dividendsYTD) + '</span></div>';
    }

    /* ─── Add Transaction Modal ───────────────────────────────────────── */
    var txType = 'buy';

    function openAddTxModal() {
        txType = 'buy';
        renderAddTxBody();
        document.getElementById('addTxModal').classList.add('open');
        document.getElementById('addTxTitle').textContent = t('addTx');
    }

    function renderAddTxBody() {
        var types = ['buy','sell','deposit','withdraw','dividend','fee'];
        var typeBtns = types.map(function(tp){
            return '<button class="pf-type-btn' + (txType===tp?' active':'') + '" data-type="' + tp + '">' + t(tp) + '</button>';
        }).join('');

        var showSymbol = txType === 'buy' || txType === 'sell' || txType === 'dividend';
        var showPrice  = txType === 'buy' || txType === 'sell';
        var showAmount = txType === 'deposit' || txType === 'withdraw' || txType === 'dividend' || txType === 'fee';

        document.getElementById('addTxBody').innerHTML =
            '<div class="pf-form">' +
                '<div class="pf-type-grid">' + typeBtns + '</div>' +
                '<div class="pf-form-row">' +
                    field('txDate', t('txDate'), '<input type="date" id="txDate" value="' + new Date().toISOString().slice(0,10) + '">') +
                    (showSymbol ? field('txSym', t('txSymbol'), '<input type="text" id="txSym" placeholder="e.g. COMI" style="text-transform:uppercase">') : '<div class="pf-field"></div>') +
                '</div>' +
                (showPrice ? '<div class="pf-form-row">' + field('txQty', t('txQty'), '<input type="number" id="txQty" placeholder="0" min="1">') + field('txPrice', t('txPrice'), '<input type="number" id="txPrice" placeholder="0.00" step="0.01" min="0">') + '</div>' : '') +
                (showAmount ? field('txAmt', t('txAmount'), '<input type="number" id="txAmt" placeholder="0.00" step="0.01" min="0">') : '') +
                (showPrice ? '<div class="pf-form-row">' + field('txComm', t('txComm'), '<input type="number" id="txComm" placeholder="0.00" step="0.01" value="0">') + field('txTax', t('txTax'), '<input type="number" id="txTax" placeholder="0.00" step="0.01" value="0">') + '</div>' : '') +
                field('txNotes', t('txNotes'), '<input type="text" id="txNotes" placeholder="Optional notes">') +
                '<div style="display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem;">' +
                    '<button class="pf-btn" id="cancelTx">' + t('cancel') + '</button>' +
                    '<button class="pf-btn pf-btn--primary" id="submitTx">' + t('submit') + '</button>' +
                '</div>' +
            '</div>';

        document.getElementById('addTxBody').querySelectorAll('.pf-type-btn').forEach(function(btn){
            btn.addEventListener('click', function(){
                txType = btn.dataset.type;
                renderAddTxBody();
            });
        });
        document.getElementById('cancelTx').addEventListener('click', closeTxModal);
        document.getElementById('submitTx').addEventListener('click', submitTx);
    }

    function field(id, label, inputHtml) {
        return '<div class="pf-field"><label for="' + id + '">' + label + '</label>' + inputHtml + '</div>';
    }

    function submitTx() {
        var tx = {
            type: txType,
            date: (document.getElementById('txDate') || {}).value || new Date().toISOString().slice(0,10),
            symbol: (document.getElementById('txSym') || {}).value || null,
            quantity: parseFloat((document.getElementById('txQty') || {}).value) || null,
            price: parseFloat((document.getElementById('txPrice') || {}).value) || null,
            amount: parseFloat((document.getElementById('txAmt') || {}).value) || null,
            commission: parseFloat((document.getElementById('txComm') || {}).value) || 0,
            tax: parseFloat((document.getElementById('txTax') || {}).value) || 0,
            notes: (document.getElementById('txNotes') || {}).value || '',
            currency: portfolio.currency,
        };
        if (tx.symbol) tx.symbol = tx.symbol.toUpperCase();
        PFStore.addTransaction(pfId, tx);
        closeTxModal();
        load(); // re-render
    }

    function closeTxModal() { document.getElementById('addTxModal').classList.remove('open'); }

    /* ─── Theme / lang ────────────────────────────────────────────────── */
    function applyLang(l) {
        lang = l; localStorage.setItem('starta-lang', l);
        document.documentElement.lang = l;
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('langToggle').textContent = l === 'ar' ? 'EN' : 'AR';
        applyNavLang(l);
        if (perfChart)  { perfChart.destroy();  perfChart  = null; }
        if (allocChart) { allocChart.destroy(); allocChart = null; }
        load();
    }

    // Theme is fully managed by starta-theme.js — re-render charts on theme change.
    document.addEventListener('starta:themechange', function(){
        if (perfChart)  { perfChart.destroy();  perfChart  = null; }
        if (allocChart) { allocChart.destroy(); allocChart = null; }
        load();
    });
    document.getElementById('langToggle').addEventListener('click', function(){
        applyLang(lang === 'ar' ? 'en' : 'ar');
    });
    document.getElementById('closeAddTx').addEventListener('click', closeTxModal);
    document.getElementById('addTxModal').addEventListener('click', function(e){
        if (e.target === this) closeTxModal();
    });

    if (lang === 'ar') {
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
        document.getElementById('langToggle').textContent = 'EN';
    }
    applyNavLang(lang);

    load();

}());
