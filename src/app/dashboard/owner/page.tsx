'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    Store, DollarSign, AlertTriangle, Package, RefreshCw,
    TrendingUp, TrendingDown, Users, ArrowRight, Clock,
    Wallet, AlertCircle, Send, Settings, FileText, BarChart3,
    Shield, Tag, Truck, Scan, Calendar, Award, Gift, Bell, Receipt
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationSummary {
    id: string
    name: string
    todaySales: number
    transactions: number
    cash: number
    card: number
    lowStock: number
    activeStaff: number
    status: 'online' | 'offline' | 'warning'
}

interface Exception {
    id: string
    type: string
    severity: string
    title: string
    description: string
    locationName: string
    createdAt: string
}

interface DashboardData {
    locations: LocationSummary[]
    summary: {
        totalLocations: number
        todaySales: number
        yesterdaySales: number
        weekSales: number
        todayTransactions: number
        lowStockTotal: number
        topLocation: string | null
    }
    exceptions: Exception[]
    exceptionCounts: {
        critical: number
        warning: number
        info: number
        total: number
    }
}

export default function OwnerDashboard() {
    const { data: session } = useSession()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastRefresh, setLastRefresh] = useState(new Date())

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch multi-store data
            const storeRes = await fetch('/api/dashboard/multi-store')
            const storeData = await storeRes.json()

            // Fetch exceptions
            const exRes = await fetch('/api/owner/exceptions')
            const exData = await exRes.json()

            // Transform data
            const locations = storeData.locations?.map((loc: any) => ({
                id: loc.location.id,
                name: loc.location.name,
                todaySales: loc.today.sales,
                transactions: loc.today.transactions,
                cash: loc.today.cash,
                card: loc.today.card,
                lowStock: loc.inventory.lowStock,
                activeStaff: loc.staff.count,
                status: 'online' // TODO: Add real status tracking
            })) || []

            setData({
                locations,
                summary: {
                    totalLocations: storeData.summary?.totalLocations || locations.length,
                    todaySales: storeData.summary?.todaySales || 0,
                    yesterdaySales: storeData.summary?.yesterdaySales || 0,
                    weekSales: storeData.summary?.mtdSales || 0,
                    todayTransactions: storeData.summary?.todayTransactions || 0,
                    lowStockTotal: storeData.summary?.lowStockTotal || 0,
                    topLocation: storeData.summary?.topLocation
                },
                exceptions: exData.exceptions?.slice(0, 5) || [],
                exceptionCounts: exData.counts || { critical: 0, warning: 0, info: 0, total: 0 }
            })
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
        } finally {
            setLoading(false)
            setLastRefresh(new Date())
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 60000) // Refresh every minute
        return () => clearInterval(interval)
    }, [])

    const vsYesterday = data?.summary?.yesterdaySales
        ? ((data.summary.todaySales - data.summary.yesterdaySales) / data.summary.yesterdaySales * 100)
        : 0
    const isUp = vsYesterday >= 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Store className="h-8 w-8 text-orange-500" />
                        Owner Dashboard
                    </h1>
                    <p className="text-stone-400 mt-1">All stores at a glance</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm text-stone-400">Today's Sales</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(data?.summary?.todaySales || 0)}</p>
                    <div className={`flex items-center gap-1 mt-2 text-sm ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        <span>{isUp ? '+' : ''}{vsYesterday.toFixed(1)}% vs yesterday</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Store className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Locations</span>
                    </div>
                    <p className="text-3xl font-bold">{data?.summary?.totalLocations || 0}</p>
                    <p className="text-sm text-blue-400 mt-2">All online</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600/30 to-purple-900/30 border border-purple-500/30 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        <span className="text-sm text-stone-400">Orders Today</span>
                    </div>
                    <p className="text-3xl font-bold">{data?.summary?.todayTransactions || 0}</p>
                    <p className="text-sm text-purple-400 mt-2">
                        Avg: {formatCurrency((data?.summary?.todaySales || 0) / Math.max(data?.summary?.todayTransactions || 1, 1))}
                    </p>
                </div>

                <Link href="/dashboard/owner/exceptions"
                    className={`rounded-2xl p-5 border transition-all hover:scale-105 ${(data?.exceptionCounts?.critical || 0) > 0
                        ? 'bg-gradient-to-br from-red-600/30 to-red-900/30 border-red-500/50'
                        : 'bg-gradient-to-br from-amber-600/30 to-amber-900/30 border-amber-500/30'
                        }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`h-5 w-5 ${(data?.exceptionCounts?.critical || 0) > 0 ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className="text-sm text-stone-400">Exceptions</span>
                    </div>
                    <p className="text-3xl font-bold">{data?.exceptionCounts?.total || 0}</p>
                    <div className="flex gap-2 mt-2">
                        {(data?.exceptionCounts?.critical || 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-red-500/30 text-red-400 rounded-full">
                                {data?.exceptionCounts?.critical} critical
                            </span>
                        )}
                        {(data?.exceptionCounts?.warning || 0) > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/30 text-amber-400 rounded-full">
                                {data?.exceptionCounts?.warning} warning
                            </span>
                        )}
                    </div>
                </Link>
            </div>

            {/* Exceptions Preview + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Exceptions */}
                <div className="lg:col-span-2 bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-400" />
                            Recent Exceptions
                        </h3>
                        <Link href="/dashboard/owner/exceptions" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1">
                            View All <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>

                    {(data?.exceptions?.length || 0) === 0 ? (
                        <div className="text-center py-8 text-stone-500">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No exceptions to report</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data?.exceptions?.map(ex => (
                                <div key={ex.id} className={`flex items-start gap-3 p-3 rounded-xl ${ex.severity === 'CRITICAL' ? 'bg-red-500/10 border border-red-500/30' :
                                    ex.severity === 'WARNING' ? 'bg-amber-500/10 border border-amber-500/30' :
                                        'bg-stone-800/50 border border-stone-700'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full mt-2 ${ex.severity === 'CRITICAL' ? 'bg-red-500' :
                                        ex.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                                        }`} />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{ex.title}</p>
                                        <p className="text-xs text-stone-400">{ex.locationName}</p>
                                    </div>
                                    <button className="text-xs px-2 py-1 bg-stone-700 hover:bg-stone-600 rounded">
                                        Review
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-4 gap-2">
                        <Link href="/dashboard/owner/inventory" className="flex flex-col items-center gap-1 p-3 bg-orange-600 hover:bg-orange-500 rounded-xl transition-all">
                            <Package className="h-5 w-5" />
                            <span className="text-xs">Inventory</span>
                        </Link>
                        <Link href="/dashboard/owner/transfers" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Send className="h-5 w-5 text-blue-400" />
                            <span className="text-xs">Transfer</span>
                        </Link>
                        <Link href="/dashboard/owner/cash" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Wallet className="h-5 w-5 text-green-400" />
                            <span className="text-xs">Cash</span>
                        </Link>
                        <Link href="/dashboard/owner/lp-audit" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Shield className="h-5 w-5 text-red-400" />
                            <span className="text-xs">LP Audit</span>
                        </Link>
                        <Link href="/dashboard/owner/bulk-pricing" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Tag className="h-5 w-5 text-amber-400" />
                            <span className="text-xs">Pricing</span>
                        </Link>
                        <Link href="/dashboard/owner/vendors" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Truck className="h-5 w-5 text-cyan-400" />
                            <span className="text-xs">Vendors</span>
                        </Link>
                        <Link href="/dashboard/owner/compare" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <BarChart3 className="h-5 w-5 text-purple-400" />
                            <span className="text-xs">Compare</span>
                        </Link>
                        <Link href="/dashboard/owner/id-logs" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Scan className="h-5 w-5 text-indigo-400" />
                            <span className="text-xs">ID Logs</span>
                        </Link>
                        <Link href="/dashboard/owner/sales-rules" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Clock className="h-5 w-5 text-rose-400" />
                            <span className="text-xs">Rules</span>
                        </Link>
                        <Link href="/dashboard/owner/month-close" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Calendar className="h-5 w-5 text-pink-400" />
                            <span className="text-xs">Month End</span>
                        </Link>
                        <Link href="/dashboard/owner/exceptions" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                            <span className="text-xs">Exceptions</span>
                        </Link>
                        <Link href="/dashboard/owner/loyalty" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Award className="h-5 w-5 text-yellow-400" />
                            <span className="text-xs">Loyalty</span>
                        </Link>
                        <Link href="/dashboard/owner/gift-cards" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Gift className="h-5 w-5 text-pink-400" />
                            <span className="text-xs">Gift Cards</span>
                        </Link>
                        <Link href="/dashboard/owner/notifications" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Bell className="h-5 w-5 text-violet-400" />
                            <span className="text-xs">Notify</span>
                        </Link>
                        <Link href="/dashboard/owner/reports" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <FileText className="h-5 w-5 text-cyan-400" />
                            <span className="text-xs">Reports</span>
                        </Link>
                        <Link href="/dashboard/owner/tax-report" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Receipt className="h-5 w-5 text-amber-400" />
                            <span className="text-xs">Tax Report</span>
                        </Link>
                        <Link href="/dashboard/settings" className="flex flex-col items-center gap-1 p-3 bg-stone-800 hover:bg-stone-700 rounded-xl transition-all">
                            <Settings className="h-5 w-5 text-stone-400" />
                            <span className="text-xs">Settings</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Store Cards */}
            <h3 className="font-bold mb-4 flex items-center gap-2">
                <Store className="h-5 w-5 text-orange-400" />
                Store Breakdown
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(data?.locations || []).map(loc => (
                    <div key={loc.id} className="bg-stone-900/80 border border-stone-700 hover:border-orange-500/30 rounded-2xl p-5 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-lg">{loc.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`w-2 h-2 rounded-full ${loc.status === 'online' ? 'bg-emerald-500' :
                                        loc.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                                        }`} />
                                    <span className="text-sm text-stone-500 capitalize">{loc.status}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 text-stone-400">
                                <Users className="h-4 w-4" />
                                <span className="text-sm">{loc.activeStaff}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-stone-800/50 rounded-xl p-3">
                                <p className="text-xs text-stone-500">Sales</p>
                                <p className="text-xl font-bold text-emerald-400">{formatCurrency(loc.todaySales)}</p>
                            </div>
                            <div className="bg-stone-800/50 rounded-xl p-3">
                                <p className="text-xs text-stone-500">Orders</p>
                                <p className="text-xl font-bold">{loc.transactions}</p>
                            </div>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-green-500/10 rounded-lg p-2 text-center">
                                <p className="text-xs text-green-400">Cash</p>
                                <p className="font-bold text-green-400">{formatCurrency(loc.cash)}</p>
                            </div>
                            <div className="flex-1 bg-blue-500/10 rounded-lg p-2 text-center">
                                <p className="text-xs text-blue-400">Card</p>
                                <p className="font-bold text-blue-400">{formatCurrency(loc.card)}</p>
                            </div>
                        </div>

                        {loc.lowStock > 0 && (
                            <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 rounded-lg p-2">
                                <Package className="h-4 w-4" />
                                <span>{loc.lowStock} items low in stock</span>
                            </div>
                        )}
                    </div>
                ))}

                {(data?.locations?.length || 0) === 0 && !loading && (
                    <div className="col-span-full text-center py-16 text-stone-500">
                        <Store className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-xl">No stores found</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center text-stone-600 text-sm mt-8">
                Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
        </div>
    )
}

