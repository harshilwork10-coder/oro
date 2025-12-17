'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    AlertTriangle, Package, DollarSign, Clock, ArrowLeft,
    TrendingDown, Sparkles, Loader2, Gift, Check
} from 'lucide-react'
import Toast from '@/components/ui/Toast'

interface SlowMover {
    id: string
    name: string
    barcode: string | null
    sku: string | null
    category: string
    price: number
    cost: number | null
    stock: number
    vendor: string | null
    lastSaleDate: string | null
    daysSinceLastSale: number | null
    tiedUpCapital: number
    suggestedDiscount: {
        percent: number
        newPrice: number
        profitMargin: number
    }
}

export default function SlowMoversPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<{
        cutoffMonths: number
        totalSlowMovers: number
        totalTiedUpCapital: number
        totalUnits: number
        products: SlowMover[]
    } | null>(null)
    const [creating, setCreating] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        loadSlowMovers()
    }, [])

    const loadSlowMovers = async () => {
        try {
            const res = await fetch('/api/inventory/slow-movers?months=6')
            if (res.ok) {
                setData(await res.json())
            }
        } catch (error) {
            console.error('Failed to load slow movers:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateDeal = async (product: SlowMover) => {
        setCreating(product.id)
        try {
            const res = await fetch('/api/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `Clearance: ${product.name}`,
                    description: `AI-suggested clearance - ${product.suggestedDiscount.percent}% off`,
                    type: 'PERCENTAGE_OFF',
                    discountType: 'PERCENTAGE',
                    discountValue: product.suggestedDiscount.percent,
                    appliesTo: 'SPECIFIC_PRODUCTS',
                    qualifyingItems: [{ type: 'PRODUCT', id: product.id }],
                    isActive: true
                })
            })

            if (res.ok) {
                setToast({ message: `Deal created for ${product.name}!`, type: 'success' })
                setData(prev => prev ? {
                    ...prev,
                    products: prev.products.filter(p => p.id !== product.id),
                    totalSlowMovers: prev.totalSlowMovers - 1,
                    totalTiedUpCapital: prev.totalTiedUpCapital - product.tiedUpCapital,
                    totalUnits: prev.totalUnits - product.stock
                } : null)
            } else {
                setToast({ message: 'Failed to create deal', type: 'error' })
            }
        } catch {
            setToast({ message: 'Error creating deal', type: 'error' })
        } finally {
            setCreating(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-stone-950">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => router.push('/dashboard/inventory/retail')}
                    className="p-3 bg-stone-700 hover:bg-stone-600 rounded-lg"
                >
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <AlertTriangle className="h-7 w-7 text-red-400" />
                        Slow-Moving Inventory
                    </h1>
                    <p className="text-stone-400 mt-1">
                        Products with no sales in 6+ months - AI suggests clearance deals
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-stone-900 border border-stone-700 p-6 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                <Package className="h-6 w-6 text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-400">Slow Movers</p>
                                <p className="text-3xl font-bold text-red-400">{data.totalSlowMovers}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-stone-900 border border-stone-700 p-6 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                <DollarSign className="h-6 w-6 text-orange-400" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-400">Tied-Up Capital</p>
                                <p className="text-3xl font-bold text-orange-400">
                                    ${data.totalTiedUpCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-stone-900 border border-stone-700 p-6 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <TrendingDown className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-stone-400">Total Units</p>
                                <p className="text-3xl font-bold text-blue-400">{data.totalUnits}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Products List */}
            {data && data.products.length > 0 ? (
                <div className="space-y-4">
                    {data.products.map(product => (
                        <div key={product.id} className="bg-stone-900 border border-stone-700 p-4 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-lg">{product.name}</h3>
                                        <span className="px-2 py-0.5 bg-stone-700 text-stone-300 text-xs rounded">
                                            {product.category}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm text-stone-400">
                                        <span className="flex items-center gap-1">
                                            <Package className="h-4 w-4" />
                                            {product.stock} in stock
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="h-4 w-4" />
                                            ${product.price.toFixed(2)}
                                        </span>
                                        <span className="flex items-center gap-1 text-red-400">
                                            <Clock className="h-4 w-4" />
                                            {product.daysSinceLastSale ? `${product.daysSinceLastSale} days since sale` : 'Never sold'}
                                        </span>
                                        <span className="flex items-center gap-1 text-orange-400">
                                            ${product.tiedUpCapital.toFixed(2)} tied up
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-xs text-purple-400 flex items-center gap-1 justify-end mb-1">
                                            <Sparkles className="h-3 w-3" />
                                            AI Suggested
                                        </div>
                                        <div className="text-lg font-bold text-purple-400">
                                            {product.suggestedDiscount.percent}% off
                                        </div>
                                        <div className="text-xs text-stone-500">
                                            ${product.suggestedDiscount.newPrice.toFixed(2)} • {product.suggestedDiscount.profitMargin}% margin
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleCreateDeal(product)}
                                        disabled={creating === product.id}
                                        className="px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-stone-700 rounded-lg flex items-center gap-2 font-medium"
                                    >
                                        {creating === product.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Gift className="h-5 w-5" />
                                        )}
                                        Create Deal
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-stone-900 border border-stone-700 p-12 rounded-2xl text-center">
                    <Check className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Slow-Moving Items!</h3>
                    <p className="text-stone-400">
                        All your products have sold within the last 6 months.
                    </p>
                </div>
            )}

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            )}
        </div>
    )
}
