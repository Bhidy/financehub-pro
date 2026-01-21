
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
    FileText,
    LayoutDashboard,
    Gift,
    Scale,
    Target,
    Rocket
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
            ? { main: "TMGH", second: "SWDY", bank: "COMI", pharma: "PHDC", growth: "FWRY", efficient: "ADIB", cagr: "EFIH" }
            : { main: "Aramco", second: "Al Rajhi", bank: "SNB", pharma: "2070", growth: "4030", efficient: "1120", cagr: "7010" };

        return [
            {
                id: 'smart_insights',
                label: '🧠 Smart Insights',
                suggestions: [
                    { text: `Is ${stocks.main} undervalued or overvalued?`, icon: Scale, gradient: "from-violet-600 to-indigo-600" },
                    { text: `What is the fair value of ${stocks.second}?`, icon: Target, gradient: "from-blue-600 to-cyan-600" },
                    { text: `Is ${stocks.bank} financially safe?`, icon: ShieldCheck, gradient: "from-emerald-600 to-teal-600" },
                    { text: `Does ${stocks.growth} have high growth potential?`, icon: Rocket, gradient: "from-fuchsia-600 to-purple-600" },
                ]
            },
            {
                id: 'popular',
                label: `🔥 ${isEgypt ? 'Egypt' : 'KSA'} Hot`,
                suggestions: [
                    { text: "Show me the safest stocks in EGX", icon: ShieldCheck, gradient: "from-emerald-500 to-teal-600" },
                    { text: "Top 10 dividend stocks in Egypt", icon: DollarSignIcon, gradient: "from-amber-500 to-yellow-600" },
                    { text: "Market summary", icon: PieChart, gradient: "from-blue-500 to-blue-600" },
                ]
            },
            {
                id: 'valuation',
                label: '💎 Valuation',
                suggestions: [
                    { text: `Is ${stocks.main} overvalued?`, icon: Sparkles, gradient: "from-blue-500 to-blue-600" },
                    { text: `PE ratio for ${stocks.second}`, icon: DollarSignIcon, gradient: "from-cyan-500 to-blue-600" },
                    { text: `Show PEG Ratio for ${stocks.bank}`, icon: Zap, gradient: "from-teal-500 to-cyan-600" },
                    { text: `Compare ${stocks.main} vs ${stocks.second}`, icon: BarChart3, gradient: "from-slate-500 to-slate-700" },
                ]
            },
            {
                id: 'health',
                label: '🏥 Health',
                suggestions: [
                    { text: `Financial health of ${stocks.main}`, icon: ShieldCheck, gradient: "from-emerald-500 to-green-600" },
                    { text: `Show ${stocks.efficient} efficiency metrics`, icon: Activity, gradient: "from-teal-500 to-cyan-600" },
                    { text: `${stocks.second} Debt to Equity`, icon: Zap, gradient: "from-red-500 to-orange-600" },
                    { text: `Show me the safest stocks in EGX`, icon: ShieldCheck, gradient: "from-emerald-600 to-teal-700" },
                ]
            },
            {
                id: 'growth',
                label: '🚀 Growth & Ownership',
                suggestions: [
                    { text: `${stocks.bank} profit margin`, icon: PieChart, gradient: "from-pink-500 to-rose-600" },
                    { text: `Earnings trend ${stocks.main}`, icon: Activity, gradient: "from-cyan-500 to-teal-600" },
                    { text: `Who owns ${stocks.main}?`, icon: Building2, gradient: "from-slate-600 to-slate-800" },
                    { text: `Insider trading ${stocks.second}`, icon: Newspaper, gradient: "from-red-500 to-rose-600" },
                    { text: `${stocks.bank} shareholders`, icon: PieChart, gradient: "from-blue-500 to-blue-600" },
                ]
            },
            {
                id: 'dividends',
                label: '💵 Dividends',
                suggestions: [
                    { text: `Dividend history ${stocks.main}`, icon: Sparkles, gradient: "from-green-500 to-emerald-600" },
                    { text: `Dividend yield ${stocks.second}`, icon: TrendingUp, gradient: "from-lime-500 to-green-600" },
                    { text: "Top 10 dividend stocks in Egypt", icon: DollarSignIcon, gradient: "from-amber-400 to-yellow-600" },
                    { text: `${stocks.bank} payout ratio`, icon: PieChart, gradient: "from-teal-500 to-cyan-600" },
                ]
            },
        ];
    }, [market]);

    return suggestionCategories;
}

// Egypt-only suggestions for mobile (no market toggle needed)
export function useEgyptOnlySuggestions() {
    const suggestionCategories = useMemo(() => {
        const stocks = { main: "TMGH", second: "SWDY", bank: "COMI", pharma: "PHDC" };

        return [
            {
                id: 'popular',
                label: '🔥 Egypt Hot',
                suggestions: [
                    { text: `${stocks.main} price now`, icon: TrendingUp, gradient: "from-emerald-500 to-teal-600" },
                    { text: "Top gainers today", icon: BarChart3, gradient: "from-orange-500 to-red-500" },
                    { text: "Market summary", icon: PieChart, gradient: "from-blue-500 to-blue-600" },
                    { text: `${stocks.pharma} financials`, icon: FileText, gradient: "from-cyan-500 to-blue-500" },
                ]
            },
            {
                id: 'valuation',
                label: '💎 Valuation',
                suggestions: [
                    { text: `Is ${stocks.main} overvalued?`, icon: Sparkles, gradient: "from-blue-500 to-blue-600" },
                    { text: `PE ratio for ${stocks.second}`, icon: DollarSignIcon, gradient: "from-cyan-500 to-blue-600" },
                    { text: `Show PEG Ratio for ${stocks.bank}`, icon: Zap, gradient: "from-teal-500 to-cyan-600" },
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
                    { text: `ROE for ${stocks.main}`, icon: Newspaper, gradient: "from-blue-500 to-blue-600" },
                ]
            },
            {
                id: 'growth',
                label: '🚀 Growth',
                suggestions: [
                    { text: `${stocks.main} revenue growth`, icon: TrendingUp, gradient: "from-amber-500 to-orange-600" },
                    { text: `Net Income for ${stocks.second}`, icon: BarChart3, gradient: "from-blue-500 to-blue-600" },
                    { text: `${stocks.bank} profit margin`, icon: PieChart, gradient: "from-pink-500 to-rose-600" },
                    { text: `Earnings trend ${stocks.main}`, icon: Activity, gradient: "from-cyan-500 to-teal-600" },
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
                    { text: `${stocks.bank} shareholders`, icon: PieChart, gradient: "from-blue-500 to-blue-600" },
                ]
            },
        ];
    }, []);

    return suggestionCategories;
}
