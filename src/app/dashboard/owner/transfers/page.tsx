'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Package, Send, RefreshCw, Plus, X,
    Truck, CheckCircle, AlertTriangle, Clock, Store,
    ChevronRight, Search
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TransferItem {
    id: string
    itemId: string
    itemName: string
    itemSku?: string
    itemBarcode?: string
    quantitySent: number
    quantityReceived?: number
    unitCost: number
}

interface Transfer {
    id: string
    transferNumber: string
    fromLocation: { id: string, name: string }
    toLocation: { id: string, name: string }
    status: string
    reason?: string
    totalItems: number
    totalValue: number
    requestedByName?: string
    requestedAt: string
    items: TransferItem[]
}

interface Location {
    id: string
    name: string
}

export default function TransfersPage() {
    const { data: session } = useSession()
    const [transfers, setTransfers] = useState<Transfer[]>([])
    const [loading, setLoading] = useState(true)
    const [showNewModal, setShowNewModal] = useState(false)
    const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null)
    const [locations, setLocations] = useState<Location[]>([])
    const [filter, setFilter] = useState<string>('all')
    const [counts, setCounts] = useState({ pending: 0, inTransit: 0, completed: 0, total: 0 })

    // New transfer form state
    const [fromLocationId, setFromLocationId] = useState('')
    const [toLocationId, setToLocationId] = useState('')
    const [reason, setReason] = useState('')
    const [newItems, setNewItems] = useState<{ itemId: string, name: string, quantity: number }[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<{ id: string, name: string, sku: string, stock: number }[]>([])
    const [saving, setSaving] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filter !== 'all') params.set('status', filter)

            const res = await fetch(`/api/owner/transfers?${params}`)
            const data = await res.json()

            setTransfers(data.transfers || [])
            setCounts(data.counts || { pending: 0, inTransit: 0, completed: 0, total: 0 })

            // Extract unique locations from transfers
            const locs = new Map<string, Location>()
            data.transfers?.forEach((t: Transfer) => {
                locs.set(t.fromLocation.id, t.fromLocation)
                locs.set(t.toLocation.id, t.toLocation)
            })
            setLocations(Array.from(locs.values()))
        } catch (error) {
            console.error('Failed to fetch transfers:', error)
        } finally {
            setLoading(false)
        }
    }

    // Fetch locations for new transfer
    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/dashboard/multi-store')
            const data = await res.json()
            setLocations(data.locations?.map((l: any) => ({ id: l.location.id, name: l.location.name })) || [])
        } catch (error) {
            console.error('Failed to fetch locations:', error)
        }
    }

    const searchProducts = async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([])
            return
        }
        try {
            const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`)
            const data = await res.json()
            setSearchResults(data.products?.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku || '',
                stock: p.stock || 0
            })) || [])
        } catch (error) {
            console.error('Search failed:', error)
        }
    }

    useEffect(() => {
        fetchData()
        fetchLocations()
    }, [filter])

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleCreateTransfer = async () => {
        if (!fromLocationId || !toLocationId || newItems.length === 0) {
            alert('Please select locations and add items')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/owner/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromLocationId,
                    toLocationId,
                    reason,
                    items: newItems.map(i => ({ itemId: i.itemId, quantity: i.quantity }))
                })
            })

            if (res.ok) {
                setShowNewModal(false)
                setFromLocationId('')
                setToLocationId('')
                setReason('')
                setNewItems([])
                fetchData()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to create transfer')
            }
        } catch (error) {
            console.error('Create failed:', error)
            alert('Failed to create transfer')
        } finally {
            setSaving(false)
        }
    }

    const handleAction = async (transferId: string, action: string) => {
        try {
            const res = await fetch('/api/owner/transfers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transferId, action })
            })

            if (res.ok) {
                fetchData()
                setSelectedTransfer(null)
            } else {
                const data = await res.json()
                alert(data.error || 'Action failed')
            }
        } catch (error) {
            console.error('Action failed:', error)
        }
    }

    const addItem = (product: { id: string, name: string, sku: string, stock: number }) => {
        if (newItems.find(i => i.itemId === product.id)) {
            // Increment quantity
            setNewItems(newItems.map(i =>
                i.itemId === product.id ? { ...i, quantity: i.quantity + 1 } : i
            ))
        } else {
            setNewItems([...newItems, { itemId: product.id, name: product.name, quantity: 1 }])
        }
        setSearchQuery('')
        setSearchResults([])
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <Clock className="h-5 w-5 text-amber-400" />
            case 'APPROVED': return <CheckCircle className="h-5 w-5 text-blue-400" />
            case 'IN_TRANSIT': return <Truck className="h-5 w-5 text-purple-400" />
            case 'RECEIVED': return <CheckCircle className="h-5 w-5 text-emerald-400" />
            case 'DISCREPANCY': return <AlertTriangle className="h-5 w-5 text-red-400" />
            default: return <Package className="h-5 w-5 text-stone-400" />
        }
    }

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-amber-500/20 text-amber-400'
            case 'IN_TRANSIT': return 'bg-purple-500/20 text-purple-400'
            case 'RECEIVED': return 'bg-emerald-500/20 text-emerald-400'
            case 'DISCREPANCY': return 'bg-red-500/20 text-red-400'
            default: return 'bg-stone-500/20 text-stone-400'
        }
    }

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
                            <Send className="h-8 w-8 text-blue-500" />
                            Inventory Transfers
                        </h1>
                        <p className="text-stone-400">Move stock between your locations</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-xl"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl"
                    >
                        <Plus className="h-4 w-4" />
                        New Transfer
                    </button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {[
                    { key: 'all', label: 'All', count: counts.total },
                    { key: 'PENDING', label: 'Pending', count: counts.pending },
                    { key: 'IN_TRANSIT', label: 'In Transit', count: counts.inTransit },
                    { key: 'RECEIVED', label: 'Completed', count: counts.completed },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${filter === tab.key
                                ? 'bg-blue-600 text-white'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Transfers List */}
            {loading && transfers.length === 0 ? (
                <div className="text-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-stone-500 mb-4" />
                </div>
            ) : transfers.length === 0 ? (
                <div className="text-center py-16 bg-stone-900/80 rounded-2xl border border-stone-700">
                    <Package className="h-16 w-16 mx-auto text-stone-600 mb-4" />
                    <p className="text-xl font-bold">No transfers yet</p>
                    <p className="text-stone-400 mt-2">Create a transfer to move inventory between stores</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {transfers.map(transfer => (
                        <button
                            key={transfer.id}
                            onClick={() => setSelectedTransfer(transfer)}
                            className="w-full bg-stone-900/80 border border-stone-700 hover:border-blue-500/30 rounded-2xl p-5 text-left transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {getStatusIcon(transfer.status)}
                                    <div>
                                        <p className="font-bold">{transfer.transferNumber}</p>
                                        <div className="flex items-center gap-2 text-sm text-stone-400">
                                            <Store className="h-4 w-4" />
                                            {transfer.fromLocation.name}
                                            <ChevronRight className="h-4 w-4" />
                                            {transfer.toLocation.name}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(transfer.status)}`}>
                                        {transfer.status.replace('_', ' ')}
                                    </span>
                                    <p className="text-sm text-stone-500 mt-1">
                                        {transfer.totalItems} items • {formatCurrency(Number(transfer.totalValue))}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* New Transfer Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-stone-700">
                            <h2 className="text-xl font-bold">New Transfer</h2>
                            <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-stone-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Locations */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-stone-400">From Location</label>
                                    <select
                                        value={fromLocationId}
                                        onChange={(e) => setFromLocationId(e.target.value)}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    >
                                        <option value="">Select...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id} disabled={loc.id === toLocationId}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-stone-400">To Location</label>
                                    <select
                                        value={toLocationId}
                                        onChange={(e) => setToLocationId(e.target.value)}
                                        className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                    >
                                        <option value="">Select...</option>
                                        {locations.map(loc => (
                                            <option key={loc.id} value={loc.id} disabled={loc.id === fromLocationId}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-stone-400">Reason (Optional)</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="e.g., Stock balance, emergency request"
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                />
                            </div>

                            {/* Add Items */}
                            <div>
                                <label className="text-sm text-stone-400">Add Items</label>
                                <div className="relative mt-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search products by name or barcode..."
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl"
                                    />
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div className="mt-2 bg-stone-800 border border-stone-700 rounded-xl overflow-hidden">
                                        {searchResults.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => addItem(p)}
                                                className="w-full px-4 py-3 text-left hover:bg-stone-700 border-b border-stone-700 last:border-0"
                                            >
                                                <p className="font-medium">{p.name}</p>
                                                <p className="text-sm text-stone-400">SKU: {p.sku || 'N/A'} • Stock: {p.stock}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Items */}
                            {newItems.length > 0 && (
                                <div>
                                    <label className="text-sm text-stone-400">Items to Transfer ({newItems.length})</label>
                                    <div className="mt-2 space-y-2">
                                        {newItems.map(item => (
                                            <div key={item.itemId} className="flex items-center justify-between bg-stone-800 rounded-xl p-3">
                                                <span>{item.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setNewItems(newItems.map(i =>
                                                            i.itemId === item.itemId && i.quantity > 1
                                                                ? { ...i, quantity: i.quantity - 1 } : i
                                                        ))}
                                                        className="w-8 h-8 bg-stone-700 rounded-lg"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => setNewItems(newItems.map(i =>
                                                            i.itemId === item.itemId ? { ...i, quantity: i.quantity + 1 } : i
                                                        ))}
                                                        className="w-8 h-8 bg-stone-700 rounded-lg"
                                                    >
                                                        +
                                                    </button>
                                                    <button
                                                        onClick={() => setNewItems(newItems.filter(i => i.itemId !== item.itemId))}
                                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            <button
                                onClick={() => setShowNewModal(false)}
                                className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTransfer}
                                disabled={saving || !fromLocationId || !toLocationId || newItems.length === 0}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
                                Create Transfer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Detail Modal */}
            {selectedTransfer && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-stone-700">
                            <div>
                                <h2 className="text-xl font-bold">{selectedTransfer.transferNumber}</h2>
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(selectedTransfer.status)}`}>
                                    {selectedTransfer.status.replace('_', ' ')}
                                </span>
                            </div>
                            <button onClick={() => setSelectedTransfer(null)} className="p-2 hover:bg-stone-800 rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-2 text-stone-400">
                                <Store className="h-4 w-4" />
                                {selectedTransfer.fromLocation.name}
                                <ChevronRight className="h-4 w-4" />
                                {selectedTransfer.toLocation.name}
                            </div>

                            {selectedTransfer.reason && (
                                <p className="text-sm text-stone-400">Reason: {selectedTransfer.reason}</p>
                            )}

                            <div className="bg-stone-800 rounded-xl p-4">
                                <p className="text-sm text-stone-400 mb-2">Items ({selectedTransfer.totalItems})</p>
                                <div className="space-y-2">
                                    {selectedTransfer.items.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span>{item.itemName}</span>
                                            <span>x{item.quantitySent}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-stone-700 mt-3 pt-3 flex justify-between font-bold">
                                    <span>Total Value</span>
                                    <span>{formatCurrency(Number(selectedTransfer.totalValue))}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions based on status */}
                        <div className="p-5 border-t border-stone-700 flex gap-2">
                            {selectedTransfer.status === 'PENDING' && (
                                <>
                                    <button
                                        onClick={() => handleAction(selectedTransfer.id, 'CANCEL')}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedTransfer.id, 'SHIP')}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl"
                                    >
                                        Mark Shipped
                                    </button>
                                </>
                            )}
                            {selectedTransfer.status === 'IN_TRANSIT' && (
                                <button
                                    onClick={() => handleAction(selectedTransfer.id, 'RECEIVE')}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl"
                                >
                                    Mark Received
                                </button>
                            )}
                            {['RECEIVED', 'DISCREPANCY', 'CANCELLED'].includes(selectedTransfer.status) && (
                                <button
                                    onClick={() => setSelectedTransfer(null)}
                                    className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 rounded-xl"
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

