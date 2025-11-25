'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Package, AlertTriangle, TrendingUp } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function COGSReportPage() {
    // Mock data
    const cogsData = [
        { id: 1, location: "Aura Downtown", revenue: 68000, cogs: 19500, cogsPercent: 28.6, waste: 2.1, turnover: 4.5 },
        { id: 2, location: "Aura Westside", revenue: 56000, cogs: 17200, cogsPercent: 30.7, waste: 3.5, turnover: 3.8 },
        { id: 3, location: "Aura North Hills", revenue: 72000, cogs: 20500, cogsPercent: 28.4, waste: 1.8, turnover: 4.8 },
        { id: 4, location: "Aura East", revenue: 38000, cogs: 12500, cogsPercent: 32.9, waste: 4.2, turnover: 3.2 },
        { id: 5, location: "Aura South", revenue: 61000, cogs: 18000, cogsPercent: 29.5, waste: 2.5, turnover: 4.1 },
    ]

    return (
        <ReportPageLayout
            title="COGS & Inventory"
            description="Track Cost of Goods Sold, food waste, and inventory turnover rates."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Network Avg COGS %</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">30.0%</span>
                        <span className="text-xs text-stone-500">Target: 28-32%</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">High Waste Alert</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Aura East</span>
                        <span className="text-sm font-bold text-red-400">4.2% Waste</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Best Turnover</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Aura North Hills</span>
                        <span className="text-sm font-bold text-emerald-400">4.8x</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Inventory Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Revenue</th>
                                <th className="px-6 py-3 text-right">COGS ($)</th>
                                <th className="px-6 py-3 text-right">COGS %</th>
                                <th className="px-6 py-3 text-right">Waste %</th>
                                <th className="px-6 py-3 text-right">Inventory Turnover</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {cogsData.sort((a, b) => a.cogsPercent - b.cogsPercent).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">${item.revenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-stone-300">${item.cogs.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.cogsPercent <= 30 ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.cogsPercent <= 32 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                            {item.cogsPercent}%
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium ${item.waste > 3 ? 'text-red-400' : 'text-stone-300'}`}>
                                        {item.waste}%
                                    </td>
                                    <td className="px-6 py-4 text-right">{item.turnover}x</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}

// Wrap with permission check - COGS is a financial report
export default function ProtectedCOGSReport() {
    return (
        <WithReportPermission reportType="financial">
            <COGSReportPage />
        </WithReportPermission>
    )
}
