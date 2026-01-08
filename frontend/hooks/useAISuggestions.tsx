
import { useMemo } from 'react';
import {
    TrendingUp,
    BarChart3,
    PieChart,
    Activity,
    Sparkles,
    Zap,
    ShieldCheck,
    Building2,
    Newspaper,
    FileText
} from 'lucide-react';
import { useMarketSafe } from '@/contexts/MarketContext';

// Icon helper for DollarSign which was custom in the page
const DollarSignIcon = (props: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
);

export function useAISuggestions() {
    const { market } = useMarketSafe();

    const suggestionCategories = useMemo(() => {
        const isEgypt = market === 'EGX';
        const stocks = isEgypt
            ? { main: "CIB", second: "SWDY", bank: "COMI", pharma: "PHDC" }
            : { main: "Aramco", second: "Al Rajhi", bank: "SNB", pharma: "2070" };

        return [
            {
                id: 'popular',
                label: `🔥 ${isEgypt ? 'Egypt' : 'KSA'} Hot`,
                suggestions: [
                    { text: `${stocks.main} price now`, icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
                    { text: "Top gainers today", icon: BarChart3, gradient: "from-orange-500 to-red-500" },
                    { text: "Market summary", icon: PieChart, gradient: "from-blue-500 to-indigo-600" },
                    { text: `${stocks.pharma} financials`, icon: FileText, gradient: "from-purple-500 to-indigo-500" },
                ]
            },
            {
                id: 'valuation',
                label: '💎 Valuation',
                suggestions: [
                    { text: `Is ${stocks.main} overvalued?`, icon: Sparkles, gradient: "from-blue-500 to-indigo-600" },
                    { text: `PE ratio for ${stocks.second}`, icon: DollarSignIcon, gradient: "from-cyan-500 to-blue-600" },
                    { text: `Show PEG Ratio for ${stocks.bank}`, icon: Zap, gradient: "from-violet-500 to-purple-600" },
                    { text: `Compare ${stocks.main} vs ${stocks.second}`, icon: BarChart3, gradient: "from-slate-500 to-slate-700" },
                ]
            },
            {
                id: 'health',
                label: '🏥 Health',
                suggestions: [
                    { text: `Financial health of ${stocks.main}`, icon: ShieldCheck, gradient: "from-emerald-500 to-green-600" },
                    { text: `${stocks.second} Debt to Equity`, icon: Activity, gradient: "from-red-500 to-orange-600" },
                    { text: `Current ratio for ${stocks.bank}`, icon: Building2, gradient: "from-teal-500 to-cyan-600" },
                    { text: `ROE for ${stocks.main}`, icon: Newspaper, gradient: "from-indigo-500 to-blue-600" },
                ]
            },
            {
                id: 'growth',
                label: '🚀 Growth',
                suggestions: [
                    { text: `${stocks.main} revenue growth`, icon: TrendingUp, gradient: "from-amber-500 to-orange-600" },
                    { text: `Net Income for ${stocks.second}`, icon: BarChart3, gradient: "from-blue-500 to-indigo-600" },
                    { text: `${stocks.bank} profit margin`, icon: PieChart, gradient: "from-pink-500 to-rose-600" },
                    { text: `Earnings trend ${stocks.main}`, icon: Activity, gradient: "from-purple-500 to-violet-600" },
                ]
            },
            {
                id: 'dividends',
                label: '💵 Dividends',
                suggestions: [
                    { text: `Dividend history ${stocks.main}`, icon: Sparkles, gradient: "from-green-500 to-emerald-600" },
                    { text: `Dividend yield ${stocks.second}`, icon: TrendingUp, gradient: "from-lime-500 to-green-600" },
                    { text: `${stocks.bank} payout ratio`, icon: PieChart, gradient: "from-teal-500 to-cyan-600" },
                    { text: "Top dividend stocks", icon: Sparkles, gradient: "from-amber-400 to-yellow-600" },
                ]
            },
            {
                id: 'ownership',
                label: '🤝 Ownership',
                suggestions: [
                    { text: `Who owns ${stocks.main}?`, icon: Building2, gradient: "from-slate-600 to-slate-800" },
                    { text: `Insider trading ${stocks.second}`, icon: Newspaper, gradient: "from-red-500 to-rose-600" },
                    { text: `${stocks.bank} shareholders`, icon: PieChart, gradient: "from-indigo-500 to-blue-600" },
                ]
            },
        ];
    }, [market]);

    return suggestionCategories;
}

// Egypt-only suggestions for mobile (no market toggle needed)
export function useEgyptOnlySuggestions() {
    const suggestionCategories = useMemo(() => {
        const stocks = { main: "CIB", second: "SWDY", bank: "COMI", pharma: "PHDC" };

        return [
            {
                id: 'popular',
                label: '🔥 Egypt Hot',
                suggestions: [
                    { text: `${stocks.main} price now`, icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
                    { text: "Top gainers today", icon: BarChart3, gradient: "from-orange-500 to-red-500" },
                    { text: "Market summary", icon: PieChart, gradient: "from-blue-500 to-indigo-600" },
                    { text: `${stocks.pharma} financials`, icon: FileText, gradient: "from-purple-500 to-indigo-500" },
                ]
            },
            {
                id: 'valuation',
                label: '💎 Valuation',
                suggestions: [
                    { text: `Is ${stocks.main} overvalued?`, icon: Sparkles, gradient: "from-blue-500 to-indigo-600" },
                    { text: `PE ratio for ${stocks.second}`, icon: DollarSignIcon, gradient: "from-cyan-500 to-blue-600" },
                    { text: `Show PEG Ratio for ${stocks.bank}`, icon: Zap, gradient: "from-violet-500 to-purple-600" },
                    { text: `Compare ${stocks.main} vs ${stocks.second}`, icon: BarChart3, gradient: "from-slate-500 to-slate-700" },
                ]
            },
            {
                id: 'health',
                label: '🏥 Health',
                suggestions: [
                    { text: `Financial health of ${stocks.main}`, icon: ShieldCheck, gradient: "from-emerald-500 to-green-600" },
                    { text: `${stocks.second} Debt to Equity`, icon: Activity, gradient: "from-red-500 to-orange-600" },
                    { text: `Current ratio for ${stocks.bank}`, icon: Building2, gradient: "from-teal-500 to-cyan-600" },
                    { text: `ROE for ${stocks.main}`, icon: Newspaper, gradient: "from-indigo-500 to-blue-600" },
                ]
            },
            {
                id: 'growth',
                label: '🚀 Growth',
                suggestions: [
                    { text: `${stocks.main} revenue growth`, icon: TrendingUp, gradient: "from-amber-500 to-orange-600" },
                    { text: `Net Income for ${stocks.second}`, icon: BarChart3, gradient: "from-blue-500 to-indigo-600" },
                    { text: `${stocks.bank} profit margin`, icon: PieChart, gradient: "from-pink-500 to-rose-600" },
                    { text: `Earnings trend ${stocks.main}`, icon: Activity, gradient: "from-purple-500 to-violet-600" },
                ]
            },
            {
                id: 'dividends',
                label: '💵 Dividends',
                suggestions: [
                    { text: `Dividend history ${stocks.main}`, icon: Sparkles, gradient: "from-green-500 to-emerald-600" },
                    { text: `Dividend yield ${stocks.second}`, icon: TrendingUp, gradient: "from-lime-500 to-green-600" },
                    { text: `${stocks.bank} payout ratio`, icon: PieChart, gradient: "from-teal-500 to-cyan-600" },
                    { text: "Top dividend stocks EGX", icon: Sparkles, gradient: "from-amber-400 to-yellow-600" },
                ]
            },
            {
                id: 'technicals',
                label: '⚙️ Technicals',
                suggestions: [
                    { text: `Technical analysis for ${stocks.main}`, icon: Activity, gradient: "from-violet-500 to-purple-600" },
                    { text: `RSI for ${stocks.second}`, icon: TrendingUp, gradient: "from-fuchsia-500 to-pink-600" },
                    { text: `${stocks.bank} support and resistance`, icon: BarChart3, gradient: "from-indigo-500 to-blue-600" },
                    { text: `Moving averages ${stocks.main}`, icon: PieChart, gradient: "from-cyan-500 to-blue-500" },
                ]
            },
            {
                id: 'news',
                label: '📰 News',
                suggestions: [
                    { text: `Latest news for ${stocks.main}`, icon: Newspaper, gradient: "from-slate-600 to-slate-800" },
                    { text: `Market news today`, icon: Sparkles, gradient: "from-red-500 to-rose-600" },
                    { text: `${stocks.bank} announcements`, icon: Building2, gradient: "from-blue-500 to-cyan-600" },
                ]
            },
            {
                id: 'ownership',
                label: '🤝 Ownership',
                suggestions: [
                    { text: `Who owns ${stocks.main}?`, icon: Building2, gradient: "from-slate-600 to-slate-800" },
                    { text: `Insider trading ${stocks.second}`, icon: Newspaper, gradient: "from-red-500 to-rose-600" },
                    { text: `${stocks.bank} shareholders`, icon: PieChart, gradient: "from-indigo-500 to-blue-600" },
                ]
            },
        ];
    }, []);

    return suggestionCategories;
}
