'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
    ShoppingBag, Plus, Search, Filter, Truck, AlertCircle,
    CheckCircle, FileText, ArrowRight, PackageOpen, X,
    RefreshCw, ChevronRight, Store
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

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

interface Supplier {
    id: string;
    name: string;
}

interface Location {
    id: string;
    name: string;
}

export default function PurchaseOrdersPage() {
    const supplierSelectRef = useRef<HTMLSelectElement>(null)
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('ALL')

    // Create PO state
    const [showCreate, setShowCreate] = useState(false)
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedSupplierId, setSelectedSupplierId] = useState('')
    const [selectedLocationId, setSelectedLocationId] = useState('')
    const [expectedDate, setExpectedDate] = useState('')
    const [poItems, setPOItems] = useState<{ productId: string; name: string; quantity: number; unitCost: number }[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<{ id: string; name: string; sku: string; cost: number; stock: number }[]>([])
    const [saving, setSaving] = useState(false)
    const [poError, setPOError] = useState('')

    // Detail modal state
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
    const [actionLoading, setActionLoading] = useState(false)

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

    async function fetchCreateData() {
        try {
            const [supplierRes, locationRes] = await Promise.all([
                fetch('/api/inventory/suppliers'),
                fetch('/api/dashboard/multi-store')
            ])
            if (supplierRes.ok) {
                const d = await supplierRes.json()
                setSuppliers(d.data || d.suppliers || [])
            }
            if (locationRes.ok) {
                const d = await locationRes.json()
                setLocations(d.locations?.map((l: any) => ({ id: l.location.id, name: l.location.name })) || [])
            }
        } catch {
            console.error('Failed to fetch suppliers/locations')
        }
    }

    useEffect(() => { fetchOrders() }, [statusFilter])

    // Escape key handler for modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedOrder) setSelectedOrder(null)
                else if (showCreate) setShowCreate(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showCreate, selectedOrder])

    // Product search for adding items to PO
    useEffect(() => {
        if (searchQuery.length < 2) { setSearchResults([]); return }
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=8`)
                const d = await res.json()
                setSearchResults(d.products?.map((p: any) => ({
                    id: p.id, name: p.name, sku: p.sku || '', cost: p.cost ? Number(p.cost) : 0, stock: p.stock || 0
                })) || [])
            } catch { setSearchResults([]) }
        }, 300)
        return () => clearTimeout(t)
    }, [searchQuery])

    const addPOItem = (product: { id: string; name: string; cost: number }) => {
        if (poItems.find(i => i.productId === product.id)) {
            setPOItems(poItems.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        } else {
            setPOItems([...poItems, { productId: product.id, name: product.name, quantity: 1, unitCost: product.cost }])
        }
        setSearchQuery('')
        setSearchResults([])
    }

    const poTotal = poItems.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)

    const handleCreatePO = async () => {
        if (!selectedSupplierId) { setPOError('Select a supplier.'); return }
        if (!selectedLocationId) { setPOError('Select a receiving location.'); return }
        if (poItems.length === 0) { setPOError('Add at least one item.'); return }
        if (poItems.some(i => i.quantity <= 0)) { setPOError('All quantities must be > 0.'); return }
        
        setPOError('')
        setSaving(true)
        try {
            const res = await fetch('/api/inventory/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplierId: selectedSupplierId,
                    locationId: selectedLocationId,
                    expectedDate: expectedDate || null,
                    status: 'DRAFT',
                    items: poItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitCost: i.unitCost }))
                })
            })
            if (res.ok) {
                setShowCreate(false)
                resetCreateForm()
                fetchOrders()
            } else {
                const d = await res.json()
                setPOError(d.error || 'Failed to create PO')
            }
        } catch {
            setPOError('Network error')
        } finally {
            setSaving(false)
        }
    }

    const resetCreateForm = () => {
        setSelectedSupplierId('')
        setSelectedLocationId('')
        setExpectedDate('')
        setPOItems([])
        setSearchQuery('')
        setSearchResults([])
        setPOError('')
    }

    // PO Actions (send, receive, cancel)
    const handlePOAction = async (orderId: string, action: string) => {
        setActionLoading(true)
        try {
            // For send/receive/cancel, we update the status
            const statusMap: Record<string, string> = {
                SEND: 'ORDERED',
                RECEIVE: 'RECEIVED',
                CANCEL: 'CANCELLED'
            }
            const newStatus = statusMap[action]
            if (!newStatus) return

            const res = await fetch(`/api/inventory/purchase-orders`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: orderId, status: newStatus })
            })
            if (res.ok) {
                setSelectedOrder(null)
                fetchOrders()
            }
        } catch {
            console.error('Action failed')
        } finally {
            setActionLoading(false)
        }
    }

    const openCreate = () => {
        resetCreateForm()
        fetchCreateData()
        setShowCreate(true)
        // autoFocus supplier select after modal renders
        setTimeout(() => supplierSelectRef.current?.focus(), 100)
    }

    // Enter key on product search selects first result
    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchResults.length > 0) {
            e.preventDefault()
            addPOItem({ id: searchResults[0].id, name: searchResults[0].name, cost: searchResults[0].cost })
        }
    }

    const openOrders = orders.filter(o => o.status === 'ORDERED').length
    const drafts = orders.filter(o => o.status === 'DRAFT').length
    const receivedTotal = orders.filter(o => o.status === 'RECEIVED')
        .reduce((sum, o) => sum + Number(o.totalCost || 0), 0)
    const receivedCount = orders.filter(o => o.status === 'RECEIVED').length

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
                    <button
                        onClick={openCreate}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg flex items-center gap-2 font-medium transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        New PO
                    </button>
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
                        <span className="text-2xl font-bold text-stone-100">{formatCurrency(receivedTotal)}</span>
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
                    <button onClick={fetchOrders} disabled={loading} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg">
                        <RefreshCw className={`h-4 w-4 text-stone-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-stone-500">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                        Loading purchase orders...
                    </div>
                ) : orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <PackageOpen className="h-16 w-16 text-stone-700 mb-4" />
                        <h3 className="text-lg font-semibold text-stone-300 mb-2">No Purchase Orders</h3>
                        <p className="text-stone-500 mb-6">{statusFilter !== 'ALL' ? `No ${statusFilter} orders found` : 'Create your first order to start tracking inventory'}</p>
                        <button onClick={openCreate} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-white flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Create First PO
                        </button>
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
                                    <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-stone-800/30 transition-colors cursor-pointer">
                                        <td className="px-6 py-4 font-medium text-stone-200 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-stone-500" />
                                            PO-{order.id.slice(-6).toUpperCase()}
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
                                        <td className="px-6 py-4 text-right font-medium text-stone-200">{formatCurrency(Number(order.totalCost || 0))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══ Create PO Modal ═══ */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
                    <div className="bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-stone-700">
                        <div className="flex items-center justify-between p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-orange-500" />
                                New Purchase Order
                            </h2>
                            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-stone-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Supplier + Location */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-stone-400 mb-1 block">Supplier *</label>
                                    <select
                                        ref={supplierSelectRef}
                                        value={selectedSupplierId}
                                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    >
                                        <option value="">Select supplier...</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-stone-400 mb-1 block">Receiving Location *</label>
                                    <select
                                        value={selectedLocationId}
                                        onChange={(e) => setSelectedLocationId(e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white"
                                    >
                                        <option value="">Select location...</option>
                                        {locations.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Expected Date */}
                            <div>
                                <label className="text-sm text-stone-400 mb-1 block">Expected Delivery (Optional)</label>
                                <input
                                    type="date"
                                    value={expectedDate}
                                    onChange={(e) => setExpectedDate(e.target.value)}
                                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-white"
                                />
                            </div>

                            {/* Product Search */}
                            <div>
                                <label className="text-sm text-stone-400 mb-1 block">Add Items</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={handleSearchKeyDown}
                                        placeholder="Search products by name, barcode, or SKU... (Enter to add first)"
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="mt-2 bg-stone-800 border border-stone-700 rounded-xl overflow-hidden">
                                        {searchResults.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addPOItem({ id: p.id, name: p.name, cost: p.cost })}
                                                className="w-full px-4 py-3 text-left hover:bg-stone-700 border-b border-stone-700 last:border-0"
                                            >
                                                <p className="font-medium text-white">{p.name}</p>
                                                <p className="text-sm text-stone-400">
                                                    {p.sku ? `SKU: ${p.sku} • ` : ''}
                                                    Cost: {formatCurrency(p.cost)} • Stock: {p.stock}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* PO Items */}
                            {poItems.length > 0 && (
                                <div>
                                    <label className="text-sm text-stone-400 mb-2 block">Order Items ({poItems.length})</label>
                                    <div className="space-y-2">
                                        {poItems.map((item, idx) => (
                                            <div key={item.productId} className="flex items-center gap-3 bg-stone-800 rounded-xl p-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-white truncate">{item.name}</p>
                                                    <p className="text-xs text-stone-500">
                                                        {formatCurrency(item.unitCost)} × {item.quantity} = {formatCurrency(item.unitCost * item.quantity)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Unit cost input */}
                                                    <div className="w-20">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={item.unitCost}
                                                            onChange={(e) => setPOItems(poItems.map((i, j) => j === idx ? { ...i, unitCost: parseFloat(e.target.value) || 0 } : i))}
                                                            className="w-full bg-stone-700 border border-stone-600 rounded-lg px-2 py-1 text-center text-sm text-white"
                                                            title="Unit cost"
                                                        />
                                                    </div>
                                                    {/* Quantity controls */}
                                                    <button
                                                        onClick={() => setPOItems(poItems.map((i, j) => j === idx && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i))}
                                                        className="w-8 h-8 bg-stone-700 hover:bg-stone-600 rounded-lg text-white flex items-center justify-center"
                                                    >−</button>
                                                    <input type="number" min={1} value={item.quantity}
                                                        onChange={(e) => setPOItems(poItems.map((i, j) => j === idx ? { ...i, quantity: Math.max(1, parseInt(e.target.value) || 1) } : i))}
                                                        className="w-16 text-center text-white font-mono bg-stone-800 border border-stone-600 rounded-lg px-1 py-1 text-sm focus:ring-2 focus:ring-orange-500" />
                                                    <button
                                                        onClick={() => setPOItems(poItems.map((i, j) => j === idx ? { ...i, quantity: i.quantity + 1 } : i))}
                                                        className="w-8 h-8 bg-stone-700 hover:bg-stone-600 rounded-lg text-white flex items-center justify-center"
                                                    >+</button>
                                                    <button
                                                        onClick={() => setPOItems(poItems.filter((_, j) => j !== idx))}
                                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Total */}
                                    <div className="mt-3 flex justify-between items-center bg-stone-800/50 rounded-xl p-3 border border-stone-700">
                                        <span className="text-stone-400 font-medium">Order Total</span>
                                        <span className="text-xl font-bold text-emerald-400">{formatCurrency(poTotal)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {poError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {poError}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-stone-700 flex gap-3">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePO}
                                disabled={saving || !selectedSupplierId || !selectedLocationId || poItems.length === 0}
                                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                                {saving ? 'Creating...' : 'Create Purchase Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ PO Detail Modal ═══ */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelectedOrder(null) }}>
                    <div className="bg-stone-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-stone-700">
                        <div className="flex items-center justify-between p-5 border-b border-stone-700">
                            <div>
                                <h2 className="text-xl font-bold">PO-{selectedOrder.id.slice(-6).toUpperCase()}</h2>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                    selectedOrder.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400' :
                                    selectedOrder.status === 'ORDERED' ? 'bg-blue-500/20 text-blue-400' :
                                    selectedOrder.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' :
                                    'bg-stone-500/20 text-stone-400'
                                }`}>{selectedOrder.status}</span>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-stone-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-2 text-stone-400 text-sm">
                                <Truck className="h-4 w-4" /> {selectedOrder.supplier?.name || '—'}
                                <ChevronRight className="h-4 w-4" />
                                <Store className="h-4 w-4" /> {selectedOrder.location?.name || '—'}
                            </div>
                            <p className="text-xs text-stone-500">Created: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                            {selectedOrder.expectedDate && (
                                <p className="text-xs text-stone-500">Expected: {new Date(selectedOrder.expectedDate).toLocaleDateString()}</p>
                            )}

                            <div className="bg-stone-800 rounded-xl p-4">
                                <p className="text-sm text-stone-400 mb-2">Items ({selectedOrder.items?.length || 0})</p>
                                <div className="space-y-2">
                                    {selectedOrder.items?.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="text-white">{item.product?.name || 'Unknown'}</span>
                                            <span className="text-stone-400">
                                                ×{item.quantity} @ {formatCurrency(Number(item.unitCost))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-stone-700 mt-3 pt-3 flex justify-between font-bold">
                                    <span>Total</span>
                                    <span className="text-emerald-400">{formatCurrency(Number(selectedOrder.totalCost || 0))}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            {selectedOrder.status === 'DRAFT' && (
                                <>
                                    <button onClick={() => handlePOAction(selectedOrder.id, 'CANCEL')} disabled={actionLoading}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl disabled:opacity-50">
                                        Cancel PO
                                    </button>
                                    <button onClick={() => handlePOAction(selectedOrder.id, 'SEND')} disabled={actionLoading}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                        {actionLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                                        Send to Supplier
                                    </button>
                                </>
                            )}
                            {selectedOrder.status === 'ORDERED' && (
                                <button onClick={() => handlePOAction(selectedOrder.id, 'RECEIVE')} disabled={actionLoading}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                    {actionLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    Mark Received
                                </button>
                            )}
                            {['RECEIVED', 'CANCELLED'].includes(selectedOrder.status) && (
                                <button onClick={() => setSelectedOrder(null)}
                                    className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl">
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
