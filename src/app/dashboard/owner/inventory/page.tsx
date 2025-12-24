'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Search, RefreshCw, Store, Package,
    DollarSign, CheckCircle, X, Edit, Save
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationPrice {
    locationId: string
    locationName: string
    price: number
    stock: number
    cost: number | null
    // Editing state
    editedPrice?: number
    editedStock?: number
}

interface Product {
    id: string
    name: string
    barcode: string | null
    sku: string | null
    imageUrl: string | null
    category: string
    basePrice: number
    baseCost: number | null
    baseStock: number
    locations: LocationPrice[]
}

interface Location {
    id: string
    name: string
}

export default function CrossStoreInventoryPage() {
    const { data: session } = useSession()
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState<Product[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [editMode, setEditMode] = useState(false)
    const [editedPrices, setEditedPrices] = useState<Map<string, number>>(new Map())
    const [editedStocks, setEditedStocks] = useState<Map<string, number>>(new Map())
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    const searchProducts = async () => {
        if (!search.trim()) return

        setLoading(true)
        setMessage('')
        try {
            const res = await fetch(`/api/owner/cross-store-inventory?search=${encodeURIComponent(search)}`)
            const data = await res.json()

            setProducts(data.products || [])
            setLocations(data.locations || [])

            if (data.products?.length === 1) {
                setSelectedProduct(data.products[0])
            } else {
                setSelectedProduct(null)
            }
        } catch (error) {
            console.error('Search failed:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if (search.length >= 2) searchProducts()
        }, 400)
        return () => clearTimeout(timer)
    }, [search])

    const selectProduct = (product: Product) => {
        setSelectedProduct(product)
        setEditMode(false)
        setEditedPrices(new Map())
        setEditedStocks(new Map())
    }

    const startEdit = () => {
        if (!selectedProduct) return
        setEditMode(true)
        // Initialize edited values with current values
        const prices = new Map<string, number>()
        const stocks = new Map<string, number>()
        selectedProduct.locations.forEach(loc => {
            prices.set(loc.locationId, loc.price)
            stocks.set(loc.locationId, loc.stock)
        })
        setEditedPrices(prices)
        setEditedStocks(stocks)
    }

    const updatePrice = (locationId: string, value: string) => {
        const price = parseFloat(value)
        if (!isNaN(price) && price >= 0) {
            setEditedPrices(new Map(editedPrices.set(locationId, price)))
        }
    }

    const updateStock = (locationId: string, value: string) => {
        const stock = parseInt(value)
        if (!isNaN(stock) && stock >= 0) {
            setEditedStocks(new Map(editedStocks.set(locationId, stock)))
        }
    }

    const setAllSamePrice = (price: number) => {
        const newPrices = new Map<string, number>()
        selectedProduct?.locations.forEach(loc => {
            newPrices.set(loc.locationId, price)
        })
        setEditedPrices(newPrices)
    }

    const saveChanges = async () => {
        if (!selectedProduct) return

        setSaving(true)
        setMessage('')
        try {
            const updates = selectedProduct.locations.map(loc => ({
                locationId: loc.locationId,
                price: editedPrices.get(loc.locationId) ?? loc.price,
                stock: editedStocks.get(loc.locationId) ?? loc.stock
            }))

            const res = await fetch('/api/owner/cross-store-inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    updates
                })
            })

            const data = await res.json()
            if (res.ok) {
                setMessage('✓ ' + data.message)
                setEditMode(false)
                // Refresh the product
                searchProducts()
            } else {
                setMessage('Error: ' + data.error)
            }
        } catch (error) {
            setMessage('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const hasChanges = () => {
        if (!selectedProduct) return false
        return selectedProduct.locations.some(loc => {
            const editedPrice = editedPrices.get(loc.locationId)
            const editedStock = editedStocks.get(loc.locationId)
            return (editedPrice !== undefined && editedPrice !== loc.price) ||
                (editedStock !== undefined && editedStock !== loc.stock)
        })
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
                            <Store className="h-8 w-8 text-orange-500" />
                            Cross-Store Inventory
                        </h1>
                        <p className="text-stone-400">Search products and set prices per location</p>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Search */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, barcode, or SKU... (e.g. Jack Daniels)"
                        className="w-full pl-12 pr-4 py-4 bg-stone-800 border border-stone-700 rounded-2xl text-lg focus:border-orange-500 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                    />
                </div>
                <button
                    onClick={searchProducts}
                    disabled={loading}
                    className="px-6 py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl font-medium flex items-center gap-2"
                >
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    Search
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product List */}
                <div className="lg:col-span-1 bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-400" />
                        Search Results ({products.length})
                    </h3>

                    {products.length === 0 && !loading && search && (
                        <div className="text-center py-8 text-stone-500">
                            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>No products found</p>
                            <p className="text-sm">Try a different search term</p>
                        </div>
                    )}

                    {products.length === 0 && !search && (
                        <div className="text-center py-8 text-stone-500">
                            <Search className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p>Enter a product name to search</p>
                        </div>
                    )}

                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {products.map(product => (
                            <button
                                key={product.id}
                                onClick={() => selectProduct(product)}
                                className={`w-full text-left p-4 rounded-xl transition-all ${selectedProduct?.id === product.id
                                        ? 'bg-orange-500/20 border border-orange-500'
                                        : 'bg-stone-800 hover:bg-stone-700 border border-stone-700'
                                    }`}
                            >
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-stone-400">{product.category}</p>
                                <div className="flex justify-between mt-2 text-sm">
                                    <span className="text-emerald-400">{formatCurrency(product.basePrice)}</span>
                                    <span className="text-stone-500">Stock: {product.baseStock}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Per-Store Details */}
                <div className="lg:col-span-2 bg-stone-900/80 border border-stone-700 rounded-2xl p-5">
                    {!selectedProduct ? (
                        <div className="text-center py-16 text-stone-500">
                            <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="text-xl">Select a product</p>
                            <p>to see prices across all stores</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                                    <p className="text-stone-400">{selectedProduct.category}</p>
                                    <div className="flex gap-4 mt-2 text-sm text-stone-500">
                                        {selectedProduct.barcode && <span>Barcode: {selectedProduct.barcode}</span>}
                                        {selectedProduct.sku && <span>SKU: {selectedProduct.sku}</span>}
                                    </div>
                                </div>
                                {!editMode ? (
                                    <button
                                        onClick={startEdit}
                                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl"
                                    >
                                        <Edit className="h-4 w-4" />
                                        Edit Prices
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditMode(false)}
                                            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-xl"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveChanges}
                                            disabled={saving || !hasChanges()}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl disabled:opacity-50"
                                        >
                                            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Save Changes
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Quick Set All Same */}
                            {editMode && (
                                <div className="mb-6 p-4 bg-stone-800 rounded-xl">
                                    <p className="text-sm text-stone-400 mb-2">Quick: Set all stores to same price</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setAllSamePrice(selectedProduct.basePrice)}
                                            className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded text-sm"
                                        >
                                            Current: {formatCurrency(selectedProduct.basePrice)}
                                        </button>
                                        {selectedProduct.baseCost && (
                                            <>
                                                <button
                                                    onClick={() => setAllSamePrice(selectedProduct.baseCost! * 1.3)}
                                                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded text-sm"
                                                >
                                                    30% Margin
                                                </button>
                                                <button
                                                    onClick={() => setAllSamePrice(selectedProduct.baseCost! * 1.4)}
                                                    className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded text-sm"
                                                >
                                                    40% Margin
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Store Grid */}
                            <div className="space-y-4">
                                {selectedProduct.locations.map(loc => {
                                    const editedPrice = editedPrices.get(loc.locationId)
                                    const editedStock = editedStocks.get(loc.locationId)
                                    const priceChanged = editedPrice !== undefined && editedPrice !== loc.price
                                    const stockChanged = editedStock !== undefined && editedStock !== loc.stock

                                    return (
                                        <div
                                            key={loc.locationId}
                                            className={`p-5 rounded-xl border ${priceChanged || stockChanged
                                                    ? 'bg-orange-500/10 border-orange-500/50'
                                                    : 'bg-stone-800 border-stone-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Store className="h-5 w-5 text-blue-400" />
                                                    <span className="font-bold text-lg">{loc.locationName}</span>
                                                </div>
                                                {(priceChanged || stockChanged) && (
                                                    <span className="text-xs px-2 py-1 bg-orange-500/30 text-orange-400 rounded">
                                                        Modified
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                {/* Price */}
                                                <div>
                                                    <label className="text-xs text-stone-500">Price</label>
                                                    {editMode ? (
                                                        <div className="relative mt-1">
                                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={editedPrice ?? loc.price}
                                                                onChange={(e) => updatePrice(loc.locationId, e.target.value)}
                                                                className="w-full pl-8 pr-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-lg"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="text-2xl font-bold text-emerald-400 mt-1">
                                                            {formatCurrency(loc.price)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Stock */}
                                                <div>
                                                    <label className="text-xs text-stone-500">Stock</label>
                                                    {editMode ? (
                                                        <input
                                                            type="number"
                                                            value={editedStock ?? loc.stock}
                                                            onChange={(e) => updateStock(loc.locationId, e.target.value)}
                                                            className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-lg mt-1"
                                                        />
                                                    ) : (
                                                        <p className={`text-2xl font-bold mt-1 ${loc.stock <= 5 ? 'text-red-400' : ''}`}>
                                                            {loc.stock}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Cost/Margin */}
                                                <div>
                                                    <label className="text-xs text-stone-500">Cost / Margin</label>
                                                    <p className="text-lg mt-1 text-stone-400">
                                                        {loc.cost ? formatCurrency(loc.cost) : '-'}
                                                        {loc.cost && (
                                                            <span className="ml-2 text-sm">
                                                                ({(((editedPrice ?? loc.price) - loc.cost) / (editedPrice ?? loc.price) * 100).toFixed(0)}%)
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Total Summary */}
                            <div className="mt-6 p-4 bg-stone-800 rounded-xl">
                                <div className="flex justify-between text-sm">
                                    <span className="text-stone-400">Total Stock Across All Stores</span>
                                    <span className="font-bold">
                                        {editMode
                                            ? selectedProduct.locations.reduce((sum, loc) => sum + (editedStocks.get(loc.locationId) ?? loc.stock), 0)
                                            : selectedProduct.baseStock * selectedProduct.locations.length}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
