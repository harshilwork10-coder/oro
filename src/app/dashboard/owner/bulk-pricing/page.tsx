'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, DollarSign, RefreshCw, Search, Filter,
    Percent, CheckCircle, X, TrendingUp, Package
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Product {
    id: string
    name: string
    barcode: string | null
    sku: string | null
    price: number
    cost: number | null
    margin: number | null
    category: { id: string, name: string } | null
}

interface Category {
    id: string
    name: string
}

export default function BulkPricingPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
    const [priceChanges, setPriceChanges] = useState<Map<string, number>>(new Map())
    const [bulkMode, setBulkMode] = useState<'individual' | 'percentage' | 'margin'>('individual')
    const [bulkValue, setBulkValue] = useState('')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.set('search', search)
            if (selectedCategory) params.set('categoryId', selectedCategory)
            params.set('limit', '100')

            const res = await fetch(`/api/owner/bulk-pricing?${params}`)
            const data = await res.json()

            setProducts(data.products || [])
            setCategories(data.categories || [])
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(fetchData, 300)
        return () => clearTimeout(timer)
    }, [search, selectedCategory])

    const toggleSelect = (productId: string) => {
        const newSelected = new Set(selectedProducts)
        if (newSelected.has(productId)) {
            newSelected.delete(productId)
        } else {
            newSelected.add(productId)
        }
        setSelectedProducts(newSelected)
    }

    const selectAll = () => {
        if (selectedProducts.size === products.length) {
            setSelectedProducts(new Set())
        } else {
            setSelectedProducts(new Set(products.map(p => p.id)))
        }
    }

    const updatePrice = (productId: string, newPrice: string) => {
        const price = parseFloat(newPrice)
        if (isNaN(price) || price < 0) return
        setPriceChanges(new Map(priceChanges.set(productId, price)))
    }

    const applyPercentage = () => {
        const pct = parseFloat(bulkValue)
        if (isNaN(pct)) return

        const newChanges = new Map(priceChanges)
        selectedProducts.forEach(id => {
            const product = products.find(p => p.id === id)
            if (product) {
                const newPrice = product.price * (1 + pct / 100)
                newChanges.set(id, Math.round(newPrice * 100) / 100)
            }
        })
        setPriceChanges(newChanges)
    }

    const applyMargin = () => {
        const margin = parseFloat(bulkValue)
        if (isNaN(margin) || margin >= 100) return

        const newChanges = new Map(priceChanges)
        selectedProducts.forEach(id => {
            const product = products.find(p => p.id === id)
            if (product && product.cost) {
                const newPrice = product.cost / (1 - margin / 100)
                newChanges.set(id, Math.round(newPrice * 100) / 100)
            }
        })
        setPriceChanges(newChanges)
    }

    const handleSave = async () => {
        if (priceChanges.size === 0) return

        setSaving(true)
        setMessage('')
        try {
            const updates = Array.from(priceChanges.entries()).map(([productId, newPrice]) => ({
                productId,
                newPrice
            }))

            const res = await fetch('/api/owner/bulk-pricing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'individual',
                    updates
                })
            })

            const data = await res.json()
            if (res.ok) {
                setMessage(`✓ ${data.updatedCount} product(s) updated`)
                setPriceChanges(new Map())
                setSelectedProducts(new Set())
                fetchData()
            } else {
                setMessage(`Error: ${data.error}`)
            }
        } catch (error) {
            setMessage('Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    const getNewPrice = (productId: string) => {
        return priceChanges.get(productId)
    }

    const getPriceDiff = (product: Product) => {
        const newPrice = getNewPrice(product.id)
        if (newPrice === undefined) return null
        return newPrice - product.price
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
                            <DollarSign className="h-8 w-8 text-green-500" />
                            Bulk Price Update
                        </h1>
                        <p className="text-stone-400">Update prices across all products</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {priceChanges.size > 0 && (
                        <button
                            onClick={() => setPriceChanges(new Map())}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-xl"
                        >
                            <X className="h-4 w-4" />
                            Clear ({priceChanges.size})
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || priceChanges.size === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Bulk Action Bar */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <select
                        value={bulkMode}
                        onChange={(e) => setBulkMode(e.target.value as any)}
                        className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2"
                    >
                        <option value="individual">Individual Edit</option>
                        <option value="percentage">Adjust by %</option>
                        <option value="margin">Set Margin %</option>
                    </select>

                    {bulkMode !== 'individual' && (
                        <>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={bulkValue}
                                    onChange={(e) => setBulkValue(e.target.value)}
                                    placeholder={bulkMode === 'percentage' ? '+5 or -10' : '30'}
                                    className="w-24 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2"
                                />
                                <Percent className="h-4 w-4 text-stone-500" />
                            </div>
                            <button
                                onClick={bulkMode === 'percentage' ? applyPercentage : applyMargin}
                                disabled={selectedProducts.size === 0 || !bulkValue}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg disabled:opacity-50"
                            >
                                Apply to {selectedProducts.size} selected
                            </button>
                        </>
                    )}

                    <div className="flex-1" />

                    <span className="text-sm text-stone-400">
                        {priceChanges.size} pending change{priceChanges.size !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Products Table */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-stone-800">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={selectedProducts.size === products.length && products.length > 0}
                                    onChange={selectAll}
                                    className="rounded"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-sm text-stone-400">Product</th>
                            <th className="px-4 py-3 text-left text-sm text-stone-400">SKU/Barcode</th>
                            <th className="px-4 py-3 text-right text-sm text-stone-400">Cost</th>
                            <th className="px-4 py-3 text-right text-sm text-stone-400">Current Price</th>
                            <th className="px-4 py-3 text-right text-sm text-stone-400">New Price</th>
                            <th className="px-4 py-3 text-right text-sm text-stone-400">Margin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                                </td>
                            </tr>
                        ) : products.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No products found</p>
                                </td>
                            </tr>
                        ) : (
                            products.map(product => {
                                const diff = getPriceDiff(product)
                                const newPrice = getNewPrice(product.id)
                                const newMargin = newPrice !== undefined && product.cost
                                    ? ((newPrice - product.cost) / newPrice * 100)
                                    : product.margin

                                return (
                                    <tr key={product.id} className="border-t border-stone-700 hover:bg-stone-800/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedProducts.has(product.id)}
                                                onChange={() => toggleSelect(product.id)}
                                                className="rounded"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">{product.name}</p>
                                            <p className="text-xs text-stone-500">{product.category?.name || 'Uncategorized'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-stone-400 text-sm">
                                            {product.sku || product.barcode || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-stone-400">
                                            {product.cost ? formatCurrency(product.cost) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {formatCurrency(product.price)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newPrice !== undefined ? newPrice : ''}
                                                    onChange={(e) => updatePrice(product.id, e.target.value)}
                                                    placeholder={product.price.toFixed(2)}
                                                    className="w-24 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-right"
                                                />
                                                {diff !== null && (
                                                    <span className={`text-xs ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {newMargin !== null && newMargin !== undefined ? (
                                                <span className={`${newMargin < 20 ? 'text-red-400' : newMargin > 40 ? 'text-green-400' : 'text-stone-400'}`}>
                                                    {newMargin.toFixed(1)}%
                                                </span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

