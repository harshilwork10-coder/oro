'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Package,
    Star,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    HelpCircle,
    Loader2,
    Filter,
    ArrowUpRight,
    ShoppingCart,
    Ban,
    ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

type ProductClassification = 'star' | 'cash_cow' | 'question_mark' | 'dog'

interface ProductMixItem {
    productId: string
    productName: string
    barcode?: string
    category?: string
    unitsSold: number
    revenue: number
    margin: number | null
    stockTurnRate: number
    currentStock: number
    classification: ProductClassification
    salesVelocity: 'high' | 'medium' | 'low'
    marginLevel: 'high' | 'medium' | 'low'
    recommendation: string
    action: 'stock_more' | 'maintain' | 'promote' | 'discontinue' | 'reprice'
    priority: 'high' | 'medium' | 'low'
}

interface ProductMixAnalysis {
    summary: {
        totalProducts: number
        analyzedProducts: number
        stars: number
        cashCows: number
        questionMarks: number
        dogs: number
        totalRevenue: number
        totalProfit: number
    }
    products: ProductMixItem[]
    topRecommendations: ProductMixItem[]
}

export default function AIProductMixPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [analysis, setAnalysis] = useState<ProductMixAnalysis | null>(null)
    const [filter, setFilter] = useState<'all' | ProductClassification>('all')
    const [error, setError] = useState('')

    useEffect(() => {
        loadAnalysis()
    }, [])

    const loadAnalysis = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/ai/product-mix')
            if (!res.ok) throw new Error('Failed to load')
            const data = await res.json()
            setAnalysis(data)
        } catch (err) {
            setError('Failed to load product mix analysis')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = analysis?.products.filter(p =>
        filter === 'all' || p.classification === filter
    ) || []

    const classificationConfig = {
        star: {
            icon: Star,
            label: 'Star',
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10 border-yellow-500/20',
            description: 'High sales + High margin'
        },
        cash_cow: {
            icon: TrendingUp,
            label: 'Cash Cow',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
            description: 'High sales + Low margin'
        },
        question_mark: {
            icon: HelpCircle,
            label: 'Question Mark',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
            description: 'Low sales + High margin'
        },
        dog: {
            icon: AlertTriangle,
            label: 'Dog',
            color: 'text-red-400',
            bg: 'bg-red-500/10 border-red-500/20',
            description: 'Low sales + Low margin'
        }
    }

    const actionConfig = {
        stock_more: { icon: ShoppingCart, color: 'text-emerald-400', label: 'Stock More' },
        maintain: { icon: TrendingUp, color: 'text-blue-400', label: 'Maintain' },
        promote: { icon: ArrowUpRight, color: 'text-purple-400', label: 'Promote' },
        discontinue: { icon: Ban, color: 'text-red-400', label: 'Discontinue' },
        reprice: { icon: TrendingDown, color: 'text-yellow-400', label: 'Reprice' }
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
                            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-white">AI Product Mix</h1>
                        </div>
                        <p className="text-gray-400 text-sm">
                            BCG Matrix analysis to optimize your product portfolio
                        </p>
                    </div>
                </div>
            </div>

            {/* BCG Matrix Summary */}
            {analysis && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {(Object.entries(classificationConfig) as [ProductClassification, typeof classificationConfig.star][]).map(([key, config]) => {
                        const count = analysis.summary[key === 'cash_cow' ? 'cashCows' : key === 'question_mark' ? 'questionMarks' : key + 's' as keyof typeof analysis.summary] as number

                        return (
                            <button
                                key={key}
                                onClick={() => setFilter(filter === key ? 'all' : key)}
                                className={`p-4 rounded-xl border transition-all ${filter === key
                                    ? `${config.bg} ring-2 ring-offset-2 ring-offset-[#0f0f1a]`
                                    : 'bg-[#1a1a2e] border-gray-800 hover:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <config.icon className={`w-5 h-5 ${config.color}`} />
                                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                                </div>
                                <div className="text-3xl font-bold text-white mb-1">{count}</div>
                                <div className="text-xs text-gray-500">{config.description}</div>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Top Recommendations */}
            {analysis && analysis.topRecommendations.length > 0 && filter === 'all' && (
                <div className="bg-[#1a1a2e] rounded-xl p-4 border border-yellow-500/20 mb-6">
                    <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        Priority Actions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analysis.topRecommendations.slice(0, 4).map((item) => {
                            const action = actionConfig[item.action]
                            return (
                                <div key={item.productId} className="flex items-center gap-3 p-3 bg-[#0f0f1a] rounded-lg">
                                    <div className={`p-2 rounded-lg ${classificationConfig[item.classification].bg}`}>
                                        <action.icon className={`w-4 h-4 ${action.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{item.productName}</div>
                                        <div className="text-xs text-gray-500 truncate">{item.recommendation}</div>
                                    </div>
                                    <span className={`text-xs font-medium ${action.color}`}>
                                        {action.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Products Table */}
            <div className="bg-[#1a1a2e] rounded-xl border border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#0f0f1a] text-left">
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Classification</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Units Sold</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Revenue</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Margin</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">Stock</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Recommendation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {filteredProducts.slice(0, 50).map((item) => {
                                const config = classificationConfig[item.classification]
                                const action = actionConfig[item.action]

                                return (
                                    <tr key={item.productId} className="hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{item.productName}</div>
                                            {item.category && (
                                                <div className="text-xs text-gray-500">{item.category}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${config.bg}`}>
                                                <config.icon className={`w-3 h-3 ${config.color}`} />
                                                <span className={config.color}>{config.label}</span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-300">
                                            {item.unitsSold}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-300">
                                            ${item.revenue.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {item.margin !== null ? (
                                                <span className={item.margin >= 0.25 ? 'text-emerald-400' : 'text-yellow-400'}>
                                                    {(item.margin * 100).toFixed(1)}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={item.currentStock <= 5 ? 'text-red-400' : 'text-gray-300'}>
                                                {item.currentStock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <action.icon className={`w-4 h-4 ${action.color}`} />
                                                <span className="text-sm text-gray-400">{action.label}</span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredProducts.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                        No products found with sales data
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

