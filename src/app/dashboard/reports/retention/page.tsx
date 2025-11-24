'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Users, UserMinus, UserPlus } from "lucide-react"

export default function RetentionReportPage() {
    // Mock data
    const retentionData = [
        { id: 1, location: "Aura Downtown", newCustomers: 120, repeatRate: 65, churnRate: 5.2, clv: 450 },
        { id: 2, location: "Aura Westside", newCustomers: 95, repeatRate: 58, churnRate: 6.8, clv: 380 },
        { id: 3, location: "Aura North Hills", newCustomers: 140, repeatRate: 72, churnRate: 3.5, clv: 520 },
        { id: 4, location: "Aura East", newCustomers: 60, repeatRate: 45, churnRate: 12.4, clv: 290 },
        { id: 5, location: "Aura South", newCustomers: 110, repeatRate: 62, churnRate: 5.8, clv: 410 },
    ]

    return (
        <ReportPageLayout
            title="Customer Retention"
            description="Monitor customer loyalty, churn rates, and lifetime value across locations."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Avg Repeat Rate</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">60.4%</span>
                        <span className="text-xs font-medium text-emerald-400">Healthy</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Avg CLV</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$410</span>
                        <span className="text-xs text-stone-500">Lifetime Value</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">High Churn Alert</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">Aura East</span>
                        <span className="text-sm font-bold text-red-400">12.4%</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Retention Metrics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">New Customers</th>
                                <th className="px-6 py-3 text-right">Repeat Rate</th>
                                <th className="px-6 py-3 text-right">Churn Rate</th>
                                <th className="px-6 py-3 text-right">CLV ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {retentionData.sort((a, b) => b.repeatRate - a.repeatRate).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">{item.newCustomers}</td>
                                    <td className="px-6 py-4 text-right font-bold text-stone-200">{item.repeatRate}%</td>
                                    <td className={`px-6 py-4 text-right ${item.churnRate > 10 ? 'text-red-400 font-bold' : 'text-stone-400'}`}>
                                        {item.churnRate}%
                                    </td>
                                    <td className="px-6 py-4 text-right">${item.clv}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
