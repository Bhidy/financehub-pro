"""
Text Normalizer for Arabic + English input.
Handles diacritics, alef variants, Arabic numerals, and general cleanup.
"""

import re
import unicodedata
from typing import NamedTuple


class NormalizedText(NamedTuple):
    """Result of text normalization."""
    raw: str
    normalized: str
    language: str  # 'ar', 'en', or 'mixed'


# Arabic diacritics (tashkeel) pattern
ARABIC_DIACRITICS = re.compile(r'[\u064B-\u065F\u0670]')

# Arabic letter range for detection
ARABIC_LETTERS = re.compile(r'[\u0600-\u06FF]')

# Arabic numeral mapping
ARABIC_NUMERALS = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')


def remove_diacritics(text: str) -> str:
    """Remove Arabic diacritics (tashkeel)."""
    return ARABIC_DIACRITICS.sub('', text)


def normalize_alef(text: str) -> str:
    """Normalize alef variants (أإآ → ا)."""
    text = re.sub(r'[أإآ]', 'ا', text)
    return text


def normalize_taa_marbuta(text: str) -> str:
    """Normalize taa marbuta (ة → ه)."""
    return text.replace('ة', 'ه')


def normalize_yaa(text: str) -> str:
    """Normalize yaa (ى → ي)."""
    return text.replace('ى', 'ي')


def normalize_arabic_numerals(text: str) -> str:
    """Convert Arabic numerals to Western (٠-٩ → 0-9)."""
    return text.translate(ARABIC_NUMERALS)


def detect_language(text: str) -> str:
    """Detect if text is primarily Arabic, English, or mixed."""
    arabic_count = len(ARABIC_LETTERS.findall(text))
    total_letters = len(re.findall(r'[a-zA-Z\u0600-\u06FF]', text))
    
    if total_letters == 0:
        return 'en'  # Default to English for pure numbers/symbols
    
    arabic_ratio = arabic_count / total_letters
    
    if arabic_ratio > 0.7:
        return 'ar'
    elif arabic_ratio < 0.3:
        return 'en'
    else:
        return 'mixed'


def normalize_arabic(text: str) -> str:
    """Full Arabic normalization pipeline."""
    text = remove_diacritics(text)
    text = normalize_alef(text)
    text = normalize_taa_marbuta(text)
    text = normalize_yaa(text)
    text = normalize_arabic_numerals(text)
    return text


def normalize_english(text: str) -> str:
    """English normalization: lowercase, remove extra punctuation."""
    text = text.lower()
    # Keep alphanumeric, spaces, and basic punctuation
    text = re.sub(r'[^\w\s\u0600-\u06FF.,?!-]', ' ', text)
    return text


def normalize_text(text: str) -> NormalizedText:
    """
    Main normalization function.
    
    Returns NormalizedText with:
    - raw: Original input
    - normalized: Cleaned and normalized text
    - language: Detected language ('ar', 'en', 'mixed')
    """
    if not text:
        return NormalizedText(raw='', normalized='', language='en')
    
    raw = text.strip()
    language = detect_language(raw)
    
    # Apply normalizations
    normalized = raw
    normalized = normalize_arabic(normalized)
    normalized = normalize_english(normalized)
    
    # Clean up whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    
    return NormalizedText(
        raw=raw,
        normalized=normalized,
        language=language
    )


def extract_potential_symbols(text: str) -> list[str]:
    """
    Extract potential stock symbols from text.
    Looks for:
    - 4-digit numbers (Saudi tickers)
    - 3-5 uppercase letter sequences (EGX tickers)
    - Known patterns
    """
    symbols = []
    
    # 4-digit numbers (Saudi: 1120, 2222, etc.)
    saudi_pattern = re.findall(r'\b(\d{4})\b', text)
    symbols.extend(saudi_pattern)
    
    # 3-5 uppercase letters (EGX: COMI, SWDY, TMGH)
    egx_pattern = re.findall(r'\b([A-Z]{3,5})\b', text.upper())
    symbols.extend(egx_pattern)
    
    return list(set(symbols))  # Deduplicate
