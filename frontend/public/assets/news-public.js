(function () {
    const translations = {
        en: {
            nav_features: "FEATURES",
            nav_funds: "MUTUAL FUNDS",
            nav_pulse: "MARKET PULSE",
            nav_learn: "LEARN",
            nav_news: "NEWS",
            nav_about: "ABOUT US",
            nav_pricing: "PRICING",
            news_title: "Market stories, clearly told.",
            news_intro: "",
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
            minute_read: "min read"
        },
        ar: {
            nav_features: "المزايا",
            nav_funds: "الصناديق الاستثمارية",
            nav_pulse: "نبض السوق",
            nav_learn: "تعلّم",
            nav_news: "الأخبار",
            nav_about: "معلومات عنا",
            nav_pricing: "الأسعار",
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
            minute_read: "دقيقة قراءة"
        }
    };

    const state = {
        lang: "en",
        days: 30,
        query: "",
        items: []
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
            .replace(/^\s*(?:cairo|egypt|dubai|riyadh|abu\s+dhabi|kuwait)\s*[-\u2013\u2014:]\s*/i, "")
            .replace(/^\s*(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya)\s*[-\u2013\u2014:]\s*/i, "")
            .replace(/^\s*(?:القاهرة|مصر)\s*[-\u2013\u2014:]\s*/, "")
            .replace(/^\s*(?:مباشر|[عآ]راب\s*فاينانس|زاوية)\s*[-\u2013\u2014:]\s*/, "")
            .replace(/\b(?:mubasher(?:\.info)?|arab\s*finance|arabfinance|zawya)\b/gi, "")
            .replace(/(مباشر|[عآ]راب\s*فاينانس|زاوية)/g, "")
            .replace(/^[-\u2013\u2014:\s]+/, "")
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
        if (refresh && document.body.dataset.page === "listing" && state.items.length) loadListing();
        if (refresh && document.body.dataset.page === "article" && state.items.length) location.href = "/News";
    }

    function media(item, eager = false) {
        const src = imageSource(item.image_url);
        if (src) {
            const priority = eager ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"';
            return `<div class="media-fallback"><span class="display">S</span></div><img src="${escapeHtml(src)}" alt="${escapeHtml(sanitize(item.headline))}"${priority} decoding="async">`;
        }
        return `<div class="media-fallback"><span class="display">S</span></div>`;
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

    function renderListing() {
        const text = translations[state.lang];
        const query = state.query.toLowerCase().trim();
        const filtered = state.items.filter((item) => {
            if (!query) return true;
            return `${sanitize(item.headline)} ${sanitize(item.article_body)} ${item.symbol || ""}`.toLowerCase().includes(query);
        });
        const featured = document.getElementById("featuredStory");
        const grid = document.getElementById("newsGrid");
        if (!filtered.length) {
            featured.innerHTML = "";
            grid.innerHTML = `<div class="message"><h2 class="display">${text.no_results}</h2><p>${text.no_results_text}</p></div>`;
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
    }

    async function loadListing() {
        const text = translations[state.lang];
        const featured = document.getElementById("featuredStory");
        const grid = document.getElementById("newsGrid");
        if (listingController) listingController.abort();
        listingController = new AbortController();
        const queryParam = state.query.trim() ? `&q=${encodeURIComponent(state.query.trim())}` : "";
        featured.innerHTML = "";
        grid.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
        try {
            const response = await fetch(`/api/v1/news?source_country=EG&language=${state.lang}&days=${state.days}&limit=36${queryParam}`, {
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
        document.getElementById("langToggle").addEventListener("click", () => setLanguage(state.lang === "ar" ? "en" : "ar"));
        if (document.body.dataset.page === "listing") {
            document.getElementById("newsSearch").addEventListener("input", (event) => {
                state.query = event.target.value;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(loadListing, 180);
            });
            document.querySelectorAll("[data-days]").forEach((button) => button.addEventListener("click", () => {
                state.days = Number(button.dataset.days);
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
