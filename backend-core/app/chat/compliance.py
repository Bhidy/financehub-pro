"""
Compliance Controls - Hard-block advisory patterns.

Ensures no investment advice is provided.
"""

import re
from typing import Tuple, Optional


# Blocked patterns (English + Arabic)
BLOCKED_PATTERNS = [
    # Buy/Sell advice
    (r'\b(should|shall|would)\s+i\s+(buy|sell|invest)', 'advice'),
    (r'\b(هل|هل يجب)\s*(اشتري|ابيع|استثمر)', 'advice'),
    (r'\brecommend(ation)?\s+(to\s+)?(buy|sell)', 'advice'),
    (r'\b(انصحك|انصح|اوصي)\s*(ب|ان)?', 'advice'),
    
    # Best stock / prediction
    (r'\bbest\s+stock', 'advice'),
    (r'\bافضل\s+سهم', 'advice'),
    (r'\btop\s+pick', 'advice'),
    (r'\b(predict|forecast|will\s+go\s+up|will\s+go\s+down)', 'prediction'),
    (r'\b(توقع|سيرتفع|سينخفض|سيصعد|سيهبط)', 'prediction'),
    
    # Investment decisions
    (r'\b(is\s+it\s+a\s+good\s+time\s+to|when\s+should\s+i)', 'advice'),
    (r'\b(الوقت\s+المناسب|متى\s+اشتري)', 'advice'),
    
    # Target price (unless we're showing analyst targets from DB)
    (r'\bwhat\s+price\s+will\s+it\s+reach', 'prediction'),
    (r'\b(كم\s+سيصل|الى\s+كم\s+سيرتفع)', 'prediction'),
]

# Compliance response
COMPLIANCE_RESPONSE_EN = (
    "I can't provide investment advice or predictions. "
    "I can show you factual data: current price, historical charts, "
    "financial statements, dividends, and stock comparisons."
)

COMPLIANCE_RESPONSE_AR = (
    "لا أستطيع تقديم نصائح استثمارية أو توقعات. "
    "يمكنني عرض البيانات الفعلية: السعر الحالي، الشارت التاريخي، "
    "القوائم المالية، التوزيعات، ومقارنة الأسهم."
)


def check_compliance(text: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Check if a message violates compliance rules.
    
    Args:
        text: User input
    
    Returns:
        Tuple of (is_blocked, violation_type, response_message)
        is_blocked: True if the message should be blocked
        violation_type: 'advice' or 'prediction' if blocked
        response_message: The compliance message to return
    """
    text_lower = text.lower()
    
    for pattern, violation_type in BLOCKED_PATTERNS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            # Detect language for appropriate response
            arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
            total_chars = len(re.findall(r'[a-zA-Z\u0600-\u06FF]', text))
            
            if total_chars > 0 and arabic_chars / total_chars > 0.5:
                response = COMPLIANCE_RESPONSE_AR
            else:
                response = COMPLIANCE_RESPONSE_EN
            
            return (True, violation_type, response)
    
    return (False, None, None)


def get_disclaimer(intent: str, language: str = 'en') -> Optional[str]:
    """
    Get appropriate disclaimer for certain intents.
    
    Args:
        intent: The detected intent
        language: 'en' or 'ar'
    
    Returns:
        Disclaimer text or None
    """
    # Intents that need disclaimers
    needs_disclaimer = [
        'STOCK_STAT', 'FINANCIALS', 'DIVIDENDS', 'COMPARE_STOCKS',
        'TOP_GAINERS', 'TOP_LOSERS', 'SCREENER_PE', 'DIVIDEND_LEADERS'
    ]
    
    if intent in needs_disclaimer:
        if language == 'ar':
            return "البيانات للأغراض المعلوماتية فقط. هذا ليس نصيحة استثمارية."
        else:
            return "Data is for informational purposes only. This is not investment advice."
    
    return None
