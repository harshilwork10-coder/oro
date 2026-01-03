'use client'

import { useState } from 'react'
import {
    ShoppingBag,
    Plus,
    Search,
    Filter,
    Truck,
    AlertCircle,
    CheckCircle,
    Clock,
    FileText,
    MoreVertical,
    ArrowRight
} from 'lucide-react'

// Mock Data for Purchase Orders
const initialOrders = [
    {
        id: 'PO-1023',
        supplier: 'Loreal Professional',
        date: 'Oct 24, 2023',
        status: 'RECEIVED',
        items: 12,
        total: 1250.00,
        expected: 'Oct 28, 2023'
    },
    {
        id: 'PO-1024',
        supplier: 'Salon Centric',
        date: 'Nov 02, 2023',
        status: 'ORDERED',
        items: 8,
        total: 840.50,
        expected: 'Nov 06, 2023'
    },
    {
        id: 'PO-1025',
        supplier: 'EcoHeads',
        date: 'Nov 05, 2023',
        status: 'DRAFT',
        items: 3,
        total: 450.00,
        expected: '-'
    },
    {
        id: 'PO-1026',
        supplier: 'Dyson Professional',
        date: 'Nov 05, 2023',
        status: 'PENDING_APPROVAL',
        items: 2,
        total: 899.00,
        expected: 'Nov 10, 2023'
    }
]

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState(initialOrders)

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
                    <button className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-lg border border-stone-700 flex items-center gap-2 transition-colors">
                        <Truck className="h-4 w-4" />
                        Suppliers
                    </button>
                    <button className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-orange-900/20">
                        <Plus className="h-4 w-4" />
                        New Order
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-xl border-l-4 border-blue-500">
                    <p className="text-sm text-stone-500 mb-1">Open Orders</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">3</span>
                        <span className="text-xs font-medium text-blue-400">In Transit</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-orange-500">
                    <p className="text-sm text-stone-500 mb-1">Drafts</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">1</span>
                        <span className="text-xs font-medium text-orange-400">Needs Review</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-emerald-500">
                    <p className="text-sm text-stone-500 mb-1">Received (Month)</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">$4,250</span>
                        <span className="text-xs font-medium text-emerald-400">12 Orders</span>
                    </div>
                </div>
                <div className="glass-panel p-4 rounded-xl border-l-4 border-red-500">
                    <p className="text-sm text-stone-500 mb-1">Low Stock Alerts</p>
                    <div className="flex items-end justify-between">
                        <span className="text-2xl font-bold text-stone-100">5</span>
                        <span className="text-xs font-medium text-red-400">Items Critical</span>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-4 border-b border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search orders, suppliers, or PO#..."
                            className="w-full bg-stone-900/50 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                    </div>
                    <button className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg flex items-center gap-2 transition-colors text-sm">
                        <Filter className="h-4 w-4" />
                        Filter Status
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-stone-400">
                        <thead className="bg-stone-900/50 text-stone-300 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-3">PO Number</th>
                                <th className="px-6 py-3">Supplier</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Items</th>
                                <th className="px-6 py-3 text-right">Total</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-stone-800/30 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-stone-200 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-stone-500" />
                                        {order.id}
                                    </td>
                                    <td className="px-6 py-4">{order.supplier}</td>
                                    <td className="px-6 py-4">{order.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                            ${order.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                order.status === 'ORDERED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    order.status === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                        'bg-stone-500/10 text-stone-400 border-stone-500/20'}`}>
                                            {order.status === 'RECEIVED' && <CheckCircle className="w-3 h-3 mr-1" />}
                                            {order.status === 'ORDERED' && <Truck className="w-3 h-3 mr-1" />}
                                            {order.status === 'PENDING_APPROVAL' && <AlertCircle className="w-3 h-3 mr-1" />}
                                            {order.status === 'DRAFT' && <FileText className="w-3 h-3 mr-1" />}
                                            {order.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">{order.items}</td>
                                    <td className="px-6 py-4 text-right font-medium text-stone-200">${order.total.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-stone-800 rounded-lg text-stone-500 hover:text-orange-400 transition-colors">
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

