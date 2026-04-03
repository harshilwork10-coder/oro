'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { classifyItem } from '@/lib/itemClassifier'
import { useRouter } from 'next/navigation'
import {
    Search, Plus, Save, Copy, Trash2, Package,
    ChevronLeft, ChevronRight, Barcode, DollarSign,
    Percent, AlertTriangle, Check, X, ArrowLeft, Folder, Tag, Gift,
    Brain, Sparkles, Loader2, TrendingUp, Clock, ShoppingBag, Zap,
    PackagePlus, History as HistoryIcon, Printer, ClipboardList
} from 'lucide-react'
import Toast from '@/components/ui/Toast'
import DepartmentManagerModal from '@/components/modals/DepartmentManagerModal'
import PromotionManagerModal from '@/components/modals/PromotionManagerModal'
import NumpadModal from '@/components/modals/NumpadModal'
import OnScreenKeyboard from '@/components/ui/OnScreenKeyboard'
import QuickReceiveModal from '@/components/modals/QuickReceiveModal'
import ProductHistoryModal from '@/components/modals/ProductHistoryModal'

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

// Minimum age to display for age-restricted categories when no override is set
const FALLBACK_MIN_AGE = 18

// How many digits of consecutive numbers = a barcode scan
const BARCODE_MIN_LENGTH = 8

// How long after last keystroke to auto-trigger barcode search (ms)
const SCANNER_DEBOUNCE_MS = 300

