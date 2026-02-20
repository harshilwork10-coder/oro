'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Store, DollarSign, ShoppingCart, AlertTriangle, Users, RefreshCw, Package, ChevronRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationData {
    location: {
        id: string
        name: string
        address: string | null
    }
    today: {
        sales: number
        transactions: number
        cash: number
        card: number
        avgTicket: number
    }
    mtd: {
        sales: number
        transactions: number
    }
    inventory: {
        totalProducts: number
        lowStock: number
    }
    staff: {
        count: number
    }
}

interface DashboardData {
    locations: LocationData[]
    summary: {
        totalLocations: number
        todaySales: number
        todayTransactions: number
        mtdSales: number
        lowStockTotal: number
        topLocation: string | null
    }
}

export default function MultiStoreDashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/dashboard/multi-store')
            if (!res.ok) throw new Error('Failed to fetch')
            const json = await res.json()
            setData(json)
        } catch (e) {
            setError('Failed to load dashboard data')
            console.error(e)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
        // Refresh every 5 minutes
        const interval = setInterval(fetchData, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Multi-Store Dashboard</h1>
                        <p className="text-stone-400">Compare all locations at a glance</p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-400">
                    {error}
                </div>
            )}

            {data && data.summary && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Store className="h-5 w-5 text-emerald-400" />
                                <span className="text-sm text-stone-400">Locations</span>
                            </div>
                            <p className="text-3xl font-bold">{data.summary.totalLocations}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-5 w-5 text-blue-400" />
                                <span className="text-sm text-stone-400">Today Sales</span>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(data.summary.todaySales)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-600/30 to-purple-900/30 border border-purple-500/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <ShoppingCart className="h-5 w-5 text-purple-400" />
                                <span className="text-sm text-stone-400">Today Txns</span>
                            </div>
                            <p className="text-3xl font-bold">{data.summary.todayTransactions}</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-600/30 to-amber-900/30 border border-amber-500/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp className="h-5 w-5 text-amber-400" />
                                <span className="text-sm text-stone-400">MTD Sales</span>
                            </div>
                            <p className="text-3xl font-bold">{formatCurrency(data.summary.mtdSales)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-600/30 to-red-900/30 border border-red-500/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                                <span className="text-sm text-stone-400">Low Stock</span>
                            </div>
                            <p className="text-3xl font-bold">{data.summary.lowStockTotal}</p>
                        </div>
                    </div>

                    {/* Top Performer Badge */}
                    {data.summary.topLocation && (
                        <div className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl p-4 mb-8 flex items-center gap-4">
                            <span className="text-3xl">🏆</span>
                            <div>
                                <p className="text-sm text-stone-400">Today&apos;s Top Performer</p>
                                <p className="text-xl font-bold text-yellow-400">{data.summary.topLocation}</p>
                            </div>
                        </div>
                    )}

                    {/* Location Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.locations.map((loc) => (
                            <div
                                key={loc.location.id}
                                className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5 hover:border-indigo-500/50 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold">{loc.location.name}</h3>
                                        <p className="text-sm text-stone-500">{loc.location.address || 'No address'}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-stone-400">
                                        <Users className="h-4 w-4" />
                                        <span className="text-sm">{loc.staff.count}</span>
                                    </div>
                                </div>

                                {/* Today's Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-stone-800/50 rounded-xl p-3">
                                        <p className="text-xs text-stone-500 mb-1">Today Sales</p>
                                        <p className="text-xl font-bold text-emerald-400">{formatCurrency(loc.today.sales)}</p>
                                    </div>
                                    <div className="bg-stone-800/50 rounded-xl p-3">
                                        <p className="text-xs text-stone-500 mb-1">Transactions</p>
                                        <p className="text-xl font-bold">{loc.today.transactions}</p>
                                    </div>
                                </div>

                                {/* Payment Split */}
                                <div className="flex gap-2 mb-4">
                                    <div className="flex-1 bg-green-500/10 rounded-lg p-2 text-center">
                                        <p className="text-xs text-green-400">Cash</p>
                                        <p className="font-bold text-green-400">{formatCurrency(loc.today.cash)}</p>
                                    </div>
                                    <div className="flex-1 bg-blue-500/10 rounded-lg p-2 text-center">
                                        <p className="text-xs text-blue-400">Card</p>
                                        <p className="font-bold text-blue-400">{formatCurrency(loc.today.card)}</p>
                                    </div>
                                </div>

                                {/* Bottom Stats */}
                                <div className="flex justify-between text-sm border-t border-stone-700 pt-3">
                                    <div>
                                        <span className="text-stone-500">Avg Ticket:</span>
                                        <span className="ml-2 font-medium">{formatCurrency(loc.today.avgTicket)}</span>
                                    </div>
                                    <div>
                                        <span className="text-stone-500">MTD:</span>
                                        <span className="ml-2 font-medium text-amber-400">{formatCurrency(loc.mtd.sales)}</span>
                                    </div>
                                </div>

                                {/* Low Stock Alert */}
                                {loc.inventory.lowStock > 0 && (
                                    <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg p-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span>{loc.inventory.lowStock} items low in stock</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {data.locations.length === 0 && (
                        <div className="text-center py-16 text-stone-400">
                            <Store className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-xl">No locations found</p>
                            <p className="text-sm">Add locations to see performance data</p>
                        </div>
                    )}

                    {/* Inventory Management Section */}
                    {data.locations.length > 0 && (
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <Package className="h-6 w-6 text-orange-400" />
                                    Inventory Management
                                </h2>
                                <div className="flex items-center gap-3">
                                    <Link
                                        href="/dashboard/owner/transfers"
                                        className="text-purple-400 hover:text-purple-300 flex items-center gap-1 text-sm"
                                    >
                                        Stock Transfers <ChevronRight className="h-4 w-4" />
                                    </Link>
                                    <Link
                                        href="/dashboard/multi-store/inventory"
                                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                                    >
                                        Centralized View <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.locations.map((loc) => (
                                    <div
                                        key={`inv-${loc.location.id}`}
                                        className="bg-stone-900/80 border border-stone-700 rounded-xl p-4 hover:border-orange-500/50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold">{loc.location.name}</h3>
                                            {loc.inventory.lowStock > 0 && (
                                                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">
                                                    {loc.inventory.lowStock} Low
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-stone-400 mb-3">
                                            <span>Total Products</span>
                                            <span className="font-medium text-white">{loc.inventory.totalProducts}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/dashboard/inventory/retail?locationId=${loc.location.id}`}
                                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-center py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Manage Inventory
                                            </Link>
                                            {loc.inventory.lowStock > 0 && (
                                                <Link
                                                    href={`/dashboard/inventory/alerts?locationId=${loc.location.id}`}
                                                    className="bg-red-600/30 hover:bg-red-600/50 text-red-400 px-3 py-2 rounded-lg text-sm transition-colors"
                                                    title="View Low Stock"
                                                >
                                                    <AlertTriangle className="h-4 w-4" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {loading && !data && (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
                </div>
            )}
        </div>
    )
}

