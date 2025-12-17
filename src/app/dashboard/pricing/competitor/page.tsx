'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, DollarSign, TrendingUp, TrendingDown, Minus, MapPin, Store, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CompetitorPrice {
    store: string
    storeType: 'LIQUOR' | 'GROCERY' | 'CONVENIENCE' | 'BIG_BOX'
    price: number
    distance: string
    lastUpdated: string
}

interface PricingData {
    found: boolean
    productName: string
    upc: string
    yourPrice: number
    suggestedPrice: number
    competitors: CompetitorPrice[]
    marketAverage: number
    pricePosition: 'LOW' | 'AVERAGE' | 'HIGH'
    region: string
    zip: string
}

const STORE_COLORS: Record<string, string> = {
    'LIQUOR': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'GROCERY': 'bg-green-500/20 text-green-400 border-green-500/30',
    'CONVENIENCE': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'BIG_BOX': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
}

const SAMPLE_PRODUCTS = [
    { upc: '088004000127', name: 'Jack Daniels 750ml' },
    { upc: '083664869411', name: 'Titos Vodka 750ml' },
    { upc: '087000001022', name: 'Crown Royal 750ml' },
    { upc: '012000000017', name: 'Budweiser 6-Pack' },
    { upc: '076183000014', name: 'Corona Extra 6-Pack' },
    { upc: '080480000177', name: 'Patron Silver 750ml' }
]

