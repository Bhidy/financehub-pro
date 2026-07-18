/**
 * portfolio-list.js — Portfolio list page logic.
 * Renders portfolio cards and handles creation flow.
 */
(function () {
    'use strict';

    var lang = localStorage.getItem('starta-lang') || localStorage.getItem('lang') || 'ar'; // site default: Arabic

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
            createImport: 'Import Holdings',
            createImportDesc: 'Upload a CSV or XLSX file with your holdings (Symbol, Quantity, Avg Price).',
            importTitle: 'Import Holdings',
            importSubtitle: 'Upload your holdings to create a pre-filled portfolio instantly.',
            importDrop: 'Drag & drop your CSV or XLSX file here',
            importOr: 'or',
            importBrowse: 'Browse File',
            importTemplate: 'Download Sample Template',
            importRequired: 'Required columns: Symbol, Quantity, Avg Price',
            importPreview: 'Preview ({n} rows)',
            importColSymbol: 'Symbol', importColQty: 'Quantity', importColAvg: 'Avg Price',
            importErrNoFile: 'Please select a CSV or XLSX file.',
            importErrCols: 'Missing required columns. File must include: Symbol, Quantity, Avg Price (or Average Price / AvgCost).',
            importErrNoRows: 'No valid holdings rows found in the file.',
            cancel: 'Cancel', create: 'Create Portfolio',
            createWatchlist: 'From Watchlist',
            createWatchlistDesc: 'Convert your watchlist into a starting portfolio.',
            createModalTitle: 'New Portfolio',
            portfolioName: 'Portfolio Name', portfolioCurrency: 'Base Currency',
            benchmarkLabel: 'Benchmark', riskFreeRate: 'Risk-Free Rate (%)',
            description: 'Description (optional)', startDate: 'Start Date',
            autoSplit: 'Auto-adjust for stock splits',
            vsEgx: 'vs EGX30',
            renamePortfolio: 'Rename', deletePortfolio: 'Delete',
            renameTitle: 'Rename Portfolio', renameLabel: 'New name', renameSave: 'Save',
            deleteTitle: 'Delete Portfolio',
            deleteConfirm: 'Permanently delete {name}? This cannot be undone.',
        },
        ar: {
            title: 'المحفظة الاستثمارية',
            sub: 'تتبع محفظتك في البورصة المصرية وحللها وطورها في مساحة عمل متكاملة.',
            newPortfolio: 'محفظة جديدة',
            totalValue: 'إجمالي القيمة', totalReturn: 'إجمالي العائد',
            annualYield: 'العائد السنوي', holdings: 'الأسهم',
            currency: 'العملة', benchmark: 'المؤشر المرجعي',
            lastUpdated: 'آخر تحديث', default: 'الافتراضية',
            viewPortfolio: 'فتح', createManual: 'إنشاء يدوي',
            createManualDesc: 'ابدأ من الصفر وأضف ممتلكاتك ومعاملاتك خطوة بخطوة.',
            createImport: 'استيراد الأرصدة',
            createImportDesc: 'ارفع ملف CSV أو XLSX يحتوي على أرصدتك (الرمز، الكمية، متوسط السعر).',
            importTitle: 'استيراد الأرصدة',
            importSubtitle: 'ارفع أرصدتك لإنشاء محفظة جاهزة فورًا.',
            importDrop: 'اسحب وأفلت ملف CSV أو XLSX هنا',
            importOr: 'أو',
            importBrowse: 'تصفح الملف',
            importTemplate: 'تنزيل نموذج CSV',
            importRequired: 'الأعمدة المطلوبة: Symbol، Quantity، Avg Price',
            importPreview: 'معاينة ({n} صفوف)',
            importColSymbol: 'الرمز', importColQty: 'الكمية', importColAvg: 'متوسط السعر',
            importErrNoFile: 'الرجاء اختيار ملف CSV أو XLSX.',
            importErrCols: 'الأعمدة المطلوبة غير موجودة. يجب أن يحتوي الملف على: Symbol، Quantity، Avg Price.',
            importErrNoRows: 'لم يتم العور على صفوف صالحة في الملف.',
            cancel: 'إلغاء', create: 'إنشاء المحفظة',
            createWatchlist: 'من قائمة المتابعة',
            createWatchlistDesc: 'حول قائمة متابعتك إلى محفظة استثمارية.',
            createModalTitle: 'محفظة جديدة',
            portfolioName: 'اسم المحفظة', portfolioCurrency: 'العملة الأساسية',
            benchmarkLabel: 'المؤشر المرجعي', riskFreeRate: 'معدل العائد الخالي من المخاطر (%)',
            description: 'وصف (اختياري)', startDate: 'تاريخ البداية',
            autoSplit: 'تعديل تلقائي لتجزئة الأسهم',
            cancel: 'إلغاء', create: 'إنشاء المحفظة',
            vsEgx: 'مقابل EGX30',
            renamePortfolio: 'إعادة تسمية', deletePortfolio: 'حذف',
            renameTitle: 'إعادة تسمية المحفظة', renameLabel: 'الاسم الجديد', renameSave: 'حفظ',
            deleteTitle: 'حذف المحفظة',
            deleteConfirm: 'هل تريد حذف {name} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.',
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
            var updated = PFStore.pricesUpdatedAt
                ? new Date(PFStore.pricesUpdatedAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: '2-digit', month: 'short' });
            var displayName = (lang === 'ar' && p.nameAr) ? p.nameAr : p.name;
            return '<div class="pf-card pf-portfolio-card" data-id="' + p.id + '">' +
                '<div class="card-name">' +
                    '<div class="card-name-left">' +
                        '<span>' + escHtml(displayName) + '</span>' +
                        (p.isDefault ? '<span class="default-badge">' + t('default') + '</span>' : '') +
                    '</div>' +
                    '<div class="card-name-actions">' +
                        '<button class="pf-btn pf-btn--icon pf-btn--ghost pf-card-edit" data-id="' + p.id + '" data-name="' + escHtml(displayName) + '" title="' + t('renamePortfolio') + '" aria-label="' + t('renamePortfolio') + '">' +
                            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                        '</button>' +
                        '<button class="pf-btn pf-btn--icon pf-btn--ghost pf-btn--danger-ghost pf-card-delete" data-id="' + p.id + '" data-name="' + escHtml(displayName) + '" title="' + t('deletePortfolio') + '" aria-label="' + t('deletePortfolio') + '">' +
                            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
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

        var offlineBanner = PFStore.pricesOffline
            ? '<div class="pf-offline-note" role="status" style="margin:0 0 0.75rem;padding:0.5rem 0.85rem;border:1px solid var(--c-border);border-radius:8px;background:rgba(220,38,38,0.08);color:var(--c-text-muted);font-size:0.72rem;">' +
                (lang === 'ar' ? '⚠︎ تعذّر تحديث الأسعار المباشرة — القيم المعروضة قد تكون تقديرية.' : '⚠︎ Live prices unavailable — values shown may be estimated.') +
              '</div>'
            : '';
        root.innerHTML =
            '<div class="pf-list">' +
                '<div class="pf-list-head">' +
                    '<div><h1 class="display">' + t('title') + '</h1><p>' + t('sub') + '</p></div>' +
                    '<button id="newPfBtn" class="pf-btn pf-btn--primary">+ ' + t('newPortfolio') + '</button>' +
                '</div>' +
                offlineBanner +
                '<div class="pf-list-grid">' + cardsHtml + createHtml + '</div>' +
            '</div>';

        // Wire events
        root.querySelectorAll('[data-open]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                window.location.href = '/Portfolio/' + btn.getAttribute('data-open');
            });
        });
        root.querySelectorAll('.pf-card-edit').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                openRenameModal(btn.getAttribute('data-id'), btn.getAttribute('data-name'));
            });
        });
        root.querySelectorAll('.pf-card-delete').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                confirmDelete(btn.getAttribute('data-id'), btn.getAttribute('data-name'));
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

        // ── Premium Method Context Badge ──────────────────────────────────
        // Show a slim, non-interactive indicator so the user knows their selected method.
        // No re-selection UI: the user already chose on the Portfolio page.
        var methodMeta = {
            manual:    { icon: '\u2726', labelKey: 'createManual',    descKey: 'createManualDesc' },
            import:    { icon: '\u21ea', labelKey: 'createImport',    descKey: 'createImportDesc' },
            watchlist: { icon: '\u25c8', labelKey: 'createWatchlist', descKey: 'createWatchlistDesc' }
        };
        var meta = methodMeta[selectedMethod] || methodMeta.manual;

        body.innerHTML =
            // ── Method Context Badge (slim, premium, non-interactive) ──
            '<div class="pf-method-badge">'+
                '<div class="pf-method-badge-icon">' + meta.icon + '</div>'+
                '<div class="pf-method-badge-text">'+
                    '<span class="pf-method-badge-label">' + t(meta.labelKey) + '</span>'+
                    '<span class="pf-method-badge-desc">' + t(meta.descKey) + '</span>'+
                '</div>'+
            '</div>'+
            // ── Import Holdings Zone (only shown when method === import) ──
            '<div id="importZone" class="pf-import-zone" style="' + (selectedMethod === 'import' ? '' : 'display:none;') + '">'+
                '<div class="pf-import-header">'+
                    '<div class="pf-import-icon">'+
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'+
                    '</div>'+
                    '<div>'+
                        '<h4 class="pf-import-title">' + t('importTitle') + '</h4>'+
                        '<p class="pf-import-sub">' + t('importSubtitle') + '</p>'+
                    '</div>'+
                '</div>'+
                '<div id="importDropArea" class="pf-import-drop" role="button" tabindex="0" aria-label="' + t('importDrop') + '">'+
                    '<svg class="pf-import-drop-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M24 32V16"/><polyline points="16 24 24 16 32 24"/><path d="M40 32v6a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-6"/></svg>'+
                    '<p class="pf-import-drop-label">' + t('importDrop') + '</p>'+
                    '<p class="pf-import-drop-hint">' + t('importRequired') + '</p>'+
                    '<input type="file" id="importFileInput" accept=".csv,.xlsx,.xls" style="display:none;">'+
                '</div>'+
                '<div class="pf-import-actions">'+
                    '<button type="button" id="importBrowseBtn" class="pf-btn pf-btn--primary pf-btn--sm">'+
                        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'+
                        ' ' + t('importBrowse') +
                    '</button>'+
                    '<span class="pf-import-or">' + t('importOr') + '</span>'+
                    '<button type="button" id="importTemplateBtn" class="pf-btn pf-btn--sm pf-btn--outline">'+
                        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><line x1="12" y1="21" x2="12" y2="9"/></svg>'+
                        ' ' + t('importTemplate') +
                    '</button>'+
                '</div>'+
                '<div id="importError" class="pf-import-error" style="display:none;"></div>'+
                '<div id="importPreview"></div>'+
            '</div>'+
            // ── Portfolio Config Form ──
            '<div class="pf-form" id="createForm">'+
                '<div class="pf-form-row">'+
                    field('portfolioName', t('portfolioName'), '<input type="text" id="pfName" placeholder="e.g. My EGX Portfolio" required>') +
                    field('currency', t('portfolioCurrency'), '<select id="pfCurrency"><option value="EGP" selected>EGP \u2014 Egyptian Pound</option><option value="USD">USD \u2014 US Dollar</option><option value="SAR">SAR \u2014 Saudi Riyal</option></select>') +
                '</div>'+
                '<div class="pf-form-row">'+
                    field('benchmark', t('benchmarkLabel'), '<select id="pfBenchmark"><option value="EGX30" selected>EGX30</option><option value="EGX70">EGX70</option><option value="SP500">S&amp;P 500</option></select>') +
                    field('riskFree', t('riskFreeRate'), '<input type="number" id="pfRiskFree" value="25.5" step="0.1" min="0" max="100">') +
                '</div>'+
                field('desc', t('description'), '<input type="text" id="pfDesc" placeholder="Optional description">') +
                '<div style="display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem;">'+
                    '<button class="pf-btn" id="cancelCreate">' + t('cancel') + '</button>'+
                    '<button class="pf-btn pf-btn--primary" id="submitCreate">' + t('create') + '</button>'+
                '</div>'+
            '</div>';

        body.querySelector('#cancelCreate').addEventListener('click', closeModal);
        body.querySelector('#submitCreate').addEventListener('click', submitCreate);

        // Import zone logic
        initImportZone(body);
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

    /* ──────────────────────────────────────────────────────────
     * Import Holdings — CSV/XLSX parser and uploader
     * ───────────────────────────────────────────────────────── */
    var _importRows = [];   // parsed holding rows: [{symbol, quantity, avgPrice}]

    function downloadSampleTemplate() {
        var csv = 'Symbol,Quantity,Avg Price,Notes\r\nCOMI,500,125.50,Bought Jan 2024\r\nTMGH,1000,52.30,Bought Feb 2024\r\nABUK,2000,18.75,Bought Mar 2024\r\nHRHO,3000,15.20,\r\n';
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'starta_holdings_template.csv';
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); document.body.removeChild(a); }, 200);
    }

    function parseCSV(text) {
        var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        var rows = [];
        lines.forEach(function (line) {
            if (!line.trim()) return;
            // Handle quoted fields
            var cols = [];
            var inQ = false, cur = '';
            for (var i = 0; i < line.length; i++) {
                var ch = line[i];
                if (ch === '"') { inQ = !inQ; }
                else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
                else { cur += ch; }
            }
            cols.push(cur.trim());
            rows.push(cols);
        });
        return rows;
    }

    function normaliseHeader(h) {
        return h.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function mapImportRows(rawRows) {
        if (rawRows.length < 2) return null;
        var header = rawRows[0].map(normaliseHeader);
        // Flexible column name matching
        var iSym = header.findIndex(function (h) { return h === 'symbol' || h === 'ticker' || h === 'code'; });
        var iQty = header.findIndex(function (h) { return h === 'quantity' || h === 'qty' || h === 'shares'; });
        var iAvg = header.findIndex(function (h) {
            return h === 'avgprice' || h === 'averageprice' || h === 'avgcost'
                || h === 'costprice' || h === 'averagecost' || h === 'price';
        });
        if (iSym === -1 || iQty === -1 || iAvg === -1) return null;
        var rows = [];
        for (var r = 1; r < rawRows.length; r++) {
            var row = rawRows[r];
            if (!row || !row[iSym]) continue;
            var sym = String(row[iSym] || '').trim().toUpperCase();
            var qty = parseFloat(String(row[iQty] || '').replace(/,/g, ''));
            var avg = parseFloat(String(row[iAvg] || '').replace(/,/g, ''));
            if (!sym || !qty || qty <= 0 || !avg || avg <= 0) continue;
            rows.push({ symbol: sym, quantity: qty, avgPrice: avg });
        }
        return rows.length ? rows : null;
    }

    function renderImportPreview(rows, container) {
        if (!rows || !rows.length) {
            container.innerHTML = '<div class="pf-import-error">' + t('importErrNoRows') + '</div>';
            return;
        }
        var previewLabel = t('importPreview').replace('{n}', rows.length);
        var thead = '<tr><th>' + t('importColSymbol') + '</th><th>' + t('importColQty') + '</th><th>' + t('importColAvg') + '</th></tr>';
        var tbody = rows.map(function (r) {
            return '<tr><td><span class="pf-sym-badge">' + escHtml(r.symbol) + '</span></td><td>' +
                PFStore.fmt(r.quantity, 0) + '</td><td>' + PFStore.fmt(r.avgPrice) + '</td></tr>';
        }).join('');
        container.innerHTML =
            '<div class="pf-import-preview-label">' + escHtml(previewLabel) + '</div>' +
            '<div class="pf-import-table-wrap"><table class="pf-import-table"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div>';
    }

    function processImportFile(file, previewEl, errorEl) {
        var name = file.name.toLowerCase();
        errorEl.textContent = '';
        previewEl.innerHTML = '';
        _importRows = [];
        if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
            errorEl.textContent = t('importErrNoFile'); return;
        }
        var reader = new FileReader();
        if (name.endsWith('.csv')) {
            reader.onload = function (e) {
                var rawRows = parseCSV(e.target.result);
                var mapped = mapImportRows(rawRows);
                if (!mapped) { errorEl.textContent = t('importErrCols'); return; }
                _importRows = mapped;
                renderImportPreview(mapped, previewEl);
            };
            reader.readAsText(file);
        } else {
            // XLSX: read as binary, do a simple cell extraction without external libraries
            reader.onload = function (e) {
                try {
                    // Try to use SheetJS if available (CDN not loaded), otherwise show friendly error
                    if (typeof XLSX !== 'undefined') {
                        var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                        var ws = wb.Sheets[wb.SheetNames[0]];
                        var rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                        var mapped = mapImportRows(rawRows);
                        if (!mapped) { errorEl.textContent = t('importErrCols'); return; }
                        _importRows = mapped;
                        renderImportPreview(mapped, previewEl);
                    } else {
                        errorEl.textContent = lang === 'ar'
                            ? 'ملفات XLSX مدعومة. يُرجى تحويل الملف إلى CSV لضمان أفضل توافق.'
                            : 'For XLSX files, please save as CSV for best compatibility. CSV import is fully supported.';
                    }
                } catch (_) { errorEl.textContent = t('importErrCols'); }
            };
            reader.readAsArrayBuffer(file);
        }
    }

    function initImportZone(body) {
        var zone = body.querySelector('#importZone');
        if (!zone) return;

        // Show/hide zone based on currently selected method
        zone.style.display = selectedMethod === 'import' ? '' : 'none';

        var dropArea   = zone.querySelector('#importDropArea');
        var fileInput  = zone.querySelector('#importFileInput');
        var browseBtn  = zone.querySelector('#importBrowseBtn');
        var templateBtn= zone.querySelector('#importTemplateBtn');
        var previewEl  = zone.querySelector('#importPreview');
        var errorEl    = zone.querySelector('#importError');

        // Browse button
        browseBtn.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function () {
            if (fileInput.files[0]) processImportFile(fileInput.files[0], previewEl, errorEl);
        });

        // Template download
        templateBtn.addEventListener('click', downloadSampleTemplate);

        // Drag and drop
        ['dragenter','dragover'].forEach(function (evt) {
            dropArea.addEventListener(evt, function (e) { e.preventDefault(); dropArea.classList.add('drag-over'); });
        });
        ['dragleave','drop'].forEach(function (evt) {
            dropArea.addEventListener(evt, function (e) { e.preventDefault(); dropArea.classList.remove('drag-over'); });
        });
        dropArea.addEventListener('drop', function (e) {
            var file = e.dataTransfer.files[0];
            if (file) processImportFile(file, previewEl, errorEl);
        });
        dropArea.addEventListener('click', function () { fileInput.click(); });
    }

    function submitCreate() {
        var name = document.getElementById('pfName').value.trim();
        if (!name) { document.getElementById('pfName').focus(); return; }
        
        var cashBalance = 0;
        var transactions = [];
        var currency = document.getElementById('pfCurrency').value;

        // ── IMPORT HOLDINGS method ──
        if (selectedMethod === 'import') {
            if (!_importRows || !_importRows.length) {
                var errEl = document.getElementById('importError');
                if (errEl) { errEl.textContent = t('importErrNoRows'); errEl.style.display = ''; }
                return;
            }
            // Sum total cost to create a matching deposit
            var totalInvested = _importRows.reduce(function (sum, r) { return sum + (r.quantity * r.avgPrice); }, 0);
            var depId = 'dep-import-' + Date.now();
            transactions.push({
                id: depId, type: 'deposit',
                date: new Date().toISOString().slice(0, 10),
                symbol: null, companyName: null, quantity: null, price: null,
                commission: 0, tax: 0, currency: currency,
                notes: 'Initial funding from imported holdings',
                amount: totalInvested
            });
            // Create buy transaction for each holding row
            _importRows.forEach(function (r, idx) {
                var comm = Math.round(r.quantity * r.avgPrice * 0.001);
                transactions.push({
                    id: 'tx-imp-' + idx + '-' + Date.now(),
                    type: 'buy',
                    date: new Date().toISOString().slice(0, 10),
                    symbol: r.symbol.toUpperCase(),
                    companyName: PFStore.symMeta(r.symbol).name || r.symbol,
                    quantity: r.quantity,
                    price: r.avgPrice,
                    commission: comm,
                    tax: 0, currency: currency,
                    notes: 'Imported holding'
                });
            });
            cashBalance = 0; // fully invested
        }

        if (selectedMethod === 'watchlist') {
            var initialCash = 500000;
            var watchlist = [];
            try {
                var rawWatch = localStorage.getItem('starta-watchlist');
                if (rawWatch) watchlist = JSON.parse(rawWatch);
            } catch (_) {}

            if (!watchlist || !Array.isArray(watchlist) || !watchlist.length) {
                watchlist = ["COMI", "HRHO", "SWDY", "EAST"];
            }

            // Create initial funding deposit transaction
            transactions.push({
                id: 'dep-' + Date.now(),
                type: 'deposit',
                date: new Date().toISOString().slice(0, 10),
                symbol: null,
                companyName: null,
                quantity: null,
                price: null,
                commission: 0,
                tax: 0,
                currency: currency,
                notes: 'Initial Funding from Watchlist',
                amount: initialCash
            });

            // Allocate a portion of cash to buy watchlist stocks
            var totalToSpend = Math.min(initialCash * 0.8, 400000); // spend up to 80% or 400k max
            var spendPerStock = Math.floor(totalToSpend / watchlist.length);
            var remainingCash = initialCash;

            watchlist.forEach(function (sym) {
                var cleanSym = String(sym || '').trim().toUpperCase();
                if (!cleanSym) return;
                var price = PFStore.lastPrice(cleanSym) || 20.00;
                var qty = Math.floor(spendPerStock / price);
                if (qty > 0) {
                    var cost = qty * price;
                    var comm = Math.round(cost * 0.001);
                    transactions.push({
                        id: 'tx-init-' + cleanSym + '-' + Date.now(),
                        type: 'buy',
                        date: new Date().toISOString().slice(0, 10),
                        symbol: cleanSym,
                        companyName: PFStore.symMeta(cleanSym).name || cleanSym,
                        quantity: qty,
                        price: price,
                        commission: comm,
                        tax: 0,
                        currency: currency,
                        notes: 'Automated initial purchase from Watchlist'
                    });
                    remainingCash -= (cost + comm);
                }
            });
            cashBalance = remainingCash;
        }

        var p = PFStore.create({
            name: name,
            currency: currency,
            benchmark: document.getElementById('pfBenchmark').value,
            riskFreeRate: parseFloat(document.getElementById('pfRiskFree').value) || 25.5,
            description: document.getElementById('pfDesc').value.trim(),
            isDefault: false,
            cashBalance: cashBalance,
            transactions: transactions
        });
        closeModal();
        window.location.href = '/Portfolio/' + p.id;
    }

    function closeModal() {
        document.getElementById('createModal').classList.remove('open');
        document.getElementById('createModalTitle').textContent = t('createModalTitle');
    }

    function openRenameModal(id, currentName) {
        document.getElementById('createModalTitle').textContent = t('renameTitle');
        var body = document.getElementById('createModalBody');
        body.innerHTML =
            '<div class="pf-form">' +
                field('pfRenameInput', t('renameLabel'), '<input type="text" id="pfRenameInput" value="' + escHtml(currentName) + '" required>') +
                '<div style="display:flex;gap:.75rem;justify-content:flex-end;padding-top:.5rem;">' +
                    '<button class="pf-btn" id="cancelRename">' + t('cancel') + '</button>' +
                    '<button class="pf-btn pf-btn--primary" id="submitRename">' + t('renameSave') + '</button>' +
                '</div>' +
            '</div>';
        body.querySelector('#cancelRename').addEventListener('click', closeModal);
        body.querySelector('#submitRename').addEventListener('click', function () {
            var newName = document.getElementById('pfRenameInput').value.trim();
            if (!newName) { document.getElementById('pfRenameInput').focus(); return; }
            PFStore.update(id, { name: newName });
            closeModal();
            render();
        });
        document.getElementById('createModal').classList.add('open');
        setTimeout(function () {
            var inp = document.getElementById('pfRenameInput');
            if (inp) { inp.focus(); inp.select(); }
        }, 60);
    }

    function confirmDelete(id, name) {
        document.getElementById('createModalTitle').textContent = t('deleteTitle');
        var body = document.getElementById('createModalBody');
        var msg = t('deleteConfirm').replace('{name}', '<strong style="color:var(--ink);">' + escHtml(name) + '</strong>');
        body.innerHTML =
            '<p style="color:var(--muted);font-size:.9rem;line-height:1.65;margin:0 0 1.5rem;">' + msg + '</p>' +
            '<div style="display:flex;gap:.75rem;justify-content:flex-end;">' +
                '<button class="pf-btn" id="cancelDelete">' + t('cancel') + '</button>' +
                '<button class="pf-btn pf-btn--danger" id="submitDelete">' + t('deletePortfolio') + '</button>' +
            '</div>';
        body.querySelector('#cancelDelete').addEventListener('click', closeModal);
        body.querySelector('#submitDelete').addEventListener('click', function () {
            PFStore.remove(id);
            closeModal();
            render();
        });
        document.getElementById('createModal').classList.add('open');
    }

    /* ─── Theme / lang toggles (mirrors news-public.js pattern) ──────── */
    function applyLang(l) {
        lang = l; localStorage.setItem('starta-lang', l);
        document.documentElement.lang = l;
        document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
        document.getElementById('langToggle').textContent = l === 'ar' ? 'EN' : 'AR';
        applyNavLang(l);
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
    applyNavLang(lang);

    render();
    PFStore.refreshPrices().then(function () {
        render();
    });

    // M-1: keep portfolio values live — re-pull prices every 60s and whenever
    // the tab regains focus, instead of freezing at the first load.
    setInterval(function () {
        if (!document.hidden) PFStore.refreshPrices(true).then(render);
    }, 60000);
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) PFStore.refreshPrices(true).then(render);
    });

}());
