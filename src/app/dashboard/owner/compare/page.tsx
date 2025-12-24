'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, BarChart3, RefreshCw, TrendingUp, Store,
    Trophy, Medal, DollarSign, ShoppingCart
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Ranking {
    id: string
    name: string
    totalSales: number
    totalTransactions: number
    avgTicket: number
    avgDaily: number
}

interface DailyData {
    date: string
    [storeName: string]: number | string
}

export default function StoreComparisonPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [locations, setLocations] = useState<string[]>([])
    const [dailyData, setDailyData] = useState<DailyData[]>([])
    const [rankings, setRankings] = useState<Ranking[]>([])
    const [summary, setSummary] = useState<any>(null)
    const [selectedDays, setSelectedDays] = useState(7)
    const [selectedMetric, setSelectedMetric] = useState<'sales' | 'transactions' | 'avgTicket'>('sales')

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            params.set('days', selectedDays.toString())
            params.set('metric', selectedMetric)

            const res = await fetch(`/api/owner/store-comparison?${params}`)
            const data = await res.json()

            setLocations(data.locations || [])
            setDailyData(data.dailyData || [])
            setRankings(data.rankings || [])
            setSummary(data.summary || null)
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [selectedDays, selectedMetric])

    // Calculate max value for chart scaling
    const maxValue = dailyData.reduce((max, day) => {
        locations.forEach(loc => {
            const val = day[loc] as number
            if (val > max) max = val
        })
        return max
    }, 0)

    const colors = [
        'bg-emerald-500', 'bg-blue-500', 'bg-purple-500',
        'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
    ]

    const formatValue = (val: number) => {
        if (selectedMetric === 'sales' || selectedMetric === 'avgTicket') {
            return formatCurrency(val)
        }
        return val.toLocaleString()
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <BarChart3 className="h-8 w-8 text-purple-500" />
                            Store Comparison
                        </h1>
                        <p className="text-stone-400">Compare performance across all locations</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value as any)}
                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2"
                    >
                        <option value="sales">Sales</option>
                        <option value="transactions">Transactions</option>
                        <option value="avgTicket">Avg Ticket</option>
                    </select>
                    <select
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(parseInt(e.target.value))}
                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={14}>Last 14 Days</option>
                        <option value={30}>Last 30 Days</option>
                    </select>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm text-stone-400">Total Sales</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(summary?.totalSales || 0)}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Total Orders</span>
                    </div>
                    <p className="text-3xl font-bold">{summary?.totalTransactions?.toLocaleString() || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-amber-600/30 to-amber-900/30 border border-amber-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-amber-400" />
                        <span className="text-sm text-stone-400">Top Store</span>
                    </div>
                    <p className="text-xl font-bold text-amber-400">{summary?.topStore || '-'}</p>
                </div>

                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-purple-400" />
                        <span className="text-sm text-stone-400">Avg Ticket</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(summary?.avgTicket || 0)}</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5 mb-6">
                <h3 className="font-bold mb-4">Daily {selectedMetric === 'sales' ? 'Sales' : selectedMetric === 'transactions' ? 'Transactions' : 'Avg Ticket'}</h3>

                {/* Legend */}
                <div className="flex gap-4 mb-4 flex-wrap">
                    {locations.map((loc, i) => (
                        <div key={loc} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded ${colors[i % colors.length]}`} />
                            <span className="text-sm text-stone-400">{loc}</span>
                        </div>
                    ))}
                </div>

                {/* Simple bar chart */}
                <div className="space-y-4">
                    {dailyData.map((day) => (
                        <div key={day.date} className="flex items-center gap-4">
                            <div className="w-20 text-sm text-stone-500 shrink-0">
                                {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex-1 flex gap-1 h-8">
                                {locations.map((loc, i) => {
                                    const val = day[loc] as number
                                    const width = maxValue > 0 ? (val / maxValue * 100) : 0
                                    return (
                                        <div
                                            key={loc}
                                            className={`${colors[i % colors.length]} rounded relative group`}
                                            style={{ width: `${width}%`, minWidth: val > 0 ? '4px' : '0' }}
                                        >
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-stone-800 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                {loc}: {formatValue(val)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {dailyData.length === 0 && !loading && (
                    <div className="text-center py-8 text-stone-500">
                        <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No data available</p>
                    </div>
                )}
            </div>

            {/* Rankings */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                <h3 className="font-bold flex items-center gap-2 mb-4">
                    <Trophy className="h-5 w-5 text-amber-400" />
                    Store Rankings
                </h3>

                <div className="space-y-3">
                    {rankings.map((store, index) => (
                        <div
                            key={store.id}
                            className={`flex items-center gap-4 p-4 rounded-xl ${index === 0 ? 'bg-amber-500/20 border border-amber-500/30' :
                                    index === 1 ? 'bg-stone-700/50 border border-stone-600' :
                                        index === 2 ? 'bg-orange-900/30 border border-orange-800/30' :
                                            'bg-stone-800/50 border border-stone-700'
                                }`}
                        >
                            <div className="w-10 text-center">
                                {index === 0 ? (
                                    <Trophy className="h-6 w-6 text-amber-400 mx-auto" />
                                ) : index === 1 ? (
                                    <Medal className="h-6 w-6 text-stone-400 mx-auto" />
                                ) : index === 2 ? (
                                    <Medal className="h-6 w-6 text-orange-600 mx-auto" />
                                ) : (
                                    <span className="text-xl font-bold text-stone-500">#{index + 1}</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-lg">{store.name}</p>
                                <p className="text-sm text-stone-400">
                                    {store.totalTransactions.toLocaleString()} orders
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(store.totalSales)}</p>
                                <p className="text-sm text-stone-500">
                                    Avg {formatCurrency(store.avgDaily)}/day
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {rankings.length === 0 && !loading && (
                    <div className="text-center py-8 text-stone-500">
                        <Store className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No stores to compare</p>
                    </div>
                )}
            </div>
        </div>
    )
}
