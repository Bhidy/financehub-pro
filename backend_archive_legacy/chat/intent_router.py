"""
Intent Router - Deterministic intent classification using keyword matching.

No ML/AI - pure rule-based scoring with bilingual keyword packs.
"""

import re
from typing import Dict, List, Optional, Tuple
from .schemas import Intent, IntentResult
from .text_normalizer import normalize_text, NormalizedText


# Keyword packs per intent: (english_keywords, arabic_keywords, weight)
INTENT_KEYWORDS: Dict[Intent, Tuple[List[str], List[str], float]] = {
    
    # ===== STOCK INTENTS =====
    
    Intent.STOCK_PRICE: (
        ["price", "trading at", "cost", "quote", "how much", "what is the price", "current price"],
        ["سعر", "كم سعر", "بكم", "كم يتداول", "سعر السهم", "ما سعر"],
        1.0
    ),
    
    Intent.STOCK_SNAPSHOT: (
        ["snapshot", "overview", "summary", "quick look", "stock info", "tell me about"],
        ["ملخص", "نظره عامه", "نبذه", "اخبرني عن", "معلومات"],
        0.9
    ),
    
    Intent.STOCK_CHART: (
        ["chart", "graph", "show chart", "price chart", "candlestick", "technical"],
        ["شارت", "رسم بياني", "الشارت", "شارت السعر", "الرسم البياني", "فني"],
        1.0
    ),
    
    Intent.STOCK_STAT: (
        ["pe ratio", "p/e", "market cap", "eps", "52 week", "52w", "beta", "ratio", "valuation", "metrics"],
        ["معدل", "القيمه السوقيه", "ربحيه السهم", "اعلى سعر", "اقل سعر", "مضاعف"],
        1.0
    ),
    
    Intent.COMPANY_PROFILE: (
        ["profile", "about", "company info", "who is", "what does", "business", "description"],
        ["عن الشركه", "معلومات الشركه", "نبذه عن", "ماذا تفعل", "وصف"],
        0.9
    ),
    
    Intent.FINANCIALS: (
        ["financials", "income statement", "balance sheet", "cash flow", "financial statements", "quarterly", "annual"],
        ["القوائم الماليه", "قائمه الدخل", "الميزانيه", "التدفقات النقديه", "البيانات الماليه"],
        1.0
    ),
    
    Intent.REVENUE_TREND: (
        ["revenue trend", "sales growth", "revenue growth", "sales trend", "revenue over time"],
        ["نمو الايرادات", "اتجاه المبيعات", "نمو المبيعات"],
        0.9
    ),
    
    Intent.DIVIDENDS: (
        ["dividend", "payout", "yield", "distribution", "when is dividend", "next dividend"],
        ["التوزيعات", "الارباح الموزعه", "عائد التوزيع", "موعد التوزيع", "توزيعات نقديه"],
        1.0
    ),
    
    Intent.COMPARE_STOCKS: (
        ["compare", "vs", "versus", "comparison", "against", "or"],
        ["قارن", "مقارنه بين", "مقابل", "ضد", "او"],
        1.0
    ),
    
    # ===== MARKET SCAN / SCREENER =====
    
    Intent.TOP_GAINERS: (
        ["top gainers", "biggest gainers", "winners", "most up", "highest gain", "green stocks", "up today"],
        ["الاكثر ارتفاعا", "الرابحين", "الاسهم الخضراء", "اعلى ارتفاع"],
        1.0
    ),
    
    Intent.TOP_LOSERS: (
        ["top losers", "biggest losers", "down today", "red stocks", "falling stocks", "most down"],
        ["الاكثر انخفاضا", "الخاسرين", "الاسهم الحمراء", "اكبر خساره"],
        1.0
    ),
    
    Intent.SECTOR_STOCKS: (
        ["sector", "banking stocks", "bank stocks", "industrial", "real estate stocks", "telecom stocks"],
        ["قطاع", "اسهم البنوك", "الصناعي", "العقاري", "الاتصالات"],
        0.9
    ),
    
    Intent.DIVIDEND_LEADERS: (
        ["highest dividend", "best yield", "dividend champions", "high yield stocks"],
        ["اعلى توزيعات", "افضل عائد", "اعلى عائد"],
        0.9
    ),
    
    Intent.SCREENER_PE: (
        ["pe below", "pe under", "pe less than", "low pe", "cheap stocks"],
        ["اقل من", "مضاعف ربحيه منخفض"],
        0.8
    ),
    
    # ===== SYSTEM =====
    
    Intent.HELP: (
        ["help", "what can you do", "commands", "how to use", "options", "guide"],
        ["مساعده", "ماذا تفعل", "كيف استخدم", "الاوامر", "دليل"],
        0.9
    ),
}

# Patterns for entity extraction
RANGE_PATTERNS = {
    # English
    r'\b1\s*d(ay)?\b': '1D',
    r'\b1\s*w(eek)?\b': '1W',
    r'\b1\s*m(onth)?\b': '1M',
    r'\b3\s*m(onths?)?\b': '3M',
    r'\b6\s*m(onths?)?\b': '6M',
    r'\b1\s*y(ear)?\b': '1Y',
    r'\b5\s*y(ears?)?\b': '5Y',
    r'\bmax\b': 'MAX',
    r'\ball\s*time\b': 'MAX',
    # Arabic
    r'يوم(\s*واحد)?': '1D',
    r'اسبوع': '1W',
    r'شهر(\s*واحد)?': '1M',
    r'[٣3]\s*شهور': '3M',
    r'[٦6]\s*شهور': '6M',
    r'سنه|عام': '1Y',
    r'من البدايه|تاريخ كامل': 'MAX',
}

