'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { Users, TrendingUp, Award } from "lucide-react"

export default function FranchiseePerformancePage() {
    // Mock data
    const franchiseeData = [
        { id: 1, name: "John Smith", locations: 3, totalRevenue: 150000, avgMargin: 22.5, growth: 12.4, status: "EXPANDING" },
        { id: 2, name: "Sarah Johnson", locations: 5, totalRevenue: 280000, avgMargin: 19.8, growth: 8.2, status: "STABLE" },
        { id: 3, name: "Mike Brown", locations: 2, totalRevenue: 95000, avgMargin: 24.1, growth: 15.6, status: "TOP PERFORMER" },
        { id: 4, name: "Emily Davis", locations: 1, totalRevenue: 38000, avgMargin: 17.9, growth: 2.1, status: "NEEDS SUPPORT" },
    ]

    return (
        <ReportPageLayout
            title="Franchisee Performance"
            description="Evaluate franchisee portfolio performance to identify expansion candidates and support needs."
        >
            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Franchisee Portfolio Summary</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Franchisee</th>
                                <th className="px-6 py-3 text-center">Locations</th>
                                <th className="px-6 py-3 text-right">Total Revenue</th>
                                <th className="px-6 py-3 text-right">Avg Margin</th>
                                <th className="px-6 py-3 text-right">Growth Rate</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {franchiseeData.sort((a, b) => b.totalRevenue - a.totalRevenue).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.name}</td>
                                    <td className="px-6 py-4 text-center">{item.locations}</td>
                                    <td className="px-6 py-4 text-right">${item.totalRevenue.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{item.avgMargin}%</td>
                                    <td className="px-6 py-4 text-right text-emerald-400">+{item.growth}%</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold
                                            ${item.status === 'TOP PERFORMER' ? 'bg-purple-500/10 text-purple-400' :
                                                item.status === 'EXPANDING' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    item.status === 'STABLE' ? 'bg-blue-500/10 text-blue-400' :
                                                        'bg-amber-500/10 text-amber-400'}`}>
                                            {item.status}
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
