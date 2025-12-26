'use client'

import { useState, useEffect } from 'react'
import {
    X, Plus, Trash2, Tag, Percent, DollarSign,
    Calendar, Clock, Gift, ShoppingBag, ChevronDown,
    ChevronUp, Zap, Layers
} from 'lucide-react'

interface Promotion {
    id: string
    name: string
    description?: string
    type: string
    discountType: string
    discountValue: number
    requiredQty?: number
    getQty?: number
    minSpend?: number
    startDate?: string
    endDate?: string
    timeStart?: string
    timeEnd?: string
    daysOfWeek?: string
    appliesTo: string
    stackable: boolean
    priority: number
    promoCode?: string
    isActive: boolean
    qualifyingItems: any[]
}

interface Category {
    id: string
    name: string
}

interface Product {
    id: string
    name: string
    barcode?: string
    price: number
}

interface PromotionManagerModalProps {
    isOpen: boolean
    onClose: () => void
    onUpdate?: () => void
}

const DEAL_TYPES = [
    { value: 'MIX_MATCH', label: 'Mix & Match', icon: ShoppingBag, description: 'Any X items for $Y' },
    { value: 'BOGO', label: 'BOGO', icon: Gift, description: 'Buy X Get Y Free/Off' },
    { value: 'TIERED', label: 'Volume/Tiered', icon: Layers, description: '2 for $15, 3 for $20...' },
    { value: 'PERCENTAGE', label: 'Percentage Off', icon: Percent, description: 'X% off qualifying items' },
    { value: 'FIXED', label: 'Fixed Amount Off', icon: DollarSign, description: '$X off per item' },
    { value: 'THRESHOLD', label: 'Spend Threshold', icon: Zap, description: 'Spend $X get discount' },
]

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export default function PromotionManagerModal({
    isOpen,
    onClose,
    onUpdate
}: PromotionManagerModalProps) {
    const [promotions, setPromotions] = useState<Promotion[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: 'PERCENTAGE',
        discountType: 'PERCENT',
        discountValue: 10,
        requiredQty: 2,
        getQty: 1,
        minSpend: 50,
        startDate: '',
        endDate: '',
        timeStart: '',
        timeEnd: '',
        daysOfWeek: [] as string[],
        appliesTo: 'ALL',
        stackable: false,
        priority: 0,
        promoCode: '',
        categoryIds: [] as string[],
        productIds: [] as string[],
        priceTiers: [{ qty: 2, price: 15 }, { qty: 3, price: 20 }] as { qty: number, price: number }[]
    })

    useEffect(() => {
        if (isOpen) {
            loadData()
        }
    }, [isOpen])

    const loadData = async () => {
        setLoading(true)
        try {
            const [promoRes, catRes, prodRes] = await Promise.all([
                fetch('/api/promotions?active=false'),
                fetch('/api/inventory/categories'),
                fetch('/api/inventory/products')
            ])

            if (promoRes.ok) {
                const data = await promoRes.json()
                setPromotions(data.promotions || [])
            }

            if (catRes.ok) {
                const data = await catRes.json()
                setCategories(data.categories || [])
            }

            if (prodRes.ok) {
                const data = await prodRes.json()
                setProducts(data.products || data || [])
            }
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: 'PERCENTAGE',
            discountType: 'PERCENT',
            discountValue: 10,
            requiredQty: 2,
            getQty: 1,
            minSpend: 50,
            startDate: '',
            endDate: '',
            timeStart: '',
            timeEnd: '',
            daysOfWeek: [],
            appliesTo: 'ALL',
            stackable: false,
            priority: 0,
            promoCode: '',
            categoryIds: [],
            productIds: [],
            priceTiers: [{ qty: 2, price: 15 }, { qty: 3, price: 20 }]
        })
    }

    const handleCreate = async () => {
        if (!formData.name.trim()) return

        setSaving(true)
        try {
            // Set discountType based on type
            let discountType = 'PERCENT'
            if (formData.type === 'MIX_MATCH' || formData.type === 'BUNDLE') {
                discountType = 'FIXED_PRICE'
            } else if (formData.type === 'BOGO') {
                discountType = 'FREE_ITEM'
            } else if (formData.type === 'FIXED') {
                discountType = 'FIXED_AMOUNT'
            } else if (formData.type === 'TIERED') {
                discountType = 'TIERED'
            }

            const res = await fetch('/api/promotions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    discountType,
                    daysOfWeek: formData.daysOfWeek.length > 0 ? formData.daysOfWeek : null,
                    priceTiers: formData.type === 'TIERED' ? JSON.stringify(formData.priceTiers) : null,
                    qualifyingItems: [
                        ...formData.categoryIds.map(id => ({ categoryId: id })),
                        ...formData.productIds.map(id => ({ productId: id }))
                    ]
                })
            })

            if (res.ok) {
                resetForm()
                setShowForm(false)
                loadData()
                onUpdate?.()
            }
        } catch (error) {
            console.error('Failed to create promotion:', error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deactivate this promotion?')) return

        try {
            const res = await fetch(`/api/promotions?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadData()
                onUpdate?.()
            }
        } catch (error) {
            console.error('Failed to delete promotion:', error)
        }
    }

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter(d => d !== day)
                : [...prev.daysOfWeek, day]
        }))
    }

    const toggleCategory = (id: string) => {
        setFormData(prev => ({
            ...prev,
            categoryIds: prev.categoryIds.includes(id)
                ? prev.categoryIds.filter(c => c !== id)
                : [...prev.categoryIds, id]
        }))
    }

    const toggleProduct = (id: string) => {
        setFormData(prev => ({
            ...prev,
            productIds: prev.productIds.includes(id)
                ? prev.productIds.filter(p => p !== id)
                : [...prev.productIds, id]
        }))
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 20) // Limit to 20 for performance

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-stone-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-stone-700 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-stone-700 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                    <div className="flex items-center gap-3">
                        <Tag className="h-6 w-6 text-purple-400" />
                        <div>
                            <h2 className="text-xl font-bold">Promotions & Deals</h2>
                            <p className="text-sm text-stone-400">Mix & Match, BOGO, Discounts</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded-lg">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-pulse text-stone-400">Loading promotions...</div>
                        </div>
                    ) : (
                        <>
                            {/* Add Button */}
                            {!showForm && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="w-full mb-4 py-3 border-2 border-dashed border-stone-600 rounded-xl text-stone-400 hover:border-purple-500 hover:text-purple-400 flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Plus className="h-5 w-5" />
                                    Create New Promotion
                                </button>
                            )}

                            {/* Create Form */}
                            {showForm && (
                                <div className="bg-stone-800 rounded-xl p-4 mb-4 border border-stone-700">
                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <Plus className="h-5 w-5 text-purple-400" />
                                        New Promotion
                                    </h3>

                                    <div className="space-y-4">
                                        {/* Name */}
                                        <div>
                                            <label className="text-sm text-stone-400">Promotion Name *</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g., Any 6 Beers for $12.99"
                                                className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                                            />
                                        </div>

                                        {/* Deal Type */}
                                        <div>
                                            <label className="text-sm text-stone-400">Deal Type</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                                                {DEAL_TYPES.map(type => (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => setFormData({ ...formData, type: type.value })}
                                                        className={`p-3 rounded-lg border text-left ${formData.type === type.value
                                                            ? 'border-purple-500 bg-purple-500/20'
                                                            : 'border-stone-600 hover:border-stone-500'
                                                            }`}
                                                    >
                                                        <type.icon className="h-5 w-5 mb-1" />
                                                        <div className="text-sm font-medium">{type.label}</div>
                                                        <div className="text-xs text-stone-500">{type.description}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Type-specific fields */}
                                        {(formData.type === 'MIX_MATCH' || formData.type === 'BOGO') && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm text-stone-400">Buy Quantity</label>
                                                    <input
                                                        type="number"
                                                        value={formData.requiredQty}
                                                        onChange={(e) => setFormData({ ...formData, requiredQty: parseInt(e.target.value) || 1 })}
                                                        min="1"
                                                        className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                    />
                                                </div>
                                                {formData.type === 'BOGO' && (
                                                    <div>
                                                        <label className="text-sm text-stone-400">Get Free</label>
                                                        <input
                                                            type="number"
                                                            value={formData.getQty}
                                                            onChange={(e) => setFormData({ ...formData, getQty: parseInt(e.target.value) || 1 })}
                                                            min="1"
                                                            className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {formData.type === 'THRESHOLD' && (
                                            <div>
                                                <label className="text-sm text-stone-400">Minimum Spend ($)</label>
                                                <input
                                                    type="number"
                                                    value={formData.minSpend}
                                                    onChange={(e) => setFormData({ ...formData, minSpend: parseFloat(e.target.value) || 0 })}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                />
                                            </div>
                                        )}

                                        {/* Tiered Pricing */}
                                        {formData.type === 'TIERED' && (
                                            <div>
                                                <label className="text-sm text-stone-400">Price Tiers</label>
                                                <p className="text-xs text-stone-500 mb-2">Add quantity/price tiers (e.g., 2 for $15, 3 for $20)</p>
                                                <div className="space-y-2">
                                                    {formData.priceTiers.map((tier, index) => (
                                                        <div key={index} className="flex items-center gap-2">
                                                            <div className="flex-1">
                                                                <input
                                                                    type="number"
                                                                    value={tier.qty}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...formData.priceTiers]
                                                                        newTiers[index].qty = parseInt(e.target.value) || 1
                                                                        setFormData({ ...formData, priceTiers: newTiers })
                                                                    }}
                                                                    min="1"
                                                                    className="w-full px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-center"
                                                                    placeholder="Qty"
                                                                />
                                                            </div>
                                                            <span className="text-stone-500">for</span>
                                                            <div className="flex-1 relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                                                                <input
                                                                    type="number"
                                                                    value={tier.price}
                                                                    onChange={(e) => {
                                                                        const newTiers = [...formData.priceTiers]
                                                                        newTiers[index].price = parseFloat(e.target.value) || 0
                                                                        setFormData({ ...formData, priceTiers: newTiers })
                                                                    }}
                                                                    min="0"
                                                                    step="0.01"
                                                                    className="w-full pl-7 pr-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                                    placeholder="Price"
                                                                />
                                                            </div>
                                                            {formData.priceTiers.length > 1 && (
                                                                <button
                                                                    onClick={() => {
                                                                        const newTiers = formData.priceTiers.filter((_, i) => i !== index)
                                                                        setFormData({ ...formData, priceTiers: newTiers })
                                                                    }}
                                                                    className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const lastTier = formData.priceTiers[formData.priceTiers.length - 1]
                                                            const newTiers = [...formData.priceTiers, { qty: lastTier.qty + 1, price: lastTier.price + 5 }]
                                                            setFormData({ ...formData, priceTiers: newTiers })
                                                        }}
                                                        className="w-full py-2 border border-dashed border-stone-600 rounded-lg text-stone-400 hover:border-purple-500 hover:text-purple-400 flex items-center justify-center gap-1"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Add Tier
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Discount Value */}
                                        <div>
                                            <label className="text-sm text-stone-400">
                                                {formData.type === 'MIX_MATCH' ? 'Deal Price ($)' :
                                                    formData.type === 'PERCENTAGE' ? 'Discount (%)' :
                                                        formData.type === 'FIXED' ? 'Amount Off ($)' :
                                                            formData.type === 'THRESHOLD' ? 'Discount (%)' :
                                                                'Value'}
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.discountValue}
                                                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                step={formData.type === 'PERCENTAGE' ? '1' : '0.01'}
                                                className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                            />
                                        </div>

                                        {/* Applies To */}
                                        <div>
                                            <label className="text-sm text-stone-400">Applies To</label>
                                            <select
                                                value={formData.appliesTo}
                                                onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value })}
                                                className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                            >
                                                <option value="ALL">All Products</option>
                                                <option value="CATEGORY">Specific Categories</option>
                                                <option value="PRODUCTS">Specific Products</option>
                                            </select>
                                        </div>

                                        {/* Category Selection */}
                                        {formData.appliesTo === 'CATEGORY' && (
                                            <div>
                                                <label className="text-sm text-stone-400">Select Categories</label>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {categories.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => toggleCategory(cat.id)}
                                                            className={`px-3 py-1 rounded-full text-sm ${formData.categoryIds.includes(cat.id)
                                                                ? 'bg-purple-500 text-white'
                                                                : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                                                                }`}
                                                        >
                                                            {cat.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Product Selection */}
                                        {formData.appliesTo === 'PRODUCTS' && (
                                            <div>
                                                <label className="text-sm text-stone-400">Search & Select Products</label>
                                                <input
                                                    type="text"
                                                    value={productSearch}
                                                    onChange={(e) => setProductSearch(e.target.value)}
                                                    placeholder="Search by name or barcode..."
                                                    className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                />

                                                {/* Selected Products */}
                                                {formData.productIds.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-2 p-2 bg-stone-900/50 rounded-lg">
                                                        {formData.productIds.map(id => {
                                                            const prod = products.find(p => p.id === id)
                                                            return prod ? (
                                                                <span
                                                                    key={id}
                                                                    className="px-2 py-1 bg-purple-500 text-white rounded-full text-sm flex items-center gap-1"
                                                                >
                                                                    {prod.name}
                                                                    <button onClick={() => toggleProduct(id)} className="hover:text-red-300">×</button>
                                                                </span>
                                                            ) : null
                                                        })}
                                                    </div>
                                                )}

                                                {/* Product List */}
                                                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                                                    {filteredProducts.filter(p => !formData.productIds.includes(p.id)).map(prod => (
                                                        <button
                                                            key={prod.id}
                                                            onClick={() => toggleProduct(prod.id)}
                                                            className="w-full text-left px-3 py-2 bg-stone-800 hover:bg-stone-700 rounded-lg flex justify-between items-center"
                                                        >
                                                            <span>{prod.name}</span>
                                                            <span className="text-stone-500 text-sm">${prod.price}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Date Range */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm text-stone-400">Start Date (Optional)</label>
                                                <input
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                    className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-stone-400">End Date (Optional)</label>
                                                <input
                                                    type="date"
                                                    value={formData.endDate}
                                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                    className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                />
                                            </div>
                                        </div>

                                        {/* Days of Week */}
                                        <div>
                                            <label className="text-sm text-stone-400">Active Days (Optional - empty = all days)</label>
                                            <div className="flex gap-1 mt-1">
                                                {DAYS_OF_WEEK.map(day => (
                                                    <button
                                                        key={day}
                                                        onClick={() => toggleDay(day)}
                                                        className={`px-2 py-1 rounded text-xs font-medium ${formData.daysOfWeek.includes(day)
                                                            ? 'bg-purple-500 text-white'
                                                            : 'bg-stone-700 text-stone-400 hover:bg-stone-600'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Time Window (Happy Hour) */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm text-stone-400 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Start Time (Optional)
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.timeStart}
                                                    onChange={(e) => setFormData({ ...formData, timeStart: e.target.value })}
                                                    className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-stone-400 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    End Time (Optional)
                                                </label>
                                                <input
                                                    type="time"
                                                    value={formData.timeEnd}
                                                    onChange={(e) => setFormData({ ...formData, timeEnd: e.target.value })}
                                                    className="w-full mt-1 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-stone-500 -mt-2">Set both times for Happy Hour pricing (e.g., 2:00 PM - 5:00 PM)</p>

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => { resetForm(); setShowForm(false) }}
                                                className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCreate}
                                                disabled={saving || !formData.name.trim()}
                                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium disabled:opacity-50"
                                            >
                                                {saving ? 'Creating...' : 'Create Promotion'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Existing Promotions */}
                            <div className="space-y-2">
                                {promotions.length === 0 && !showForm ? (
                                    <div className="text-center py-8 text-stone-500">
                                        No promotions yet. Create your first deal!
                                    </div>
                                ) : (
                                    promotions.map(promo => (
                                        <div
                                            key={promo.id}
                                            className={`bg-stone-800 rounded-lg border ${promo.isActive ? 'border-stone-700' : 'border-stone-800 opacity-50'}`}
                                        >
                                            <div
                                                className="flex items-center justify-between p-3 cursor-pointer"
                                                onClick={() => setExpandedId(expandedId === promo.id ? null : promo.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${promo.type === 'MIX_MATCH' ? 'bg-blue-500/20 text-blue-400' :
                                                        promo.type === 'BOGO' ? 'bg-green-500/20 text-green-400' :
                                                            promo.type === 'PERCENTAGE' ? 'bg-purple-500/20 text-purple-400' :
                                                                promo.type === 'FIXED' ? 'bg-orange-500/20 text-orange-400' :
                                                                    'bg-pink-500/20 text-pink-400'
                                                        }`}>
                                                        {promo.type === 'MIX_MATCH' ? <ShoppingBag className="h-5 w-5" /> :
                                                            promo.type === 'BOGO' ? <Gift className="h-5 w-5" /> :
                                                                promo.type === 'PERCENTAGE' ? <Percent className="h-5 w-5" /> :
                                                                    <DollarSign className="h-5 w-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{promo.name}</p>
                                                        <p className="text-sm text-stone-400">
                                                            {promo.type.replace('_', ' ')} •
                                                            {promo.discountType === 'PERCENT' ? ` ${promo.discountValue}%` :
                                                                promo.discountType === 'FIXED_PRICE' ? ` $${promo.discountValue}` :
                                                                    promo.discountType === 'FREE_ITEM' ? ' Free' :
                                                                        ` $${promo.discountValue} off`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!promo.isActive && (
                                                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">Inactive</span>
                                                    )}
                                                    {expandedId === promo.id ?
                                                        <ChevronUp className="h-5 w-5 text-stone-500" /> :
                                                        <ChevronDown className="h-5 w-5 text-stone-500" />
                                                    }
                                                </div>
                                            </div>

                                            {expandedId === promo.id && (
                                                <div className="px-3 pb-3 pt-0 border-t border-stone-700">
                                                    <div className="grid grid-cols-2 gap-2 text-sm py-2">
                                                        {promo.requiredQty && (
                                                            <div><span className="text-stone-500">Buy:</span> {promo.requiredQty} items</div>
                                                        )}
                                                        {promo.getQty && (
                                                            <div><span className="text-stone-500">Get:</span> {promo.getQty} free</div>
                                                        )}
                                                        {promo.startDate && (
                                                            <div><span className="text-stone-500">From:</span> {new Date(promo.startDate).toLocaleDateString()}</div>
                                                        )}
                                                        {promo.endDate && (
                                                            <div><span className="text-stone-500">Until:</span> {new Date(promo.endDate).toLocaleDateString()}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={() => handleDelete(promo.id)}
                                                            className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm flex items-center justify-center gap-1"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Deactivate
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
