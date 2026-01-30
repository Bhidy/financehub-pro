"""
CFA Mode Lock
=============
Routing detection and configuration for CFA Level III financial analysis mode.
Ensures CFA queries use deterministic settings with no silent fallbacks.
"""

import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# ============================================================
# CFA MODE CONFIGURATION
# ============================================================
# When in CFA mode, we use strict settings for enterprise-grade output

CFA_MODE_CONFIG = {
    "model": "llama-3.3-70b-versatile",
    "temperature": 0.15,  # Low for deterministic output
    "max_tokens": 1600,   # Extended for full 10-point analysis
    "purpose": "cfa_analyst"
}

# ============================================================
# CFA QUERY DETECTION
# ============================================================
# Patterns that trigger CFA analysis mode

CFA_TRIGGERS = [
    "analyze",
    "analyse", 
    "financials",
    "financial analysis",
    "deep dive",
    "fundamental analysis",
    "cfa analysis",
    "company analysis",
    "financial report",
    "balance sheet",
    "income statement",
    "cash flow",
    "10-point",
]

# Intent values that should route to CFA mode
CFA_INTENTS = {
    'FINANCIALS', 
    'FINANCIALS_ANNUAL', 
    'REVENUE_TREND', 
    'FIN_MARGINS', 
    'FIN_DEBT', 
    'FIN_CASH', 
    'FIN_GROWTH', 
    'FIN_EPS', 
    'RATIO_VALUATION', 
    'RATIO_EFFICIENCY', 
    'RATIO_LIQUIDITY', 
    'DEEP_VALUATION', 
    'DEEP_SAFETY', 
    'DEEP_EFFICIENCY', 
    'DEEP_GROWTH', 
    'FAIR_VALUE', 
    'COMPANY_PROFILE'
}

# Card types that indicate CFA mode
CFA_CARD_TYPES = {
    'financial_explorer',
    'financials_table',
}


def is_cfa_financials_query(user_text: str) -> bool:
    """
    Detect if the user query should trigger CFA analysis mode.
    
    Returns True if:
    - User explicitly asks for financial analysis
    - User mentions specific financial terms
    - User asks for deep dive / fundamental analysis
    """
    if not user_text:
        return False
        
    text = user_text.lower().strip()
    
    # Check for trigger phrases
    for trigger in CFA_TRIGGERS:
        if trigger in text:
            return True
    
    return False


def is_cfa_intent(intent_value: str) -> bool:
    """
    Check if the detected intent should use CFA mode.
    """
    if not intent_value:
        return False
    
    # Normalize intent value
    intent_upper = intent_value.upper()
    
    # Direct match
    if intent_upper in CFA_INTENTS:
        return True
    
    # Partial match for financial-related intents
    if 'FINANCIAL' in intent_upper or 'RATIO' in intent_upper or 'DEEP_' in intent_upper:
        return True
    
    return False


def is_cfa_card_present(card_types: List[str]) -> bool:
    """
    Check if response cards indicate CFA mode should be active.
    """
    if not card_types:
        return False
    
    for card_type in card_types:
        if str(card_type).lower() in CFA_CARD_TYPES:
            return True
    
    return False


def should_use_cfa_mode(
    user_text: Optional[str] = None,
    intent_value: Optional[str] = None,
    card_types: Optional[List[str]] = None
) -> bool:
    """
    Master function to determine if CFA mode should be activated.
    
    Checks:
    1. User query patterns
    2. Detected intent
    3. Response card types
    
    Any condition matching triggers CFA mode.
    """
    # Check user text
    if user_text and is_cfa_financials_query(user_text):
        logger.info(f"[CFA Mode] Triggered by query: '{user_text[:50]}...'")
        return True
    
    # Check intent
    if intent_value and is_cfa_intent(intent_value):
        logger.info(f"[CFA Mode] Triggered by intent: {intent_value}")
        return True
    
    # Check card types
    if card_types and is_cfa_card_present(card_types):
        logger.info(f"[CFA Mode] Triggered by card types: {card_types}")
        return True
    
    return False


def get_cfa_config() -> Dict[str, Any]:
    """
    Get CFA mode configuration settings.
    Returns a copy to prevent modification.
    """
    return CFA_MODE_CONFIG.copy()
