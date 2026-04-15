/**
 * Customer-Facing Display (Salon / Generic)
 *
 * Full-screen page shown on a secondary monitor facing the customer.
 * Receives live cart data via BroadcastChannel — ZERO API calls.
 *
 * Adaptive layout using CSS clamp() — fits any hardware:
 *   - PAX e800 8" (800×1280)
 *   - PAX e800 12.5" / 15.6" (1920×1080)
 *   - Standard 2nd monitor
 *   - Any tablet or kiosk display
 *
 * Shows:
 * - Personalized greeting when customer is selected
 * - Items as cashier scans them (real-time)
 * - Running total
 * - Business logo + branding
 * - Idle state with promotional messages
 * - "Powered by ORO GURUS" footer
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
    customerName?: string | null
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
    const [storeName, setStoreName] = useState('')

    // Load store name from terminal_config (same pattern as CheckIn.tsx)
    useEffect(() => {
        try {
            const savedConfig = localStorage.getItem('terminal_config')
            if (savedConfig) {
                const config = JSON.parse(savedConfig)
                if (config.business?.name) {
                    setStoreName(config.business.name)
                }
            }
        } catch {
            // Fallback — storeName stays empty, greeting still works
        }
    }, [])

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

    // Extract first name only for safety — never display full name or phone
    const customerFirstName = state.customerName || null

    // Build the welcome greeting
    const greeting = storeName && customerFirstName
        ? `Welcome to ${storeName}, ${customerFirstName}`
        : storeName
            ? `Welcome to ${storeName}`
            : customerFirstName
                ? `Welcome, ${customerFirstName}`
                : 'Welcome!'

    // IDLE STATE — Show branding + promo
    if (state.status === 'IDLE' || state.items.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center text-white p-[clamp(1rem,4vw,2rem)]">
                <div className="text-center">
                    <h1 className="text-[clamp(2rem,8vw,4rem)] font-bold mb-[clamp(0.25rem,1vw,0.5rem)] bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        {storeName || 'ORO GURUS'}
                    </h1>
                    <p className="text-stone-400 text-[clamp(1rem,3.5vw,1.5rem)] mb-[clamp(2rem,6vw,3rem)]">Welcome!</p>

                    <div className="bg-stone-900/60 border border-stone-700 rounded-2xl px-[clamp(2rem,6vw,3rem)] py-[clamp(1rem,3vw,1.5rem)] max-w-lg mx-auto">
                        <p className="text-[clamp(0.875rem,2.5vw,1.25rem)] text-stone-300 transition-all duration-500">
                            {PROMO_MESSAGES[promoIndex]}
                        </p>
                    </div>

                    <p className="text-stone-500 text-[clamp(1.5rem,5vw,2.5rem)] font-mono mt-[clamp(2rem,6vw,3rem)]">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>

                {/* Footer */}
                <div className="absolute bottom-[clamp(1rem,3vw,2rem)] text-stone-600 text-[clamp(0.625rem,1.5vw,0.875rem)]">
                    Powered by ORO GURUS
                </div>
            </div>
        )
    }

    // COMPLETE STATE — Thank you
    if (state.status === 'COMPLETE') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-950 flex flex-col items-center justify-center text-white p-[clamp(1rem,4vw,2rem)] relative">
                <div className="text-center">
                    <div className="text-[clamp(3rem,10vw,5rem)] mb-[clamp(1rem,3vw,1.5rem)]">✓</div>
                    <h1 className="text-[clamp(1.75rem,7vw,3.5rem)] font-bold text-emerald-400 mb-[clamp(0.5rem,2vw,1rem)]">Thank You!</h1>
                    <p className="text-[clamp(1rem,3.5vw,1.75rem)] text-stone-300">Your total was {formatCurrency(state.total)}</p>
                    {customerFirstName && (
                        <p className="text-[clamp(0.875rem,2.5vw,1.25rem)] text-stone-400 mt-[clamp(0.25rem,1vw,0.5rem)]">
                            See you next time, {customerFirstName}!
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="absolute bottom-[clamp(1rem,3vw,2rem)] text-stone-600 text-[clamp(0.625rem,1.5vw,0.875rem)]">
                    Powered by ORO GURUS
                </div>
            </div>
        )
    }

    // ACTIVE / PAYMENT — Show cart
    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white flex flex-col relative">
            {/* Header with personalized greeting */}
            <div className="px-[clamp(1rem,4vw,2rem)] py-[clamp(0.5rem,2vw,1rem)] border-b border-stone-800 flex-shrink-0">
                <div className="flex justify-between items-center">
                    <h1 className="text-[clamp(1rem,3.5vw,1.75rem)] font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        {storeName || 'ORO GURUS'}
                    </h1>
                    <p className="text-stone-400 text-[clamp(0.75rem,2vw,1rem)]">
                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                {/* Personalized greeting bar */}
                <p className="text-[clamp(0.75rem,2vw,1rem)] text-stone-400 mt-[clamp(0.125rem,0.5vw,0.25rem)]">
                    {greeting}
                </p>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-[clamp(1rem,4vw,2rem)] py-[clamp(0.5rem,2vw,1rem)]">
                {state.items.map((item, i) => {
                    const isLatest = i === state.items.length - 1
                    return (
                        <div
                            key={i}
                            className={`flex justify-between items-center py-[clamp(0.5rem,2vw,1rem)] px-[clamp(0.5rem,2vw,1rem)] rounded-xl mb-[clamp(0.25rem,0.75vw,0.5rem)] transition-all ${
                                isLatest
                                    ? 'bg-emerald-500/10 border border-emerald-500/30 scale-[1.02]'
                                    : 'bg-stone-900/50'
                            }`}
                        >
                            <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] min-w-0 flex-1">
                                <span className="text-[clamp(0.875rem,2.5vw,1.25rem)] font-semibold truncate">{item.name}</span>
                                {item.quantity > 1 && (
                                    <span className="text-[clamp(0.625rem,1.5vw,0.875rem)] text-stone-400 bg-stone-700 px-[clamp(0.25rem,1vw,0.5rem)] py-0.5 rounded flex-shrink-0">
                                        ×{item.quantity}
                                    </span>
                                )}
                            </div>
                            <span className="text-[clamp(0.875rem,3vw,1.5rem)] font-mono text-emerald-400 flex-shrink-0 ml-[clamp(0.5rem,1vw,0.75rem)]">
                                {formatCurrency(item.total)}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Totals */}
            <div className="border-t border-stone-700 px-[clamp(1rem,4vw,2rem)] py-[clamp(0.75rem,3vw,1.5rem)] bg-stone-950/80 flex-shrink-0">
                <div className="flex justify-between text-[clamp(0.875rem,2.5vw,1.25rem)] text-stone-400 mb-[clamp(0.25rem,1vw,0.5rem)]">
                    <span>Subtotal ({state.items.length} items)</span>
                    <span>{formatCurrency(state.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[clamp(0.875rem,2.5vw,1.25rem)] text-stone-400 mb-[clamp(0.5rem,2vw,1rem)]">
                    <span>Tax</span>
                    <span>{formatCurrency(state.tax)}</span>
                </div>
                <div className="flex justify-between text-[clamp(1.25rem,5vw,2.25rem)] font-bold">
                    <span>Total</span>
                    <span className="text-emerald-400">{formatCurrency(state.total)}</span>
                </div>

                {state.status === 'PAYMENT' && (
                    <div className="mt-[clamp(0.5rem,2vw,1rem)] text-center py-[clamp(0.5rem,1.5vw,0.75rem)] bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 text-[clamp(0.875rem,3vw,1.5rem)] animate-pulse">
                        Processing payment...
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="text-center py-[clamp(0.25rem,1vw,0.5rem)] text-stone-600 text-[clamp(0.5rem,1.25vw,0.75rem)] border-t border-stone-900 flex-shrink-0">
                Powered by ORO GURUS
            </div>
        </div>
    )
}
