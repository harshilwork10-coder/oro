'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"

export default function RevenueReportPage() {
    // Mock data
    const revenueData = [
        { id: 1, location: "Aura Downtown", daily: 2100, weekly: 15400, monthly: 68000, ytd: 750000, trend: "UP", percent: 18 },
        { id: 2, location: "Aura Westside", daily: 1800, weekly: 13200, monthly: 56000, ytd: 620000, trend: "DOWN", percent: 15 },
        { id: 3, location: "Aura North Hills", daily: 2400, weekly: 17500, monthly: 72000, ytd: 810000, trend: "UP", percent: 19 },
        { id: 4, location: "Aura East", daily: 1200, weekly: 8900, monthly: 38000, ytd: 410000, trend: "FLAT", percent: 10 },
        { id: 5, location: "Aura South", daily: 1900, weekly: 14100, monthly: 61000, ytd: 680000, trend: "UP", percent: 16 },
        { id: 6, location: "Aura Uptown", daily: 1500, weekly: 10800, monthly: 45000, ytd: 490000, trend: "DOWN", percent: 12 },
    ]

    return (
        <ReportPageLayout
            title="Revenue by Location"
            description="Compare sales performance across all locations with daily, weekly, and monthly breakdowns."
        >
            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Revenue Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Daily (Yesterday)</th>
                                <th className="px-6 py-3 text-right">This Week</th>
                                <th className="px-6 py-3 text-right">This Month</th>
                                <th className="px-6 py-3 text-right">YTD</th>
                                <th className="px-6 py-3 text-center">Trend</th>
                                <th className="px-6 py-3 text-right">% of Network</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {revenueData.sort((a, b) => b.monthly - a.monthly).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">${item.daily.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">${item.weekly.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-stone-100">${item.monthly.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">${item.ytd.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        {item.trend === 'UP' && <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto" />}
                                        {item.trend === 'DOWN' && <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />}
                                        {item.trend === 'FLAT' && <span className="text-stone-500">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">{item.percent}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
