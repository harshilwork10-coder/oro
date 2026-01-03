'use client'

import { TrendingUp, TrendingDown, DollarSign, Package, Users, Store, AlertTriangle } from 'lucide-react'
import type { LiveStats, StoreBreakdown, TopSeller, LowStockItem, EmployeeOnClock, PaymentBreakdown } from './types'

interface PulseSalesTabProps {
    stats: LiveStats
    storeBreakdown: StoreBreakdown[]
    topSellers: TopSeller[]
    lowStockItems: LowStockItem[]
    employeesOnClock: EmployeeOnClock[]
    paymentBreakdown: PaymentBreakdown
    taxCollected: number
    voidCount: number
    refundCount: number
    lastRefresh: Date
    onRefresh: () => void
}

export default function PulseSalesTab({
    stats,
    storeBreakdown,
    topSellers,
    lowStockItems,
    employeesOnClock,
    paymentBreakdown,
    taxCollected,
    voidCount,
    refundCount,
    lastRefresh,
    onRefresh
}: PulseSalesTabProps) {
    const salesChange = stats.yesterdaySales > 0
        ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100
        : 0

    return (
        <>
            {/* Big Sales Hero Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 mb-4 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wider">Today's Sales</p>
                        <h2 className="text-3xl font-bold text-white mt-1">
                            ${stats.todaySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </h2>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${salesChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                        {salesChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {Math.abs(salesChange).toFixed(1)}%
                    </div>
                </div>
                <p className="text-gray-500 text-xs">
                    vs ${stats.yesterdaySales.toLocaleString()} yesterday
                </p>
                <p className="text-xs text-gray-600 mt-2">
                    Last updated: {lastRefresh.toLocaleTimeString()}
                </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700">
                    <DollarSign className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                    <p className="text-lg font-bold text-white">${stats.weekSales.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500 uppercase">This Week</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700">
                    <Package className="w-4 h-4 mx-auto text-green-400 mb-1" />
                    <p className="text-lg font-bold text-white">{stats.transactionCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Orders Today</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center border border-gray-700">
                    <TrendingUp className="w-4 h-4 mx-auto text-orange-400 mb-1" />
                    <p className="text-lg font-bold text-white">${stats.averageTicket.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Avg Ticket</p>
                </div>
            </div>

            {/* Actions Row */}
            <div className="flex gap-3 mb-4">
                {voidCount > 0 && (
                    <div className="flex-1 bg-red-900/30 border border-red-500/30 rounded-lg p-2 text-center">
                        <p className="text-red-400 text-xs">{voidCount} Voids</p>
                    </div>
                )}
                {refundCount > 0 && (
                    <div className="flex-1 bg-orange-900/30 border border-orange-500/30 rounded-lg p-2 text-center">
                        <p className="text-orange-400 text-xs">{refundCount} Refunds</p>
                    </div>
                )}
            </div>

            {/* Per-Store Breakdown */}
            {storeBreakdown.length > 1 && (
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Store className="w-4 h-4 text-orange-400" />
                        By Store
                    </h3>
                    <div className="space-y-2">
                        {storeBreakdown.map(store => (
                            <div key={store.id} className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
                                <div>
                                    <p className="text-white text-sm font-medium">{store.name}</p>
                                    <p className="text-gray-500 text-xs">{store.transactionCount} orders</p>
                                </div>
                                <p className="text-green-400 font-bold">${store.todaySales.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Who's Working */}
            {employeesOnClock.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        On Clock ({employeesOnClock.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {employeesOnClock.map((emp, idx) => (
                            <div key={idx} className="bg-blue-900/30 border border-blue-500/30 rounded-lg px-3 py-2">
                                <p className="text-white text-sm">{emp.name}</p>
                                <p className="text-blue-300 text-xs">{emp.location} • {emp.since}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Sellers */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-green-400" />
                    Top Sellers Today
                </h3>
                {topSellers.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No sales yet</p>
                ) : (
                    <div className="space-y-2">
                        {topSellers.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-gray-600'}`}>
                                        {idx + 1}
                                    </span>
                                    <span className="text-sm">{item.name}</span>
                                </div>
                                <span className="text-green-400 text-sm font-medium">${item.revenue.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Payment Breakdown */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 mb-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    💵 Payment Breakdown
                </h3>
                {(() => {
                    const total = paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.other
                    const cashPct = total > 0 ? (paymentBreakdown.cash / total) * 100 : 0
                    const cardPct = total > 0 ? (paymentBreakdown.card / total) * 100 : 0
                    return (
                        <>
                            <div className="h-4 rounded-full overflow-hidden bg-gray-700 flex mb-2">
                                <div className="bg-green-500 h-full" style={{ width: `${cashPct}%` }} title="Cash" />
                                <div className="bg-blue-500 h-full" style={{ width: `${cardPct}%` }} title="Card" />
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Cash ${paymentBreakdown.cash.toFixed(2)}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Card ${paymentBreakdown.card.toFixed(2)}
                                </span>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between text-xs">
                                <span className="text-gray-400">Tax Collected</span>
                                <span className="text-purple-400 font-bold">${taxCollected.toFixed(2)}</span>
                            </div>
                        </>
                    )
                })()}
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
                <div className="bg-red-900/20 rounded-xl p-4 border border-red-500/30">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        Low Stock ({lowStockItems.length})
                    </h3>
                    <div className="space-y-2">
                        {lowStockItems.slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                                <span className="text-white text-sm">{item.name}</span>
                                <span className="text-red-400 text-sm font-medium">{item.stock} left</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}
