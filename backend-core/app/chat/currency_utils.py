EGX_USD_SYMBOLS = {
    'MOIL', 'FAITA', 'SEIGA', 'EGBE', 'VLMR', 'GPPL', 'SAIB', 'EGSA', 
    'SPHT', 'CFGH', 'NAHO', 'TRTO', 'GTEX', 'EKHO'
}

def get_ticker_currency(ticker_row: dict) -> str:
    """
    Get the correct currency for a ticker, avoiding inferring purely from the market.
    """
    if not ticker_row:
        return 'USD'
        
    symbol = ticker_row.get('symbol', '').upper()
    market_code = ticker_row.get('market_code', '')
    currency = ticker_row.get('currency') or ticker_row.get('trading_currency')

    if market_code == 'EGX' and symbol in EGX_USD_SYMBOLS:
        return 'USD'
        
    if currency:
        return currency
        
    if market_code == 'EGX':
        return 'EGP'
        
    return 'USD'

def is_egx_market(ticker_row: dict) -> bool:
    """
    Check if a ticker is in EGX.
    """
    if not ticker_row:
        return False
    market_code = ticker_row.get('market_code')
    if market_code == 'EGX':
        return True
    return get_ticker_currency(ticker_row) == 'EGP'
