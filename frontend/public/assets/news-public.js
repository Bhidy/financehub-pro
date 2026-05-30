(function () {
    const translations = {
        en: {
            nav_home: "HOME",
            nav_funds: "MUTUAL FUNDS",
            nav_pulse: "MARKET PULSE",
            nav_learn: "LEARN",
            nav_news: "MARKET NEWS",
            nav_portfolio: "PORTFOLIO",
            nav_about: "ABOUT US",
            news_title: "Track market news in real-time.",
            news_intro: "Follow key market developments, corporate news, and economic updates.",
            search_placeholder: "Search headlines or companies",
            latest: "Latest",
            month: "30 days",
            quarter: "90 days",
            featured: "Featured story",
            read_article: "Read article",
            no_results: "No stories match your search.",
            no_results_text: "Try another phrase or view a wider period.",
            error_title: "News is temporarily unavailable.",
            error_text: "Please refresh the page shortly.",
            unavailable: "This story is unavailable.",
            unavailable_text: "Return to News to browse the latest market stories.",
            minute_read: "min read",
            prev: "Previous",
            next: "Next",
            page: "Page",
            all_time: "All"
        },
        ar: {
            nav_home: "الرئيسية",
            nav_funds: "الصناديق الاستثمارية",
            nav_pulse: "نبض السوق",
            nav_learn: "تعلّم",
            nav_news: "أخبار السوق",
            nav_portfolio: "المحفظة",
            nav_about: "معلومات عنا",
            news_title: "تابع أخبار السوق لحظة بلحظة",
            news_intro: "تابع أهم تطورات السوق وأخبار الشركات والمستجدات الاقتصادية",
            search_placeholder: "ابحث في الأخبار أو الشركات",
            latest: "الأحدث",
            month: "30 يوماً",
            quarter: "90 يوماً",
            featured: "الخبر الأبرز",
            read_article: "اقرأ الخبر",
            no_results: "لا توجد أخبار مطابقة لبحثك.",
            no_results_text: "جرّب عبارة أخرى أو فترة زمنية أوسع.",
            error_title: "الأخبار غير متاحة مؤقتاً.",
            error_text: "يرجى تحديث الصفحة بعد قليل.",
            unavailable: "هذا الخبر غير متاح.",
            unavailable_text: "عُد إلى الأخبار لتصفح آخر تطورات السوق.",
            minute_read: "دقيقة قراءة",
            prev: "السابق",
            next: "التالي",
            page: "صفحة",
            all_time: "الكل"
        }
    };

    // ===== NEWS CATEGORIES =====
    const CATEGORIES = [
        {
            id: 'all',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="1" width="5.5" height="5.5" rx="1.2"/><rect x="9.5" y="1" width="5.5" height="5.5" rx="1.2"/><rect x="1" y="9.5" width="5.5" height="5.5" rx="1.2"/><rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.2"/></svg>`,
            en: 'All', ar: 'الكل',
            match: () => true
        },
        {
            id: 'stocks',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="1" y="5" width="3" height="6" rx="0.5"/><line x1="2.5" y1="2.5" x2="2.5" y2="5"/><line x1="2.5" y1="11" x2="2.5" y2="13.5"/><rect x="6.5" y="7" width="3" height="4" rx="0.5"/><line x1="8" y1="5" x2="8" y2="7"/><line x1="8" y1="11" x2="8" y2="13"/><rect x="12" y="6" width="3" height="5" rx="0.5"/><line x1="13.5" y1="3.5" x2="13.5" y2="6"/><line x1="13.5" y1="11" x2="13.5" y2="13.5"/></svg>`,
            en: 'Stocks', ar: 'الأسهم',
            match: (item) => !!item.symbol || /stocks?/i.test(item.source_section || '')
        },
        {
            id: 'economy',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M1.5 8h13M8 1.5c-2 2.3-3 4.4-3 6.5s1 4.2 3 6.5M8 1.5c2 2.3 3 4.4 3 6.5s-1 4.2-3 6.5"/></svg>`,
            en: 'Economy', ar: 'الاقتصاد',
            match: (item) => {
                const h = (item.headline || '').toLowerCase();
                const s = (item.source_section || '').toLowerCase();
                return /economy|gdp|inflation|central.bank|cbe|imf|fiscal|monetary|export|import|\btrade\b|investment|macr|growth|currency|pound|egp|dollar/.test(h)
                    || /اقتصاد|ناتج|تضخم|فائدة|مركزي|صادرات|واردات|تجارة|صندوق|عملة|جنيه/.test(h)
                    || /economy|north-africa|gcc|macro/.test(s);
            }
        },
        {
            id: 'banking',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 13.5h13M1.5 6h13M8 1.5 1.5 6h13z"/><line x1="3.5" y1="6" x2="3.5" y2="13.5"/><line x1="6.5" y1="6" x2="6.5" y2="13.5"/><line x1="9.5" y1="6" x2="9.5" y2="13.5"/><line x1="12.5" y1="6" x2="12.5" y2="13.5"/></svg>`,
            en: 'Banking', ar: 'البنوك',
            match: (item) => {
                const h = (item.headline || '').toLowerCase();
                const sym = (item.symbol || '').toUpperCase();
                return /bank(?:ing)?|\bloan\b|credit|deposit|lender|lending|mortgage|npl|fintech|payment/.test(h)
                    || /بنك|مصرف|ائتمان|قرض|ودائع|تمويل مصرفي|دفع/.test(h)
                    || /banking/.test(item.source_section || '')
                    || /^(CIB|COMI|QNBE|EGBE|ADIB|MASR|SAIB|EGAL|NBEK|ABUK|ARAB|AIBANK|CVMC)$/.test(sym);
            }
        },
        {
            id: 'realestate',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 8 8 2l6.5 6M3 7.2v7h10v-7"/><path d="M6.5 14.2v-4h3v4"/></svg>`,
            en: 'Real Estate', ar: 'العقارات',
            match: (item) => {
                const h = (item.headline || '').toLowerCase();
                const sym = (item.symbol || '').toUpperCase();
                return /real.estate|propert(?:y|ies)|housing|residential|compound|villa|apartment|development.project|construction|new.capital|new.cairo|hillage|madaar/.test(h)
                    || /عقار|عقارات|إسكان|تطوير|مجمع|قرية|شقق|فيلا|سكني|العاصمة الإدارية/.test(h)
                    || /^(TMGH|HRHO|PRMH|MNHD|AMER|ORAS|MFPC|PHDC)$/.test(sym);
            }
        },
        {
            id: 'energy',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 1.5 4.5 8.5h5.5L7.5 14.5l7-8H9z"/></svg>`,
            en: 'Energy', ar: 'الطاقة',
            match: (item) => {
                const h = (item.headline || '').toLowerCase();
                const sym = (item.symbol || '').toUpperCase();
                return /\benergy\b|\boil\b|\bgas\b|petroleum|electricity|power.station|solar|nuclear|fuel|renewable|lng|lpg|hydro|hydrogen/.test(h)
                    || /طاقة|نفط|غاز|بترول|كهرباء|محطة|شمسي|نووي|وقود|هيدروجين/.test(h)
                    || /energy/.test(item.source_section || '')
                    || /^(TAQA|ELEC|PICO|EKHO|HELI)$/.test(sym);
            }
        },
        {
            id: 'earnings',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5v.6M8 10.9v.6M10.2 6.5a2.2 2.2 0 0 0-4.4 0c0 2.3 4.4 2.3 4.4 4.5a2.2 2.2 0 0 1-4.4 0"/></svg>`,
            en: 'Earnings', ar: 'الأرباح',
            match: (item) => {
                const h = (item.headline || '').toLowerCase();
                return /earnings?|dividend|profit|revenue|results?|annual.report|quarterly|half.year|net.income|\beps\b|payout|distribution|financial.results/.test(h)
                    || /أرباح|توزيع|إيرادات|نتائج|ربحية|ربع|سنوي|صافي|عائد|دخل|عائد توزيع/.test(h);
            }
        },
        {
            id: 'markets',
            icon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1.5,11 4.5,7.5 7,9.5 11,5.5 14.5,3"/><circle cx="14.5" cy="3" r="1.5" fill="currentColor" stroke="none"/><line x1="1.5" y1="14" x2="14.5" y2="14"/></svg>`,
            en: 'Markets', ar: 'السوق',
            match: (item) => {
                const h = (item.headline || '').toLowerCase();
                return /\bipo\b|public.offering|\blisting\b|egx.30|egx.70|market.cap|sukuk|bond.issu|capital.increas|\bbourse\b|stock.exchange|index.close|index.rise|index.fall/.test(h)
                    || /اكتتاب|طرح عام|قيد|مؤشر|رأس المال|صكوك|سند|بورصة|تداول|مؤشر البورصة/.test(h);
            }
        }
    ];

    const state = {
        lang: "en",
        days: 30,
        query: "",
        category: "all",
        items: [],
        page: 1,
        limit: 12
    };
    let listingController = null;
    let searchTimer = null;

    function escapeHtml(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function sanitize(value) {
        if (!value) return "";
        return String(value)
            .replace(/^\s*(?:cairo|egypt|dubai|riyadh|abu\s+dhabi|kuwait)\s*[-–—:]\s*/i, "")
            .replace(/^\s*(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya)\s*[-–—:]\s*/i, "")
            .replace(/^\s*(?:القاهرة|مصر)\s*[-–—:]\s*/, "")
            .replace(/^\s*(?:مباشر|[عآ]راب\s*فاينانس|زاوية)\s*[-–—:]\s*/, "")
            .replace(/\b(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya)\b/gi, "")
            .replace(/(مباشر|[عآ]راب\s*فاينانس|زاوية)/g, "")
            .replace(/^[-–—:\s]+/, "")
            .replace(/[ \t]+([,.;:!?])/g, "$1")
            .replace(/\r\n/g, "\n")
            .replace(/[ \t]{2,}/g, " ")
            .trim();
    }

    function imageSource(url) {
        if (!url) return "";
        if (url.includes("static.mubasher.info/File.Story_Image/")) {
            return `/api/v1/news-image?url=${encodeURIComponent(url)}`;
        }
        return url;
    }

    function formattedDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat(state.lang === "ar" ? "ar-EG" : "en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    }

    function relativeDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
        if (days === 0) return state.lang === "ar" ? "اليوم" : "Today";
        return new Intl.RelativeTimeFormat(state.lang === "ar" ? "ar" : "en", { numeric: "auto" }).format(-days, "day");
    }

    // ===== RENDER CATEGORY CHIPS =====
    function renderCategories() {
        const strip = document.getElementById("catStrip");
        if (!strip) return;
        strip.innerHTML = CATEGORIES.map(cat => {
            const label = cat[state.lang] || cat.en;
            const isActive = state.category === cat.id;
            return `<button type="button" class="cat-chip${isActive ? " active" : ""}" data-cat="${cat.id}" aria-pressed="${isActive}">
                ${cat.icon}<span>${label}</span>
            </button>`;
        }).join("");
        strip.querySelectorAll(".cat-chip").forEach(btn => {
            btn.addEventListener("click", () => {
                state.category = btn.dataset.cat;
                renderCategories();
                renderListing();
            });
        });
    }

    function setLanguage(lang, options = {}) {
        const refresh = options.refresh !== false;
        state.lang = lang === "ar" ? "ar" : "en";
        localStorage.setItem("starta-lang", state.lang);
        localStorage.setItem("lang", state.lang);
        document.documentElement.lang = state.lang;
        document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
        const text = translations[state.lang];
        document.querySelectorAll("[data-key]").forEach((node) => {
            const key = node.dataset.key;
            if (text[key]) node.textContent = text[key];
        });
        document.querySelectorAll("[data-placeholder]").forEach((node) => {
            node.placeholder = text[node.dataset.placeholder] || "";
        });
        const intro = document.getElementById("newsIntro");
        if (intro) {
            intro.textContent = text.news_intro;
            intro.hidden = !text.news_intro;
        }
        document.getElementById("langToggle").textContent = state.lang === "ar" ? "EN" : "AR";
        renderCategories();
        if (refresh && document.body.dataset.page === "listing" && state.items.length) loadListing();
        if (refresh && document.body.dataset.page === "article" && state.items.length) location.href = "/News";
    }

    function media(item, eager = false) {
        // Always use the deterministic category cover. Never fall back to scraped image_url —
        // those images are unrelated, broken, or wrong-language. If news-covers.js somehow
        // isn't loaded, derive a safe path inline so the cover is always on-brand.
        let src;
        if (window.StarTaNewsCovers) {
            src = window.StarTaNewsCovers.getUrl(item, state.lang);
        } else {
            // Inline fallback: economy catch-all cover for the current lang.
            const l = state.lang === 'ar' ? 'ar' : 'en';
            src = `/assets/news-covers/${l}-economy.webp`;
        }
        const priority = eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
        return `<div class="media-fallback"><span class="display">S</span></div><img src="${escapeHtml(src)}" alt="" ${priority} decoding="async">`;
    }

    function itemLink(id) {
        return `/News/${encodeURIComponent(id)}`;
    }

    function readMinutes(body) {
        const words = sanitize(body).split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.round(words / 210));
    }

    function storyCard(item) {
        const text = translations[state.lang];
        const title = sanitize(item.headline) || (state.lang === "ar" ? "تحديث من السوق" : "Market update");
        return `
            <article class="story-card">
                <a class="story-media" href="${itemLink(item.id)}">${media(item)}</a>
                <div class="story-content">
                    ${item.symbol ? `<span class="symbol">${escapeHtml(item.symbol)}</span>` : ""}
                    <h2 class="display"><a href="${itemLink(item.id)}">${escapeHtml(title)}</a></h2>
                    <div class="story-foot">
                        <span class="meta">${escapeHtml(relativeDate(item.published_at))}</span>
                        <a class="read-more" href="${itemLink(item.id)}">${text.read_article}<span>${state.lang === "ar" ? "←" : "→"}</span></a>
                    </div>
                </div>
            </article>
        `;
    }

    function renderPagination(filteredCount) {
        const bar = document.getElementById("paginationBar");
        if (!bar) return;
        const text = translations[state.lang];

        if (state.items.length === 0 && state.page === 1) {
            bar.innerHTML = "";
            return;
        }

        // Show pagination only if page > 1 OR we fetched a full batch (meaning there could be a page 2)
        if (state.page === 1 && state.items.length < state.limit) {
            bar.innerHTML = "";
            return;
        }

        const isNextDisabled = state.items.length < state.limit;
        const alignStyle = state.lang === "ar" ? "flex-direction: row-reverse;" : "";

        bar.innerHTML = `
            <div class="pagination-inner" style="width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 1rem; ${alignStyle}">
                <button type="button" id="prevPageBtn" class="control-btn" ${state.page === 1 ? "disabled" : ""} style="padding: 0.6rem 1.2rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                    ${state.lang === "ar" ? "←" : ""} ${text.prev}
                </button>
                <span class="page-num display" style="font-size: 0.9rem; font-weight: 700; opacity: 0.85;">
                    ${text.page} ${state.page}
                </span>
                <button type="button" id="nextPageBtn" class="control-btn" ${isNextDisabled ? "disabled" : ""} style="padding: 0.6rem 1.2rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
                    ${text.next} ${state.lang === "ar" ? "" : "→"}
                </button>
            </div>
        `;

        const prevBtn = document.getElementById("prevPageBtn");
        const nextBtn = document.getElementById("nextPageBtn");

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                if (state.page > 1) {
                    state.page -= 1;
                    loadListing().then(() => {
                        const toolbar = document.querySelector(".toolbar");
                        if (toolbar) toolbar.scrollIntoView({ behavior: "smooth" });
                    });
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                state.page += 1;
                loadListing().then(() => {
                    const toolbar = document.querySelector(".toolbar");
                    if (toolbar) toolbar.scrollIntoView({ behavior: "smooth" });
                });
            });
        }
    }

    function renderListing() {
        const text = translations[state.lang];
        const query = state.query.toLowerCase().trim();
        const cat = CATEGORIES.find(c => c.id === state.category) || CATEGORIES[0];
        const filtered = state.items.filter((item) => {
            if (query) {
                const searchText = `${sanitize(item.headline)} ${sanitize(item.article_body)} ${item.symbol || ""}`.toLowerCase();
                if (!searchText.includes(query)) return false;
            }
            return cat.match(item);
        });
        const featured = document.getElementById("featuredStory");
        const grid = document.getElementById("newsGrid");
        if (!filtered.length) {
            featured.innerHTML = "";
            grid.innerHTML = `<div class="message"><h2 class="display">${text.no_results}</h2><p>${text.no_results_text}</p></div>`;
            renderPagination(0);
            return;
        }
        const item = filtered[0];
        const title = sanitize(item.headline);
        featured.innerHTML = `
            <article class="feature">
                <a class="feature-media" href="${itemLink(item.id)}">${media(item, true)}</a>
                <div class="feature-copy">
                    <span class="eyebrow">${text.featured}</span>
                    ${item.symbol ? `<span class="symbol" style="margin-top:1rem">${escapeHtml(item.symbol)}</span>` : ""}
                    <h2 class="display"><a href="${itemLink(item.id)}">${escapeHtml(title)}</a></h2>
                    <div class="meta"><span>${escapeHtml(formattedDate(item.published_at))}</span><span>•</span><span>${escapeHtml(relativeDate(item.published_at))}</span></div>
                    <a class="read-more" href="${itemLink(item.id)}">${text.read_article}<span>${state.lang === "ar" ? "←" : "→"}</span></a>
                </div>
            </article>`;
        grid.innerHTML = filtered.slice(1).map(storyCard).join("");
        renderPagination(filtered.length);
    }

    async function loadListing() {
        const text = translations[state.lang];
        const featured = document.getElementById("featuredStory");
        const grid = document.getElementById("newsGrid");
        const pagBar = document.getElementById("paginationBar");
        if (listingController) listingController.abort();
        listingController = new AbortController();
        const queryParam = state.query.trim() ? `&q=${encodeURIComponent(state.query.trim())}` : "";
        featured.innerHTML = "";
        if (pagBar) pagBar.innerHTML = "";
        grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
        try {
            const response = await fetch(`/api/v1/news?source_country=EG&language=${state.lang}&days=${state.days}&limit=${state.limit}&page=${state.page}${queryParam}`, {
                cache: "no-store",
                signal: listingController.signal
            });
            if (!response.ok) throw new Error("request failed");
            state.items = await response.json();
            renderListing();
        } catch (error) {
            if (error.name === "AbortError") return;
            grid.innerHTML = `<div class="message"><h2 class="display">${text.error_title}</h2><p>${text.error_text}</p></div>`;
        }
    }

    function renderArticle(item) {
        const text = translations[state.lang];
        const container = document.getElementById("articleContent");
        if (!item) {
            container.innerHTML = `<div class="message"><h2 class="display">${text.unavailable}</h2><p>${text.unavailable_text}</p></div>`;
            return;
        }
        const title = sanitize(item.headline);
        const paragraphs = sanitize(item.article_body).split(/\n{2,}/).filter(Boolean);
        const minutes = readMinutes(item.article_body);
        container.innerHTML = `
            <section class="hero article-hero">
                <div class="article-hero-grid">
                    <div class="hero-content">
                        <h1 class="display article-title" dir="auto">${escapeHtml(title)}</h1>
                        <div class="meta">
                            ${item.symbol ? `<span class="symbol">${escapeHtml(item.symbol)}</span>` : ""}
                            <span>${escapeHtml(formattedDate(item.published_at || item.published_date_raw))}</span>
                            <span>•</span>
                            <span>${escapeHtml(relativeDate(item.published_at || item.published_date_raw))}</span>
                            <span>•</span>
                            <span>${minutes} ${text.minute_read}</span>
                        </div>
                    </div>
                    <div class="article-image">${media(item, true)}</div>
                </div>
            </section>
            <div class="article-layout">
                <div class="article-column">
                    <article class="article-body" dir="auto">
                        ${paragraphs.length ? paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("") : `<p>${escapeHtml(text.unavailable_text)}</p>`}
                    </article>
                </div>
            </div>`;
    }

    async function loadArticle() {
        const id = location.pathname.split("/").filter(Boolean)[1];
        const container = document.getElementById("articleContent");
        container.innerHTML = '<div class="skeleton"></div>';
        try {
            const response = await fetch(`/api/v1/news?id=${encodeURIComponent(id)}&source_country=EG&limit=1`, { cache: "no-store" });
            if (!response.ok) throw new Error("request failed");
            state.items = await response.json();
            if (state.items[0]?.content_language) {
                setLanguage(state.items[0].content_language, { refresh: false });
            }
            renderArticle(state.items[0]);
        } catch (_) {
            renderArticle(null);
        }
    }

    function init() {
        const stored = localStorage.getItem("starta-lang") || localStorage.getItem("lang");
        setLanguage(stored === "ar" ? "ar" : "en", { refresh: false });
        renderCategories();
        document.getElementById("langToggle").addEventListener("click", () => setLanguage(state.lang === "ar" ? "en" : "ar"));
        if (document.body.dataset.page === "listing") {
            document.getElementById("newsSearch").addEventListener("input", (event) => {
                state.query = event.target.value;
                state.page = 1;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(loadListing, 180);
            });
            document.querySelectorAll("[data-days]").forEach((button) => button.addEventListener("click", () => {
                state.days = Number(button.dataset.days);
                state.page = 1;
                document.querySelectorAll("[data-days]").forEach((target) => target.classList.toggle("active", target === button));
                loadListing();
            }));
            loadListing();
        } else {
            loadArticle();
        }
    }

    init();
}());
