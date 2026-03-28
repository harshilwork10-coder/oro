'use client'

import { useState, useEffect, useRef } from 'react'
import { X, PackagePlus, Search, Package, CheckCircle, AlertCircle } from 'lucide-react'

interface QuickReceiveModalProps {
    isOpen: boolean
    onClose: () => void
    productId?: string
    productName?: string
    currentStock?: number
    onReceived?: () => void
}

export default function QuickReceiveModal({
    isOpen,
    onClose,
    productId: prefilledId,
    productName: prefilledName,
    currentStock: prefilledStock,
    onReceived
}: QuickReceiveModalProps) {
    const [productSearch, setProductSearch] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [selectedProduct, setSelectedProduct] = useState<any>(null)
    const [showDropdown, setShowDropdown] = useState(false)
    const [quantity, setQuantity] = useState<number>(0)
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const searchRef = useRef<HTMLDivElement>(null)

    // Pre-fill product if provided
    useEffect(() => {
        if (isOpen && prefilledId) {
            setSelectedProduct({
                id: prefilledId,
                name: prefilledName || 'Product',
                stock: prefilledStock ?? null
            })
        }
        if (!isOpen) {
            setProductSearch('')
            setSearchResults([])
            setSelectedProduct(null)
            setQuantity(0)
            setNotes('')
            setResult(null)
            setError(null)
        }
    }, [isOpen, prefilledId, prefilledName, prefilledStock])

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
        setProductSearch('')
        setShowDropdown(false)
        setSearchResults([])
    }

    const clearProduct = () => {
        setSelectedProduct(null)
        setProductSearch('')
    }

    const handleSubmit = async () => {
        if (!selectedProduct?.id || quantity < 1) return
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/inventory/quick-receive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    quantity,
                    notes: notes.trim() || undefined
                })
            })
            if (res.ok) {
                const data = await res.json()
                setResult(data)
            } else {
                const err = await res.json()
                setError(err.error || 'Failed to receive stock')
            }
        } catch {
            setError('Network error')
        }
        setSubmitting(false)
    }

    const handleDone = () => {
        onReceived?.()
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <div className="bg-stone-900 rounded-2xl w-full max-w-lg border border-stone-700 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <PackagePlus className="h-6 w-6 text-emerald-400" />
                        <div>
                            <h2 className="text-lg font-bold text-white">Receive Stock</h2>
                            <p className="text-sm text-stone-400">Add incoming inventory</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded-lg">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {result ? (
                        /* Success State */
                        <div className="text-center py-4">
                            <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto mb-3" />
                            <h3 className="text-xl font-bold text-white mb-2">Stock Received!</h3>
                            <p className="text-stone-400 mb-4">{result.name}</p>
                            <div className="flex items-center justify-center gap-4 bg-stone-800 rounded-xl p-4 mb-4">
                                <div className="text-center">
                                    <div className="text-[10px] uppercase text-stone-500 tracking-wide">Before</div>
                                    <div className="text-2xl font-bold text-stone-300">{result.previousStock}</div>
                                </div>
                                <div className="text-emerald-400 text-xl font-bold">+{result.addedQuantity}</div>
                                <div className="text-center">
                                    <div className="text-[10px] uppercase text-stone-500 tracking-wide">After</div>
                                    <div className="text-2xl font-bold text-white">{result.newStock}</div>
                                </div>
                            </div>
                            <button onClick={handleDone} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold w-full transition-colors">
                                Done
                            </button>
                        </div>
                    ) : (
                        /* Form State */
                        <div className="space-y-4">
                            {/* Product Search */}
                            <div ref={searchRef}>
                                <label className="text-sm text-stone-400 block mb-1">Product</label>
                                {selectedProduct ? (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600/15 border border-emerald-500/30 rounded-xl">
                                        <Package className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate text-white">{selectedProduct.name}</div>
                                            <div className="text-sm text-stone-400">
                                                Current stock: {selectedProduct.stock ?? '—'}
                                            </div>
                                        </div>
                                        {!prefilledId && (
                                            <button onClick={clearProduct} className="p-1.5 hover:bg-stone-700 rounded-lg">
                                                <X className="h-4 w-4 text-stone-400" />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                        <input
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                            onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                            placeholder="Search by name, barcode, or SKU..."
                                            className="w-full pl-11 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500"
                                            autoFocus
                                        />
                                        {showDropdown && searchResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                                {searchResults.slice(0, 10).map((p: any) => (
                                                    <button
                                                        key={p.id}
                                                        onClick={() => selectProduct(p)}
                                                        className="w-full text-left px-4 py-3 hover:bg-stone-700 border-b border-stone-700/50 last:border-0"
                                                    >
                                                        <div className="font-medium truncate text-white">{p.name}</div>
                                                        <div className="text-xs text-stone-500">
                                                            {p.barcode && <span>UPC: {p.barcode} • </span>}
                                                            Stock: {p.stock ?? '—'}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="text-sm text-stone-400 block mb-1">Quantity to Receive</label>
                                <input
                                    type="number"
                                    value={quantity || ''}
                                    onChange={e => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                                    min="1"
                                    placeholder="Enter quantity..."
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white text-lg"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-sm text-stone-400 block mb-1">Notes (optional)</label>
                                <input
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="e.g., Delivery from Southern Glazers"
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !selectedProduct?.id || quantity < 1}
                                className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50 transition-colors text-lg"
                            >
                                {submitting ? 'Receiving...' : `Receive ${quantity > 0 ? quantity : ''} Units`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
