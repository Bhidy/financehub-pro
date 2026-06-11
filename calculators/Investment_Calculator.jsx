**import React, { useState, useEffect, useMemo } from 'react';**

**import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";**

**import { Input } from "@/components/ui/input";**

**import { Label } from "@/components/ui/label";**

**import { Slider } from "@/components/ui/slider";**

**import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";**

**import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';**

**import { TrendingUp, DollarSign, Calendar, PieChart as PieChartIcon, Info } from 'lucide-react';**

**import { motion } from 'framer-motion';**



**// Monte Carlo simulation helper**

**const runMonteCarloSimulation = (initial, monthly, years, avgReturn, volatility, iterations = 1000) => {**

&#x20; **const results = \[];**

&#x20; 

&#x20; **for (let i = 0; i < iterations; i++) {**

&#x20;   **let portfolio = initial;**

&#x20;   **const yearlyValues = \[initial];**

&#x20;   

&#x20;   **for (let year = 1; year <= years; year++) {**

&#x20;     **const randomReturn = (Math.random() - 0.5) \* 2 \* volatility + avgReturn;**

&#x20;     **portfolio = portfolio \* (1 + randomReturn / 100) + (monthly \* 12);**

&#x20;     **yearlyValues.push(portfolio);**

&#x20;   **}**

&#x20;   

&#x20;   **results.push(yearlyValues\[yearlyValues.length - 1]);**

&#x20; **}**

&#x20; 

&#x20; **results.sort((a, b) => a - b);**

&#x20; **return {**

&#x20;   **worst: results\[Math.floor(iterations \* 0.1)],**

&#x20;   **average: results\[Math.floor(iterations \* 0.5)],**

&#x20;   **best: results\[Math.floor(iterations \* 0.9)]**

&#x20; **};**

**};**



**// Calculate compound growth**

**const calculateGrowth = (initial, monthly, years, annualReturn) => {**

&#x20; **const data = \[];**

&#x20; **let totalInvested = initial;**

&#x20; **let portfolioValue = initial;**

&#x20; 

&#x20; **for (let year = 0; year <= years; year++) {**

&#x20;   **if (year > 0) {**

&#x20;     **portfolioValue = portfolioValue \* (1 + annualReturn / 100) + (monthly \* 12);**

&#x20;     **totalInvested += monthly \* 12;**

&#x20;   **}**

&#x20;   

&#x20;   **data.push({**

&#x20;     **year,**

&#x20;     **portfolio: Math.round(portfolioValue),**

&#x20;     **invested: Math.round(totalInvested),**

&#x20;     **gains: Math.round(portfolioValue - totalInvested)**

&#x20;   **});**

&#x20; **}**

&#x20; 

&#x20; **return data;**

**};**



