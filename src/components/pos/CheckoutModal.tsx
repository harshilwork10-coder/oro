'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, DollarSign, Delete, Banknote, Coins } from 'lucide-react'

interface CheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    cart: any[]
    subtotal: number
    taxRate: number
    customerId?: string
    customerName?: string
    onComplete: (transaction: any) => void
    onShowTipModal?: (show: boolean) => void
    onShowReviewModal?: (show: boolean) => void
    onTipSelected?: (tipAmount: number) => void
    onReviewSubmit?: (rating: number, feedbackTag: string | null) => void
}

export default function CheckoutModal({ isOpen, onClose, cart, subtotal, taxRate, customerId, customerName, onComplete, onShowTipModal, onShowReviewModal, onTipSelected, onReviewSubmit }: CheckoutModalProps) {
    const [tenderAmount, setTenderAmount] = useState<string>('')
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | null>(null)
    const [tip, setTip] = useState(0)
    const [discount, setDiscount] = useState(0)
    const [waitingForTip, setWaitingForTip] = useState(false)
    const [paymentCompleted, setPaymentCompleted] = useState(false)

    // Mock merchant config
    const merchantConfig = {
        processingPlan: 'DUAL_PRICE', // STANDARD, SURCHARGE, DUAL_PRICE
        cardFeePercent: 3.99
    }

    // Calculate card fee based on processing plan
    const calculateCardFee = (method: string | null) => {
        if (method === 'CASH' || !method) return 0

        if (merchantConfig.processingPlan === 'STANDARD') return 0

        if (merchantConfig.processingPlan === 'SURCHARGE') {
            if (method === 'CREDIT_CARD') {
                return (subtotal - discount) * (merchantConfig.cardFeePercent / 100)
            }
            return 0
        }

        if (merchantConfig.processingPlan === 'DUAL_PRICE') {
            if (method === 'DEBIT_CARD' || method === 'CREDIT_CARD') {
                return (subtotal - discount) * (merchantConfig.cardFeePercent / 100)
            }
            return 0
        }
        return 0
    }

    const cardFee = calculateCardFee(paymentMethod)

    // Tax calculation
    const productSubtotal = cart
        .filter(item => item.type === 'product')
        .reduce((sum, item) => sum + item.price, 0)
    const tax = productSubtotal * taxRate

    // Total calculation
    const total = subtotal - discount + cardFee + tax + tip
    const remaining = Math.max(0, total - (parseFloat(tenderAmount) || 0))
    const changeDue = (parseFloat(tenderAmount) || 0) - total

    // Keypad Logic
    const handleKeypadClick = (key: string) => {
        if (key === 'CLEAR') {
            setTenderAmount('')
            return
        }
        if (key === 'BACKSPACE') {
            setTenderAmount(prev => prev.slice(0, -1))
            return
        }
        if (key === '.' && tenderAmount.includes('.')) return

        // Prevent too many decimals
        if (tenderAmount.includes('.')) {
            const [, decimals] = tenderAmount.split('.')
            if (decimals && decimals.length >= 2) return
        }

        setTenderAmount(prev => prev + key)
    }

    const handleQuickAmount = (amount: number) => {
        setTenderAmount(amount.toFixed(2))
    }

    const handlePayment = async (method: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD') => {
        setPaymentMethod(method)

        const currentTender = parseFloat(tenderAmount) || 0
        if (currentTender < total && method === 'CASH') {
            // Allow partial payment logic here if needed, for now just alert or block
            // But for this UI, we usually expect full payment or split
            // Let's assume full payment if tender is 0 (auto-fill)
            if (currentTender === 0) {
                setTenderAmount(total.toFixed(2))
                // Then proceed? No, let user confirm.
                return
            }
        }

        // For card payments, show tip modal first
        if ((method === 'CREDIT_CARD' || method === 'DEBIT_CARD') && !waitingForTip && !paymentCompleted) {
            setWaitingForTip(true)
            onShowTipModal?.(true)
            return
        }

        completeTransaction(method)
    }

    const completeTransaction = (method: string) => {
        setPaymentCompleted(true)
        setWaitingForTip(false)

        const transaction = {
            items: cart,
            subtotal,
            discount,
            cardFee: calculateCardFee(method),
            tax,
            tip,
            total,
            paymentMethod: method,
            customerId: customerId || null,
            timestamp: new Date()
        }

        if (customerId && onShowReviewModal) {
            onShowReviewModal(true)
        } else {
            onComplete(transaction)
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 rounded-3xl w-full max-w-5xl h-[80vh] overflow-hidden shadow-2xl border border-stone-800 flex flex-col">
                {/* Header */}
                <div className="bg-stone-950 px-8 py-4 flex items-center justify-between border-b border-stone-800">
                    <h2 className="text-2xl font-bold text-white">Checkout</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                        <X className="h-8 w-8" />
                    </button>
                </div>

                <div className="flex-1 grid grid-cols-12 gap-0">
                    {/* Left Column: Input & Keypad (5 cols) */}
                    <div className="col-span-5 bg-stone-900 p-6 border-r border-stone-800 flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex-1 bg-white rounded-xl overflow-hidden flex items-center px-4 py-3 border-2 border-orange-500/50 focus-within:border-orange-500 transition-colors">
                                <span className="text-2xl font-bold text-stone-900">$</span>
                                <input
                                    type="text"
                                    readOnly
                                    value={tenderAmount}
                                    placeholder="0.00"
                                    className="w-full text-right text-3xl font-bold text-stone-900 outline-none bg-transparent"
                                />
                            </div>
                            <button
                                onClick={() => handleKeypadClick('CLEAR')}
                                className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold px-4 py-4 rounded-xl transition-colors"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3 flex-1">
                            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handleKeypadClick(num.toString())}
                                    className="bg-stone-800 hover:bg-stone-700 text-white text-3xl font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-stone-950/50 border-b-4 border-stone-950 active:border-b-0 active:translate-y-1"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={() => handleKeypadClick('.')}
                                className="bg-stone-800 hover:bg-stone-700 text-white text-3xl font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-stone-950/50 border-b-4 border-stone-950 active:border-b-0 active:translate-y-1"
                            >
                                .
                            </button>
                            <button
                                onClick={() => handleKeypadClick('0')}
                                className="bg-stone-800 hover:bg-stone-700 text-white text-3xl font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-stone-950/50 border-b-4 border-stone-950 active:border-b-0 active:translate-y-1"
                            >
                                0
                            </button>
                            <button
                                onClick={() => handleKeypadClick('BACKSPACE')}
                                className="bg-stone-800 hover:bg-stone-700 text-white text-xl font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-stone-950/50 border-b-4 border-stone-950 active:border-b-0 active:translate-y-1 flex items-center justify-center"
                            >
                                <Delete className="h-8 w-8" />
                            </button>
                        </div>
                    </div>

                    {/* Middle Column: Tender Types (3 cols) */}
                    <div className="col-span-3 bg-stone-900 p-6 border-r border-stone-800 flex flex-col gap-3">
                        <button
                            onClick={() => handlePayment('CASH')}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xl transition-all shadow-lg shadow-emerald-900/20 flex flex-col items-center justify-center gap-2 border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1"
                        >
                            <Banknote className="h-8 w-8" />
                            Cash
                        </button>
                        <button
                            onClick={() => handlePayment('CREDIT_CARD')}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xl transition-all shadow-lg shadow-blue-900/20 flex flex-col items-center justify-center gap-2 border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
                        >
                            <CreditCard className="h-8 w-8" />
                            Credit Card
                        </button>
                        <button
                            onClick={() => handlePayment('DEBIT_CARD')}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xl transition-all shadow-lg shadow-indigo-900/20 flex flex-col items-center justify-center gap-2 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1"
                        >
                            <CreditCard className="h-8 w-8" />
                            Debit
                        </button>
                        <button className="h-16 bg-stone-800 hover:bg-stone-700 text-stone-400 rounded-xl font-bold transition-all border border-stone-700">
                            Gift Card
                        </button>
                    </div>

                    {/* Right Column: Summary (4 cols) */}
                    <div className="col-span-4 bg-stone-950 p-6 flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-stone-400 font-medium mb-1 text-right">Amount Remaining</h3>
                            <div className="text-5xl font-bold text-emerald-400 text-right tracking-tight">
                                ${remaining.toFixed(2)}
                            </div>
                        </div>

                        <div className="flex-1 bg-stone-900 rounded-xl border border-stone-800 p-4 mb-4">
                            <div className="flex justify-between text-stone-500 text-sm border-b border-stone-800 pb-2 mb-2">
                                <span>Type</span>
                                <span>Amount</span>
                            </div>
                            {/* Placeholder for split payments */}
                            <div className="text-center text-stone-600 mt-8 italic">
                                No payments yet
                            </div>
                        </div>

                        {changeDue > 0 && (
                            <div className="bg-stone-900 rounded-xl border border-stone-800 p-4 mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-400">Change Due</span>
                                    <span className="text-2xl font-bold text-orange-400">${changeDue.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-xl font-bold transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Quick Cash */}
                <div className="bg-stone-900 p-4 border-t border-stone-800 grid grid-cols-6 gap-3">
                    {[1, 5, 10, 20, 50].map(amount => (
                        <button
                            key={amount}
                            onClick={() => handleQuickAmount(amount)}
                            className="py-3 bg-emerald-900/20 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/50 rounded-xl font-bold text-lg transition-all"
                        >
                            ${amount}.00
                        </button>
                    ))}
                    <button
                        onClick={() => handleQuickAmount(Math.ceil(total))}
                        className="py-3 bg-amber-900/20 hover:bg-amber-900/40 text-amber-400 border border-amber-900/50 rounded-xl font-bold text-lg transition-all"
                    >
                        ${Math.ceil(total).toFixed(2)}
                    </button>
                </div>
            </div>
        </div>
    )
}
