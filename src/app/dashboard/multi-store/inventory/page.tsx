'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Package, Store, Search, RefreshCw,
    AlertTriangle, TrendingDown, ArrowRightLeft, Filter,
    ChevronRight, BarChart3
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LocationInventory {
    locationId: string
    locationName: string
    totalProducts: number
    totalValue: number
    lowStock: number
    outOfStock: number
    topProducts: {
        id: string
        name: string
        stock: number
        price: number
    }[]
}

interface ProductAcrossLocations {
    productId: string
    name: string
    sku: string | null
    barcode: string | null
    price: number
    cost: number | null
    locations: {
        locationId: string
        locationName: string
        stock: number
        reorderPoint: number | null
    }[]
    totalStock: number
}

export default function CentralizedInventoryPage() {
    const [view, setView] = useState<'overview' | 'products'>('overview')
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [locationInventories, setLocationInventories] = useState<LocationInventory[]>([])
    const [productsAcross, setProductsAcross] = useState<ProductAcrossLocations[]>([])
    const [filterLocation, setFilterLocation] = useState<string>('all')

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/owner/inventory/centralized')
            if (res.ok) {
                const data = await res.json()
                setLocationInventories(data.locationInventories || [])
                setProductsAcross(data.productsAcross || [])
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Calculate summary stats
    const totalProducts = locationInventories.reduce((sum, loc) => sum + loc.totalProducts, 0)
    const totalValue = locationInventories.reduce((sum, loc) => sum + loc.totalValue, 0)
    const totalLowStock = locationInventories.reduce((sum, loc) => sum + loc.lowStock, 0)
    const totalOutOfStock = locationInventories.reduce((sum, loc) => sum + loc.outOfStock, 0)

    // Filter products by search
    const filteredProducts = productsAcross.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/multi-store" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Centralized Inventory</h1>
                        <p className="text-stone-400">View and manage inventory across all locations</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/owner/transfers"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                        Stock Transfers
                    </Link>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg font-medium"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-600/30 to-blue-900/30 border border-blue-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5 text-blue-400" />
                        <span className="text-sm text-stone-400">Total Products</span>
                    </div>
                    <p className="text-3xl font-bold">{totalProducts.toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/30 to-emerald-900/30 border border-emerald-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm text-stone-400">Total Value</span>
                    </div>
                    <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-600/30 to-amber-900/30 border border-amber-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="h-5 w-5 text-amber-400" />
                        <span className="text-sm text-stone-400">Low Stock</span>
                    </div>
                    <p className="text-3xl font-bold">{totalLowStock}</p>
                </div>
                <div className="bg-gradient-to-br from-red-600/30 to-red-900/30 border border-red-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <span className="text-sm text-stone-400">Out of Stock</span>
                    </div>
                    <p className="text-3xl font-bold">{totalOutOfStock}</p>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setView('overview')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'overview'
                        ? 'bg-orange-600 text-white'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                        }`}
                >
                    <Store className="h-4 w-4 inline mr-2" />
                    By Location
                </button>
                <button
                    onClick={() => setView('products')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'products'
                        ? 'bg-orange-600 text-white'
                        : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                        }`}
                >
                    <Package className="h-4 w-4 inline mr-2" />
                    All Products
                </button>
            </div>

            {/* Overview by Location */}
            {view === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {locationInventories.map((loc) => (
                        <div
                            key={loc.locationId}
                            className="bg-stone-900/80 border border-stone-700 rounded-2xl p-5 hover:border-orange-500/50 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">{loc.locationName}</h3>
                                <Link
                                    href={`/dashboard/inventory/retail?locationId=${loc.locationId}`}
                                    className="text-indigo-400 hover:text-indigo-300"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="bg-stone-800/50 rounded-xl p-3">
                                    <p className="text-xs text-stone-500 mb-1">Products</p>
                                    <p className="text-xl font-bold">{loc.totalProducts}</p>
                                </div>
                                <div className="bg-stone-800/50 rounded-xl p-3">
                                    <p className="text-xs text-stone-500 mb-1">Value</p>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(loc.totalValue)}</p>
                                </div>
                            </div>

                            {/* Alerts */}
                            <div className="flex gap-2 mb-4">
                                {loc.lowStock > 0 && (
                                    <div className="flex-1 bg-amber-500/10 rounded-lg p-2 text-center">
                                        <p className="text-xs text-amber-400">{loc.lowStock} Low Stock</p>
                                    </div>
                                )}
                                {loc.outOfStock > 0 && (
                                    <div className="flex-1 bg-red-500/10 rounded-lg p-2 text-center">
                                        <p className="text-xs text-red-400">{loc.outOfStock} Out</p>
                                    </div>
                                )}
                            </div>

                            {/* Top Products */}
                            {loc.topProducts.length > 0 && (
                                <div className="border-t border-stone-700 pt-3">
                                    <p className="text-xs text-stone-500 mb-2">Top Products by Value</p>
                                    {loc.topProducts.slice(0, 3).map((p, i) => (
                                        <div key={p.id} className="flex justify-between text-sm py-1">
                                            <span className="text-stone-400">{i + 1}. {p.name}</span>
                                            <span className="font-medium">{p.stock} units</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {locationInventories.length === 0 && !loading && (
                        <div className="col-span-full text-center py-16 text-stone-400">
                            <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-xl">No inventory data found</p>
                            <p className="text-sm">Add products to your locations to see data here</p>
                        </div>
                    )}
                </div>
            )}

            {/* Products Across Locations */}
            {view === 'products' && (
                <div>
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search products by name, SKU, or barcode..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                    </div>

                    {/* Products Table */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-stone-800/50 border-b border-stone-700">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-stone-400">Product</th>
                                        <th className="px-4 py-3 font-medium text-stone-400">SKU</th>
                                        <th className="px-4 py-3 font-medium text-stone-400">Price</th>
                                        {locationInventories.map(loc => (
                                            <th key={loc.locationId} className="px-4 py-3 font-medium text-stone-400 text-center">
                                                {loc.locationName}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 font-medium text-stone-400 text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-800">
                                    {filteredProducts.slice(0, 50).map((product) => (
                                        <tr key={product.productId} className="hover:bg-stone-800/50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{product.name}</p>
                                                {product.barcode && (
                                                    <p className="text-xs text-stone-500">{product.barcode}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-stone-400">
                                                {product.sku || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-emerald-400">
                                                {formatCurrency(product.price)}
                                            </td>
                                            {locationInventories.map(loc => {
                                                const locData = product.locations.find(l => l.locationId === loc.locationId)
                                                const stock = locData?.stock ?? 0
                                                const reorder = locData?.reorderPoint ?? 5
                                                const isLow = stock > 0 && stock <= reorder
                                                const isOut = stock === 0

                                                return (
                                                    <td key={loc.locationId} className="px-4 py-3 text-center">
                                                        <span className={`font-bold ${isOut ? 'text-red-400' :
                                                            isLow ? 'text-amber-400' : 'text-white'
                                                            }`}>
                                                            {stock}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                            <td className="px-4 py-3 text-center font-bold text-blue-400">
                                                {product.totalStock}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredProducts.length === 0 && !loading && (
                            <div className="text-center py-12 text-stone-400">
                                <p>No products found</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-8 w-8 animate-spin text-orange-400" />
                </div>
            )}
        </div>
    )
}
