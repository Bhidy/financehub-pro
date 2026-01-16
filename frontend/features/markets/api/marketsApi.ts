import { api } from '@/lib/api';
import type { MarketOverviewData } from '../types';

export const marketsApi = {
    getOverview: async (): Promise<MarketOverviewData> => {
        // Using the verified endpoint from page.tsx: /api/v1/yahoo/market
        // The 'api' client already prepends the Base URL.
        const { data } = await api.get('/yahoo/market');
        return data;
    },
};
