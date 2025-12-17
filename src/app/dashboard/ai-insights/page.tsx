'use client'

import { useState, useEffect } from 'react'
import {
    Brain,
    Barcode,
    DollarSign,
    Package,
    Store,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ArrowRight,
    Sparkles,
    Loader2
} from 'lucide-react'
import Link from 'next/link'

interface QuickStats {
    pricing: {
        suggestions: number
        potentialGain: number
    }
    productMix: {
        stars: number
        dogs: number
        recommendations: number
    }
    merchandising: {
        topCategory: string
        crossSellOpportunities: number
    }
}

export default function AIInsightsPage() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<QuickStats | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            setLoading(true)

            // Load all AI analysis in parallel
            const [pricingRes, productMixRes, merchandisingRes] = await Promise.all([
                fetch('/api/ai/price-optimization'),
                fetch('/api/ai/product-mix'),
                fetch('/api/ai/merchandising')
            ])

            const pricing = pricingRes.ok ? await pricingRes.json() : null
            const productMix = productMixRes.ok ? await productMixRes.json() : null
            const merchandising = merchandisingRes.ok ? await merchandisingRes.json() : null

            setStats({
                pricing: {
                    suggestions: pricing?.suggestions?.length || 0,
                    potentialGain: pricing?.summary?.potentialRevenueGain || 0
                },
                productMix: {
                    stars: productMix?.summary?.stars || 0,
                    dogs: productMix?.summary?.dogs || 0,
                    recommendations: productMix?.topRecommendations?.length || 0
                },
                merchandising: {
                    topCategory: merchandising?.summary?.topCategory || 'N/A',
                    crossSellOpportunities: merchandising?.summary?.crossSellOpportunities || 0
                }
            })
        } catch (err) {
            setError('Failed to load AI insights')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const aiFeatures = [
        {
            title: 'AI SKU Database',
            description: 'Scan barcodes to auto-fill product info from UPC databases',
            icon: Barcode,
            href: '/dashboard/inventory/products',
            color: 'from-blue-500 to-cyan-500',
            status: 'ready',
            stat: 'Integrated in Products'
        },
        {
            title: 'AI Price Optimization',
            description: 'Get margin-based pricing suggestions for all products',
            icon: DollarSign,
            href: '/dashboard/ai-insights/pricing',
            color: 'from-emerald-500 to-green-500',
            status: 'ready',
            stat: stats ? `${stats.pricing.suggestions} suggestions` : 'Loading...'
        },
        {
            title: 'AI Product Mix',
            description: 'BCG Matrix analysis - Stars, Cash Cows, and Dogs',
            icon: Package,
            href: '/dashboard/ai-insights/product-mix',
            color: 'from-purple-500 to-pink-500',
            status: 'ready',
            stat: stats ? `${stats.productMix.stars} Stars, ${stats.productMix.dogs} Dogs` : 'Loading...'
        },
        {
            title: 'AI Merchandising',
            description: 'Category performance and placement recommendations',
            icon: Store,
            href: '/dashboard/ai-insights/merchandising',
            color: 'from-orange-500 to-amber-500',
            status: 'ready',
            stat: stats ? `${stats.merchandising.crossSellOpportunities} cross-sell opportunities` : 'Loading...'
        }
    ]

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">AI Insights</h1>
                    <span className="px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full">
                        Tier 1 Complete
                    </span>
                </div>
                <p className="text-gray-400">
                    AI-powered analytics to optimize your store's performance
                </p>
            </div>

            {/* Quick Stats Banner */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-sm font-medium">Revenue Opportunity</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            +${stats.pricing.potentialGain.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">from pricing optimizations</p>
                    </div>

                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-yellow-500/20">
                        <div className="flex items-center gap-2 text-yellow-400 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="text-sm font-medium">Action Required</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                            {stats.productMix.recommendations}
                        </p>
                        <p className="text-xs text-gray-500">products need attention</p>
                    </div>

                    <div className="bg-[#1a1a2e] rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                            <Sparkles className="w-5 h-5" />
                            <span className="text-sm font-medium">Top Category</span>
                        </div>
                        <p className="text-2xl font-bold text-white truncate">
                            {stats.merchandising.topCategory}
                        </p>
                        <p className="text-xs text-gray-500">driving the most revenue</p>
                    </div>
                </div>
            )}

            {/* AI Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {aiFeatures.map((feature) => (
                    <Link
                        key={feature.title}
                        href={feature.href}
                        className="group bg-[#1a1a2e] rounded-xl p-6 border border-gray-800 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-purple-500/10"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.color}`}>
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs uppercase tracking-wide">Ready</span>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                            {feature.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            {feature.description}
                        </p>

                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    feature.stat
                                )}
                            </span>
                            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Coming Soon - Tier 2 Preview */}
            <div className="mt-12">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Coming Soon - Tier 2 Features
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { name: 'AI Demand Forecasting', icon: '🎯' },
                        { name: 'AI Auto-Reorder', icon: '🔄' },
                        { name: 'AI Theft Detection', icon: '👁️' },
                        { name: 'AI Dynamic Pricing', icon: '💸' }
                    ].map((item) => (
                        <div
                            key={item.name}
                            className="bg-[#1a1a2e]/50 rounded-xl p-4 border border-gray-800/50 opacity-60"
                        >
                            <span className="text-2xl mb-2 block">{item.icon}</span>
                            <span className="text-sm text-gray-500">{item.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
