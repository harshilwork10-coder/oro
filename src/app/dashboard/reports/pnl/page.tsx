'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { DollarSign, TrendingUp, TrendingDown, PieChart } from "lucide-react"

export default function PnLReportPage() {
    // Mock data
    const pnlData = [
        { id: 1, location: "Aura Downtown", revenue: 45000, cogs: 12600, labor: 13500, rent: 4500, marketing: 2250, other: 1500, netProfit: 10650, margin: 23.6 },
        { id: 2, location: "Aura Westside", revenue: 38500, cogs: 11550, labor: 12320, rent: 4000, marketing: 1925, other: 1200, netProfit: 7505, margin: 19.5 },
        { id: 3, location: "Aura North Hills", revenue: 52100, cogs: 14588, labor: 15109, rent: 5000, marketing: 2605, other: 1800, netProfit: 12998, margin: 24.9 },
        { id: 4, location: "Aura East", revenue: 29800, cogs: 8940, labor: 9536, rent: 3500, marketing: 1490, other: 1000, netProfit: 5334, margin: 17.9 },
        { id: 5, location: "Aura South", revenue: 41200, cogs: 11536, labor: 11948, rent: 4200, marketing: 2060, other: 1400, netProfit: 10056, margin: 24.4 },
    ]

    const totalRevenue = pnlData.reduce((sum, item) => sum + item.revenue, 0)
    const totalProfit = pnlData.reduce((sum, item) => sum + item.netProfit, 0)
    const avgMargin = (totalProfit / totalRevenue) * 100

    return (
        <ReportPageLayout
            title="Profit & Loss by Location"
            description="Detailed breakdown of revenue, expenses, and net profit margins for each location."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Total Network Profit</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">${totalProfit.toLocaleString()}</span>
                        <span className="text-xs font-medium text-emerald-400 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +5.2%
                        </span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Avg Profit Margin</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">{avgMargin.toFixed(1)}%</span>
                        <span className="text-xs text-stone-500">Target: 20%</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-amber-500">
                    <p className="text-sm text-stone-500 mb-1">Highest Expense</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Labor</span>
                        <span className="text-sm text-amber-400">31% of Rev</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Monthly P&L Statement</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Revenue</th>
                                <th className="px-6 py-3 text-right">COGS</th>
                                <th className="px-6 py-3 text-right">Labor</th>
                                <th className="px-6 py-3 text-right">Rent/Fixed</th>
                                <th className="px-6 py-3 text-right">Net Profit</th>
                                <th className="px-6 py-3 text-right">Margin %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {pnlData.map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right text-stone-100">${item.revenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-red-300">-${item.cogs.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-red-300">-${item.labor.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-red-300">-${(item.rent + item.marketing + item.other).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-emerald-400">${item.netProfit.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.margin >= 20 ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.margin >= 10 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                            {item.margin.toFixed(1)}%
                                        </span>
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
