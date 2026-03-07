"""
System Handler - HELP, CLARIFY_SYMBOL, FOLLOW_UP, UNKNOWN intents.
"""

from typing import Dict, Any, List, Optional


def handle_help(language: str = 'en') -> Dict[str, Any]:
    """Handle HELP intent - show available commands."""
    
    if language == 'ar':
        message = "مرحباً! أنا مساعدك المالي الذكي. إليك ما يمكنني مساعدتك به:"
        categories = [
            {
                'title': '💰 أسعار الأسهم',
                'examples': ['كم سعر COMI؟', 'ما سعر فوري؟', 'سعر التجاري الدولي']
            },
            {
                'title': '📊 الشارتات',
                'examples': ['أعطني شارت COMI', 'شارت سويدي سنة', 'الرسم البياني لـ HRHO']
            },
            {
                'title': '🛡️ تحليل المخاطر',
                'examples': ['هل COMI آمن؟', 'تحليل صحة ADIB', 'مخاطر البنك التجاري']
            },
            {
                'title': '💎 التقييم',
                'examples': ['هل SWDY رخيص؟', 'تقييم TMGH', 'القيمة العادلة لـ ORAS']
            },
            {
                'title': '📈 النمو والكفاءة',
                'examples': ['نمو COMI', 'كفاءة EFIH', 'معدل نمو الأرباح']
            },
            {
                'title': '🔍 تصفية السوق',
                'examples': ['أعلى الرابحين اليوم', 'الأسهم الخاسرة', 'أسهم البنوك']
            }
        ]
    else:
        message = "Hello! I'm your Ultra Premium AI Financial Analyst. Here's what I can help you with:"
        categories = [
            {
                'title': '💰 Stock Prices',
                'examples': ['Price of COMI', 'FWRY stock price', 'Quote for EAST']
            },
            {
                'title': '📊 Charts & Activity',
                'examples': ['Show COMI chart', 'SWDY 1 year chart', 'Most active stocks']
            },
            {
                'title': '🛡️ Safety Analysis (NEW)',
                'examples': ['Is COMI safe?', 'ADIB risk analysis', 'Financial health of EFIH']
            },
            {
                'title': '💎 Valuation Analysis (NEW)',
                'examples': ['Is SWDY cheap?', 'TMGH valuation', 'Is ORAS overvalued?']
            },
            {
                'title': '📈 Growth & Efficiency (NEW)',
                'examples': ['COMI growth rate', 'ADIB efficiency', 'Revenue CAGR of EFIH']
            },
            {
                'title': '🔍 Market Screening',
                'examples': ['Top gainers today', 'High dividend stocks', 'Undervalued stocks in EGX']
            },
            {
                'title': '📰 News & Events',
                'examples': ['COMI news', 'Latest market news', 'Dividend announcements']
            },
            {
                'title': '⚖️ Comparisons',
                'examples': ['Compare COMI vs SWDY', 'TMGH versus PHDC', 'Banks comparison']
            }
        ]
    
    return {
        'success': True,
        'message': message,
        'cards': [
            {
                'type': 'help',
                'data': {'categories': categories}
            }
        ],
        'actions': [
            {'label': '🛡️ Safety Check', 'label_ar': 'فحص الأمان', 'action_type': 'query', 'payload': 'Is COMI safe?'},
            {'label': '💎 Valuation', 'label_ar': 'التقييم', 'action_type': 'query', 'payload': 'Is SWDY cheap?'},
            {'label': '📈 Growth', 'label_ar': 'النمو', 'action_type': 'query', 'payload': 'ADIB growth rate'},
            {'label': '🔝 Top Gainers', 'label_ar': 'الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Show top gainers'},
        ]
    }


def handle_clarify_symbol(
    suggestions: Optional[List[Dict]] = None,
    language: str = 'en'
) -> Dict[str, Any]:
    """Handle CLARIFY_SYMBOL - ask user to specify stock."""
    
    if language == 'ar':
        message = "أي سهم تقصد؟ يرجى كتابة الرمز أو اسم الشركة."
    else:
        message = "Which stock do you mean? Please type the symbol or company name."
    
    result = {
        'success': True,
        'clarification_type': 'symbol',
        'message': message,
        'cards': [],
        'actions': []
    }
    
    # Add suggestions if available
    if suggestions:
        result['cards'].append({
            'type': 'suggestions',
            'data': {'suggestions': suggestions}
        })
        
        for s in suggestions[:5]:
            result['actions'].append({
                'label': s.get('symbol', ''),
                'action_type': 'query',
                'payload': f"Price of {s.get('symbol', '')}"
            })
    
    return result


def handle_unknown(language: str = 'en') -> Dict[str, Any]:
    """Handle UNKNOWN intent - fallback response."""
    
    if language == 'ar':
        message = "لم أفهم طلبك بوضوح. يرجى توضيح السؤال أو كتابة اسم الشركة أو الرمز حتى أقدم لك الإجابة الصحيحة."
    else:
        message = "I couldn't understand that request clearly. Please clarify your question, or type the company name or symbol so I can answer it properly."
    
    return {
        'success': True,
        'message': message,
        'cards': [],
        'actions': [
            {'label': 'Help', 'label_ar': 'مساعدة', 'action_type': 'query', 'payload': 'Help'},
            {'label': 'Top Gainers', 'label_ar': 'الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Top gainers'},
        ]
    }


def handle_blocked(violation_type: str, response_message: str, language: str = 'en') -> Dict[str, Any]:
    """Handle BLOCKED intent - compliance violation."""
    
    return {
        'success': False,
        'error': 'compliance_blocked',
        'violation_type': violation_type,
        'message': response_message,
        'cards': [],
        'actions': [
            {'label': 'View Price', 'label_ar': 'عرض السعر', 'action_type': 'query', 'payload': 'What is the price of COMI?'},
            {'label': 'View Chart', 'label_ar': 'عرض الشارت', 'action_type': 'query', 'payload': 'Show COMI chart'},
        ]
    }
