'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Package, ArrowRight, ShoppingCart, MapPin, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Product {
    id: string
    name: string
    barcode?: string
    sku?: string
    price: number
    quantity?: number
    locationName?: string
    categoryName?: string
    taxType?: string
}

interface UniversalSearchProps {
    isOpen: boolean
    onClose: () => void
    onAddToCart?: (product: Product) => void
}

export default function UniversalSearch({ isOpen, onClose, onAddToCart }: UniversalSearchProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Product[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('')
            setResults([])
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Search function with debounce
    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([])
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
            if (res.ok) {
                const data = await res.json()
                // Handle standardized API response
                const products = data.data || data || []
                setResults(Array.isArray(products) ? products : [])
                setSelectedIndex(0)
            }
        } catch (error) {
            console.error('Search failed:', error)
            setResults([])
        }
        setLoading(false)
    }, [])

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        if (query.trim()) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(query)
            }, 150)
        } else {
            setResults([])
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [query, performSearch])

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'Escape':
                e.preventDefault()
                onClose()
                break
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => Math.max(prev - 1, 0))
                break
            case 'Enter':
                e.preventDefault()
                if (results[selectedIndex] && onAddToCart) {
                    onAddToCart(results[selectedIndex])
                    onClose()
                }
                break
        }
    }

    // Handle add to cart
    const handleAddToCart = (product: Product) => {
        if (onAddToCart) {
            onAddToCart(product)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
            <div
                className="bg-stone-900 rounded-2xl w-full max-w-2xl border border-stone-700 overflow-hidden shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="flex items-center gap-3 p-4 border-b border-stone-800">
                    <Search className="h-5 w-5 text-stone-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search products by name, barcode, or SKU..."
                        className="flex-1 bg-transparent text-lg outline-none placeholder-stone-500"
                        autoComplete="off"
                    />
                    {loading && (
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-stone-400" />
                    </button>
                </div>

                {/* Hint */}
                {!query && (
                    <div className="p-6 text-center text-stone-500">
                        <p className="text-sm">Type to search products</p>
                        <p className="text-xs mt-2 text-stone-600">
                            Press <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-xs">↵ Enter</kbd> to add to cart •
                            <kbd className="px-1.5 py-0.5 bg-stone-800 rounded text-xs ml-2">Esc</kbd> to close
                        </p>
                    </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                    <div className="max-h-[400px] overflow-y-auto">
                        {results.map((product, index) => (
                            <div
                                key={product.id}
                                className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${index === selectedIndex
                                    ? 'bg-indigo-600/20 border-l-4 border-indigo-500'
                                    : 'hover:bg-stone-800/50 border-l-4 border-transparent'
                                    }`}
                                onClick={() => handleAddToCart(product)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                {/* Product Icon */}
                                <div className="w-12 h-12 bg-stone-800 rounded-lg flex items-center justify-center shrink-0">
                                    <Package className="h-6 w-6 text-stone-500" />
                                </div>

                                {/* Product Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-white truncate">{product.name}</p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-stone-400">
                                        {product.barcode && (
                                            <span className="flex items-center gap-1">
                                                <Tag className="h-3 w-3" />
                                                {product.barcode}
                                            </span>
                                        )}
                                        {product.categoryName && (
                                            <span className="text-stone-500">{product.categoryName}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Stock & Price */}
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-lg text-emerald-400">
                                        {formatCurrency(product.price)}
                                    </p>
                                    {product.quantity !== undefined && (
                                        <p className={`text-sm flex items-center gap-1 justify-end ${product.quantity > 10
                                            ? 'text-stone-400'
                                            : product.quantity > 0
                                                ? 'text-amber-400'
                                                : 'text-red-400'
                                            }`}>
                                            <MapPin className="h-3 w-3" />
                                            {product.quantity} in stock
                                        </p>
                                    )}
                                </div>

                                {/* Add Action */}
                                {onAddToCart && (
                                    <div className={`shrink-0 ${index === selectedIndex ? 'opacity-100' : 'opacity-0'}`}>
                                        <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                                            <ShoppingCart className="h-5 w-5 text-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {query && !loading && results.length === 0 && (
                    <div className="p-8 text-center text-stone-500">
                        <Package className="h-12 w-12 mx-auto mb-3 text-stone-600" />
                        <p>No products found for "{query}"</p>
                        <p className="text-sm mt-2">Try a different search term or scan the barcode</p>
                    </div>
                )}

                {/* Footer Shortcut Hints */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-stone-800 bg-stone-950/50 text-xs text-stone-500">
                    <span>
                        <kbd className="px-1 py-0.5 bg-stone-800 rounded mr-1">↑↓</kbd> Navigate
                    </span>
                    <span>
                        <kbd className="px-1 py-0.5 bg-stone-800 rounded mr-1">↵</kbd> Add to Cart
                    </span>
                    <span>
                        <kbd className="px-1 py-0.5 bg-stone-800 rounded mr-1">Esc</kbd> Close
                    </span>
                </div>
            </div>
        </div>
    )
}
