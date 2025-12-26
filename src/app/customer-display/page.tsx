'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, ShoppingCart } from 'lucide-react'
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
    tax: number
    total: number
    cashTotal?: number
    cardTotal?: number
    showDualPricing?: boolean
    status: 'IDLE' | 'ACTIVE' | 'PROCESSING' | 'COMPLETED'
    stationId?: string
}

function CustomerDisplayContent() {
    const searchParams = useSearchParams()
    const stationId = searchParams.get('stationId')

    const [cart, setCart] = useState<CartData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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

    // Also listen to localStorage for same-browser fallback
    useEffect(() => {
        const checkLocalStorage = () => {
            try {
                const cartData = localStorage.getItem('retail_customer_display')
                if (cartData) {
                    const parsed = JSON.parse(cartData)
                    // Only use if stationId matches or no server data yet
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

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 gap-4 p-8">
                <div className="text-6xl">📟</div>
                <h2 className="text-xl font-bold text-stone-100">Display Not Connected</h2>
                <p className="text-stone-400 text-center max-w-md">{error}</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                <p className="text-stone-500 text-sm">Connecting to POS...</p>
            </div>
        )
    }

    // Idle state - waiting for items
    if (!cart || !cart.items || cart.items.length === 0 || cart.status === 'IDLE') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-950 flex flex-col items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-stone-800 flex items-center justify-center">
                        <ShoppingCart className="h-16 w-16 text-orange-500/50" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">Welcome!</h1>
                    <p className="text-xl text-stone-400">Your items will appear here</p>
                </div>

                {/* Company branding at bottom */}
                <div className="absolute bottom-8 text-stone-600 text-sm">
                    Powered by Oro
                </div>
            </div>
        )
    }

    // Processing state
    if (cart.status === 'PROCESSING') {
        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8">
                <div className="animate-spin h-16 w-16 border-4 border-orange-500 border-t-transparent rounded-full mb-6"></div>
                <h2 className="text-3xl font-bold text-white mb-2">Processing Payment...</h2>
                <p className="text-stone-400 text-xl">Please wait</p>
            </div>
        )
    }

    // Thank you state
    if (cart.status === 'COMPLETED') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-900 to-stone-950 flex flex-col items-center justify-center p-8">
                <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-6xl">✓</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-4">Thank You!</h1>
                    <p className="text-2xl text-stone-300 mb-2">
                        Your total was {formatCurrency(cart.total)}
                    </p>
                    <p className="text-xl text-stone-400">Have a great day!</p>
                </div>
            </div>
        )
    }

    // Active cart display - TOTALS MUST ALWAYS BE VISIBLE (STATE LAW)
    return (
        <div className="h-screen bg-gradient-to-br from-stone-900 to-stone-950 flex flex-col overflow-hidden">
            {/* Header - Fixed */}
            <div className="text-center py-4 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white">Your Order</h1>
            </div>

            {/* Items List - Show last 5 items, summary for older ones */}
            <div className="flex-1 overflow-hidden px-8">
                <div className="max-w-2xl mx-auto h-full flex flex-col">
                    {/* Summary of older items (if more than 5) */}
                    {cart.items.length > 5 && (() => {
                        const olderItems = cart.items.slice(0, -5)
                        const olderTotal = olderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                        const olderCount = olderItems.reduce((sum, item) => sum + item.quantity, 0)
                        return (
                            <div className="flex items-center justify-between bg-stone-800/30 rounded-lg px-4 py-2 mb-2 text-stone-400">
                                <span className="text-sm">
                                    + {olderCount} more item{olderCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-sm font-medium">
                                    {formatCurrency(olderTotal)}
                                </span>
                            </div>
                        )
                    })()}

                    {/* Last 5 items (most recent at bottom) */}
                    <div className="flex-1 flex flex-col justify-end space-y-2">
                        {cart.items.slice(-5).map((item, idx) => {
                            const isLatest = idx === Math.min(cart.items.length, 5) - 1
                            return (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between rounded-xl px-5 py-3 transition-all ${isLatest
                                            ? 'bg-orange-500/20 border border-orange-500/50'
                                            : 'bg-stone-800/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xl font-bold ${isLatest ? 'text-orange-400' : 'text-orange-500'}`}>
                                            {item.quantity}x
                                        </span>
                                        <span className={`text-base ${isLatest ? 'text-white font-medium' : 'text-white'}`}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <span className={`text-base font-bold ${isLatest ? 'text-orange-300' : 'text-orange-400'}`}>
                                        {formatCurrency(item.price * item.quantity)}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Totals - FIXED AT BOTTOM (ALWAYS VISIBLE - STATE LAW REQUIREMENT) */}
            <div className="flex-shrink-0 bg-stone-950 border-t border-stone-800 px-8 py-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-stone-800 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between text-base text-stone-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(cart.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-base text-stone-400">
                            <span>Tax</span>
                            <span>{formatCurrency(cart.tax)}</span>
                        </div>
                        <div className="border-t border-stone-700 pt-2">
                            {/* Dual Pricing Display */}
                            {cart.showDualPricing ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xl font-bold">
                                        <span className="text-green-400 flex items-center gap-2">
                                            💵 Cash
                                        </span>
                                        <span className="text-green-400">{formatCurrency(cart.cashTotal || cart.total)}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold">
                                        <span className="text-blue-400 flex items-center gap-2">
                                            💳 Card
                                        </span>
                                        <span className="text-blue-400">{formatCurrency(cart.cardTotal || cart.total)}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between text-2xl font-bold text-white">
                                    <span>TOTAL</span>
                                    <span className="text-orange-500">{formatCurrency(cart.total)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function RetailCustomerDisplayPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-stone-950">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            </div>
        }>
            <CustomerDisplayContent />
        </Suspense>
    )
}
