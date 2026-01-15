import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional

class TechnicalAnalysis:
    def __init__(self, history: List[Dict]):
        """
        Initialize with a list of OHLC dictionaries.
        Expected keys: 'close', 'date'/'time'
        """
        # Convert to DataFrame
        self.df = pd.DataFrame(history)
        
        # Ensure we have numeric data
        if 'close' in self.df.columns:
            self.df['close'] = pd.to_numeric(self.df['close'])
        
        # Sort by date ascending (oldest first) for calculations
        if 'time' in self.df.columns:
            self.df = self.df.sort_values('time')
        elif 'date' in self.df.columns:
            self.df = self.df.sort_values('date')

    def calculate_rsi(self, periods=14) -> float:
        """Calculate Relative Strength Index (RSI)"""
        if len(self.df) < periods:
            return 50.0 # Neutral fallback
            
        close_delta = self.df['close'].diff()

        # Make two series: one for lower closes and one for higher closes
        up = close_delta.clip(lower=0)
        down = -1 * close_delta.clip(upper=0)
        
        # Calculate Expontential Moving Averages
        ma_up = up.ewm(com=periods - 1, adjust=True, min_periods=periods).mean()
        ma_down = down.ewm(com=periods - 1, adjust=True, min_periods=periods).mean()

        rsi = ma_up / ma_down
        rsi = 100 - (100 / (1 + rsi))
        
        return round(rsi.iloc[-1], 2)

    def calculate_sma(self, periods=50) -> Optional[float]:
        """Calculate Simple Moving Average"""
        if len(self.df) < periods:
            return None
        return round(self.df['close'].rolling(window=periods).mean().iloc[-1], 2)

    def analyze_trend(self) -> str:
        """Determine trend based on SMA crossovers"""
        sma_20 = self.calculate_sma(20)
        sma_50 = self.calculate_sma(50)
        
        if not sma_20 or not sma_50:
            return "UNCERTAIN"
            
        if sma_20 > sma_50 * 1.01:
            return "BULLISH"
        elif sma_20 < sma_50 * 0.99:
            return "BEARISH"
        else:
            return "SIDEWAYS"

    def get_summary(self) -> Dict[str, Any]:
        """Get full technical summary"""
        current_price = self.df['close'].iloc[-1]
        rsi = self.calculate_rsi()
        trend = self.analyze_trend()
        
        sma_50 = self.calculate_sma(50)
        sma_200 = self.calculate_sma(200)
        
        # Determine signals
        signals = []
        if rsi > 70:
            signals.append("OVERBOUGHT (RSI > 70)")
        elif rsi < 30:
            signals.append("OVERSOLD (RSI < 30)")
            
        if sma_200 and current_price > sma_200:
            signals.append("ABOVE_200_SMA (Long-term Bullish)")
        elif sma_200 and current_price < sma_200:
            signals.append("BELOW_200_SMA (Long-term Bearish)")
            
        return {
            "current_price": current_price,
            "rsi": rsi,
            "trend": trend,
            "sma_50": sma_50,
            "sma_200": sma_200,
            "signals": signals
        }
