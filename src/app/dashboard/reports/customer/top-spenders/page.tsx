'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    TrendingUp,
    ArrowLeft,
    RefreshCw,
    Search,
    User,
    DollarSign,
    Medal
} from 'lucide-react'
import Link from 'next/link'

interface TopSpender {
    id: string
    name: string
    phone: string
    totalSpent: number
    visitCount: number
    averageTicket: number
    rank: number
}

export default function TopSpendersPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [customers, setCustomers] = useState<TopSpender[]>([])
    const [limit, setLimit] = useState(20)

    useEffect(() => {
        fetchData()
    }, [limit])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/top-spenders?limit=${limit}`)
            if (res.ok) {
                const data = await res.json()
                setCustomers(data.customers || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    const getRankBadge = (rank: number) => {
        if (rank === 1) return <Medal className="w-5 h-5 text-yellow-400" />
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
        return <span className="text-gray-500 font-mono">#{rank}</span>
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports/customer" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            Top Spenders
                        </h1>
                        <p className="text-gray-400 mt-1">Customers ranked by total spending</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                        <option value={50}>Top 50</option>
                        <option value={100}>Top 100</option>
                    </select>
                    <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase w-16">Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Customer</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Phone</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Visits</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Avg Ticket</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Total Spent</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : customers.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No customer data found</td></tr>
                        ) : (
                            customers.map((customer) => (
                                <tr key={customer.id} className={`hover:bg-gray-700/30 ${customer.rank <= 3 ? 'bg-green-900/10' : ''}`}>
                                    <td className="px-4 py-3">{getRankBadge(customer.rank)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4 text-gray-500" />
                                            <span className="text-white font-medium">{customer.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{customer.phone || '-'}</td>
                                    <td className="px-4 py-3 text-right text-white">{customer.visitCount}</td>
                                    <td className="px-4 py-3 text-right text-gray-400">${customer.averageTicket.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-medium">${customer.totalSpent.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
