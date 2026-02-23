
"""
Financial calculation logic for Starta AI
Implements sector-specific valuation scoring based on Osama's framework
"""

from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class ValuationScore:
    total_score: int  # 0-100
    valuation_score: int  # 0-40
    quality_score: int  # 0-30
    momentum_score: int  # 0-30
    breakdown: Dict[str, int]
    assessment: str

class FinancialCalculator:
    """
    Implements Osama's sector-specific valuation methodology
    """
    
    # Sector-specific thresholds
    SECTOR_CRITERIA = {
        'Financials - Banks': {
            'undervalued_pb': 1.2,
            'undervalued_pe': 6.0,
            'quality_roe': 15.0,
            'quality_npl': 5.0,  # Non-performing loans (Simulated if missing)
        },
        'Real Estate - Developers': {
            'undervalued_pb': 0.8,
            'undervalued_ev_ebitda': 8.0,
            'quality_debt_equity': 0.6,
        },
        'Consumer - Food & Beverage': {
            'undervalued_pe': 10.0,
            'undervalued_ev_ebitda': 7.0,
            'quality_gross_margin': 20.0,
            'quality_roe': 18.0,
        },
        'Industrials': {
            'undervalued_pe': 8.0,
            'undervalued_ev_ebitda': 6.0,
            'quality_operating_margin': 12.0
        },
        'Basic Materials': { # Similar to Industrials
             'undervalued_pe': 8.0,
             'undervalued_ev_ebitda': 6.0
        }
    }

    def calculate_score(self, ticker: str, sector: str, metrics: Dict[str, float]) -> ValuationScore:
        """
        Calculate valuation score based on sector.
        """
        criteria = self._get_sector_criteria(sector)
        
        # 1. Valuation Score (40 pts)
        val_score = 0
        breakdown = {}
        
        # P/E Check
        pe = metrics.get('pe_ratio')
        target_pe = criteria.get('undervalued_pe', 10.0)
        if pe and pe > 0:
            if pe < target_pe * 0.8: val_score += 20
            elif pe < target_pe: val_score += 10
            
        # P/B Check (Critical for Banks/RE)
        pb = metrics.get('pb_ratio')
        target_pb = criteria.get('undervalued_pb')
        if target_pb and pb and pb > 0:
            if pb < target_pb * 0.8: val_score += 20 # Bonus for deep value
            elif pb < target_pb: val_score += 15
        elif not target_pb and val_score < 20: # Fallback if PB not primary
             # Use EV/EBITDA or just scale PE
             pass
             
        val_score = min(val_score, 40)
        breakdown['valuation'] = val_score

        # 2. Quality Score (30 pts)
        qual_score = 0
        roe = metrics.get('roe')
        # Handle edge cases where roe might be < 1 indicating percentage missing * 100
        if roe is not None and abs(roe) < 5:
            roe = roe * 100

        target_roe = criteria.get('quality_roe', 15.0)
        if roe and roe > target_roe: 
            qual_score += 15
        elif roe and roe > 0:
            qual_score += 5
        
        de = metrics.get('debt_equity')
        target_de = criteria.get('quality_debt_equity')
        if target_de and de is not None and de < target_de: 
            qual_score += 15
        elif not target_de: # General check
             if de is not None and de < 1.0: qual_score += 15
        
        # Add a check for operating_margin/gross_margin if present in criteria
        target_margin = criteria.get('quality_operating_margin') or criteria.get('quality_gross_margin')
        margin = metrics.get('operating_margin') or metrics.get('gross_margin')
        # If margins are < 1, multiply by 100
        if margin is not None and abs(margin) < 1.5:
             margin = margin * 100

        if target_margin and margin is not None and margin > target_margin:
            # If no roe was matched, use margin points
            if qual_score < 30:
                 qual_score += 15
             
        qual_score = min(qual_score, 30)
        breakdown['quality'] = qual_score

        # 3. Momentum/Tech (30 pts) - Simplified
        mom_score = 0
        price = metrics.get('current_price')
        sma200 = metrics.get('sma_200')
        if price and sma200 and price > sma200: mom_score += 15
        
        # RSI check
        rsi = metrics.get('rsi')
        if rsi:
            if 40 < rsi < 70: mom_score += 15 # Healthy
            elif rsi < 30: mom_score += 10 # Oversold bounce potential
            
        breakdown['momentum'] = mom_score
        
        total = val_score + qual_score + mom_score
        
        assessment = "Fairly Valued"
        if total > 70: assessment = "Significantly Undervalued"
        elif total > 50: assessment = "Moderately Undervalued"
        
        return ValuationScore(total, val_score, qual_score, mom_score, breakdown, assessment)

    def _get_sector_criteria(self, sector: str) -> Dict:
        # Simple fuzzy matching
        for k, v in self.SECTOR_CRITERIA.items():
            if k in sector or sector in k:
                return v
        return self.SECTOR_CRITERIA['Industrials'] # Default conservative
