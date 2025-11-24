'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Users, Clock, DollarSign } from "lucide-react"

export default function LaborReportPage() {
    // Mock data
    const laborData = [
        { id: 1, location: "Aura Downtown", sales: 68000, laborCost: 18500, laborPercent: 27.2, hours: 1250, salesPerHour: 54.40 },
        { id: 2, location: "Aura Westside", sales: 56000, laborCost: 16800, laborPercent: 30.0, hours: 1100, salesPerHour: 50.90 },
        { id: 3, location: "Aura North Hills", sales: 72000, laborCost: 19200, laborPercent: 26.6, hours: 1300, salesPerHour: 55.38 },
        { id: 4, location: "Aura East", sales: 38000, laborCost: 12500, laborPercent: 32.8, hours: 850, salesPerHour: 44.70 },
        { id: 5, location: "Aura South", sales: 61000, laborCost: 17000, laborPercent: 27.8, hours: 1150, salesPerHour: 53.04 },
    ]

    return (
        <ReportPageLayout
            title="Labor Efficiency"
            description="Analyze labor costs as a percentage of sales and productivity metrics."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Network Avg Labor %</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">28.9%</span>
                        <span className="text-xs text-stone-500">Target: &lt;30%</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Best Efficiency</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Aura North Hills</span>
                        <span className="text-sm font-bold text-emerald-400">26.6%</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Needs Improvement</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Aura East</span>
                        <span className="text-sm font-bold text-red-400">32.8%</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Labor Performance by Location</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Total Sales</th>
                                <th className="px-6 py-3 text-right">Labor Cost</th>
                                <th className="px-6 py-3 text-right">Labor %</th>
                                <th className="px-6 py-3 text-right">Total Hours</th>
                                <th className="px-6 py-3 text-right">Sales / Labor Hour</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {laborData.sort((a, b) => a.laborPercent - b.laborPercent).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">${item.sales.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-red-300">${item.laborCost.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.laborPercent <= 28 ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.laborPercent <= 31 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                            {item.laborPercent}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">{item.hours.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-medium text-stone-200">${item.salesPerHour.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
