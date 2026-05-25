/**
 * portfolio-list.js — Portfolio list page logic.
 * Renders portfolio cards and handles creation flow.
 */
(function () {
    'use strict';

    var lang = localStorage.getItem('starta-lang') || localStorage.getItem('lang') || 'en';

    var T = {
        en: {
            title: 'Portfolio Intelligence',
            sub: 'Track, analyze, and optimize your EGX investments in one premium workspace.',
            newPortfolio: 'New Portfolio',
            totalValue: 'Total Value', totalReturn: 'Total Return',
            annualYield: 'Ann. Yield', holdings: 'Holdings',
            currency: 'Currency', benchmark: 'Benchmark',
            lastUpdated: 'Updated', default: 'Default',
            viewPortfolio: 'Open', createManual: 'Create Manually',
            createManualDesc: 'Start fresh and add your holdings and transactions step-by-step.',
            createImport: 'Import Transactions',
            createImportDesc: 'Upload a CSV or XLSX file with your transaction history.',
            createWatchlist: 'From Watchlist',
            createWatchlistDesc: 'Convert your watchlist into a starting portfolio.',
            createModalTitle: 'New Portfolio',
            portfolioName: 'Portfolio Name', portfolioCurrency: 'Base Currency',
            benchmarkLabel: 'Benchmark', riskFreeRate: 'Risk-Free Rate (%)',
            description: 'Description (optional)', startDate: 'Start Date',
            autoSplit: 'Auto-adjust for stock splits',
            cancel: 'Cancel', create: 'Create Portfolio',
            vsEgx: 'vs EGX30',
        },
        ar: {
            title: 'ذكاء المحفظة',
            sub: 'تتبع محفظتك في البورصة المصرية وحللها وطورها في مساحة عمل متكاملة.',
            newPortfolio: 'محفظة جديدة',
            totalValue: 'إجمالي القيمة', totalReturn: 'إجمالي العائد',
            annualYield: 'العائد السنوي', holdings: 'الأسهم',
            currency: 'العملة', benchmark: 'المؤشر المرجعي',
            lastUpdated: 'آخر تحديث', default: 'الافتراضية',
            viewPortfolio: 'فتح', createManual: 'إنشاء يدوي',
            createManualDesc: 'ابدأ من الصفر وأضف ممتلكاتك ومعاملاتك خطوة بخطوة.',
            createImport: 'استيراد المعاملات',
            createImportDesc: 'ارفع ملف CSV أو XLSX يحتوي على سجل معاملاتك.',
            createWatchlist: 'من قائمة المتابعة',
            createWatchlistDesc: 'حول قائمة متابعتك إلى محفظة استثمارية.',
            createModalTitle: 'محفظة جديدة',
            portfolioName: 'اسم المحفظة', portfolioCurrency: 'العملة الأساسية',
            benchmarkLabel: 'المؤشر المرجعي', riskFreeRate: 'معدل العائد الخالي من المخاطر (%)',
            description: 'وصف (اختياري)', startDate: 'تاريخ البداية',
            autoSplit: 'تعديل تلقائي لتجزئة الأسهم',
            cancel: 'إلغاء', create: 'إنشاء المحفظة',
            vsEgx: 'مقابل EGX30',
        }
    };

    function t(key) { return (T[lang] || T.en)[key] || key; }
    function fmt(n, d) { return PFStore.fmt(n, d); }
    function pct(n) { return (n >= 0 ? '+' : '') + fmt(n, 2) + '%'; }

    /* ─── Render list ─────────────────────────────────────────────────── */
    function render() {
        var root = document.getElementById('pfListRoot');
        var portfolios = PFStore.getAll();
        var metrics = portfolios.map(function (p) {
            return { p: p, m: PFStore.computeMetrics(p) };
        });

        var cardsHtml = metrics.map(function (item) {
            var p = item.p, m = item.m;
            var retClass = m.totalReturn >= 0 ? 'pf-pos' : 'pf-neg';
            var updated = new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short' });
            var displayName = (lang === 'ar' && p.nameAr) ? p.nameAr : p.name;
            return '<div class="pf-card pf-portfolio-card" data-id="' + p.id + '">' +
                '<div class="card-name"><span>' + escHtml(displayName) + '</span>' + (p.isDefault ? '<span class="default-badge">' + t('default') + '</span>' : '') + '</div>' +
                '<div class="card-value"><span>' + p.currency + '</span>' + fmt(m.totalValue) + '</div>' +
                '<div class="card-meta">' +
                    kv(t('totalReturn'), '<span class="' + retClass + ' pf-num">' + pct(m.totalReturn) + '</span>') +
                    kv(t('holdings'), m.holdingsCount) +
                    kv(t('currency'), p.currency) +
                    kv(t('benchmark'), p.benchmark) +
                '</div>' +
                '<div class="card-footer">' +
                    '<span>' + t('lastUpdated') + ': ' + updated + '</span>' +
                    '<div class="card-actions">' +
                        '<button class="pf-btn pf-btn--sm pf-btn--primary" data-open="' + p.id + '">' + t('viewPortfolio') + ' →</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        var createHtml = [
            createCard('✦', t('createManual'),   t('createManualDesc'),   'manual'),
            createCard('⇪', t('createImport'),   t('createImportDesc'),   'import'),
            createCard('◈', t('createWatchlist'), t('createWatchlistDesc'), 'watchlist'),
        ].join('');

        root.innerHTML =
            '<div class="pf-list">' +
                '<div class="pf-list-head">' +
                    '<div><h1 class="display">' + t('title') + '</h1><p>' + t('sub') + '</p></div>' +
                    '<button id="newPfBtn" class="pf-btn pf-btn--primary">+ ' + t('newPortfolio') + '</button>' +
                '</div>' +
                '<div class="pf-list-grid">' + cardsHtml + createHtml + '</div>' +
            '</div>';

        // Wire events
        root.querySelectorAll('[data-open]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.location.href = '/Portfolio/' + btn.getAttribute('data-open');
            });
        });
        root.querySelectorAll('.pf-portfolio-card').forEach(function (card) {
            card.addEventListener('click', function () {
                window.location.href = '/Portfolio/' + card.dataset.id;
            });
        });
        root.querySelectorAll('.pf-create-card').forEach(function (card) {
            card.addEventListener('click', function () { openCreateModal(card.dataset.method); });
        });
        document.getElementById('newPfBtn').addEventListener('click', function () { openCreateModal('manual'); });
    }

    function kv(label, val) {
        return '<div class="card-meta-item"><label>' + label + '</label><span>' + val + '</span></div>';
    }

    function createCard(icon, title, desc, method) {
        return '<div class="pf-card pf-create-card" data-method="' + method + '">' +
            '<div class="create-icon">' + icon + '</div>' +
            '<h3>' + title + '</h3>' +
            '<p>' + desc + '</p>' +
        '</div>';
    }

    function escHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

    /* ─── Create portfolio modal ──────────────────────────────────────── */
    var selectedMethod = 'manual';

    function openCreateModal(method) {
        selectedMethod = method || 'manual';
        renderModalBody();
        document.getElementById('createModal').classList.add('open');
    }

    function renderModalBody() {
        var body = document.getElementById('createModalBody');
        body.innerHTML =
            '<div class="pf-modal-create-methods">' +
                methodCard('manual',    '✦', t('createManual'),    t('createManualDesc')) +
                methodCard('import',    '⇪', t('createImport'),    t('createImportDesc')) +
                methodCard('watchlist', '◈', t('createWatchlist'),  t('createWatchlistDesc')) +
            '</div>' +
            '<div class="pf-form" id="createForm">' +
                '<div class="pf-form-row">' +
                    field('portfolioName', t('portfolioName'), '<input type="text" id="pfName" placeholder="e.g. My EGX Portfolio" required>') +
                    field('currency', t('portfolioCurrency'), '<select id="pfCurrency"><option value="EGP" selected>EGP — Egyptian Pound</option><option value="USD">USD — US Dollar</option><option value="SAR">SAR — Saudi Riyal</option></select>') +
                '</div>' +
                '<div class="pf-form-row">' +
                    field('benchmark', t('benchmarkLabel'), '<select id="pfBenchmark"><option value="EGX30" selected>EGX30</option><option value="EGX70">EGX70</option><option value="SP500">S&amp;P 500</option></select>') +
                    field('riskFree', t('riskFreeRate'), '<input type="number" id="pfRiskFree" value="25.5" step="0.1" min="0" max="100">') +
                '</div>' +
                field('desc', t('description'), '<input type="text" id="pfDesc" placeholder="Optional description">') +
                '<div style="display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem;">' +
                    '<button class="pf-btn" id="cancelCreate">' + t('cancel') + '</button>' +
                    '<button class="pf-btn pf-btn--primary" id="submitCreate">' + t('create') + '</button>' +
                '</div>' +
            '</div>';

        // Wire method cards
        body.querySelectorAll('.pf-method-card').forEach(function (c) {
            c.addEventListener('click', function () {
                body.querySelectorAll('.pf-method-card').forEach(function (x) { x.classList.remove('active'); });
                c.classList.add('active');
                selectedMethod = c.dataset.method;
            });
            if (c.dataset.method === selectedMethod) c.classList.add('active');
        });

        body.querySelector('#cancelCreate').addEventListener('click', closeModal);
        body.querySelector('#submitCreate').addEventListener('click', submitCreate);
    }

    function methodCard(method, icon, title, desc) {
        return '<div class="pf-method-card" data-method="' + method + '">' +
            '<div class="pf-method-icon">' + icon + '</div>' +
            '<div class="pf-method-text"><h4>' + title + '</h4><p>' + desc + '</p></div>' +
        '</div>';
    }

    function field(id, label, inputHtml) {
        return '<div class="pf-field"><label for="' + id + '">' + label + '</label>' + inputHtml + '</div>';
    }

    function submitCreate() {
        var name = document.getElementById('pfName').value.trim();
        if (!name) { document.getElementById('pfName').focus(); return; }
        var p = PFStore.create({
            name: name,
            currency: document.getElementById('pfCurrency').value,
            benchmark: document.getElementById('pfBenchmark').value,
            riskFreeRate: parseFloat(document.getElementById('pfRiskFree').value) || 25.5,
            description: document.getElementById('pfDesc').value.trim(),
            isDefault: false
        });
        closeModal();
        window.location.href = '/Portfolio/' + p.id;
    }

    function closeModal() {
        document.getElementById('createModal').classList.remove('open');
    }

    /* ─── Theme / lang toggles (mirrors news-public.js pattern) ──────── */
    function applyLang(l) {
        lang = l; localStorage.setItem('starta-lang', l);
        document.documentElement.lang = l;
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('langToggle').textContent = l === 'ar' ? 'EN' : 'AR';
        render();
    }

    // Theme is fully managed by starta-theme.js — no handler needed here.
    document.getElementById('langToggle').addEventListener('click', function () {
        applyLang(lang === 'ar' ? 'en' : 'ar');
    });
    document.getElementById('closeCreateModal').addEventListener('click', closeModal);
    document.getElementById('createModal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });

    // Init lang from stored
    if (lang === 'ar') {
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
        document.getElementById('langToggle').textContent = 'EN';
    }

    render();

}());
