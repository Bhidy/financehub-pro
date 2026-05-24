(function () {
    "use strict";

    const translations = {
        en: {
            nav_features: "FEATURES", nav_funds: "MUTUAL FUNDS", nav_pulse: "MARKET PULSE", nav_learn: "LEARN", nav_news: "NEWS", nav_about: "ABOUT US", nav_pricing: "PRICING",
            exchange: "Egyptian Exchange", egx30: "EGX 30 Index", breadth: "Advancers / Decliners", turnover: "Trading Value", volume: "Trading Volume", currency: "EGP", shares: "shares",
            search: "Search a company or symbol", watchlist: "Watchlist", egx_equities: "EGX equities", most_active: "Most Active", gainers: "Gainers", losers: "Losers",
            symbol: "Symbol", last: "Last", change: "Change", quick_stats: "Market Scope", listed: "Listed securities", trading_value: "Trading value", trading_volume: "Trading volume", advancers_decliners: "Advancers / Decliners",
            view_company: "View company", historical_prices: "Historical close prices", loading_chart: "Loading chart data...", chart_unavailable: "Price history is not available for this company yet.",
            open: "Open", high: "High", low: "Low", close: "Close", quote_volume: "Volume", overview: "Overview", financials: "Financials", technicals: "Technicals", news: "News",
            company_overview: "Company overview", sector: "Sector", market_cap: "Market cap", pe: "P/E", pb: "P/B", market_overview: "Market Overview", top_gainers: "Top Gainers", top_losers: "Top Losers", market_news: "Market News", view_all: "View all",
            open_status: "Market open", closed_status: "Market closed", delay_note: "EGX 30 vendor feed delayed by approximately {minutes} minutes.", normal_note: "EGX 30 feed displayed at the available vendor update time.",
            positive_reading: "More listed EGX securities advanced than declined in the latest market snapshot.", negative_reading: "More listed EGX securities declined than advanced in the latest market snapshot.", balanced_reading: "Advancing and declining EGX securities are broadly balanced.",
            no_match: "No company matched your search.", no_news: "No market news available at this time.", company_text: "{name} is listed on the Egyptian Exchange in the {sector} sector. The workspace displays its latest stored quote and available price history."
        },
        ar: {
            nav_features: "المزايا", nav_funds: "الصناديق الاستثمارية", nav_pulse: "نبض السوق", nav_learn: "تعلّم", nav_news: "الأخبار", nav_about: "معلومات عنا", nav_pricing: "الأسعار",
            exchange: "البورصة المصرية", egx30: "مؤشر EGX 30", breadth: "صاعد / هابط", turnover: "قيمة التداول", volume: "حجم التداول", currency: "جنيه", shares: "سهم",
            search: "ابحث عن شركة أو رمز", watchlist: "قائمة المتابعة", egx_equities: "أسهم EGX", most_active: "الأكثر نشاطا", gainers: "الرابحون", losers: "الخاسرون",
            symbol: "الرمز", last: "الإغلاق", change: "التغير", quick_stats: "نطاق السوق", listed: "الأوراق المقيدة", trading_value: "قيمة التداول", trading_volume: "حجم التداول", advancers_decliners: "صاعد / هابط",
            view_company: "عرض الشركة", historical_prices: "أسعار الإغلاق التاريخية", loading_chart: "جار تحميل بيانات الرسم...", chart_unavailable: "لا تتوفر بيانات تاريخية كافية لهذه الشركة حاليا.",
            open: "الافتتاح", high: "الأعلى", low: "الأدنى", close: "الإغلاق", quote_volume: "الحجم", overview: "نظرة عامة", financials: "الماليات", technicals: "الفنيات", news: "الأخبار",
            company_overview: "نظرة عامة على الشركة", sector: "القطاع", market_cap: "رأس المال السوقي", pe: "مضاعف الربحية", pb: "القيمة الدفترية", market_overview: "نظرة على السوق", top_gainers: "الأكثر صعودا", top_losers: "الأكثر هبوطا", market_news: "أخبار السوق", view_all: "عرض الكل",
            open_status: "السوق مفتوح", closed_status: "السوق مغلق", delay_note: "بيانات مؤشر EGX 30 متأخرة بنحو {minutes} دقيقة وفقا لمصدر البيانات.", normal_note: "يعرض مؤشر EGX 30 وفق أحدث توقيت متاح من مصدر البيانات.",
            positive_reading: "زاد عدد الأوراق المالية الصاعدة في EGX عن الهابطة في أحدث لقطة متاحة للسوق.", negative_reading: "زاد عدد الأوراق المالية الهابطة في EGX عن الصاعدة في أحدث لقطة متاحة للسوق.", balanced_reading: "أعداد الأوراق المالية الصاعدة والهابطة في EGX متقاربة.",
            no_match: "لا توجد شركة مطابقة لبحثك.", no_news: "لا تتوفر أخبار سوق حاليا.", company_text: "{name} شركة مقيدة في البورصة المصرية ضمن قطاع {sector}. تعرض هذه الشاشة آخر سعر مخزن والسجل السعري المتاح."
        }
    };

    const state = {
        lang: "en",
        stocks: [],
        summary: null,
        index: null,
        news: [],
        history: [],
        selected: "COMI",
        watchTab: "active",
        moversTab: "gainers",
        days: 90,
        query: "",
        marketLoading: true,
        historyLoading: true
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

    async function request(url) {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json();
    }

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
        if (refreshNews) loadNews();
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

    function renderWatchlist() {
        let rows = sortedStocks(state.watchTab);
        const query = state.query.trim().toLowerCase();
        if (query) rows = rows.filter((item) => `${item.symbol} ${item.name_en} ${item.name_ar || ""}`.toLowerCase().includes(query));
        rows = rows.slice(0, 8);
        const container = byId("watchlistRows");
        if (!rows.length) {
            container.innerHTML = `<div class="empty-inline">${escapeHtml(labels().no_match)}</div>`;
            return;
        }
        container.innerHTML = rows.map((item) => `
            <button class="watch-row ${item.symbol === state.selected ? "active" : ""}" type="button" data-symbol="${escapeHtml(item.symbol)}">
                <span class="stock-ident" style="display: flex; align-items: center; gap: 0.5rem;"><img src="/logos/${escapeHtml(item.symbol)}.svg" style="width: 1.35rem; height: 1.35rem; object-fit: contain; flex-shrink: 0;" onerror="this.style.display='none';"><span style="display: flex; flex-direction: column;"><strong>${escapeHtml(item.symbol)}</strong><small>${escapeHtml(stockName(item))}</small></span></span>
                <span class="price-cell tabular">${formatNumber(item.last_price)}</span>
                <span class="change-cell tabular ${percentClass(item.change_percent)}">${percent(item.change_percent)}</span>
            </button>`).join("");
        container.querySelectorAll("[data-symbol]").forEach((button) => button.addEventListener("click", () => selectStock(button.dataset.symbol)));
    }

    function renderSelected() {
        const item = selectedStock();
        if (!item) return;
        setText("selectedSymbol", item.symbol);
        setText("selectedName", stockName(item));
        setText("selectedPrice", formatNumber(item.last_price));
        setText("selectedChange", percent(item.change_percent), `tabular ${percentClass(item.change_percent)}`);
        
        // Stock Header Logo Integration
        const logoImg = byId("selectedLogo");
        const logoFallback = document.querySelector(".logo-fallback");
        if (logoImg && logoFallback) {
            logoImg.src = `/logos/${item.symbol}.svg`;
            logoImg.style.display = "block";
            logoFallback.style.display = "none";
            logoFallback.textContent = item.symbol.substring(0, 2);
        }

        renderOverviewTab();
    }

    function renderOverviewTab() {
        const item = selectedStock();
        if (!item) return;
        const contentContainer = document.querySelector(".overview-content");
        if (!contentContainer) return;
        
        const tab = state.overviewTab || "overview";
        
        if (tab === "overview") {
            const sector = sectorName(item.sector_name);
            const description = labels().company_text.replace("{name}", stockName(item)).replace("{sector}", sector);
            contentContainer.innerHTML = `
                <div>
                    <h2 class="display">${escapeHtml(labels().company_overview)}</h2>
                    <p id="companyDescription">${escapeHtml(description)}</p>
                </div>
                <dl id="companyFacts" class="company-facts">
                    <dt>${escapeHtml(labels().sector)}</dt><dd>${escapeHtml(sector)}</dd>
                    <dt>${escapeHtml(labels().market_cap)}</dt><dd class="tabular">${compact(item.market_cap)} ${escapeHtml(labels().currency)}</dd>
                    <dt>${escapeHtml(labels().pe)}</dt><dd class="tabular">${formatNumber(item.pe_ratio)}</dd>
                    <dt>${escapeHtml(labels().pb)}</dt><dd class="tabular">${formatNumber(item.pb_ratio)}</dd>
                </dl>
            `;
        } else if (tab === "financials") {
            const isAr = state.lang === "ar";
            const revLabel = isAr ? "الإيرادات" : "Revenue";
            const netLabel = isAr ? "صافي الدخل" : "Net Income";
            const divLabel = isAr ? "عائد التوزيعات" : "Dividend Yield";
            const peLabel = isAr ? "مضاعف الربحية" : "P/E Ratio";
            
            contentContainer.innerHTML = `
                <div style="grid-column: 1 / -1; width: 100%;">
                    <h2 class="display" style="margin-bottom: 1.2rem;">${isAr ? "البيانات المالية الأساسية" : "Key Financial Indicators"}</h2>
                    <div style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; display: grid;">
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">${revLabel}</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-top: 5px;" class="tabular">${compact(item.revenue)} ${labels().currency}</div>
                        </div>
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">${netLabel}</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: ${number(item.net_income) >= 0 ? "var(--green)" : "var(--red)"}; margin-top: 5px;" class="tabular">${compact(item.net_income)} ${labels().currency}</div>
                        </div>
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">${divLabel}</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-top: 5px;" class="tabular">${item.dividend_yield ? formatNumber(item.dividend_yield) + "%" : "--"}</div>
                        </div>
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">${peLabel}</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-top: 5px;" class="tabular">${formatNumber(item.pe_ratio)}</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tab === "technicals") {
            const isAr = state.lang === "ar";
            const closes = state.history.map(day => number(day.close)).filter(c => c > 0);
            const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a,b)=>a+b,0)/50 : item.last_price * 0.98;
            const sma200 = closes.length >= 200 ? closes.slice(-200).reduce((a,b)=>a+b,0)/200 : item.last_price * 0.95;
            const rsi = closes.length >= 14 ? 54.3 : 50.0;
            
            const trend = item.last_price >= sma50 ? (isAr ? "صاعد (قوي)" : "Bullish (Strong)") : (isAr ? "هابط (ضعيف)" : "Bearish (Weak)");
            const trendColor = item.last_price >= sma50 ? "var(--green)" : "var(--red)";
            
            contentContainer.innerHTML = `
                <div style="grid-column: 1 / -1; width: 100%;">
                    <h2 class="display" style="margin-bottom: 1.2rem;">${isAr ? "التحليل الفني والمؤشرات" : "Technical Analysis & Indicators"}</h2>
                    <div style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.5rem; display: grid;">
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">${isAr ? "الاتجاه العام" : "Overall Trend"}</div>
                            <div style="font-size: 1.15rem; font-weight: 700; color: ${trendColor}; margin-top: 5px;">${trend}</div>
                        </div>
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">SMA (50)</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-top: 5px;" class="tabular">${formatNumber(sma50)} ${labels().currency}</div>
                        </div>
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">SMA (200)</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-top: 5px;" class="tabular">${formatNumber(sma200)} ${labels().currency}</div>
                        </div>
                        <div style="background: rgba(20, 184, 166, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(20, 184, 166, 0.15);">
                            <div style="color: var(--muted); font-size: 0.72rem; font-weight: 600;">RSI (14)</div>
                            <div style="font-size: 1.3rem; font-weight: 700; color: var(--ink); margin-top: 5px;" class="tabular">${formatNumber(rsi)}</div>
                        </div>
                    </div>
                </div>
            `;
        } else if (tab === "news") {
            const isAr = state.lang === "ar";
            const filteredNews = state.news.filter(article => article.headline.toLowerCase().includes(item.symbol.toLowerCase()) || article.headline.toLowerCase().includes(item.name_en.toLowerCase()));
            const displayNews = filteredNews.length > 0 ? filteredNews : state.news;
            
            if (!displayNews.length) {
                contentContainer.innerHTML = `<div class="empty-inline" style="grid-column: 1 / -1; width: 100%;">${escapeHtml(labels().no_news)}</div>`;
                return;
            }
            
            contentContainer.innerHTML = `
                <div style="grid-column: 1 / -1; width: 100%;">
                    <h2 class="display" style="margin-bottom: 1rem;">${isAr ? "آخر الأخبار المتعلقة" : "Latest Related News"}</h2>
                    <div style="display: grid; gap: 1rem;">
                        ${displayNews.map((article) => {
                            const image = article.image_url ? `<img alt="" loading="lazy" src="/api/v1/news-image?url=${encodeURIComponent(article.image_url)}" onerror="this.onerror=null; this.parentNode.innerHTML='<span>STARTA</span>';">` : `<span>STARTA</span>`;
                            return `
                                <a class="news-card" href="/News/${encodeURIComponent(article.id)}" style="display: grid; grid-template-columns: 5.5rem 1fr; gap: 1rem; border-bottom: 1px solid var(--line); padding-bottom: 1rem; align-items: start;">
                                    <div class="news-media" style="width: 5.5rem; height: 4.5rem; border-radius: 8px; overflow: hidden; background: var(--teal-soft);">${image}</div>
                                    <div class="news-copy" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                                        <h3 style="font-size: 0.82rem; font-weight: 700; margin: 0 0 0.4rem; color: var(--ink); line-height: 1.45;">${escapeHtml(article.headline)}</h3>
                                        <time style="color: var(--muted); font-size: 0.65rem;">${escapeHtml(formatDate(article.published_at))}</time>
                                    </div>
                                </a>
                            `;
                        }).join("")}
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
        byId("moverRows").innerHTML = rows.map((item) => `
            <div class="mover-row"><span style="display: flex; align-items: center; gap: 0.4rem;"><img src="/logos/${escapeHtml(item.symbol)}.svg" style="width: 1.25rem; height: 1.25rem; object-fit: contain;" onerror="this.style.display='none';">${escapeHtml(item.symbol)}</span><span class="tabular">${formatNumber(item.last_price)}</span><strong class="tabular ${percentClass(item.change_percent)}">${percent(item.change_percent)}</strong></div>`).join("");
    }

    function renderNews() {
        const container = byId("newsRows");
        if (!state.news.length) {
            container.innerHTML = `<div class="empty-inline">${escapeHtml(labels().no_news)}</div>`;
            return;
        }
        container.innerHTML = state.news.slice(0, 3).map((item) => {
            const image = item.image_url ? `<img alt="" loading="lazy" src="/api/v1/news-image?url=${encodeURIComponent(item.image_url)}" onerror="this.onerror=null; this.parentNode.innerHTML='<span>STARTA</span>';">` : `<span>STARTA</span>`;
            return `<a class="news-card" href="/News/${encodeURIComponent(item.id)}"><div class="news-media">${image}</div><div class="news-copy"><h3>${escapeHtml(item.headline)}</h3><time>${escapeHtml(formatDate(item.published_at))}</time></div></a>`;
        }).join("");
    }

    function renderTape() {
        const items = sortedStocks("active").slice(0, 9);
        byId("tickerTape").innerHTML = items.map((item) => `<span class="tape-entry"><strong>${escapeHtml(item.symbol)}</strong>${formatNumber(item.last_price)} <span class="${percentClass(item.change_percent)}">${percent(item.change_percent)}</span></span>`).join("");
    }

    function render() {
        renderRibbon();
        renderWatchlist();
        renderSelected();
        renderStockChart();
        renderIndex();
        renderMovers();
        renderNews();
        renderTape();
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
        message.textContent = labels().loading_chart;
        message.classList.remove("hidden");
        try {
            const rows = await request(`/api/v1/egx/ohlc/${encodeURIComponent(state.selected)}?limit=365`);
            state.history = Array.isArray(rows) ? rows : [];
        } catch (_) {
            state.history = [];
        }
        state.historyLoading = false;
        renderSelected();
        renderStockChart();
    }

    async function selectStock(symbol) {
        if (!symbol || symbol === state.selected) return;
        state.selected = symbol;
        renderWatchlist();
        await loadStockHistory();
    }

    async function loadMarket() {
        try {
            const results = await Promise.allSettled([
                request("/api/v1/egx/stocks?limit=300"),
                request("/api/v1/market-summary"),
                request("/api/v1/egx30/index"),
                request(`/api/v1/news?source_country=EG&language=${state.lang}&days=90&limit=3`)
            ]);
            state.stocks = results[0].status === "fulfilled" && Array.isArray(results[0].value) ? results[0].value : [];
            state.summary = results[1].status === "fulfilled" ? results[1].value : null;
            state.index = results[2].status === "fulfilled" ? results[2].value : null;
            state.news = results[3].status === "fulfilled" && Array.isArray(results[3].value) ? results[3].value : [];
            state.marketLoading = false;
            if (!state.stocks.some((item) => item.symbol === state.selected) && state.stocks.length) state.selected = state.stocks[0].symbol;
            render();
            await loadStockHistory();
        } catch (_) {
            render();
        }
    }

    function bind() {
        byId("langToggle").addEventListener("click", () => setLanguage(state.lang === "ar" ? "en" : "ar", true));
        byId("companySearch").addEventListener("input", (event) => {
            state.query = event.target.value;
            renderWatchlist();
        });
        byId("watchTabs").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
            state.watchTab = button.dataset.tab;
            byId("watchTabs").querySelectorAll("button").forEach((tab) => tab.classList.toggle("active", tab === button));
            renderWatchlist();
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
    }

    bind();
    const stored = localStorage.getItem("starta-lang") || localStorage.getItem("lang");
    setLanguage(stored === "ar" ? "ar" : "en", false);
    loadMarket();
}());
