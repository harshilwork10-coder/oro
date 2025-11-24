'use client'

import ReportPageLayout from "@/components/reports/ReportPageLayout"
import { CreditCard, Clock, ShoppingBag } from "lucide-react"

export default function TransactionsReportPage() {
    // Mock data
    const transactionData = [
        { id: 1, location: "Aura Downtown", total: 2850, avgValue: 23.85, peakHour: "12:00 PM", refundRate: 0.5 },
        { id: 2, location: "Aura Westside", total: 2100, avgValue: 26.66, peakHour: "1:00 PM", refundRate: 0.8 },
        { id: 3, location: "Aura North Hills", total: 3100, avgValue: 23.22, peakHour: "12:00 PM", refundRate: 0.4 },
        { id: 4, location: "Aura East", total: 1450, avgValue: 26.20, peakHour: "6:00 PM", refundRate: 1.2 },
        { id: 5, location: "Aura South", total: 2400, avgValue: 25.41, peakHour: "12:00 PM", refundRate: 0.6 },
    ]

    return (
        <ReportPageLayout
            title="Transaction Analysis"
            description="Analyze transaction volumes, average ticket values, and peak operational hours."
        >
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Total Transactions</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">11,900</span>
                        <span className="text-xs text-stone-500">This Month</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Avg Ticket Value</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$24.85</span>
                        <span className="text-xs font-medium text-emerald-400">+1.2%</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-amber-500">
                    <p className="text-sm text-stone-500 mb-1">Busiest Hour</p>
                    <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-stone-100">12:00 PM - 1:00 PM</span>
                        <span className="text-sm text-stone-500">Lunch Rush</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-100">Transaction Metrics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 text-right">Total Transactions</th>
                                <th className="px-6 py-3 text-right">Avg Ticket Value</th>
                                <th className="px-6 py-3 text-center">Peak Hour</th>
                                <th className="px-6 py-3 text-right">Refund Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {transactionData.sort((a, b) => b.total - a.total).map((item) => (
                                <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-200">{item.location}</td>
                                    <td className="px-6 py-4 text-right">{item.total.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-stone-200">${item.avgValue.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">{item.peakHour}</td>
                                    <td className={`px-6 py-4 text-right ${item.refundRate > 1 ? 'text-red-400 font-bold' : 'text-stone-400'}`}>
                                        {item.refundRate}%
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
