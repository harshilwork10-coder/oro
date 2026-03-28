'use client'

import { useState, useEffect } from 'react'
import {
    ShoppingBag, Plus, Search, Filter, Truck, AlertCircle,
    CheckCircle, FileText, ArrowRight, PackageOpen, X
} from 'lucide-react'

interface PurchaseOrder {
    id: string;
    status: string;
    totalCost: number;
    expectedDate: string | null;
    createdAt: string;
    supplier: { id: string; name: string };
    location: { id: string; name: string };
    items: { id: string; quantity: number; unitCost: number; totalCost: number; product: { id: string; name: string; stock: number } }[];
}

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('ALL')

    async function fetchOrders() {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (statusFilter !== 'ALL') params.set('status', statusFilter)
            const res = await fetch(`/api/inventory/purchase-orders?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setOrders(data.data || [])
            }
        } catch { /* ignore */ }
        setLoading(false)
    }

    useEffect(() => { fetchOrders() }, [statusFilter])

    const openOrders = orders.filter(o => o.status === 'ORDERED').length
    const drafts = orders.filter(o => o.status === 'DRAFT').length
    const receivedTotal = orders.filter(o => o.status === 'RECEIVED')
        .reduce((sum, o) => sum + Number(o.totalCost || 0), 0)
    const receivedCount = orders.filter(o => o.status === 'RECEIVED').length

    const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    return (
        <div className="p-4 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <ShoppingBag className="h-8 w-8 text-orange-500" />
                        Purchase Orders
                    </h1>
                    <p className="text-stone-400 mt-2">Manage inventory replenishment and supplier orders</p>
                </div>
                <div className="flex items-center gap-3">
                    <a href="/dashboard/inventory/suppliers" className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg border border-stone-700 flex items-center gap-2 transition-colors">
                        <Truck className="h-4 w-4" />
                        Suppliers
                    </a>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Open Orders</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">{openOrders}</span>
                        <span className="text-xs font-medium text-blue-400">In Transit</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-orange-500">
                    <p className="text-sm text-stone-500 mb-1">Drafts</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">{drafts}</span>
                        <span className="text-xs font-medium text-orange-400">Pending</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Received</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">{fmt(receivedTotal)}</span>
                        <span className="text-xs font-medium text-emerald-400">{receivedCount} Orders</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-purple-500">
                    <p className="text-sm text-stone-500 mb-1">Total Orders</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">{orders.length}</span>
                        <span className="text-xs font-medium text-purple-400">All Time</span>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        {['ALL', 'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-orange-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'}`}
                            >{s}</button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-stone-500">Loading purchase orders...</div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <PackageOpen className="h-16 w-16 text-stone-700 mb-4" />
                        <h3 className="text-lg font-semibold text-stone-300 mb-2">No Purchase Orders</h3>
                        <p className="text-stone-500 mb-6">{statusFilter !== 'ALL' ? `No ${statusFilter} orders found` : 'Create your first order to start tracking inventory'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-stone-400">
                            <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-3">PO #</th>
                                    <th className="px-6 py-3">Supplier</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Items</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-stone-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-stone-200 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-stone-500" />
                                            {order.id.slice(-8).toUpperCase()}
                                        </td>
                                        <td className="px-6 py-4">{order.supplier?.name || '—'}</td>
                                        <td className="px-6 py-4 text-stone-500">{order.location?.name || '—'}</td>
                                        <td className="px-6 py-4">{new Date(order.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                ${order.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    order.status === 'ORDERED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        'bg-stone-500/10 text-stone-400 border-stone-500/20'}`}>
                                                {order.status === 'RECEIVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                                                {order.status === 'ORDERED' && <Truck className="w-3 h-3 mr-1" />}
                                                {order.status === 'DRAFT' && <FileText className="w-3 h-3 mr-1" />}
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">{order.items?.length || 0}</td>
                                        <td className="px-6 py-4 text-right font-medium text-stone-200">{fmt(Number(order.totalCost || 0))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
