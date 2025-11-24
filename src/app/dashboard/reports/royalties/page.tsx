'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"

export default function RoyaltyRevenueReportPage() {
    // Mock data
    const royalties = [
        { id: 1, location: "Aura Downtown", franchisee: "John Smith", sales: 45000, rate: 0.06, amount: 2700, status: "PAID", date: "2024-11-01" },
        { id: 2, location: "Aura Westside", franchisee: "Sarah Johnson", sales: 38500, rate: 0.06, amount: 2310, status: "PAID", date: "2024-11-01" },
        { id: 3, location: "Aura North Hills", franchisee: "Mike Brown", sales: 52100, rate: 0.06, amount: 3126, status: "PENDING", date: "2024-11-01" },
        { id: 4, location: "Aura East", franchisee: "Emily Davis", sales: 29800, rate: 0.06, amount: 1788, status: "OVERDUE", date: "2024-11-01" },
        { id: 5, location: "Aura South", franchisee: "David Wilson", sales: 41200, rate: 0.06, amount: 2472, status: "PAID", date: "2024-11-01" },
    ]

    const totalRevenue = royalties.reduce((sum, item) => sum + item.amount, 0)
    const paidRevenue = royalties.filter(r => r.status === "PAID").reduce((sum, item) => sum + item.amount, 0)
    const pendingRevenue = royalties.filter(r => r.status === "PENDING").reduce((sum, item) => sum + item.amount, 0)
    const overdueRevenue = royalties.filter(r => r.status === "OVERDUE").reduce((sum, item) => sum + item.amount, 0)

    return (
        <ReportPageLayout
            title="Royalty Revenue Report"
            description="Track royalty fees collected from all franchisees across the network."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Total Royalties (Nov)</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">${totalRevenue.toLocaleString()}</span>
                        <span className="text-xs font-medium text-emerald-400 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +8.5%
                        </span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Collected</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">${paidRevenue.toLocaleString()}</span>
                        <span className="text-xs text-stone-500">
                            {Math.round((paidRevenue / totalRevenue) * 100)}% of total
                        </span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-amber-500">
                    <p className="text-sm text-stone-500 mb-1">Pending</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">${pendingRevenue.toLocaleString()}</span>
                        <span className="text-xs text-stone-500">Due soon</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Overdue</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">${overdueRevenue.toLocaleString()}</span>
                        <span className="text-xs font-medium text-red-400 flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Action Needed
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Royalty Breakdown by Location</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3">Franchisee</th>
                                <th className="px-6 py-3 text-right">Gross Sales</th>
                                <th className="px-6 py-3 text-right">Rate</th>
                                <th className="px-6 py-3 text-right">Royalty Due</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-right">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {royalties.map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4">{item.franchisee}</td>
                                    <td className="px-6 py-4 text-right">${item.sales.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">{(item.rate * 100).toFixed(1)}%</td>
                                    <td className="px-6 py-4 text-right font-bold text-stone-200">${item.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                item.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                    'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {item.status === 'PAID' && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {item.status === 'OVERDUE' && <AlertCircle className="w-3 h-3 mr-1" />}
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">{item.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </ReportPageLayout>
    )
}
