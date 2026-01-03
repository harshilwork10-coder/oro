'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Gift, Plus, Trash2, Tag, Percent, DollarSign,
    Calendar, Clock, ShoppingBag, ChevronDown, ChevronUp,
    Zap, ArrowLeft, Edit, FileUp
} from 'lucide-react'
import PromotionManagerModal from '@/components/modals/PromotionManagerModal'

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
    appliesTo: string
    isActive: boolean
    qualifyingItems: any[]
    createdAt: string
}

export default function DealsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/auth/login')
        }
    })

    const [promotions, setPromotions] = useState<Promotion[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

    useEffect(() => {
        loadPromotions()
    }, [])

    const loadPromotions = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/promotions?active=false')
            if (res.ok) {
                const data = await res.json()
                setPromotions(data.promotions || [])
            }
        } catch (error) {
            console.error('Failed to load promotions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Deactivate this promotion?')) return

        try {
            const res = await fetch(`/api/promotions?id=${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadPromotions()
            }
        } catch (error) {
            console.error('Failed to delete promotion:', error)
        }
    }

    const filteredPromotions = promotions.filter(promo => {
        if (filter === 'active') return promo.isActive
        if (filter === 'inactive') return !promo.isActive
        return true
    })

    const activeCount = promotions.filter(p => p.isActive).length
    const inactiveCount = promotions.filter(p => !p.isActive).length

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'MIX_MATCH': return <ShoppingBag className="h-5 w-5" />
            case 'BOGO': return <Gift className="h-5 w-5" />
            case 'PERCENTAGE': return <Percent className="h-5 w-5" />
            case 'FIXED': return <DollarSign className="h-5 w-5" />
            case 'THRESHOLD': return <Zap className="h-5 w-5" />
            default: return <Tag className="h-5 w-5" />
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'MIX_MATCH': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'BOGO': return 'bg-green-500/20 text-green-400 border-green-500/30'
            case 'PERCENTAGE': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            case 'FIXED': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
            case 'THRESHOLD': return 'bg-pink-500/20 text-pink-400 border-pink-500/30'
            default: return 'bg-stone-500/20 text-stone-400 border-stone-500/30'
        }
    }

    const getDiscountDisplay = (promo: Promotion) => {
        if (promo.discountType === 'PERCENT') return `${promo.discountValue}% off`
        if (promo.discountType === 'FIXED_PRICE') return `$${promo.discountValue} total`
        if (promo.discountType === 'FREE_ITEM') return 'Free item'
        return `$${promo.discountValue} off`
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="animate-pulse text-stone-400">Loading deals...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-blue-600/20 border-b border-stone-800">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/dashboard"
                                className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                            <div>
                                <div className="flex items-center gap-3">
                                    <Gift className="h-8 w-8 text-pink-400" />
                                    <h1 className="text-2xl font-bold">Promotions & Deals</h1>
                                </div>
                                <p className="text-stone-400 mt-1">
                                    Manage Mix & Match, BOGO, discounts, and more
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/dashboard/deals/manufacturer"
                                className="px-4 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-400 rounded-xl flex items-center gap-2 font-medium"
                            >
                                <FileUp className="h-4 w-4" />
                                Import Buydowns
                            </Link>
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-xl flex items-center gap-2 font-medium shadow-lg shadow-pink-600/20"
                            >
                                <Plus className="h-5 w-5" />
                                Create Deal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-pink-500/20 rounded-lg">
                                <Gift className="h-6 w-6 text-pink-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{promotions.length}</p>
                                <p className="text-stone-400 text-sm">Total Deals</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-500/20 rounded-lg">
                                <Zap className="h-6 w-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeCount}</p>
                                <p className="text-stone-400 text-sm">Active</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-stone-500/20 rounded-lg">
                                <Tag className="h-6 w-6 text-stone-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{inactiveCount}</p>
                                <p className="text-stone-400 text-sm">Inactive</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter */}
                <div className="flex gap-2 mb-6">
                    {['all', 'active', 'inactive'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-pink-600 text-white'
                                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Deals List */}
                {filteredPromotions.length === 0 ? (
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-12 text-center">
                        <Gift className="h-12 w-12 text-stone-600 mx-auto mb-4" />
                        <h3 className="text-xl font-medium mb-2">No Deals Yet</h3>
                        <p className="text-stone-400 mb-6">Create your first promotion to attract more customers</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-lg inline-flex items-center gap-2"
                        >
                            <Plus className="h-5 w-5" />
                            Create Your First Deal
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPromotions.map(promo => (
                            <div
                                key={promo.id}
                                className={`bg-stone-900 border rounded-xl overflow-hidden ${promo.isActive ? 'border-stone-700' : 'border-stone-800 opacity-60'
                                    }`}
                            >
                                {/* Card Header */}
                                <div className={`p-4 border-b border-stone-800 ${getTypeColor(promo.type)}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-black/20 rounded-lg">
                                                {getTypeIcon(promo.type)}
                                            </div>
                                            <div>
                                                <p className="font-bold">{promo.name}</p>
                                                <p className="text-xs opacity-75">{promo.type.replace('_', ' ')}</p>
                                            </div>
                                        </div>
                                        {!promo.isActive && (
                                            <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                                                Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-3">
                                    {/* Discount */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-stone-400">Discount</span>
                                        <span className="font-bold text-lg">{getDiscountDisplay(promo)}</span>
                                    </div>

                                    {/* Quantity */}
                                    {promo.requiredQty && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-stone-400">Buy</span>
                                            <span>{promo.requiredQty} items</span>
                                        </div>
                                    )}

                                    {promo.getQty && (
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-stone-400">Get Free</span>
                                            <span>{promo.getQty} items</span>
                                        </div>
                                    )}

                                    {/* Dates */}
                                    {(promo.startDate || promo.endDate) && (
                                        <div className="flex items-center gap-2 text-sm text-stone-400">
                                            <Calendar className="h-4 w-4" />
                                            {promo.startDate && new Date(promo.startDate).toLocaleDateString()}
                                            {promo.startDate && promo.endDate && ' - '}
                                            {promo.endDate && new Date(promo.endDate).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>

                                {/* Card Actions */}
                                <div className="p-4 bg-stone-800/50 border-t border-stone-800 flex gap-2">
                                    <button
                                        onClick={() => handleDelete(promo.id)}
                                        className="flex-1 py-2 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Deactivate
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            <PromotionManagerModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onUpdate={loadPromotions}
            />
        </div>
    )
}

