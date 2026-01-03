'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Package, AlertTriangle, TrendingUp, Zap, ShoppingCart,
    RefreshCw, CheckCircle, Clock, Store, ChevronRight, Sparkles,
    Plus, FileText, Truck, DollarSign
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface ReorderItem {
    productId: string
    name: string
    barcode: string | null
    sku: string | null
    currentStock: number
    reorderPoint: number
    suggestedQty: number
    cost: number
    supplier: string | null
    daysUntilStockout: number | null
    velocity: number // Units sold per day
    locationId: string
    locationName: string
}

interface OrderSuggestion {
    supplierId: string
    supplierName: string
    items: ReorderItem[]
    totalItems: number
    totalCost: number
    urgency: 'critical' | 'high' | 'normal'
}

interface DashboardData {
    criticalCount: number
    warningCount: number
    suggestedOrders: OrderSuggestion[]
    recentOrders: {
        id: string
        supplier: string
        status: string
        itemCount: number
        totalCost: number
        createdAt: string
    }[]
    locations: { id: string; name: string }[]
}

export default function SmartOrderingPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState<string>('all')
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/inventory/smart-ordering?locationId=${selectedLocation}`)
            if (res.ok) {
                const json = await res.json()
                setData(json)
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [selectedLocation])

    const handleAutoGenerate = async () => {
        setGenerating(true)
        setSuccessMessage(null)
        try {
            const res = await fetch('/api/inventory/purchase-orders/auto-generate', {
                method: 'POST'
            })
            const result = await res.json()
            if (res.ok) {
                setSuccessMessage(`Created ${result.ordersCreated} purchase order(s)`)
                fetchData() // Refresh
            }
        } catch (error) {
            console.error('Failed to generate:', error)
        }
        setGenerating(false)
    }

    const handleQuickOrder = async (suggestion: OrderSuggestion) => {
        setGenerating(true)
        try {
            // Get first location
            const locationId = data?.locations[0]?.id
            if (!locationId) return

            const res = await fetch('/api/inventory/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: suggestion.supplierId,
                    locationId,
                    status: 'DRAFT',
                    items: suggestion.items.map(item => ({
                        productId: item.productId,
                        quantity: item.suggestedQty,
                        unitCost: item.cost
                    }))
                })
            })

            if (res.ok) {
                setSuccessMessage(`Created PO for ${suggestion.supplierName}`)
                fetchData()
            }
        } catch (error) {
            console.error('Failed to create order:', error)
        }
        setGenerating(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Sparkles className="h-8 w-8 text-orange-400" />
                            Smart Ordering
                        </h1>
                        <p className="text-stone-400">AI-powered reorder suggestions & one-click ordering</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {data?.locations && data.locations.length > 1 && (
                        <select
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2"
                        >
                            <option value="all">All Locations</option>
                            {data.locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    )}
                    <button
                        onClick={handleAutoGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium disabled:opacity-50"
                    >
                        <Zap className={`h-4 w-4 ${generating ? 'animate-pulse' : ''}`} />
                        Auto-Generate All POs
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg font-medium"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 mb-6 flex items-center gap-3 text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                    {successMessage}
                    <button onClick={() => setSuccessMessage(null)} className="ml-auto text-emerald-300 hover:text-white">✕</button>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-red-600/30 to-red-900/30 border border-red-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <span className="text-sm text-stone-400">Critical (Out Soon)</span>
                    </div>
                    <p className="text-3xl font-bold text-red-400">{data?.criticalCount || 0}</p>
                    <p className="text-xs text-stone-500 mt-1">Items to reorder immediately</p>
                </div>
                <div className="bg-gradient-to-br from-amber-600/30 to-amber-900/30 border border-amber-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-amber-400" />
                        <span className="text-sm text-stone-400">Low Stock</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{data?.warningCount || 0}</p>
                    <p className="text-xs text-stone-500 mt-1">Items below reorder point</p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Suggested POs</span>
                    </div>
                    <p className="text-3xl font-bold">{data?.suggestedOrders?.length || 0}</p>
                    <p className="text-xs text-stone-500 mt-1">Ready to create</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/30 to-purple-900/30 border border-purple-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-purple-400" />
                        <span className="text-sm text-stone-400">Est. Order Value</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {formatCurrency(data?.suggestedOrders?.reduce((s, o) => s + o.totalCost, 0) || 0)}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">Total suggested orders</p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Suggested Orders - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-orange-400" />
                        AI Order Suggestions
                    </h2>

                    {data?.suggestedOrders?.length === 0 && (
                        <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-8 text-center text-stone-400">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                            <p className="text-lg font-medium">All stocked up!</p>
                            <p className="text-sm">No items need reordering at this time</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {data?.suggestedOrders?.map((order, idx) => (
                            <div
                                key={idx}
                                className={`bg-stone-900/80 border rounded-2xl p-5 ${order.urgency === 'critical' ? 'border-red-500/50' :
                                    order.urgency === 'high' ? 'border-amber-500/50' : 'border-stone-700'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${order.urgency === 'critical' ? 'bg-red-500/20' :
                                            order.urgency === 'high' ? 'bg-amber-500/20' : 'bg-blue-500/20'
                                            }`}>
                                            <Truck className={`h-5 w-5 ${order.urgency === 'critical' ? 'text-red-400' :
                                                order.urgency === 'high' ? 'text-amber-400' : 'text-blue-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold">{order.supplierName}</h3>
                                            <p className="text-sm text-stone-400">{order.totalItems} items</p>
                                        </div>
                                        {order.urgency === 'critical' && (
                                            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full">
                                                URGENT
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-emerald-400">
                                            {formatCurrency(order.totalCost)}
                                        </span>
                                        <button
                                            onClick={() => handleQuickOrder(order)}
                                            disabled={generating}
                                            className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium text-sm disabled:opacity-50"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Create PO
                                        </button>
                                    </div>
                                </div>

                                {/* Items Preview */}
                                <div className="bg-stone-800/50 rounded-xl p-3">
                                    <div className="grid grid-cols-4 gap-2 text-xs text-stone-500 pb-2 border-b border-stone-700">
                                        <span>Product</span>
                                        <span className="text-center">Stock</span>
                                        <span className="text-center">Order Qty</span>
                                        <span className="text-right">Cost</span>
                                    </div>
                                    {order.items.slice(0, 3).map((item, i) => (
                                        <div key={i} className="grid grid-cols-4 gap-2 py-2 text-sm border-b border-stone-800 last:border-0">
                                            <span className="truncate">{item.name}</span>
                                            <span className={`text-center ${item.currentStock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                                                {item.currentStock}
                                            </span>
                                            <span className="text-center font-medium text-emerald-400">+{item.suggestedQty}</span>
                                            <span className="text-right">{formatCurrency(item.suggestedQty * item.cost)}</span>
                                        </div>
                                    ))}
                                    {order.items.length > 3 && (
                                        <p className="text-center text-stone-500 text-xs py-2">
                                            +{order.items.length - 3} more items
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-bold mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            <Link
                                href="/dashboard/inventory/purchase-orders"
                                className="flex items-center justify-between p-3 bg-stone-800/50 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-400" />
                                    View All Orders
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/inventory/retail"
                                className="flex items-center justify-between p-3 bg-stone-800/50 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-orange-400" />
                                    Inventory
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/inventory/alerts"
                                className="flex items-center justify-between p-3 bg-stone-800/50 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                                    Stock Alerts
                                </span>
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                        <h3 className="font-bold mb-4">Recent Orders</h3>
                        {data?.recentOrders?.length === 0 ? (
                            <p className="text-stone-500 text-sm text-center py-4">No recent orders</p>
                        ) : (
                            <div className="space-y-3">
                                {data?.recentOrders?.slice(0, 5).map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">{order.supplier}</p>
                                            <p className="text-xs text-stone-500">{order.itemCount} items</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-emerald-400">{formatCurrency(order.totalCost)}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                                order.status === 'ORDERED' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-stone-700 text-stone-400'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {loading && !data && (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
                </div>
            )}
        </div>
    )
}

