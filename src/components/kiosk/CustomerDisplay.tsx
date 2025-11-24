'use client'

import { ShoppingCart, User } from 'lucide-react'
import BreadLogo from '@/components/ui/BreadLogo'

interface CustomerDisplayProps {
    cart: any
}

export default function CustomerDisplay({ cart }: CustomerDisplayProps) {
    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="mb-8 animate-pulse">
                    <BreadLogo size={64} />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Aura</h1>
                <p className="text-xl text-gray-500">We're ready when you are.</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white">
                        <BreadLogo size={24} />
                    </div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                        Aura
                    </span>
                </div>
                {cart.customerName && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full font-medium">
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
                            <ShoppingCart className="h-5 w-5 text-orange-600" />
                            Your Items
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-3 pb-3 mb-3 border-b-2 border-gray-200 font-bold text-sm text-gray-600 uppercase tracking-wider">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-5">Item</div>
                            <div className="col-span-1 text-center">Qty</div>
                            <div className="col-span-2 text-center">Cash</div>
                            <div className="col-span-3 text-center">Card</div>
                        </div>

                        {/* Table Rows */}
                        <div className="space-y-2">
                            {cart.items.map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-12 gap-3 items-center py-3 px-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow animate-in slide-in-from-bottom-1 duration-200"
                                >
                                    {/* Row Number */}
                                    <div className="col-span-1 text-center">
                                        <div className="h-8 w-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto">
                                            {index + 1}
                                        </div>
                                    </div>

                                    {/* Item Name & Type */}
                                    <div className="col-span-5 flex items-center gap-2">
                                        <div className="text-2xl flex-shrink-0">{item.icon || '🛍️'}</div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500 uppercase font-medium">{item.type}</p>
                                        </div>
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-1 text-center">
                                        {item.quantity > 1 ? (
                                            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm">
                                                ×{item.quantity}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">—</span>
                                        )}
                                    </div>

                                    {/* Cash Price */}
                                    <div className="col-span-2 text-center">
                                        <div className="inline-block bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                            <div className="text-xs text-emerald-600 font-semibold mb-0.5">CASH</div>
                                            <div className="text-lg font-bold text-emerald-700">
                                                ${(item.cashPrice || item.price).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Price */}
                                    <div className="col-span-3 text-center">
                                        <div className="inline-block bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                                            <div className="text-xs text-blue-600 font-semibold mb-0.5">CARD</div>
                                            <div className="text-lg font-bold text-blue-700">
                                                ${(item.cardPrice || item.price * 1.0399).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Totals */}
                <div className="w-96 bg-gradient-to-br from-orange-600 to-amber-600 rounded-3xl shadow-xl p-8 text-white flex flex-col justify-center">
                    <div className="space-y-6">
                        <div className="flex justify-between text-orange-100 text-lg">
                            <span>Subtotal</span>
                            <span>${cart.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-orange-100 text-lg">
                            <span>Tax (8%)</span>
                            <span>${cart.tax.toFixed(2)}</span>
                        </div>
                        <div className="h-px bg-white/20 my-4" />
                        <div className="space-y-3">
                            <div className="flex justify-between text-3xl font-bold">
                                <span>Cash Total</span>
                                <span>${cart.total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-2xl font-semibold text-orange-100">
                                <span>Card Total</span>
                                <span>${cart.totalCard.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-orange-100 text-sm">
                        Please review your items and pricing.
                    </div>
                </div>
            </div>
        </div>
    )
}
