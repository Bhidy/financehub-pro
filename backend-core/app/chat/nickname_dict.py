"""
Curated Nickname Dictionary for Egyptian Stock Exchange (EGX).

This dictionary maps common Arabic and English nicknames/abbreviations
to their official stock symbols. These are the ~200 most commonly
used trading names that users type.

Priority: 10 (highest) for curated nicknames.
"""

# Arabic nickname → Symbol
NICKNAME_AR = {
    # Banking
    'التجاري': 'COMI',
    'التجاري الدولي': 'COMI',
    'البنك التجاري': 'COMI',
    'البنك التجاري الدولي': 'COMI',
    'سي اي بي': 'COMI',
    'الاهلي': 'QNBA',
    'بنك الاهلي': 'QNBA',
    'قطر الوطني': 'QNBA',
    'كريدي اجريكول': 'CIEB',
    'كريدي': 'CIEB',
    'ابوظبي الاسلامي': 'ADIB',
    'فيصل': 'FAIT',
    'بنك فيصل': 'FAIT',
    'المصرف المتحد': 'UNBE',
    'المتحد': 'UNBE',
    'العربي الافريقي': 'ARAB',
    
    # Real Estate
    'بالم هيلز': 'PHDC',
    'بالم': 'PHDC',
    'طلعت مصطفى': 'TMGH',
    'طلعت': 'TMGH',
    'مدينة نصر': 'MNHD',
    'مدينتي': 'TMGH',
    'الشروق': 'OCDI',
    'ماونتن فيو': 'MNHD',  # Often confused
    'اعمار': 'EMFD',
    'سوديك': 'OCDI',
    'مصر الجديدة': 'HELI',
    'هليوبوليس': 'HELI',
    'اوراسكوم للتنمية': 'ORHD',
    
    # Industrial
    'حديد عز': 'ESRS',
    'عز': 'ESRS',
    'الحديد والصلب': 'ESRS',
    'حديد': 'ESRS',
    'السويدي': 'SWDY',
    'سويدي': 'SWDY',
    'الكابلات': 'SWDY',
    'العربية للاسمنت': 'ARCC',
    'اسمنت': 'ARCC',
    'السويس للاسمنت': 'SUCE',
    'سيناء للاسمنت': 'SCEM',
    'موبكو': 'MOPH',
    'ابوقير للاسمدة': 'ABUK',
    'ابوقير': 'ABUK',
    
    # Telecom & Tech
    'المصرية للاتصالات': 'ETEL',
    'اتصالات مصر': 'ETEL',
    'تليكوم': 'ETEL',
    'فوري': 'FWRY',
    'فودافون': 'VFGN',  # Vodafone Ghana (if listed)
    'اورنج': 'ORGE',  # If listed
    
    # Consumer
    'الشرقية للدخان': 'EAST',
    'ايسترن': 'EAST',
    'الدخان': 'EAST',
    'دومتي': 'DOMT',
    'جهينة': 'JUFO',
    'عبور لاند': 'OLFI',
    'ادفيا': 'ADVI',  # If listed
    
    # Financial Services
    'هيرميس': 'HRHO',
    'اي اف جي': 'HRHO',
    'القلعة': 'CCAP',
    'سي كابيتال': 'CCAP',
    'بلتون': 'BTFH',
    'اكسلنس': 'EXPA',  # If listed
    'بايونيرز': 'PIOH',
    
    # Energy
    'اموك': 'AMOC',
    'الاسكندرية للبترول': 'AMOC',
    'سيدي كرير': 'SKPC',
    'سيدبك': 'SKPC',
    'ايبروم': 'IRON',  # If exists
    
    # Healthcare
    'ابن سينا': 'ISPH',
    'العاشر للادوية': 'RMDA',
    'المصرية للادوية': 'PHAR',
    'العربية للادوية': 'ADPC',
    
    # Transportation
    'الاسكندرية للحاويات': 'ALCN',
    'عامر جروب': 'AMER',
    'عامر': 'AMER',
    
    # Diversified
    'اوراسكوم': 'ORAS',
    'اوراسكوم للاستثمار': 'OASI',
    'ام ام جروب': 'MTIE',
}

