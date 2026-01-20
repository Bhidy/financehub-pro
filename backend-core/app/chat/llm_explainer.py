"""
LLM Explainer Service
=====================
Acts as the "Stylist & Expert Voice" layer for the Chatbot.
Takes raw data (decided by the Brain) and generates natural language explanations.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List
from groq import AsyncGroq

# Logger
logger = logging.getLogger(__name__)

# Constants
# Use a default key if env var is missing to avoid crash during init, but fail gracefully later 
GROQ_API_KEY = os.environ.get("GROQ_API_KEY") 
MODEL_NAME = "llama-3.3-70b-versatile" # Fast, high quality
MAX_TOKENS = 400
TIMEOUT = 4.0 # Slightly increased for better analysis

class LLMExplainerService:
    """Service to generate natural language explanations for data."""
    
    def __init__(self):
        self.client = None
        if GROQ_API_KEY:
            try:
                self.client = AsyncGroq(api_key=GROQ_API_KEY)
                logger.info("LLMExplainerService initialized with Groq")
            except Exception as e:
                logger.error(f"Failed to init Groq client: {e}")
        else:
            logger.warning("GROQ_API_KEY not found. LLM Explainer disabled.")

        # Local High-Speed Dictionary for Fact Explanations (Zero Latency)
        self.FACT_DEFINITIONS = {
            "pe_ratio": ("Price-to-Earnings Ratio", "Measures a company's current share price relative to its per-share earnings. High P/E suggests investors expect high growth or the stock is overvalued."),
            "eps": ("Earnings Per Share", "The portion of a company's profit allocated to each share. Higher is generally better."),
            "market_cap": ("Market Capitalization", "The total value of a company's shares. (Price x Total Shares). Indicates company size."),
            "dividend_yield": ("Dividend Yield", "Annual dividends paid relative to share price. Shows how much cash flow you get for every dollar invested."),
            "beta": ("Beta", "Measure of volatility. Beta > 1 means more volatile than the market, Beta < 1 means more stable."),
            "rsi": ("RSI (Relative Strength Index)", "Momentum indicator. >70 is Overbought (price might drop), <30 is Oversold (price might rise)."),
            "macd": ("MACD", "Trend-following momentum indicator. Crossovers signal buy/sell opportunities."),
            "roce": ("ROCE", "Return on Capital Employed. Measures how efficiently a company uses its capital to generate profits."),
            "revenue_growth": ("Revenue Growth", "The increase in sales over a specific period. A key indicator of business expansion."),
            "net_margin": ("Net Profit Margin", "The percentage of revenue that remains as profit after all expenses."),
            "debt_to_equity": ("Debt-to-Equity", "Ratio of total debt to shareholder equity. High ratio implies higher financial risk."),
            "free_cash_flow": ("Free Cash Flow", "Cash generated after accounting for capital expenditures. Vital for paying dividends or expansion."),
            "z_score": ("Altman Z-Score", "Predicts bankruptcy risk. Score > 3 is safe, < 1.8 is in distress."),
            "f_score": ("Piotroski F-Score", "Score of 0-9 assessing financial strength. 9 is perfect, 0-2 is weak."),
            "ebitda": ("EBITDA", "Earnings Before Interest, Taxes, Depreciation, and Amortization. A measure of a company's overall financial performance."),
            "pb_ratio": ("P/B Ratio", "Price-to-Book Ratio. Compares market value to book value. Lower P/B could mean the stock is undervalued."),
            "current_ratio": ("Current Ratio", "Measures a company's ability to pay short-term obligations or those due within one year."),
            "quick_ratio": ("Quick Ratio", "Indicator of a company's short-term liquidity position, also known as the acid-test ratio."),
            "operating_margin": ("Operating Margin", "Measures how much profit a company makes on a dollar of sales after paying for variable costs of production."),
            "roe": ("Return on Equity", "Measures a corporation's profitability in relation to stockholders' equity."),
            "roa": ("Return on Assets", "Indicator of how profitable a company is relative to its total assets."),
            "peg_ratio": ("PEG Ratio", "Price/Earnings-to-Growth ratio. Determines a stock's value while taking the company's earnings growth into account.")
        }

    async def generate_narrative(
        self, 
        query: str, 
        intent: str,
        data: List[Dict[str, Any]], 
        language: str = "en",
        user_name: str = "Trader",
        allow_greeting: bool = False, # CHANGED FROM is_first_message
        is_returning_user: bool = False
    ) -> Optional[str]:
        """
        Generates the 'Conversational Voice' (Narrative) layer.
        Uses Split-Prompt Architecture to enforce strictly no greetings in ongoing chats.
        """
        if not self.client:
            return None

        # Build Data Context Summary
        context_str = self._format_data_for_context(data)
        lang_instruction = "Arabic (Modern Standard)" if language == 'ar' else "English"
        
        # WORLD-CLASS CONVERSATIONAL FRAMEWORK
        # =====================================
        # Layer ② - Data-Aware Commentary (Core - this is what LLM generates)
        # The LLM produces the core narrative; Layers ① and ③ are added by ResponseComposer
        
        # Build card type context for the LLM
        card_types = [c.get('type', 'data') for c in data] if data else []
        card_context = self._describe_cards(card_types)
        
        if allow_greeting:
            # --- PROMPT A: NEW SESSION (Conversational Intent) ---
            # When user says "hello" or first message is conversational
            system_prompt = (
                f"You are Starta (ستارتا), a friendly and expert Financial Analyst.\n\n"
                
                "GREETING ALLOWED - This is a new conversation.\n"
                "You MUST welcome the user naturally as if continuing a discussion.\n"
                f"Refer to the user by their email/name: '{user_name}'\n"
                "Examples:\n"
                f"- 'Hi {user_name}, good to see you! What market data are we analyzing today?'\n"
                f"- 'Welcome back, {user_name}. I'm ready to discuss the latest stock moves.'\n\n"
                
                "GUIDELINES:\n"
                f"1. LANGUAGE: Respond ONLY in {lang_instruction}.\n"
                "2. LENGTH: STRICTLY 20-40 words. Short, punchy, and engaging.\n"
                "3. STYLE: Conversational, discussion-like, warm.\n"
                "4. NO marketing language. Treat this as a chat between experts.\n"
            )
        else:
            # --- PROMPT B: ONGOING CONVERSATION (Data-Focused) ---
            # This is the core narrative prompt - produces Layer ②
            system_prompt = (
                f"You are Starta, an expert Financial Analyst providing data commentary.\n\n"
                
                "⛔ CRITICAL: This is an ONGOING conversation.\n"
                "DO NOT greet. DO NOT say welcome. DO NOT use the user's name.\n"
                "START DIRECTLY with your analysis.\n\n"
                
                "YOUR TASK (Layer ② - Data-Aware Commentary):\n"
                f"The user is being shown: {card_context}\n"
                "Your job is to EXPLAIN and CONTEXTUALIZE, not repeat raw numbers.\n\n"
                
                "GOOD RESPONSE PATTERNS:\n"
                "- 'Based on the latest numbers, here's how this stock is positioned.'\n"
                "- 'Looking at today's valuation metrics, this gives us a clearer picture.'\n"
                "- 'When we combine price movement with valuation, this is what stands out.'\n"
                "- 'The current metrics suggest the market is pricing in growth expectations.'\n"
                "- 'From a valuation perspective, this stock is in an interesting range.'\n\n"
                
                "BAD RESPONSES (NEVER DO THIS):\n"
                "- 'Welcome back!' ← FORBIDDEN\n"
                "- 'The price is 45.5 EGP' ← Already on card, don't repeat\n"
                "- 'P/E ratio is 12.5' ← Already on card\n"
                "- 'Hello Mohamed!' ← FORBIDDEN\n\n"
                
                "VARIATION REQUIREMENT:\n"
                "Each response must be UNIQUE. Never use the same phrasing twice.\n"
                "Be creative in how you describe the data context.\n\n"
                
                "GUIDELINES:\n"
                f"1. LANGUAGE: Respond ONLY in {lang_instruction}.\n"
                "2. LENGTH: 130-180 words. Provide deep, comprehensive analysis.\n"
                "3. INTEGRATION RULE: If you mention a technical term (like P/E, RSI, Volatility), you MUST briefly define it immediately within the sentence. \n"
                "   - Example: 'The P/E ratio, which measures the stock price relative to earnings, is currently high...'\n"
                "4. TONE: Calm, supportive, confident, expert. NO fluff phrases.\n"
            )

        try:
            # If no data exists (e.g., small talk or unknown), we still want a conversational response
            user_content = f"Query: {query}\nIntent: {intent}\n\nDATA:\n{context_str}"
            if not data:
                user_content = f"Query: {query}\nIntent: {intent}\n(No specific stock data found. Provide a helpful guide on what you can analyze.)"

            chat_completion = await self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                model=MODEL_NAME,
                max_tokens=250, 
                temperature=0.5, # Lower temperature for stricter adherence
                timeout=4.5
            )
            return chat_completion.choices[0].message.content.strip()
            
        except Exception as e:
            logger.warning(f"Narrative generation failed: {e}")
            return None

    def extract_fact_explanations(self, data: List[Dict[str, Any]], language: str = 'en') -> Dict[str, str]:
        """
        Scans response data for technical terms and providing definitions.
        ENSURES at least some definitions are present if data cards exist.
        """
        explanations = {}
        data_str = str(data).lower()
        
        # Extended bilingual dictionary
        # Extended bilingual dictionary
        FACTS = {
            "pe_ratio": {
                "en": ("P/E Ratio", "The Price-to-Earnings (P/E) Ratio measures a company's current share price relative to its per-share earnings. A high P/E could mean that a stock's price is high relative to earnings and possibly overvalued, or that investors are expecting high growth rates in the future. Conversely, a low P/E might indicate that the current stock price is low relative to earnings."),
                "ar": ("مضاعف الربحية (P/E)", "هو نسبة تقيس سعر سهم الشركة الحالي بالنسبة إلى أرباح السهم الواحد. يشير ارتفاع هذا المعدل إلى أن المستثمرين يتوقعون نمواً كبيراً في المستقبل، أو أن السهم مقيم بأعلى من قيمته الحقيقية. بينما قد يعني انخفاضه أن السهم مقيم بأقل من قيمته.")
            },
            "market_cap": {
                "en": ("Market Cap", "Market Capitalization refers to the total dollar market value of a company's outstanding shares of stock. It is calculated by multiplying the total number of a company's outstanding shares by the current market price of one share. It is a key indicator of a company's size."),
                "ar": ("القيمة السوقية", "القيمة السوقية هي إجمالي القيمة الدولارية لأسهم الشركة القائمة في السوق. يتم حسابها عن طريق ضرب العدد الإجمالي لأسهم الشركة القائمة في سعر السوق الحالي للسهم الواحد. وهي مؤشر رئيسي لحجم الشركة.")
            },
            "dividend_yield": {
                "en": ("Dividend Yield", "The dividend yield is a financial ratio (dividend/price) that shows how much a company pays out in dividends each year relative to its stock price. It is expressed as a percentage and represents the return on investment for a stock without any capital gains."),
                "ar": ("عائد التوزيعات", "عائد التوزيعات هو نسبة مالية توضح مقدار الأرباح التي توزعها الشركة سنوياً نسبة إلى سعر سهمها. يتم التعبير عنها كنسبة مئوية وتمثل العائد على الاستثمار من السهم دون حساب الأرباح الرأسمالية.")
            },
            "z_score": {
                "en": ("Z-Score", "The Altman Z-Score is a formula ensuring financial health. A score below 1.8 indicates a company is likely heading for bankruptcy, while a score above 3.0 indicates a company is in a solid financial position. It uses profitability, leverage, liquidity, solvency, and activity ratios."),
                "ar": ("مؤشر ألتمان (Z-Score)", "هو صيغة لقياس الصحة المالية للشركة. تشير الدرجة الأقل من 1.8 إلى احتمالية حدوث إفلاس، بينما تشير الدرجة الأعلى من 3.0 إلى وضع مالي قوي. يستخدم هذا المؤشر نسب الربحية والرافعة المالية والسيولة والملاءة المالية.")
            },
            "eps": {
                "en": ("EPS", "Earnings Per Share (EPS) is calculated as a company's profit divided by the outstanding shares of its common stock. The resulting number serves as an indicator of a company's profitability. It is common for a company to report EPS that is adjusted for extraordinary items."),
                "ar": ("ربحية السهم (EPS)", "يتم حساب ربحية السهم عن طريق قسمة صافي ربح الشركة على عدد الأسهم القائمة. يعتبر الرقم الناتج مؤشراً رئيسياً لربحية الشركة، وغالباً ما يتم استخدامه لمقارنة الأداء المالي بين الشركات المختلفة.")
            },
            "roe": {
                "en": ("ROE", "Return on Equity (ROE) is a measure of financial performance calculated by dividing net income by shareholders' equity. Because shareholders' equity is equal to a company's assets minus its debt, ROE constitutes the return on net assets."),
                "ar": ("العائد على حقوق الملكية", "هو مقياس للأداء المالي يتم حسابه بقسمة صافي الدخل على حقوق المساهمين. نظراً لأن حقوق المساهمين تساوي أصول الشركة مطروحاً منها ديونها، فإن العائد على حقوق الملكية يعتبر العائد على صافي الأصول.")
            },
            "pb_ratio": {
                "en": ("P/B Ratio", "The Price-to-Book (P/B) ratio compares a company's market value to its book value. A ratio under 1.0 is often considered a solid investment, indicating that the stock is potentially undervalued relative to the company's assets."),
                "ar": ("مضاعف القيمة الدفترية", "يقارن نسبة السعر إلى القيمة الدفترية بين القيمة السوقية للشركة وقيمتها الدفترية. غالباً ما تعتبر النسبة الأقل من 1.0 استثماراً جيداً، حيث تشير إلى أن السهم قد يكون مقيماً بأقل من قيمته الحقيقية بالنسبة لأصول الشركة.")
            },
            "ebitda": {
                "en": ("EBITDA", "EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization. It is an alternate measure of profitability to net income. EBITDA attempts to represent cash profit generated by the company's operations."),
                "ar": ("الأرباح قبل الفوائد والضرائب", "هي اختصار للأرباح قبل الفوائد والضرائب والإهلاكات والاستهلاكات. وهي مقياس بديل للربحية يختلف عن صافي الدخل، وتهدف إلى تمثيل الربح النقدي الناتج عن عمليات الشركة التشغيلية.")
            },
            "current_ratio": {
                "en": ("Current Ratio", "The Current Ratio is a liquidity ratio that measures a company's ability to pay short-term obligations or those due within one year. It tells investors and analysts how a company can maximize the current assets on its balance sheet to satisfy its current debt and other payables."),
                "ar": ("النسبة الحالية", "هي نسبة سيولة تقيس قدرة الشركة على سداد التزاماتها قصيرة الأجل أو المستحقة خلال عام واحد. تخبر المستثمرين بكيفية استغلال الشركة لأصولها الحالية لسداد ديونها ومدفوعاتها الأخرى.")
            },
            "operating_margin": {
                "en": ("Operating Margin", "Operating margin measures how much profit a company makes on a dollar of sales after paying for variable costs of production, such as wages and raw materials, but before paying interest or tax."),
                "ar": ("هامش التشغيل", "يقيس هامش التشغيل مقدار الربح الذي تحققه الشركة من كل دولار من المبيعات بعد دفع تكاليف الإنتاج المتغيرة، مثل الأجور والمواد الخام، ولكن قبل دفع الفوائد أو الضرائب.")
            }
        }
        
        # Priority 1: Match terms found in data
        for key, lang_data in FACTS.items():
            if key in data_str:
                title, definition = lang_data.get(language, lang_data['en'])
                explanations[title] = definition
                if len(explanations) >= 4: break

        # Priority 2: Force structure compliance by ensuring at least some definitions appear
        # The user requires: AI Reply -> Cards -> Definitions (ALWAYS)
        # So if we didn't find specific terms, we inject general market wisdom.
        if len(explanations) < 2:
            defaults = ["pe_ratio", "market_cap", "dividend_yield"]
            for key in defaults:
                title, definition = FACTS[key].get(language, FACTS[key]['en'])
                if title not in explanations:
                    explanations[title] = definition
                if len(explanations) >= 3: break
                    
        return explanations

    def _format_data_for_context(self, cards: List[Dict[str, Any]]) -> str:
        """Format the structured cards into a compact string for LLM."""
        try:
            summary_lines = []
            for card in cards:
                c_type = card.get("type")
                c_data = card.get("data", {})
                
                if c_type == "stock_header":
                    summary_lines.append(f"Stock: {c_data.get('symbol')} ({c_data.get('name')})")
                elif c_type == "snapshot":
                    summary_lines.append(f"Price: {c_data.get('last_price')} (Change: {c_data.get('change_percent')}%)")
                    summary_lines.append(f"Metrics: PE={c_data.get('pe_ratio')}, PB={c_data.get('pb_ratio')}, Cap={c_data.get('market_cap_formatted')}")
                elif c_type == "financial_trend":
                    items = c_data.get('items', [])
                    if items:
                        last = items[-1]
                        summary_lines.append(f"Growth: {last.get('label')} Revenue={last.get('revenue')} ({last.get('growth')}%)")
                elif c_type == "dividends":
                    items = c_data.get('items', [])
                    if items:
                        summary_lines.append(f"Dividends: Yield={c_data.get('yield')}%, History={len(items)} records")
                elif c_type == 'screener_results':
                    stocks = c_data.get('stocks', [])
                    metric = c_data.get('metric', 'value')
                    summary = f"Screener Results ({len(stocks)} stocks): "
                    stock_strings = []
                    for s in stocks[:5]:  # Top 5 for context brevity
                        val = s.get('value', s.get(metric, 'N/A'))
                        stock_strings.append(f"{s['name']} ({s['symbol']}): {val}")
                    summary_lines.append(summary + ", ".join(stock_strings))
                    
                elif c_type == 'movers_table':
                    movers = c_data.get('movers', [])
                    direction = c_data.get('direction', 'up')
                    label = "Top Gainers" if direction == 'up' else "Top Losers"
                    stock_strings = [f"{s['name']} ({s['symbol']}): {s['change_percent']}%" for s in movers[:5]]
                    summary_lines.append(f"{label}: " + ", ".join(stock_strings))
                    
                elif c_type == 'sector_list':
                    stocks = c_data.get('stocks', [])
                    sector = c_data.get('sector', 'Unknown Sector')
                    stock_strings = [f"{s['name']} ({s['symbol']}): {s['price']}" for s in stocks[:5]]
                    summary_lines.append(f"Sector {sector}: " + ", ".join(stock_strings))
                elif "screener" in c_type:
                    summary_lines.append(f"Search Results: Found {len(c_data.get('items', []))} stocks.")
            
            return "\n".join(summary_lines) or "No specific metrics found."
        except Exception as e:
            return f"Data extraction error: {e}"

    def _describe_cards(self, card_types: List[str]) -> str:
        """
        Convert card types to human-readable descriptions for LLM context.
        This helps the LLM understand what data the user is seeing.
        """
        CARD_DESCRIPTIONS = {
            "stock_header": "stock overview with price and daily change",
            "snapshot": "key metrics and valuation summary",
            "stats": "detailed statistics",
            "financials_table": "financial statements",
            "financial_explorer": "comprehensive financial data",
            "dividends_table": "dividend history and yield",
            "compare_table": "side-by-side comparison",
            "movers_table": "top gainers/losers list",
            "sector_list": "stocks in a sector",
            "screener_results": "filtered stock results",
            "technicals": "technical indicators (RSI, MACD, etc.)",
            "ownership": "ownership structure",
            "fair_value": "valuation analysis",
            "news_list": "recent news articles",
            "deep_valuation": "deep valuation metrics (EV/EBIT, P/TBV)",
            "deep_health": "financial health indicators (Z-Score, F-Score)",
            "deep_growth": "growth analysis (CAGR, revenue trends)",
            "deep_efficiency": "efficiency metrics (ROCE, asset turnover)",
            "ratios": "financial ratios",
        }
        
        if not card_types:
            return "general financial information"
        
        descriptions = []
        for ct in card_types:
            if ct in CARD_DESCRIPTIONS:
                descriptions.append(CARD_DESCRIPTIONS[ct])
            else:
                descriptions.append(ct.replace("_", " "))
        
        if len(descriptions) == 1:
            return descriptions[0]
        elif len(descriptions) == 2:
            return f"{descriptions[0]} and {descriptions[1]}"
        else:
            return ", ".join(descriptions[:-1]) + ", and " + descriptions[-1]


# Singleton
_explainer = LLMExplainerService()

def get_explainer() -> LLMExplainerService:
    return _explainer
