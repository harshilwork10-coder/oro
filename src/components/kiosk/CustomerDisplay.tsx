'use client'

import { ShoppingCart, User } from 'lucide-react'
import TipModal from './TipModal'
import ReviewModal from './ReviewModal'

interface CustomerDisplayProps {
    cart: any
    showTipModal?: boolean
    onTipSelected?: (tipAmount: number) => void
    onTipModalClose?: () => void
    showReviewModal?: boolean
    onReviewSubmit?: (rating: number, feedbackTag: string | null) => void
    onReviewSkip?: () => void
}

const MAX_VISIBLE_ITEMS = 7

export default function CustomerDisplay({
    cart,
    showTipModal = false,
    onTipSelected,
    onTipModalClose,
    showReviewModal = false,
    onReviewSubmit,
    onReviewSkip
}: CustomerDisplayProps) {
    if (!cart || !cart.items || cart.items.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-500">
                <div className="mb-6">
                    <img src="/Oro-logo.png" alt="Oro" className="h-20 md:h-24 object-contain" />
                </div>
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-4">Welcome to Oro</h1>
                <p className="text-lg md:text-xl text-gray-500">We're ready when you are.</p>
            </div>
        )
    }

    // Calculate total if not provided
    const displayTotal = cart.total || ((cart.subtotal ?? 0) + (cart.tax ?? 0))

    // Show only last 5 items
    const allItems = cart.items || []
    const hiddenItemsCount = Math.max(0, allItems.length - MAX_VISIBLE_ITEMS)
    const visibleItems = allItems.slice(-MAX_VISIBLE_ITEMS) // Get last 5 items

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden animate-in fade-in duration-300">
            {/* Header - Fixed at top */}
            <div className="bg-stone-900 py-3 px-4 shadow-sm flex items-center justify-between flex-shrink-0">
                <div className="flex items-center">
                    <img src="/Oro-logo.png" alt="Oro" className="h-10 md:h-12 object-contain" />
                </div>
                {cart.customerName && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full font-medium text-sm">
                        <User className="h-4 w-4" />
                        Hi, {cart.customerName.split(' ')[0]}
                    </div>
                )}
            </div>

            {/* Items List - Shows only last 5 items */}
            <div className="flex-1 p-4 pb-2 overflow-hidden">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-orange-600" />
                            Your Items ({allItems.length})
                        </h2>
                    </div>

                    <div className="flex-1 p-3 space-y-2 overflow-hidden">
                        {/* Hidden items indicator */}
                        {hiddenItemsCount > 0 && (
                            <div className="text-center py-2 text-stone-500 text-sm bg-stone-100 rounded-lg">
                                + {hiddenItemsCount} more item{hiddenItemsCount > 1 ? 's' : ''} above
                            </div>
                        )}

                        {/* Show only last 5 items */}
                        {visibleItems.map((item: any, index: number) => {
                            const actualIndex = hiddenItemsCount + index + 1 // Real item number
                            return (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 py-2 px-3 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl animate-in slide-in-from-bottom-2 duration-300"
                                >
                                    {/* Item Number */}
                                    <div className="h-7 w-7 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                        {actualIndex}
                                    </div>

                                    {/* Icon */}
                                    <div className="text-xl flex-shrink-0">{item.icon || '🛍️'}</div>

                                    {/* Item Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 truncate text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500 uppercase font-medium">{item.type}</p>
                                    </div>

                                    {/* Quantity (if > 1) */}
                                    {item.quantity > 1 && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg font-bold text-xs flex-shrink-0">
                                            ×{item.quantity}
                                        </span>
                                    )}

                                    {/* Discount Badge */}
                                    {item.discount > 0 && (
                                        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg font-bold text-xs flex-shrink-0">
                                            -{item.discount}%
                                        </span>
                                    )}

                                    {/* Price - use displayPrice if available, fallback to calculated */}
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1 flex-shrink-0">
                                        <span className="text-sm font-bold text-emerald-700">
                                            ${(item.displayPrice || item.cashPrice || (item.price * (item.quantity || 1) * (1 - (item.discount || 0) / 100)) || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Fixed Totals Panel at Bottom - ALWAYS VISIBLE */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-4 text-white flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    {/* Left: Subtotal & Tax */}
                    <div className="space-y-1 text-orange-100 text-sm">
                        <div className="flex gap-4">
                            <span>Subtotal: ${(cart.subtotal ?? 0).toFixed(2)}</span>
                            <span>Tax: ${(cart.tax ?? 0).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Right: Grand Total - Big & Bold */}
                    <div className="text-right">
                        <span className="text-orange-100 text-xs uppercase tracking-wider">Grand Total</span>
                        <div className="text-3xl md:text-4xl font-bold">${displayTotal.toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Tip Modal */}
            {showTipModal && onTipSelected && onTipModalClose && (
                <TipModal
                    isOpen={showTipModal}
                    subtotal={cart.subtotal || 0}
                    onTipSelected={onTipSelected}
                    onClose={onTipModalClose}
                />
            )}

            {/* Review Modal */}
            {showReviewModal && onReviewSubmit && onReviewSkip && (
                <ReviewModal
                    isOpen={showReviewModal}
                    clientName={cart.customerName?.split(' ')[0] || 'Customer'}
                    onSubmit={onReviewSubmit}
                    onSkip={onReviewSkip}
                />
            )}
        </div>
    )
}
