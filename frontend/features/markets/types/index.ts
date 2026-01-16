export interface Stock {
    symbol: string;
    name_en: string;
    last_price: number;
    change_pct: number;
    volume: number;
}

export interface Sector {
    name: string;
    performance: number;
}

export interface MarketPulse {
    count: number;
    up: number;
    down: number;
    unchanged: number;
    volume_total: number;
}

export interface MarketOverviewData {
    market_pulse: MarketPulse;
    top_gainers: Stock[];
    top_losers: Stock[];
    most_active: Stock[];
    sectors: Sector[];
}
