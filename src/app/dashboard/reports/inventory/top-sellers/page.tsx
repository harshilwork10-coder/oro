'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    TrendingUp,
    ArrowLeft,
    Download,
    Calendar,
    RefreshCw,
    Medal,
    Package
} from 'lucide-react'
import Link from 'next/link'

interface TopSeller {
    id: string
    name: string
    barcode: string
    category: string
    quantitySold: number
    revenue: number
    rank: number
}

export default function TopSellersPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<TopSeller[]>([])
    const [limit, setLimit] = useState(20)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

    useEffect(() => {
        fetchTopSellers()
    }, [startDate, endDate, limit])

    const fetchTopSellers = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reports/top-sellers?startDate=${startDate}&endDate=${endDate}&limit=${limit}`)
            if (res.ok) {
                const data = await res.json()
                setProducts(data.products || [])
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
                    <Link href="/dashboard/reports/inventory" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            Top Sellers
                        </h1>
                        <p className="text-gray-400 mt-1">Best selling products by quantity</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                        <option value={10}>Top 10</option>
                        <option value={20}>Top 20</option>
                        <option value={50}>Top 50</option>
                        <option value={100}>Top 100</option>
                    </select>
                    <button onClick={fetchTopSellers} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
                <span className="text-gray-400">to</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white text-sm" />
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase w-16">Rank</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Product</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Category</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Qty Sold</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No sales data found</td></tr>
                        ) : (
                            products.map((item) => (
                                <tr key={item.id} className={`hover:bg-gray-700/30 ${item.rank <= 3 ? 'bg-yellow-900/10' : ''}`}>
                                    <td className="px-4 py-3">{getRankBadge(item.rank)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <Package className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-white font-medium">{item.name}</p>
                                                {item.barcode && <p className="text-gray-500 text-xs font-mono">{item.barcode}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">{item.category || '-'}</td>
                                    <td className="px-4 py-3 text-right text-white font-medium">{item.quantitySold}</td>
                                    <td className="px-4 py-3 text-right text-green-400 font-medium">${item.revenue.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