**export default function Simulator() {**

&#x20; **const \[initialAmount, setInitialAmount] = useState(100000);**

&#x20; **const \[monthlyContribution, setMonthlyContribution] = useState(5000);**

&#x20; **const \[timeHorizon, setTimeHorizon] = useState(10);**

&#x20; **const \[expectedReturn, setExpectedReturn] = useState(12);**

&#x20; **const \[volatility, setVolatility] = useState(15);**

&#x20; **const \[riskProfile, setRiskProfile] = useState('moderate');**



&#x20; **// Risk profile presets**

&#x20; **const riskProfiles = {**

&#x20;   **conservative: { return: 8, volatility: 10, equity: 30, fixed: 60, gold: 10 },**

&#x20;   **moderate: { return: 12, volatility: 15, equity: 50, fixed: 45, gold: 5 },**

&#x20;   **aggressive: { return: 16, volatility: 25, equity: 80, fixed: 15, gold: 5 }**

&#x20; **};**



&#x20; **// Update params when risk profile changes**

&#x20; **useEffect(() => {**

&#x20;   **const profile = riskProfiles\[riskProfile];**

&#x20;   **setExpectedReturn(profile.return);**

&#x20;   **setVolatility(profile.volatility);**

&#x20; **}, \[riskProfile]);**



&#x20; **// Calculate projections**

&#x20; **const projectionData = useMemo(() => {**

&#x20;   **return calculateGrowth(initialAmount, monthlyContribution, timeHorizon, expectedReturn);**

&#x20; **}, \[initialAmount, monthlyContribution, timeHorizon, expectedReturn]);**



&#x20; **const scenarios = useMemo(() => {**

&#x20;   **return runMonteCarloSimulation(initialAmount, monthlyContribution, timeHorizon, expectedReturn, volatility, 500);**

&#x20; **}, \[initialAmount, monthlyContribution, timeHorizon, expectedReturn, volatility]);**



&#x20; **// Final values**

&#x20; **const finalData = projectionData\[projectionData.length - 1];**

&#x20; **const totalInvested = finalData.invested;**

&#x20; **const finalValue = finalData.portfolio;**

&#x20; **const totalGains = finalData.gains;**

&#x20; **const returnPercent = ((finalValue - totalInvested) / totalInvested \* 100).toFixed(1);**



&#x20; **// Allocation data**

&#x20; **const allocationData = \[**

&#x20;   **{ name: 'Equity', value: riskProfiles\[riskProfile].equity, fill: '#10b981' },**

&#x20;   **{ name: 'Fixed Income', value: riskProfiles\[riskProfile].fixed, fill: '#3b82f6' },**

&#x20;   **{ name: 'Gold', value: riskProfiles\[riskProfile].gold, fill: '#f59e0b' }**

&#x20; **];**



&#x20; **// Scenario comparison data**

&#x20; **const scenarioData = \[**

&#x20;   **{ scenario: 'Pessimistic (10th %)', value: Math.round(scenarios.worst) },**

&#x20;   **{ scenario: 'Expected (50th %)', value: Math.round(scenarios.average) },**

&#x20;   **{ scenario: 'Optimistic (90th %)', value: Math.round(scenarios.best) }**

&#x20; **];**



&#x20; **return (**

&#x20;   **<div className="max-w-7xl mx-auto space-y-6">**

&#x20;     **<div>**

&#x20;       **<h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Simulator</h1>**

&#x20;       **<p className="text-gray-600">Model your investment growth with different scenarios and risk profiles</p>**

&#x20;     **</div>**



&#x20;     **<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">**

&#x20;       **{/\* Input Parameters \*/}**

&#x20;       **<Card className="lg:col-span-1">**

&#x20;         **<CardHeader>**

&#x20;           **<CardTitle className="flex items-center gap-2">**

&#x20;             **<Info className="w-5 h-5 text-emerald-600" />**

&#x20;             **Parameters**

&#x20;           **</CardTitle>**

&#x20;         **</CardHeader>**

&#x20;         **<CardContent className="space-y-6">**

&#x20;           **{/\* Risk Profile Selection \*/}**

&#x20;           **<div>**

&#x20;             **<Label className="mb-3 block">Risk Profile</Label>**

&#x20;             **<div className="grid grid-cols-1 gap-2">**

&#x20;               **{\['conservative', 'moderate', 'aggressive'].map((profile) => (**

&#x20;                 **<button**

&#x20;                   **key={profile}**

&#x20;                   **onClick={() => setRiskProfile(profile)}**

&#x20;                   **className={`p-3 rounded-lg border-2 transition-all text-left ${**

&#x20;                     **riskProfile === profile**

&#x20;                       **? 'border-emerald-500 bg-emerald-50'**

&#x20;                       **: 'border-gray-200 hover:border-gray-300'**

&#x20;                   **}`}**

&#x20;                 **>**

&#x20;                   **<div className="font-semibold capitalize">{profile}</div>**

&#x20;                   **<div className="text-xs text-gray-500">**

&#x20;                     **{riskProfiles\[profile].return}% return, {riskProfiles\[profile].equity}% equity**

&#x20;                   **</div>**

&#x20;                 **</button>**

&#x20;               **))}**

&#x20;             **</div>**

&#x20;           **</div>**



&#x20;           **{/\* Initial Amount \*/}**

&#x20;           **<div>**

&#x20;             **<Label>Initial Investment</Label>**

&#x20;             **<div className="flex items-center gap-3 mt-2">**

&#x20;               **<Input**

&#x20;                 **type="number"**

&#x20;                 **value={initialAmount}**

&#x20;                 **onChange={(e) => setInitialAmount(Number(e.target.value))}**

&#x20;                 **className="w-32"**

&#x20;               **/>**

&#x20;               **<span className="text-sm text-gray-500">EGP</span>**

&#x20;             **</div>**

&#x20;             **<Slider**

&#x20;               **value={\[initialAmount]}**

&#x20;               **onValueChange={(\[val]) => setInitialAmount(val)}**

&#x20;               **min={10000}**

&#x20;               **max={1000000}**

&#x20;               **step={10000}**

&#x20;               **className="mt-3"**

&#x20;             **/>**

&#x20;           **</div>**



&#x20;           **{/\* Monthly Contribution \*/}**

&#x20;           **<div>**

&#x20;             **<Label>Monthly Contribution</Label>**

&#x20;             **<div className="flex items-center gap-3 mt-2">**

&#x20;               **<Input**

&#x20;                 **type="number"**

&#x20;                 **value={monthlyContribution}**

&#x20;                 **onChange={(e) => setMonthlyContribution(Number(e.target.value))}**

&#x20;                 **className="w-32"**

&#x20;               **/>**

&#x20;               **<span className="text-sm text-gray-500">EGP/month</span>**

&#x20;             **</div>**

&#x20;             **<Slider**

&#x20;               **value={\[monthlyContribution]}**

&#x20;               **onValueChange={(\[val]) => setMonthlyContribution(val)}**

&#x20;               **min={0}**

&#x20;               **max={20000}**

&#x20;               **step={500}**

&#x20;               **className="mt-3"**

&#x20;             **/>**

&#x20;           **</div>**



&#x20;           **{/\* Time Horizon \*/}**

&#x20;           **<div>**

&#x20;             **<Label>Time Horizon</Label>**

&#x20;             **<div className="flex items-center gap-3 mt-2">**

&#x20;               **<Input**

&#x20;                 **type="number"**

&#x20;                 **value={timeHorizon}**

&#x20;                 **onChange={(e) => setTimeHorizon(Number(e.target.value))}**

&#x20;                 **className="w-32"**

&#x20;               **/>**

&#x20;               **<span className="text-sm text-gray-500">years</span>**

&#x20;             **</div>**

&#x20;             **<Slider**

&#x20;               **value={\[timeHorizon]}**

&#x20;               **onValueChange={(\[val]) => setTimeHorizon(val)}**

&#x20;               **min={1}**

&#x20;               **max={30}**

&#x20;               **step={1}**

&#x20;               **className="mt-3"**

&#x20;             **/>**

&#x20;           **</div>**



&#x20;           **{/\* Expected Return \*/}**

&#x20;           **<div>**

&#x20;             **<Label>Expected Annual Return</Label>**

&#x20;             **<div className="flex items-center gap-3 mt-2">**

&#x20;               **<Input**

&#x20;                 **type="number"**

&#x20;                 **value={expectedReturn}**

&#x20;                 **onChange={(e) => setExpectedReturn(Number(e.target.value))}**

&#x20;                 **className="w-32"**

&#x20;               **/>**

&#x20;               **<span className="text-sm text-gray-500">%</span>**

&#x20;             **</div>**

&#x20;             **<Slider**

&#x20;               **value={\[expectedReturn]}**

&#x20;               **onValueChange={(\[val]) => setExpectedReturn(val)}**

&#x20;               **min={3}**

&#x20;               **max={25}**

&#x20;               **step={0.5}**

&#x20;               **className="mt-3"**

&#x20;             **/>**

&#x20;           **</div>**



&#x20;           **{/\* Volatility \*/}**

&#x20;           **<div>**

&#x20;             **<Label>Volatility (Risk)</Label>**

&#x20;             **<div className="flex items-center gap-3 mt-2">**

&#x20;               **<Input**

&#x20;                 **type="number"**

&#x20;                 **value={volatility}**

&#x20;                 **onChange={(e) => setVolatility(Number(e.target.value))}**

&#x20;                 **className="w-32"**

&#x20;               **/>**

&#x20;               **<span className="text-sm text-gray-500">%</span>**

&#x20;             **</div>**

&#x20;             **<Slider**

&#x20;               **value={\[volatility]}**

&#x20;               **onValueChange={(\[val]) => setVolatility(val)}**

&#x20;               **min={5}**

&#x20;               **max={40}**

&#x20;               **step={1}**

&#x20;               **className="mt-3"**

&#x20;             **/>**

&#x20;           **</div>**

&#x20;         **</CardContent>**

&#x20;       **</Card>**



&#x20;       **{/\* Results \& Charts \*/}**

&#x20;       **<div className="lg:col-span-2 space-y-6">**

&#x20;         **{/\* Summary Cards \*/}**

&#x20;         **<div className="grid grid-cols-1 md:grid-cols-3 gap-4">**

&#x20;           **<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>**

&#x20;             **<Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">**

&#x20;               **<CardContent className="pt-6">**

&#x20;                 **<div className="flex items-center justify-between mb-2">**

&#x20;                   **<div className="text-sm text-gray-600">Final Portfolio Value</div>**

&#x20;                   **<TrendingUp className="w-5 h-5 text-emerald-600" />**

&#x20;                 **</div>**

&#x20;                 **<div className="text-2xl font-bold text-emerald-700">**

&#x20;                   **{finalValue.toLocaleString()} EGP**

&#x20;                 **</div>**

&#x20;                 **<div className="text-xs text-emerald-600 mt-1">+{returnPercent}% return</div>**

&#x20;               **</CardContent>**

&#x20;             **</Card>**

&#x20;           **</motion.div>**



&#x20;           **<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>**

&#x20;             **<Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">**

&#x20;               **<CardContent className="pt-6">**

&#x20;                 **<div className="flex items-center justify-between mb-2">**

&#x20;                   **<div className="text-sm text-gray-600">Total Invested</div>**

&#x20;                   **<DollarSign className="w-5 h-5 text-blue-600" />**

&#x20;                 **</div>**

&#x20;                 **<div className="text-2xl font-bold text-blue-700">**

&#x20;                   **{totalInvested.toLocaleString()} EGP**

&#x20;                 **</div>**

&#x20;                 **<div className="text-xs text-blue-600 mt-1">Over {timeHorizon} years</div>**

&#x20;               **</CardContent>**

&#x20;             **</Card>**

&#x20;           **</motion.div>**



&#x20;           **<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>**

&#x20;             **<Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">**

&#x20;               **<CardContent className="pt-6">**

&#x20;                 **<div className="flex items-center justify-between mb-2">**

&#x20;                   **<div className="text-sm text-gray-600">Investment Gains</div>**

&#x20;                   **<Calendar className="w-5 h-5 text-purple-600" />**

&#x20;                 **</div>**

&#x20;                 **<div className="text-2xl font-bold text-purple-700">**

&#x20;                   **{totalGains.toLocaleString()} EGP**

&#x20;                 **</div>**

&#x20;                 **<div className="text-xs text-purple-600 mt-1">Profit from growth</div>**

&#x20;               **</CardContent>**

&#x20;             **</Card>**

&#x20;           **</motion.div>**

&#x20;         **</div>**



&#x20;         **{/\* Tabs for different views \*/}**

&#x20;         **<Tabs defaultValue="projection" className="w-full">**

&#x20;           **<TabsList className="grid w-full grid-cols-3">**

&#x20;             **<TabsTrigger value="projection">Growth Projection</TabsTrigger>**

&#x20;             **<TabsTrigger value="scenarios">Scenarios</TabsTrigger>**

&#x20;             **<TabsTrigger value="allocation">Asset Allocation</TabsTrigger>**

&#x20;           **</TabsList>**



&#x20;           **<TabsContent value="projection" className="mt-4">**

&#x20;             **<Card>**

&#x20;               **<CardHeader>**

&#x20;                 **<CardTitle>Portfolio Growth Over Time</CardTitle>**

&#x20;               **</CardHeader>**

&#x20;               **<CardContent>**

&#x20;                 **<ResponsiveContainer width="100%" height={400}>**

&#x20;                   **<AreaChart data={projectionData}>**

&#x20;                     **<CartesianGrid strokeDasharray="3 3" />**

&#x20;                     **<XAxis dataKey="year" label={{ value: 'Years', position: 'insideBottom', offset: -5 }} />**

&#x20;                     **<YAxis label={{ value: 'Value (EGP)', angle: -90, position: 'insideLeft' }} />**

&#x20;                     **<Tooltip formatter={(value) => `${Number(value).toLocaleString()} EGP`} />**

&#x20;                     **<Legend />**

&#x20;                     **<Area type="monotone" dataKey="portfolio" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Portfolio Value" />**

&#x20;                     **<Area type="monotone" dataKey="invested" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} name="Total Invested" />**

&#x20;                   **</AreaChart>**

&#x20;                 **</ResponsiveContainer>**

&#x20;               **</CardContent>**

&#x20;             **</Card>**

&#x20;           **</TabsContent>**



&#x20;           **<TabsContent value="scenarios" className="mt-4">**

&#x20;             **<Card>**

&#x20;               **<CardHeader>**

&#x20;                 **<CardTitle>Monte Carlo Simulation (500 iterations)</CardTitle>**

&#x20;                 **<p className="text-sm text-gray-500">Based on {volatility}% volatility, showing 10th, 50th, and 90th percentile outcomes</p>**

&#x20;               **</CardHeader>**

&#x20;               **<CardContent>**

&#x20;                 **<ResponsiveContainer width="100%" height={400}>**

&#x20;                   **<BarChart data={scenarioData}>**

&#x20;                     **<CartesianGrid strokeDasharray="3 3" />**

&#x20;                     **<XAxis dataKey="scenario" />**

&#x20;                     **<YAxis label={{ value: 'Final Value (EGP)', angle: -90, position: 'insideLeft' }} />**

&#x20;                     **<Tooltip formatter={(value) => `${Number(value).toLocaleString()} EGP`} />**

&#x20;                     **<Bar dataKey="value" fill="#8b5cf6" radius={\[8, 8, 0, 0]} />**

&#x20;                   **</BarChart>**

&#x20;                 **</ResponsiveContainer>**

&#x20;                 **<div className="mt-6 grid grid-cols-3 gap-4">**

&#x20;                   **<div className="text-center p-4 bg-red-50 rounded-lg">**

&#x20;                     **<div className="text-xs text-gray-600 mb-1">Worst Case (10%)</div>**

&#x20;                     **<div className="text-lg font-bold text-red-700">{scenarios.worst.toLocaleString()}</div>**

&#x20;                   **</div>**

&#x20;                   **<div className="text-center p-4 bg-blue-50 rounded-lg">**

&#x20;                     **<div className="text-xs text-gray-600 mb-1">Expected (50%)</div>**

&#x20;                     **<div className="text-lg font-bold text-blue-700">{scenarios.average.toLocaleString()}</div>**

&#x20;                   **</div>**

&#x20;                   **<div className="text-center p-4 bg-green-50 rounded-lg">**

&#x20;                     **<div className="text-xs text-gray-600 mb-1">Best Case (90%)</div>**

&#x20;                     **<div className="text-lg font-bold text-green-700">{scenarios.best.toLocaleString()}</div>**

&#x20;                   **</div>**

&#x20;                 **</div>**

&#x20;               **</CardContent>**

&#x20;             **</Card>**

&#x20;           **</TabsContent>**



&#x20;           **<TabsContent value="allocation" className="mt-4">**

&#x20;             **<Card>**

&#x20;               **<CardHeader>**

&#x20;                 **<CardTitle>Suggested Asset Allocation - {riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} Profile</CardTitle>**

&#x20;               **</CardHeader>**

&#x20;               **<CardContent>**

&#x20;                 **<div className="grid grid-cols-1 md:grid-cols-2 gap-6">**

&#x20;                   **<ResponsiveContainer width="100%" height={300}>**

&#x20;                     **<PieChart>**

&#x20;                       **<Pie**

&#x20;                         **data={allocationData}**

&#x20;                         **cx="50%"**

&#x20;                         **cy="50%"**

&#x20;                         **labelLine={false}**

&#x20;                         **label={({ name, value }) => `${name}: ${value}%`}**

&#x20;                         **outerRadius={100}**

&#x20;                         **dataKey="value"**

&#x20;                       **>**

&#x20;                         **{allocationData.map((entry, index) => (**

&#x20;                           **<Cell key={`cell-${index}`} fill={entry.fill} />**

&#x20;                         **))}**

&#x20;                       **</Pie>**

&#x20;                       **<Tooltip />**

&#x20;                     **</PieChart>**

&#x20;                   **</ResponsiveContainer>**

&#x20;                   **<div className="space-y-4">**

&#x20;                     **<div className="p-4 bg-green-50 rounded-lg border border-green-200">**

&#x20;                       **<div className="flex items-center justify-between mb-2">**

&#x20;                         **<span className="font-semibold text-green-800">Equity</span>**

&#x20;                         **<span className="text-2xl font-bold text-green-700">{riskProfiles\[riskProfile].equity}%</span>**

&#x20;                       **</div>**

&#x20;                       **<p className="text-xs text-gray-600">Stocks and equity funds for growth</p>**

&#x20;                     **</div>**

&#x20;                     **<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">**

&#x20;                       **<div className="flex items-center justify-between mb-2">**

&#x20;                         **<span className="font-semibold text-blue-800">Fixed Income</span>**

&#x20;                         **<span className="text-2xl font-bold text-blue-700">{riskProfiles\[riskProfile].fixed}%</span>**

&#x20;                       **</div>**

&#x20;                       **<p className="text-xs text-gray-600">Bonds and T-bills for stability</p>**

&#x20;                     **</div>**

&#x20;                     **<div className="p-4 bg-amber-50 rounded-lg border border-amber-200">**

&#x20;                       **<div className="flex items-center justify-between mb-2">**

&#x20;                         **<span className="font-semibold text-amber-800">Gold</span>**

&#x20;                         **<span className="text-2xl font-bold text-amber-700">{riskProfiles\[riskProfile].gold}%</span>**

&#x20;                       **</div>**

&#x20;                       **<p className="text-xs text-gray-600">Inflation hedge and diversification</p>**

&#x20;                     **</div>**

&#x20;                   **</div>**

&#x20;                 **</div>**

&#x20;               **</CardContent>**

&#x20;             **</Card>**

&#x20;           **</TabsContent>**

&#x20;         **</Tabs>**

&#x20;       **</div>**

&#x20;     **</div>**

&#x20;   **</div>**

&#x20; **);**

**}**

