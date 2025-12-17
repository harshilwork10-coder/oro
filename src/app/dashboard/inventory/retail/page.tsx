'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    Search, Plus, Save, Copy, Trash2, Package,
    ChevronLeft, ChevronRight, Barcode, DollarSign,
    Percent, AlertTriangle, Check, X, ShoppingCart, ArrowLeft, Folder, Tag, Gift,
    Brain, Sparkles, Loader2, TrendingUp, Clock, ShoppingBag, Zap
} from 'lucide-react'
import Toast from '@/components/ui/Toast'
import DepartmentManagerModal from '@/components/modals/DepartmentManagerModal'
import PromotionManagerModal from '@/components/modals/PromotionManagerModal'
import NumpadModal from '@/components/modals/NumpadModal'

interface Product {
    id: string
    name: string
    barcode: string | null
    sku: string | null
    price: number
    cost: number | null
    stock: number
    reorderPoint: number | null
    categoryId: string | null
    category: string | null
    productCategory?: {
        id: string
        name: string
        ageRestricted: boolean
        minimumAge: number | null
    }
    brand: string | null        // Who makes it (e.g., "Bulleit", "Coca-Cola")
    vendor: string | null       // Who you buy from (e.g., "Southern Glazer's")
    isActive: boolean
    size: string | null         // e.g., "750ml", "12 oz", "6 Pack"
    productType: string | null  // e.g., "Whiskey", "Lager", "Energy Drink"
}

interface Category {
    id: string
    name: string
    ageRestricted: boolean
    minimumAge: number | null
}

