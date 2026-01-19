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

# Arabic tatweel (kashida) for removal
ARABIC_TATWEEL = re.compile(r'\u0640')

# Arabic suffixes to remove (corporate designations)
ARABIC_SUFFIXES = re.compile(r'\s*(ش\.?م\.?م?\.?|شمم|\(مصر\)|\(السعودية\)|\(السعوديه\))\s*', re.IGNORECASE)


def remove_diacritics(text: str) -> str:
    """Remove Arabic diacritics (tashkeel)."""
    return ARABIC_DIACRITICS.sub('', text)


def remove_tatweel(text: str) -> str:
    """Remove Arabic tatweel (kashida) stretching character."""
    return ARABIC_TATWEEL.sub('', text)


def remove_arabic_suffixes(text: str) -> str:
    """Remove Arabic corporate suffixes like ش.م.م, (مصر), etc."""
    return ARABIC_SUFFIXES.sub('', text)


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
    text = remove_tatweel(text)
    text = normalize_alef(text)
    text = normalize_taa_marbuta(text)
    text = normalize_yaa(text)
    text = normalize_arabic_numerals(text)
    text = remove_arabic_suffixes(text)
    return text


# English filler words to remove
ENGLISH_FILLERS = re.compile(
    r'\b(company|co\.?|ltd\.?|limited|s\.?a\.?e\.?|inc\.?|incorporated|'
    r'corp\.?|corporation|plc|llc)\b',
    re.IGNORECASE
)


def normalize_english(text: str) -> str:
    """English normalization: lowercase, remove filler words, clean punctuation."""
    text = text.lower()
    # Remove English filler words
    text = ENGLISH_FILLERS.sub('', text)
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


# Known aliases that should ALWAYS resolve to their correct symbols
KNOWN_ALIASES = {
    # EGX Major stocks
    'CIB': 'COMI',
    'SEWEDY': 'SWDY',
    'ELSEWEDY': 'SWDY',
    'TALAAT': 'TMGH',
    'MOUSTAFA': 'TMGH',
    'ORASCOM': 'ORWE',
    'EFIC': 'EFIC',
    'JUFO': 'JUFO',
    # Saudi major stocks  
    'ARAMCO': '2222',
    'SABIC': '2010',
    'ALRAJHI': '1120',
    'RAJHI': '1120',
    'STC': '7010',
    'STCPAY': '7010',
    'NCB': '1180',
    'SAMBA': '1090',
}

# Words that should NEVER be treated as stock symbols
SYMBOL_STOPWORDS = {
    # Query words
    'price', 'stock', 'share', 'what', 'show', 'tell', 'give', 'get', 'now',
    'today', 'current', 'latest', 'about', 'the', 'for', 'how', 'much', 'who',
    'owns', 'own', 'owned', 'value', 'fair', 'income', 'net', 'trend', 'chart',
    # Financial terms
    'market', 'cap', 'ratio', 'eps', 'roe', 'roa', 'nav', 'yield', 'div',
    'dividend', 'dividends', 'sector', 'sectors', 'compare', 'versus',
    'institutional', 'public', 'retail', 'foreign', 'local', 'arab',
    'annual', 'quarterly', 'monthly', 'daily', 'weekly', 'year', 'years',
    # Action words  
    'buy', 'sell', 'hold', 'rate', 'rates', 'history', 'historical',
    'financial', 'financials', 'earnings', 'revenue', 'profit', 'loss',
    'top', 'best', 'worst', 'gainers', 'losers', 'movers', 'all', 'list',
    # Common false positives
    'info', 'data', 'quote', 'quotes', 'help', 'please', 'thank', 'thanks',
}

# Arabic stopwords for N-gram filtering
AR_STOPWORDS_NGRAM = {
    'ممكن', 'عايز', 'اريد', 'ابغى', 'ابي', 'قولي', 'قولى', 'اديني', 'ادينى',
    'هات', 'جيب', 'اعطني', 'اعطنى', 'شوف', 'شوفلي', 'شوفلى',
    'ايه', 'ايش', 'شو', 'وش', 'ماهو', 'ما هو', 'كيف', 'ازاي', 'ازى',
    'من', 'في', 'فى', 'على', 'عن', 'الى', 'إلى', 'هل', 'لو', 'اذا', 'إذا',
    'انا', 'انت', 'هو', 'هي', 'نحن', 'هم', 'ده', 'دي', 'دى', 'هذا', 'هذه',
    'اللي', 'الذي', 'التي', 'اللى',
}


