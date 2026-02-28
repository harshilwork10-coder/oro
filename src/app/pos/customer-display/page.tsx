/**
 * Customer-Facing Display
 *
 * Full-screen page shown on a secondary monitor facing the customer.
 * Receives live cart data via BroadcastChannel — ZERO API calls.
 *
 * Shows:
 * - Items as cashier scans them (real-time)
 * - Running total
 * - Business logo + branding
 * - Idle state with promotional messages
 */

'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface CartItem {
    name: string
    quantity: number
    price: number
    total: number
}

interface DisplayState {
    items: CartItem[]
    subtotal: number
    tax: number
    total: number
    customerName?: string
    lastAction?: string
    status: 'IDLE' | 'ACTIVE' | 'PAYMENT' | 'COMPLETE'
}

const PROMO_MESSAGES = [
    '🎉 Join our loyalty program and earn points on every purchase!',
    '📱 Download our app for exclusive deals',
    '⭐ Leave us a review and get 10% off your next visit',
    '🎁 Ask about our gift cards — perfect for any occasion!',
]

export default function CustomerDisplayPage() {
    const [state, setState] = useState<DisplayState>({
        items: [], subtotal: 0, tax: 0, total: 0, status: 'IDLE'
    })
    const [promoIndex, setPromoIndex] = useState(0)
    const [time, setTime] = useState(new Date())

    useEffect(() => {
        // Listen for cart updates via BroadcastChannel (zero API calls)
        const channel = new BroadcastChannel('pos-customer-display')
        channel.onmessage = (event) => {
            setState(event.data)
        }

        // Clock
        const clockInterval = setInterval(() => setTime(new Date()), 1000)

        // Promo rotation during idle
        const promoInterval = setInterval(() => {
            setPromoIndex(i => (i + 1) % PROMO_MESSAGES.length)
        }, 5000)

        return () => {
            channel.close()
            clearInterval(clockInterval)
            clearInterval(promoInterval)
        }
    }, [])

    // IDLE STATE — Show branding + promo
    if (state.status === 'IDLE' || state.items.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-6xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        ORO 9
                    </h1>
                    <p className="text-stone-400 text-xl mb-12">Welcome!</p>

                    <div className="bg-stone-900/60 border border-stone-700 rounded-2xl px-12 py-6 max-w-lg mx-auto">
                        <p className="text-lg text-stone-300 transition-all duration-500">
                            {PROMO_MESSAGES[promoIndex]}
                        </p>
                    </div>

                    <p className="text-stone-500 text-4xl font-mono mt-12">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
            </div>
        )
    }

    // COMPLETE STATE — Thank you
    if (state.status === 'COMPLETE') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center text-white">
                <div className="text-center">
                    <div className="text-8xl mb-6">✓</div>
                    <h1 className="text-5xl font-bold text-emerald-400 mb-4">Thank You!</h1>
                    <p className="text-2xl text-stone-300">Your total was {formatCurrency(state.total)}</p>
                    {state.customerName && <p className="text-lg text-stone-400 mt-2">See you next time, {state.customerName}!</p>}
                </div>
            </div>
        )
    }

    // ACTIVE / PAYMENT — Show cart
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-4 border-b border-stone-800">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">ORO 9</h1>
                <p className="text-stone-400">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-8 py-4">
                {state.items.map((item, i) => (
                    <div key={i} className={`flex justify-between items-center py-4 px-4 rounded-xl mb-2 ${i === state.items.length - 1 ? 'bg-emerald-500/10 border border-emerald-500/30 scale-[1.02]' : 'bg-stone-900/50'} transition-all`}>
                        <div className="flex items-center gap-4">
                            <span className="text-lg font-semibold">{item.name}</span>
                            {item.quantity > 1 && <span className="text-sm text-stone-400 bg-stone-700 px-2 py-0.5 rounded">×{item.quantity}</span>}
                        </div>
                        <span className="text-xl font-mono text-emerald-400">{formatCurrency(item.total)}</span>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="border-t border-stone-700 px-8 py-6 bg-stone-950/80">
                <div className="flex justify-between text-lg text-stone-400 mb-2">
                    <span>Subtotal ({state.items.length} items)</span>
                    <span>{formatCurrency(state.subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg text-stone-400 mb-4">
                    <span>Tax</span>
                    <span>{formatCurrency(state.tax)}</span>
                </div>
                <div className="flex justify-between text-3xl font-bold">
                    <span>Total</span>
                    <span className="text-emerald-400">{formatCurrency(state.total)}</span>
                </div>

                {state.status === 'PAYMENT' && (
                    <div className="mt-4 text-center py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-xl animate-pulse">
                        Processing payment...
                    </div>
                )}
            </div>
        </div>
    )
}
