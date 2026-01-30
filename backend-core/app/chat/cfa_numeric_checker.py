"""
CFA Numeric Checker (Zero Hallucination Guard)
==============================================
Post-response validation to ensure all numbers in LLM output
exist in the source database. This is the last line of defense
against hallucinated financial data.

Strategy:
1. Extract all numeric values from response text
2. Build allowed values set from financial_data
3. Validate each extracted number against allowed set
4. Return list of invalid (hallucinated) numbers
"""

import re
import logging
from math import isclose
from typing import List, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


def extract_numbers(text: str) -> List[str]:
    """
    Extract all numeric values from text.
    
    Matches patterns like:
    - -35,520.00
    - 6.59
    - 2025
    - 124,000
    - 1.74%
    """
    # Pattern matches:
    # - Optional negative sign
    # - Numbers with comma separators (e.g., 124,000)
    # - Decimal numbers (e.g., 6.59)
    # - Percentages stripped of % sign
    pattern = r'-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?'
    
    # Remove % signs from text for matching
    clean_text = text.replace('%', '')
    
    matches = re.findall(pattern, clean_text)
    return matches


def normalize_number(num_str: str) -> Optional[float]:
    """
    Convert a number string to float.
    Handles commas and various formats.
    """
    if not num_str:
        return None
    
    try:
        # Remove commas
        cleaned = num_str.replace(',', '')
        return float(cleaned)
    except (ValueError, TypeError):
        return None


def build_allowed_values(
    financial_data: Dict[str, Any],
    extra_whitelist: Optional[List[float]] = None,
    eps: float = 0.01
) -> Tuple[List[float], float]:
    """
    Build the set of allowed numeric values from financial_data.
    
    Args:
        financial_data: Dict of metric_name -> value from DB
        extra_whitelist: Additional allowed values (years, section numbers)
        eps: Tolerance for floating point comparison
    
    Returns:
        Tuple of (allowed_values_list, epsilon)
    """
    allowed = []
    
    # Extract all numeric fields from financial_data
    for key, val in financial_data.items():
        if isinstance(val, (int, float)):
            allowed.append(float(val))
            # Also add absolute value for negative numbers
            if val < 0:
                allowed.append(abs(float(val)))
    
    # Add standard whitelist for section numbers, common values
    standard_whitelist = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,  # Section numbers
        100, 0, 1.0, 0.0,  # Common values
    ]
    allowed.extend(standard_whitelist)
    
    # Add extra whitelist (years, quarters, etc.)
    if extra_whitelist:
        allowed.extend([float(v) for v in extra_whitelist])
    
    return allowed, eps


def is_number_allowed(
    value: float,
    allowed_values: List[float],
    eps: float = 0.01
) -> bool:
    """
    Check if a number is in the allowed set (with tolerance).
    """
    for allowed_val in allowed_values:
        # Use absolute tolerance for small numbers, relative for large
        if abs(value) < 100:
            if isclose(value, allowed_val, rel_tol=0, abs_tol=eps):
                return True
        else:
            # For large numbers, allow 0.01% tolerance
            if isclose(value, allowed_val, rel_tol=0.0001, abs_tol=0):
                return True
    
    return False


def extract_years_from_date(reporting_date: str) -> List[int]:
    """
    Extract year numbers from reporting date string.
    E.g., "Q3 2025" -> [2025, 3]
    """
    years = []
    
    # Find 4-digit years
    year_matches = re.findall(r'\d{4}', reporting_date)
    for y in year_matches:
        years.append(int(y))
    
    # Find quarter numbers
    quarter_matches = re.findall(r'Q(\d)', reporting_date, re.IGNORECASE)
    for q in quarter_matches:
        years.append(int(q))
    
    return years


def cfa_numeric_checker(
    response_text: str,
    financial_data: Dict[str, Any],
    reporting_date: str,
    eps: float = 0.01
) -> List[str]:
    """
    Main validation function.
    
    Extracts all numbers from LLM response and validates against allowed values.
    
    Args:
        response_text: The LLM generated response
        financial_data: Dict of metric_name -> value from DB
        reporting_date: String like "Q3 2025" or "FY 2024"
        eps: Tolerance for floating point comparison
    
    Returns:
        List of invalid (hallucinated) number strings
    """
    if not response_text or not financial_data:
        return []
    
    # Extract years from reporting date for whitelist
    date_values = extract_years_from_date(reporting_date)
    
    # Build allowed values set
    allowed_values, tolerance = build_allowed_values(
        financial_data,
        extra_whitelist=date_values,
        eps=eps
    )
    
    # Extract all numbers from response
    extracted_nums = extract_numbers(response_text)
    
    # Validate each number
    invalid_numbers = []
    
    for num_str in extracted_nums:
        value = normalize_number(num_str)
        
        if value is None:
            continue
        
        # Skip very small numbers (likely formatting artifacts)
        if abs(value) < 0.001:
            continue
        
        if not is_number_allowed(value, allowed_values, tolerance):
            invalid_numbers.append(num_str)
    
    if invalid_numbers:
        logger.warning(f"[CFA Checker] Found {len(invalid_numbers)} potentially hallucinated numbers: {invalid_numbers[:5]}...")
    else:
        logger.info("[CFA Checker] ✅ All numbers validated against DB")
    
    return invalid_numbers


def validate_cfa_response(
    response_text: str,
    financial_data: Dict[str, Any],
    reporting_date: str = "TTM"
) -> Tuple[bool, List[str]]:
    """
    High-level validation function for use in pipeline.
    
    Returns:
        Tuple of (is_valid, list_of_invalid_numbers)
    """
    invalid = cfa_numeric_checker(response_text, financial_data, reporting_date)
    
    is_valid = len(invalid) == 0
    
    return is_valid, invalid


# ============================================================
# REGENERATION HINT (For failed validation)
# ============================================================

REGENERATION_HINT = """
CRITICAL FIX REQUIRED:
Your previous response contained numbers NOT present in the DATA section.
You used the following hallucinated values: {invalid_numbers}

REMEMBER:
- ONLY use numbers that appear in the DATA section
- Do NOT calculate growth rates, margins, or percentages
- Do NOT state "increased by X%" or "from A to B"
- If a value doesn't exist, OMIT IT

Please regenerate your response using ONLY the provided data values.
"""


def get_regeneration_prompt(invalid_numbers: List[str]) -> str:
    """
    Generate a hint prompt for regeneration after failed validation.
    """
    return REGENERATION_HINT.format(
        invalid_numbers=", ".join(invalid_numbers[:10])  # Limit to first 10
    )
