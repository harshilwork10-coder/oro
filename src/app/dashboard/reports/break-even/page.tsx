'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"

export default function BreakEvenReportPage() {
    // Mock data
    const breakEvenData = [
        { id: 1, location: "Aura Downtown", fixedCosts: 18000, avgMargin: 23.6, breakEvenSales: 76271, currentSales: 45000, status: "BELOW" },
        { id: 2, location: "Aura Westside", fixedCosts: 16000, avgMargin: 19.5, breakEvenSales: 82051, currentSales: 38500, status: "BELOW" },
        { id: 3, location: "Aura North Hills", fixedCosts: 20000, avgMargin: 24.9, breakEvenSales: 80321, currentSales: 52100, status: "BELOW" },
        { id: 4, location: "Aura East", fixedCosts: 14000, avgMargin: 17.9, breakEvenSales: 78212, currentSales: 29800, status: "BELOW" },
        { id: 5, location: "Aura South", fixedCosts: 17000, avgMargin: 24.4, breakEvenSales: 69672, currentSales: 41200, status: "BELOW" },
    ]
    // Note: The mock calculation logic above is simplified. 
    // Real BEP = Fixed Costs / (Contribution Margin Ratio). 
    // If Margin is Net Profit Margin, it's different. Assuming Gross Margin for contribution.
    // Let's adjust mock data to be more realistic for "Profitable" locations.

    const realisticData = [
        { id: 1, location: "Aura Downtown", fixedCosts: 12000, contributionMargin: 65, breakEvenSales: 18461, currentSales: 45000, status: "PROFITABLE" },
        { id: 2, location: "Aura Westside", fixedCosts: 11000, contributionMargin: 62, breakEvenSales: 17741, currentSales: 38500, status: "PROFITABLE" },
        { id: 3, location: "Aura North Hills", fixedCosts: 14000, contributionMargin: 68, breakEvenSales: 20588, currentSales: 52100, status: "PROFITABLE" },
        { id: 4, location: "Aura East", fixedCosts: 10000, contributionMargin: 58, breakEvenSales: 17241, currentSales: 29800, status: "PROFITABLE" },
        { id: 5, location: "Aura South", fixedCosts: 11500, contributionMargin: 66, breakEvenSales: 17424, currentSales: 41200, status: "PROFITABLE" },
        { id: 6, location: "Aura Uptown", fixedCosts: 13000, contributionMargin: 60, breakEvenSales: 21666, currentSales: 18000, status: "BELOW" },
    ]

    return (
        <ReportPageLayout
            title="Break-Even Analysis"
            description="Track locations against their break-even points to ensure financial sustainability."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Profitable Locations</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">5</span>
                        <span className="text-xs font-medium text-emerald-400">83% of Network</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Below Break-Even</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">1</span>
                        <span className="text-xs font-medium text-red-400">Needs Support</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Avg Safety Margin</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">+45%</span>
                        <span className="text-xs text-stone-500">Above BEP</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Break-Even Status</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Fixed Costs</th>
                                <th className="px-6 py-3 text-right">Contrib. Margin</th>
                                <th className="px-6 py-3 text-right">Break-Even Sales</th>
                                <th className="px-6 py-3 text-right">Current Sales</th>
                                <th className="px-6 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {realisticData.map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">${item.fixedCosts.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{item.contributionMargin}%</td>
                                    <td className="px-6 py-4 text-right text-stone-300">${Math.round(item.breakEvenSales).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-stone-100">${item.currentSales.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${item.status === 'PROFITABLE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {item.status === 'PROFITABLE' && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {item.status === 'BELOW' && <AlertTriangle className="w-3 h-3 mr-1" />}
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
