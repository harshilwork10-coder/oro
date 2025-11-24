'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export default function SameStoreSalesPage() {
    // Mock data
    const sssData = [
        { id: 1, location: "Aura Downtown", currentSales: 45000, prevSales: 41000, growth: 9.7, trend: "UP" },
        { id: 2, location: "Aura Westside", currentSales: 38500, prevSales: 39000, growth: -1.3, trend: "DOWN" },
        { id: 3, location: "Aura North Hills", currentSales: 52100, prevSales: 48000, growth: 8.5, trend: "UP" },
        { id: 4, location: "Aura East", currentSales: 29800, prevSales: 29500, growth: 1.0, trend: "FLAT" },
        { id: 5, location: "Aura South", currentSales: 41200, prevSales: 36000, growth: 14.4, trend: "UP" },
        { id: 6, location: "Aura Uptown", currentSales: 33000, prevSales: 35000, growth: -5.7, trend: "DOWN" },
    ]

    const avgGrowth = sssData.reduce((sum, item) => sum + item.growth, 0) / sssData.length

    return (
        <ReportPageLayout
            title="Same-Store Sales Growth"
            description="Analyze organic growth by comparing current sales to prior periods for established locations."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Network Avg Growth</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">+{avgGrowth.toFixed(1)}%</span>
                        <span className="text-xs text-stone-500">vs. Last Month</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Top Performer</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Aura South</span>
                        <span className="text-sm font-bold text-emerald-400">+14.4%</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Lowest Performer</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Aura Uptown</span>
                        <span className="text-sm font-bold text-red-400">-5.7%</span>
                    </div>
                </div>
            </div>

            {/* Heat Map Visualization (Mock) */}
            <div className="glass-panel rounded-xl p-6">
                <h3 className="font-semibold text-stone-100 mb-4">Growth Heat Map</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {sssData.map((item) => (
                        <div
                            key={item.id}
                            className={`p-4 rounded-lg border flex flex-col items-center justify-center text-center
                                ${item.growth > 5 ? 'bg-emerald-500/10 border-emerald-500/30' :
                                    item.growth > 0 ? 'bg-emerald-500/5 border-emerald-500/10' :
                                        item.growth > -2 ? 'bg-amber-500/10 border-amber-500/30' :
                                            'bg-red-500/10 border-red-500/30'}`}
                        >
                            <span className="text-xs font-medium text-stone-400 mb-1 truncate w-full">{item.location}</span>
                            <span className={`text-xl font-bold 
                                ${item.growth > 0 ? 'text-emerald-400' : item.growth < 0 ? 'text-red-400' : 'text-stone-300'}`}>
                                {item.growth > 0 ? '+' : ''}{item.growth}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800">
                    <h3 className="font-semibold text-stone-100">Detailed Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Current Period</th>
                                <th className="px-6 py-3 text-right">Prior Period</th>
                                <th className="px-6 py-3 text-right">Variance ($)</th>
                                <th className="px-6 py-3 text-right">Growth %</th>
                                <th className="px-6 py-3 text-center">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {sssData.map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">${item.currentSales.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">${item.prevSales.toLocaleString()}</td>
                                    <td className={`px-6 py-4 text-right font-medium ${item.currentSales - item.prevSales > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {item.currentSales - item.prevSales > 0 ? '+' : ''}${(item.currentSales - item.prevSales).toLocaleString()}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${item.growth > 0 ? 'text-emerald-400' : item.growth < 0 ? 'text-red-400' : 'text-stone-400'}`}>
                                        {item.growth > 0 ? '+' : ''}{item.growth}%
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.trend === 'UP' && <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto" />}
                                        {item.trend === 'DOWN' && <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />}
                                        {item.trend === 'FLAT' && <Minus className="w-4 h-4 text-stone-500 mx-auto" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
