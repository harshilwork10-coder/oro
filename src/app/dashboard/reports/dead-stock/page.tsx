'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    Package,
    ArrowLeft,
    AlertTriangle,
    DollarSign,
    TrendingDown,
    Search,
    Filter,
    Download,
    RefreshCw,
    Clock,
    PackageX,
    Zap,
    Tag,
    Smartphone,
    Monitor,
    Percent,
    CheckCircle,
    X
} from 'lucide-react'
import Link from 'next/link'

interface DeadStockProduct {
    id: string
    name: string
    sku: string | null
    barcode: string | null
    stock: number
    price: number
    cost: number | null
    category: string
    stockValue: number
    costValue: number
    lastSaleDate: string | null
    daysSinceLastSale: number | null
    neverSold: boolean
}

interface Summary {
    productCount: number
    totalStockValue: number
    totalCostValue: number
    potentialLoss: number
    neverSoldCount: number
    daysThreshold: number
}

export default function DeadStockReportPage() {
    const { data: session } = useSession()
    const [products, setProducts] = useState<DeadStockProduct[]>([])
    const [summary, setSummary] = useState<Summary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [daysThreshold, setDaysThreshold] = useState(90)
    const [categoryFilter, setCategoryFilter] = useState<string>('all')

    // Selection and Deal Creation
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [showDealModal, setShowDealModal] = useState(false)
    const [discountPercent, setDiscountPercent] = useState(20)
    const [dealDuration, setDealDuration] = useState(7)
    const [dealName, setDealName] = useState('')
    const [creatingDeal, setCreatingDeal] = useState(false)
    const [dealSuccess, setDealSuccess] = useState<string | null>(null)

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/reports/dead-stock?days=${daysThreshold}`)
            if (!res.ok) throw new Error('Failed to fetch data')
            const data = await res.json()
            setProducts(data.products || [])
            setSummary(data.summary || null)
        } catch (err) {
            setError('Failed to load dead stock report')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [daysThreshold])

    const categories = [...new Set(products.map(p => p.category))]

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (p.barcode && p.barcode.includes(searchTerm))
        const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Never'
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const exportToCSV = () => {
        const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Stock', 'Price', 'Stock Value', 'Last Sale', 'Days Since Sale']
        const rows = filteredProducts.map(p => [
            p.name,
            p.sku || '',
            p.barcode || '',
            p.category,
            p.stock,
            p.price,
            p.stockValue,
            p.lastSaleDate || 'Never',
            p.daysSinceLastSale ?? 'N/A'
        ])
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dead-stock-report-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const selectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)))
        }
    }

    const selectedProducts = products.filter(p => selectedIds.has(p.id))
    const selectedValue = selectedProducts.reduce((sum, p) => sum + p.stockValue, 0)
    const potentialSavings = selectedValue * (discountPercent / 100)

    const createInstantDeal = async () => {
        if (selectedIds.size === 0) return

        setCreatingDeal(true)
        try {
            const res = await fetch('/api/reports/dead-stock/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productIds: Array.from(selectedIds),
                    discountType: 'PERCENTAGE',
                    discountValue: discountPercent,
                    dealName: dealName || `🔥 Clearance Sale - ${discountPercent}% Off`,
                    duration: dealDuration
                })
            })

            const data = await res.json()

            if (res.ok) {
                setDealSuccess(`✅ Deal created! ${selectedIds.size} items now on sale. Shows on Customer Display & Mobile App!`)
                setShowDealModal(false)
                setSelectedIds(new Set())
                setTimeout(() => setDealSuccess(null), 5000)
            } else {
                setError(data.error || 'Failed to create deal')
            }
        } catch (err) {
            setError('Failed to create deal')
        } finally {
            setCreatingDeal(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Success Banner */}
            {dealSuccess && (
                <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-500/50 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <p className="text-green-300 font-medium">{dealSuccess}</p>
                    <div className="ml-auto flex items-center gap-2 text-green-400">
                        <Monitor className="w-4 h-4" />
                        <span className="text-sm">Customer Display</span>
                        <Smartphone className="w-4 h-4" />
                        <span className="text-sm">Mobile App</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/reports/inventory"
                        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600">
                                <PackageX className="w-6 h-6 text-white" />
                            </div>
                            Dead Stock Alert
                        </h1>
                        <p className="text-gray-400 mt-1">Products not sold in {daysThreshold}+ days</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => setShowDealModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-semibold transition-all shadow-lg shadow-green-500/25 animate-pulse"
                        >
                            <Zap className="w-5 h-5" />
                            Create Instant Deal ({selectedIds.size})
                        </button>
                    )}
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/20">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{summary.productCount}</p>
                                <p className="text-sm text-red-300">Dead Stock Items</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/20">
                                <DollarSign className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalStockValue)}</p>
                                <p className="text-sm text-orange-300">Value at Risk</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/30 border border-yellow-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/20">
                                <TrendingDown className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{formatCurrency(summary.potentialLoss)}</p>
                                <p className="text-sm text-yellow-300">Cost Tied Up</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-500/20">
                                <PackageX className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{summary.neverSoldCount}</p>
                                <p className="text-sm text-gray-400">Never Sold</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name, SKU, or barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <select
                        value={daysThreshold}
                        onChange={(e) => setDaysThreshold(Number(e.target.value))}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                        <option value={30}>30+ days</option>
                        <option value={60}>60+ days</option>
                        <option value={90}>90+ days</option>
                        <option value={180}>180+ days</option>
                        <option value={365}>365+ days</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {filteredProducts.length > 0 && (
                    <button
                        onClick={selectAll}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
                    >
                        {selectedIds.size === filteredProducts.length ? 'Deselect All' : 'Select All'}
                    </button>
                )}
            </div>

            {/* Products Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                    <p>{error}</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700">
                    <Package className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p className="text-xl font-semibold text-white mb-2">No Dead Stock Found!</p>
                    <p className="text-gray-400">All products with stock have been sold in the last {daysThreshold} days.</p>
                </div>
            ) : (
                <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-700 bg-gray-800/50">
                                    <th className="w-10 py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                                            onChange={selectAll}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                                        />
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Product</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Category</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Stock</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Price</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Value</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Days Idle</th>
                                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-300">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        onClick={() => toggleSelect(product.id)}
                                        className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors cursor-pointer ${selectedIds.has(product.id) ? 'bg-green-900/20 border-green-500/30' :
                                            product.neverSold ? 'bg-red-900/10' : ''
                                            }`}
                                    >
                                        <td className="py-3 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(product.id)}
                                                onChange={() => toggleSelect(product.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500"
                                            />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium text-white">{product.name}</p>
                                                {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400">{product.category}</td>
                                        <td className="py-3 px-4 text-right text-white">{product.stock}</td>
                                        <td className="py-3 px-4 text-right text-white">{formatCurrency(product.price)}</td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-orange-400 font-semibold">
                                                {formatCurrency(product.stockValue)}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {product.daysSinceLastSale !== null ? (
                                                <span className={`font-semibold ${product.daysSinceLastSale > 180 ? 'text-red-400' :
                                                    product.daysSinceLastSale > 90 ? 'text-orange-400' :
                                                        'text-yellow-400'
                                                    }`}>
                                                    {product.daysSinceLastSale}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {product.neverSold ? (
                                                <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/30">
                                                    Never Sold
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                                    Slow Moving
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer with Selection Summary */}
                    <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <p className="text-sm text-gray-400">
                                {selectedIds.size > 0 ? (
                                    <span className="text-green-400">{selectedIds.size} selected ({formatCurrency(selectedValue)})</span>
                                ) : (
                                    `${filteredProducts.length} items`
                                )}
                            </p>
                        </div>
                        <p className="text-sm text-orange-400 font-medium">
                            Total: {formatCurrency(filteredProducts.reduce((sum, p) => sum + p.stockValue, 0))}
                        </p>
                    </div>
                </div>
            )}

            {/* Instant Deal Creation CTA */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 shadow-2xl shadow-green-500/30 flex items-center gap-6 animate-bounce">
                    <div className="flex items-center gap-3">
                        <Zap className="w-8 h-8 text-white" />
                        <div>
                            <p className="text-white font-bold">{selectedIds.size} items selected</p>
                            <p className="text-green-200 text-sm">{formatCurrency(selectedValue)} at risk</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowDealModal(true)}
                        className="px-6 py-3 bg-white text-green-600 font-bold rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        ⚡ Create Instant Deal
                    </button>
                </div>
            )}

            {/* Deal Creation Modal */}
            {showDealModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-8 h-8 text-white" />
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Create Instant Deal</h2>
                                        <p className="text-green-200">{selectedIds.size} dead stock items</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDealModal(false)}
                                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Deal Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Deal Name (optional)</label>
                                <input
                                    type="text"
                                    value={dealName}
                                    onChange={(e) => setDealName(e.target.value)}
                                    placeholder="🔥 Clearance Sale"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                                />
                            </div>

                            {/* Discount Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-300">Discount</label>
                                    <span className="text-2xl font-bold text-green-400">{discountPercent}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="75"
                                    step="5"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>5%</span>
                                    <span>25%</span>
                                    <span>50%</span>
                                    <span>75%</span>
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Deal Duration</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[3, 7, 14, 30].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => setDealDuration(days)}
                                            className={`py-2 rounded-lg text-sm font-medium transition-colors ${dealDuration === days
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                }`}
                                        >
                                            {days} days
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                                <h4 className="text-sm font-medium text-gray-400 mb-3">Deal Preview</h4>
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div>
                                        <p className="text-2xl font-bold text-white">{selectedIds.size}</p>
                                        <p className="text-xs text-gray-500">Products</p>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-400">{formatCurrency(potentialSavings)}</p>
                                        <p className="text-xs text-gray-500">Customer Savings</p>
                                    </div>
                                </div>
                            </div>

                            {/* Where It Shows */}
                            <div className="flex items-center justify-center gap-6 py-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
                                <div className="flex items-center gap-2 text-purple-300">
                                    <Monitor className="w-5 h-5" />
                                    <span className="text-sm">Customer Display</span>
                                </div>
                                <div className="w-px h-6 bg-gray-600"></div>
                                <div className="flex items-center gap-2 text-blue-300">
                                    <Smartphone className="w-5 h-5" />
                                    <span className="text-sm">Oro Buddy App</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-gray-800/50 border-t border-gray-700 flex gap-4">
                            <button
                                onClick={() => setShowDealModal(false)}
                                className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createInstantDeal}
                                disabled={creatingDeal}
                                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-lg text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {creatingDeal ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5" />
                                        Create Deal Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
