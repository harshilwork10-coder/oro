'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    DollarSign,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ArrowUp,
    ArrowDown,
    Loader2,
    Filter,
    Check,
    ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

interface PricingSuggestion {
    productId: string
    productName: string
    barcode?: string
    currentPrice: number
    cost: number | null
    currentMargin: number | null
    targetMargin: number
    suggestedPrice: number
    priceChange: number
    reason: string
    priority: 'high' | 'medium' | 'low'
    salesVolume: number
    revenueImpact: number
}

interface PricingAnalysis {
    summary: {
        totalProducts: number
        productsWithCost: number
        belowTargetMargin: number
        aboveTargetMargin: number
        potentialRevenueGain: number
    }
    suggestions: PricingSuggestion[]
}

export default function AIPricingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [analysis, setAnalysis] = useState<PricingAnalysis | null>(null)
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
    const [applying, setApplying] = useState<string | null>(null)
    const [applied, setApplied] = useState<Set<string>>(new Set())
    const [error, setError] = useState('')

    useEffect(() => {
        loadAnalysis()
    }, [])

    const loadAnalysis = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/ai/price-optimization')
            if (!res.ok) throw new Error('Failed to load')
            const data = await res.json()
            setAnalysis(data)
        } catch (err) {
            setError('Failed to load pricing analysis')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const applyPrice = async (productId: string, newPrice: number) => {
        try {
            setApplying(productId)
            const res = await fetch('/api/ai/price-optimization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, newPrice })
            })
            if (res.ok) {
                setApplied(prev => new Set(prev).add(productId))
            }
        } catch (err) {
            console.error('Failed to apply price:', err)
        } finally {
            setApplying(null)
        }
    }

    const filteredSuggestions = analysis?.suggestions.filter(s =>
        filter === 'all' || s.priority === filter
    ) || []

    const priorityColors = {
        high: 'text-red-400 bg-red-500/10 border-red-500/20',
        medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        low: 'text-gray-400 bg-gray-500/10 border-gray-500/20'
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
                            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-white">AI Price Optimization</h1>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Margin-based pricing suggestions to maximize revenue
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {analysis && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
                        <div className="text-gray-400 text-sm mb-1">Products Analyzed</div>
                        <div className="text-2xl font-bold text-white">{analysis.summary.productsWithCost}</div>
                        <div className="text-xs text-gray-500">with cost data</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-red-500/20">
                        <div className="text-red-400 text-sm mb-1">Below Target Margin</div>
                        <div className="text-2xl font-bold text-white">{analysis.summary.belowTargetMargin}</div>
                        <div className="text-xs text-gray-500">need price increase</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-emerald-500/20">
                        <div className="text-emerald-400 text-sm mb-1">Potential Revenue Gain</div>
                        <div className="text-2xl font-bold text-white">
                            +${analysis.summary.potentialRevenueGain.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">monthly impact</div>
                    </div>
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-gray-800">
                        <div className="text-gray-400 text-sm mb-1">Suggestions</div>
                        <div className="text-2xl font-bold text-white">{analysis.suggestions.length}</div>
                        <div className="text-xs text-gray-500">actionable items</div>
                    </div>
                </div>
            )}

            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Filter:</span>
                {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-lg text-sm capitalize transition-colors ${filter === f
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Suggestions Table */}
            <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#0f0f1a] text-left">
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Current</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Margin</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Suggested</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Change</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Priority</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredSuggestions.map((item) => (
                                <tr key={item.productId} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{item.productName}</div>
                                        <div className="text-xs text-gray-500">{item.reason}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-300">
                                        ${item.currentPrice.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {item.currentMargin !== null ? (
                                            <span className={item.currentMargin < item.targetMargin ? 'text-red-400' : 'text-emerald-400'}>
                                                {(item.currentMargin * 100).toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                                        ${item.suggestedPrice.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`flex items-center justify-end gap-1 ${item.priceChange > 0 ? 'text-emerald-400' : 'text-red-400'
                                            }`}>
                                            {item.priceChange > 0 ? (
                                                <ArrowUp className="w-3 h-3" />
                                            ) : (
                                                <ArrowDown className="w-3 h-3" />
                                            )}
                                            ${Math.abs(item.priceChange).toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs capitalize border ${priorityColors[item.priority]}`}>
                                            {item.priority}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {applied.has(item.productId) ? (
                                            <span className="flex items-center gap-1 text-emerald-400 text-sm">
                                                <Check className="w-4 h-4" />
                                                Applied
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => applyPrice(item.productId, item.suggestedPrice)}
                                                disabled={applying === item.productId}
                                                className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                                            >
                                                {applying === item.productId ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    'Apply'
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredSuggestions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        {filter === 'all'
                                            ? 'No pricing suggestions available. All products are optimally priced!'
                                            : `No ${filter} priority suggestions`
                                        }
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
