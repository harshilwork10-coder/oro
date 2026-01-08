'use client'

import { useState, useEffect, useRef } from 'react'
import { ShoppingBag, Plus, Edit, Trash2, X, Package, AlertTriangle, Barcode, Loader2, Sparkles, Brain } from 'lucide-react'
import Link from 'next/link'

interface SKULookupResult {
    found: boolean
    barcode: string
    name?: string
    brand?: string
    category?: string
    description?: string
    imageUrl?: string
    suggestedPrice?: number
    size?: string
    source?: string
    message?: string
}

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([])
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({ name: '', sku: '', barcode: '', price: '', stock: '0', description: '', category: '', size: '' })

    // AI SKU Lookup states
    const [barcodeInput, setBarcodeInput] = useState('')
    const [lookingUpSKU, setLookingUpSKU] = useState(false)
    const [skuLookupResult, setSKULookupResult] = useState<SKULookupResult | null>(null)
    const barcodeInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { fetchProducts() }, [])

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products')
            const data = await res.json()
            const productsData = Array.isArray(data) ? data : []
            setProducts(productsData as any)
        } catch (error) {
            console.error('Failed to fetch products:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const url = '/api/products'
        const method = editingProduct ? 'PUT' : 'POST'
        const body = editingProduct ? { id: editingProduct.id, ...formData, price: parseFloat(formData.price), stock: parseInt(formData.stock) } : { ...formData, price: parseFloat(formData.price), stock: parseInt(formData.stock) }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (res.ok) {
                await fetchProducts()
                setShowModal(false)
                setEditingProduct(null)
                setFormData({ name: '', sku: '', barcode: '', price: '', stock: '0', description: '', category: '', size: '' })
            }
        } catch (error) {
            console.error('Failed to save product:', error)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this product?')) return
        try {
            const res = await fetch('/api/products', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            if (res.ok) await fetchProducts()
        } catch (error) {
            console.error('Failed to delete product:', error)
        }
    }

    const openEdit = (product: any) => {
        setEditingProduct(product)
        setFormData({
            name: product.name,
            sku: product.sku || '',
            barcode: product.barcode || '',
            price: product.price.toString(),
            stock: (product.stock || 0).toString(),
            description: product.description || '',
            category: product.category || '',
            size: product.size || ''
        })
        setShowModal(true)
        setSKULookupResult(null)
    }

    // AI SKU Lookup function
    const handleSKULookup = async (barcode: string) => {
        if (!barcode || barcode.length < 8) return

        setLookingUpSKU(true)
        setSKULookupResult(null)

        try {
            const res = await fetch(`/api/ai/sku-lookup?barcode=${encodeURIComponent(barcode)}`)
            const data = await res.json()

            setSKULookupResult(data)

            if (data.found) {
                // Auto-fill the form with looked up data
                setFormData(prev => ({
                    ...prev,
                    barcode: data.barcode,
                    name: data.name || prev.name,
                    category: data.category || prev.category,
                    description: data.brand ? `${data.brand} - ${data.name}` : prev.description,
                    price: data.suggestedPrice?.toString() || prev.price,
                    size: data.size || prev.size
                }))
            }
        } catch (error) {
            console.error('SKU lookup failed:', error)
            setSKULookupResult({ found: false, barcode, message: 'Lookup failed. Please enter details manually.' })
        } finally {
            setLookingUpSKU(false)
        }
    }

    const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSKULookup(barcodeInput)
        }
    }

    const stats = {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
        lowStock: products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length,
        totalValue: products.reduce((sum, p) => sum + (Number(p.price) * (p.stock || 0)), 0)
    }

    if (loading) return <div className="flex items-center justify-center h-screen bg-stone-950"><div className="text-orange-500 text-xl">Loading...</div></div>

    return (
        <div className="p-8 bg-stone-950 min-h-screen">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShoppingBag className="h-8 w-8 text-orange-500" />
                        Product Inventory
                    </h1>
                    <p className="text-stone-400 mt-2">Manage inventory and stock levels</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/ai-insights"
                        className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-medium flex items-center gap-2"
                    >
                        <Brain className="h-5 w-5" />
                        AI Insights
                    </Link>
                    <button onClick={() => setShowModal(true)} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add Product
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-stone-400">Total Products</div>
                        <Package className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalProducts}</div>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-stone-400">Total Stock</div>
                        <Package className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-emerald-400">{stats.totalStock}</div>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-stone-400">Low Stock Items</div>
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="text-3xl font-bold text-amber-400">{stats.lowStock}</div>
                </div>
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-stone-400">Inventory Value</div>
                        <Package className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-purple-400">${stats.totalValue.toFixed(2)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(product => {
                    const isLowStock = (product.stock || 0) > 0 && (product.stock || 0) < 10
                    const isOutOfStock = (product.stock || 0) === 0
                    return (
                        <div key={product.id} className={`glass-panel p-6 rounded-xl ${isOutOfStock ? 'border-red-500/50' : isLowStock ? 'border-amber-500/50' : ''}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{product.name}</h3>
                                    {product.sku && <p className="text-xs text-stone-500">SKU: {product.sku}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => openEdit(product)} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-orange-400">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-red-400">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${isOutOfStock ? 'bg-red-500/20 text-red-400' : isLowStock ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    <Package className="h-3 w-3" />
                                    {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}: {product.stock || 0}
                                </div>
                            </div>
                            {product.description && <p className="text-sm text-stone-400 mb-4">{product.description}</p>}
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-stone-500">Price:</span>
                                <span className="text-lg font-bold text-emerald-400">${Number(product.price).toFixed(2)}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-2xl bg-stone-900 rounded-2xl border border-stone-800 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-white">{editingProduct ? 'Edit' : 'Add'} Product</h2>
                            <button onClick={() => { setShowModal(false); setEditingProduct(null); setFormData({ name: '', sku: '', barcode: '', price: '', stock: '0', description: '', category: '', size: '' }); setSKULookupResult(null); setBarcodeInput(''); }} className="text-stone-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* AI SKU Lookup Section */}
                            {!editingProduct && (
                                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 mb-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Brain className="w-5 h-5 text-purple-400" />
                                        <span className="font-semibold text-white">AI SKU Lookup</span>
                                        <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">Auto-fill</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                                            <input
                                                ref={barcodeInputRef}
                                                type="text"
                                                placeholder="Scan or enter barcode (UPC/EAN)"
                                                value={barcodeInput}
                                                onChange={(e) => setBarcodeInput(e.target.value)}
                                                onKeyDown={handleBarcodeKeyDown}
                                                className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-stone-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleSKULookup(barcodeInput)}
                                            disabled={lookingUpSKU || barcodeInput.length < 8}
                                            className="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-700 disabled:text-stone-500 text-white rounded-lg font-medium flex items-center gap-2"
                                        >
                                            {lookingUpSKU ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-5 h-5" />
                                            )}
                                            Lookup
                                        </button>
                                    </div>

                                    {/* SKU Lookup Result */}
                                    {skuLookupResult && (
                                        <div className={`mt-3 p-3 rounded-lg ${skuLookupResult.found ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
                                            {skuLookupResult.found ? (
                                                <div className="flex items-start gap-3">
                                                    {skuLookupResult.imageUrl && (
                                                        <img
                                                            src={skuLookupResult.imageUrl}
                                                            alt={skuLookupResult.name}
                                                            className="w-12 h-12 object-cover rounded bg-white"
                                                        />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="font-medium text-emerald-400 flex items-center gap-2">
                                                            ✓ Found: {skuLookupResult.name}
                                                            {skuLookupResult.size && (
                                                                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                                                    {skuLookupResult.size}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-stone-400 mt-1">
                                                            {skuLookupResult.brand && <span className="mr-2">Brand: {skuLookupResult.brand}</span>}
                                                            {skuLookupResult.category && <span>Category: {skuLookupResult.category}</span>}
                                                        </div>
                                                        <div className="text-xs text-purple-400 mt-1">
                                                            Source: {skuLookupResult.source?.replace(/_/g, ' ')}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-yellow-400 text-sm">
                                                    {skuLookupResult.message || 'Product not found. Please fill in details manually.'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Barcode field */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Barcode (UPC)</label>
                                    <input
                                        type="text"
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                        placeholder="Auto-filled from lookup"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Category</label>
                                    <input
                                        type="text"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                        placeholder="e.g., Beverages, Snacks"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">
                                        Size
                                        <span className="text-purple-400 text-xs ml-1">(AI)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white"
                                        placeholder="e.g., 12 oz, 2 Liter"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Name</label>
                                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">SKU</label>
                                    <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-300 mb-2">Price</label>
                                    <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Stock Quantity</label>
                                <input type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-300 mb-2">Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-white" />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowModal(false); setEditingProduct(null); }} className="flex-1 px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg">Cancel</button>
                                <button type="submit" className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-lg">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

