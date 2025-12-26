import math
from datetime import datetime

class BacktestEngine:
    def __init__(self, data, initial_capital=10000.0, commission=0.0):
        self.data = sorted(data, key=lambda x: x['time']) # Ensure sorted by time
        self.capital = float(initial_capital)
        self.initial_capital = float(initial_capital)
        self.commission = float(commission)
        self.position = 0
        self.trades = []
        self.equity_curve = []
        self.indicators = {}

    def calculate_sma(self, period, key='close'):
        result = []
        values = [float(d[key]) for d in self.data]
        for i in range(len(values)):
            if i < period - 1:
                result.append(None)
            else:
                window = values[i - period + 1 : i + 1]
                result.append(sum(window) / period)
        self.indicators[f'SMA_{period}'] = result
        return result

    def calculate_rsi(self, period, key='close'):
        result = []
        values = [float(d[key]) for d in self.data]
        
        gains = []
        losses = []
        
        # Initial calculation
        for i in range(1, len(values)):
            change = values[i] - values[i-1]
            gains.append(max(0, change))
            losses.append(max(0, -change))
            
        # First RSI
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        
        result = [None] * period # first few are none
        
        rs = avg_gain / avg_loss if avg_loss != 0 else 0
        rsi = 100 - (100 / (1 + rs))
        result.append(rsi)
        
        # Smoothed RSI
        for i in range(period + 1, len(values)):
            change = values[i] - values[i-1]
            gain = max(0, change)
            loss = max(0, -change)
            
            avg_gain = ((avg_gain * (period - 1)) + gain) / period
            avg_loss = ((avg_loss * (period - 1)) + loss) / period
            
            rs = avg_gain / avg_loss if avg_loss != 0 else 0
            rsi = 100 - (100 / (1 + rs))
            result.append(rsi)
            
        # Pad beginning
        final_result = [None] * period + result[period:]
        # Fix length mismatch if any manual padding calc errors, simpler to just ensure length match
        # Actually easier: just fill first `period` with None
        
        self.indicators[f'RSI_{period}'] = [None] * period 
        # Re-calc simpler loop for exact matching
        
        # Robust Re-implementation
        rsi_series = [None] * len(values)
        if len(values) > period:
            # First avg
            gain_sum = 0
            loss_sum = 0
            for i in range(1, period + 1):
                change = values[i] - values[i-1]
                if change > 0: gain_sum += change
                else: loss_sum += abs(change)
            
            avg_gain = gain_sum / period
            avg_loss = loss_sum / period
            
            if avg_loss == 0: rs = 100
            else: rs = avg_gain / avg_loss
            
            rsi_series[period] = 100 - (100 / (1 + rs))
            
            for i in range(period + 1, len(values)):
                change = values[i] - values[i-1]
                gain = change if change > 0 else 0
                loss = abs(change) if change < 0 else 0
                
                avg_gain = (avg_gain * (period - 1) + gain) / period
                avg_loss = (avg_loss * (period - 1) + loss) / period
                
                if avg_loss == 0: rs = 100
                else: rs = avg_gain / avg_loss
                
                rsi_series[i] = 100 - (100 / (1 + rs))
                
        self.indicators[f'RSI_{period}'] = rsi_series
        return rsi_series

    def run(self, rules):
        # rules: [{'indicator': 'RSI_14', 'operator': '<', 'value': 30, 'action': 'BUY'}]
        # Pre-calculate required indicators
        for rule in rules:
            ind_name = rule['indicator']
            if ind_name not in self.indicators:
                if 'SMA' in ind_name:
                    period = int(ind_name.split('_')[1])
                    self.calculate_sma(period)
                if 'RSI' in ind_name:
                    period = int(ind_name.split('_')[1])
                    self.calculate_rsi(period)

        n = len(self.data)
        for i in range(n):
            price = float(self.data[i]['close'])
            date = self.data[i]['time']
            
            # Execute Rules
            for rule in rules:
                ind_name = rule['indicator']
                operator = rule['operator']
                trigger_val = float(rule['value'])
                action = rule['action']
                
                current_val = self.indicators[ind_name][i]
                
                if current_val is None:
                    continue
                    
                condition_met = False
                if operator == '<' and current_val < trigger_val: condition_met = True
                elif operator == '>' and current_val > trigger_val: condition_met = True
                elif operator == '=' and current_val == trigger_val: condition_met = True
                
                if condition_met:
                    if action == 'BUY' and self.position == 0:
                        qty = math.floor(self.capital / price)
                        if qty > 0:
                            cost = qty * price
                            self.capital -= cost
                            self.position = qty
                            self.trades.append({'type': 'BUY', 'price': price, 'time': date, 'qty': qty})
                            
                    elif action == 'SELL' and self.position > 0:
                        revenue = self.position * price
                        self.capital += revenue
                        self.trades.append({'type': 'SELL', 'price': price, 'time': date, 'qty': self.position, 'pnl': revenue - (self.trades[-1]['price'] * self.trades[-1]['qty'])})
                        self.position = 0

            # Update Equity
            market_val = self.position * price
            total_equity = self.capital + market_val
            self.equity_curve.append({'time': date, 'value': total_equity})

        # Final Outcome
        return {
            "final_capital": self.capital + (self.position * float(self.data[-1]['close'])),
            "total_trades": len(self.trades),
            "trades": self.trades,
            "equity_curve": self.equity_curve
        }
