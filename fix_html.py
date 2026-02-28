import re

with open('frontend/public/home.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Navigation links
nav_target = """                    <a href="#roadmap" class="hover:text-starta-teal transition-colors"
                        data-key="nav_roadmap">ROADMAP</a>
                    <a href="#pricing" class="hover:text-starta-teal transition-colors"
                        data-key="nav_pricing">PRICING</a>"""

nav_replacement = """                    <a href="#roadmap" class="hover:text-starta-teal transition-colors"
                        data-key="nav_roadmap">ROADMAP</a>
                    <a href="#about" class="hover:text-starta-teal transition-colors"
                        data-key="nav_about">ABOUT US</a>
                    <a href="#pricing" class="hover:text-starta-teal transition-colors hidden"
                        data-key="nav_pricing">PRICING</a>"""

html = html.replace(nav_target, nav_replacement)

# 2. Add Section
section_target = """    <!-- 20. PRICING & CLOSE (Updated to match image) -->
    <section id="pricing" class="py-40 bg-page border-t border-border relative section-premium-xl">"""

section_replacement = """    <!-- 19. ABOUT US -->
    <section id="about" class="py-32 bg-surface border-t border-border section-premium">
        <div class="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div class="space-y-8 reveal-text">
                <span class="section-tag" data-key="about_tag">OUR MISSION</span>
                <h2 class="section-title text-main" data-key="about_title">Empowering Intelligent<br>Investing.</h2>
                <p class="text-muted copy-premium" data-key="about_text">
                    At Starta, we believe that high-quality financial intelligence should be accessible, transparent, and actionable. Our team of data scientists and financial experts has built an institutional-grade platform designed to remove the noise and highlight what truly matters in the market.
                </p>
                <div class="grid grid-cols-2 gap-6 pt-4">
                    <div class="p-4 bg-panel rounded border border-border">
                        <div class="text-starta-teal font-bold mb-1" data-key="about_val1_title">Innovation</div>
                        <div class="text-xs text-muted" data-key="about_val1_text">Cutting-edge AI meets proven financial models.</div>
                    </div>
                    <div class="p-4 bg-panel rounded border border-border">
                        <div class="text-starta-teal font-bold mb-1" data-key="about_val2_title">Integrity</div>
                        <div class="text-xs text-muted" data-key="about_val2_text">Data-driven insights with zero bias.</div>
                    </div>
                </div>
            </div>
            <div class="relative h-[450px] w-full glass-premium rounded-2xl overflow-hidden border border-border flex items-center justify-center p-8">
                <div class="absolute inset-0 opacity-20" style="background-image: var(--grad-grid);"></div>
                <div class="z-10 text-center space-y-6">
                    <div class="w-24 h-24 mx-auto bg-starta-teal/10 rounded-full flex items-center justify-center border border-starta-teal/30 shadow-neon">
                        <svg class="w-10 h-10 text-starta-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-main" data-key="about_vision">Redefining Market Analysis</h3>
                    <p class="text-sm text-muted max-w-sm mx-auto" data-key="about_vision_text">We are committed to delivering clarity and precision to every investor, equipping you with the edge needed to navigate today's markets.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- 20. PRICING & CLOSE (Updated to match image) -->
    <section id="pricing" class="py-40 bg-page border-t border-border relative section-premium-xl hidden">"""

html = html.replace(section_target, section_replacement)

# 3. Add Translations EN
en_target = """                nav_features: "FEATURES", nav_mobile: "MOBILE", nav_roadmap: "ROADMAP", nav_pricing: "PRICING", nav_cta: "TRY NOW",
                hero_kicker:"""

en_replacement = """                nav_features: "FEATURES", nav_mobile: "MOBILE", nav_roadmap: "ROADMAP", nav_pricing: "PRICING", nav_about: "ABOUT US", nav_cta: "TRY NOW",
                about_tag: "OUR MISSION", about_title: "Empowering Intelligent<br>Investing.", about_text: "At Starta, we believe that high-quality financial intelligence should be accessible, transparent, and actionable. Our team of data scientists and financial experts has built an institutional-grade platform designed to remove the noise and highlight what truly matters in the market.", about_val1_title: "Innovation", about_val1_text: "Cutting-edge AI meets proven financial models.", about_val2_title: "Integrity", about_val2_text: "Data-driven insights with zero bias.", about_vision: "Redefining Market Analysis", about_vision_text: "We are committed to delivering clarity and precision to every investor, equipping you with the edge needed to navigate today's markets.",
                hero_kicker:"""

html = html.replace(en_target, en_replacement)

# 4. Add Translations AR
ar_target = """                nav_features: "المزايا", nav_mobile: "الجوال", nav_roadmap: "خارطة الطريق", nav_pricing: "الأسعار", nav_cta: "جرّب الآن",
                hero_kicker:"""

ar_replacement = """                nav_features: "المزايا", nav_mobile: "الجوال", nav_roadmap: "خارطة الطريق", nav_pricing: "الأسعار", nav_about: "معلومات عنا", nav_cta: "جرّب الآن",
                about_tag: "مهمتنا", about_title: "تمكين الاستثمار<br>الذكي.", about_text: "في ستاراتا، نؤمن بأن الذكاء المالي عالي الجودة يجب أن يكون متاحاً وشفافاً وقابلاً للتنفيذ. قام فريقنا من علماء البيانات والخبراء الماليين ببناء منصة على مستوى مؤسساتي مصممة لإزالة الضوضاء وتسليط الضوء على ما يهم حقاً في السوق.", about_val1_title: "الابتكار", about_val1_text: "أحدث التقنيات القائمة على الذكاء الاصطناعي تجتمع مع نماذج مالية مثبتة.", about_val2_title: "النزاهة", about_val2_text: "رؤى مدعومة بالبيانات بدون تحيز.", about_vision: "إعادة تعريف تحليل السوق", about_vision_text: "نحن ملتزمون بتقديم الوضوح والدقة لكل مستثمر، وتزويدك بالميزة اللازمة للتنقل في أسواق اليوم.",
                hero_kicker:"""

html = html.replace(ar_target, ar_replacement)

with open('frontend/public/home.html', 'w', encoding='utf-8') as f:
    f.write(html)
