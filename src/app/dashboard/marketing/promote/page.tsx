'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    ArrowLeft,
    Megaphone,
    Search,
    Users,
    Crown,
    Tag,
    Send,
    Loader2,
    CheckCircle,
    Package,
    AlertTriangle,
    CreditCard,
    X
} from 'lucide-react'

interface Product {
    id: string
    name: string
    price: number
    sku?: string
    category?: { name: string }
}

interface AudienceCounts {
    all: number
    vip: number
    category: number
    hasCategory?: boolean
    creditsRemaining?: number
}

export default function ProductPromotionPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [audience, setAudience] = useState<'all' | 'vip' | 'category'>('category')
    const [audienceCounts, setAudienceCounts] = useState<AudienceCounts>({ all: 0, vip: 0, category: 0 })
    const [customMessage, setCustomMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false) // Prevents double-send
    const [result, setResult] = useState<{ success: boolean; sentCount: number; wasLimited?: boolean; originalCount?: number } | null>(null)
    const [showConfirmModal, setShowConfirmModal] = useState(false)

    // Fetch products
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true)
            try {
                const res = await fetch('/api/products?limit=100')
                if (res.ok) {
                    const data = await res.json()
                    setProducts(data.products || data || [])
                }
            } catch (e) {
                console.error('Error fetching products:', e)
            } finally {
                setLoading(false)
            }
        }
        fetchProducts()
    }, [])

    // Fetch audience counts when product selected
    useEffect(() => {
        if (selectedProduct) {
            const fetchCounts = async () => {
                try {
                    const res = await fetch(`/api/marketing/promote?productId=${selectedProduct.id}`)
                    if (res.ok) {
                        const data = await res.json()
                        setAudienceCounts(data)
                    }
                } catch (e) {
                    console.error('Error fetching counts:', e)
                }
            }
            fetchCounts()
        }
    }, [selectedProduct])

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getDefaultMessage = () => {
        if (!selectedProduct) return ''
        return `🆕 ${selectedProduct.name} just arrived!\n\nCome check it out at our store! 🏪`
    }

    const getMessage = () => customMessage || getDefaultMessage()
    const messageLength = getMessage().length
    const isLongMessage = messageLength > 140 // Warning at 140, SMS splits at 160

    const handleSend = async () => {
        if (!selectedProduct || sent) return

        setSending(true)
        setResult(null)

        try {
            const res = await fetch('/api/marketing/promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    productName: selectedProduct.name,
                    audience,
                    customMessage: getMessage()
                })
            })

            const data = await res.json()
            setResult({
                success: data.success,
                sentCount: data.sentCount || 0,
                wasLimited: data.wasLimited,
                originalCount: data.originalCount
            })

            if (data.success) {
                setSent(true) // Prevent double-send
            }
        } catch (e) {
            setResult({ success: false, sentCount: 0 })
        } finally {
            setSending(false)
            setShowConfirmModal(false)
        }
    }

    const getAudienceCount = () => {
        switch (audience) {
            case 'all': return audienceCounts.all
            case 'vip': return audienceCounts.vip
            case 'category': return audienceCounts.category
        }
    }

    const creditsAvailable = audienceCounts.creditsRemaining ?? 0
    const countToSend = Math.min(getAudienceCount(), 50, creditsAvailable) // Limited to 50 per batch

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard"
                    className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                            <Megaphone className="w-6 h-6 text-white" />
                        </div>
                        Promote a Product
                    </h1>
                    <p className="text-gray-400 mt-1">Notify customers about a specific product</p>
                </div>

                {/* SMS Credits Display */}
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <div className="text-right">
                        <p className="text-xs text-gray-400">SMS Credits</p>
                        <p className={`font-bold ${creditsAvailable > 10 ? 'text-green-400' : creditsAvailable > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {creditsAvailable}
                        </p>
                    </div>
                </div>
            </div>

            {/* Low credits warning */}
            {creditsAvailable === 0 && (
                <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <p className="text-red-300">No SMS credits remaining. Purchase a package to send promotions.</p>
                </div>
            )}

            {/* Step 1: Select Product */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center">1</span>
                    Select Product
                </h2>

                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-auto">
                    {loading ? (
                        <div className="col-span-2 flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="col-span-2 text-center py-8 text-gray-400">
                            No products found
                        </div>
                    ) : (
                        filteredProducts.slice(0, 20).map(product => (
                            <button
                                key={product.id}
                                onClick={() => {
                                    setSelectedProduct(product)
                                    setSent(false) // Reset sent state when new product selected
                                    setResult(null)
                                }}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${selectedProduct?.id === product.id
                                    ? 'border-purple-500 bg-purple-500/20'
                                    : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                                    <Package className="w-5 h-5 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{product.name}</p>
                                    <p className="text-sm text-gray-400">${Number(product.price).toFixed(2)}</p>
                                </div>
                                {selectedProduct?.id === product.id && (
                                    <CheckCircle className="w-5 h-5 text-purple-400" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Step 2: Select Audience */}
            {selectedProduct && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center">2</span>
                        Who to Notify?
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Category Buyers */}
                        <button
                            onClick={() => setAudience('category')}
                            disabled={!audienceCounts.hasCategory}
                            className={`p-4 rounded-xl border text-left transition-all ${!audienceCounts.hasCategory
                                    ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
                                    : audience === 'category'
                                        ? 'border-green-500 bg-green-500/20'
                                        : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                                }`}
                        >
                            <Tag className={`w-8 h-8 mb-2 ${audience === 'category' && audienceCounts.hasCategory ? 'text-green-400' : 'text-gray-400'}`} />
                            <p className="font-semibold text-white">Category Buyers</p>
                            <p className="text-sm text-gray-400">
                                {audienceCounts.hasCategory ? 'Bought similar before' : 'Product has no category'}
                            </p>
                            <p className="text-lg font-bold text-green-400 mt-2">{audienceCounts.category} customers</p>
                        </button>

                        {/* VIP */}
                        <button
                            onClick={() => setAudience('vip')}
                            className={`p-4 rounded-xl border text-left transition-all ${audience === 'vip'
                                ? 'border-amber-500 bg-amber-500/20'
                                : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                                }`}
                        >
                            <Crown className={`w-8 h-8 mb-2 ${audience === 'vip' ? 'text-amber-400' : 'text-gray-400'}`} />
                            <p className="font-semibold text-white">VIP Customers</p>
                            <p className="text-sm text-gray-400">Top 20% by spending</p>
                            <p className="text-lg font-bold text-amber-400 mt-2">{audienceCounts.vip} customers</p>
                        </button>

                        {/* All */}
                        <button
                            onClick={() => setAudience('all')}
                            className={`p-4 rounded-xl border text-left transition-all ${audience === 'all'
                                ? 'border-blue-500 bg-blue-500/20'
                                : 'border-gray-700 bg-gray-800 hover:bg-gray-700'
                                }`}
                        >
                            <Users className={`w-8 h-8 mb-2 ${audience === 'all' ? 'text-blue-400' : 'text-gray-400'}`} />
                            <p className="font-semibold text-white">All Customers</p>
                            <p className="text-sm text-gray-400">Everyone with a phone</p>
                            <p className="text-lg font-bold text-blue-400 mt-2">{audienceCounts.all} customers</p>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Message & Send */}
            {selectedProduct && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center">3</span>
                        Message Preview
                    </h2>

                    <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                        <textarea
                            value={customMessage || getDefaultMessage()}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            rows={4}
                            className="w-full bg-transparent text-white focus:outline-none resize-none"
                            placeholder="Enter custom message..."
                        />
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-500">
                                + "Reply STOP to unsubscribe" will be added
                            </p>
                            <p className={`text-xs ${isLongMessage ? 'text-amber-400' : 'text-gray-500'}`}>
                                {messageLength}/160 chars {isLongMessage && '⚠️ May use 2 credits'}
                            </p>
                        </div>
                    </div>

                    {/* Result */}
                    {result && (
                        <div className={`mb-4 p-4 rounded-lg ${result.success ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                            {result.success ? (
                                <div>
                                    <p className="text-green-400 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5" />
                                        Successfully sent to {result.sentCount} customers!
                                    </p>
                                    {result.wasLimited && (
                                        <p className="text-amber-400 text-sm mt-1">
                                            ⚠️ Limited to 50 per batch. {result.originalCount! - 50} customers not reached.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-red-400">
                                    Failed to send. Check SMS credits or try again later.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Send Button */}
                    <button
                        onClick={() => setShowConfirmModal(true)}
                        disabled={sending || sent || countToSend === 0 || creditsAvailable === 0}
                        className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-purple-400 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Sending...
                            </>
                        ) : sent ? (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Sent!
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Send to {countToSend} Customers
                            </>
                        )}
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-3">
                        Uses {countToSend} SMS credit{countToSend !== 1 ? 's' : ''} • Max 50 per batch • 3 promotions/hour
                    </p>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-amber-400" />
                                Confirm Send
                            </h3>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="p-1 hover:bg-gray-800 rounded"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-gray-300">You are about to send a promotional SMS to:</p>
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <p className="text-2xl font-bold text-white">{countToSend} customers</p>
                                <p className="text-sm text-gray-400">Using {countToSend} SMS credits</p>
                            </div>
                            <p className="text-sm text-gray-400">
                                Product: <span className="text-white">{selectedProduct?.name}</span>
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-400 hover:to-pink-500 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Yes, Send Now
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
