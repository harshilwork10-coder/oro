'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Truck, RefreshCw, Plus, X, Package,
    Store, Clock, CheckCircle, Search, DollarSign
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Supplier {
    id: string
    name: string
    contactName: string | null
    email: string | null
    phone: string | null
    orderCount: number
    productCount: number
}

interface OrderItem {
    id: string
    product: { id: string, name: string, sku: string | null }
    quantity: number
    unitCost: number
    totalCost: number
}

interface PurchaseOrder {
    id: string
    status: string
    totalCost: number
    expectedDate: string | null
    supplier: { id: string, name: string }
    location: { id: string, name: string }
    itemCount: number
    items: OrderItem[]
    createdAt: string
}

interface Location {
    id: string
    name: string
}

export default function VendorsPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [orderCounts, setOrderCounts] = useState({ draft: 0, ordered: 0, received: 0, total: 0 })
    const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders')
    const [statusFilter, setStatusFilter] = useState('all')
    const [showNewSupplier, setShowNewSupplier] = useState(false)
    const [showNewOrder, setShowNewOrder] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // New supplier form
    const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', email: '', phone: '' })

    // New order form
    const [orderForm, setOrderForm] = useState({ supplierId: '', locationId: '', expectedDate: '' })
    const [orderItems, setOrderItems] = useState<{ productId: string, name: string, quantity: number, unitCost: number }[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [productResults, setProductResults] = useState<{ id: string, name: string, sku: string, cost: number }[]>([])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/owner/vendors?type=all')
            const data = await res.json()

            setSuppliers(data.suppliers || [])
            setOrders(data.orders || [])
            setLocations(data.locations || [])
            setOrderCounts(data.orderCounts || { draft: 0, ordered: 0, received: 0, total: 0 })
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [statusFilter])

    const searchProducts = async (query: string) => {
        if (!query || query.length < 2) {
            setProductResults([])
            return
        }
        try {
            const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`)
            const data = await res.json()
            setProductResults(data.products?.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku || '',
                cost: p.cost || 0
            })) || [])
        } catch (error) {
            console.error('Search failed:', error)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(productSearch), 300)
        return () => clearTimeout(timer)
    }, [productSearch])

    const addOrderItem = (product: { id: string, name: string, sku: string, cost: number }) => {
        const existing = orderItems.find(i => i.productId === product.id)
        if (existing) {
            setOrderItems(orderItems.map(i =>
                i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ))
        } else {
            setOrderItems([...orderItems, {
                productId: product.id,
                name: product.name,
                quantity: 1,
                unitCost: product.cost
            }])
        }
        setProductSearch('')
        setProductResults([])
    }

    const createSupplier = async () => {
        if (!supplierForm.name) return
        setSaving(true)
        try {
            const res = await fetch('/api/owner/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'supplier', ...supplierForm })
            })
            if (res.ok) {
                setShowNewSupplier(false)
                setSupplierForm({ name: '', contactName: '', email: '', phone: '' })
                fetchData()
                setMessage('✓ Supplier created')
            }
        } catch (error) {
            setMessage('Failed to create supplier')
        } finally {
            setSaving(false)
        }
    }

    const createOrder = async () => {
        if (!orderForm.supplierId || !orderForm.locationId || orderItems.length === 0) {
            setMessage('Select supplier, location, and add items')
            return
        }
        setSaving(true)
        try {
            const res = await fetch('/api/owner/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'order',
                    ...orderForm,
                    items: orderItems
                })
            })
            if (res.ok) {
                setShowNewOrder(false)
                setOrderForm({ supplierId: '', locationId: '', expectedDate: '' })
                setOrderItems([])
                fetchData()
                setMessage('✓ PO created')
            }
        } catch (error) {
            setMessage('Failed to create order')
        } finally {
            setSaving(false)
        }
    }

    const handleOrderAction = async (orderId: string, action: string) => {
        try {
            const res = await fetch('/api/owner/vendors', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, action })
            })
            if (res.ok) {
                fetchData()
                setSelectedOrder(null)
                setMessage(`✓ Order ${action.toLowerCase()}ed`)
            }
        } catch (error) {
            setMessage('Action failed')
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-stone-500/20 text-stone-400'
            case 'ORDERED': return 'bg-blue-500/20 text-blue-400'
            case 'RECEIVED': return 'bg-emerald-500/20 text-emerald-400'
            case 'CANCELLED': return 'bg-red-500/20 text-red-400'
            default: return 'bg-stone-500/20 text-stone-400'
        }
    }

    const filteredOrders = statusFilter === 'all'
        ? orders
        : orders.filter(o => o.status === statusFilter)

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
                            <Truck className="h-8 w-8 text-cyan-500" />
                            Vendors & Purchasing
                        </h1>
                        <p className="text-stone-400">Manage suppliers and purchase orders</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => activeTab === 'orders' ? setShowNewOrder(true) : setShowNewSupplier(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl"
                    >
                        <Plus className="h-4 w-4" />
                        {activeTab === 'orders' ? 'New PO' : 'Add Supplier'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-4 py-2 rounded-xl ${activeTab === 'orders' ? 'bg-cyan-600' : 'bg-stone-800 text-stone-400'}`}
                >
                    Purchase Orders ({orderCounts.total})
                </button>
                <button
                    onClick={() => setActiveTab('suppliers')}
                    className={`px-4 py-2 rounded-xl ${activeTab === 'suppliers' ? 'bg-cyan-600' : 'bg-stone-800 text-stone-400'}`}
                >
                    Suppliers ({suppliers.length})
                </button>
            </div>

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <>
                    {/* Status Filter */}
                    <div className="flex gap-2 mb-6 flex-wrap">
                        {[
                            { key: 'all', label: 'All', count: orderCounts.total },
                            { key: 'DRAFT', label: 'Draft', count: orderCounts.draft },
                            { key: 'ORDERED', label: 'Ordered', count: orderCounts.ordered },
                            { key: 'RECEIVED', label: 'Received', count: orderCounts.received }
                        ].map(f => (
                            <button
                                key={f.key}
                                onClick={() => setStatusFilter(f.key)}
                                className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === f.key ? 'bg-stone-600' : 'bg-stone-800 text-stone-400'
                                    }`}
                            >
                                {f.label} ({f.count})
                            </button>
                        ))}
                    </div>

                    {/* Orders List */}
                    {filteredOrders.length === 0 ? (
                        <div className="text-center py-16 bg-stone-900/80 rounded-2xl border border-stone-700">
                            <Package className="h-12 w-12 mx-auto text-stone-600 mb-4" />
                            <p className="text-xl">No purchase orders</p>
                            <button
                                onClick={() => setShowNewOrder(true)}
                                className="mt-4 px-4 py-2 bg-cyan-600 rounded-lg"
                            >
                                Create First PO
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredOrders.map(order => (
                                <button
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className="w-full text-left bg-stone-900/80 border border-stone-700 hover:border-cyan-500/30 rounded-xl p-4"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{order.supplier.name}</p>
                                            <p className="text-sm text-stone-400">{order.location.name} • {order.itemCount} items</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                            <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(order.totalCost)}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Suppliers Tab */}
            {activeTab === 'suppliers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliers.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-stone-900/80 rounded-2xl border border-stone-700">
                            <Truck className="h-12 w-12 mx-auto text-stone-600 mb-4" />
                            <p className="text-xl">No suppliers yet</p>
                            <button
                                onClick={() => setShowNewSupplier(true)}
                                className="mt-4 px-4 py-2 bg-cyan-600 rounded-lg"
                            >
                                Add Supplier
                            </button>
                        </div>
                    ) : (
                        suppliers.map(supplier => (
                            <div key={supplier.id} className="bg-stone-900/80 border border-stone-700 rounded-xl p-4">
                                <p className="font-bold text-lg">{supplier.name}</p>
                                {supplier.contactName && <p className="text-stone-400 text-sm">{supplier.contactName}</p>}
                                {supplier.email && <p className="text-stone-500 text-sm">{supplier.email}</p>}
                                {supplier.phone && <p className="text-stone-500 text-sm">{supplier.phone}</p>}
                                <div className="flex gap-4 mt-3 text-sm text-stone-400">
                                    <span>{supplier.orderCount} orders</span>
                                    <span>{supplier.productCount} products</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* New Supplier Modal */}
            {showNewSupplier && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-md">
                        <div className="flex justify-between items-center p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold">Add Supplier</h2>
                            <button onClick={() => setShowNewSupplier(false)} className="p-2 hover:bg-stone-800 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-sm text-stone-400">Name *</label>
                                <input
                                    type="text"
                                    value={supplierForm.name}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                    placeholder="Republic National Distributing"
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-stone-400">Contact Name</label>
                                <input
                                    type="text"
                                    value={supplierForm.contactName}
                                    onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-stone-400">Email</label>
                                    <input
                                        type="email"
                                        value={supplierForm.email}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-stone-400">Phone</label>
                                    <input
                                        type="tel"
                                        value={supplierForm.phone}
                                        onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            <button onClick={() => setShowNewSupplier(false)} className="flex-1 py-3 bg-stone-700 rounded-xl">
                                Cancel
                            </button>
                            <button onClick={createSupplier} disabled={saving} className="flex-1 py-3 bg-cyan-600 rounded-xl disabled:opacity-50">
                                {saving ? 'Saving...' : 'Add Supplier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Order Modal */}
            {showNewOrder && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold">New Purchase Order</h2>
                            <button onClick={() => setShowNewOrder(false)} className="p-2 hover:bg-stone-800 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-stone-400">Supplier *</label>
                                    <select
                                        value={orderForm.supplierId}
                                        onChange={(e) => setOrderForm({ ...orderForm, supplierId: e.target.value })}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    >
                                        <option value="">Select supplier...</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-stone-400">Receiving Location *</label>
                                    <select
                                        value={orderForm.locationId}
                                        onChange={(e) => setOrderForm({ ...orderForm, locationId: e.target.value })}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    >
                                        <option value="">Select location...</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-stone-400">Expected Delivery</label>
                                <input
                                    type="date"
                                    value={orderForm.expectedDate}
                                    onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>

                            <div>
                                <label className="text-sm text-stone-400">Add Products</label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        placeholder="Search products..."
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl"
                                    />
                                </div>
                                {productResults.length > 0 && (
                                    <div className="mt-2 bg-stone-800 rounded-xl overflow-hidden border border-stone-700">
                                        {productResults.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addOrderItem(p)}
                                                className="w-full px-4 py-3 text-left hover:bg-stone-700 border-b border-stone-700 last:border-0"
                                            >
                                                <p>{p.name}</p>
                                                <p className="text-sm text-stone-400">Cost: {formatCurrency(p.cost)}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {orderItems.length > 0 && (
                                <div>
                                    <label className="text-sm text-stone-400">Order Items ({orderItems.length})</label>
                                    <div className="mt-2 space-y-2">
                                        {orderItems.map(item => (
                                            <div key={item.productId} className="flex items-center justify-between bg-stone-800 p-3 rounded-xl">
                                                <span className="flex-1">{item.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => setOrderItems(orderItems.map(i =>
                                                            i.productId === item.productId ? { ...i, quantity: parseInt(e.target.value) || 1 } : i
                                                        ))}
                                                        className="w-16 bg-stone-700 rounded px-2 py-1 text-center"
                                                    />
                                                    <span className="text-stone-400">×</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.unitCost}
                                                        onChange={(e) => setOrderItems(orderItems.map(i =>
                                                            i.productId === item.productId ? { ...i, unitCost: parseFloat(e.target.value) || 0 } : i
                                                        ))}
                                                        className="w-20 bg-stone-700 rounded px-2 py-1"
                                                    />
                                                    <span className="w-20 text-right text-emerald-400">{formatCurrency(item.quantity * item.unitCost)}</span>
                                                    <button
                                                        onClick={() => setOrderItems(orderItems.filter(i => i.productId !== item.productId))}
                                                        className="p-1 text-red-400"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-between p-3 font-bold">
                                            <span>Total</span>
                                            <span className="text-emerald-400">
                                                {formatCurrency(orderItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            <button onClick={() => setShowNewOrder(false)} className="flex-1 py-3 bg-stone-700 rounded-xl">
                                Cancel
                            </button>
                            <button
                                onClick={createOrder}
                                disabled={saving || !orderForm.supplierId || !orderForm.locationId || orderItems.length === 0}
                                className="flex-1 py-3 bg-cyan-600 rounded-xl disabled:opacity-50"
                            >
                                {saving ? 'Creating...' : 'Create PO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-lg">
                        <div className="flex justify-between items-center p-5 border-b border-stone-700">
                            <div>
                                <h2 className="text-xl font-bold">{selectedOrder.supplier.name}</h2>
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedOrder.status)}`}>
                                    {selectedOrder.status}
                                </span>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-stone-800 rounded">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-stone-400">Location</span>
                                <span>{selectedOrder.location.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-stone-400">Total</span>
                                <span className="text-emerald-400 font-bold">{formatCurrency(selectedOrder.totalCost)}</span>
                            </div>

                            <div className="bg-stone-800 rounded-xl p-4">
                                <p className="text-sm text-stone-400 mb-2">Items ({selectedOrder.itemCount})</p>
                                <div className="space-y-2">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span>{item.product.name}</span>
                                            <span>{item.quantity} × {formatCurrency(item.unitCost)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            {selectedOrder.status === 'DRAFT' && (
                                <>
                                    <button
                                        onClick={() => handleOrderAction(selectedOrder.id, 'CANCEL')}
                                        className="flex-1 py-3 bg-red-600 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleOrderAction(selectedOrder.id, 'ORDER')}
                                        className="flex-1 py-3 bg-blue-600 rounded-xl"
                                    >
                                        Submit Order
                                    </button>
                                </>
                            )}
                            {selectedOrder.status === 'ORDERED' && (
                                <button
                                    onClick={() => handleOrderAction(selectedOrder.id, 'RECEIVE')}
                                    className="flex-1 py-3 bg-emerald-600 rounded-xl"
                                >
                                    Mark Received
                                </button>
                            )}
                            {['RECEIVED', 'CANCELLED'].includes(selectedOrder.status) && (
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="flex-1 py-3 bg-stone-700 rounded-xl"
                                >
                                    Close
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
