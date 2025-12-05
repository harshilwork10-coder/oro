'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, User, Loader2 } from 'lucide-react'
import AuraLogo from '@/components/ui/AuraLogo'

export default function CustomerDisplayPage() {
    const [cart, setCart] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchCart = async () => {
            try {
                const res = await fetch('/api/pos/cart')
                if (res.ok) {
                    const data = await res.json()
                    if (data.empty) {
                        setCart(null)
                    } else {
                        setCart(data)
                    }
                }
            } catch (error) {
                console.error('Error fetching cart:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchCart()
        const interval = setInterval(fetchCart, 1000) // Poll every second
        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-8 animate-pulse">
                    <AuraLogo size={64} />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Aura</h1>
                <p className="text-xl text-gray-500">We're ready when you are.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                        <AuraLogo size={24} />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Aura
                    </span>
                </div>
                {cart.customerName && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium">
                        <User className="h-5 w-5" />
                        Hi, {cart.customerName.split(' ')[0]}
                    </div>
                )}
            </div>

            <div className="flex-1 flex gap-8 p-8 max-w-7xl mx-auto w-full">
                {/* Left: Item List */}
                <div className="flex-1 bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 bg-gray-50 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                            Your Items
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {cart.items.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                                        {item.icon || '🛍️'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-gray-900">{item.name}</p>
                                        <p className="text-sm text-gray-500 capitalize">{item.type}</p>
                                    </div>
                                </div>
                                <p className="font-bold text-xl text-gray-900">${item.price.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Totals */}
                <div className="w-96 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl shadow-xl p-8 text-white flex flex-col justify-center">
                    <div className="space-y-6">
                        <div className="flex justify-between text-blue-100 text-lg">
                            <span>Subtotal</span>
                            <span>${cart.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-blue-100 text-lg">
                            <span>Tax</span>
                            <span>${cart.tax.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-white/20 my-4" />
                        <div className="flex justify-between text-4xl font-bold">
                            <span>Total</span>
                            <span>${cart.total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-blue-100 text-sm">
                        Please review your items on screen.
                    </div>
                </div>
            </div>
        </div>
    )
}
