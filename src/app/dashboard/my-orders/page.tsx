'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Package, Search, ChevronDown, ChevronUp } from 'lucide-react'
import OrderTracker from '@/components/tracking/OrderTracker'

interface OrderRequest {
    id: string
    numberOfStations: number
    status: string
    createdAt: string
    approvedAt?: string | null
    contractSignedAt?: string | null
    shippingStatus?: string | null
    shippedAt?: string | null
    estimatedDelivery?: string | null
    deliveredAt?: string | null
    trackingNumber?: string | null
    carrier?: string | null
    location?: {
        name: string
        address: string
    } | null
}

export default function MyOrdersPage() {
    const { data: session } = useSession()
    const [orders, setOrders] = useState<OrderRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/franchisor/my-orders')
            if (res.ok) {
                const data = await res.json()
                setOrders(data.orders || [])
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = orders.filter(order =>
        order.location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.location?.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.trackingNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (order: OrderRequest) => {
        if (order.shippingStatus === 'DELIVERED') {
            return <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">Delivered</span>
        }
        if (order.shippingStatus === 'SHIPPED') {
            return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">Shipped</span>
        }
        if (order.contractSignedAt) {
            return <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium">Processing</span>
        }
        if (order.approvedAt) {
            return <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-medium">Awaiting Signature</span>
        }
        return <span className="px-3 py-1 bg-stone-500/20 text-stone-400 rounded-full text-xs font-medium">Pending</span>
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                    <Package className="h-8 w-8 text-purple-500" />
                    My Orders
                </h1>
                <p className="text-stone-400 mt-1">Track your hardware orders and deliveries</p>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                <input
                    type="text"
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-400">No orders found</p>
                    </div>
                ) : (
                    filteredOrders.map((order) => (
                        <div key={order.id} className="glass-panel rounded-xl overflow-hidden">
                            {/* Order Header */}
                            <div
                                className="p-6 cursor-pointer hover:bg-stone-900/30 transition-colors"
                                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-stone-100">
                                                {order.location?.name || 'Unknown Location'}
                                            </h3>
                                            {getStatusBadge(order)}
                                        </div>
                                        <p className="text-sm text-stone-400">{order.location?.address}</p>
                                        <p className="text-xs text-stone-500 mt-1">
                                            {order.numberOfStations} {order.numberOfStations === 1 ? 'Station' : 'Stations'} •
                                            Ordered {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                                        {expandedOrder === order.id ? (
                                            <ChevronUp className="h-5 w-5 text-stone-400" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-stone-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Order Details (Expanded) */}
                            {expandedOrder === order.id && (
                                <div className="px-6 pb-6 border-t border-stone-800 pt-6 animate-in slide-in-from-top-4">
                                    <OrderTracker request={order} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