# Threshold patterns (e.g., "PE below 10")
THRESHOLD_PATTERN = re.compile(
    r'(pe|p/e|مضاعف)\s*(below|under|less than|<|اقل من)\s*(\d+(?:\.\d+)?)',
    re.IGNORECASE
)

# Compare patterns (e.g., "COMI vs SWDY")
COMPARE_PATTERN = re.compile(
    r'(\w+)\s+(?:vs?|versus|and|و|مع|مقابل)\s+(\w+)',
    re.IGNORECASE
)


class IntentRouter:
    """Routes user messages to intents using keyword matching."""
    
    def __init__(self):
        self.confidence_threshold = 0.3
    
    def route(self, message: str, context: Optional[dict] = None) -> IntentResult:
        """
        Classify the intent of a message.
        
        Args:
            message: User input
            context: Conversation context (last_symbol, last_intent, etc.)
        
        Returns:
            IntentResult with intent, confidence, entities
        """
        # Normalize input
        normalized = normalize_text(message)
        text = normalized.normalized
        text_lower = text.lower()
        
        # Extract entities first
        entities = self._extract_entities(text, normalized.language)
        
        # Check for comparison (special handling)
        if entities.get('compare_symbols'):
            return IntentResult(
                intent=Intent.COMPARE_STOCKS,
                confidence=0.95,
                entities=entities,
                missing_fields=[]
            )
        
        # Score each intent
        scores: Dict[Intent, float] = {}
        
        for intent, (en_keywords, ar_keywords, weight) in INTENT_KEYWORDS.items():
            score = 0.0
            
            # English keyword matching
            for kw in en_keywords:
                if kw in text_lower:
                    score += weight * (1.0 if len(kw) > 5 else 0.7)
            
            # Arabic keyword matching
            for kw in ar_keywords:
                if kw in text:
                    score += weight * (1.0 if len(kw) > 3 else 0.7)
            
            scores[intent] = score
        
        # Find best intent
        best_intent = max(scores, key=scores.get)
        best_score = scores[best_intent]
        
        # Normalize score to 0-1 range
        max_possible = 3.0  # Adjust based on typical max scores
        confidence = min(best_score / max_possible, 1.0)
        
        # Check if we need clarification
        missing_fields = []
        if best_intent in [Intent.STOCK_PRICE, Intent.STOCK_CHART, Intent.STOCK_STAT, 
                          Intent.FINANCIALS, Intent.DIVIDENDS, Intent.COMPANY_PROFILE]:
            if not entities.get('symbol'):
                # Check context for last symbol
                if context and context.get('last_symbol'):
                    entities['symbol'] = context['last_symbol']
                else:
                    missing_fields.append('symbol')
        
        # Handle follow-up queries
        if confidence < self.confidence_threshold and context:
            # Might be a follow-up
            if context.get('last_symbol') and not entities.get('symbol'):
                entities['symbol'] = context['last_symbol']
                best_intent = Intent.FOLLOW_UP
                confidence = 0.5
        
        # Default to unknown if very low confidence
        if confidence < 0.15 and best_intent not in [Intent.HELP]:
            best_intent = Intent.UNKNOWN
        
        return IntentResult(
            intent=best_intent,
            confidence=round(confidence, 2),
            entities=entities,
            missing_fields=missing_fields
        )
    
    def _extract_entities(self, text: str, language: str) -> Dict:
        """Extract entities from text using patterns."""
        entities = {}
        
        # Extract range
        for pattern, range_val in RANGE_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                entities['range'] = range_val
                break
        
        # Default range if chart/trend intent detected
        if 'range' not in entities:
            if any(kw in text.lower() for kw in ['chart', 'trend', 'شارت', 'اتجاه']):
                entities['range'] = '1M'  # Default to 1 month
        
        # Extract threshold
        threshold_match = THRESHOLD_PATTERN.search(text)
        if threshold_match:
            entities['metric'] = 'pe_ratio'
            entities['threshold'] = float(threshold_match.group(3))
            entities['condition'] = 'below'
        
        # Extract compare symbols
        compare_match = COMPARE_PATTERN.search(text)
        if compare_match:
            entities['compare_symbols'] = [
                compare_match.group(1).upper(),
                compare_match.group(2).upper()
            ]
        
        # Extract statement type
        if any(kw in text.lower() for kw in ['income', 'revenue', 'الدخل', 'الايرادات']):
            entities['statement_type'] = 'income'
        elif any(kw in text.lower() for kw in ['balance', 'assets', 'الميزانيه', 'الاصول']):
            entities['statement_type'] = 'balance'
        elif any(kw in text.lower() for kw in ['cash flow', 'التدفق', 'النقديه']):
            entities['statement_type'] = 'cashflow'
        
        # Extract sector
        sector_map = {
            'bank': 'Banks', 'بنوك': 'Banks', 'banking': 'Banks',
            'real estate': 'Real Estate', 'عقار': 'Real Estate',
            'telecom': 'Telecommunications', 'اتصالات': 'Telecommunications',
            'industrial': 'Industrial', 'صناع': 'Industrial',
        }
        for keyword, sector in sector_map.items():
            if keyword in text.lower():
                entities['sector'] = sector
                break
        
        return entities


def create_router() -> IntentRouter:
    """Factory function to create an intent router."""
    return IntentRouter()