export default function RetailInventoryPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchCode, setSearchCode] = useState('')
    const searchRef = useRef<HTMLInputElement>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [showDeptModal, setShowDeptModal] = useState(false)
    const [showPromoModal, setShowPromoModal] = useState(false)

    // Current product being edited
    const [editProduct, setEditProduct] = useState<Product | null>(null)

    // AI SKU Lookup states
    const [lookingUpSKU, setLookingUpSKU] = useState(false)
    const [skuLookupResult, setSKULookupResult] = useState<any>(null)

    // Numpad modal states
    const [numpadField, setNumpadField] = useState<'cost' | 'price' | 'stock' | null>(null)
    const [showNumpad, setShowNumpad] = useState(false)

    // Product insights state
    const [insights, setInsights] = useState<any>(null)
    const [loadingInsights, setLoadingInsights] = useState(false)

    // Load products and categories
    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                fetch('/api/inventory/products'),
                fetch('/api/inventory/categories')
            ])

            if (productsRes.ok) {
                const data = await productsRes.json()
                setProducts(data.products || data || [])
                if (data.products?.length > 0 || data?.length > 0) {
                    setEditProduct((data.products || data)[0])
                }
            }

            if (categoriesRes.ok) {
                const catData = await categoriesRes.json()
                setCategories(catData.categories || catData || [])
            }
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Navigate products
    const goToProduct = (index: number) => {
        if (index >= 0 && index < products.length) {
            setCurrentIndex(index)
            setEditProduct(products[index])
            // Fetch insights for the product
            if (products[index].id !== 'new') {
                fetchProductInsights(products[index].id)
            }
        }
    }

    // Fetch product insights (order history, velocity, suggestions)
    const fetchProductInsights = async (productId: string) => {
        setLoadingInsights(true)
        try {
            const res = await fetch(`/api/inventory/product-insights?productId=${productId}`)
            if (res.ok) {
                const data = await res.json()
                setInsights(data)
            }
        } catch (error) {
            console.error('Failed to load insights:', error)
        } finally {
            setLoadingInsights(false)
        }
    }

    // Search by name, barcode, or SKU
    const handleSearch = useCallback(async () => {
        if (!searchCode.trim()) return

        const searchLower = searchCode.toLowerCase().trim()

        // Find by exact barcode/SKU first, then by name partial match
        const found = products.find(p =>
            p.barcode === searchCode ||
            p.sku === searchCode ||
            p.name.toLowerCase().includes(searchLower)
        )

        if (found) {
            const idx = products.indexOf(found)
            goToProduct(idx)
            setSearchCode('')
            setToast({ message: `Found: ${found.name}`, type: 'success' })
        } else {
            // Not found - check if it's a barcode and offer AI lookup
            if (searchCode.length >= 8 && /^\d+$/.test(searchCode)) {
                // Looks like a barcode - trigger AI lookup
                handleAISKULookup(searchCode)
            } else {
                setToast({ message: 'Product not found. Click "Add New" to create.', type: 'error' })
            }
        }
    }, [searchCode, products])

    // AI SKU Lookup function
    const handleAISKULookup = async (barcode: string) => {
        setLookingUpSKU(true)
        setSKULookupResult(null)

        try {
            const res = await fetch(`/api/ai/sku-lookup?barcode=${encodeURIComponent(barcode)}`)
            const data = await res.json()

            setSKULookupResult(data)

            // Intelligent category matching based on product name and category from API
            const findBestCategory = (apiCategory?: string, productName?: string) => {
                const searchTerms = [apiCategory, productName].filter(Boolean).join(' ').toLowerCase()

                // Category mapping rules - ORDER MATTERS! More specific first
                const categoryMappings: { keywords: string[], categoryNames: string[] }[] = [
                    // Wine first (more specific)
                    { keywords: ['wine', 'champagne', 'prosecco', 'merlot', 'cabernet', 'chardonnay', 'pinot', 'riesling', 'sauvignon'], categoryNames: ['wine', 'liquor', 'spirits'] },
                    // Beer
                    { keywords: ['beer', 'ale', 'lager', 'ipa', 'stout', 'pilsner', 'malt'], categoryNames: ['beer'] },
                    // Spirits/Liquor
                    { keywords: ['bourbon', 'whiskey', 'whisky', 'vodka', 'rum', 'tequila', 'gin', 'brandy', 'cognac', 'scotch', 'spirits', 'liqueur'], categoryNames: ['liquor', 'spirits'] },
                    // Beverages
                    { keywords: ['soda', 'cola', 'pepsi', 'sprite', 'fanta', 'beverage', 'drink', 'juice', 'water', 'energy'], categoryNames: ['beverages', 'drinks', 'soda'] },
                    // Snacks
                    { keywords: ['chips', 'snack', 'crackers', 'cookies', 'candy', 'chocolate'], categoryNames: ['snacks', 'candy', 'food'] },
                    // Tobacco
                    { keywords: ['cigarette', 'cigar', 'tobacco', 'vape', 'nicotine'], categoryNames: ['tobacco', 'cigarettes'] },
                ]

                for (const mapping of categoryMappings) {
                    // Check if any keyword matches the product
                    if (mapping.keywords.some(kw => searchTerms.includes(kw))) {
                        // Find a matching category in user's categories
                        const matchedCat = categories.find(cat =>
                            mapping.categoryNames.some(name => cat.name.toLowerCase().includes(name))
                        )
                        if (matchedCat) return matchedCat.id
                    }
                }

                // Fallback to first category
                return categories[0]?.id || null
            }

            // Detect product type from name/category
            const detectProductType = (apiCategory?: string, productName?: string) => {
                const searchTerms = [apiCategory, productName].filter(Boolean).join(' ').toLowerCase()

                if (searchTerms.includes('bourbon')) return 'Bourbon'
                if (searchTerms.includes('whiskey') || searchTerms.includes('whisky')) return 'Whiskey'
                if (searchTerms.includes('vodka')) return 'Vodka'
                if (searchTerms.includes('rum')) return 'Rum'
                if (searchTerms.includes('tequila')) return 'Tequila'
                if (searchTerms.includes('gin')) return 'Gin'
                if (searchTerms.includes('wine')) return 'Wine'
                if (searchTerms.includes('beer') || searchTerms.includes('lager') || searchTerms.includes('ale')) return 'Beer'
                if (searchTerms.includes('energy')) return 'Energy Drink'
                if (searchTerms.includes('soda') || searchTerms.includes('cola')) return 'Soda'

                return null
            }

            // Build a proper product name: Brand + Product + Size
            // e.g., "Jameson Irish Whiskey 750ml" instead of just "Whisky"
            const buildProductName = (apiName?: string, brand?: string, size?: string, productType?: string) => {
                if (!apiName) return ''

                let name = apiName
                const nameLower = name.toLowerCase().trim()

                // Check if brand is already in name (with fuzzy matching for typos)
                const isBrandInName = (brandName: string, productName: string) => {
                    const brandLower = brandName.toLowerCase().trim()
                    const productLower = productName.toLowerCase().trim()

                    // Exact match
                    if (productLower.includes(brandLower)) return true

                    // Check if first word of product matches first N chars of brand (fuzzy)
                    const firstWord = productLower.split(' ')[0]
                    if (firstWord.length >= 4) {
                        // Check if first 4+ chars match (handles Screwball vs Skrewball)
                        const brandStart = brandLower.substring(0, 4)
                        const wordStart = firstWord.substring(0, 4)
                        if (brandStart === wordStart ||
                            brandLower.substring(0, 3) === firstWord.substring(0, 3)) {
                            return true
                        }
                    }

                    return false
                }

                // Only prepend brand if it's NOT already in the name
                if (brand && !isBrandInName(brand, name)) {
                    // Also check it's a generic name, not a full product name
                    const genericNames = ['whisky', 'whiskey', 'vodka', 'rum', 'gin', 'tequila', 'beer', 'wine', 'bourbon', 'soda', 'cola']
                    const isGeneric = genericNames.some(g => nameLower === g || (nameLower.endsWith(g) && nameLower.split(' ').length <= 2))
                    if (isGeneric) {
                        name = `${brand} ${name}`
                    }
                }

                // Add size if not already in name
                if (size && !name.toLowerCase().includes(size.toLowerCase())) {
                    name = `${name} ${size}`
                }

                return name.trim()
            }

            const detectedType = detectProductType(data.category, data.name)

            // Create new product with AI-filled data
            const newProduct: Product = {
                id: 'new',
                name: data.found ? buildProductName(data.name, data.brand, data.size, detectedType || undefined) : '',
                barcode: barcode,
                sku: null,
                price: data.found && data.suggestedPrice ? data.suggestedPrice : 0,
                cost: null,
                stock: 0,
                reorderPoint: null,
                categoryId: data.found ? findBestCategory(data.category, data.name) : categories[0]?.id || null,
                category: data.found ? data.category || null : null,
                brand: data.found ? data.brand || null : null,  // AI fills this (who makes it)
                vendor: null,  // User fills this (who you buy from)
                isActive: true,
                size: data.found ? data.size || null : null,
                productType: data.found ? detectedType : null
            }

            setEditProduct(newProduct)
            setSearchCode('')

            if (data.found) {
                setToast({ message: `AI found: ${data.name} ${data.size || ''}`, type: 'success' })
            } else {
                setToast({ message: 'Product not in database. Please fill details manually.', type: 'error' })
            }
        } catch (error) {
            console.error('AI lookup failed:', error)
            setToast({ message: 'AI lookup failed. Please enter details manually.', type: 'error' })
            // Still create empty product with barcode
            handleAddNew()
        } finally {
            setLookingUpSKU(false)
        }
    }

    // Handle barcode scanner input (keyboard wedge)
    // Auto-triggers search when:
    // 1. Enter key pressed (scanner usually sends Enter after barcode)
    // 2. Auto-detect: 8+ digits entered rapidly (within 300ms idle = scanner speed)
    const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement === searchRef.current) {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    // Clear any pending auto-search
                    if (scannerTimeoutRef.current) {
                        clearTimeout(scannerTimeoutRef.current)
                        scannerTimeoutRef.current = null
                    }
                    handleSearch()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleSearch])

    // Auto-search after rapid input stops (barcode scanner detection)
    useEffect(() => {
        // Only auto-search if it looks like a barcode (8+ digits)
        if (searchCode.length >= 8 && /^\d+$/.test(searchCode)) {
            // Clear previous timeout
            if (scannerTimeoutRef.current) {
                clearTimeout(scannerTimeoutRef.current)
            }
            // Set new timeout - scanners input rapidly, so short delay means scanning done
            scannerTimeoutRef.current = setTimeout(() => {
                handleSearch()
            }, 300) // 300ms after last character = barcode complete
        }

        return () => {
            if (scannerTimeoutRef.current) {
                clearTimeout(scannerTimeoutRef.current)
            }
        }
    }, [searchCode])

    // Calculate profit metrics
    const profitPercent = editProduct?.cost && editProduct.cost > 0
        ? ((Number(editProduct.price) - Number(editProduct.cost)) / Number(editProduct.cost) * 100).toFixed(1)
        : '0.0'

    const grossMargin = editProduct?.price && Number(editProduct.price) > 0
        ? ((Number(editProduct.price) - (Number(editProduct.cost) || 0)) / Number(editProduct.price) * 100).toFixed(1)
        : '0.0'

    // Save product
    const handleSave = async () => {
        if (!editProduct) return
        setSaving(true)

        try {
            const res = await fetch(`/api/inventory/products/${editProduct.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editProduct)
            })

            if (res.ok) {
                setToast({ message: 'Saved!', type: 'success' })
                // Update local list
                setProducts(prev => prev.map(p =>
                    p.id === editProduct.id ? editProduct : p
                ))
            } else {
                setToast({ message: 'Failed to save', type: 'error' })
            }
        } catch {
            setToast({ message: 'Error saving', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    // Add new product
    const handleAddNew = () => {
        const newProduct: Product = {
            id: 'new',
            name: '',
            barcode: searchCode || null,
            sku: null,
            price: 0,
            cost: null,
            stock: 0,
            reorderPoint: null,
            categoryId: categories[0]?.id || null,
            category: null,
            brand: null,
            vendor: null,
            isActive: true,
            size: null,
            productType: null
        }
        setEditProduct(newProduct)
        setSearchCode('')
    }

    // Duplicate product
    const handleDuplicate = () => {
        if (!editProduct) return
        const dup: Product = {
            ...editProduct,
            id: 'new',
            name: `${editProduct.name} (Copy)`,
            barcode: null,
            sku: null
        }
        setEditProduct(dup)
    }

    // Delete product
    const handleDelete = async () => {
        if (!editProduct || editProduct.id === 'new') return
        if (!confirm('Delete this product?')) return

        try {
            const res = await fetch(`/api/inventory/products/${editProduct.id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setToast({ message: 'Deleted', type: 'success' })
                const newProducts = products.filter(p => p.id !== editProduct.id)
                setProducts(newProducts)
                if (newProducts.length > 0) {
                    goToProduct(0)
                } else {
                    handleAddNew()
                }
            }
        } catch {
            setToast({ message: 'Failed to delete', type: 'error' })
        }
    }

    // Update field
    const updateField = (field: keyof Product, value: any) => {
        if (!editProduct) return
        setEditProduct({ ...editProduct, [field]: value })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-4">
            {/* Header with Back Button and Search */}
            <div className="flex items-center gap-4 mb-6">
                {/* Back to Dashboard Button */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="p-3 bg-stone-700 hover:bg-stone-600 rounded-lg flex items-center gap-2 transition-colors"
                    title="Back to Dashboard"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>

                {/* Big Search Bar */}
                <div className="flex-1 relative">
                    {lookingUpSKU ? (
                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-purple-400 animate-spin" />
                    ) : (
                        <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-stone-500" />
                    )}
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                        placeholder={lookingUpSKU ? "Looking up product..." : "Scan barcode or search..."}
                        className={`w-full pl-12 pr-4 py-4 bg-stone-900 border rounded-lg text-xl focus:ring-2 focus:border-transparent ${lookingUpSKU
                            ? 'border-purple-500 focus:ring-purple-500'
                            : 'border-stone-700 focus:ring-orange-500'
                            }`}
                        autoFocus
                        disabled={lookingUpSKU}
                    />
                </div>

                {/* Search Button - with label */}
                <button
                    onClick={handleSearch}
                    disabled={lookingUpSKU}
                    className="px-5 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 rounded-lg flex items-center gap-2 font-medium"
                >
                    {lookingUpSKU ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Search className="h-5 w-5" />
                    )}
                    <span>{lookingUpSKU ? 'Looking up...' : 'Search'}</span>
                </button>

                {/* Add Product Button - with label */}
                <button
                    onClick={handleAddNew}
                    className="px-5 py-4 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 font-medium"
                >
                    <Plus className="h-5 w-5" />
                    <span>Add New</span>
                </button>

                {/* Categories Button - for quick category access */}
                <button
                    onClick={() => setShowDeptModal(true)}
                    className="px-5 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 font-medium"
                >
                    <Tag className="h-5 w-5" />
                    <span>Categories</span>
                </button>

                {/* Departments Button - for hierarchy management */}
                <button
                    onClick={() => setShowDeptModal(true)}
                    className="px-5 py-4 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2 font-medium"
                >
                    <Folder className="h-5 w-5" />
                    <span>Departments</span>
                </button>

                {/* Slow Movers Alert Button */}
                <button
                    onClick={() => router.push('/dashboard/inventory/alerts/slow-movers')}
                    className="px-5 py-4 bg-red-600/50 hover:bg-red-600 rounded-lg flex items-center gap-2 font-medium"
                >
                    <AlertTriangle className="h-5 w-5" />
                    <span>Slow Movers</span>
                </button>
            </div>

            {editProduct && (
                <>
                    {/* Product Name Header */}
                    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <label className="text-xs text-stone-500 uppercase">Product Name</label>
                                <input
                                    type="text"
                                    value={editProduct.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0"
                                    placeholder="Enter product name..."
                                />
                            </div>
                            <div className="text-right">
                                <span className={`px-3 py-1 text-sm rounded-full ${editProduct.productCategory?.ageRestricted || categories.find(c => c.id === editProduct.categoryId)?.ageRestricted
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-green-500/20 text-green-400'
                                    }`}>
                                    {editProduct.productCategory?.ageRestricted || categories.find(c => c.id === editProduct.categoryId)?.ageRestricted
                                        ? `🔞 ID Required (${editProduct.productCategory?.minimumAge || categories.find(c => c.id === editProduct.categoryId)?.minimumAge || 21}+)`
                                        : '✓ No ID'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                        {/* Left Column - Identification */}
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 text-orange-400">Identification</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-stone-500">Barcode / UPC</label>
                                    <input
                                        type="text"
                                        value={editProduct.barcode || ''}
                                        onChange={(e) => updateField('barcode', e.target.value)}
                                        className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded text-lg font-mono"
                                        placeholder="Scan barcode..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">SKU</label>
                                    <input
                                        type="text"
                                        value={editProduct.sku || ''}
                                        onChange={(e) => updateField('sku', e.target.value)}
                                        className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-stone-500">Size <span className="text-purple-400">(AI)</span></label>
                                        <input
                                            type="text"
                                            value={editProduct.size || ''}
                                            onChange={(e) => updateField('size', e.target.value)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                            placeholder="750ml, 12 oz..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500">Type</label>
                                        <input
                                            type="text"
                                            value={editProduct.productType || ''}
                                            onChange={(e) => updateField('productType', e.target.value)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                            placeholder="Whiskey, Lager..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">Category / Department</label>
                                    <select
                                        value={editProduct.categoryId || ''}
                                        onChange={(e) => updateField('categoryId', e.target.value)}
                                        className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                    >
                                        <option value="">-- Select Category --</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name} {cat.ageRestricted ? '🔞' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-stone-500">Brand <span className="text-purple-400">(AI)</span></label>
                                        <input
                                            type="text"
                                            value={editProduct.brand || ''}
                                            onChange={(e) => updateField('brand', e.target.value)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                            placeholder="Bulleit, Coca-Cola..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500">Supplier / Distributor</label>
                                        <select
                                            value={editProduct.vendor || ''}
                                            onChange={(e) => updateField('vendor', e.target.value)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                        >
                                            <option value="">-- Select Supplier --</option>
                                            <optgroup label="🥃 Major Liquor Distributors">
                                                <option value="Southern Glazer's">Southern Glazer's Wine & Spirits</option>
                                                <option value="RNDC">Republic National (RNDC)</option>
                                                <option value="Breakthru Beverage">Breakthru Beverage Group</option>
                                                <option value="Johnson Brothers">Johnson Brothers</option>
                                                <option value="Young's Market">Young's Market Company</option>
                                                <option value="Lipman Brothers">Lipman Brothers</option>
                                                <option value="Fedway Associates">Fedway Associates</option>
                                            </optgroup>
                                            <optgroup label="🍺 Beer Distributors">
                                                <option value="Reyes Beverage">Reyes Beverage Group</option>
                                                <option value="Ben E. Keith">Ben E. Keith Beverages</option>
                                                <option value="Silver Eagle">Silver Eagle Distributors</option>
                                                <option value="Andrews Distributing">Andrews Distributing</option>
                                            </optgroup>
                                            <optgroup label="📦 General/Convenience">
                                                <option value="McLane">McLane Company</option>
                                                <option value="Core-Mark">Core-Mark International</option>
                                                <option value="Eby-Brown">Eby-Brown Company</option>
                                                <option value="H.T. Hackney">H.T. Hackney Company</option>
                                                <option value="S. Abraham & Sons">S. Abraham & Sons</option>
                                            </optgroup>
                                            <optgroup label="🚬 Tobacco">
                                                <option value="McLane Tobacco">McLane Tobacco</option>
                                                <option value="Altria">Altria Distribution</option>
                                            </optgroup>
                                            <option value="Other">Other (specify in notes)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Middle Column - Pricing */}
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 text-green-400">Pricing</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-stone-500">Cost (You Pay) - Tap to enter</label>
                                    <button
                                        onClick={() => { setNumpadField('cost'); setShowNumpad(true); }}
                                        className="w-full px-3 py-3 bg-stone-800 border border-stone-600 rounded text-left text-lg flex items-center gap-2 hover:border-green-500 transition-colors"
                                    >
                                        <DollarSign className="h-5 w-5 text-stone-500" />
                                        <span className={editProduct.cost ? 'text-white' : 'text-stone-500'}>
                                            {editProduct.cost ? Number(editProduct.cost).toFixed(2) : '0.00'}
                                        </span>
                                    </button>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">Price (Customer Pays) - Tap to enter</label>
                                    <button
                                        onClick={() => { setNumpadField('price'); setShowNumpad(true); }}
                                        className="w-full px-3 py-4 bg-stone-800 border border-orange-500 rounded text-left text-2xl font-bold flex items-center gap-2 hover:bg-stone-700 transition-colors"
                                    >
                                        <DollarSign className="h-6 w-6 text-orange-400" />
                                        <span className="text-orange-400">
                                            {Number(editProduct.price).toFixed(2)}
                                        </span>
                                    </button>
                                </div>

                                {/* Profit Display */}
                                <div className="bg-stone-800 rounded p-3 grid grid-cols-2 gap-3">
                                    <div className="text-center">
                                        <div className="text-xs text-stone-500">Profit %</div>
                                        <div className={`text-xl font-bold ${Number(profitPercent) > 30 ? 'text-green-400' :
                                            Number(profitPercent) > 15 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {profitPercent}%
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-stone-500">Gross Margin</div>
                                        <div className={`text-xl font-bold ${Number(grossMargin) > 25 ? 'text-green-400' :
                                            Number(grossMargin) > 10 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {grossMargin}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Stock */}
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 text-blue-400">Inventory</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-stone-500">Current Stock - Tap to enter exact</label>
                                    <button
                                        onClick={() => { setNumpadField('stock'); setShowNumpad(true); }}
                                        className={`w-full px-3 py-4 bg-stone-800 border rounded text-4xl font-bold text-center hover:bg-stone-700 transition-colors ${editProduct.stock <= (editProduct.reorderPoint || 5)
                                            ? 'border-red-500 text-red-400'
                                            : 'border-stone-600 text-white'
                                            }`}
                                    >
                                        {editProduct.stock}
                                    </button>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">Reorder Point (Alert When Below)</label>
                                    <input
                                        type="number"
                                        value={editProduct.reorderPoint || ''}
                                        onChange={(e) => updateField('reorderPoint', parseInt(e.target.value) || null)}
                                        className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                        placeholder="5"
                                    />
                                </div>

                                {editProduct.stock <= (editProduct.reorderPoint || 5) && (
                                    <div className="bg-red-500/20 border border-red-500/50 rounded p-3 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-400" />
                                        <span className="text-red-400 text-sm">Low stock! Reorder needed.</span>
                                    </div>
                                )}

                                {/* Product Insights Panel */}
                                {editProduct.id !== 'new' && (
                                    <div className="mt-4 pt-4 border-t border-stone-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                                                <Brain className="h-4 w-4" />
                                                AI Insights
                                            </h4>
                                            {loadingInsights && (
                                                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                            )}
                                        </div>
                                        {insights && !loadingInsights && (
                                            <div className="space-y-2 text-sm">
                                                {/* Last Order */}
                                                {insights.lastOrder ? (
                                                    <div className="bg-stone-800 rounded p-2">
                                                        <div className="text-stone-500 text-xs">Last Order</div>
                                                        <div className="flex justify-between">
                                                            <span>{insights.lastOrder.daysAgo} days ago</span>
                                                            <span className="text-green-400">{insights.lastOrder.quantity} @ ${insights.lastOrder.unitCost.toFixed(2)}</span>
                                                        </div>
                                                        <div className="text-stone-500 text-xs">{insights.lastOrder.supplier}</div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-stone-800 rounded p-2 text-stone-500 text-xs">
                                                        No purchase orders found
                                                    </div>
                                                )}

                                                {/* Sales Since Order */}
                                                <div className="bg-stone-800 rounded p-2">
                                                    <div className="text-stone-500 text-xs">Sales (since last order)</div>
                                                    <div className="flex justify-between">
                                                        <span className="text-blue-400">{insights.salesSinceOrder.units} sold</span>
                                                        <span className="text-green-400">${insights.salesSinceOrder.revenue.toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                {/* Velocity */}
                                                <div className="bg-stone-800 rounded p-2">
                                                    <div className="text-stone-500 text-xs">Velocity</div>
                                                    <div className="flex justify-between">
                                                        <span>{insights.velocity.unitsPerDay}/day</span>
                                                        <span className={insights.velocity.daysOfStock < 7 ? 'text-red-400' : insights.velocity.daysOfStock < 14 ? 'text-yellow-400' : 'text-green-400'}>
                                                            {insights.velocity.daysOfStock} days left
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* AI Suggestion */}
                                                {insights.suggestion.orderQty > 0 && (
                                                    <div className="bg-purple-500/20 border border-purple-500/50 rounded p-2">
                                                        <div className="flex items-center gap-1 text-purple-400 text-xs">
                                                            <Sparkles className="h-3 w-3" />
                                                            Suggested Order
                                                        </div>
                                                        <div className="text-lg font-bold text-purple-400">
                                                            {insights.suggestion.orderQty} units
                                                        </div>
                                                        <div className="text-stone-500 text-xs">
                                                            Covers {insights.suggestion.coversDays} days
                                                            {insights.suggestion.estimatedCost && (
                                                                <span> • ~${insights.suggestion.estimatedCost.toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            {/* Navigation */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToProduct(currentIndex - 1)}
                                    disabled={currentIndex === 0}
                                    className="p-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <span className="text-stone-500">
                                    {currentIndex + 1} / {products.length}
                                </span>
                                <button
                                    onClick={() => goToProduct(currentIndex + 1)}
                                    disabled={currentIndex >= products.length - 1}
                                    className="p-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDuplicate}
                                    className="px-4 py-3 bg-stone-700 hover:bg-stone-600 rounded-lg flex items-center gap-2"
                                >
                                    <Copy className="h-5 w-5" />
                                    Duplicate
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-3 bg-red-600/30 hover:bg-red-600/50 rounded-lg flex items-center gap-2 text-red-400"
                                >
                                    <Trash2 className="h-5 w-5" />
                                    Delete
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 font-bold text-lg"
                                >
                                    {saving ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                                    ) : (
                                        <Save className="h-5 w-5" />
                                    )}
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Toast Component */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Department Manager Modal */}
            <DepartmentManagerModal
                isOpen={showDeptModal}
                onClose={() => setShowDeptModal(false)}
                onUpdate={loadData}
            />

            {/* Promotion Manager Modal */}
            <PromotionManagerModal
                isOpen={showPromoModal}
                onClose={() => setShowPromoModal(false)}
                onUpdate={loadData}
            />

            {/* Numpad Modal for Cost/Price/Stock entry */}
            <NumpadModal
                isOpen={showNumpad}
                onClose={() => { setShowNumpad(false); setNumpadField(null); }}
                onSubmit={(value) => {
                    if (numpadField && editProduct) {
                        if (numpadField === 'stock') {
                            updateField('stock', Math.round(value))
                        } else {
                            updateField(numpadField, value || null)
                        }
                    }
                }}
                title={
                    numpadField === 'cost' ? 'Enter Cost (You Pay)' :
                        numpadField === 'price' ? 'Enter Price (Customer Pays)' :
                            numpadField === 'stock' ? 'Enter Stock Quantity' : 'Enter Value'
                }
                initialValue={
                    numpadField === 'cost' ? Number(editProduct?.cost) || 0 :
                        numpadField === 'price' ? Number(editProduct?.price) || 0 :
                            numpadField === 'stock' ? Number(editProduct?.stock) || 0 : 0
                }
                prefix={numpadField === 'stock' ? '' : '$'}
                allowDecimal={numpadField !== 'stock'}
            />
        </div>
    )
}
