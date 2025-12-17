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
                    Powered by Oronex
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

    // Active cart display
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 to-stone-950 flex flex-col p-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white">Your Order</h1>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-2xl mx-auto space-y-4">
                    {cart.items.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between bg-stone-800/50 rounded-xl px-6 py-4"
                        >
                            <div className="flex items-center gap-4">
                                <span className="text-2xl font-bold text-orange-500">
                                    {item.quantity}x
                                </span>
                                <span className="text-xl text-white">{item.name}</span>
                            </div>
                            <span className="text-xl font-bold text-orange-400">
                                {formatCurrency(item.price * item.quantity)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div className="mt-8 max-w-2xl mx-auto w-full">
                <div className="bg-stone-800 rounded-2xl p-6 space-y-3">
                    <div className="flex justify-between text-lg text-stone-400">
                        <span>Subtotal</span>
                        <span>{formatCurrency(cart.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg text-stone-400">
                        <span>Tax</span>
                        <span>{formatCurrency(cart.tax)}</span>
                    </div>
                    <div className="border-t border-stone-700 pt-3">
                        {/* Dual Pricing Display */}
                        {cart.showDualPricing ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-2xl font-bold">
                                    <span className="text-green-400 flex items-center gap-2">
                                        💵 Cash
                                    </span>
                                    <span className="text-green-400">{formatCurrency(cart.cashTotal || cart.total)}</span>
                                </div>
                                <div className="flex justify-between text-2xl font-bold">
                                    <span className="text-blue-400 flex items-center gap-2">
                                        💳 Card
                                    </span>
                                    <span className="text-blue-400">{formatCurrency(cart.cardTotal || cart.total)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between text-3xl font-bold text-white">
                                <span>Total</span>
                                <span className="text-orange-500">{formatCurrency(cart.total)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Branding */}
            <div className="mt-8 text-center text-stone-600 text-sm">
                Powered by Oronex
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
