import re

file_path = "frontend/app/admin/analytics/page.tsx"
with open(file_path, 'r') as f:
    content = f.read()

# 1. We replace everything from {/* 4. MAIN CONTENT GRID */} down to the end of the DEMOGRAPHICS section right before {/* 6. USER FEEDBACK REPORTS (Full Width) */}

target_start = r'\{\/\* 4\. MAIN CONTENT GRID \*\/\}'
target_end = r'\{\/\* 6\. USER FEEDBACK REPORTS \(Full Width\) \*\/\}'

new_content_grid = """{/* 4. MAIN CONTENT GRID */}
                <div className="grid lg:grid-cols-3 gap-8 relative z-10">

                    {/* LEFT COLUMN: 2/3 Width */}
                    <div className="lg:col-span-2 space-y-8 h-full flex flex-col">

                        {/* CONVERSATION INTELLIGENCE TABS */}
                        <section className="relative flex-1 group bg-white dark:bg-[#0B1121] rounded-[24px] border border-slate-200 dark:border-white/[0.06] shadow-md dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:shadow-2xl dark:hover:border-white/[0.12] flex flex-col">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                            
                            {/* Header & Controls */}
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white dark:bg-[#111827] rounded-[16px] flex items-center justify-center shadow-sm border border-indigo-500/20">
                                        <Sparkles className="w-7 h-7 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                            Conversation Intelligence
                                            <Tooltip content="Analyze user intent and query volume" side="right">
                                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                                            </Tooltip>
                                        </h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Market query velocity & top trends</p>
                                    </div>
                                </div>
                                <div className="flex bg-slate-100 dark:bg-[#151925] p-1.5 rounded-xl shadow-inner border border-slate-200 dark:border-white/5 w-fit">
                                    <button
                                        onClick={() => setActiveTab('demand')}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'demand' ? 'bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                    >
                                        Trending Demand
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('questions')}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'questions' ? 'bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                                    >
                                        Top Questions
                                    </button>
                                </div>
                            </div>
                            
                            {/* Tab Content */}
                            <div className="flex-1 overflow-hidden relative z-10">
                                {activeTab === 'demand' && (
                                    <div className="overflow-x-auto h-full max-h-[500px] overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 dark:bg-[#0F1623] text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-20 shadow-sm">
                                                <tr>
                                                    <th className="px-8 py-5">Trending Query</th>
                                                    <th className="px-8 py-5 whitespace-nowrap">Volume</th>
                                                    <th className="px-8 py-5 whitespace-nowrap">Growth</th>
                                                    <th className="px-8 py-5">Intent</th>
                                                    <th className="px-8 py-5">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-[#1E293B]">
                                                {demandInsights.length === 0 ? (
                                                    <tr><td colSpan={5} className="p-12 text-center text-slate-500 font-medium">No trending data available</td></tr>
                                                ) : (
                                                    demandInsights.map((d, i) => (
                                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                            <td className="px-8 py-5 font-bold text-slate-900 dark:text-slate-200">{d.query_text}</td>
                                                            <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-medium">{d.volume}</td>
                                                            <td className="px-8 py-5">
                                                                <span className={`flex items-center gap-1.5 font-bold px-2.5 py-1 rounded-md w-fit ${d.growth_rate > 0 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10'}`}>
                                                                    {d.growth_rate > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                                                    {Math.abs(d.growth_rate)}%
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-5 text-xs text-slate-500 dark:text-slate-400 font-mono font-bold tracking-tight uppercase">{d.intent}</td>
                                                            <td className="px-8 py-5">
                                                                {d.is_new ? (
                                                                    <span className="px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">NEW</span>
                                                                ) : (
                                                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Recurring</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'questions' && (
                                    <div className="divide-y divide-slate-100 dark:divide-[#1E293B] h-full max-h-[500px] overflow-y-auto">
                                        {topQuestions.length === 0 ? (
                                            <div className="p-12 text-center text-slate-400 font-medium">No top questions data yet</div>
                                        ) : (
                                            topQuestions.map((q, i) => (
                                                <div key={i} className="px-8 py-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                                                    <div className="flex items-center justify-between gap-6">
                                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                                            <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1E293B] flex items-center justify-center text-xs font-black text-slate-500 shrink-0">
                                                                {i + 1}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate pr-4">{q.normalized_text}</p>
                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">{q.top_intent}</span>
                                                                    <div className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${q.success_rate > 80 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'}`}>
                                                                        {q.success_rate.toFixed(0)}% Success
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{q.count}</p>
                                                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">requests</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                    </div>

                    {/* RIGHT COLUMN: 1/3 Width */}
                    <div className="space-y-8 h-full">

                        {/* SYSTEM PERFORMANCE (Right Top) */}
                        <section className="relative group bg-white dark:bg-[#0B1121] rounded-[24px] border border-slate-200 dark:border-white/[0.06] shadow-md dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:shadow-2xl dark:hover:border-white/[0.12] h-full flex flex-col">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/5 via-transparent to-[#0D9488]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between relative z-10 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-[#111827] rounded-[16px] flex items-center justify-center shadow-sm border border-teal-500/20">
                                        <Activity className="w-6 h-6 text-[#14B8A6]" />
                                    </div>
                                    <h2 className="font-bold text-xl text-slate-900 dark:text-white">System Health</h2>
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    <span className="text-[10px] font-black text-emerald-500 tracking-widest">ONLINE</span>
                                </div>
                            </div>
                            <div className="p-6 grid grid-cols-2 gap-4 relative z-10 flex-1 content-start">
                                <div className="p-5 rounded-[20px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] hover:shadow-lg dark:hover:shadow-black/20 hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:-translate-y-0.5 group/card">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-90 group-hover/card:text-[#14B8A6] transition-colors">Avg Latency</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {performanceMetrics?.avg_latency_ms?.toFixed(0) || 0}<span className="text-sm font-medium text-slate-400 ml-1">ms</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-[20px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] hover:shadow-lg dark:hover:shadow-black/20 hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:-translate-y-0.5 group/card">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-90 group-hover/card:text-[#14B8A6] transition-colors">P95 Latency</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {performanceMetrics?.p95_latency_ms?.toFixed(0) || 0}<span className="text-sm font-medium text-slate-400 ml-1">ms</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-[20px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] hover:shadow-lg dark:hover:shadow-black/20 hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:-translate-y-0.5 group/card">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-90 group-hover/card:text-[#14B8A6] transition-colors">Throughput</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {((healthKPIs?.total_messages || 0) / (30 * 24)).toFixed(1)}<span className="text-xs font-bold text-slate-400 ml-1">MSG/HR</span>
                                    </p>
                                </div>
                                <div className="p-5 rounded-[20px] bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04] hover:shadow-lg dark:hover:shadow-black/20 hover:border-[#14B8A6]/30 dark:hover:border-[#14B8A6]/30 transition-all hover:-translate-y-0.5 group/card">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 opacity-90 group-hover/card:text-[#14B8A6] transition-colors">Error Rate</p>
                                    <p className={`text-3xl font-black tracking-tight ${(performanceMetrics?.error_rate ?? 0) > 1 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {performanceMetrics?.error_rate || 0}<span className="text-sm font-medium text-slate-400 ml-1 opacity-70">%</span>
                                    </p>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>

                {/* 6. USER FEEDBACK REPORTS (Full Width) */}"""


pattern = target_start + r'.*?' + target_end
new_content = re.sub(pattern, new_content_grid, content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(new_content)

print("Replacement successful.")

