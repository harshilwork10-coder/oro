'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { TrendingUp, Users, DollarSign } from "lucide-react"
import { WithReportPermission } from "@/components/reports/WithReportPermission"

function LaborReportPage() {
    const laborData = [
        { id: 1, location: "Aura Downtown", hours: 480, cost: 7200, revenue: 45000, laborPercent: 16.0, productivity: 93.75 },
        { id: 2, location: "Aura Westside", hours: 420, cost: 6300, revenue: 38500, laborPercent: 16.4, productivity: 91.67 },
        { id: 3, location: "Aura North Hills", hours: 520, cost: 7800, revenue: 52100, laborPercent: 15.0, productivity: 100.19 },
    ]

    return (
        <ReportPageLayout
            title="Labor Cost Analysis"
            description="Track labor hours, costs, and productivity across locations."
        >
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800">
                    <h3 className="font-semibold text-stone-100">Labor Metrics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Hours</th>
                                <th className="px-6 py-3 text-right">Labor Cost</th>
                                <th className="px-6 py-3 text-right">Revenue</th>
                                <th className="px-6 py-3 text-right">Labor %</th>
                                <th className="px-6 py-3 text-right">$/Hour</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {laborData.map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">{item.hours}</td>
                                    <td className="px-6 py-4 text-right">${item.cost.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">${item.revenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.laborPercent <= 16 ? 'bg-emerald-500/10 text-emerald-400' :
                                                item.laborPercent <= 18 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-red-500/10 text-red-400'}`}>
                                            {item.laborPercent.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">${item.productivity.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}

export default function ProtectedLaborReport() {
    return (
        <WithReportPermission reportType="operational">
            <LaborReportPage />
        </WithReportPermission>
    )
}
