'use client'

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { useState, useEffect } from "react"
import { DollarSign, TrendingUp, Users, Building2 } from "lucide-react"

type SalesRecord = {
    id: string
    name: string
    type: string
    billingMethod: string
    supportFee: number
    enableCommission: boolean
    baseRate: number
    owner: {
        name: string
        email: string
    }
    createdAt: string
}

export default function MySalesPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [sales, setSales] = useState<SalesRecord[]>([])
    const [loading, setLoading] = useState(true)

    async function fetchSales() {
        try {
            const response = await fetch('/api/admin/my-sales')
            if (response.ok) {
                const data = await response.json()
                setSales(data)
            }
        } catch (error) {
            console.error('Error fetching sales:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (status === 'authenticated') {
            fetchSales()
        }
    }, [status])

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    // Calculate totals
    const totalAccounts = sales.length
    const monthlyRecurring = sales.reduce((sum, s) => sum + Number(s.supportFee), 0)

    // Total commission = sum of all markups (only for enabled accounts)
    const totalCommission = sales.reduce((sum, s) => {
        if (!s.enableCommission) return sum
        const markup = Number(s.supportFee) - Number(s.baseRate || 99)
        return sum + Math.max(0, markup)
    }, 0)

    return (
        <div className="p-4 md:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-stone-100">My Sales</h1>
                <p className="text-stone-400 mt-2">Track your accounts and commissions</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-2xl border border-purple-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-stone-400">Total Accounts</p>
                            <p className="text-3xl font-bold text-purple-400 mt-1">{totalAccounts}</p>
                        </div>
                        <Users className="h-10 w-10 text-purple-400 opacity-20" />
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-stone-400">Monthly Recurring</p>
                            <p className="text-3xl font-bold text-emerald-400 mt-1">${monthlyRecurring.toFixed(2)}</p>
                        </div>
                        <TrendingUp className="h-10 w-10 text-emerald-400 opacity-20" />
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-pink-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-stone-400">Your Monthly Commission</p>
                            <p className="text-3xl font-bold text-pink-400 mt-1">${totalCommission.toFixed(2)}</p>
                            <p className="text-xs text-stone-500 mt-1">Markup above base rates</p>
                        </div>
                        <DollarSign className="h-10 w-10 text-pink-400 opacity-20" />
                    </div>
                </div>
            </div>

            {/* Sales List */}
            <div className="glass-panel p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-stone-100 mb-6">Your Accounts</h2>

                {sales.length === 0 ? (
                    <div className="text-center py-12">
                        <Building2 className="h-16 w-16 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-400">No accounts yet. Start selling to earn commission!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-stone-800">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-400">Company</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-400">Owner</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-400">Type</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-400">Billing</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-400">Support Fee</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-400">Base Rate</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-stone-400">Your Commission</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-stone-400">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale) => {
                                    // Commission = Markup above base rate (only if enabled)
                                    const baseRate = Number(sale.baseRate || 99)
                                    const supportFee = Number(sale.supportFee)
                                    const markup = supportFee - baseRate
                                    const commission = sale.enableCommission ? Math.max(0, markup) : 0

                                    return (
                                        <tr key={sale.id} className="border-b border-stone-800/50 hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-stone-100">{sale.name}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="text-sm text-stone-300">{sale.owner.name}</div>
                                                <div className="text-xs text-stone-500">{sale.owner.email}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${sale.type === 'BRAND' ? 'bg-purple-500/10 text-purple-400' : 'bg-pink-500/10 text-pink-400'
                                                    }`}>
                                                    {sale.type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${sale.billingMethod === 'DIRECT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                                    }`}>
                                                    {sale.billingMethod}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium text-stone-100">
                                                ${supportFee.toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-right text-sm text-stone-400">
                                                ${baseRate.toFixed(2)}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                {sale.enableCommission ? (
                                                    <span className="font-bold text-emerald-400">
                                                        ${commission.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-stone-500">No Commission</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-sm text-stone-400">
                                                {new Date(sale.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
