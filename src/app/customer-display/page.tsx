'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ShoppingCart, Tag, Zap, Percent } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface CartItem {
    id: string
    name: string
    price: number
    quantity: number
}

interface CartData {
    items: CartItem[]
    subtotal: number
    subtotalCash?: number
    subtotalCard?: number
    tax: number
    taxCash?: number
    taxCard?: number
    total: number
    cashTotal?: number
    cardTotal?: number
    showDualPricing?: boolean
    status: 'IDLE' | 'ACTIVE' | 'PROCESSING' | 'COMPLETED'
    stationId?: string
}

interface StoreBranding {
    storeLogo: string | null
    storeDisplayName: string
    primaryColor: string
}

interface ActiveDeal {
    id: string
    name: string
    discountType: string
    discountValue: number
    productCount?: number
    products?: { name: string; originalPrice: number }[]
}

function CustomerDisplayContent() {
    const searchParams = useSearchParams()
    const stationId = searchParams.get('stationId')

    const [cart, setCart] = useState<CartData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [branding, setBranding] = useState<StoreBranding | null>(null)

    // Deals state
    const [deals, setDeals] = useState<ActiveDeal[]>([])
    const [currentDealIndex, setCurrentDealIndex] = useState(0)

    // Poll server for cart updates
    useEffect(() => {
        if (!stationId) {
            setLoading(false)
            setError('No station ID provided. Open this from the POS "Customer Display" button.')
            return
        }

        const pollServer = async () => {
            try {
                const res = await fetch(`/api/pos/display-sync?stationId=${stationId}`)
                if (res.ok) {
                    const data = await res.json()
                    setCart(data)
                }
            } catch (err) {
                console.error('Error polling server:', err)
            } finally {
                setLoading(false)
            }
        }

        // Poll immediately then every 500ms
        pollServer()
        const interval = setInterval(pollServer, 500)
        return () => clearInterval(interval)
    }, [stationId])

    // Fetch store branding (once on mount)
    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await fetch('/api/settings/branding')
                if (res.ok) {
                    const data = await res.json()
                    setBranding({
                        storeLogo: data.storeLogo,
                        storeDisplayName: data.storeDisplayName,
                        primaryColor: data.primaryColor
                    })
                }
            } catch (e) {
                console.error('Error fetching branding:', e)
            }
        }
        fetchBranding()
    }, [])

    // Fetch active deals
    useEffect(() => {
        const fetchDeals = async () => {
            try {
                const res = await fetch('/api/promotions/active')
                if (res.ok) {
                    const data = await res.json()
                    setDeals(data.promotions || [])
                }
            } catch (e) {
                console.error('Error fetching deals:', e)
            }
        }
        fetchDeals()
        // Refresh deals every 30 seconds
        const interval = setInterval(fetchDeals, 30000)
        return () => clearInterval(interval)
    }, [])

    // Rotate deals every 5 seconds
    useEffect(() => {
        if (deals.length <= 1) return
        const interval = setInterval(() => {
            setCurrentDealIndex(prev => (prev + 1) % deals.length)
        }, 5000)
        return () => clearInterval(interval)
    }, [deals.length])

    // Also listen to localStorage for same-browser fallback
    useEffect(() => {
        const checkLocalStorage = () => {
            try {
                const cartData = localStorage.getItem('retail_customer_display')
                if (cartData) {
                    const parsed = JSON.parse(cartData)
                    if (!stationId || parsed.stationId === stationId) {
                        setCart(parsed)
                    }
                }
            } catch (e) {
                console.error('Error reading localStorage:', e)
            }
        }

        window.addEventListener('storage', checkLocalStorage)
        return () => window.removeEventListener('storage', checkLocalStorage)
    }, [stationId])

    // Deals Sidebar Component - Hidden on small screens, visible on lg+
    const DealsSidebar = () => {
        if (deals.length === 0) return null

        const currentDeal = deals[currentDealIndex]

        return (
            <div className="hidden lg:flex w-[20vw] min-w-[200px] max-w-[320px] bg-gradient-to-b from-amber-900/30 to-[#0A1628] border-l border-amber-500/30 flex-col">
                {/* Deals Header */}
                <div className="p-[clamp(0.5rem,2vw,1rem)] bg-gradient-to-r from-amber-600 to-amber-500 flex items-center gap-2">
                    <Zap className="w-[clamp(1rem,3vw,1.25rem)] h-[clamp(1rem,3vw,1.25rem)] text-black" />
                    <h2 className="font-bold text-black text-[clamp(0.875rem,2.5vw,1.125rem)]">Today's Deals</h2>
                </div>

                {/* Current Deal */}
                <div className="flex-1 p-[clamp(0.5rem,2vw,1rem)] flex flex-col">
                    {/* Deal Card */}
                    <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/40 rounded-2xl p-[clamp(0.75rem,2vw,1.25rem)] flex-1 flex flex-col justify-center animate-fade-in">
                        <div className="text-center">
                            {/* Discount Badge */}
                            <div className="inline-flex items-center gap-2 bg-emerald-500 text-white px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.25rem,1vw,0.5rem)] rounded-full text-[clamp(1rem,3vw,1.5rem)] font-bold mb-[clamp(0.5rem,2vw,1rem)]">
                                <Percent className="w-[clamp(1rem,3vw,1.5rem)] h-[clamp(1rem,3vw,1.5rem)]" />
                                {currentDeal.discountValue}% OFF
                            </div>

                            {/* Deal Name */}
                            <h3 className="text-[clamp(0.875rem,2.5vw,1.25rem)] font-bold text-white mb-2 leading-tight">
                                {currentDeal.name}
                            </h3>

                            {/* Product Count or Sample Products */}
                            {currentDeal.productCount && (
                                <p className="text-emerald-300 text-[clamp(0.625rem,1.5vw,0.875rem)] mb-[clamp(0.5rem,2vw,1rem)]">
                                    {currentDeal.productCount} items on sale!
                                </p>
                            )}

                            {/* Sample Products */}
                            {currentDeal.products && currentDeal.products.slice(0, 3).map((product, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-[#0A1628]/80 rounded-lg px-[clamp(0.5rem,1.5vw,0.75rem)] py-[clamp(0.25rem,1vw,0.5rem)] mb-2">
                                    <span className="text-white text-[clamp(0.625rem,1.5vw,0.875rem)] truncate">{product.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 line-through text-[clamp(0.5rem,1.25vw,0.75rem)]">
                                            {formatCurrency(product.originalPrice)}
                                        </span>
                                        <span className="text-emerald-400 font-semibold text-[clamp(0.625rem,1.5vw,0.875rem)]">
                                            {formatCurrency(product.originalPrice * (1 - currentDeal.discountValue / 100))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Deal Indicator Dots */}
                    {deals.length > 1 && (
                        <div className="flex justify-center gap-2 mt-[clamp(0.5rem,2vw,1rem)]">
                            {deals.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentDealIndex
                                        ? 'bg-amber-400 w-6'
                                        : 'bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* App Promo */}
                <div className="p-[clamp(0.5rem,2vw,1rem)] bg-[#0A1628] border-t border-amber-500/20">
                    <div className="text-center">
                        <p className="text-amber-300 text-[clamp(0.5rem,1.25vw,0.75rem)] font-medium">
                            📱 Download Oro Buddy App
                        </p>
                        <p className="text-gray-500 text-[clamp(0.5rem,1.25vw,0.75rem)]">
                            Get exclusive deals on your phone!
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1628] gap-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,4vw,2rem)]">
                <div className="text-[clamp(2rem,8vw,4rem)]">📟</div>
                <h2 className="text-[clamp(1rem,4vw,1.5rem)] font-bold text-white text-center">Display Not Connected</h2>
                <p className="text-gray-400 text-center max-w-md text-[clamp(0.75rem,2.5vw,1rem)]">{error}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1628] gap-[clamp(0.75rem,2vw,1rem)]">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-amber-500/30 rounded-full" />
                    <div className="absolute inset-0 w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-gray-500 text-[clamp(0.75rem,2vw,1rem)]">Connecting to POS...</p>
            </div>
        )
    }

    // Idle state - waiting for items (show deals prominently)
    if (!cart || !cart.items || cart.items.length === 0 || cart.status === 'IDLE') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#0A1628] flex">
                {/* Main Welcome Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-[clamp(1rem,4vw,2rem)]">
                    <div className="text-center">
                        {branding?.storeLogo ? (
                            <img
                                src={branding.storeLogo}
                                alt={branding.storeDisplayName || 'Store Logo'}
                                className="w-[clamp(6rem,20vw,12rem)] h-[clamp(6rem,20vw,12rem)] mx-auto mb-[clamp(1rem,4vw,2rem)] object-contain"
                            />
                        ) : (
                            <div
                                className="w-[clamp(5rem,15vw,10rem)] h-[clamp(5rem,15vw,10rem)] mx-auto mb-[clamp(1rem,4vw,2rem)] rounded-full flex items-center justify-center bg-amber-500/10"
                            >
                                <ShoppingCart className="h-[clamp(2.5rem,8vw,5rem)] w-[clamp(2.5rem,8vw,5rem)] text-amber-500 opacity-70" />
                            </div>
                        )}

                        <h1 className="text-[clamp(1.5rem,6vw,3rem)] font-bold text-white mb-[clamp(0.5rem,2vw,1rem)]">
                            {branding?.storeDisplayName || 'Welcome!'}
                        </h1>
                        <p className="text-[clamp(0.875rem,3vw,1.5rem)] text-gray-400">Your items will appear here</p>
                    </div>

                    <div className="absolute bottom-[clamp(1rem,3vw,2rem)] text-gray-600 text-[clamp(0.625rem,1.5vw,0.875rem)]">
                        Powered by <span className="text-amber-500">ORO 9</span>
                    </div>
                </div>

                {/* Deals Sidebar - Always visible on lg+ */}
                <DealsSidebar />
            </div>
        )
    }

    // Processing state
    if (cart.status === 'PROCESSING') {
        return (
            <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center p-[clamp(1rem,4vw,2rem)]">
                <div className="relative mb-[clamp(1rem,3vw,1.5rem)]">
                    <div className="w-20 h-20 border-4 border-amber-500/30 rounded-full" />
                    <div className="absolute inset-0 w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-[clamp(1.25rem,5vw,2rem)] font-bold text-white mb-2 text-center">Processing Payment...</h2>
                <p className="text-gray-400 text-[clamp(0.875rem,3vw,1.25rem)]">Please wait</p>
            </div>
        )
    }

    // Thank you state
    if (cart.status === 'COMPLETED') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-900/50 to-[#0A1628] flex flex-col items-center justify-center p-[clamp(1rem,4vw,2rem)]">
                <div className="text-center">
                    <div className="w-[clamp(5rem,15vw,10rem)] h-[clamp(5rem,15vw,10rem)] mx-auto mb-[clamp(1rem,4vw,2rem)] rounded-full bg-emerald-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                        <span className="text-[clamp(2rem,8vw,4rem)] text-emerald-400">✓</span>
                    </div>
                    <h1 className="text-[clamp(1.5rem,6vw,3rem)] font-bold text-white mb-[clamp(0.5rem,2vw,1rem)]">Thank You!</h1>
                    <p className="text-[clamp(1rem,4vw,1.5rem)] text-gray-300 mb-2">
                        Your total was <span className="text-amber-400 font-bold">{formatCurrency(cart.total)}</span>
                    </p>
                    <p className="text-[clamp(0.875rem,3vw,1.25rem)] text-gray-400">Have a great day!</p>
                </div>
            </div>
        )
    }

    // Active cart display - CART IN CENTER, DEALS ON SIDEBAR
    const MAX_VISIBLE_ITEMS = 6

    return (
        <div className="h-screen bg-gradient-to-br from-[#0F172A] to-[#0A1628] flex overflow-hidden">
            {/* Main Cart Area - Center */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="text-center py-[clamp(0.5rem,2vw,1rem)] flex-shrink-0 border-b border-amber-500/20">
                    <h1 className="text-[clamp(1rem,4vw,1.75rem)] font-bold text-white">Your Order</h1>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-hidden px-[clamp(0.5rem,2vw,1rem)]">
                    <div className="max-w-2xl mx-auto h-full flex flex-col">
                        {/* Summary of older items */}
                        {cart.items.length > MAX_VISIBLE_ITEMS && (() => {
                            const olderItems = cart.items.slice(0, -MAX_VISIBLE_ITEMS)
                            const olderTotal = olderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                            const olderCount = olderItems.reduce((sum, item) => sum + item.quantity, 0)
                            return (
                                <div className="flex items-center justify-between bg-amber-500/10 rounded px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.25rem,1vw,0.5rem)] mb-[clamp(0.25rem,1vw,0.5rem)] text-amber-300/70 border border-amber-500/20">
                                    <span className="text-[clamp(0.625rem,1.75vw,0.875rem)]">
                                        + {olderCount} more item{olderCount !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-[clamp(0.625rem,1.75vw,0.875rem)] font-medium">
                                        {formatCurrency(olderTotal)}
                                    </span>
                                </div>
                            )
                        })()}

                        {/* Last items */}
                        <div className="flex-1 flex flex-col justify-end space-y-[clamp(0.25rem,1vw,0.5rem)]">
                            {cart.items.slice(-MAX_VISIBLE_ITEMS).map((item, idx) => {
                                const isLatest = idx === Math.min(cart.items.length, MAX_VISIBLE_ITEMS) - 1
                                return (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between rounded-xl px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.375rem,1.5vw,0.75rem)] transition-all ${isLatest
                                            ? 'bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/50 shadow-lg shadow-amber-500/10'
                                            : 'bg-white/5 border border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] min-w-0 flex-1">
                                            <span className={`text-[clamp(0.875rem,3vw,1.25rem)] font-bold flex-shrink-0 ${isLatest ? 'text-amber-400' : 'text-amber-500'}`}>
                                                {item.quantity}x
                                            </span>
                                            <span className={`text-[clamp(0.75rem,2.5vw,1rem)] ${isLatest ? 'text-white font-medium' : 'text-gray-200'} truncate`}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className={`text-[clamp(0.75rem,2.5vw,1rem)] font-bold flex-shrink-0 ml-2 ${isLatest ? 'text-amber-300' : 'text-amber-400'}`}>
                                            {formatCurrency(item.price * item.quantity)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Totals - FIXED AT BOTTOM */}
                <div className="flex-shrink-0 bg-[#0A1628] border-t border-amber-500/20 px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.5rem,2vw,1rem)]">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl p-[clamp(0.5rem,2vw,1rem)] border border-white/10">
                            {/* Column headers for dual pricing */}
                            {cart.showDualPricing && (
                                <div className="flex justify-between text-[clamp(0.5rem,1.5vw,0.75rem)] text-gray-500 font-bold uppercase border-b border-white/10 pb-[clamp(0.25rem,1vw,0.5rem)] mb-[clamp(0.25rem,1vw,0.5rem)]">
                                    <span></span>
                                    <div className="flex gap-[clamp(1rem,4vw,2rem)]">
                                        <span className="text-emerald-500">CASH</span>
                                        <span className="text-blue-400">CARD</span>
                                    </div>
                                </div>
                            )}
                            {/* Subtotal row */}
                            <div className="flex justify-between text-[clamp(0.75rem,2vw,1rem)] text-gray-400">
                                <span>Subtotal</span>
                                {cart.showDualPricing ? (
                                    <div className="flex gap-[clamp(0.75rem,3vw,1.5rem)]">
                                        <span className="text-emerald-400">{formatCurrency(cart.subtotalCash || cart.subtotal)}</span>
                                        <span className="text-blue-400">{formatCurrency(cart.subtotalCard || cart.subtotal)}</span>
                                    </div>
                                ) : (
                                    <span>{formatCurrency(cart.subtotal)}</span>
                                )}
                            </div>
                            {/* Tax row */}
                            <div className="flex justify-between text-[clamp(0.75rem,2vw,1rem)] text-gray-400 mt-[clamp(0.125rem,0.5vw,0.25rem)]">
                                <span>Tax</span>
                                {cart.showDualPricing ? (
                                    <div className="flex gap-[clamp(0.75rem,3vw,1.5rem)]">
                                        <span className="text-emerald-400">{formatCurrency(cart.taxCash || cart.tax)}</span>
                                        <span className="text-blue-400">{formatCurrency(cart.taxCard || cart.tax)}</span>
                                    </div>
                                ) : (
                                    <span>{formatCurrency(cart.tax)}</span>
                                )}
                            </div>
                            <div className="border-t border-white/10 mt-[clamp(0.5rem,2vw,1rem)] pt-[clamp(0.5rem,2vw,1rem)]">
                                {cart.showDualPricing ? (
                                    <div className="flex flex-col sm:flex-row gap-[clamp(0.5rem,2vw,1rem)]">
                                        <div className="flex-1 flex justify-between text-[clamp(0.875rem,3vw,1.25rem)] font-bold">
                                            <span className="text-blue-400">💳 Card</span>
                                            <span className="text-blue-400">{formatCurrency(cart.cardTotal || cart.total)}</span>
                                        </div>
                                        <div className="flex-1 flex justify-between text-[clamp(0.875rem,3vw,1.25rem)] font-bold">
                                            <span className="text-emerald-400">💵 Cash</span>
                                            <span className="text-emerald-400">{formatCurrency(cart.cashTotal || cart.total)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between text-[clamp(1rem,4vw,1.5rem)] font-bold text-white">
                                        <span>TOTAL</span>
                                        <span className="text-amber-400">{formatCurrency(cart.total)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deals Sidebar - Right Side (hidden on small screens) */}
            <DealsSidebar />
        </div>
    )
}

export default function RetailCustomerDisplayPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-amber-500/30 rounded-full" />
                    <div className="absolute inset-0 w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        }>
            <CustomerDisplayContent />
        </Suspense>
    )
}
