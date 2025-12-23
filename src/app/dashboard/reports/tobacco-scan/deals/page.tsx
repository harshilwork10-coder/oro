'use client'

import { useState, useEffect } from 'react'
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    Cigarette,
    Plus,
    Settings,
    DollarSign,
    Tag,
    X,
    Calendar,
    Building2,
    Percent,
    Package,
    ArrowLeft,
    CheckCircle,
    Edit,
    Trash2
} from "lucide-react"
import Link from 'next/link'

interface TobaccoDeal {
    id: string
    manufacturer: string
    dealName: string
    dealType: string
    buyQuantity?: number
    getFreeQuantity?: number  // For penny deals: number of items you get for $0.01
    discountType: string
    discountAmount: string
    startDate: string
    endDate?: string
    isActive: boolean
    timesApplied: number
    totalSavings: string
}

interface ManufacturerConfig {
    id: string
    manufacturer: string
    storeId?: string
    accountNumber?: string
    rebatePerPack: string
    rebatePerCarton: string
    loyaltyBonus: string
    isActive: boolean
}

interface TobaccoProduct {
    id: string
    name: string
    barcode?: string
    sku?: string
    price: string
}

export default function TobaccoDealsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') }
    })

    const [deals, setDeals] = useState<TobaccoDeal[]>([])
    const [configs, setConfigs] = useState<ManufacturerConfig[]>([])
    const [tobaccoProducts, setTobaccoProducts] = useState<TobaccoProduct[]>([])
    const [loading, setLoading] = useState(true)
    const [showDealModal, setShowDealModal] = useState(false)
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [selectedManufacturer, setSelectedManufacturer] = useState('ALTRIA')

    // Form state
    const [newDeal, setNewDeal] = useState({
        manufacturer: 'ALL',
        dealName: '',
        dealType: 'MULTI_BUY',
        buyQuantity: 2,
        getFreeQuantity: 1,  // For penny deals
        discountType: 'FIXED',
        discountAmount: '0.50',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        applyToAll: true
    })

    // Selected products for the deal
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())

    const [configForm, setConfigForm] = useState({
        manufacturer: 'ALTRIA',
        storeId: '',
        accountNumber: '',
        rebatePerPack: '0.04',
        rebatePerCarton: '0.40',
        loyaltyBonus: '0'
    })

    const manufacturers = ['ALTRIA', 'RJR', 'ITG']
    const dealTypes = [
        { value: 'MULTI_BUY', label: 'Multi-Buy (Buy X Get Off)' },
        { value: 'PENNY_DEAL', label: 'Penny Deal (Buy X Get Y for $0.01)' },
        { value: 'LOYALTY', label: 'Loyalty Bonus' },
        { value: 'SCAN_REBATE', label: 'Scan Rebate' },
        { value: 'PROMO', label: 'Promotional Offer' }
    ]

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        try {
            const [dealsRes, configsRes, productsRes] = await Promise.all([
                fetch('/api/tobacco-scan/deals'),
                fetch('/api/tobacco-scan/manufacturer-config'),
                fetch('/api/inventory/products?tobacco=true')
            ])

            if (dealsRes.ok) {
                const data = await dealsRes.json()
                setDeals(data.deals || [])
            }
            if (configsRes.ok) {
                const data = await configsRes.json()
                setConfigs(data.configs || [])
            }
            if (productsRes.ok) {
                const data = await productsRes.json()
                setTobaccoProducts(data.products || [])
            }
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    const openDealModal = () => {
        setSelectedProductIds(new Set())
        setNewDeal({
            manufacturer: 'ALL',
            dealName: '',
            dealType: 'MULTI_BUY',
            buyQuantity: 2,
            getFreeQuantity: 1,
            discountType: 'FIXED',
            discountAmount: '0.50',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            applyToAll: true
        })
        setShowDealModal(true)
    }

    const toggleProductSelection = (productId: string) => {
        setSelectedProductIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(productId)) {
                newSet.delete(productId)
            } else {
                newSet.add(productId)
            }
            return newSet
        })
    }

    const createDeal = async () => {
        try {
            // Collect UPCs from selected products
            let applicableUpcs = null
            if (!newDeal.applyToAll && selectedProductIds.size > 0) {
                const upcs = tobaccoProducts
                    .filter(p => selectedProductIds.has(p.id) && p.barcode)
                    .map(p => p.barcode)
                    .filter(Boolean)
                applicableUpcs = upcs.join(',')
            }

            const res = await fetch('/api/tobacco-scan/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newDeal,
                    discountAmount: parseFloat(newDeal.discountAmount),
                    applicableUpcs
                })
            })

            if (res.ok) {
                setShowDealModal(false)
                setSelectedProductIds(new Set())
                setNewDeal({
                    manufacturer: 'ALL',
                    dealName: '',
                    dealType: 'MULTI_BUY',
                    buyQuantity: 2,
                    getFreeQuantity: 1,
                    discountType: 'FIXED',
                    discountAmount: '0.50',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: '',
                    applyToAll: true
                })
                fetchData()
            }
        } catch (error) {
            console.error('Failed to create deal:', error)
        }
    }

    const saveConfig = async () => {
        try {
            const res = await fetch('/api/tobacco-scan/manufacturer-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...configForm,
                    rebatePerPack: parseFloat(configForm.rebatePerPack),
                    rebatePerCarton: parseFloat(configForm.rebatePerCarton),
                    loyaltyBonus: parseFloat(configForm.loyaltyBonus)
                })
            })

            if (res.ok) {
                setShowConfigModal(false)
                fetchData()
            }
        } catch (error) {
            console.error('Failed to save config:', error)
        }
    }

    const openConfigForManufacturer = (manufacturer: string) => {
        const existing = configs.find(c => c.manufacturer === manufacturer)
        if (existing) {
            setConfigForm({
                manufacturer,
                storeId: existing.storeId || '',
                accountNumber: existing.accountNumber || '',
                rebatePerPack: existing.rebatePerPack || '0.04',
                rebatePerCarton: existing.rebatePerCarton || '0.40',
                loyaltyBonus: existing.loyaltyBonus || '0'
            })
        } else {
            setConfigForm({
                manufacturer,
                storeId: '',
                accountNumber: '',
                rebatePerPack: '0.04',
                rebatePerCarton: '0.40',
                loyaltyBonus: '0'
            })
        }
        setShowConfigModal(true)
    }

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0)
    }

    const getManufacturerColor = (manufacturer: string) => {
        switch (manufacturer) {
            case 'ALTRIA': return 'text-red-400 bg-red-500/20'
            case 'RJR': return 'text-blue-400 bg-blue-500/20'
            case 'ITG': return 'text-amber-400 bg-amber-500/20'
            default: return 'text-stone-400 bg-stone-500/20'
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/reports/tobacco-scan" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-stone-400" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
                            <Tag className="h-6 w-6 text-amber-500" />
                            Tobacco Deals & Rebates
                        </h1>
                        <p className="text-stone-500 text-sm">Manage manufacturer deals and configure rebate rates</p>
                    </div>
                </div>

                <button
                    onClick={openDealModal}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Deal
                </button>
            </div>

            {/* Manufacturer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {manufacturers.map(manufacturer => {
                    const config = configs.find(c => c.manufacturer === manufacturer)
                    return (
                        <div key={manufacturer} className="glass-panel p-5 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-lg ${getManufacturerColor(manufacturer)} flex items-center justify-center`}>
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-100">{manufacturer}</h3>
                                        <p className="text-xs text-stone-500">
                                            {config ? 'Configured' : 'Not configured'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => openConfigForManufacturer(manufacturer)}
                                    className="p-2 hover:bg-stone-700 rounded-lg transition-colors"
                                >
                                    <Settings className="h-4 w-4 text-stone-400" />
                                </button>
                            </div>

                            {config && (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-stone-500">Pack Rebate</span>
                                        <span className="text-emerald-400">{formatCurrency(config.rebatePerPack)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-stone-500">Carton Rebate</span>
                                        <span className="text-emerald-400">{formatCurrency(config.rebatePerCarton)}</span>
                                    </div>
                                    {parseFloat(config.loyaltyBonus) > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-stone-500">Loyalty Bonus</span>
                                            <span className="text-purple-400">{formatCurrency(config.loyaltyBonus)}/mo</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Active Deals */}
            <div className="glass-panel rounded-xl p-6">
                <h2 className="text-lg font-semibold text-stone-100 mb-4">Active Deals</h2>

                {deals.length === 0 ? (
                    <div className="text-center py-8 text-stone-500">
                        <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No deals configured yet</p>
                        <p className="text-sm mt-1">Add manufacturer deals to start tracking savings</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {deals.map(deal => (
                            <div key={deal.id} className={`p-4 rounded-lg border ${deal.isActive ? 'bg-stone-800/50 border-stone-700' : 'bg-stone-900/50 border-stone-800 opacity-60'
                                }`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getManufacturerColor(deal.manufacturer)}`}>
                                            {deal.manufacturer}
                                        </span>
                                        <div>
                                            <h4 className="font-medium text-stone-200">{deal.dealName}</h4>
                                            <p className="text-sm text-stone-500">
                                                {deal.dealType === 'MULTI_BUY' && `Buy ${deal.buyQuantity}, Save ${formatCurrency(deal.discountAmount)}`}
                                                {deal.dealType === 'PENNY_DEAL' && `Buy ${deal.buyQuantity}, Get ${deal.getFreeQuantity || 1} for $0.01`}
                                                {deal.dealType === 'LOYALTY' && `Loyalty: ${formatCurrency(deal.discountAmount)}/month`}
                                                {deal.dealType === 'SCAN_REBATE' && `${formatCurrency(deal.discountAmount)} per scan`}
                                                {deal.dealType === 'PROMO' && `Promo: ${formatCurrency(deal.discountAmount)} off`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-emerald-400 font-medium">{formatCurrency(deal.totalSavings)} saved</p>
                                        <p className="text-xs text-stone-500">{deal.timesApplied} times applied</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Deal Modal */}
            {showDealModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-panel w-full max-w-md mx-4 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-stone-100">Add Tobacco Deal</h2>
                            <button onClick={() => setShowDealModal(false)} className="text-stone-500 hover:text-stone-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Manufacturer</label>
                                <select
                                    value={newDeal.manufacturer}
                                    onChange={(e) => setNewDeal({ ...newDeal, manufacturer: e.target.value })}
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                >
                                    <option value="ALL">All Manufacturers</option>
                                    {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Deal Name</label>
                                <input
                                    type="text"
                                    value={newDeal.dealName}
                                    onChange={(e) => setNewDeal({ ...newDeal, dealName: e.target.value })}
                                    placeholder="e.g., Buy 2 Marlboro Get $0.50 Off"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Deal Type</label>
                                <select
                                    value={newDeal.dealType}
                                    onChange={(e) => setNewDeal({ ...newDeal, dealType: e.target.value })}
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                >
                                    {dealTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            {(newDeal.dealType === 'MULTI_BUY' || newDeal.dealType === 'PENNY_DEAL') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">Buy Quantity</label>
                                        <input
                                            type="number"
                                            value={newDeal.buyQuantity}
                                            onChange={(e) => setNewDeal({ ...newDeal, buyQuantity: parseInt(e.target.value) || 2 })}
                                            className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                            min="1"
                                        />
                                    </div>
                                    {newDeal.dealType === 'PENNY_DEAL' && (
                                        <div>
                                            <label className="block text-sm text-stone-400 mb-1">Get for $0.01</label>
                                            <input
                                                type="number"
                                                value={newDeal.getFreeQuantity}
                                                onChange={(e) => setNewDeal({ ...newDeal, getFreeQuantity: parseInt(e.target.value) || 1 })}
                                                className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                                min="1"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {newDeal.dealType === 'PENNY_DEAL' && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <p className="text-sm text-amber-300 font-medium">
                                        💰 Buy {newDeal.buyQuantity} → Get {newDeal.getFreeQuantity} for just $0.01 each!
                                    </p>
                                </div>
                            )}

                            {newDeal.dealType !== 'PENNY_DEAL' && (
                                <div>
                                    <label className="block text-sm text-stone-400 mb-1">Discount Amount ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newDeal.discountAmount}
                                        onChange={(e) => setNewDeal({ ...newDeal, discountAmount: e.target.value })}
                                        className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-stone-400 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={newDeal.startDate}
                                        onChange={(e) => setNewDeal({ ...newDeal, startDate: e.target.value })}
                                        className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-stone-400 mb-1">End Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={newDeal.endDate}
                                        onChange={(e) => setNewDeal({ ...newDeal, endDate: e.target.value })}
                                        className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                    />
                                </div>
                            </div>

                            {/* Product Selection */}
                            <div className="border-t border-stone-700 pt-4">
                                <label className="block text-sm text-stone-400 mb-2">Eligible Products</label>

                                <div className="space-y-2 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={newDeal.applyToAll}
                                            onChange={() => setNewDeal({ ...newDeal, applyToAll: true })}
                                            className="w-4 h-4 accent-amber-500"
                                        />
                                        <span className="text-stone-200">All tobacco products</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={!newDeal.applyToAll}
                                            onChange={() => setNewDeal({ ...newDeal, applyToAll: false })}
                                            className="w-4 h-4 accent-amber-500"
                                        />
                                        <span className="text-stone-200">Specific products only</span>
                                    </label>
                                </div>

                                {/* Product List */}
                                {!newDeal.applyToAll && (
                                    <div className="max-h-40 overflow-y-auto bg-stone-800/50 rounded-lg border border-stone-700 p-2 space-y-1">
                                        {tobaccoProducts.length === 0 ? (
                                            <p className="text-stone-500 text-sm text-center py-2">
                                                No tobacco products found. Mark products as "Tobacco" in inventory.
                                            </p>
                                        ) : (
                                            tobaccoProducts.map(product => (
                                                <label
                                                    key={product.id}
                                                    className="flex items-center gap-2 p-2 hover:bg-stone-700 rounded cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedProductIds.has(product.id)}
                                                        onChange={() => toggleProductSelection(product.id)}
                                                        className="w-4 h-4 accent-amber-500"
                                                    />
                                                    <span className="text-stone-200 flex-1 truncate">{product.name}</span>
                                                    {product.barcode && (
                                                        <span className="text-xs text-stone-500 font-mono">{product.barcode}</span>
                                                    )}
                                                </label>
                                            ))
                                        )}
                                    </div>
                                )}

                                {!newDeal.applyToAll && selectedProductIds.size > 0 && (
                                    <p className="text-xs text-amber-400 mt-2">
                                        {selectedProductIds.size} product(s) selected
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowDealModal(false)} className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg">
                                Cancel
                            </button>
                            <button onClick={createDeal} disabled={!newDeal.dealName} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg disabled:opacity-50">
                                Add Deal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manufacturer Config Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-panel w-full max-w-md mx-4 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-stone-100">{configForm.manufacturer} Configuration</h2>
                            <button onClick={() => setShowConfigModal(false)} className="text-stone-500 hover:text-stone-300">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Store ID</label>
                                <input
                                    type="text"
                                    value={configForm.storeId}
                                    onChange={(e) => setConfigForm({ ...configForm, storeId: e.target.value })}
                                    placeholder="Your store ID in their system"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Account/License Number</label>
                                <input
                                    type="text"
                                    value={configForm.accountNumber}
                                    onChange={(e) => setConfigForm({ ...configForm, accountNumber: e.target.value })}
                                    placeholder="Tobacco license or account number"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                />
                            </div>

                            <div className="border-t border-stone-700 pt-4">
                                <h3 className="font-medium text-stone-200 mb-3">Rebate Rates</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">$/Pack</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={configForm.rebatePerPack}
                                            onChange={(e) => setConfigForm({ ...configForm, rebatePerPack: e.target.value })}
                                            className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-stone-400 mb-1">$/Carton</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={configForm.rebatePerCarton}
                                            onChange={(e) => setConfigForm({ ...configForm, rebatePerCarton: e.target.value })}
                                            className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Monthly Loyalty Bonus ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={configForm.loyaltyBonus}
                                    onChange={(e) => setConfigForm({ ...configForm, loyaltyBonus: e.target.value })}
                                    placeholder="Extra monthly bonus if applicable"
                                    className="w-full p-3 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowConfigModal(false)} className="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg">
                                Cancel
                            </button>
                            <button onClick={saveConfig} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
                                Save Config
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
