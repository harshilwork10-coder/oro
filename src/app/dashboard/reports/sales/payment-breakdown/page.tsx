'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    DollarSign,
    ArrowLeft,
    Download,
    Calendar,
    RefreshCw,
    CreditCard,
    Banknote,
    Gift
} from 'lucide-react'
import Link from 'next/link'

interface PaymentBreakdown {
    method: string
    count: number
    total: number
    percentage: number
}

export default function PaymentBreakdownPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [breakdown, setBreakdown] = useState<PaymentBreakdown[]>([])
    const [totals, setTotals] = useState({ count: 0, total: 0 })
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchBreakdown()
    }, [startDate, endDate])

    const fetchBreakdown = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/payment-breakdown?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                const data = await res.json()
                setBreakdown(data.breakdown || [])
                setTotals(data.totals || { count: 0, total: 0 })
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (method: string) => {
        if (method.includes('CASH')) return <Banknote className="w-5 h-5 text-green-400" />
        if (method.includes('CARD') || method.includes('CREDIT') || method.includes('DEBIT')) return <CreditCard className="w-5 h-5 text-blue-400" />
        if (method.includes('GIFT')) return <Gift className="w-5 h-5 text-purple-400" />
        return <DollarSign className="w-5 h-5 text-gray-400" />
    }

    const getColor = (method: string) => {
        if (method.includes('CASH')) return 'bg-green-500'
        if (method.includes('CREDIT')) return 'bg-blue-500'
        if (method.includes('DEBIT')) return 'bg-cyan-500'
        if (method.includes('GIFT')) return 'bg-purple-500'
        return 'bg-gray-500'
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/sales" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            Payment Type Breakdown
                        </h1>
                        <p className="text-gray-400 mt-1">Sales by payment method</p>
                    </div>
                </div>
                <button onClick={fetchBreakdown} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
                <span className="text-gray-400">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-white">{totals.count}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-gray-400 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-400">${totals.total.toFixed(2)}</p>
                </div>
            </div>

            {/* Breakdown Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Payment Method</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Transactions</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Total</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Percentage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : breakdown.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No transactions found</td></tr>
                        ) : (
                            breakdown.map((item) => (
                                <tr key={item.method} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {getIcon(item.method)}
                                            <span className="text-white font-medium">{item.method.replace(/_/g, ' ')}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-white">{item.count}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-medium">${item.total.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full ${getColor(item.method)}`} style={{ width: `${item.percentage}%` }} />
                                            </div>
                                            <span className="text-white text-sm w-12">{item.percentage.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
