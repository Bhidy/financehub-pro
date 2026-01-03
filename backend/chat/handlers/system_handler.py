"""
System Handler - HELP, CLARIFY_SYMBOL, FOLLOW_UP, UNKNOWN intents.
"""

from typing import Dict, Any, List, Optional


def handle_help(language: str = 'en') -> Dict[str, Any]:
    """Handle HELP intent - show available commands."""
    
    if language == 'ar':
        message = "مرحباً! أنا مساعدك المالي. إليك ما يمكنني مساعدتك به:"
        categories = [
            {
                'title': 'أسعار الأسهم',
                'examples': ['كم سعر COMI؟', 'ما سعر أرامكو؟', 'سعر التجاري الدولي']
            },
            {
                'title': 'الشارتات',
                'examples': ['أعطني شارت COMI', 'شارت سويدي سنة', 'الرسم البياني لـ 2222']
            },
            {
                'title': 'البيانات المالية',
                'examples': ['القوائم المالية لـ TMGH', 'التوزيعات', 'ما هو مضاعف الربحية؟']
            },
            {
                'title': 'تصفية السوق',
                'examples': ['أعلى الرابحين اليوم', 'الأسهم الخاسرة', 'أسهم البنوك']
            },
            {
                'title': 'المقارنات',
                'examples': ['قارن بين COMI و SWDY', 'TMGH مقابل PHDC']
            }
        ]
    else:
        message = "Hello! I'm your financial assistant. Here's what I can help you with:"
        categories = [
            {
                'title': 'Stock Prices',
                'examples': ['What is the price of COMI?', 'Aramco stock price', 'Quote for 2222']
            },
            {
                'title': 'Charts',
                'examples': ['Show COMI chart', 'SWDY 1 year chart', 'Price graph for TMGH']
            },
            {
                'title': 'Financial Data',
                'examples': ['COMI financials', 'Dividend history', 'What is the PE ratio?']
            },
            {
                'title': 'Market Screening',
                'examples': ['Top gainers today', 'Top losers', 'Banking sector stocks']
            },
            {
                'title': 'Comparisons',
                'examples': ['Compare COMI vs SWDY', 'TMGH versus PHDC']
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
            {'label': 'Top Gainers', 'label_ar': 'الأكثر ارتفاعاً', 'action_type': 'query', 'payload': 'Show top gainers'},
            {'label': 'Banking Stocks', 'label_ar': 'أسهم البنوك', 'action_type': 'query', 'payload': 'Show banking sector stocks'},
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
        message = "لم أفهم طلبك. يمكنني مساعدتك في: أسعار الأسهم، الشارتات، البيانات المالية، والتوزيعات."
    else:
        message = "I didn't understand your request. I can help you with: stock prices, charts, financials, and dividends."
    
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
