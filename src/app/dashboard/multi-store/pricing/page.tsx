'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Search, DollarSign, Store, RefreshCw,
    Check, X, ChevronDown, ChevronUp, Filter, Undo2,
    AlertTriangle, CheckCircle, Tag
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationPrice {
    locationId: string
    locationName: string
    price: number
    hasOverride: boolean
    costPrice: number
}

interface ProductRow {
    id: string
    name: string
    barcode: string | null
    sku: string | null
    brand: string | null
    size: string | null
    defaultPrice: number
    cost: number
    category: string
    categoryId: string | null
    locationPrices: LocationPrice[]
}

interface Location {
    id: string
    name: string
    address: string | null
}

interface Category {
    id: string
    name: string
}

// Pending edit for a single product at specific locations
interface PendingEdit {
    productId: string
    productName: string
    locationIds: string[]
    newPrice: number
    oldPrices: Map<string, number>
}

export default function MultiStorePricingPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [products, setProducts] = useState<ProductRow[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // Per-product editing state
    const [editingProduct, setEditingProduct] = useState<string | null>(null)
    const [editPrice, setEditPrice] = useState('')
    const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set())

    // Batch of pending edits
    const [pendingEdits, setPendingEdits] = useState<PendingEdit[]>([])

    // Expanded product for mobile
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (categoryFilter) params.set('categoryId', categoryFilter)
            params.set('limit', '50')

            const res = await fetch(`/api/owner/multi-store-pricing?${params}`)
            if (res.ok) {
                const data = await res.json()
                setProducts(data.products || [])
                setLocations(data.locations || [])
                setCategories(data.categories || [])
            }
        } catch (error) {
            console.error('Failed to fetch pricing:', error)
        }
        setLoading(false)
    }, [search, categoryFilter])

    useEffect(() => {
        const timer = setTimeout(fetchData, 300)
        return () => clearTimeout(timer)
    }, [fetchData])

    // Start editing a product
    const startEdit = (product: ProductRow) => {
        setEditingProduct(product.id)
        setEditPrice(product.defaultPrice.toFixed(2))
        // Select all locations by default
        setSelectedLocations(new Set(locations.map(l => l.id)))
    }

    const cancelEdit = () => {
        setEditingProduct(null)
        setEditPrice('')
        setSelectedLocations(new Set())
    }

    const toggleLocation = (locationId: string) => {
        const next = new Set(selectedLocations)
        if (next.has(locationId)) {
            next.delete(locationId)
        } else {
            next.add(locationId)
        }
        setSelectedLocations(next)
    }

    const toggleAllLocations = () => {
        if (selectedLocations.size === locations.length) {
            setSelectedLocations(new Set())
        } else {
            setSelectedLocations(new Set(locations.map(l => l.id)))
        }
    }

    // Queue an edit (don't save yet)
    const queueEdit = () => {
        if (!editingProduct || !editPrice || selectedLocations.size === 0) return

        const product = products.find(p => p.id === editingProduct)
        if (!product) return

        const newPrice = parseFloat(editPrice)
        if (isNaN(newPrice) || newPrice < 0) return

        // Record old prices for undo
        const oldPrices = new Map<string, number>()
        for (const locId of selectedLocations) {
            const lp = product.locationPrices.find(lp => lp.locationId === locId)
            if (lp) oldPrices.set(locId, lp.price)
        }

        // Remove any existing pending edit for same product+locations
        const filtered = pendingEdits.filter(e => e.productId !== editingProduct)

        filtered.push({
            productId: editingProduct,
            productName: product.name,
            locationIds: Array.from(selectedLocations),
            newPrice,
            oldPrices
        })

        setPendingEdits(filtered)

        // Update local state to show the change immediately
        setProducts(prev => prev.map(p => {
            if (p.id !== editingProduct) return p
            return {
                ...p,
                locationPrices: p.locationPrices.map(lp => {
                    if (selectedLocations.has(lp.locationId)) {
                        return { ...lp, price: newPrice, hasOverride: true }
                    }
                    return lp
                })
            }
        }))

        cancelEdit()
    }

    // Remove a pending edit
    const removePendingEdit = (index: number) => {
        const edit = pendingEdits[index]
        // Revert local state
        setProducts(prev => prev.map(p => {
            if (p.id !== edit.productId) return p
            return {
                ...p,
                locationPrices: p.locationPrices.map(lp => {
                    const oldPrice = edit.oldPrices.get(lp.locationId)
                    if (oldPrice !== undefined) {
                        return { ...lp, price: oldPrice, hasOverride: oldPrice !== p.defaultPrice }
                    }
                    return lp
                })
            }
        }))
        setPendingEdits(prev => prev.filter((_, i) => i !== index))
    }

    // Save all pending edits
    const saveAll = async () => {
        if (pendingEdits.length === 0) return
        setSaving(true)
        setMessage(null)

        try {
            const updates = pendingEdits.map(e => ({
                productId: e.productId,
                locationIds: e.locationIds,
                newPrice: e.newPrice
            }))

            const res = await fetch('/api/owner/multi-store-pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
            })

            const data = await res.json()
            if (res.ok) {
                setMessage({ type: 'success', text: `✓ ${data.updatedCount} price(s) updated across locations` })
                setPendingEdits([])
                fetchData() // Refresh to show saved state
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to save' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error — please try again' })
        }
        setSaving(false)
    }

    // Get the effective price display for a location
    const getPriceDisplay = (product: ProductRow, locationId: string) => {
        const lp = product.locationPrices.find(lp => lp.locationId === locationId)
        return lp || { price: product.defaultPrice, hasOverride: false }
    }

    // Check if a product has any pending edits
    const hasPendingEdit = (productId: string) => {
        return pendingEdits.some(e => e.productId === productId)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/multi-store" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                            <Tag className="h-7 w-7 text-green-500" />
                            Store Pricing
                        </h1>
                        <p className="text-stone-400 text-sm">Set different prices per location</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {pendingEdits.length > 0 && (
                        <button
                            onClick={saveAll}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-medium text-sm disabled:opacity-50 transition-colors"
                        >
                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            Save {pendingEdits.length} Change{pendingEdits.length !== 1 ? 's' : ''}
                        </button>
                    )}
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-4 p-3 rounded-xl text-sm ${message.type === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Pending Edits Bar */}
            {pendingEdits.length > 0 && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-sm text-amber-400 font-medium mb-2">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        {pendingEdits.length} unsaved change{pendingEdits.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {pendingEdits.map((edit, i) => (
                            <div key={i} className="flex items-center gap-2 bg-stone-800 rounded-lg px-3 py-1.5 text-sm">
                                <span className="text-stone-300">{edit.productName}</span>
                                <span className="text-green-400 font-mono">{formatCurrency(edit.newPrice)}</span>
                                <span className="text-stone-500">→ {edit.locationIds.length} store{edit.locationIds.length !== 1 ? 's' : ''}</span>
                                <button onClick={() => removePendingEdit(i)} className="text-stone-500 hover:text-red-400">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search & Filter */}
            <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, barcode, SKU, or brand..."
                        className="w-full pl-10 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-stone-900 border border-stone-700 rounded-xl px-3 py-3 text-sm min-w-[140px]"
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Location Legend */}
            {locations.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-4">
                    {locations.map((loc, i) => {
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']
                        return (
                            <div key={loc.id} className="flex items-center gap-2 text-sm text-stone-400">
                                <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                                <span>{loc.name}</span>
                            </div>
                        )
                    })}
                    <div className="flex items-center gap-2 text-xs text-stone-500 ml-auto">
                        <div className="w-3 h-3 rounded border border-amber-500/50 bg-amber-500/20" />
                        <span>= custom price</span>
                    </div>
                </div>
            )}

            {/* Products List */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-green-400" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-16 text-stone-400">
                    <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-xl">No products found</p>
                    <p className="text-sm mt-1">Try a different search or category</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {products.map(product => {
                        const isEditing = editingProduct === product.id
                        const isExpanded = expandedProduct === product.id
                        const isPending = hasPendingEdit(product.id)
                        const colors = ['text-blue-400', 'text-emerald-400', 'text-purple-400', 'text-orange-400', 'text-pink-400']
                        const bgColors = ['bg-blue-500/10', 'bg-emerald-500/10', 'bg-purple-500/10', 'bg-orange-500/10', 'bg-pink-500/10']

                        return (
                            <div
                                key={product.id}
                                className={`bg-stone-900/80 border rounded-xl overflow-hidden transition-colors ${isPending ? 'border-amber-500/40' : 'border-stone-700 hover:border-stone-600'
                                    }`}
                            >
                                {/* Product Row */}
                                <div
                                    className="flex items-center gap-3 p-4 cursor-pointer"
                                    onClick={() => {
                                        if (!isEditing) {
                                            setExpandedProduct(isExpanded ? null : product.id)
                                        }
                                    }}
                                >
                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate">{product.name}</p>
                                            {product.size && (
                                                <span className="text-xs text-stone-500 shrink-0">{product.size}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                                            {product.barcode && <span>{product.barcode}</span>}
                                            {product.brand && <span>{product.brand}</span>}
                                            <span>{product.category}</span>
                                        </div>
                                    </div>

                                    {/* Location Prices (compact inline view) */}
                                    <div className="hidden md:flex items-center gap-2">
                                        {product.locationPrices.map((lp, i) => (
                                            <div
                                                key={lp.locationId}
                                                className={`px-2.5 py-1 rounded-lg text-sm font-mono ${lp.hasOverride
                                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                    : `${bgColors[i % bgColors.length]} ${colors[i % colors.length]}`
                                                    }`}
                                                title={`${lp.locationName}: ${formatCurrency(lp.price)}${lp.hasOverride ? ' (custom)' : ' (default)'}`}
                                            >
                                                {formatCurrency(lp.price)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Default Price */}
                                    <div className="text-right shrink-0">
                                        <p className="text-xs text-stone-500">Default</p>
                                        <p className="font-bold text-green-400 font-mono">{formatCurrency(product.defaultPrice)}</p>
                                    </div>

                                    {/* Edit Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            isEditing ? cancelEdit() : startEdit(product)
                                        }}
                                        className={`shrink-0 p-2 rounded-lg transition-colors ${isEditing
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                            : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-white'
                                            }`}
                                    >
                                        {isEditing ? <X className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                                    </button>

                                    {/* Expand Arrow (mobile) */}
                                    <div className="md:hidden shrink-0">
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
                                    </div>
                                </div>

                                {/* Expanded View (mobile) — shows location prices */}
                                {isExpanded && !isEditing && (
                                    <div className="px-4 pb-4 md:hidden">
                                        <div className="grid grid-cols-2 gap-2">
                                            {product.locationPrices.map((lp, i) => (
                                                <div
                                                    key={lp.locationId}
                                                    className={`rounded-lg p-2 text-center ${lp.hasOverride
                                                        ? 'bg-amber-500/10 border border-amber-500/20'
                                                        : 'bg-stone-800/50'
                                                        }`}
                                                >
                                                    <p className="text-xs text-stone-500 truncate">{lp.locationName}</p>
                                                    <p className={`font-bold font-mono ${lp.hasOverride ? 'text-amber-400' : colors[i % colors.length]}`}>
                                                        {formatCurrency(lp.price)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Edit Panel */}
                                {isEditing && (
                                    <div className="border-t border-stone-700 p-4 bg-stone-800/30">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            {/* New Price Input */}
                                            <div className="flex-shrink-0">
                                                <label className="text-xs text-stone-500 mb-1 block">New Price</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editPrice}
                                                        onChange={(e) => setEditPrice(e.target.value)}
                                                        className="w-32 pl-8 pr-3 py-2 bg-stone-900 border border-stone-600 rounded-lg font-mono text-lg focus:ring-2 focus:ring-green-500"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') queueEdit()
                                                            if (e.key === 'Escape') cancelEdit()
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Location Selector */}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-xs text-stone-500">Apply to stores:</label>
                                                    <button
                                                        onClick={toggleAllLocations}
                                                        className="text-xs text-green-400 hover:text-green-300"
                                                    >
                                                        {selectedLocations.size === locations.length ? 'Deselect All' : 'Select All'}
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {locations.map((loc, i) => {
                                                        const isSelected = selectedLocations.has(loc.id)
                                                        const lp = product.locationPrices.find(lp => lp.locationId === loc.id)
                                                        const dotColors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500']

                                                        return (
                                                            <button
                                                                key={loc.id}
                                                                onClick={() => toggleLocation(loc.id)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${isSelected
                                                                    ? 'bg-green-500/15 border-green-500/40 text-green-400'
                                                                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                                                    }`}
                                                            >
                                                                <div className={`w-2.5 h-2.5 rounded-full ${dotColors[i % dotColors.length]}`} />
                                                                <span className="truncate max-w-[120px]">{loc.name}</span>
                                                                <span className="text-xs font-mono text-stone-500">
                                                                    {lp ? formatCurrency(lp.price) : '-'}
                                                                </span>
                                                                {isSelected && <Check className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Apply Button */}
                                            <div className="flex items-end">
                                                <button
                                                    onClick={queueEdit}
                                                    disabled={selectedLocations.size === 0 || !editPrice}
                                                    className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-sm disabled:opacity-40 transition-colors whitespace-nowrap"
                                                >
                                                    <Check className="h-4 w-4" />
                                                    Apply
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-700">
                                            <span className="text-xs text-stone-500">Quick:</span>
                                            {[5, 10, -5, -10].map(pct => (
                                                <button
                                                    key={pct}
                                                    onClick={() => {
                                                        const base = product.defaultPrice
                                                        const newP = base * (1 + pct / 100)
                                                        setEditPrice(Math.round(newP * 100 / 100).toFixed(2))
                                                    }}
                                                    className="text-xs px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 transition-colors"
                                                >
                                                    {pct > 0 ? '+' : ''}{pct}%
                                                </button>
                                            ))}
                                            {product.cost > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const marginPrice = product.cost / (1 - 0.30)
                                                        setEditPrice((Math.round(marginPrice * 100) / 100).toFixed(2))
                                                    }}
                                                    className="text-xs px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 transition-colors"
                                                >
                                                    30% margin
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Sticky Save Bar */}
            {pendingEdits.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-stone-900/95 backdrop-blur-sm border-t border-stone-700 p-4 z-50">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="text-sm text-stone-400">
                            <span className="text-amber-400 font-medium">{pendingEdits.length}</span> unsaved price change{pendingEdits.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    // Revert all and refetch
                                    setPendingEdits([])
                                    fetchData()
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm transition-colors"
                            >
                                <Undo2 className="h-4 w-4" />
                                Discard All
                            </button>
                            <button
                                onClick={saveAll}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
                            >
                                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                Save All Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