def generate_ngrams(text: str, min_n: int = 1, max_n: int = 5) -> list[str]:
    """
    Generate all possible n-grams from text.
    Used for multi-word Arabic stock name detection.
    
    Example:
        Input: "ممكن تديني سعر المصرية للاتصالات"
        Output: [
            "المصرية للاتصالات",  # 2-gram (target!)
            "سعر المصرية للاتصالات",  # 3-gram
            "المصرية",  # 1-gram
            ...
        ]
    
    Returns ngrams sorted by length descending (prefer longer matches).
    """
    words = text.split()
    ngrams = []
    
    for n in range(min_n, min(max_n + 1, len(words) + 1)):
        for i in range(len(words) - n + 1):
            phrase_words = words[i:i+n]
            phrase = ' '.join(phrase_words)
            
            # Skip if all words are stopwords
            non_stopword_count = sum(1 for w in phrase_words 
                                     if w.lower() not in AR_STOPWORDS_NGRAM 
                                     and w.lower() not in SYMBOL_STOPWORDS
                                     and len(w) > 1)
            if non_stopword_count > 0:
                ngrams.append(phrase)
    
    # Sort by length descending (prefer longer matches)
    return sorted(ngrams, key=len, reverse=True)


def extract_arabic_phrases(text: str) -> list[str]:
    """
    Extract potential Arabic stock name phrases from text.
    Focuses on 2-4 word combinations that are likely stock names.
    """
    # Normalize text first
    normalized = normalize_text(text)
    norm_text = normalized.normalized
    
    # Only process if Arabic content
    if normalized.language not in ['ar', 'mixed']:
        return []
    
    # Generate 2-4 word ngrams (most Arabic stock names are 2-4 words)
    ngrams = generate_ngrams(norm_text, min_n=2, max_n=4)
    
    # Also include single significant words (Arabic names sometimes mention just one key word)
    words = norm_text.split()
    for word in words:
        if (len(word) >= 4 
            and word.lower() not in AR_STOPWORDS_NGRAM 
            and word.lower() not in SYMBOL_STOPWORDS):
            ngrams.append(word)
    
    return ngrams


def extract_potential_symbols(text: str) -> list[str]:
    """
    Extract potential stock symbols from text.
    
    Enhanced to detect:
    - Known aliases (CIB, Aramco, etc.)
    - 4-digit numbers (Saudi tickers)
    - 3-5 uppercase letter sequences (EGX tickers)
    - Multi-word Arabic phrases (2-4 words)
    
    Filters out common stopwords to prevent false matches.
    """
    symbols = []
    text_upper = text.upper()
    text_lower = text.lower()
    
    # 1. Check for KNOWN ALIASES first (highest priority)
    for alias, symbol in KNOWN_ALIASES.items():
        if alias.lower() in text_lower or alias.upper() in text_upper:
            symbols.append(symbol)
    
    # 2. 4-digit numbers (Saudi: 1120, 2222, etc.)
    saudi_pattern = re.findall(r'\b(\d{4})\b', text)
    symbols.extend(saudi_pattern)
    
    # 3. 3-5 uppercase letters (EGX: COMI, SWDY, TMGH)
    # But filter out stopwords
    egx_pattern = re.findall(r'\b([A-Z]{3,5})\b', text_upper)
    for sym in egx_pattern:
        if sym.lower() not in SYMBOL_STOPWORDS:
            symbols.append(sym)
    
    # 4. Arabic multi-word phrases (NEW - for names like "المصرية للاتصالات")
    arabic_phrases = extract_arabic_phrases(text)
    symbols.extend(arabic_phrases)
    
    return list(dict.fromkeys(symbols))  # Deduplicate while preserving order


