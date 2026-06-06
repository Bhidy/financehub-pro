(function () {
    "use strict";

    const translations = {
        en: {
            nav_home: "HOME", nav_funds: "MUTUAL FUNDS", nav_pulse: "MARKET PULSE", nav_learn: "LEARN", nav_news: "MARKET NEWS", nav_portfolio: "PORTFOLIO", nav_about: "ABOUT US",
            exchange: "Egyptian Exchange", egx30: "EGX 30 Index", breadth: "Advancers / Decliners", turnover: "Trading Value", volume: "Trading Volume", currency: "EGP", shares: "shares",
            search: "Search a company or symbol", watchlist: "Watchlist", egx_equities: "EGX equities", most_active: "Most Active", gainers: "Gainers", losers: "Losers",
            symbol: "Symbol", last: "Last", change: "Change", quick_stats: "Market Scope", listed: "Listed securities", trading_value: "Trading value", trading_volume: "Trading volume", advancers_decliners: "Advancers / Decliners",
            view_company: "View company", historical_prices: "Historical close prices", loading_chart: "Loading chart data...", chart_unavailable: "Price history is not available for this company yet.",
            open: "Open", high: "High", low: "Low", close: "Close", quote_volume: "Volume", overview: "Overview", financials: "Financials", technicals: "Technicals", news: "News",
            company_overview: "Company overview", sector: "Sector", market_cap: "Market cap", pe: "P/E", pb: "P/B", market_overview: "Market Overview", top_gainers: "Top Gainers", top_losers: "Top Losers", market_news: "Market News", view_all: "View all",
            open_status: "Market open", closed_status: "Market closed", delay_note: "EGX 30 vendor feed delayed by approximately {minutes} minutes.", normal_note: "EGX 30 feed displayed at the available vendor update time.",
            positive_reading: "More listed EGX securities advanced than declined in the latest market snapshot.", negative_reading: "More listed EGX securities declined than advanced in the latest market snapshot.", balanced_reading: "Advancing and declining EGX securities are broadly balanced.",
            no_match: "No company matched your search.", no_news: "No market news available at this time.", company_text: "{name} is listed on the Egyptian Exchange in the {sector} sector. The workspace displays its latest stored quote and available price history.",
            my_watchlist: "My Watchlist", empty_watchlist: "Your watchlist is empty. Click the + button to add your preferred stocks.",
            my_portfolio: "My Portfolio", empty_portfolio: "Selected portfolio is empty. Use the Portfolio page to manage it.",
            add_stock: "Add Stock", add_stock_search: "Search EGX stocks...", added: "Added", add: "Add"
        },
        ar: {
            nav_home: "الرئيسية", nav_funds: "الصناديق الاستثمارية", nav_pulse: "نبض السوق", nav_learn: "تعلّم", nav_news: "أخبار السوق", nav_portfolio: "المحفظة", nav_about: "معلومات عنا",
            exchange: "البورصة المصرية", egx30: "مؤشر EGX 30", breadth: "صاعد / هابط", turnover: "قيمة التداول", volume: "حجم التداول", currency: "جنيه", shares: "سهم",
            search: "ابحث عن شركة أو رمز", watchlist: "قائمة المتابعة", egx_equities: "أسهم EGX", most_active: "الأكثر نشاطا", gainers: "الرابحون", losers: "الخاسرون",
            symbol: "الرمز", last: "الإغلاق", change: "التغير", quick_stats: "نطاق السوق", listed: "الأوراق المقيدة", trading_value: "قيمة التداول", trading_volume: "حجم التداول", advancers_decliners: "صاعد / هابط",
            view_company: "عرض الشركة", historical_prices: "أسعار الإغلاق التاريخية", loading_chart: "جار تحميل بيانات الرسم...", chart_unavailable: "لا تتوفر بيانات تاريخية كافية لهذه الشركة حاليا.",
            open: "الافتتاح", high: "الأعلى", low: "الأدنى", close: "الإغلاق", quote_volume: "الحجم", overview: "نظرة عامة", financials: "الماليات", technicals: "الفنيات", news: "الأخبار",
            company_overview: "نظرة عامة على الشركة", sector: "القطاع", market_cap: "رأس المال السوقي", pe: "مضاعف الربحية", pb: "القيمة الدفترية", market_overview: "نظرة على السوق", top_gainers: "الأكثر صعودا", top_losers: "الأكثر هبوطا", market_news: "أخبار السوق", view_all: "عرض الكل",
            open_status: "السوق مفتوح", closed_status: "السوق مغلق", delay_note: "بيانات مؤشر EGX 30 متأخرة بنحو {minutes} دقيقة وفقا لمصدر البيانات.", normal_note: "يعرض مؤشر EGX 30 وفق أحدث توقيت متاح من مصدر البيانات.",
            positive_reading: "زاد عدد الأوراق المالية الصاعدة في EGX عن الهابطة في أحدث لقطة متاحة للسوق.", negative_reading: "زاد عدد الأوراق المالية الهابطة في EGX عن الصاعدة في أحدث لقطة متاحة للسوق.", balanced_reading: "أعداد الأوراق المالية الصاعدة والهابطة في EGX متقاربة.",
            no_match: "لا توجد شركة مطابقة لبحثك.", no_news: "لا تتوفر أخبار سوق حاليا.", company_text: "{name} شركة مقيدة في البورصة المصرية ضمن قطاع {sector}. تعرض هذه الشاشة آخر سعر مخزن والسجل السعري المتاح.",
            my_watchlist: "قائمتي", empty_watchlist: "قائمة المتابعة الخاصة بك فارغة. انقر على زر + لإضافة أسهمك المفضلة.",
            my_portfolio: "محفظتي", empty_portfolio: "المحفظة المحددة فارغة. استخدم صفحة المحفظة لإدارتها.",
            add_stock: "إضافة سهم", add_stock_search: "ابحث عن أسهم EGX...", added: "مُضاف", add: "إضافة"
        }
    };

    const state = {
        lang: "en",
        stocks: [],
        summary: null,
        index: null,
        news: [],
        selectedNews: [],
        history: [],
        selected: "COMI",
        watchTab: "custom",
        moversTab: "active",
        days: 90,
        query: "",
        marketLoading: true,
        historyLoading: true,
        // Yahoo Finance enrichment cache: keyed by symbol
        yahooProfiles: {},
        yahooProfileLoading: false
    };
    const byId = (id) => document.getElementById(id);

    // World-class interactive tooltip element initialization
    let tooltipDiv = byId("chartTooltip");
    if (!tooltipDiv) {
        tooltipDiv = document.createElement("div");
        tooltipDiv.id = "chartTooltip";
        tooltipDiv.className = "chart-tooltip";
        document.body.appendChild(tooltipDiv);
    }

    window.showChartTooltip = function(event, title, value) {
        tooltipDiv.style.display = "block";
        tooltipDiv.innerHTML = `<span>${escapeHtml(title)}</span><strong>${escapeHtml(value)}</strong>`;
        window.moveChartTooltip(event);
    };
    window.moveChartTooltip = function(event) {
        const x = event.pageX + 15;
        const y = event.pageY - 40;
        tooltipDiv.style.left = `${x}px`;
        tooltipDiv.style.top = `${y}px`;
    };
    window.hideChartTooltip = function() {
        tooltipDiv.style.display = "none";
    };
    const labels = () => translations[state.lang];
    const locale = () => state.lang === "ar" ? "ar-EG" : "en-US";
    const safe = (value) => String(value == null ? "" : value);
    const escapeHtml = (value) => safe(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
    const number = (value) => {
        if (value === null || value === undefined || value === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    };
    const percentClass = (value) => number(value) == null ? "" : number(value) >= 0 ? "positive" : "negative";
    const formatNumber = (value, digits = 2) => number(value) == null ? "--" : new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(number(value));
    const compact = (value) => number(value) == null ? "--" : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(number(value));
    const percent = (value) => number(value) == null ? "--" : `${number(value) >= 0 ? "+" : ""}${formatNumber(value, 2)}%`;
    const formatDate = (value) => value ? new Intl.DateTimeFormat(locale(), { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "--";
    const stockName = (stock) => state.lang === "ar" && /[\u0600-\u06FF]/.test(safe(stock.name_ar)) ? stock.name_ar : stock.name_en;
    const sectorTranslations = {
        Banks: "البنوك",
        "Financial Services": "الخدمات المالية",
        "Real Estate": "العقارات",
        "Basic Resources": "الموارد الأساسية",
        "Health Care & Pharmaceuticals": "الرعاية الصحية والأدوية",
        "IT , Media and Communication Services": "تكنولوجيا المعلومات والإعلام والاتصالات",
        "Industrial Goods , Services and Automobiles": "السلع والخدمات الصناعية والسيارات",
        "Contracting and Construction Engineering": "المقاولات والإنشاءات الهندسية"
    };
    const sectorName = (sector) => state.lang === "ar" ? (sectorTranslations[sector] || sector || "--") : (sector || "--");
    const selectedStock = () => state.stocks.find((stock) => stock.symbol === state.selected) || state.stocks[0];

    async function request(url, fetchOptions) {
        const response = await fetch(url, fetchOptions || { cache: "no-store" });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json();
    }

    // ── Session cache: zero-flash revisits (5-min TTL) ───────────────────
    const CACHE_KEY = "starta-mp-v1";
    const CACHE_TTL = 5 * 60 * 1000;
    function saveToCache(data) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })); } catch (_) {}
    }
    function loadFromCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.ts > CACHE_TTL) return null;
            return parsed.data;
        } catch (_) { return null; }
    }

    // ── Hover prefetch: warm history before user clicks ──────────────────
    const _prefetched = new Set();
    function prefetchHistory(symbol) {
        if (!symbol || _prefetched.has(symbol) || symbol === state.selected) return;
        _prefetched.add(symbol);
        fetch(`/api/v1/egx/history/${encodeURIComponent(symbol)}?period=max`, { cache: "default", priority: "low" }).catch(() => {});
    }
    // ────────────────────────────────────────────────────────────────────

    function setText(id, value, className) {
        const target = byId(id);
        if (!target) return;
        target.textContent = value;
        if (className) target.className = className;
    }

    function setLanguage(lang, refreshNews) {
        state.lang = lang === "ar" ? "ar" : "en";
        localStorage.setItem("starta-lang", state.lang);
        localStorage.setItem("lang", state.lang);
        document.documentElement.lang = state.lang;
        document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
        byId("langToggle").textContent = state.lang === "ar" ? "EN" : "AR";
        document.querySelectorAll("[data-key]").forEach((element) => {
            const value = labels()[element.dataset.key];
            if (value) element.textContent = value;
        });
        document.querySelectorAll("[data-placeholder]").forEach((element) => {
            const value = labels()[element.dataset.placeholder];
            if (value) element.setAttribute("placeholder", value);
        });
        render();
        if (refreshNews) {
            loadNews();
            loadSelectedSymbolNews();
        }
    }

    function renderRibbon() {
        const indexQuote = state.index && state.index.quote || {};
        const summary = state.summary || {};
        setText("indexValue", formatNumber(indexQuote.value, 2));
        setText("indexChange", percent(indexQuote.changePercent), `tabular ${percentClass(indexQuote.changePercent)}`);
        setText("advanceDecline", `${formatNumber(summary.advancing, 0)} / ${formatNumber(summary.declining, 0)}`);
        const marketOpen = summary.market_status === "OPEN";
        setText("marketStatus", marketOpen ? labels().open_status : labels().closed_status, `status-pill ${marketOpen ? "positive" : ""}`);
        setText("marketTurnover", compact(summary.total_turnover));
        setText("marketVolume", compact(summary.total_volume));
        setText("totalStocks", formatNumber(summary.total_stocks, 0));
        setText("totalTurnover", `${compact(summary.total_turnover)} ${labels().currency}`);
        setText("totalVolume", compact(summary.total_volume));
        setText("breadthCount", `${formatNumber(summary.advancing, 0)} / ${formatNumber(summary.declining, 0)}`, "tabular positive");
        setText("footerStatus", marketOpen ? labels().open_status : labels().closed_status, "tape-status");
        const activeTotal = Math.max(1, (number(summary.advancing) || 0) + (number(summary.declining) || 0));
        byId("upBreadth").style.width = `${((number(summary.advancing) || 0) / activeTotal) * 100}%`;
        byId("downBreadth").style.width = `${((number(summary.declining) || 0) / activeTotal) * 100}%`;
        const advancers = number(summary.advancing);
        const decliners = number(summary.declining);
        const reading = advancers == null || decliners == null ? "" : advancers > decliners ? labels().positive_reading : advancers < decliners ? labels().negative_reading : labels().balanced_reading;
        setText("marketReading", reading);
    }

    function sortedStocks(mode) {
        const rows = state.stocks.slice();
        if (mode === "gainers") return rows.filter((item) => number(item.change_percent) > 0).sort((a, b) => number(b.change_percent) - number(a.change_percent));
        if (mode === "losers") return rows.filter((item) => number(item.change_percent) < 0).sort((a, b) => number(a.change_percent) - number(b.change_percent));
        return rows.sort((a, b) => (number(b.volume) || 0) - (number(a.volume) || 0));
    }

    function getCustomWatchlist() {
        try {
            const raw = localStorage.getItem("starta-watchlist");
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        const seed = ["COMI", "HRHO", "SWDY", "EAST"];
        try {
            localStorage.setItem("starta-watchlist", JSON.stringify(seed));
        } catch (_) {}
        return seed;
    }

    // SVG icons for the favourite bookmark button
    const FAV_SVG_INACTIVE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
    const FAV_SVG_ACTIVE   = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

    function updateFavBtn(symbol) {
        const favBtn = byId("favBtn");
        if (!favBtn) return;
        const active = getCustomWatchlist().includes(symbol);
        favBtn.classList.toggle("active", active);
        favBtn.innerHTML = active ? FAV_SVG_ACTIVE : FAV_SVG_INACTIVE;
        favBtn.title = active
            ? (state.lang === "ar" ? "إزالة من القائمة" : "Remove from watchlist")
            : (state.lang === "ar" ? "إضافة إلى القائمة" : "Add to watchlist");
    }

    function toggleCustomWatchlist(symbol) {
        if (!symbol) return;
        const list = getCustomWatchlist();
        const index = list.indexOf(symbol);
        if (index > -1) { list.splice(index, 1); } else { list.push(symbol); }
        try { localStorage.setItem("starta-watchlist", JSON.stringify(list)); } catch (_) {}
        updateFavBtn(symbol);
        if (state.watchTab === "custom") renderWatchlist();
    }

    function renderWatchlist() {
        let rows = [];
        if (state.watchTab === "custom") {
            const list = getCustomWatchlist();
            rows = state.stocks.filter((item) => list.includes(item.symbol));
        } else if (state.watchTab === "portfolio") {
            const select = byId("portfolioSelect");
            const portfolioId = select ? select.value : null;
            if (portfolioId && window.PFStore) {
                const portfolio = window.PFStore.get(portfolioId);
                if (portfolio) {
                    const metrics = window.PFStore.computeMetrics(portfolio);
                    const holdingsSymbols = (metrics.holdings || []).map(h => h.symbol);
                    rows = state.stocks.filter((item) => holdingsSymbols.includes(item.symbol));
                }
            }
        } else {
            rows = sortedStocks(state.watchTab);
        }
        const query = state.query.trim().toLowerCase();
        if (query) rows = rows.filter((item) => `${item.symbol} ${item.name_en} ${item.name_ar || ""}`.toLowerCase().includes(query));
        const limit = (state.watchTab === "custom" || state.watchTab === "portfolio") ? 30 : 8;
        rows = rows.slice(0, limit);
        const container = byId("watchlistRows");
        if (!rows.length) {
            const msg = state.watchTab === "custom" 
                ? labels().empty_watchlist 
                : (state.watchTab === "portfolio" 
                    ? labels().empty_portfolio 
                    : labels().no_match);
            container.innerHTML = `<div class="empty-inline">${escapeHtml(msg)}</div>`;
            return;
        }
        container.innerHTML = rows.map((item) => `
            <button class="watch-row ${item.symbol === state.selected ? "active" : ""}" type="button" data-symbol="${escapeHtml(item.symbol)}">
                <span class="stock-ident">
                    <img class="stock-ident-logo" src="/logos/${escapeHtml(item.symbol)}.svg" alt="" onerror="this.style.display='none';">
                    <span class="stock-ident-text">
                        <strong>${escapeHtml(item.symbol)}</strong>
                        <small>${escapeHtml(stockName(item))}</small>
                    </span>
                </span>
                <span class="price-cell tabular">${formatNumber(item.last_price)}</span>
                <span class="change-cell tabular ${percentClass(item.change_percent)}">${percent(item.change_percent)}</span>
            </button>`).join("");
        container.querySelectorAll("[data-symbol]").forEach((button) => {
            button.addEventListener("click", () => selectStock(button.dataset.symbol));
            button.addEventListener("pointerenter", () => prefetchHistory(button.dataset.symbol), { passive: true });
        });
    }

    function getHistoricalCloseData() {
        if (!state.history || !state.history.length) return null;
        const sorted = state.history.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
        const cleanRows = sorted.filter(item => {
            const o = number(item.open);
            const h = number(item.high);
            const l = number(item.low);
            const c = number(item.close);
            return o > 0 && h > 0 && l > 0 && c > 0;
        });
        if (!cleanRows.length) return null;
        const latest = cleanRows[cleanRows.length - 1];
        let change = 0;
        let changePercent = 0;
        if (cleanRows.length >= 2) {
            const previous = cleanRows[cleanRows.length - 2];
            change = latest.close - previous.close;
            changePercent = (change / previous.close) * 100;
        }
        return {
            close: latest.close,
            change: change,
            changePercent: changePercent
        };
    }

    function renderSelected() {
        const item = selectedStock();
        if (!item) return;
        setText("selectedSymbol", item.symbol);
        setText("selectedName", stockName(item));
        let priceVal = item.last_price;
        let changePct = item.change_percent;

        const hist = getHistoricalCloseData();
        if (hist) {
            priceVal = hist.close;
        } else if (state.historyLoading) {
            priceVal = null;
            changePct = null;
        }

        setText("selectedPrice", priceVal !== null ? formatNumber(priceVal) : "...");
        setText("selectedChange", changePct !== null ? percent(changePct) : "...", `tabular ${percentClass(changePct)}`);
        
        // Stock Header Logo Integration
        const logoImg = byId("selectedLogo");
        const logoFallback = document.querySelector(".logo-fallback");
        if (logoImg && logoFallback) {
            logoImg.src = `/logos/${item.symbol}.svg`;
            logoImg.style.display = "block";
            logoFallback.style.display = "none";
            logoFallback.textContent = item.symbol.substring(0, 2);
        }

        // Update Watchlist Toggle Button State
        updateFavBtn(item.symbol);

        const actionBtn = byId("companyAction");
        if (actionBtn) {
            actionBtn.href = `/symbol/${item.symbol}`;
        }

        renderOverviewTab();
    }

    // ── Real RSI-14 & SMA calculator from OHLC history ──────────────────
    function calcSMA(closes, period) {
        if (closes.length < period) return null;
        const slice = closes.slice(-period);
        return slice.reduce((a, b) => a + b, 0) / period;
    }
    function calcRSI(closes, period) {
        if (closes.length < period + 1) return null;
        const changes = closes.slice(1).map((c, i) => c - closes[i]);
        const last = changes.slice(-period);
        const gains = last.map(c => c > 0 ? c : 0);
        const losses = last.map(c => c < 0 ? -c : 0);
        const avgGain = gains.reduce((a, b) => a + b, 0) / period;
        const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    // ────────────────────────────────────────────────────────────────────

    function renderOverviewTab() {
        const item = selectedStock();
        if (!item) return;
        const contentContainer = document.querySelector(".overview-content");
        if (!contentContainer) return;
        
        const tab = state.overviewTab || "overview";
        const yp = state.yahooProfiles[state.selected] || {};
        
        if (tab === "overview") {
            const sector = sectorName(item.sector_name);
            // Use Yahoo description if available, otherwise fall back to template
            const description = yp.description
                ? yp.description
                : labels().company_text.replace("{name}", stockName(item)).replace("{sector}", sector);

            // 52-Week Range bar - revamped with ultra-premium styling
            const yearHigh = number(yp.year_high || item.high_52w);
            const yearLow  = number(yp.year_low  || item.low_52w);
            const curPrice = number(yp.price     || item.last_price);
            let rangeBar = "";
            if (yearHigh && yearLow && yearHigh > yearLow) {
                const pct = Math.min(100, Math.max(0, ((curPrice - yearLow) / (yearHigh - yearLow)) * 100));
                const rangeLabelLow = state.lang === "ar" ? "أدنى ٥٢ أسبوع" : "52W Low";
                const rangeLabelHigh = state.lang === "ar" ? "أعلى ٥٢ أسبوع" : "52W High";
                const currentLabel = state.lang === "ar" ? "السعر الحالي عند" : "Current price is at";
                const rangePctLabel = state.lang === "ar" ? "من النطاق" : "of the 52W range";
                rangeBar = `
                    <div style="margin: 1.4rem 0 1.2rem; background: rgba(20, 184, 166, 0.02); padding: 16px 20px; border-radius: 16px; border: 1px solid rgba(20, 184, 166, 0.08);">
                        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--muted);margin-bottom:8px;font-weight:600;">
                            <span>${rangeLabelLow}: <strong class="tabular" style="color:var(--red);font-size:0.82rem;font-weight:700;margin-inline-start:4px;">${formatNumber(yearLow)}</strong></span>
                            <span>${rangeLabelHigh}: <strong class="tabular" style="color:var(--green);font-size:0.82rem;font-weight:700;margin-inline-start:4px;">${formatNumber(yearHigh)}</strong></span>
                        </div>
                        <div style="height:6px;background:var(--surface);border-radius:8px;position:relative;margin:8px 0;">
                            <div style="position:absolute;left:0;top:0;height:100%;width:${pct.toFixed(1)}%;background:linear-gradient(90deg,var(--red),var(--teal-dark));border-radius:8px;"></div>
                            <div style="position:absolute;left:${pct.toFixed(1)}%;top:-4px;width:14px;height:14px;border-radius:50%;background:var(--teal);border:3px solid var(--bg);transform:translateX(-50%);box-shadow:0 0 8px var(--teal);transition: left 0.3s ease;"></div>
                        </div>
                        <div style="text-align:center;font-size:0.68rem;color:var(--muted);font-weight:600;margin-top:6px;">
                            ${currentLabel} <strong class="tabular" style="color:var(--teal-dark);font-size:0.75rem;">${pct.toFixed(1)}%</strong> ${rangePctLabel}
                        </div>
                    </div>`;
            }

            // Website & extra meta badges
            const websiteHtml = yp.website ? `<a href="${escapeHtml(yp.website)}" target="_blank" rel="noopener" style="color:var(--teal-dark);font-size:0.72rem;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-top:0.5rem;opacity:0.85;"><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' style='width:0.8rem;height:0.8rem'><circle cx='12' cy='12' r='10'/><path d='M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'/></svg>${escapeHtml(yp.website.replace(/https?:\/\/(www\.)?/, ""))}</a>` : "";
            const industryBadge = yp.industry ? `<span style="background:rgba(20,184,166,.1);border:1px solid rgba(20,184,166,.2);border-radius:20px;padding:2px 10px;font-size:0.68rem;font-weight:600;color:var(--teal-dark);display:inline-block;margin-top:0.35rem;">${escapeHtml(yp.industry)}</span>` : "";

            // Stats to display — prefer Yahoo, fall back to DB
            const mcap     = yp.market_cap    || item.market_cap;
            const pe       = yp.pe_ratio      || item.pe_ratio;
            const pb       = yp.price_to_book || item.pb_ratio;
            const divYield = yp.dividend_yield;
            const beta     = yp.beta;
            const avgVol   = yp.avg_vol_10d;
            const employees= yp.employees;

            const facts = [
                [labels().sector,     escapeHtml(sector)],
                [labels().market_cap, `${compact(mcap)} ${labels().currency}`],
                [labels().pe,         formatNumber(pe)],
                [labels().pb,         formatNumber(pb)],
            ];
            if (divYield != null) facts.push([state.lang==="ar"?"عائد التوزيعات":"Dividend Yield", `${formatNumber(divYield)}%`]);
            if (beta     != null) facts.push([state.lang==="ar"?"بيتا":"Beta",               formatNumber(beta)]);
            if (avgVol   != null) facts.push([state.lang==="ar"?"متوسط الحجم 10 أيام":"Avg Vol (10D)", compact(avgVol)]);
            if (employees!= null) facts.push([state.lang==="ar"?"عدد الموظفين":"Employees",      new Intl.NumberFormat("en-US").format(employees)]);

            function getFactIcon(key) {
                const k = key.toLowerCase();
                if (k.includes("sector") || k.includes("القطاع")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="16"></line><line x1="15" y1="22" x2="15" y2="16"></line><line x1="9" y1="16" x2="15" y2="16"></line><path d="M9 8h.01"></path><path d="M15 8h.01"></path><path d="M9 12h.01"></path><path d="M15 12h.01"></path></svg>`;
                }
                if (k.includes("cap") || k.includes("سوقية")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
                }
                if (k.includes("p/e") || k.includes("ربحية")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`;
                }
                if (k.includes("p/b") || k.includes("دفترية")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
                }
                if (k.includes("dividend") || k.includes("عائد")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
                }
                if (k.includes("beta") || k.includes("بيتا")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`;
                }
                if (k.includes("vol") || k.includes("حجم")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
                }
                if (k.includes("employee") || k.includes("موظف")) {
                    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
                }
                return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 1.1rem; height: 1.1rem;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
            }

            contentContainer.innerHTML = `
                <div style="grid-column:1/-1;width:100%;">
                    <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">
                        <h2 class="display" style="margin:0;font-size:1.05rem;">${escapeHtml(labels().company_overview)}</h2>
                        ${industryBadge}
                    </div>
                    <p id="companyDescription" style="font-size:0.82rem;line-height:1.6;color:var(--muted);margin:0.5rem 0 0.2rem;max-height:120px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(20,184,166,0.2) transparent;">${escapeHtml(description)}</p>
                    ${websiteHtml}
                    ${rangeBar}
                </div>
                <div class="company-facts-grid" style="grid-column:1/-1;width:100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-top:0.8rem;">
                    ${facts.map(([dt, dd]) => `
                        <div class="fact-card" style="background:rgba(20,184,166,0.03);border:1px solid rgba(20,184,166,0.1);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;transition:all 0.2s ease;">
                            <div style="background:rgba(20,184,166,0.08);border-radius:8px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--teal-dark);">
                                ${getFactIcon(dt)}
                            </div>
                            <div style="min-w-0;flex-grow:1;">
                                <div style="color:var(--muted);font-size:0.65rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${dt}</div>
                                <div class="tabular" style="margin:0;color:var(--ink);font-size:0.92rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${dd}</div>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
        } else if (tab === "financials") {
            const isAr = state.lang === "ar";
            
            // Labels
            const revLabel = isAr ? "الإيرادات" : "Revenue";
            const netLabel = isAr ? "صافي الدخل" : "Net Income";
            const peLabel = isAr ? "مضاعف الربحية (P/E)" : "P/E Ratio";
            const pbLabel = isAr ? "مضاعف القيمة الدفترية (P/B)" : "P/B Ratio";
            const divLabel = isAr ? "عائد التوزيعات" : "Dividend Yield";
            const opLabel = isAr ? "هامش التشغيل" : "Operating Margin";
            const viewMoreLabel = isAr ? "عرض المزيد من البيانات المالية" : "View More Financials";
            
            // Check if loading and cache is empty
            const isLoading = state.yahooProfileLoading && !yp.total_revenue;
            
            if (isLoading) {
                // Return beautiful pulsing shimmer cards
                contentContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; width: 100%;">
                        <h2 class="display" style="margin-bottom: 1.2rem;">${isAr ? "البيانات المالية الأساسية" : "Key Financial Indicators"}</h2>
                        <div style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; display: grid; margin-bottom: 1.5rem;">
                            ${Array(6).fill(`<div style="height: 90px; border-radius: 12px; border: 1px solid var(--line); background: linear-gradient(95deg, var(--surface-soft), var(--surface), var(--surface-soft)); background-size: 220% 100%; animation: shimmer 1.5s linear infinite;"></div>`).join("")}
                        </div>
                    </div>
                `;
                return;
            }
            
            // Extract Values with Robust Fallbacks
            const revenueVal = yp.total_revenue != null ? yp.total_revenue : item.revenue;
            const profitMargin = yp.profit_margin != null ? yp.profit_margin : null;
            
            let netIncomeVal = null;
            if (revenueVal != null && profitMargin != null) {
                netIncomeVal = revenueVal * profitMargin;
            } else {
                netIncomeVal = item.net_income;
            }
            
            const peVal = yp.pe_ratio != null ? yp.pe_ratio : item.pe_ratio;
            const pbVal = yp.price_to_book != null ? yp.price_to_book : item.pb_ratio;
            const opMarginVal = yp.operating_margin != null ? yp.operating_margin : null;
            
            // Format Dividend Yield
            let divYieldVal = "--";
            if (yp.dividend_yield != null) {
                let dy = yp.dividend_yield;
                if (dy > 0 && dy < 1) dy = dy * 100;
                divYieldVal = formatNumber(dy, 2) + "%";
            } else if (item.dividend_yield != null) {
                let dy = item.dividend_yield;
                if (dy > 0 && dy < 1) dy = dy * 100;
                divYieldVal = formatNumber(dy, 2) + "%";
            }
            
            const formattedRevenue = revenueVal != null ? `${compact(revenueVal)} ${labels().currency}` : "--";
            const formattedNetIncome = netIncomeVal != null ? `${compact(netIncomeVal)} ${labels().currency}` : "--";
            const netIncomeColor = netIncomeVal != null ? (number(netIncomeVal) >= 0 ? "var(--green)" : "var(--red)") : "var(--ink)";
            
            const formattedPe = peVal != null ? formatNumber(peVal, 2) : "--";
            const formattedPb = pbVal != null ? formatNumber(pbVal, 2) : "--";
            const formattedOpMargin = opMarginVal != null ? `${formatNumber(opMarginVal * 100, 2)}%` : "--";
            
            const cards = [
                { title: revLabel, value: formattedRevenue, color: "var(--ink)" },
                { title: netLabel, value: formattedNetIncome, color: netIncomeColor },
                { title: peLabel, value: formattedPe, color: "var(--ink)" },
                { title: pbLabel, value: formattedPb, color: "var(--ink)" },
                { title: divLabel, value: divYieldVal, color: "var(--ink)" },
                { title: opLabel, value: formattedOpMargin, color: "var(--ink)" }
            ];
            
            const cardHtml = (title, val, color="var(--ink)") => `
                <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15); transition: all 0.2s ease;">
                    <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">${title}</div>
                    <div style="font-size: 1.3rem; font-weight: 700; color: ${color}; margin-top: 5px;" class="tabular">${val}</div>
                </div>`;
            
            contentContainer.innerHTML = `
                <div style="grid-column: 1 / -1; width: 100%;">
                    <h2 class="display" style="margin-bottom: 1.2rem;">${isAr ? "البيانات المالية الأساسية" : "Key Financial Indicators"}</h2>
                    <div style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; display: grid; margin-bottom: 1.8rem;">
                        ${cards.map(c => cardHtml(c.title, c.value, c.color)).join("")}
                    </div>
                    <div style="display: flex; justify-content: center; width: 100%;">
                        <a href="/symbol/${encodeURIComponent(item.symbol)}?tab=financials" class="quick-view-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 10px 24px;">
                            ${viewMoreLabel}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 0.9rem; height: 0.9rem; transform: ${isAr ? "rotate(180deg)" : "none"}">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </a>
                    </div>
                </div>
            `;
        } else if (tab === "technicals") {
            const isAr = state.lang === "ar";
            const closes = state.history.map(day => number(day.close)).filter(c => c > 0);
            
            // Real computed indicators (no more hardcoded values)
            const sma50  = calcSMA(closes, 50)  || item.last_price;
            const sma200 = calcSMA(closes, 200) || item.last_price;
            const rsi14  = calcRSI(closes, 14);
            const rsiDisplay = rsi14 != null ? formatNumber(rsi14) : "--";
            
            const rsiSignal = rsi14 != null
                ? (rsi14 >= 70 ? (isAr ? "ذروة الشراء" : "Overbought") : rsi14 <= 30 ? (isAr ? "ذروة البيع" : "Oversold") : (isAr ? "محايد" : "Neutral"))
                : "--";
            const rsiColor = rsi14 != null ? (rsi14 >= 70 ? "var(--red)" : rsi14 <= 30 ? "var(--green)" : "var(--ink)") : "var(--muted)";
            const trend = item.last_price >= sma50 ? (isAr ? "صاعد" : "Bullish") : (isAr ? "هابط" : "Bearish");
            const trendColor = item.last_price >= sma50 ? "var(--green)" : "var(--red)";
            const goldenCross = sma50 > sma200;
            const crossText = goldenCross ? (isAr ? "تقاطع ذهبي" : "Golden Cross") : (isAr ? "تقاطع ميت" : "Death Cross");
            const crossColor = goldenCross ? "var(--green)" : "var(--red)";
            const dataQuality = closes.length >= 200 ? (isAr ? "بيانات كاملة" : "Full Data") : closes.length >= 50 ? (isAr ? "بيانات كافية" : "Sufficient") : (isAr ? "بيانات محدودة" : "Limited Data");

            const card = (title, val, color="var(--ink)", sub="") => `
                <div style="background:rgba(20,184,166,0.05);padding:15px;border-radius:12px;border:1px solid rgba(20,184,166,0.15);">
                    <div style="color:var(--muted);font-size:0.72rem;font-weight:600;">${title}</div>
                    <div style="font-size:1.15rem;font-weight:700;color:${color};margin-top:5px;" class="tabular">${val}</div>
                    ${sub ? `<div style="font-size:0.65rem;color:var(--muted);margin-top:3px;">${sub}</div>` : ""}
                </div>`;

            contentContainer.innerHTML = `
                <div style="grid-column:1/-1;width:100%;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:0.5rem;">
                        <h2 class="display" style="margin:0;">${isAr ? "التحليل الفني" : "Technical Analysis"}</h2>
                        <span style="font-size:0.65rem;color:var(--muted);border:1px solid var(--line);border-radius:12px;padding:2px 8px;">${isAr?"استناداً إلى":"Based on"} ${closes.length} ${isAr?"يوم من البيانات ·":"days ·"} ${dataQuality}</span>
                    </div>
                    <div style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1.2rem;display:grid;">
                        ${card(isAr?"الاتجاه العام":"Trend", trend, trendColor, `vs SMA50: ${formatNumber(sma50)}`)}
                        ${card("SMA (50)",  formatNumber(sma50)  + " " + labels().currency, "var(--ink)")}
                        ${card("SMA (200)", formatNumber(sma200) + " " + labels().currency, "var(--ink)", `50/200 ${crossText}`)}
                        ${card("RSI (14)",  rsiDisplay, rsiColor, rsiSignal)}
                    </div>
                </div>
            `;
        } else if (tab === "news") {
            const isAr = state.lang === "ar";
            const displayNews = state.selectedNews || [];
            
            if (!displayNews.length) {
                const msg = isAr 
                    ? `لا توجد أخبار حديثة متاحة لـ ${item.symbol}.` 
                    : `No recent news available for ${item.symbol}.`;
                
                contentContainer.innerHTML = `
                    <div style="grid-column: 1 / -1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1.5rem; background: rgba(20, 184, 166, 0.02); border: 1px dashed rgba(20, 184, 166, 0.18); border-radius: 16px; text-align: center;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width: 2.5rem; height: 2.5rem; color: var(--teal-dark); opacity: 0.8; margin-bottom: 1rem;">
                            <path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 4v10a2 2 0 0 1-2 2H9" />
                            <path d="M16 8h6M16 12h6M16 16h6" />
                        </svg>
                        <h3 style="font-size: 0.95rem; font-weight: 600; color: var(--ink); margin-bottom: 0.35rem;">
                            ${isAr ? "لا توجد أخبار" : "No News Available"}
                        </h3>
                        <p style="color: var(--muted); font-size: 0.78rem; max-width: 280px; margin: 0; line-height: 1.5;">
                            ${escapeHtml(msg)}
                        </p>
                    </div>
                `;
                return;
            }
            
            // Limit to max 3 news
            const slicedNews = displayNews.slice(0, 3);
            const viewMoreLabel = isAr ? "عرض المزيد من الأخبار" : "View More News";
            
            contentContainer.innerHTML = `
                <div style="grid-column: 1 / -1; width: 100%;">
                    <h2 class="display" style="margin-bottom: 1.2rem;">${isAr ? `آخر أخبار ${item.symbol}` : `Latest ${item.symbol} News`}</h2>
                    <div style="display: grid; gap: 1.2rem; margin-bottom: 1.8rem;">
                        ${slicedNews.map((article) => {
                            const coverUrl = getNewsCover(article);
                            return `
                                <a class="news-card" href="/News/${encodeURIComponent(article.id)}" style="display: grid; grid-template-columns: 6.5rem 1fr; gap: 1.2rem; border-bottom: 1px solid var(--line-soft, rgba(20, 184, 166, 0.08)); padding-bottom: 1.2rem; align-items: start; transition: transform 0.2s ease;">
                                    <div class="news-media" style="width: 6.5rem; height: 5rem; border-radius: 12px; overflow: hidden; background: #ffffff; position: relative; border: 1px solid var(--line-soft, rgba(20, 184, 166, 0.08));">
                                        <img alt="" loading="lazy" src="${escapeHtml(coverUrl)}" style="width: 100%; height: 100%; object-fit: contain;">
                                    </div>
                                    <div class="news-copy" style="display: flex; flex-direction: column; justify-content: space-between; height: 5rem;">
                                        <h3 style="font-size: 0.88rem; font-weight: 700; margin: 0 0 0.5rem; color: var(--ink); line-height: 1.45; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHtml(article.headline)}</h3>
                                        <time style="color: var(--muted); font-size: 0.68rem; font-weight: 500; display: flex; align-items: center; gap: 0.3rem;">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 0.72rem; height: 0.72rem; opacity: 0.7;">
                                                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                                            </svg>
                                            ${escapeHtml(formatDate(article.published_at))}
                                        </time>
                                    </div>
                                </a>
                            `;
                        }).join("")}
                    </div>
                    <div style="display: flex; justify-content: center; width: 100%;">
                        <a href="/symbol/${encodeURIComponent(item.symbol)}?tab=news" class="quick-view-btn" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 10px 24px;">
                            ${viewMoreLabel}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 0.9rem; height: 0.9rem; transform: ${isAr ? "rotate(180deg)" : "none"}">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </a>
                    </div>
                </div>
            `;
        }
    }

    function lineChart(svg, points, options) {
        const width = options.width;
        const height = options.height;
        const pad = options.pad || { top: 20, right: 42, bottom: 32, left: 8 };
        if (!points.length) {
            svg.innerHTML = "";
            return;
        }
        points = points.filter((point) => number(point.value) !== null);
        if (!points.length) {
            svg.innerHTML = "";
            return;
        }
        const values = points.map((point) => point.value);
        let minimum = Math.min(...values);
        let maximum = Math.max(...values);
        if (minimum === maximum) { minimum -= 1; maximum += 1; }
        const range = maximum - minimum;
        minimum -= range * .02;
        maximum += range * .02;
        const plotWidth = width - pad.left - pad.right;
        const plotHeight = height - pad.top - pad.bottom;
        const coords = points.map((point, index) => ({
            x: pad.left + (points.length === 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1)),
            y: pad.top + ((maximum - point.value) / (maximum - minimum)) * plotHeight,
            date: point.date,
            value: point.value
        }));
        const path = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
        const area = `${path} L ${coords[coords.length - 1].x} ${height - pad.bottom} L ${coords[0].x} ${height - pad.bottom} Z`;
        const horizontal = [0, .25, .5, .75, 1].map((ratio) => {
            const y = pad.top + ratio * plotHeight;
            const value = maximum - ratio * (maximum - minimum);
            return `<path d="M ${pad.left} ${y} H ${width - pad.right}" class="gridline"/><text x="${width - pad.right + 7}" y="${y + 4}" class="axis">${formatNumber(value)}</text>`;
        }).join("");
        const labelsToShow = [0, Math.floor((points.length - 1) / 2), points.length - 1];
        const dates = labelsToShow.map((index) => `<text x="${coords[index].x}" y="${height - 7}" text-anchor="${index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}" class="axis">${escapeHtml(new Intl.DateTimeFormat(locale(), { month: "short", day: "numeric" }).format(new Date(points[index].date)))}</text>`).join("");
        const last = coords[coords.length - 1];
        const slot = plotWidth / coords.length;
        const hoverBars = coords.map((point) => {
            const barX = point.x - slot / 2;
            const title = formatDate(point.date);
            const value = `${formatNumber(point.value)} ${labels().currency}`;
            return `<rect x="${barX.toFixed(2)}" y="0" width="${slot.toFixed(2)}" height="${height}" fill="transparent" class="hover-bar" onmouseover="showChartTooltip(event, '${escapeHtml(title)}', '${escapeHtml(value)}')" onmousemove="moveChartTooltip(event)" onmouseout="hideChartTooltip()"/>`;
        }).join("");

        svg.innerHTML = `
            <defs><linearGradient id="${options.gradient}" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${options.color}" stop-opacity=".18"/><stop offset="1" stop-color="${options.color}" stop-opacity="0"/></linearGradient></defs>
            ${horizontal}
            <path d="${area}" fill="url(#${options.gradient})"/>
            <path d="${path}" fill="none" stroke="${options.color}" stroke-width="${options.stroke || 2.2}" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${last.x}" cy="${last.y}" r="4" fill="${options.color}" stroke="#ffffff" stroke-width="2"/>
            ${dates}
            ${hoverBars}`;
    }

    function candlestickChart(svg, rows) {
        const width = 760;
        const height = 350;
        const pad = { top: 18, right: 48, bottom: 25, left: 8 };
        const plotWidth = width - pad.left - pad.right;
        const maxCandles = 96;
        const groupSize = Math.max(1, Math.ceil(rows.length / maxCandles));
        const candles = [];
        for (let index = 0; index < rows.length; index += groupSize) {
            const group = rows.slice(index, index + groupSize);
            candles.push({
                date: group[group.length - 1].date,
                open: number(group[0].open),
                high: Math.max(...group.map((item) => number(item.high))),
                low: Math.min(...group.map((item) => number(item.low))),
                close: number(group[group.length - 1].close),
                volume: group.reduce((sum, item) => sum + (number(item.volume) || 0), 0)
            });
        }
        const hasHistoricalVolume = candles.some((item) => item.volume > 0);
        const volumeHeight = hasHistoricalVolume ? 54 : 0;
        const dividerGap = hasHistoricalVolume ? 16 : 0;
        const priceBottom = height - pad.bottom - volumeHeight - dividerGap;
        const priceHeight = priceBottom - pad.top;
        const highs = candles.map((item) => item.high);
        const lows = candles.map((item) => item.low);
        let maximum = Math.max(...highs);
        let minimum = Math.min(...lows);
        const range = maximum - minimum || 1;
        maximum += range * .02;
        minimum -= range * .02;
        const y = (value) => pad.top + ((maximum - value) / (maximum - minimum)) * priceHeight;
        const slot = plotWidth / candles.length;
        const candleWidth = Math.max(2, Math.min(8, slot * .58));
        const maxVolume = Math.max(1, ...candles.map((item) => item.volume));
        const grid = [0, .25, .5, .75, 1].map((ratio) => {
            const axisY = pad.top + ratio * priceHeight;
            const value = maximum - ratio * (maximum - minimum);
            return `<path d="M ${pad.left} ${axisY} H ${width - pad.right}" class="gridline"/><text x="${width - pad.right + 7}" y="${axisY + 4}" class="axis">${formatNumber(value)}</text>`;
        }).join("");
        const marks = candles.map((item, index) => {
            const x = pad.left + slot * index + slot / 2;
            const rising = item.close >= item.open;
            const classSuffix = rising ? "up" : "down";
            const bodyTop = Math.min(y(item.open), y(item.close));
            const bodyHeight = Math.max(1.5, Math.abs(y(item.close) - y(item.open)));
            const volumeBarHeight = hasHistoricalVolume ? (item.volume / maxVolume) * volumeHeight : 0;
            return `
                <line x1="${x}" x2="${x}" y1="${y(item.high)}" y2="${y(item.low)}" class="candle-${classSuffix} wick"/>
                <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" rx="1" class="candle-${classSuffix}"/>
                ${hasHistoricalVolume ? `<rect x="${x - candleWidth / 2}" y="${height - pad.bottom - volumeBarHeight}" width="${candleWidth}" height="${volumeBarHeight}" rx="1" class="volume-${classSuffix}"/>` : ""}`;
        }).join("");
        const dateIndexes = [0, Math.floor((candles.length - 1) / 2), candles.length - 1];
        const dates = dateIndexes.map((index) => {
            const x = pad.left + slot * index + slot / 2;
            const anchor = index === 0 ? "start" : index === candles.length - 1 ? "end" : "middle";
            const label = new Intl.DateTimeFormat(locale(), { month: "short", day: "numeric" }).format(new Date(candles[index].date));
            return `<text x="${x}" y="${height - 7}" text-anchor="${anchor}" class="axis">${escapeHtml(label)}</text>`;
        }).join("");
        const hoverBars = candles.map((item, index) => {
            const barX = pad.left + slot * index;
            const title = formatDate(item.date);
            const value = `O: ${formatNumber(item.open)} | H: ${formatNumber(item.high)} | L: ${formatNumber(item.low)} | C: ${formatNumber(item.close)}`;
            return `<rect x="${barX.toFixed(2)}" y="0" width="${slot.toFixed(2)}" height="${height}" fill="transparent" class="hover-bar" onmouseover="showChartTooltip(event, '${escapeHtml(title)}', '${escapeHtml(value)}')" onmousemove="moveChartTooltip(event)" onmouseout="hideChartTooltip()"/>`;
        }).join("");

        svg.innerHTML = `${grid}${hasHistoricalVolume ? `<path d="M ${pad.left} ${priceBottom + 9} H ${width - pad.right}" class="chart-divider"/>` : ""}${marks}${dates}${hoverBars}`;
    }

    function renderStockChart() {
        const message = byId("chartMessage");
        if (state.historyLoading) {
            message.textContent = labels().loading_chart;
            message.classList.remove("hidden");
            byId("stockChart").innerHTML = "";
            return;
        }
        const sorted = state.history.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
        const cleanRows = sorted.filter(item => {
            const o = number(item.open);
            const h = number(item.high);
            const l = number(item.low);
            const c = number(item.close);
            return o > 0 && h > 0 && l > 0 && c > 0;
        });
        const cutoff = Date.now() - state.days * 86400000;
        const periodRows = cleanRows.filter((item) => new Date(item.date).getTime() >= cutoff);
        const rows = periodRows.length >= 2 ? periodRows : cleanRows.slice(-Math.min(cleanRows.length, 90));
        if (!rows.length) {
            message.textContent = labels().chart_unavailable;
            message.classList.remove("hidden");
            byId("stockChart").innerHTML = "";
            byId("ohlcMetrics").innerHTML = "";
            return;
        }
        message.classList.add("hidden");
        candlestickChart(byId("stockChart"), rows);
        const latest = rows[rows.length - 1];
        const latestQuoteVolume = selectedStock() && selectedStock().volume;
        byId("ohlcMetrics").innerHTML = [
            [labels().open, latest.open], [labels().high, latest.high], [labels().low, latest.low], [labels().close, latest.close], [labels().quote_volume, latestQuoteVolume]
        ].map(([label, value], index) => `<div><span>${escapeHtml(label)}</span><strong class="tabular ${index === 3 ? "positive" : ""}">${index === 4 ? compact(value) : formatNumber(value)}</strong></div>`).join("");
    }

    function renderIndex() {
        const quote = state.index && state.index.quote || {};
        const days = state.indexDays || 90;
        const cutoff = Date.now() - days * 86400000;
        const filteredRows = state.index && Array.isArray(state.index.history)
            ? state.index.history.filter((item) => new Date(item.date).getTime() >= cutoff)
            : [];
        const rows = filteredRows.length >= 2
            ? filteredRows.map((item) => ({ date: item.date, value: number(item.close) }))
            : (state.index && Array.isArray(state.index.history) ? state.index.history.slice(-75).map((item) => ({ date: item.date, value: number(item.close) })) : []);
        setText("overviewIndex", formatNumber(quote.value));
        setText("overviewDelta", percent(quote.changePercent), `tabular ${percentClass(quote.changePercent)}`);
        lineChart(byId("indexChart"), rows, { width: 320, height: 144, color: "#14b8a6", gradient: "indexArea", stroke: 2 });
        const delay = number(state.index && state.index.delaySeconds);
        setText("feedNote", delay ? labels().delay_note.replace("{minutes}", Math.round(delay / 60)) : labels().normal_note);
    }

    function renderMovers() {
        const rows = sortedStocks(state.moversTab).slice(0, 5);
        const container = byId("moverRows");
        if (!container) return;
        container.innerHTML = rows.map((item) => `
            <button class="mover-row ${item.symbol === state.selected ? "active" : ""}" type="button" data-symbol="${escapeHtml(item.symbol)}">
                <span style="display: flex; align-items: center; gap: 0.48rem; font-weight: 600; color: var(--ink);">
                    <img src="/logos/${escapeHtml(item.symbol)}.svg" style="width: 1.25rem; height: 1.25rem; object-fit: contain;" onerror="this.style.display='none';">
                    ${escapeHtml(item.symbol)}
                </span>
                <span class="tabular">${formatNumber(item.last_price)}</span>
                <strong class="tabular ${percentClass(item.change_percent)}">${percent(item.change_percent)}</strong>
            </button>`).join("");
        
        container.querySelectorAll("[data-symbol]").forEach((button) => {
            button.addEventListener("click", () => selectStock(button.dataset.symbol));
        });
    }

    function getNewsCover(item) {
        if (window.StarTaNewsCovers) {
            return window.StarTaNewsCovers.getUrl(item, state.lang);
        }
        const l = state.lang === 'ar' ? 'ar' : 'en';
        return `/assets/news-covers/${l}-economy.webp`;
    }

    function renderNews() {
        const container = byId("newsRows");
        if (!state.news.length) {
            container.innerHTML = `<div class="empty-inline">${escapeHtml(labels().no_news)}</div>`;
            return;
        }
        container.innerHTML = state.news.slice(0, 3).map((item) => {
            const coverUrl = getNewsCover(item);
            const image = `<img alt="" loading="lazy" src="${escapeHtml(coverUrl)}">`;
            return `<a class="news-card" href="/News/${encodeURIComponent(item.id)}"><div class="news-media">${image}</div><div class="news-copy"><h3>${escapeHtml(item.headline)}</h3><time>${escapeHtml(formatDate(item.published_at))}</time></div></a>`;
        }).join("");
    }

    function renderTape() {
        const items = sortedStocks("active").slice(0, 9);
        byId("tickerTape").innerHTML = items.map((item) => `<span class="tape-entry"><strong>${escapeHtml(item.symbol)}</strong>${formatNumber(item.last_price)} <span class="${percentClass(item.change_percent)}">${percent(item.change_percent)}</span></span>`).join("");
    }

    function render() {
        renderRibbon();
        if (state.watchTab === "portfolio") {
            updatePortfolioDropdown();
            const select = byId("portfolioSelect");
            if (select) select.style.display = "inline-block";
        } else {
            const select = byId("portfolioSelect");
            if (select) select.style.display = "none";
        }
        updateAddBtnTitle();
        renderWatchlist();
        renderSelected();
        renderStockChart();
        renderIndex();
        renderMovers();
        renderNews();
        renderTape();

        // Repopulate drawer if open to refresh language/translation
        const drawer = byId("companyDrawer");
        if (drawer && drawer.classList.contains("active")) {
            populateDrawer();
            renderDrawerChart();
        }
    }

    async function loadNews() {
        try {
            state.news = await request(`/api/v1/news?source_country=EG&language=${state.lang}&days=90&limit=3`);
        } catch (_) {
            state.news = [];
        }
        renderNews();
    }

    async function loadStockHistory() {
        const message = byId("chartMessage");
        state.historyLoading = true;
        if (message) { message.textContent = labels().loading_chart; message.classList.remove("hidden"); }
        try {
            // Use browser HTTP cache — avoids redundant round-trips on same session
            const rows = await request(`/api/v1/egx/history/${encodeURIComponent(state.selected)}?period=max`, { cache: "default" });
            state.history = Array.isArray(rows) ? rows : [];
        } catch (_) {
            state.history = [];
        }
        state.historyLoading = false;
        renderSelected();
        renderStockChart();
    }

    async function loadSelectedSymbolNews() {

        const symbol = state.selected;
        if (!symbol) return;
        
        const contentContainer = document.querySelector(".overview-content");
        if (contentContainer && state.overviewTab === "news") {
            const isAr = state.lang === "ar";
            contentContainer.innerHTML = `<div class="chart-message">${isAr ? "جاري تحميل الأخبار..." : "Loading news..."}</div>`;
        }
        
        try {
            const rows = await request(`/api/v1/news?symbol=${encodeURIComponent(symbol)}&language=${state.lang}&limit=10`);
            state.selectedNews = Array.isArray(rows) ? rows : [];
        } catch (_) {
            state.selectedNews = [];
        }
        
        if (state.overviewTab === "news" && state.selected === symbol) {
            renderOverviewTab();
        }
    }

    async function loadYahooProfile(symbol) {
        // Cache check — avoid refetching on every tab switch
        if (state.yahooProfiles[symbol]) return;
        state.yahooProfileLoading = true;
        
        // Render skeletons immediately if we are looking at this stock and on the financials tab
        if (state.selected === symbol && state.overviewTab === "financials") {
            renderOverviewTab();
        }
        
        try {
            const raw = await request(`/api/v1/yahoo/stock/${encodeURIComponent(symbol)}`);
            if (raw && (raw.profile || raw.fundamentals)) {
                const p = raw.profile   || {};
                const f = raw.fundamentals || {};
                state.yahooProfiles[symbol] = {
                    description:    p.description,
                    website:        p.website,
                    industry:       p.industry,
                    employees:      p.employees,
                    headquarters:   p.headquarters_city,
                    // Prices & ranges — prefer Yahoo live, fall back to what DB had
                    price:          p.price,
                    year_high:      p.year_high,
                    year_low:       p.year_low,
                    market_cap:     p.market_cap,
                    avg_vol_10d:    p.avg_vol_10d,
                    // Fundamentals
                    pe_ratio:       f.pe_ratio,
                    price_to_book:  f.price_to_book,
                    dividend_yield: f.dividend_yield,
                    beta:           f.beta,
                    // Extra metrics for the Drawer
                    eps:            f.trailing_eps,
                    roe:            f.return_on_equity,
                    // Add standard financial metrics for the 6 cards
                    total_revenue:  f.total_revenue,
                    profit_margin:  f.profit_margin,
                    operating_margin: f.operating_margin,
                    total_cash:     f.total_cash,
                    total_debt:     f.total_debt,
                    raw:            raw
                };
                // Re-render Overview if currently viewing this stock
                if (state.selected === symbol) renderOverviewTab();
            }
        } catch (_) {
            // Non-critical — silently fail; DB data still shows
        }
        state.yahooProfileLoading = false;
        // Final fallback update in case loading finished
        if (state.selected === symbol && state.overviewTab === "financials") {
            renderOverviewTab();
        }
    }

    async function selectStock(symbol) {
        if (!symbol || symbol === state.selected) return;
        state.selected = symbol;
        renderWatchlist();
        renderMovers(); // Update active mover state immediately!
        await Promise.all([
            loadStockHistory(),
            loadSelectedSymbolNews(),
            loadYahooProfile(symbol)
        ]);
    }

    async function loadMarket() {
        // ── Phase 0: Instant paint from session cache (0 ms) ─────────────
        const cached = loadFromCache();
        if (cached) {
            state.stocks   = cached.stocks  || [];
            state.summary  = cached.summary || null;
            state.index    = cached.index   || null;
            state.news     = cached.news    || [];
            state.history  = cached.history || [];
            state.marketLoading  = false;
            state.historyLoading = false;
            if (!state.stocks.some(s => s.symbol === state.selected) && state.stocks.length)
                state.selected = state.stocks[0].symbol;
            render(); // instant — no network wait
        }

        // ── Phase 1: Fire market data + history IN PARALLEL ──────────────
        // History used to be sequential (blocking render by 800-1500ms)
        // Now it races alongside the market fetch — whichever finishes first wins
        const [marketRes, historyRes] = await Promise.allSettled([
            Promise.allSettled([
                request("/api/v1/egx/stocks?limit=300"),
                request("/api/v1/market-summary"),
                request("/api/v1/egx30/index"),
                request(`/api/v1/news?source_country=EG&language=${state.lang}&days=90&limit=3`)
            ]),
            request(`/api/v1/egx/history/${encodeURIComponent(state.selected)}?period=max`, { cache: "default" })
        ]);

        // ── Phase 2: Apply fresh market data ─────────────────────────────
        if (marketRes.status === "fulfilled") {
            const r = marketRes.value;
            state.stocks  = r[0].status === "fulfilled" && Array.isArray(r[0].value) ? r[0].value : state.stocks;
            state.summary = r[1].status === "fulfilled" ? r[1].value : state.summary;
            state.index   = r[2].status === "fulfilled" ? r[2].value : state.index;
            state.news    = r[3].status === "fulfilled" && Array.isArray(r[3].value) ? r[3].value : state.news;
            state.marketLoading = false;
            if (!state.stocks.some(s => s.symbol === state.selected) && state.stocks.length)
                state.selected = state.stocks[0].symbol;
        }

        // ── Phase 3: Apply history (arrived in parallel, not after) ───────
        if (historyRes.status === "fulfilled" && Array.isArray(historyRes.value)) {
            state.history = historyRes.value;
        } else if (!state.history.length) {
            state.history = [];
        }
        state.historyLoading = false;

        // ── Phase 4: Full render with live data ──────────────────────────
        render();

        // ── Phase 5: Persist to session cache for instant next visit ─────
        saveToCache({ stocks: state.stocks, summary: state.summary, index: state.index, news: state.news, history: state.history });

        // ── Phase 6: Non-critical enrichment in background ────────────────
        Promise.all([
            loadSelectedSymbolNews(),
            loadYahooProfile(state.selected)
        ]);
    }

    function updateAddBtnTitle() {
        const btn = byId("addStockBtn");
        if (!btn) return;
        if (state.watchTab === "portfolio") {
            btn.title = state.lang === "ar" ? "إنشاء محفظة جديدة" : "Create new portfolio";
            btn.setAttribute("aria-label", state.lang === "ar" ? "إنشاء محفظة جديدة" : "Create new portfolio");
        } else {
            btn.title = state.lang === "ar" ? "إضافة سهم لقائمتي" : "Add stock to My Watchlist";
            btn.setAttribute("aria-label", state.lang === "ar" ? "إضافة سهم لقائمتي" : "Add stock to My Watchlist");
        }
    }

    function updatePortfolioDropdown() {
        const select = byId("portfolioSelect");
        if (!select) return;
        if (!window.PFStore) return;
        
        const portfolios = window.PFStore.getAll();
        const isAr = state.lang === "ar";
        
        const selectedValue = select.value;
        
        select.innerHTML = portfolios.map(p => {
            const name = isAr && p.nameAr ? p.nameAr : p.name;
            const isSelected = selectedValue ? (p.id === selectedValue) : p.isDefault;
            return `<option value="${escapeHtml(p.id)}" ${isSelected ? "selected" : ""}>${escapeHtml(name)}</option>`;
        }).join("");
    }

    function onWatchTabChange() {
        const select = byId("portfolioSelect");
        if (select) {
            if (state.watchTab === "portfolio") {
                updatePortfolioDropdown();
                select.style.display = "inline-block";
            } else {
                select.style.display = "none";
            }
        }
        updateAddBtnTitle();
        renderWatchlist();
    }

    // ── Slide-in Drawer Logic ──────────────────────────────────────────
    function initDrawer() {
        const drawer = byId("companyDrawer");
        const closeBtn = byId("drawerCloseBtn");
        const quickBtn = byId("quickViewBtn");
        
        if (!drawer || !closeBtn) return;
        
        if (quickBtn) {
            quickBtn.addEventListener("click", (e) => {
                e.preventDefault();
                openDrawer();
            });
        }
        
        closeBtn.addEventListener("click", closeDrawer);
        
        const backdrop = drawer.querySelector(".drawer-backdrop");
        if (backdrop) {
            backdrop.addEventListener("click", closeDrawer);
        }
        
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && drawer.classList.contains("active")) {
                closeDrawer();
            }
        });
        
        // Drawer Tab switching
        const tabButtons = drawer.querySelectorAll(".drawer-tabs button");
        tabButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetTab = btn.dataset.drawerTab;
                tabButtons.forEach(b => b.classList.toggle("active", b === btn));
                
                drawer.querySelectorAll(".drawer-tab-pane").forEach(pane => {
                    pane.classList.remove("active");
                });
                
                if (targetTab === "profile") byId("drawerTabProfile").classList.add("active");
                else if (targetTab === "metrics") byId("drawerTabMetrics").classList.add("active");
                else if (targetTab === "chart-tab") {
                    byId("drawerTabChart").classList.add("active");
                    renderDrawerChart();
                }
                else if (targetTab === "news-tab") byId("drawerTabNews").classList.add("active");
            });
        });

        // Drawer Chart period buttons
        const periodButtons = byId("drawerChartPeriodControls").querySelectorAll("button");
        periodButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                state.drawerDays = Number(btn.dataset.days);
                periodButtons.forEach(b => b.classList.toggle("active", b === btn));
                renderDrawerChart();
            });
        });
    }

    function openDrawer() {
        const drawer = byId("companyDrawer");
        if (!drawer) return;
        
        const tabButtons = drawer.querySelectorAll(".drawer-tabs button");
        tabButtons.forEach((btn, index) => btn.classList.toggle("active", index === 0));
        
        drawer.querySelectorAll(".drawer-tab-pane").forEach((pane, index) => {
            pane.classList.toggle("active", index === 0);
        });

        state.drawerDays = 90;
        const periodButtons = byId("drawerChartPeriodControls").querySelectorAll("button");
        periodButtons.forEach((btn, index) => btn.classList.toggle("active", index === 1)); // 3M is active by default
        
        populateDrawer();
        drawer.classList.add("active");
        drawer.setAttribute("aria-hidden", "false");
    }

    function closeDrawer() {
        const drawer = byId("companyDrawer");
        if (!drawer) return;
        drawer.classList.remove("active");
        drawer.setAttribute("aria-hidden", "true");
    }

    function populateDrawer() {
        const item = selectedStock();
        if (!item) return;
        
        const yp = state.yahooProfiles[state.selected] || {};
        
        setText("drawerTitle", item.symbol);
        setText("drawerSubtitle", stockName(item));
        
        const drawerLogo = byId("drawerLogo");
        const fallback = document.querySelector(".drawer-logo-fallback");
        if (drawerLogo && fallback) {
            drawerLogo.src = `/logos/${item.symbol}.svg`;
            drawerLogo.style.display = "block";
            fallback.style.display = "none";
            fallback.textContent = item.symbol.substring(0, 2);
        }
        
        let curPrice = yp.price || item.last_price;
        let changePct = yp.raw && yp.raw.profile && yp.raw.profile.change_pct != null ? yp.raw.profile.change_pct : item.change_percent;

        const hist = getHistoricalCloseData();
        if (hist) {
            curPrice = hist.close;
        } else if (state.historyLoading) {
            curPrice = null;
            changePct = null;
        }

        setText("drawerPrice", curPrice !== null ? formatNumber(curPrice) : "...");
        setText("drawerChange", changePct !== null ? percent(changePct) : "...", `tabular drawer-change-value ${percentClass(changePct)}`);
        
        const yearHigh = number(yp.year_high || item.high_52w);
        const yearLow  = number(yp.year_low  || item.low_52w);
        const rangeContainer = byId("drawerRangeBarContainer");
        if (rangeContainer) {
            if (yearHigh && yearLow && yearHigh > yearLow) {
                const pct = Math.min(100, Math.max(0, ((number(curPrice) - yearLow) / (yearHigh - yearLow)) * 100));
                rangeContainer.innerHTML = `
                    <div style="margin: 0.8rem 0 0;">
                        <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:var(--muted);margin-bottom:4px;">
                            <span>52W Low: <strong class="tabular" style="color:var(--red)">${formatNumber(yearLow)}</strong></span>
                            <span>52W High: <strong class="tabular" style="color:var(--green)">${formatNumber(yearHigh)}</strong></span>
                        </div>
                        <div style="height:5px;background:var(--page);border-radius:8px;position:relative;">
                            <div style="position:absolute;left:0;top:0;height:100%;width:${pct.toFixed(1)}%;background:linear-gradient(90deg,var(--red),var(--teal-dark));border-radius:8px;"></div>
                            <div style="position:absolute;left:${pct.toFixed(1)}%;top:-3px;width:11px;height:11px;border-radius:50%;background:var(--teal-dark);border:2px solid var(--surface);transform:translateX(-50%);box-shadow:0 0 6px rgba(20,184,166,.5);"></div>
                        </div>
                    </div>`;
            } else {
                rangeContainer.innerHTML = "";
            }
        }
        
        const sector = sectorName(item.sector_name);
        const desc = yp.description || labels().company_text.replace("{name}", stockName(item)).replace("{sector}", sector);
        setText("drawerDescription", desc);
        
        const websiteLink = byId("drawerWebsiteLink");
        if (websiteLink) {
            if (yp.website) {
                websiteLink.href = yp.website;
                websiteLink.style.display = "inline-flex";
                websiteLink.querySelector("span").textContent = yp.website.replace(/https?:\/\/(www\.)?/, "");
            } else {
                websiteLink.style.display = "none";
            }
        }
        
        const profileLink = byId("drawerFullProfileLink");
        if (profileLink) {
            profileLink.href = `/symbol/${item.symbol}`;
            profileLink.style.display = "block";
        }
        
        setText("drawerIndustryBadge", yp.industry || sectorName(item.sector_name));
        
        const factsGrid = byId("drawerProfileFacts");
        if (factsGrid) {
            const mcap = yp.market_cap || item.market_cap;
            const avgVol = yp.avg_vol_10d;
            const employees = yp.employees;
            const hq = yp.headquarters;
            
            const facts = [
                [labels().sector, sector],
                [labels().market_cap, `${compact(mcap)} ${labels().currency}`],
            ];
            if (avgVol != null) facts.push([state.lang === "ar" ? "متوسط الحجم (10أيام)" : "Avg Vol (10D)", compact(avgVol)]);
            if (employees != null) facts.push([state.lang === "ar" ? "عدد الموظفين" : "Employees", new Intl.NumberFormat("en-US").format(employees)]);
            if (hq) facts.push([state.lang === "ar" ? "المقر الرئيسي" : "Headquarters", hq]);
            
            factsGrid.innerHTML = facts.map(([title, val]) => `
                <div>
                    <dt>${escapeHtml(title)}</dt>
                    <dd>${escapeHtml(val)}</dd>
                </div>
            `).join("");
        }
        
        const metricsGrid = byId("drawerMetricsGrid");
        if (metricsGrid) {
            const isAr = state.lang === "ar";
            const pe = yp.pe_ratio || item.pe_ratio;
            const pb = yp.price_to_book || item.pb_ratio;
            const eps = yp.eps;
            const roe = yp.roe;
            const divYield = yp.dividend_yield;
            const beta = yp.beta;
            
            const metrics = [
                [isAr ? "مضاعف الربحية (P/E)" : "P/E Ratio", formatNumber(pe)],
                [isAr ? "مضاعف القيمة الدفترية (P/B)" : "P/B Ratio", formatNumber(pb)],
                [isAr ? "ربحية السهم (EPS)" : "Earnings Per Share (EPS)", formatNumber(eps)],
                [isAr ? "العائد على حقوق المساهمين (ROE)" : "Return on Equity (ROE)", roe != null ? `${formatNumber(roe * 100)}%` : "--"],
                [isAr ? "عائد التوزيعات" : "Dividend Yield", divYield != null ? `${formatNumber(divYield)}%` : "--"],
                [isAr ? "معامل بيتا (التقلب)" : "Beta Value", formatNumber(beta)],
                [isAr ? "الإيرادات" : "Revenue", `${compact(item.revenue)} EGP`],
                [isAr ? "صافي الدخل" : "Net Income", `${compact(item.net_income)} EGP`]
            ];
            
            metricsGrid.innerHTML = metrics.map(([title, val]) => `
                <div class="drawer-metric-card">
                    <div class="title">${escapeHtml(title)}</div>
                    <div class="value tabular">${escapeHtml(val)}</div>
                </div>
            `).join("");
        }
        
        const newsRows = byId("drawerNewsRows");
        if (newsRows) {
            const displayNews = state.selectedNews || [];
            if (!displayNews.length) {
                newsRows.innerHTML = `<div class="empty-inline">${escapeHtml(state.lang === "ar" ? "لا تتوفر أخبار حالياً" : "No news available")}</div>`;
            } else {
                newsRows.innerHTML = displayNews.map((article) => {
                    const coverUrl = getNewsCover(article);
                    return `
                        <a class="drawer-news-card" href="/News/${encodeURIComponent(article.id)}">
                            <div class="drawer-news-media">
                                <img alt="" loading="lazy" src="${escapeHtml(coverUrl)}">
                            </div>
                            <div class="drawer-news-copy">
                                <h4>${escapeHtml(article.headline)}</h4>
                                <time>${escapeHtml(formatDate(article.published_at))}</time>
                            </div>
                        </a>
                    `;
                }).join("");
            }
        }
    }

    function renderDrawerChart() {
        const svg = byId("drawerChartSvg");
        const message = byId("drawerChartMessage");
        if (!svg || !message) return;
        
        if (state.historyLoading) {
            message.textContent = labels().loading_chart;
            message.classList.remove("hidden");
            svg.innerHTML = "";
            return;
        }
        
        const sorted = state.history.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
        const cleanRows = sorted.filter(item => {
            const o = number(item.open);
            const h = number(item.high);
            const l = number(item.low);
            const c = number(item.close);
            return o > 0 && h > 0 && l > 0 && c > 0;
        });
        
        const days = state.drawerDays || 90;
        const cutoff = Date.now() - days * 86400000;
        const periodRows = cleanRows.filter((item) => new Date(item.date).getTime() >= cutoff);
        const rows = periodRows.length >= 2 ? periodRows : cleanRows.slice(-Math.min(cleanRows.length, 90));
        
        if (!rows.length) {
            message.textContent = labels().chart_unavailable;
            message.classList.remove("hidden");
            svg.innerHTML = "";
            return;
        }
        
        message.classList.add("hidden");
        candlestickChart(svg, rows);
    }

    function bind() {
        initDrawer();
        byId("langToggle").addEventListener("click", () => setLanguage(state.lang === "ar" ? "en" : "ar", true));
        byId("companySearch").addEventListener("input", (event) => {
            state.query = event.target.value;
            renderWatchlist();
        });
        byId("watchTabs").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
            state.watchTab = button.dataset.tab;
            byId("watchTabs").querySelectorAll("button").forEach((tab) => tab.classList.toggle("active", tab === button));
            onWatchTabChange();
        }));
        byId("moverTabs").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
            state.moversTab = button.dataset.tab;
            byId("moverTabs").querySelectorAll("button").forEach((tab) => tab.classList.toggle("active", tab === button));
            renderMovers();
        }));
        byId("periodControls").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
            state.days = Number(button.dataset.days);
            byId("periodControls").querySelectorAll("button").forEach((period) => period.classList.toggle("active", period === button));
            renderStockChart();
        }));
        const enlargeBtn = byId("enlargeChartBtn");
        if (enlargeBtn) enlargeBtn.addEventListener("click", openChartModal);
        const chartCloseBtn = byId("chartModalCloseBtn");
        if (chartCloseBtn) chartCloseBtn.addEventListener("click", closeChartModal);
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") { const m = byId("chartModal"); if (m && m.classList.contains("active")) closeChartModal(); }
        });
        byId("indexPeriodControls").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
            state.indexDays = Number(button.dataset.days);
            byId("indexPeriodControls").querySelectorAll("button").forEach((period) => period.classList.toggle("active", period === button));
            renderIndex();
        }));
        document.querySelectorAll(".overview-tabs span").forEach((tab) => tab.addEventListener("click", () => {
            state.overviewTab = tab.dataset.key;
            document.querySelectorAll(".overview-tabs span").forEach((t) => t.classList.toggle("active", t === tab));
            renderOverviewTab();
        }));

    // ── Add-stock panel ──────────────────────────────────────────────────
    function openAddStockPanel() {
        const panel = byId("watchAddPanel");
        const tabs  = byId("watchTabs");
        const labels_div = document.querySelector(".table-labels");
        const rows  = byId("watchlistRows");
        if (!panel) return;
        panel.style.display = "block";
        if (tabs)       tabs.style.display       = "none";
        if (labels_div) labels_div.style.display = "none";
        if (rows)       rows.style.display       = "none";
        const input = byId("watchAddSearch");
        if (input) { input.value = ""; input.focus(); }
        renderAddResults("");
    }

    function closeAddStockPanel() {
        const panel = byId("watchAddPanel");
        const tabs  = byId("watchTabs");
        const labels_div = document.querySelector(".table-labels");
        const rows  = byId("watchlistRows");
        if (!panel) return;
        panel.style.display = "none";
        if (tabs)       tabs.style.display       = "";
        if (labels_div) labels_div.style.display = "";
        if (rows)       rows.style.display       = "";
    }

    function addStockToWatchlist(symbol) {
        if (!symbol) return;
        const list = getCustomWatchlist();
        if (!list.includes(symbol)) {
            list.push(symbol);
            try { localStorage.setItem("starta-watchlist", JSON.stringify(list)); } catch (_) {}
        }
        // Switch to My Watchlist tab
        state.watchTab = "custom";
        byId("watchTabs").querySelectorAll("button").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === "custom");
        });
        closeAddStockPanel();
        renderWatchlist();
        updateFavBtn(state.selected);
        // Briefly animate the new row
        setTimeout(() => {
            const added = byId("watchlistRows").querySelector(`[data-symbol="${CSS.escape(symbol)}"]`);
            if (added) { added.style.transition = "background 0ms"; added.style.background = "rgba(20,184,166,.18)"; setTimeout(() => { added.style.background = ""; added.style.transition = ""; }, 600); }
        }, 50);
    }

    function renderAddResults(query) {
        const container = byId("watchAddResults");
        if (!container) return;
        const currentList = getCustomWatchlist();
        const q = (query || "").trim().toLowerCase();
        let pool = state.stocks.slice();
        if (q) pool = pool.filter((s) => `${s.symbol} ${s.name_en} ${s.name_ar || ""}`.toLowerCase().includes(q));
        pool = pool.slice(0, 30);
        if (!pool.length) {
            container.innerHTML = `<div class="watch-add-empty">${escapeHtml(state.lang === "ar" ? "لا توجد نتائج" : "No stocks found")}</div>`;
            return;
        }
        container.innerHTML = pool.map((s) => {
            const inList = currentList.includes(s.symbol);
            const name   = stockName(s);
            const badge  = inList
                ? `<span class="watch-add-row-badge">${escapeHtml(labels().added)}</span>`
                : `<span class="watch-add-row-badge">${escapeHtml(labels().add)}</span>`;
            return `<div class="watch-add-row${inList ? " watch-add-row--added" : ""}" data-add-symbol="${escapeHtml(s.symbol)}">
                <img class="watch-add-row-logo" src="/logos/${escapeHtml(s.symbol)}.svg" alt="" onerror="this.style.display='none';">
                <span class="watch-add-row-info"><strong>${escapeHtml(s.symbol)}</strong><small>${escapeHtml(name)}</small></span>
                ${badge}
            </div>`;
        }).join("");
        container.querySelectorAll("[data-add-symbol]:not(.watch-add-row--added)").forEach((row) => {
            row.addEventListener("click", () => addStockToWatchlist(row.dataset.addSymbol));
        });
    }
    // ────────────────────────────────────────────────────────────────────

        // Wiring: add-stock button
        const addStockBtn = byId("addStockBtn");
        if (addStockBtn) {
            addStockBtn.addEventListener("click", () => {
                if (state.watchTab === "portfolio") {
                    window.location.href = "/Portfolio";
                } else {
                    openAddStockPanel();
                }
            });
        }

        // Wiring: portfolio selector change
        const portfolioSelect = byId("portfolioSelect");
        if (portfolioSelect) {
            portfolioSelect.addEventListener("change", () => {
                renderWatchlist();
            });
        }

        // Wiring: close add-stock panel
        const watchAddClose = byId("watchAddClose");
        if (watchAddClose) watchAddClose.addEventListener("click", closeAddStockPanel);

        // Wiring: live search inside add-stock panel
        const watchAddSearch = byId("watchAddSearch");
        if (watchAddSearch) watchAddSearch.addEventListener("input", (e) => renderAddResults(e.target.value));

        // Wiring: favourite bookmark button
        const favBtn = byId("favBtn");
        if (favBtn) {
            favBtn.addEventListener("click", () => {
                toggleCustomWatchlist(state.selected);
            });
        }
    }

    // ─── Enlarge chart → fullscreen TradingView Advanced Chart ───────────────
    function openChartModal() {
        const modal = byId("chartModal");
        if (!modal) return;
        const item = selectedStock();
        const sym = (item && item.symbol) ? item.symbol : state.selected;
        if (!sym) return;
        byId("chartModalTitle").textContent = sym + " · Advanced Chart";
        const body = byId("chartModalBody");
        body.innerHTML = "";
        const theme = (window.StartaTheme && window.StartaTheme.current && window.StartaTheme.current() === "dark") ? "dark" : "light";
        const wrap = document.createElement("div");
        wrap.className = "tradingview-widget-container";
        wrap.style.height = "100%"; wrap.style.width = "100%";
        const w = document.createElement("div");
        w.className = "tradingview-widget-container__widget";
        w.style.height = "100%"; w.style.width = "100%";
        wrap.appendChild(w);
        const s = document.createElement("script");
        s.type = "text/javascript";
        s.async = true;
        s.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        s.text = JSON.stringify({
            autosize: true, symbol: "EGX:" + sym, interval: "D", timezone: "Africa/Cairo",
            theme: theme, style: "1", locale: state.lang === "ar" ? "ar" : "en",
            allow_symbol_change: false, hide_side_toolbar: false, withdateranges: true,
            details: true, calendar: false, support_host: "https://www.tradingview.com"
        });
        wrap.appendChild(s);
        body.appendChild(wrap);
        modal.classList.add("active");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
    }
    function closeChartModal() {
        const modal = byId("chartModal");
        if (!modal) return;
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        const body = byId("chartModalBody");
        if (body) body.innerHTML = "";
        document.body.style.overflow = "";
    }

    bind();
    const stored = localStorage.getItem("starta-lang") || localStorage.getItem("lang");
    setLanguage(stored === "ar" ? "ar" : "en", false);
    loadMarket();
}());