// Profit % thresholds for color coding
const PROFIT_GOOD = 30
const PROFIT_WARN = 15
const MARGIN_GOOD = 25
const MARGIN_WARN = 10

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

    // Inline delete confirmation (replaces browser confirm())
    const [confirmDelete, setConfirmDelete] = useState(false)

    // AI SKU Lookup states
    const [lookingUpSKU, setLookingUpSKU] = useState(false)
    const [skuLookupResult, setSKULookupResult] = useState<any>(null)

    // Numpad modal states (for numeric fields)
    const [numpadField, setNumpadField] = useState<'cost' | 'price' | 'stock' | null>(null)
    const [showNumpad, setShowNumpad] = useState(false)

    // On-screen keyboard states (for text fields)
    const [keyboardField, setKeyboardField] = useState<'sku' | 'size' | 'productType' | 'brand' | 'vendor' | null>(null)
    const [showKeyboard, setShowKeyboard] = useState(false)

    // Product insights state
    const [insights, setInsights] = useState<any>(null)
    const [loadingInsights, setLoadingInsights] = useState(false)
    const [coverageDays, setCoverageDays] = useState(14)

    // Quick action modal states
    const [showReceiveModal, setShowReceiveModal] = useState(false)
    const [showHistoryModal, setShowHistoryModal] = useState(false)

    // Load products and categories
    const loadData = useCallback(async () => {
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                fetch('/api/inventory/products'),
                fetch('/api/inventory/categories')
            ])

            if (productsRes.ok) {
                const data = await productsRes.json()
                const list: Product[] = data.data || data.products || []
                setProducts(list)
                if (list.length > 0) {
                    setEditProduct(list[0])
                    setCurrentIndex(0)
                }
            }

            if (categoriesRes.ok) {
                const catData = await categoriesRes.json()
                setCategories(catData.data || catData.categories || [])
            }
        } catch (error) {
            console.error('Failed to load data:', error)
            setToast({ message: 'Failed to load inventory data', type: 'error' })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Navigate products
    const goToProduct = useCallback((index: number, productList?: Product[]) => {
        const list = productList ?? products
        if (index >= 0 && index < list.length) {
            setCurrentIndex(index)
            setEditProduct(list[index])
            setConfirmDelete(false)
            if (list[index].id !== 'new') {
                fetchProductInsights(list[index].id)
            }
        }
    }, [products])

    // Fetch product insights (order history, velocity, suggestions)
    const fetchProductInsights = async (productId: string, days?: number) => {
        setLoadingInsights(true)
        setInsights(null)
        try {
            const td = days ?? coverageDays
            const res = await fetch(`/api/inventory/product-insights?productId=${productId}&targetDays=${td}`)
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
            if (searchCode.length >= BARCODE_MIN_LENGTH && /^\d+$/.test(searchCode)) {
                // Looks like a barcode - trigger AI lookup
                handleAISKULookup(searchCode)
            } else {
                setToast({ message: 'Product not found. Click "Add New" to create.', type: 'error' })
            }
        }
    }, [searchCode, products, goToProduct])

    // AI SKU Lookup function
    const handleAISKULookup = async (barcode: string) => {
        setLookingUpSKU(true)
        setSKULookupResult(null)

        try {
            const res = await fetch(`/api/ai/sku-lookup?barcode=${encodeURIComponent(barcode)}`)
            const data = await res.json()

            setSKULookupResult(data)

            // Intelligent category + type detection via shared classifier
            const { categoryId: autoCategory, productType: detectedType } = classifyItem(data.name, data.category, categories)

            // Build a proper product name: Brand + Product + Size
            const buildProductName = (apiName?: string, brand?: string, size?: string, productType?: string) => {
                if (!apiName) return ''
                let name = apiName
                const nameLower = name.toLowerCase().trim()

                const isBrandInName = (brandName: string, productName: string) => {
                    const brandLower = brandName.toLowerCase().trim()
                    const productLower = productName.toLowerCase().trim()
                    if (productLower.includes(brandLower)) return true
                    const firstWord = productLower.split(' ')[0]
                    if (firstWord.length >= 4) {
                        if (brandLower.substring(0, 4) === firstWord.substring(0, 4) ||
                            brandLower.substring(0, 3) === firstWord.substring(0, 3)) return true
                    }
                    return false
                }

                if (brand && !isBrandInName(brand, name)) {
                    const genericNames = ['whisky', 'whiskey', 'vodka', 'rum', 'gin', 'tequila', 'beer', 'wine', 'bourbon', 'soda', 'cola']
                    const isGeneric = genericNames.some(g => nameLower === g || (nameLower.endsWith(g) && nameLower.split(' ').length <= 2))
                    if (isGeneric) name = `${brand} ${name}`
                }

                if (size && !name.toLowerCase().includes(size.toLowerCase())) {
                    name = `${name} ${size}`
                }

                return name.trim()
            }

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
                categoryId: data.found ? autoCategory : categories[0]?.id || null,
                category: data.found ? data.category || null : null,
                brand: data.found ? data.brand || null : null,
                vendor: null,
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
            handleAddNew()
        } finally {
            setLookingUpSKU(false)
        }
    }

    // Handle barcode scanner input (keyboard wedge)
    const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement === searchRef.current) {
                if (e.key === 'Enter') {
                    e.preventDefault()
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
        if (searchCode.length >= BARCODE_MIN_LENGTH && /^\d+$/.test(searchCode)) {
            if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current)
            scannerTimeoutRef.current = setTimeout(() => {
                handleSearch()
            }, SCANNER_DEBOUNCE_MS)
        }

        return () => {
            if (scannerTimeoutRef.current) clearTimeout(scannerTimeoutRef.current)
        }
    }, [searchCode, handleSearch])

    // Calculate profit metrics
    const profitPercent = editProduct?.cost && editProduct.cost > 0
        ? ((Number(editProduct.price) - Number(editProduct.cost)) / Number(editProduct.cost) * 100).toFixed(1)
        : '0.0'

    const grossMargin = editProduct?.price && Number(editProduct.price) > 0
        ? ((Number(editProduct.price) - (Number(editProduct.cost) || 0)) / Number(editProduct.price) * 100).toFixed(1)
        : '0.0'

    // Get effective reorder point for display (null = user hasn't set one yet, don't fake a default)
    const effectiveReorderPoint = editProduct?.reorderPoint ?? null
    const isLowStock = effectiveReorderPoint !== null && editProduct !== null && editProduct.stock <= effectiveReorderPoint

    // Save product
    const handleSave = async () => {
        if (!editProduct) return
        if (!editProduct.name?.trim()) {
            setToast({ message: 'Product name is required', type: 'error' })
            return
        }
        setSaving(true)

        try {
            const isNew = editProduct.id === 'new'

            const res = await fetch(
                isNew ? '/api/inventory/products' : `/api/inventory/products/${editProduct.id}`,
                {
                    method: isNew ? 'POST' : 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editProduct)
                }
            )

            const data = await res.json()

            if (res.ok) {
                setToast({ message: isNew ? 'Product created!' : 'Saved!', type: 'success' })
                if (isNew && data.product) {
                    const savedProduct = { ...editProduct, id: data.product.id }
                    const updatedList = [savedProduct, ...products]
                    setProducts(updatedList)
                    setEditProduct(savedProduct)
                    setCurrentIndex(0)
                } else {
                    setProducts(prev => prev.map(p =>
                        p.id === editProduct.id ? editProduct : p
                    ))
                }
            } else {
                setToast({ message: data.error || 'Failed to save', type: 'error' })
            }
        } catch (e) {
            console.error('Save error:', e)
            setToast({ message: 'Error saving product', type: 'error' })
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
        setConfirmDelete(false)
        setInsights(null)
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
        setInsights(null)
    }

    // Delete product (with inline confirm)
    const handleDeleteConfirm = async () => {
        if (!editProduct || editProduct.id === 'new') return
        setConfirmDelete(false)

        try {
            const res = await fetch(`/api/inventory/products/${editProduct.id}`, {
                method: 'DELETE'
            })

            if (res.ok) {
                setToast({ message: 'Product deleted', type: 'success' })
                const newProducts = products.filter(p => p.id !== editProduct.id)
                setProducts(newProducts)
                if (newProducts.length > 0) {
                    const nextIdx = Math.min(currentIndex, newProducts.length - 1)
                    goToProduct(nextIdx, newProducts)
                } else {
                    handleAddNew()
                }
            } else {
                const data = await res.json().catch(() => ({}))
                setToast({ message: data.error || 'Failed to delete', type: 'error' })
            }
        } catch {
            setToast({ message: 'Failed to delete product', type: 'error' })
        }
    }

    // Update field
    const updateField = (field: keyof Product, value: any) => {
        if (!editProduct) return
        setEditProduct({ ...editProduct, [field]: value })
    }

    // Age restriction info for current product
    const ageRestricted =
        editProduct?.productCategory?.ageRestricted ||
        categories.find(c => c.id === editProduct?.categoryId)?.ageRestricted ||
        false
    const minimumAge =
        editProduct?.productCategory?.minimumAge ||
        categories.find(c => c.id === editProduct?.categoryId)?.minimumAge ||
        FALLBACK_MIN_AGE

    // Whether this is a new (unsaved) product
    const isNewProduct = editProduct?.id === 'new'

    // Display counter
    const displayIndex = isNewProduct ? '★' : String(currentIndex + 1)
    const displayTotal = isNewProduct ? `${products.length} + new` : String(products.length)

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
                        placeholder={lookingUpSKU ? "Looking up product..." : "Scan barcode or search by name..."}
                        className={`w-full pl-12 pr-4 py-4 bg-stone-900 border rounded-lg text-xl focus:ring-2 focus:border-transparent ${lookingUpSKU
                            ? 'border-purple-500 focus:ring-purple-500'
                            : 'border-stone-700 focus:ring-orange-500'
                            }`}
                        autoFocus
                        disabled={lookingUpSKU}
                    />
                </div>

                {/* Search Button */}
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

                {/* Add Product Button */}
                <button
                    onClick={handleAddNew}
                    className="px-5 py-4 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 font-medium"
                >
                    <Plus className="h-5 w-5" />
                    <span>Add New</span>
                </button>

                {/* Categories Button */}
                <button
                    onClick={() => setShowDeptModal(true)}
                    className="px-5 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 font-medium"
                    title="Manage Categories & Departments"
                >
                    <Tag className="h-5 w-5" />
                    <span>Categories</span>
                </button>

                {/* Deals / Promotions Button */}
                <button
                    onClick={() => setShowPromoModal(true)}
                    className="px-5 py-4 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center gap-2 font-medium"
                    title="Manage Deals & Promotions"
                >
                    <Gift className="h-5 w-5" />
                    <span>Deals</span>
                </button>

                {/* Slow Movers Alert Button */}
                <button
                    onClick={() => router.push('/dashboard/inventory/alerts/slow-movers')}
                    className="px-5 py-4 bg-red-600/50 hover:bg-red-600 rounded-lg flex items-center gap-2 font-medium"
                    title="View slow-moving inventory"
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
                            <div className="flex items-center gap-3 text-right">
                                {/* Active / Inactive toggle */}
                                <button
                                    onClick={() => updateField('isActive', !editProduct.isActive)}
                                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${editProduct.isActive
                                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                        : 'bg-stone-700 text-stone-400 border-stone-600'
                                        }`}
                                >
                                    {editProduct.isActive ? '● Active' : '○ Inactive'}
                                </button>
                                {/* Age restriction badge */}
                                <span className={`px-3 py-1 text-sm rounded-full ${ageRestricted
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-green-500/20 text-green-400'
                                    }`}>
                                    {ageRestricted
                                        ? `🔞 ID Required (${minimumAge}+)`
                                        : '✓ No ID Required'}
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
                                        onChange={(e) => updateField('barcode', e.target.value || null)}
                                        className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded text-lg font-mono"
                                        placeholder="Scan or type barcode..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">SKU</label>
                                    <input
                                        type="text"
                                        value={editProduct.sku || ''}
                                        onChange={(e) => updateField('sku', e.target.value || null)}
                                        className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded cursor-text hover:border-orange-500 transition-colors min-h-[42px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        placeholder="e.g., LIQ-001"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-stone-500">Size</label>
                                        <input
                                            type="text"
                                            value={editProduct.size || ''}
                                            onChange={(e) => updateField('size', e.target.value || null)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded hover:border-orange-500 transition-colors min-h-[42px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="750ml, 12 oz..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500">Type</label>
                                        <input
                                            type="text"
                                            value={editProduct.productType || ''}
                                            onChange={(e) => updateField('productType', e.target.value || null)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded hover:border-orange-500 transition-colors min-h-[42px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Whiskey, Lager..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">Category / Department</label>
                                    <select
                                        value={editProduct.categoryId || ''}
                                        onChange={(e) => updateField('categoryId', e.target.value || null)}
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
                                        <label className="text-xs text-stone-500">Brand</label>
                                        <input
                                            type="text"
                                            value={editProduct.brand || ''}
                                            onChange={(e) => updateField('brand', e.target.value || null)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded hover:border-orange-500 transition-colors min-h-[42px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Bulleit, Coca-Cola..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500">Supplier / Distributor</label>
                                        <input
                                            type="text"
                                            value={editProduct.vendor || ''}
                                            onChange={(e) => updateField('vendor', e.target.value || null)}
                                            className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded hover:border-orange-500 transition-colors min-h-[42px] focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="Enter supplier..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Middle Column - Pricing */}
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 text-green-400">Pricing</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-stone-500">Cost (You Pay)</label>
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-5 w-5 text-stone-500 flex-shrink-0" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editProduct.cost ?? ''}
                                            onChange={(e) => updateField('cost', e.target.value !== '' ? parseFloat(e.target.value) : null)}
                                            className="w-full px-3 py-3 bg-stone-800 border border-stone-600 rounded text-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                        <button
                                            onClick={() => { setNumpadField('cost'); setShowNumpad(true); }}
                                            className="p-2 bg-stone-700 hover:bg-stone-600 rounded text-stone-400 flex-shrink-0" title="Open numpad"
                                        >
                                            ⌨
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">Price (Customer Pays)</label>
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-6 w-6 text-orange-400 flex-shrink-0" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editProduct.price || ''}
                                            onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-4 bg-stone-800 border border-orange-500 rounded text-2xl font-bold text-orange-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            placeholder="0.00"
                                        />
                                        <button
                                            onClick={() => { setNumpadField('price'); setShowNumpad(true); }}
                                            className="p-2 bg-stone-700 hover:bg-stone-600 rounded text-stone-400 flex-shrink-0" title="Open numpad"
                                        >
                                            ⌨
                                        </button>
                                    </div>
                                </div>

                                {/* Profit Display */}
                                <div className="bg-stone-800 rounded p-3 grid grid-cols-2 gap-3">
                                    <div className="text-center">
                                        <div className="text-xs text-stone-500">Profit %</div>
                                        <div className={`text-xl font-bold ${Number(profitPercent) > PROFIT_GOOD ? 'text-green-400' :
                                            Number(profitPercent) > PROFIT_WARN ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {profitPercent}%
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-stone-500">Gross Margin</div>
                                        <div className={`text-xl font-bold ${Number(grossMargin) > MARGIN_GOOD ? 'text-green-400' :
                                            Number(grossMargin) > MARGIN_WARN ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {grossMargin}%
                                        </div>
                                    </div>
                                </div>

                                {/* Dollar profit */}
                                {editProduct.cost && Number(editProduct.price) > 0 && (
                                    <div className="text-center text-sm text-stone-400">
                                        Profit per unit:{' '}
                                        <span className="text-green-400 font-semibold">
                                            ${(Number(editProduct.price) - Number(editProduct.cost)).toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Stock */}
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 text-blue-400">Inventory</h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-stone-500">Current Stock</label>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            min="0"
                                            value={editProduct.stock}
                                            onChange={(e) => updateField('stock', Math.max(0, parseInt(e.target.value) || 0))}
                                            className={`w-full px-3 py-4 bg-stone-800 border rounded text-4xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isLowStock
                                                ? 'border-red-500 text-red-400'
                                                : 'border-stone-600 text-white'
                                                }`}
                                            placeholder="0"
                                        />
                                        <button
                                            onClick={() => { setNumpadField('stock'); setShowNumpad(true); }}
                                            className="p-2 bg-stone-700 hover:bg-stone-600 rounded text-stone-400 flex-shrink-0" title="Open numpad"
                                        >
                                            ⌨
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-stone-500">Reorder Point (Alert When Below)</label>
                                    <input
                                        type="number"
                                        value={editProduct.reorderPoint ?? ''}
                                        onChange={(e) => updateField('reorderPoint', e.target.value !== '' ? parseInt(e.target.value) : null)}
                                        className="w-full px-3 py-2 bg-stone-800 border border-stone-600 rounded"
                                        placeholder="e.g. 5 (leave blank to disable alert)"
                                        min={0}
                                    />
                                </div>

                                {/* Low stock alert — only shows when reorder point is set AND stock is at/below it */}
                                {isLowStock && (
                                    <div className="bg-red-500/20 border border-red-500/50 rounded p-3 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                        <span className="text-red-400 text-sm">
                                            Low stock! Only {editProduct.stock} left — reorder point is {effectiveReorderPoint}.
                                        </span>
                                    </div>
                                )}

                                {/* Product Insights Panel */}
                                {!isNewProduct && (
                                    <div className="mt-4 pt-4 border-t border-stone-700">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                                                <Brain className="h-4 w-4" />
                                                AI Insights
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {loadingInsights && (
                                                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                                                )}
                                                <select
                                                    value={coverageDays}
                                                    onChange={(e) => {
                                                        const days = parseInt(e.target.value)
                                                        setCoverageDays(days)
                                                        if (editProduct?.id && editProduct.id !== 'new') {
                                                            fetchProductInsights(editProduct.id, days)
                                                        }
                                                    }}
                                                    className="bg-stone-800 border border-stone-700 text-stone-300 text-xs rounded px-2 py-1 focus:ring-purple-500 focus:border-purple-500"
                                                    title="Order coverage window"
                                                >
                                                    <option value={7}>7d cover</option>
                                                    <option value={14}>14d cover</option>
                                                    <option value={21}>21d cover</option>
                                                    <option value={30}>30d cover</option>
                                                    <option value={60}>60d cover</option>
                                                </select>
                                            </div>
                                        </div>
                                        {!loadingInsights && !insights && (
                                            <div className="text-xs text-stone-500 text-center py-2">No data yet</div>
                                        )}
                                        {insights && !loadingInsights && (
                                            <div className="space-y-2 text-sm">
                                                {/* Weekly & Monthly Sales - Key ordering data */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-stone-800 rounded p-2">
                                                        <div className="text-stone-500 text-xs">Week (7d)</div>
                                                        <div className="text-blue-400 font-bold">{insights.weeklySold?.units ?? 0} sold</div>
                                                        <div className="text-stone-500 text-xs">${Number(insights.weeklySold?.revenue || 0).toFixed(2)}</div>
                                                    </div>
                                                    <div className="bg-stone-800 rounded p-2">
                                                        <div className="text-stone-500 text-xs">Month (30d)</div>
                                                        <div className="text-emerald-400 font-bold">{insights.monthlySold?.units ?? 0} sold</div>
                                                        <div className="text-stone-500 text-xs">${Number(insights.monthlySold?.revenue || 0).toFixed(2)}</div>
                                                    </div>
                                                </div>

                                                {/* Last Sale Date */}
                                                <div className="bg-stone-800 rounded p-2">
                                                    <div className="text-stone-500 text-xs">Last Sale</div>
                                                    <div className="text-stone-200">
                                                        {insights.lastSaleDate
                                                            ? new Date(insights.lastSaleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : 'Never sold'}
                                                    </div>
                                                </div>

                                                {/* Last Order */}
                                                {insights.lastOrder ? (
                                                    <div className="bg-stone-800 rounded p-2">
                                                        <div className="text-stone-500 text-xs">Last Order</div>
                                                        <div className="flex justify-between">
                                                            <span>{insights.lastOrder.daysAgo} days ago</span>
                                                            <span className="text-green-400">
                                                                {insights.lastOrder.quantity} @ ${Number(insights.lastOrder.unitCost || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        {insights.lastOrder.supplier && (
                                                            <div className="text-stone-500 text-xs">{insights.lastOrder.supplier}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="bg-stone-800 rounded p-2 text-stone-500 text-xs">
                                                        No purchase orders found
                                                    </div>
                                                )}

                                                {/* Velocity */}
                                                {insights.velocity && (
                                                    <div className="bg-stone-800 rounded p-2">
                                                        <div className="text-stone-500 text-xs">Velocity</div>
                                                        <div className="flex justify-between">
                                                            <span>{insights.velocity.unitsPerDay ?? 0}/day</span>
                                                            <span className={
                                                                (insights.velocity.daysOfStock ?? 99) < 7 ? 'text-red-400' :
                                                                    (insights.velocity.daysOfStock ?? 99) < 14 ? 'text-yellow-400' : 'text-green-400'
                                                            }>
                                                                {insights.velocity.daysOfStock ?? '—'} days left
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* All-Time Stats */}
                                                {insights.allTimeSales && (insights.allTimeSales.units > 0) && (
                                                    <div className="bg-stone-800 rounded p-2">
                                                        <div className="text-stone-500 text-xs">All-Time</div>
                                                        <div className="flex justify-between">
                                                            <span className="text-stone-300">{insights.allTimeSales.units} sold</span>
                                                            <span className="text-green-400">${Number(insights.allTimeSales.revenue || 0).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* AI Suggestion */}
                                                {insights.suggestion?.orderQty > 0 && (
                                                    <div className="bg-purple-500/20 border border-purple-500/50 rounded p-2">
                                                        <div className="flex items-center gap-1 text-purple-400 text-xs">
                                                            <Sparkles className="h-3 w-3" />
                                                            Suggested Order
                                                        </div>
                                                        <div className="text-lg font-bold text-purple-400">
                                                            {insights.suggestion.orderQty} units
                                                        </div>
                                                        <div className="text-stone-500 text-xs">
                                                            Covers {insights.suggestion.coversDays ?? '?'} days
                                                            {insights.suggestion.estimatedCost > 0 && (
                                                                <span> • ~${Number(insights.suggestion.estimatedCost).toFixed(2)}</span>
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

                    {/* Quick Actions Bar */}
                    {editProduct && editProduct.id !== 'new' && (
                        <div className="bg-stone-900 border border-stone-700 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <button
                                    onClick={() => router.push(`/dashboard/inventory/adjustments`)}
                                    className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium whitespace-nowrap transition-colors"
                                >
                                    <ClipboardList className="h-4 w-4" />
                                    Adjust Stock
                                </button>
                                <button
                                    onClick={() => setShowReceiveModal(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium whitespace-nowrap transition-colors"
                                >
                                    <PackagePlus className="h-4 w-4" />
                                    Receive Stock
                                </button>
                                <button
                                    onClick={() => { setNumpadField('price'); setShowNumpad(true) }}
                                    className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium whitespace-nowrap transition-colors"
                                >
                                    <DollarSign className="h-4 w-4" />
                                    Change Price
                                </button>
                                <button
                                    onClick={() => setShowPromoModal(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-400 text-sm font-medium whitespace-nowrap transition-colors"
                                >
                                    <Gift className="h-4 w-4" />
                                    Create Deal
                                </button>
                                <button
                                    onClick={() => window.open(`/dashboard/labels?search=${encodeURIComponent(editProduct.barcode || editProduct.name)}`, '_blank')}
                                    className="flex items-center gap-2 px-3 py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 rounded-lg text-sky-400 text-sm font-medium whitespace-nowrap transition-colors"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print Label
                                </button>
                                <button
                                    onClick={() => setShowHistoryModal(true)}
                                    className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium whitespace-nowrap transition-colors"
                                >
                                    <HistoryIcon className="h-4 w-4" />
                                    View History
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons Footer */}
                    <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            {/* Navigation */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToProduct(currentIndex - 1)}
                                    disabled={isNewProduct || currentIndex === 0}
                                    className="p-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <span className="text-stone-500 min-w-[80px] text-center">
                                    {displayIndex} / {displayTotal}
                                </span>
                                <button
                                    onClick={() => goToProduct(currentIndex + 1)}
                                    disabled={isNewProduct || currentIndex >= products.length - 1}
                                    className="p-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleDuplicate}
                                    disabled={isNewProduct}
                                    className="px-4 py-3 bg-stone-700 hover:bg-stone-600 disabled:opacity-40 rounded-lg flex items-center gap-2"
                                >
                                    <Copy className="h-5 w-5" />
                                    Duplicate
                                </button>

                                {/* Inline delete confirmation */}
                                {confirmDelete ? (
                                    <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/50 rounded-lg px-3 py-2">
                                        <span className="text-red-400 text-sm">Delete permanently?</span>
                                        <button
                                            onClick={handleDeleteConfirm}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-bold"
                                        >
                                            Yes, Delete
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(false)}
                                            className="px-3 py-1 bg-stone-700 hover:bg-stone-600 rounded text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmDelete(true)}
                                        disabled={isNewProduct}
                                        className="px-4 py-3 bg-red-600/30 hover:bg-red-600/50 disabled:opacity-40 rounded-lg flex items-center gap-2 text-red-400"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                        Delete
                                    </button>
                                )}

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
                                    {isNewProduct ? 'Create Product' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Empty state when no products */}
            {!editProduct && !loading && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <Package className="h-16 w-16 text-stone-600 mb-4" />
                    <h2 className="text-xl font-semibold text-stone-400 mb-2">No Products Yet</h2>
                    <p className="text-stone-500 mb-6">Scan a barcode or click "Add New" to add your first product.</p>
                    <button
                        onClick={handleAddNew}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 font-medium"
                    >
                        <Plus className="h-5 w-5" />
                        Add First Product
                    </button>
                </div>
            )}

            {/* Toast Component */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Department / Category Manager Modal */}
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
                preSelectedProductId={editProduct?.id !== 'new' ? editProduct?.id : undefined}
                preSelectedProductName={editProduct?.name}
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

            {/* On-Screen Keyboard for text fields (SKU, Size, Type, Brand, Vendor) */}
            <OnScreenKeyboard
                isOpen={showKeyboard}
                onClose={() => { setShowKeyboard(false); setKeyboardField(null); }}
                onSubmit={(value) => {
                    if (keyboardField && editProduct) {
                        updateField(keyboardField, value || null)
                    }
                }}
                title={
                    keyboardField === 'sku' ? 'Enter SKU' :
                        keyboardField === 'size' ? 'Enter Size (e.g., 750ml, 12 oz)' :
                            keyboardField === 'productType' ? 'Enter Product Type (e.g., Whiskey, Lager)' :
                                keyboardField === 'brand' ? 'Enter Brand Name' :
                                    keyboardField === 'vendor' ? 'Enter Supplier / Distributor Name' : 'Enter Value'
                }
                initialValue={
                    keyboardField === 'sku' ? editProduct?.sku || '' :
                        keyboardField === 'size' ? editProduct?.size || '' :
                            keyboardField === 'productType' ? editProduct?.productType || '' :
                                keyboardField === 'brand' ? editProduct?.brand || '' :
                                    keyboardField === 'vendor' ? editProduct?.vendor || '' : ''
                }
                placeholder={
                    keyboardField === 'sku' ? 'e.g., LIQ-001' :
                        keyboardField === 'size' ? 'e.g., 750ml' :
                            keyboardField === 'productType' ? 'e.g., Whiskey' :
                                keyboardField === 'brand' ? 'e.g., Macallan' :
                                    keyboardField === 'vendor' ? 'e.g., Southern Glazers' : ''
                }
                type="alphanumeric"
            />

            {/* Quick Receive Modal */}
            <QuickReceiveModal
                isOpen={showReceiveModal}
                onClose={() => setShowReceiveModal(false)}
                productId={editProduct?.id !== 'new' ? editProduct?.id : undefined}
                productName={editProduct?.name}
                currentStock={editProduct?.stock}
                onReceived={() => { loadData(); setShowReceiveModal(false) }}
            />

            {/* Product History Modal */}
            <ProductHistoryModal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                productId={editProduct?.id || ''}
                productName={editProduct?.name || ''}
            />
        </div>
    )
}
