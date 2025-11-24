'use client'

import { useState } from 'react'
import { X, CreditCard, DollarSign, Users, Tag, AlertCircle } from 'lucide-react'

interface CheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    cart: any[]
    subtotal: number
    taxRate: number
    customerId?: string
    onComplete: (transaction: any) => void
}

export default function CheckoutModal({ isOpen, onClose, cart, subtotal, taxRate, customerId, onComplete }: CheckoutModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD'>('CASH')
    const [tip, setTip] = useState(0)
    const [tipPercent, setTipPercent] = useState<number | null>(null)
    const [discount, setDiscount] = useState(0)

    // Mock merchant config - will be fetched from franchise settings
    const merchantConfig = {
        processingPlan: 'DUAL_PRICE', // STANDARD, SURCHARGE, DUAL_PRICE
        cardFeePercent: 3.99
    }

    // Calculate card fee based on processing plan
    const calculateCardFee = () => {
        if (paymentMethod === 'CASH') return 0

        if (merchantConfig.processingPlan === 'STANDARD') {
            // No fee for customer
            return 0
        }

        if (merchantConfig.processingPlan === 'SURCHARGE') {
            // Only credit cards get fee, not debit
            if (paymentMethod === 'CREDIT_CARD') {
                return (subtotal - discount) * (merchantConfig.cardFeePercent / 100)
            }
            return 0
        }

        if (merchantConfig.processingPlan === 'DUAL_PRICE') {
            // All cards get fee (credit and debit)
            if (paymentMethod === 'DEBIT_CARD' || paymentMethod === 'CREDIT_CARD') {
                return (subtotal - discount) * (merchantConfig.cardFeePercent / 100)
            }
            return 0
        }

        return 0
    }

    const cardFee = calculateCardFee()

    // Tax calculation: Services are tax-exempt, only products are taxed
    const productSubtotal = cart
        .filter(item => item.type === 'product')
        .reduce((sum, item) => sum + item.price, 0)

    // Calculate tax only on products
    const tax = productSubtotal * taxRate

    // Total calculation
    const total = subtotal - discount + cardFee + tax + tip

    const handleTipPercent = (percent: number) => {
        setTipPercent(percent)
        setTip((subtotal - discount) * (percent / 100))
    }

    const handleComplete = () => {
        const transaction = {
            items: cart,
            subtotal,
            discount,
            cardFee,
            tax,
            tip,
            total,
            paymentMethod,
            customerId: customerId || null,
            timestamp: new Date()
        }
        onComplete(transaction)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Checkout</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                    {/* Payment Method Selection */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            Payment Method
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setPaymentMethod('CASH')}
                                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'CASH'
                                    ? 'border-green-500 bg-green-50 shadow-md'
                                    : 'border-gray-200 hover:border-green-300'
                                    }`}
                            >
                                <DollarSign className={`h-8 w-8 mx-auto mb-2 ${paymentMethod === 'CASH' ? 'text-green-600' : 'text-gray-400'
                                    }`} />
                                <p className={`text-sm font-medium ${paymentMethod === 'CASH' ? 'text-green-900' : 'text-gray-600'
                                    }`}>Cash</p>
                                {paymentMethod === 'CASH' && (
                                    <p className="text-xs text-green-600 mt-1">No fees</p>
                                )}
                            </button>

                            <button
                                onClick={() => setPaymentMethod('DEBIT_CARD')}
                                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'DEBIT_CARD'
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : 'border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <CreditCard className={`h-8 w-8 mx-auto mb-2 ${paymentMethod === 'DEBIT_CARD' ? 'text-blue-600' : 'text-gray-400'
                                    }`} />
                                <p className={`text-sm font-medium ${paymentMethod === 'DEBIT_CARD' ? 'text-blue-900' : 'text-gray-600'
                                    }`}>Debit Card</p>
                                {paymentMethod === 'DEBIT_CARD' && cardFee > 0 && (
                                    <p className="text-xs text-blue-600 mt-1">+${cardFee.toFixed(2)} fee</p>
                                )}
                            </button>

                            <button
                                onClick={() => setPaymentMethod('CREDIT_CARD')}
                                className={`p-4 rounded-xl border-2 transition-all ${paymentMethod === 'CREDIT_CARD'
                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                    : 'border-gray-200 hover:border-purple-300'
                                    }`}
                            >
                                <CreditCard className={`h-8 w-8 mx-auto mb-2 ${paymentMethod === 'CREDIT_CARD' ? 'text-purple-600' : 'text-gray-400'
                                    }`} />
                                <p className={`text-sm font-medium ${paymentMethod === 'CREDIT_CARD' ? 'text-purple-900' : 'text-gray-600'
                                    }`}>Credit Card</p>
                                {paymentMethod === 'CREDIT_CARD' && cardFee > 0 && (
                                    <p className="text-xs text-purple-600 mt-1">+${cardFee.toFixed(2)} fee</p>
                                )}
                            </button>
                        </div>

                        {/* Dual Price Alert */}
                        {merchantConfig.processingPlan === 'DUAL_PRICE' && cardFee > 0 && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium">Dual Price Pricing</p>
                                    <p className="text-xs mt-0.5">
                                        Cash Price: ${(subtotal - discount).toFixed(2)} | Card Price: ${(subtotal - discount + cardFee).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tip */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Tip (Optional)</h3>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {[15, 18, 20, 25].map((percent) => (
                                <button
                                    key={percent}
                                    onClick={() => handleTipPercent(percent)}
                                    className={`py-2 px-3 rounded-lg border-2 transition-all ${tipPercent === percent
                                        ? 'border-green-500 bg-green-50 text-green-900 font-semibold'
                                        : 'border-gray-200 hover:border-green-300 text-gray-700'
                                        }`}
                                >
                                    {percent}%
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="number"
                                placeholder="Custom tip amount"
                                value={tip || ''}
                                onChange={(e) => {
                                    setTip(Number(e.target.value))
                                    setTipPercent(null)
                                }}
                                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Discount */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Tag className="h-5 w-5 text-orange-600" />
                            Discount (Optional)
                        </h3>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <input
                                type="number"
                                placeholder="Discount amount"
                                value={discount || ''}
                                onChange={(e) => setDiscount(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-orange-600">
                                    <span>Discount</span>
                                    <span>-${discount.toFixed(2)}</span>
                                </div>
                            )}
                            {cardFee > 0 && (
                                <div className="flex justify-between text-blue-600">
                                    <span>Card Processing Fee ({merchantConfig.cardFeePercent}%)</span>
                                    <span>+${cardFee.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    {/* Complete Button */}
                    <div className="mt-6">
                        <button
                            onClick={handleComplete}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Complete Payment - ${total.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
