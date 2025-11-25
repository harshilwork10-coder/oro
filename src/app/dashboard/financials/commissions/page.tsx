'use client'

import { useState } from 'react'
import { DollarSign, Users, TrendingUp } from 'lucide-react'

export default function CommissionsPage() {
    const [commissionData] = useState([
        { id: 1, employee: "Sarah Johnson", sales: 8500, rate: 0.08, commission: 680, status: "PAID" },
        { id: 2, employee: "Mike Chen", sales: 6200, rate: 0.08, commission: 496, status: "PENDING" },
        { id: 3, employee: "Emily Davis", sales: 7800, rate: 0.10, commission: 780, status: "PAID" },
    ])

    const totalCommissions = commissionData.reduce((sum, item) => sum + item.commission, 0)

    return (
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-stone-100 mb-2">Employee Commissions</h1>
                <p className="text-stone-400 mb-8">Track and manage employee commission payouts</p>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="glass-panel p-6 rounded-xl border-l-4 border-emerald-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-stone-500 mb-1">Total Commissions</p>
                                <p className="text-2xl font-bold text-stone-100">${totalCommissions.toFixed(2)}</p>
                            </div>
                            <DollarSign className="h-10 w-10 text-emerald-500" />
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-xl border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-stone-500 mb-1">Active Earners</p>
                                <p className="text-2xl font-bold text-stone-100">{commissionData.length}</p>
                            </div>
                            <Users className="h-10 w-10 text-blue-500" />
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-xl border-l-4 border-amber-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-stone-500 mb-1">Avg Commission</p>
                                <p className="text-2xl font-bold text-stone-100">${(totalCommissions / commissionData.length).toFixed(2)}</p>
                            </div>
                            <TrendingUp className="h-10 w-10 text-amber-500" />
                        </div>
                    </div>
                </div>

                {/* Commissions Table */}
                <div className="glass-panel rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-stone-800">
                        <h3 className="font-semibold text-stone-100">Commission Details</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-stone-400">
                            <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">Employee</th>
                                    <th className="px-6 py-3 text-right">Sales</th>
                                    <th className="px-6 py-3 text-right">Rate</th>
                                    <th className="px-6 py-3 text-right">Commission</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {commissionData.map((item) => (
                                    <tr key={item.id} className="hover:bg-stone-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-stone-200">{item.employee}</td>
                                        <td className="px-6 py-4 text-right">${item.sales.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right">{(item.rate * 100).toFixed(0)}%</td>
                                        <td className="px-6 py-4 text-right font-bold text-emerald-400">${item.commission.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
