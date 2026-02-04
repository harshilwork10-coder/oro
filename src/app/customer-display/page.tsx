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
            <div className="hidden lg:flex w-[20vw] min-w-[200px] max-w-[320px] bg-gradient-to-b from-purple-900/50 to-stone-900 border-l border-purple-500/30 flex-col">
                {/* Deals Header */}
                <div className="p-[clamp(0.5rem,2vw,1rem)] bg-gradient-to-r from-purple-600 to-pink-600 flex items-center gap-2">
                    <Zap className="w-[clamp(1rem,3vw,1.25rem)] h-[clamp(1rem,3vw,1.25rem)] text-white" />
                    <h2 className="font-bold text-white text-[clamp(0.875rem,2.5vw,1.125rem)]">Today's Deals</h2>
                </div>

                {/* Current Deal */}
                <div className="flex-1 p-[clamp(0.5rem,2vw,1rem)] flex flex-col">
                    {/* Deal Card */}
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/40 rounded-2xl p-[clamp(0.75rem,2vw,1.25rem)] flex-1 flex flex-col justify-center animate-fade-in">
                        <div className="text-center">
                            {/* Discount Badge */}
                            <div className="inline-flex items-center gap-2 bg-green-500 text-white px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.25rem,1vw,0.5rem)] rounded-full text-[clamp(1rem,3vw,1.5rem)] font-bold mb-[clamp(0.5rem,2vw,1rem)]">
                                <Percent className="w-[clamp(1rem,3vw,1.5rem)] h-[clamp(1rem,3vw,1.5rem)]" />
                                {currentDeal.discountValue}% OFF
                            </div>

                            {/* Deal Name */}
                            <h3 className="text-[clamp(0.875rem,2.5vw,1.25rem)] font-bold text-white mb-2 leading-tight">
                                {currentDeal.name}
                            </h3>

                            {/* Product Count or Sample Products */}
                            {currentDeal.productCount && (
                                <p className="text-green-300 text-[clamp(0.625rem,1.5vw,0.875rem)] mb-[clamp(0.5rem,2vw,1rem)]">
                                    {currentDeal.productCount} items on sale!
                                </p>
                            )}

                            {/* Sample Products */}
                            {currentDeal.products && currentDeal.products.slice(0, 3).map((product, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-stone-800/50 rounded-lg px-[clamp(0.5rem,1.5vw,0.75rem)] py-[clamp(0.25rem,1vw,0.5rem)] mb-2">
                                    <span className="text-white text-[clamp(0.625rem,1.5vw,0.875rem)] truncate">{product.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 line-through text-[clamp(0.5rem,1.25vw,0.75rem)]">
                                            {formatCurrency(product.originalPrice)}
                                        </span>
                                        <span className="text-green-400 font-semibold text-[clamp(0.625rem,1.5vw,0.875rem)]">
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
                                        ? 'bg-green-400 w-6'
                                        : 'bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* App Promo */}
                <div className="p-[clamp(0.5rem,2vw,1rem)] bg-stone-900/80 border-t border-stone-700">
                    <div className="text-center">
                        <p className="text-purple-300 text-[clamp(0.5rem,1.25vw,0.75rem)] font-medium">
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
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 gap-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,4vw,2rem)]">
                <div className="text-[clamp(2rem,8vw,4rem)]">📟</div>
                <h2 className="text-[clamp(1rem,4vw,1.5rem)] font-bold text-stone-100 text-center">Display Not Connected</h2>
                <p className="text-stone-400 text-center max-w-md text-[clamp(0.75rem,2.5vw,1rem)]">{error}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 gap-[clamp(0.75rem,2vw,1rem)]">
                <Loader2 className="h-[clamp(1.5rem,5vw,2.5rem)] w-[clamp(1.5rem,5vw,2.5rem)] animate-spin text-orange-600" />
                <p className="text-stone-500 text-[clamp(0.75rem,2vw,1rem)]">Connecting to POS...</p>
            </div>
        )
    }

    // Idle state - waiting for items (show deals prominently)
    if (!cart || !cart.items || cart.items.length === 0 || cart.status === 'IDLE') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-950 flex">
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
                                className="w-[clamp(5rem,15vw,10rem)] h-[clamp(5rem,15vw,10rem)] mx-auto mb-[clamp(1rem,4vw,2rem)] rounded-full flex items-center justify-center"
                                style={{ backgroundColor: branding?.primaryColor ? `${branding.primaryColor}20` : '#1c1917' }}
                            >
                                <ShoppingCart
                                    className="h-[clamp(2.5rem,8vw,5rem)] w-[clamp(2.5rem,8vw,5rem)]"
                                    style={{ color: branding?.primaryColor || '#f97316', opacity: 0.7 }}
                                />
                            </div>
                        )}

                        <h1 className="text-[clamp(1.5rem,6vw,3rem)] font-bold text-white mb-[clamp(0.5rem,2vw,1rem)]">
                            {branding?.storeDisplayName || 'Welcome!'}
                        </h1>
                        <p className="text-[clamp(0.875rem,3vw,1.5rem)] text-stone-400">Your items will appear here</p>
                    </div>

                    <div className="absolute bottom-[clamp(1rem,3vw,2rem)] text-stone-600 text-[clamp(0.625rem,1.5vw,0.875rem)]">
                        Powered by Oro 9
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
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-[clamp(1rem,4vw,2rem)]">
                <div className="animate-spin h-[clamp(3rem,10vw,5rem)] w-[clamp(3rem,10vw,5rem)] border-4 border-orange-500 border-t-transparent rounded-full mb-[clamp(1rem,3vw,1.5rem)]"></div>
                <h2 className="text-[clamp(1.25rem,5vw,2rem)] font-bold text-white mb-2 text-center">Processing Payment...</h2>
                <p className="text-stone-400 text-[clamp(0.875rem,3vw,1.25rem)]">Please wait</p>
            </div>
        )
    }

    // Thank you state
    if (cart.status === 'COMPLETED') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 to-stone-950 flex flex-col items-center justify-center p-[clamp(1rem,4vw,2rem)]">
                <div className="text-center">
                    <div className="w-[clamp(5rem,15vw,10rem)] h-[clamp(5rem,15vw,10rem)] mx-auto mb-[clamp(1rem,4vw,2rem)] rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-[clamp(2rem,8vw,4rem)]">✓</span>
                    </div>
                    <h1 className="text-[clamp(1.5rem,6vw,3rem)] font-bold text-white mb-[clamp(0.5rem,2vw,1rem)]">Thank You!</h1>
                    <p className="text-[clamp(1rem,4vw,1.5rem)] text-stone-300 mb-2">
                        Your total was {formatCurrency(cart.total)}
                    </p>
                    <p className="text-[clamp(0.875rem,3vw,1.25rem)] text-stone-400">Have a great day!</p>
                </div>
            </div>
        )
    }

    // Active cart display - CART IN CENTER, DEALS ON SIDEBAR
    // Dynamically calculate visible items based on screen height
    const MAX_VISIBLE_ITEMS = 6

    return (
        <div className="h-screen bg-gradient-to-br from-stone-900 to-stone-950 flex overflow-hidden">
            {/* Main Cart Area - Center */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="text-center py-[clamp(0.5rem,2vw,1rem)] flex-shrink-0">
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
                                <div className="flex items-center justify-between bg-stone-800/30 rounded px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.25rem,1vw,0.5rem)] mb-[clamp(0.25rem,1vw,0.5rem)] text-stone-400">
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
                                        className={`flex items-center justify-between rounded-lg px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.375rem,1.5vw,0.75rem)] transition-all ${isLatest
                                            ? 'bg-orange-500/20 border border-orange-500/50'
                                            : 'bg-stone-800/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] min-w-0 flex-1">
                                            <span className={`text-[clamp(0.875rem,3vw,1.25rem)] font-bold flex-shrink-0 ${isLatest ? 'text-orange-400' : 'text-orange-500'}`}>
                                                {item.quantity}x
                                            </span>
                                            <span className={`text-[clamp(0.75rem,2.5vw,1rem)] ${isLatest ? 'text-white font-medium' : 'text-white'} truncate`}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className={`text-[clamp(0.75rem,2.5vw,1rem)] font-bold flex-shrink-0 ml-2 ${isLatest ? 'text-orange-300' : 'text-orange-400'}`}>
                                            {formatCurrency(item.price * item.quantity)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Totals - FIXED AT BOTTOM */}
                <div className="flex-shrink-0 bg-stone-950 border-t border-stone-800 px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.5rem,2vw,1rem)]">
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-stone-800 rounded-xl p-[clamp(0.5rem,2vw,1rem)]">
                            {/* Column headers for dual pricing */}
                            {cart.showDualPricing && (
                                <div className="flex justify-between text-[clamp(0.5rem,1.5vw,0.75rem)] text-stone-500 font-bold uppercase border-b border-stone-700 pb-[clamp(0.25rem,1vw,0.5rem)] mb-[clamp(0.25rem,1vw,0.5rem)]">
                                    <span></span>
                                    <div className="flex gap-[clamp(1rem,4vw,2rem)]">
                                        <span className="text-green-500">CASH</span>
                                        <span className="text-blue-400">CARD</span>
                                    </div>
                                </div>
                            )}
                            {/* Subtotal row */}
                            <div className="flex justify-between text-[clamp(0.75rem,2vw,1rem)] text-stone-400">
                                <span>Subtotal</span>
                                {cart.showDualPricing ? (
                                    <div className="flex gap-[clamp(0.75rem,3vw,1.5rem)]">
                                        <span className="text-green-400">{formatCurrency(cart.subtotalCash || cart.subtotal)}</span>
                                        <span className="text-blue-400">{formatCurrency(cart.subtotalCard || cart.subtotal)}</span>
                                    </div>
                                ) : (
                                    <span>{formatCurrency(cart.subtotal)}</span>
                                )}
                            </div>
                            {/* Tax row */}
                            <div className="flex justify-between text-[clamp(0.75rem,2vw,1rem)] text-stone-400 mt-[clamp(0.125rem,0.5vw,0.25rem)]">
                                <span>Tax</span>
                                {cart.showDualPricing ? (
                                    <div className="flex gap-[clamp(0.75rem,3vw,1.5rem)]">
                                        <span className="text-green-400">{formatCurrency(cart.taxCash || cart.tax)}</span>
                                        <span className="text-blue-400">{formatCurrency(cart.taxCard || cart.tax)}</span>
                                    </div>
                                ) : (
                                    <span>{formatCurrency(cart.tax)}</span>
                                )}
                            </div>
                            <div className="border-t border-stone-700 mt-[clamp(0.5rem,2vw,1rem)] pt-[clamp(0.5rem,2vw,1rem)]">
                                {cart.showDualPricing ? (
                                    <div className="flex flex-col sm:flex-row gap-[clamp(0.5rem,2vw,1rem)]">
                                        <div className="flex-1 flex justify-between text-[clamp(0.875rem,3vw,1.25rem)] font-bold">
                                            <span className="text-blue-400">💳 Card</span>
                                            <span className="text-blue-400">{formatCurrency(cart.cardTotal || cart.total)}</span>
                                        </div>
                                        <div className="flex-1 flex justify-between text-[clamp(0.875rem,3vw,1.25rem)] font-bold">
                                            <span className="text-green-400">💵 Cash</span>
                                            <span className="text-green-400">{formatCurrency(cart.cashTotal || cart.total)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between text-[clamp(1rem,4vw,1.5rem)] font-bold text-white">
                                        <span>TOTAL</span>
                                        <span className="text-orange-500">{formatCurrency(cart.total)}</span>
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
            <div className="min-h-screen flex items-center justify-center bg-stone-950">
                <Loader2 className="h-[clamp(1.5rem,5vw,2.5rem)] w-[clamp(1.5rem,5vw,2.5rem)] animate-spin text-orange-600" />
            </div>
        }>
            <CustomerDisplayContent />
        </Suspense>
    )
}
