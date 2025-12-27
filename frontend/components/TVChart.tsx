"use client";

import { createChart, ColorType, CandlestickSeries, LineSeries } from 'lightweight-charts';
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '@/lib/api';

interface ChartProps {
    symbol?: string;
    data?: { time: string, open: number, high: number, low: number, close: number }[];
    markers?: { time: string, position: 'aboveBar' | 'belowBar', color: string, shape: 'circle' | 'square' | 'arrowUp' | 'arrowDown', text: string }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
}

export const TVChartComponent = (props: ChartProps) => {
    const {
        symbol,
        data: propData,
        markers = [],
        colors: {
            backgroundColor = '#ffffff',
            textColor = '#334155',
        } = {},
    } = props;

    const [mounted, setMounted] = useState(false);

    // Optional: Fetch data if symbol is provided but data is not
    const { data: history = [] } = useQuery({
        queryKey: ["history", symbol],
        queryFn: () => fetchHistory(symbol!),
        enabled: !!symbol && !propData && mounted
    });

    // Normalize Data
    const chartData = useMemo(() => {
        if (propData) return propData;
        if (!history || history.length === 0) return [];

        return history.map((item: { time: string; open: number; high: number; low: number; close: number }) => ({
            time: new Date(item.time).toISOString().split('T')[0],
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close),
        })).reverse();
    }, [propData, history]);

    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        if (!chartContainerRef.current) return;
        if (chartData.length === 0) return;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: '#f1f5f9' },
                horzLines: { color: '#f1f5f9' },
            },
            timeScale: {
                borderColor: '#e2e8f0',
            },
            rightPriceScale: {
                borderColor: '#e2e8f0',
            }
        });

        // Use v5 API: addSeries with CandlestickSeries type
        try {
            const newSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#22c55e',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#22c55e',
                wickDownColor: '#ef4444',
            });

            newSeries.setData(chartData as any);


            // Markers are not directly supported on candlestick series in lightweight-charts v5
            // If markers are needed, consider using chart.subscribeClick or custom rendering
        } catch (e) {
            // Fallback to line series if candlestick fails
            const lineSeries = chart.addSeries(LineSeries, {
                color: '#2563eb',
                lineWidth: 2,
            });
            lineSeries.setData(chartData.map(d => ({ time: d.time, value: d.close })) as any);
        }

        chart.timeScale().fitContent();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [mounted, chartData, markers, backgroundColor, textColor]);

    if (!mounted) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <span className="text-xs text-slate-400 animate-pulse">Initializing...</span>
            </div>
        );
    }

    return (
        <div ref={chartContainerRef} className="w-full relative h-full flex items-center justify-center">
            {chartData.length === 0 && <span className="text-xs text-slate-400 animate-pulse">Loading Market Data...</span>}
        </div>
    );
};
