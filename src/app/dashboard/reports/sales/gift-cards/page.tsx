'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Gift,
    ArrowLeft,
    RefreshCw,
    Calendar,
    CreditCard,
    DollarSign
} from 'lucide-react'
import Link from 'next/link'

interface GiftCardData {
    sold: { count: number, total: number }
    redeemed: { count: number, total: number }
    outstanding: number
    cards: Array<{
        id: string
        code: string
        initialAmount: number
        currentBalance: number
        purchaseDate: string
        status: string
    }>
}

export default function GiftCardReportPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<GiftCardData | null>(null)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setMonth(d.getMonth() - 1)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchData()
    }, [startDate, endDate])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/gift-cards?startDate=${startDate}&endDate=${endDate}`)
            if (res.ok) {
                setData(await res.json())
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/sales" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                                <Gift className="w-6 h-6 text-white" />
                            </div>
                            Gift Card Report
                        </h1>
                        <p className="text-gray-400 mt-1">Sold, redeemed, and outstanding balances</p>
                    </div>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
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

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-green-400" />
                        <p className="text-green-300 text-sm">Sold</p>
                    </div>
                    <p className="text-2xl font-bold text-green-400">${data?.sold.total.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500">{data?.sold.count || 0} cards</p>
                </div>
                <div className="bg-orange-900/20 border border-orange-500/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-orange-400" />
                        <p className="text-orange-300 text-sm">Redeemed</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-400">${data?.redeemed.total.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-gray-500">{data?.redeemed.count || 0} redemptions</p>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Gift className="w-4 h-4 text-purple-400" />
                        <p className="text-purple-300 text-sm">Outstanding Balance</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">${data?.outstanding.toFixed(2) || '0.00'}</p>
                </div>
            </div>

            {/* Cards Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Code</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Purchased</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Initial</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Balance</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : !data?.cards.length ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No gift cards found</td></tr>
                        ) : (
                            data.cards.map((card) => (
                                <tr key={card.id} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3 text-white font-mono">{card.code}</td>
                                    <td className="px-4 py-3 text-gray-400">{card.purchaseDate}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">${card.initialAmount.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-medium">${card.currentBalance.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-1 rounded ${card.currentBalance > 0 ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                                            {card.currentBalance > 0 ? 'Active' : 'Empty'}
                                        </span>
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
