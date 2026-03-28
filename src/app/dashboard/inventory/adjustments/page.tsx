'use client'

import { useState, useEffect, useRef } from 'react'
import { ClipboardList, Plus, AlertTriangle, Package, ArrowDown, ArrowUp, ArrowRight, Search, X } from 'lucide-react'

const REASON_CODES = ['DAMAGED', 'SPOILED', 'SHRINK', 'THEFT', 'MISCOUNT', 'RECEIVED', 'RETURNED', 'OTHER']

export default function InventoryAdjustmentsPage() {
    const [adjustments, setAdjustments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ productId: '', quantity: 0, reason: '', notes: '' })
    const [submitting, setSubmitting] = useState(false)

    // Product search state
    const [productSearch, setProductSearch] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetch('/api/inventory/adjustments')
            .then(r => r.json())
            .then(d => { setAdjustments(d.adjustments || []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [])

    // Debounced product search
    useEffect(() => {
        if (productSearch.length < 2) { setSearchResults([]); return }
        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/inventory/products?search=${encodeURIComponent(productSearch)}`)
                if (res.ok) {
                    const data = await res.json()
                    setSearchResults(data.data || data.products || [])
                    setShowDropdown(true)
                }
            } catch { /* ignore */ }
        }, 300)
        return () => clearTimeout(timer)
    }, [productSearch])

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const selectProduct = (product: any) => {
        setSelectedProduct(product)
        setForm(f => ({ ...f, productId: product.id }))
        setProductSearch('')
        setShowDropdown(false)
        setSearchResults([])
    }

    const clearProduct = () => {
        setSelectedProduct(null)
        setForm(f => ({ ...f, productId: '' }))
        setProductSearch('')
    }

    const handleSubmit = async () => {
        if (!form.productId || !form.reason || form.quantity === 0) return
        setSubmitting(true)
        try {
            const res = await fetch('/api/inventory/adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (res.ok) {
                const data = await res.json()
                setAdjustments(prev => [data.adjustment, ...prev])
                setShowForm(false)
                setForm({ productId: '', quantity: 0, reason: '', notes: '' })
                setSelectedProduct(null)
                setProductSearch('')
            }
        } catch { /* error */ }
        setSubmitting(false)
    }

    const reasonColors: Record<string, string> = {
        DAMAGED: 'text-red-400', SPOILED: 'text-orange-400', SHRINK: 'text-amber-400',
        THEFT: 'text-red-500', MISCOUNT: 'text-blue-400', RECEIVED: 'text-emerald-400',
        RETURNED: 'text-purple-400', OTHER: 'text-stone-400'
    }

    return (
        <div className="min-h-screen bg-stone-950 text-white p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <ClipboardList className="h-8 w-8 text-amber-400" />
                            Inventory Adjustments
                        </h1>
                        <p className="text-stone-400 mt-1">Record stock adjustments with mandatory reason codes</p>
                    </div>
                    <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl font-medium flex items-center gap-2 transition-colors">
                        <Plus className="h-5 w-5" /> New Adjustment
                    </button>
                </div>

                {/* Create Form */}
                {showForm && (
                    <div className="bg-stone-900 border border-amber-500/30 rounded-xl p-6 mb-6">
                        <h3 className="text-lg font-bold mb-4">New Adjustment</h3>

                        {/* Product Search */}
                        <div className="mb-4" ref={searchRef}>
                            {selectedProduct ? (
                                <div className="flex items-center gap-3 px-4 py-3 bg-amber-600/20 border border-amber-500/40 rounded-xl">
                                    <Package className="h-5 w-5 text-amber-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{selectedProduct.name}</div>
                                        <div className="text-sm text-stone-400 flex items-center gap-3">
                                            {selectedProduct.barcode && <span>UPC: {selectedProduct.barcode}</span>}
                                            <span>Stock: {selectedProduct.stock ?? '—'}</span>
                                        </div>
                                    </div>
                                    <button onClick={clearProduct} className="p-1.5 hover:bg-stone-700 rounded-lg">
                                        <X className="h-4 w-4 text-stone-400" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                        <input
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                            placeholder="Search product by name, barcode, or SKU..."
                                            className="w-full pl-11 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500"
                                            autoFocus
                                        />
                                    </div>
                                    {/* Dropdown Results */}
                                    {showDropdown && searchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                            {searchResults.slice(0, 15).map((p: any) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => selectProduct(p)}
                                                    className="w-full text-left px-4 py-3 hover:bg-stone-700 border-b border-stone-700/50 last:border-0 flex items-center justify-between"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium truncate">{p.name}</div>
                                                        <div className="text-xs text-stone-500">
                                                            {p.barcode && <span>UPC: {p.barcode} • </span>}
                                                            {p.sku && <span>SKU: {p.sku} • </span>}
                                                            Stock: {p.stock ?? '—'}
                                                        </div>
                                                    </div>
                                                    <span className="text-stone-500 text-sm ml-2">${Number(p.price || 0).toFixed(2)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {showDropdown && productSearch.length >= 2 && searchResults.length === 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl p-4 text-center text-stone-500 text-sm">
                                            No products found
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <input type="number" value={form.quantity || ''} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} placeholder="Quantity (negative to remove)" className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white" />
                        </div>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {REASON_CODES.map(r => (
                                <button key={r} onClick={() => setForm(f => ({ ...f, reason: r }))} className={`py-2 rounded-lg text-sm font-medium transition-all ${form.reason === r ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white mb-4" />
                        <button onClick={handleSubmit} disabled={submitting || !form.productId || !form.reason} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold disabled:opacity-50 transition-all">
                            {submitting ? 'Saving...' : 'Submit Adjustment'}
                        </button>
                    </div>
                )}

                {/* Adjustments List */}
                {loading ? (
                    <div className="text-center py-20 text-stone-500">Loading adjustments...</div>
                ) : adjustments.length === 0 ? (
                    <div className="text-center py-20 bg-stone-900 rounded-2xl border border-stone-800">
                        <Package className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <p className="text-stone-500">No adjustments recorded.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {adjustments.map((a: any, i: number) => (
                            <div key={a.id || i} className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {a.quantity > 0 ? <ArrowUp className="h-5 w-5 text-emerald-400" /> : <ArrowDown className="h-5 w-5 text-red-400" />}
                                        <div>
                                            <div className="font-medium">{a.product?.name || a.productId}</div>
                                            <div className="text-sm text-stone-500">{a.notes || '—'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-bold ${reasonColors[a.reason] || 'text-stone-400'}`}>{a.reason}</span>
                                        <span className="text-stone-500 text-xs">{new Date(a.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {/* Stock flow: previous → change → new */}
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-800">
                                    {a.previousStock != null ? (
                                        <>
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase text-stone-600 tracking-wide">Before</div>
                                                <div className="text-lg font-bold text-stone-300">{a.previousStock}</div>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-stone-600 flex-shrink-0" />
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase text-stone-600 tracking-wide">Change</div>
                                                <div className={`text-lg font-bold ${a.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {a.quantity > 0 ? '+' : ''}{a.quantity}
                                                </div>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-stone-600 flex-shrink-0" />
                                            <div className="text-center">
                                                <div className="text-[10px] uppercase text-stone-600 tracking-wide">After</div>
                                                <div className="text-lg font-bold text-white">{a.newStock ?? (a.previousStock + a.quantity)}</div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <div className="text-[10px] uppercase text-stone-600 tracking-wide">Change</div>
                                            <div className={`text-lg font-bold ${a.quantity > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {a.quantity > 0 ? '+' : ''}{a.quantity}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