# English nickname → Symbol
NICKNAME_EN = {
    # Banking
    'CIB': 'COMI',
    'Commercial International': 'COMI',
    'Commercial International Bank': 'COMI',
    'QNB': 'QNBA',
    'QNB Alahli': 'QNBA',
    'Credit Agricole': 'CIEB',
    'ADIB': 'ADIB',
    'Faisal Bank': 'FAIT',
    'Arab African': 'ARAB',
    
    # Real Estate
    'Palm Hills': 'PHDC',
    'Palm': 'PHDC',
    'Talaat Moustafa': 'TMGH',
    'TMG': 'TMGH',
    'Talaat': 'TMGH',
    'Madinet Nasr': 'MNHD',
    'MNHD': 'MNHD',
    'Madinaty': 'TMGH',
    'Sodic': 'OCDI',
    'Heliopolis Housing': 'HELI',
    'Orascom Development': 'ORHD',
    
    # Industrial
    'Ezz Steel': 'ESRS',
    'Ezz': 'ESRS',
    'Iron Steel': 'ESRS',
    'Sewedy': 'SWDY',
    'El Sewedy': 'SWDY',
    'Sewedy Electric': 'SWDY',
    'Arabian Cement': 'ARCC',
    'Suez Cement': 'SUCE',
    'Sinai Cement': 'SCEM',
    'Mopco': 'MOPH',
    'Abu Qir': 'ABUK',
    'Abu Qir Fertilizers': 'ABUK',
    
    # Telecom & Tech
    'Telecom Egypt': 'ETEL',
    'TE': 'ETEL',
    'Egyptian Telecom': 'ETEL',
    'Fawry': 'FWRY',
    
    # Consumer
    'Eastern Tobacco': 'EAST',
    'Eastern Company': 'EAST',
    'Domty': 'DOMT',
    'Juhayna': 'JUFO',
    'Obour Land': 'OLFI',
    
    # Financial Services
    'EFG Hermes': 'HRHO',
    'Hermes': 'HRHO',
    'EFG': 'HRHO',
    'Qalaa': 'CCAP',
    'Citadel': 'CCAP',
    'Beltone': 'BTFH',
    'Pioneers': 'PIOH',
    
    # Energy
    'AMOC': 'AMOC',
    'Alexandria Petroleum': 'AMOC',
    'Sidi Kerir': 'SKPC',
    'Sidpec': 'SKPC',
    
    # Healthcare
    'Ibnsina': 'ISPH',
    'Ibn Sina': 'ISPH',
    'Rameda': 'RMDA',
    
    # Transportation
    'Alex Container': 'ALCN',
    'Amer Group': 'AMER',
    
    # Diversified
    'Orascom': 'ORAS',
    'Orascom Investment': 'OASI',
    'MM Group': 'MTIE',
    
    # Missing / Requested
    'EKHO': 'EKHO',
    'Egypt Kuwait': 'EKHO',
    'Kuwait Holding': 'EKHO',
    'MICH': 'MICH',
    'Misr Chemical': 'MICH',
    'EFIH': 'EFIH',
    'e-Finance': 'EFIH',
    'eFinance': 'EFIH',
}

# Combined lookup (normalized keys will be generated at runtime)
def get_all_nicknames():
    """Return combined dictionary for injection."""
    combined = {}
    for name, symbol in NICKNAME_AR.items():
        combined[name] = {'symbol': symbol, 'lang': 'ar', 'type': 'nickname'}
    for name, symbol in NICKNAME_EN.items():
        combined[name] = {'symbol': symbol, 'lang': 'en', 'type': 'nickname'}
    return combined

# Arabic stopwords for keyphrase extraction
AR_STOPWORDS = {
    'شركة', 'شركه', 'مساهمة', 'مساهمه', 'مصرية', 'مصريه',
    'القابضة', 'القابضه', 'للتنمية', 'للتنميه', 'للاستثمار',
    'ش.م.م', 'ش.م', 'شمم', 'مصر', 'مصري',
    'السعودية', 'السعوديه', 'العربية', 'العربيه', 'المتحدة', 'المتحده',
    'جمهورية', 'جمهوريه', 'والتجارة', 'والتجاره', 'والصناعة', 'والصناعه',
    'الوطنية', 'الوطنيه', 'الدولية', 'الدوليه', 'العالمية', 'العالميه',
}

# English stopwords for keyphrase extraction
EN_STOPWORDS = {
    'company', 'co', 'ltd', 'limited', 'sae', 'inc', 'incorporated',
    'corp', 'corporation', 'group', 'holding', 'holdings', 'egypt',
    'egyptian', 'arab', 'arabian', 'international', 'national', 'united',
    'for', 'and', 'the', 'of', 'development', 'investment', 'investments',
}

# Popularity scores for key stocks (based on trading volume/mentions)
POPULARITY_SCORES = {
    'COMI': 100,  # Most traded
    'HRHO': 95,
    'TMGH': 95,
    'SWDY': 90,
    'ETEL': 90,
    'ESRS': 88,
    'EAST': 85,
    'PHDC': 85,
    'FWRY': 82,
    'QNBA': 80,
    'AMOC': 78,
    'ABUK': 75,
    'MNHD': 75,
    'HELI': 70,
    'ORAS': 70,
    'CCAP': 68,
    'OCDI': 65,
    'MOPH': 65,
    'ISPH': 60,
    'CIEB': 60,
    'BTFH': 55,
    'AMER': 55,
    'MTIE': 50,
    # Default for others: 30
}

def get_popularity(symbol: str) -> int:
    """Get popularity score for a symbol."""
    return POPULARITY_SCORES.get(symbol, 30)