export default function CompetitorPricingPage() {
    const [upc, setUpc] = useState('')
    const [zip, setZip] = useState('60601')
    const [yourPrice, setYourPrice] = useState('')
    const [loading, setLoading] = useState(false)
    const [pricingData, setPricingData] = useState<PricingData | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchPricing = async (productUpc?: string) => {
        const searchUpc = productUpc || upc
        if (!searchUpc) return

        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({
                upc: searchUpc,
                zip,
                ...(yourPrice && { yourPrice })
            })
            const res = await fetch(`/api/pricing/competitor?${params}`)
            const data = await res.json()

            if (data.found) {
                setPricingData(data)
            } else {
                setError(data.message || 'Product not found')
                setPricingData(null)
            }
        } catch (e) {
            setError('Failed to fetch pricing data')
            console.error(e)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="p-2 hover:bg-stone-800 rounded-lg">
                    <ArrowLeft className="h-6 w-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Competitor Pricing</h1>
                    <p className="text-stone-400">See what nearby stores charge for the same products</p>
                </div>
            </div>

            {/* Search Form */}
            <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-400 mb-2">Product UPC</label>
                        <input
                            type="text"
                            value={upc}
                            onChange={(e) => setUpc(e.target.value)}
                            placeholder="Scan or enter UPC..."
                            className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-xl text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            <MapPin className="h-4 w-4 inline mr-1" />
                            ZIP Code
                        </label>
                        <input
                            type="text"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            placeholder="60601"
                            maxLength={5}
                            className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-xl text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-400 mb-2">Your Price</label>
                        <input
                            type="text"
                            value={yourPrice}
                            onChange={(e) => setYourPrice(e.target.value)}
                            placeholder="Optional"
                            className="w-full px-4 py-3 bg-stone-800 border border-stone-600 rounded-xl text-lg"
                        />
                    </div>
                </div>
                <button
                    onClick={() => fetchPricing()}
                    disabled={loading || !upc}
                    className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                    {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    Check Competitor Prices
                </button>

                {/* Quick Select */}
                <div className="mt-4 pt-4 border-t border-stone-700">
                    <p className="text-sm text-stone-500 mb-2">Quick lookup:</p>
                    <div className="flex flex-wrap gap-2">
                        {SAMPLE_PRODUCTS.map(p => (
                            <button
                                key={p.upc}
                                onClick={() => {
                                    setUpc(p.upc)
                                    fetchPricing(p.upc)
                                }}
                                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm"
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-400">
                    {error}
                </div>
            )}

            {/* Pricing Results */}
            {pricingData && (
                <div className="space-y-6">
                    {/* Product Header */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold">{pricingData.productName}</h2>
                                <p className="text-stone-400">UPC: {pricingData.upc}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-stone-500">Region: {pricingData.region}</p>
                                <p className="text-sm text-stone-500">ZIP: {pricingData.zip}</p>
                            </div>
                        </div>

                        {/* Price Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                                <p className="text-xs text-stone-500 mb-1">Your Price</p>
                                <p className="text-2xl font-bold">{formatCurrency(pricingData.yourPrice)}</p>
                            </div>
                            <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                                <p className="text-xs text-emerald-400 mb-1">AI Suggested</p>
                                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(pricingData.suggestedPrice)}</p>
                            </div>
                            <div className="bg-stone-800/50 rounded-xl p-4 text-center">
                                <p className="text-xs text-stone-500 mb-1">Market Average</p>
                                <p className="text-2xl font-bold">{formatCurrency(pricingData.marketAverage)}</p>
                            </div>
                            <div className={`rounded-xl p-4 text-center ${pricingData.pricePosition === 'LOW' ? 'bg-green-600/20 border border-green-500/30' :
                                    pricingData.pricePosition === 'HIGH' ? 'bg-red-600/20 border border-red-500/30' :
                                        'bg-amber-600/20 border border-amber-500/30'
                                }`}>
                                <p className="text-xs text-stone-400 mb-1">Your Position</p>
                                <div className="flex items-center justify-center gap-1">
                                    {pricingData.pricePosition === 'LOW' && <TrendingDown className="h-5 w-5 text-green-400" />}
                                    {pricingData.pricePosition === 'HIGH' && <TrendingUp className="h-5 w-5 text-red-400" />}
                                    {pricingData.pricePosition === 'AVERAGE' && <Minus className="h-5 w-5 text-amber-400" />}
                                    <span className={`text-xl font-bold ${pricingData.pricePosition === 'LOW' ? 'text-green-400' :
                                            pricingData.pricePosition === 'HIGH' ? 'text-red-400' : 'text-amber-400'
                                        }`}>
                                        {pricingData.pricePosition}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Competitor List */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Store className="h-5 w-5" />
                            Nearby Competitors
                        </h3>
                        <div className="space-y-3">
                            {pricingData.competitors.map((comp, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl hover:bg-stone-800 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl font-bold text-stone-500 w-8">#{i + 1}</div>
                                        <div>
                                            <div className="font-bold">{comp.store}</div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className={`px-2 py-0.5 rounded border ${STORE_COLORS[comp.storeType]}`}>
                                                    {comp.storeType.replace('_', ' ')}
                                                </span>
                                                <span className="text-stone-500">{comp.distance}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold">{formatCurrency(comp.price)}</div>
                                        <div className="text-xs text-stone-500">Updated {comp.lastUpdated}</div>
                                        {comp.price < pricingData.yourPrice && (
                                            <div className="text-xs text-red-400">
                                                {formatCurrency(pricingData.yourPrice - comp.price)} cheaper
                                            </div>
                                        )}
                                        {comp.price > pricingData.yourPrice && (
                                            <div className="text-xs text-green-400">
                                                {formatCurrency(comp.price - pricingData.yourPrice)} more expensive
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            🤖 AI Price Recommendation
                        </h3>
                        <p className="text-stone-300">
                            Based on competitors in ZIP <span className="font-mono text-indigo-400">{pricingData.zip}</span>,
                            we recommend pricing this product at <span className="font-bold text-emerald-400">{formatCurrency(pricingData.suggestedPrice)}</span>.
                            {pricingData.pricePosition === 'HIGH' && " Your current price is above market average - consider lowering to stay competitive."}
                            {pricingData.pricePosition === 'LOW' && " You're priced below competitors - you may have room to increase margins."}
                            {pricingData.pricePosition === 'AVERAGE' && " You're in line with the market - good positioning!"}
                        </p>
                    </div>
                </div>
            )}

            {!pricingData && !loading && !error && (
                <div className="text-center py-16 text-stone-400">
                    <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">Enter a UPC to see competitor pricing</p>
                    <p className="text-sm">See what Binny's, 7-Eleven, Walmart, and others charge</p>
                </div>
            )}
        </div>
    )
}
