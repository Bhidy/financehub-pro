"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { ChartPayload } from "@/hooks/useAIChat";

// Dynamic import to prevent SSR issues with ApexCharts
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ChartCardProps {
    chart: ChartPayload;
    height?: number;
}

export function ChartCard({ chart, height = 350 }: ChartCardProps) {
    const { chartOptions, chartSeries } = useMemo(() => {
        if (!chart?.data?.length) {
            return { chartOptions: null, chartSeries: null };
        }

        const isCandlestick = chart.type === "candlestick";

        if (isCandlestick) {
            // Candlestick chart
            const series = [{
                name: chart.symbol,
                data: chart.data.map((d: any) => ({
                    x: new Date(d.time).getTime(),
                    y: [d.open || 0, d.high || 0, d.low || 0, d.close || 0]
                }))
            }];

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "candlestick",
                    height,
                    toolbar: {
                        show: true,
                        tools: {
                            download: true,
                            selection: true,
                            zoom: true,
                            zoomin: true,
                            zoomout: true,
                            pan: true,
                            reset: true
                        }
                    },
                    animations: {
                        enabled: true,
                        speed: 500
                    },
                    background: "transparent"
                },
                title: {
                    text: chart.title || `${chart.symbol} - ${chart.range}`,
                    align: "left",
                    style: {
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1e293b"
                    }
                },
                xaxis: {
                    type: "datetime",
                    labels: {
                        datetimeUTC: false,
                        style: {
                            colors: "#64748b",
                            fontSize: "11px"
                        }
                    }
                },
                yaxis: {
                    tooltip: {
                        enabled: true
                    },
                    labels: {
                        style: {
                            colors: "#64748b",
                            fontSize: "11px"
                        },
                        formatter: (val: number) => val.toFixed(2)
                    }
                },
                plotOptions: {
                    candlestick: {
                        colors: {
                            upward: "#10b981",
                            downward: "#ef4444"
                        },
                        wick: {
                            useFillColor: true
                        }
                    }
                },
                grid: {
                    borderColor: "#e2e8f0",
                    strokeDashArray: 3
                },
                tooltip: {
                    theme: "light",
                    x: {
                        format: "dd MMM yyyy"
                    }
                }
            };

            return { chartOptions: options, chartSeries: series };
        } else {
            // Line chart
            const series = [{
                name: "Price",
                data: chart.data.map((d: any) => ({
                    x: new Date(d.time).getTime(),
                    y: d.close || d.revenue || d.value || 0
                }))
            }];

            const options: ApexCharts.ApexOptions = {
                chart: {
                    type: "area",
                    height,
                    toolbar: {
                        show: true
                    },
                    animations: {
                        enabled: true,
                        speed: 500
                    },
                    background: "transparent"
                },
                title: {
                    text: chart.title || chart.symbol,
                    align: "left",
                    style: {
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1e293b"
                    }
                },
                stroke: {
                    curve: "smooth",
                    width: 2
                },
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.4,
                        opacityTo: 0.1,
                        stops: [0, 100]
                    }
                },
                colors: ["#3b82f6"],
                xaxis: {
                    type: "datetime",
                    labels: {
                        style: {
                            colors: "#64748b",
                            fontSize: "11px"
                        }
                    }
                },
                yaxis: {
                    labels: {
                        style: {
                            colors: "#64748b",
                            fontSize: "11px"
                        },
                        formatter: (val: number) => val.toFixed(2)
                    }
                },
                grid: {
                    borderColor: "#e2e8f0",
                    strokeDashArray: 3
                },
                tooltip: {
                    theme: "light",
                    x: {
                        format: "dd MMM yyyy"
                    }
                }
            };

            return { chartOptions: options, chartSeries: series };
        }
    }, [chart, height]);

    if (!chartOptions || !chartSeries) {
        return (
            <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500">
                No chart data available
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4">
                <Chart
                    options={chartOptions}
                    series={chartSeries}
                    type={chart.type === "candlestick" ? "candlestick" : "area"}
                    height={height}
                />
            </div>
            {/* Range selector buttons */}
            <div className="flex items-center gap-2 px-4 pb-4">
                {["1D", "1W", "1M", "1Y", "MAX"].map((range) => (
                    <button
                        key={range}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors
                            ${chart.range === range
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                    >
                        {range}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default ChartCard;
