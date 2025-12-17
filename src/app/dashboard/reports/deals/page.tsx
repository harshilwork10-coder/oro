'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Gift, TrendingUp, Calendar, Tag, BarChart3, ArrowLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface PromotionStats {
    promotionId: string
    promotionName: string
    type: string
    timesApplied: number
    totalSavings: number
    affectedItems: number
    avgSavingsPerUse: number
}

interface DealsSummary {
    totalActiveDeals: number
    totalAppliedToday: number
    totalSavingsToday: number
    topDeals: PromotionStats[]
    dealsByType: { type: string; count: number }[]
}

export default function DealsReportPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<DealsSummary>({
        totalActiveDeals: 0,
        totalAppliedToday: 0,
        totalSavingsToday: 0,
        topDeals: [],
        dealsByType: []
    })
    const [promotions, setPromotions] = useState<any[]>([])
    const [dateRange, setDateRange] = useState('today')

    useEffect(() => {
        loadData()
    }, [dateRange])

    const loadData = async () => {
        setLoading(true)
        try {
            // Load promotions
            const promoRes = await fetch('/api/promotions?active=false')
            if (promoRes.ok) {
                const data = await promoRes.json()
                setPromotions(data.promotions || [])

                // Calculate summary
                const active = data.promotions?.filter((p: any) => p.isActive) || []
                setSummary({
                    totalActiveDeals: active.length,
                    totalAppliedToday: 0, // Would need transaction data
                    totalSavingsToday: 0, // Would need transaction data
                    topDeals: [],
                    dealsByType: countByType(data.promotions || [])
                })
            }
        } catch (error) {
            console.error('Failed to load deals data:', error)
        } finally {
            setLoading(false)
        }
    }

    const countByType = (promos: any[]) => {
        const counts: { [key: string]: number } = {}
        promos.forEach(p => {
            counts[p.type] = (counts[p.type] || 0) + 1
        })
        return Object.entries(counts).map(([type, count]) => ({ type, count }))
    }

    const getTypeLabel = (type: string) => {
        const labels: { [key: string]: string } = {
            'MIX_MATCH': 'Mix & Match',
            'BOGO': 'Buy One Get One',
            'TIERED': 'Volume/Tiered',
            'PERCENTAGE': 'Percentage Off',
            'FIXED': 'Fixed Amount',
            'THRESHOLD': 'Spend Threshold',
            'BUNDLE': 'Bundle'
        }
        return labels[type] || type
    }

    const getTypeColor = (type: string) => {
        const colors: { [key: string]: string } = {
            'MIX_MATCH': 'bg-purple-500',
            'BOGO': 'bg-pink-500',
            'TIERED': 'bg-blue-500',
            'PERCENTAGE': 'bg-green-500',
            'FIXED': 'bg-orange-500',
            'THRESHOLD': 'bg-yellow-500',
            'BUNDLE': 'bg-cyan-500'
        }
        return colors[type] || 'bg-stone-500'
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/reports" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Gift className="h-6 w-6 text-pink-400" />
                            Deals & Promotions Report
                        </h1>
                        <p className="text-stone-400 text-sm">Track promotional performance and savings</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="px-4 py-2 bg-stone-800 border border-stone-700 rounded-lg"
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-2 border-pink-500 border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-pink-500/20 rounded-lg">
                                    <Gift className="h-6 w-6 text-pink-400" />
                                </div>
                                <div>
                                    <p className="text-stone-400 text-sm">Active Deals</p>
                                    <p className="text-2xl font-bold">{summary.totalActiveDeals}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-500/20 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-stone-400 text-sm">Total Promotions</p>
                                    <p className="text-2xl font-bold">{promotions.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-500/20 rounded-lg">
                                    <Tag className="h-6 w-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-stone-400 text-sm">Deal Types</p>
                                    <p className="text-2xl font-bold">{summary.dealsByType.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-purple-500/20 rounded-lg">
                                    <BarChart3 className="h-6 w-6 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-stone-400 text-sm">Inactive Deals</p>
                                    <p className="text-2xl font-bold">{promotions.filter(p => !p.isActive).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deals by Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Tag className="h-5 w-5 text-pink-400" />
                                Deals by Type
                            </h3>
                            <div className="space-y-3">
                                {summary.dealsByType.map(({ type, count }) => (
                                    <div key={type} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${getTypeColor(type)}`}></div>
                                            <span>{getTypeLabel(type)}</span>
                                        </div>
                                        <span className="font-bold">{count}</span>
                                    </div>
                                ))}
                                {summary.dealsByType.length === 0 && (
                                    <p className="text-stone-500 text-center py-4">No promotions created yet</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-400" />
                                Recent Promotions
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {promotions.slice(0, 10).map(promo => (
                                    <div key={promo.id} className="flex items-center justify-between p-2 bg-stone-800/50 rounded-lg">
                                        <div>
                                            <p className="font-medium">{promo.name}</p>
                                            <p className="text-xs text-stone-400">{getTypeLabel(promo.type)}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs ${promo.isActive ? 'bg-green-500/20 text-green-400' : 'bg-stone-700 text-stone-400'}`}>
                                            {promo.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                ))}
                                {promotions.length === 0 && (
                                    <p className="text-stone-500 text-center py-4">No promotions created yet</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* All Promotions Table */}
                    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4">
                        <h3 className="font-semibold mb-4">All Promotions</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-stone-700">
                                        <th className="pb-3 text-stone-400 font-medium">Name</th>
                                        <th className="pb-3 text-stone-400 font-medium">Type</th>
                                        <th className="pb-3 text-stone-400 font-medium">Discount</th>
                                        <th className="pb-3 text-stone-400 font-medium">Applies To</th>
                                        <th className="pb-3 text-stone-400 font-medium">Status</th>
                                        <th className="pb-3 text-stone-400 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promotions.map(promo => (
                                        <tr key={promo.id} className="border-b border-stone-800/50">
                                            <td className="py-3 font-medium">{promo.name}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${getTypeColor(promo.type)}/20 text-white`}>
                                                    {getTypeLabel(promo.type)}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                {promo.discountType === 'PERCENT' && `${promo.discountValue}%`}
                                                {promo.discountType === 'FIXED_AMOUNT' && formatCurrency(promo.discountValue)}
                                                {promo.discountType === 'FIXED_PRICE' && formatCurrency(promo.discountValue)}
                                                {promo.discountType === 'FREE_ITEM' && 'Free Item'}
                                                {promo.discountType === 'TIERED' && 'Tiered'}
                                            </td>
                                            <td className="py-3 text-stone-400">{promo.appliesTo}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${promo.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {promo.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-stone-400">
                                                {new Date(promo.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {promotions.length === 0 && (
                                <p className="text-stone-500 text-center py-8">No promotions to display</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
