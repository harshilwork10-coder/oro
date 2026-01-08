'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    Package,
    Users,
    Clock,
    RefreshCw,
    Zap,
    Wallet,
    AlertCircle
} from 'lucide-react'
import OroLogo from '@/components/ui/OroLogo'

interface LiveStats {
    todaySales: number
    yesterdaySales: number
    weekSales: number
    transactionCount: number
    averageTicket: number
    lastHourSales: number
}

interface TopSeller {
    name: string
    quantity: number
    revenue: number
}

interface HighValueTx {
    id: string
    total: number
    itemCount: number
    employeeName: string
    time: string
}

interface VoidAlert {
    id: string
    type: string
    productName: string
    amount: number
    employeeName: string
    reason: string
    time: string
}

interface EmployeeOnClock {
    name: string
    hours: number
    since: string
}

interface CashDrawer {
    id: string
    location: string
    employee: string
    startingCash: number
    openedAt: string
}

export default function OroPulsePage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [hasAccess, setHasAccess] = useState<boolean | null>(null)
    const [stats, setStats] = useState<LiveStats>({ todaySales: 0, yesterdaySales: 0, weekSales: 0, transactionCount: 0, averageTicket: 0, lastHourSales: 0 })
    const [topSellers, setTopSellers] = useState<TopSeller[]>([])
    const [highValueTxs, setHighValueTxs] = useState<HighValueTx[]>([])
    const [voidAlerts, setVoidAlerts] = useState<VoidAlert[]>([])
    const [employeesOnClock, setEmployeesOnClock] = useState<EmployeeOnClock[]>([])
    const [lowStockCount, setLowStockCount] = useState(0)
    const [cashDrawers, setCashDrawers] = useState<CashDrawer[]>([])
    const [lastRefresh, setLastRefresh] = useState(new Date())

    // Check access on mount
    useEffect(() => {
        const checkAccess = async () => {
            try {
                const res = await fetch('/api/pulse/access')
                const data = await res.json()
                if (!data.hasAccess) {
                    window.location.href = '/dashboard/pulse/upgrade'
                    return
                }
                setHasAccess(true)
            } catch (e) {
                console.error('Access check failed:', e)
                setHasAccess(true) // Allow on error to not block
            }
        }
        checkAccess()
    }, [])

    useEffect(() => {
        if (hasAccess) {
            fetchData()
            const interval = setInterval(fetchData, 30000)
            return () => clearInterval(interval)
        }
    }, [hasAccess])

    const fetchData = async () => {
        try {
            const res = await fetch('/api/pulse/live')
            if (res.ok) {
                const data = await res.json()
                setStats(data.stats || { todaySales: 0, yesterdaySales: 0, weekSales: 0, transactionCount: 0, averageTicket: 0, lastHourSales: 0 })
                setTopSellers(data.topSellers || [])
                setHighValueTxs(data.highValueTxs || [])
                setVoidAlerts(data.voidAlerts || [])
                setEmployeesOnClock(data.employeesOnClock || [])
                setLowStockCount(data.lowStockCount || 0)
                setCashDrawers(data.cashDrawers || [])
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
            setLastRefresh(new Date())
        }
    }

    const vsYesterday = stats.yesterdaySales > 0
        ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales * 100)
        : 0
    const isUp = vsYesterday >= 0

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white safe-area-inset">
            {/* Mobile-optimized container with safe areas for notch */}
            <div className="px-4 pt-safe pb-24 max-w-lg mx-auto">

                {/* Header - Touch-friendly */}
                <div className="flex items-center justify-between py-4 sticky top-0 bg-gray-900/95 backdrop-blur-sm z-10 -mx-4 px-4">
                    <div className="flex items-center gap-2">
                        <OroLogo size={36} showText={false} />
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-1.5">
                                <span className="text-orange-500">OroNext</span>
                                <span className="text-gray-300">Pulse</span>
                                <Zap className="w-4 h-4 text-yellow-400" />
                            </h1>
                            <p className="text-gray-500 text-[10px]">Live Store Monitor</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-3 rounded-full bg-gray-800 active:bg-gray-700 active:scale-95 transition-transform touch-manipulation"
                        style={{ minWidth: '48px', minHeight: '48px' }}
                    >
                        <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Live Sales Counter - Main Focus */}
                <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 rounded-3xl p-5 mb-4 shadow-xl shadow-orange-500/30">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="text-orange-100 text-xs font-medium uppercase tracking-wide">Today's Sales</p>
                            <p
                                className="font-black text-white mt-1 tabular-nums"
                                style={{ fontSize: 'clamp(1.75rem, 8vw, 2.5rem)' }}
                            >
                                ${stats.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            {/* Yesterday Comparison */}
                            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-semibold ${isUp ? 'bg-green-500/30 text-green-100' : 'bg-red-500/30 text-red-100'}`}>
                                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                <span>{isUp ? '+' : ''}{vsYesterday.toFixed(1)}% vs yesterday</span>
                            </div>
                        </div>
                        <div className="text-right bg-white/10 rounded-2xl px-3 py-2">
                            <p className="text-orange-200 text-[10px] uppercase tracking-wide">This Week</p>
                            <p className="font-bold tabular-nums" style={{ fontSize: 'clamp(1rem, 4vw, 1.25rem)' }}>${stats.weekSales.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Stats Row - Equal width boxes */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/20">
                        <div className="text-center">
                            <p className="text-orange-200 text-[10px] uppercase">Transactions</p>
                            <p className="font-bold tabular-nums" style={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)' }}>{stats.transactionCount}</p>
                        </div>
                        <div className="text-center border-x border-white/20">
                            <p className="text-orange-200 text-[10px] uppercase">Avg Ticket</p>
                            <p className="font-bold tabular-nums" style={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)' }}>${stats.averageTicket.toFixed(0)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-orange-200 text-[10px] uppercase">Last Hour</p>
                            <p className="font-bold tabular-nums" style={{ fontSize: 'clamp(1rem, 5vw, 1.25rem)' }}>${stats.lastHourSales.toFixed(0)}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Row - Big Touch Targets */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {/* Employees On Clock */}
                    <div className="bg-blue-900/30 border border-blue-500/50 rounded-xl p-3 text-center">
                        <Users className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-blue-400">{employeesOnClock.length}</p>
                        <p className="text-gray-400 text-xs">On Clock</p>
                    </div>
                    {/* Low Stock */}
                    <div className={`rounded-xl p-3 text-center ${lowStockCount > 0 ? 'bg-red-900/30 border border-red-500/50' : 'bg-gray-800/50 border border-gray-700'}`}>
                        <Package className={`w-5 h-5 mx-auto mb-1 ${lowStockCount > 0 ? 'text-red-400' : 'text-gray-500'}`} />
                        <p className={`text-xl font-bold ${lowStockCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>{lowStockCount}</p>
                        <p className="text-gray-400 text-xs">Low Stock</p>
                    </div>
                    {/* Open Drawers */}
                    <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-3 text-center">
                        <Wallet className="w-5 h-5 text-green-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-green-400">{cashDrawers.length}</p>
                        <p className="text-gray-400 text-xs">Drawers Open</p>
                    </div>
                </div>

                {/* Void/Delete Alerts */}
                {voidAlerts.length > 0 && (
                    <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <h3 className="font-semibold text-red-400">Void Alerts</h3>
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{voidAlerts.length}</span>
                        </div>
                        <div className="space-y-2">
                            {voidAlerts.slice(0, 3).map(alert => (
                                <div key={alert.id} className="bg-red-950/50 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-red-300 font-medium">{alert.productName}</span>
                                        <span className="text-red-400">${alert.amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-gray-400 text-xs">{alert.employeeName}</span>
                                        <span className="text-gray-500 text-xs">{alert.time}</span>
                                    </div>
                                    {alert.reason && <p className="text-gray-500 text-xs mt-1">Reason: {alert.reason}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Employees On Clock List */}
                {employeesOnClock.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-5 h-5 text-blue-400" />
                            <h3 className="font-semibold text-white">Who's Working</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {employeesOnClock.map((emp, idx) => (
                                <div key={idx} className="bg-blue-900/30 border border-blue-500/30 rounded-lg px-3 py-2">
                                    <p className="text-white text-sm font-medium">{emp.name}</p>
                                    <p className="text-blue-300 text-xs">{emp.hours}h since {emp.since}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cash Drawers */}
                {cashDrawers.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-5 h-5 text-green-400" />
                            <h3 className="font-semibold text-white">Cash Drawers</h3>
                        </div>
                        <div className="space-y-2">
                            {cashDrawers.map(drawer => (
                                <div key={drawer.id} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                                    <div>
                                        <p className="text-white font-medium">{drawer.location}</p>
                                        <p className="text-gray-500 text-xs">{drawer.employee} • Opened {drawer.openedAt}</p>
                                    </div>
                                    <p className="text-green-400 font-medium">${drawer.startingCash.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Sellers Today */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Package className="w-5 h-5 text-green-400" />
                        <h3 className="font-semibold text-white">Top Sellers Today</h3>
                    </div>
                    {topSellers.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No sales yet today</p>
                    ) : (
                        <div className="space-y-2">
                            {topSellers.slice(0, 5).map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-gray-600'}`}>
                                            {idx + 1}
                                        </span>
                                        <span className="text-white text-sm">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-400 font-medium">${item.revenue.toFixed(2)}</p>
                                        <p className="text-gray-500 text-xs">{item.quantity} sold</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* High Value Transactions */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-semibold text-white">High Value Sales</h3>
                        <span className="text-gray-500 text-xs">($100+)</span>
                    </div>
                    {highValueTxs.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No high-value transactions today</p>
                    ) : (
                        <div className="space-y-2">
                            {highValueTxs.slice(0, 5).map((tx) => (
                                <div key={tx.id} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                                    <div>
                                        <p className="text-white font-medium">${tx.total.toFixed(2)}</p>
                                        <p className="text-gray-500 text-xs">{tx.itemCount} items • {tx.employeeName}</p>
                                    </div>
                                    <span className="text-gray-400 text-xs">{tx.time}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Last Updated */}
                <div className="text-center text-gray-500 text-xs py-4">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                    <br />
                    <span className="text-gray-600">Auto-refreshes every 30 seconds</span>
                </div>
            </div>
        </div>
    )
}

