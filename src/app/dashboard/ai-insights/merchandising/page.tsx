'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Store,
    TrendingUp,
    Layers,
    Link2,
    Lightbulb,
    Loader2,
    ChevronRight,
    Clock,
    ShoppingBag,
    BarChart3,
    ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface CategoryPerformance {
    categoryId: string | null
    categoryName: string
    productCount: number
    unitsSold: number
    revenue: number
    averagePrice: number
    topProducts: { name: string; revenue: number }[]
    peakHours: number[]
}

interface CrossSellPattern {
    productA: { id: string; name: string }
    productB: { id: string; name: string }
    coOccurrences: number
    confidence: number
    suggestion: string
}

interface PlacementRecommendation {
    type: 'checkout_zone' | 'end_cap' | 'cross_merchandise' | 'bundle'
    title: string
    description: string
    products: { id: string; name: string }[]
    expectedImpact: string
    priority: 'high' | 'medium' | 'low'
}

interface MerchandisingAnalysis {
    summary: {
        totalCategories: number
        topCategory: string
        topCategoryRevenue: number
        crossSellOpportunities: number
    }
    categoryPerformance: CategoryPerformance[]
    crossSellPatterns: CrossSellPattern[]
    recommendations: PlacementRecommendation[]
}

export default function AIMerchandisingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [analysis, setAnalysis] = useState<MerchandisingAnalysis | null>(null)
    const [activeTab, setActiveTab] = useState<'categories' | 'crosssell' | 'recommendations'>('categories')
    const [error, setError] = useState('')

    useEffect(() => {
        loadAnalysis()
    }, [])

    const loadAnalysis = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/ai/merchandising')
            if (!res.ok) throw new Error('Failed to load')
            const data = await res.json()
            setAnalysis(data)
        } catch (err) {
            setError('Failed to load merchandising analysis')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const formatHour = (hour: number) => {
        if (hour === 0) return '12 AM'
        if (hour === 12) return '12 PM'
        return hour > 12 ? `${hour - 12} PM` : `${hour} AM`
    }

    const typeConfig = {
        checkout_zone: { icon: ShoppingBag, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        end_cap: { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        cross_merchandise: { icon: Link2, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        bundle: { icon: BarChart3, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    }

    if (loading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500">
                                <Store className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-white">AI Merchandising</h1>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Category performance and placement recommendations
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {analysis && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
                        <div className="text-gray-400 text-sm mb-1">Categories</div>
                        <div className="text-2xl font-bold text-white">{analysis.summary.totalCategories}</div>
                        <div className="text-xs text-gray-500">active categories</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-emerald-500/20">
                        <div className="text-emerald-400 text-sm mb-1">Top Category</div>
                        <div className="text-2xl font-bold text-white truncate">{analysis.summary.topCategory}</div>
                        <div className="text-xs text-gray-500">${analysis.summary.topCategoryRevenue.toFixed(2)} revenue</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-purple-500/20">
                        <div className="text-purple-400 text-sm mb-1">Cross-Sell</div>
                        <div className="text-2xl font-bold text-white">{analysis.summary.crossSellOpportunities}</div>
                        <div className="text-xs text-gray-500">pairing opportunities</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-orange-500/20">
                        <div className="text-orange-400 text-sm mb-1">Recommendations</div>
                        <div className="text-2xl font-bold text-white">{analysis.recommendations.length}</div>
                        <div className="text-xs text-gray-500">actionable insights</div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
                {[
                    { id: 'categories', label: 'Category Performance', icon: Layers },
                    { id: 'crosssell', label: 'Cross-Sell Patterns', icon: Link2 },
                    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab.id
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Category Performance Tab */}
            {activeTab === 'categories' && analysis && (
                <div className="space-y-4">
                    {analysis.categoryPerformance.map((category, index) => (
                        <div key={category.categoryName} className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                        index === 1 ? 'bg-gray-500/20 text-gray-400' :
                                            index === 2 ? 'bg-orange-500/20 text-orange-400' :
                                                'bg-gray-800 text-gray-500'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">{category.categoryName}</div>
                                        <div className="text-xs text-gray-500">
                                            {category.productCount} products · {category.unitsSold} units sold
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-emerald-400">${category.revenue.toFixed(2)}</div>
                                    <div className="text-xs text-gray-500">avg ${category.averagePrice.toFixed(2)}/item</div>
                                </div>
                            </div>

                            {/* Top Products */}
                            {category.topProducts.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs text-gray-500 mb-2">Top Products:</div>
                                    <div className="flex flex-wrap gap-2">
                                        {category.topProducts.slice(0, 4).map((product) => (
                                            <span
                                                key={product.name}
                                                className="px-2 py-1 bg-[#0f0f1a] rounded-lg text-xs text-gray-300"
                                            >
                                                {product.name} (${product.revenue.toFixed(0)})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Peak Hours */}
                            {category.peakHours.length > 0 && (
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    Peak hours: {category.peakHours.map(h => formatHour(h)).join(', ')}
                                </div>
                            )}
                        </div>
                    ))}
                    {analysis.categoryPerformance.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            No category data available
                        </div>
                    )}
                </div>
            )}

            {/* Cross-Sell Patterns Tab */}
            {activeTab === 'crosssell' && analysis && (
                <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#0f0f1a] text-left">
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product A</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">+</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product B</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Times Together</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Confidence</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {analysis.crossSellPatterns.map((pattern, index) => (
                                <tr key={index} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-3 text-gray-300">{pattern.productA.name}</td>
                                    <td className="px-4 py-3 text-center">
                                        <Link2 className="w-4 h-4 text-purple-400 mx-auto" />
                                    </td>
                                    <td className="px-4 py-3 text-gray-300">{pattern.productB.name}</td>
                                    <td className="px-4 py-3 text-right text-gray-300">{pattern.coOccurrences}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${pattern.confidence * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-purple-400 text-sm">
                                                {(pattern.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {analysis.crossSellPatterns.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        Not enough transaction data to identify cross-sell patterns
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && analysis && (
                <div className="space-y-4">
                    {analysis.recommendations.map((rec, index) => {
                        const config = typeConfig[rec.type]
                        return (
                            <div
                                key={index}
                                className={`bg-[#1a1a2e] rounded-xl p-4 border ${rec.priority === 'high' ? 'border-emerald-500/30' : 'border-gray-800'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${config.bg}`}>
                                        <config.icon className={`w-5 h-5 ${config.color}`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-white">{rec.title}</h3>
                                            {rec.priority === 'high' && (
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                                    High Impact
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 mb-3">{rec.description}</p>

                                        {rec.products.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {rec.products.map((p, i) => (
                                                    <span
                                                        key={i}
                                                        className="px-2 py-1 bg-[#0f0f1a] rounded text-xs text-gray-300"
                                                    >
                                                        {p.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-sm">
                                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                                            <span className="text-emerald-400">{rec.expectedImpact}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                </div>
                            </div>
                        )
                    })}
                    {analysis.recommendations.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            No recommendations available yet
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

