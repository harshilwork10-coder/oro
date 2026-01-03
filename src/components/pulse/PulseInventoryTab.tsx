'use client'

import { Search, Plus, ChevronDown, RefreshCw, Package, AlertTriangle, Edit3 } from 'lucide-react'
import type { Product, Department, LowStockItem } from './types'

interface PulseInventoryTabProps {
    departments: Department[]
    products: Product[]
    selectedDept: string | null
    invSearch: string
    invLoading: boolean
    lowStockItems: LowStockItem[]
    onDeptSelect: (dept: string | null) => void
    onSearchChange: (search: string) => void
    onViewAllProducts: () => void
    onScanBarcode: () => void
    onAddProduct: () => void
    onEditProduct: (product: Product) => void
    onFetchProducts: (category?: string) => void
}

export default function PulseInventoryTab({
    departments,
    products,
    selectedDept,
    invSearch,
    invLoading,
    lowStockItems,
    onDeptSelect,
    onSearchChange,
    onViewAllProducts,
    onScanBarcode,
    onAddProduct,
    onEditProduct,
    onFetchProducts
}: PulseInventoryTabProps) {

    // Filter products by search
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(invSearch.toLowerCase()) ||
        p.sku?.toLowerCase().includes(invSearch.toLowerCase()) ||
        p.barcode?.includes(invSearch)
    )

    return (
        <>
            {/* Department view or Product view */}
            {!selectedDept ? (
                <>
                    {/* Header when viewing departments */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-white">📦 Departments</h2>
                        <button
                            onClick={onViewAllProducts}
                            className="text-sm text-orange-400 hover:text-orange-300"
                        >
                            View All Products →
                        </button>
                    </div>

                    {/* Department Cards Grid */}
                    {departments.length === 0 ? (
                        <div className="text-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-500 mb-2" />
                            <p className="text-gray-500 text-sm">Loading departments...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {departments.map(dept => (
                                <button
                                    key={dept.id}
                                    onClick={() => {
                                        onDeptSelect(dept.name)
                                        onFetchProducts(dept.name === 'All Products' ? undefined : dept.name)
                                    }}
                                    className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 text-left hover:border-orange-500 transition-all active:scale-95"
                                >
                                    <div className="text-3xl mb-2">{dept.icon || '📁'}</div>
                                    <p className="text-white font-semibold text-sm truncate">{dept.name}</p>
                                    <p className="text-gray-500 text-xs">{dept.productCount || 0} products</p>
                                </button>
                            ))}
                            {/* Add Product button */}
                            <button
                                onClick={onAddProduct}
                                className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-600/50 rounded-xl p-4 text-left hover:border-green-500 transition-all active:scale-95"
                            >
                                <div className="text-3xl mb-2">➕</div>
                                <p className="text-green-400 font-semibold text-sm">Add Product</p>
                                <p className="text-gray-500 text-xs">Add new item</p>
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Back button + Department name */}
                    <div className="flex items-center gap-3 mb-4">
                        <button
                            onClick={() => onDeptSelect(null)}
                            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 active:scale-95"
                        >
                            <ChevronDown className="w-5 h-5 text-gray-400 rotate-90" />
                        </button>
                        <h2 className="text-lg font-bold text-white flex-1">
                            {selectedDept === 'all' ? '📦 All Products' : `📁 ${selectedDept}`}
                        </h2>
                    </div>

                    {/* Search, Scan & Add */}
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={invSearch}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-orange-500"
                            />
                        </div>
                        <button
                            onClick={onScanBarcode}
                            className="px-4 py-3 bg-orange-600 rounded-xl flex items-center active:scale-95"
                            title="Scan Barcode"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 5h2v14H3zM7 5h1v14H7zM11 5h2v14h-2zM15 5h1v14h-1zM19 5h2v14h-2z" />
                            </svg>
                        </button>
                        <button
                            onClick={onAddProduct}
                            className="px-4 py-3 bg-green-600 rounded-xl flex items-center active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Low Stock Alert */}
                    {lowStockItems.length > 0 && (
                        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-3 mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 text-sm font-medium">{lowStockItems.length} items low stock</span>
                            </div>
                        </div>
                    )}

                    {/* Product List */}
                    {invLoading ? (
                        <div className="text-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-500" />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>{invSearch ? 'No products match your search' : 'No products in this category'}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    className={`bg-gray-800/50 border rounded-xl p-3 ${product.stock <= 5 ? 'border-red-500/50' : 'border-gray-700'}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-white font-medium text-sm">{product.name}</p>
                                            <p className="text-gray-500 text-xs">
                                                {product.sku && `SKU: ${product.sku} • `}
                                                {product.category}
                                                {product.location && ` • ${product.location}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => onEditProduct(product)}
                                            className="p-2 text-gray-400 hover:text-white"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
                                        <div className="flex gap-4 text-sm">
                                            <span className="text-green-400 font-bold">${product.price.toFixed(2)}</span>
                                            {product.costPrice > 0 && (
                                                <span className="text-gray-500">Cost: ${product.costPrice.toFixed(2)}</span>
                                            )}
                                        </div>
                                        <span className={`font-bold ${product.stock <= 5 ? 'text-red-400' : 'text-blue-400'}`}>
                                            {product.stock} in stock
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </>
    )
}
