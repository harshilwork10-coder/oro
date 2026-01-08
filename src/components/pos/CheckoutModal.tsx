'use client'

import { useState, useEffect } from 'react'
import { X, CreditCard, DollarSign, Delete, Banknote, Coins, Trophy } from 'lucide-react'

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
    const [lotteryCredit, setLotteryCredit] = useState(0)
    const [showLotteryInput, setShowLotteryInput] = useState(false)
    const [lotteryInputValue, setLotteryInputValue] = useState('')
    const [waitingForTip, setWaitingForTip] = useState(false)
    const [paymentCompleted, setPaymentCompleted] = useState(false)

    // Split Payment Tracking
    const [payments, setPayments] = useState<{ type: string; amount: number }[]>([])
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + lotteryCredit

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

    // Total calculation (lottery credit reduces amount due)
    const total = subtotal - discount + cardFee + tax + tip - lotteryCredit
    const remaining = Math.max(0, total - (parseFloat(tenderAmount) || 0))
    const changeDue = (parseFloat(tenderAmount) || 0) - total

    // Apply lottery credit (winning ticket redemption)
    const applyLotteryCredit = async () => {
        const creditAmount = parseFloat(lotteryInputValue) || 0
        if (creditAmount <= 0) return

        // Record lottery payout in backend
        try {
            await fetch('/api/lottery/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: creditAmount,
                    ticketNumber: null,
                    type: 'PAYOUT'
                })
            })
            setLotteryCredit(prev => prev + creditAmount)
            setLotteryInputValue('')
            setShowLotteryInput(false)
        } catch (error) {
            console.error('Failed to apply lottery credit:', error)
        }
    }

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

        // For card payments, show tip modal first (only if no tip yet)
        if ((method === 'CREDIT_CARD' || method === 'DEBIT_CARD') && !waitingForTip && !paymentCompleted && tip === 0) {
            setWaitingForTip(true)
            onShowTipModal?.(true)
            return
        }

        // If no amount entered, fill remaining for cash or exact for card
        if (currentTender === 0) {
            const remainingToPay = total - totalPaid
            if (method === 'CASH') {
                setTenderAmount(remainingToPay.toFixed(2))
                return
            } else {
                // Card pays exact remaining
                addPayment(method, remainingToPay)
                return
            }
        }

        addPayment(method, currentTender)
    }

    // Add a payment to the split payment list
    const addPayment = (method: string, amount: number) => {
        const remainingToPay = total - totalPaid
        const paymentAmount = Math.min(amount, remainingToPay)

        if (paymentAmount <= 0) return

        const newPayments = [...payments, { type: method, amount: paymentAmount }]
        setPayments(newPayments)
        setTenderAmount('')

        const newTotalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0) + lotteryCredit

        // Check if fully paid
        if (newTotalPaid >= total - 0.01) {
            completeTransaction(newPayments)
        }
    }

    const completeTransaction = (finalPayments: { type: string; amount: number }[]) => {
        setPaymentCompleted(true)
        setWaitingForTip(false)

        // Determine primary payment method
        const cashTotal = finalPayments.filter(p => p.type === 'CASH').reduce((s, p) => s + p.amount, 0)
        const cardTotal = finalPayments.filter(p => p.type !== 'CASH').reduce((s, p) => s + p.amount, 0)
        const primaryMethod = finalPayments.length > 1 ? 'SPLIT' : (finalPayments[0]?.type || 'CASH')

        const transaction = {
            items: cart,
            subtotal,
            discount,
            lotteryCredit,
            cardFee,
            tax,
            tip,
            total,
            paymentMethod: primaryMethod,
            payments: finalPayments, // Array of all payments
            cashAmount: cashTotal,
            cardAmount: cardTotal,
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
                        <button
                            onClick={() => setShowLotteryInput(true)}
                            className="h-16 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 rounded-xl font-bold transition-all border border-purple-700/50 flex items-center justify-center gap-2"
                        >
                            <Trophy className="h-5 w-5" />
                            Lottery
                        </button>
                    </div>

                    {/* Lottery Credit Input Modal */}
                    {showLotteryInput && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10">
                            <div className="bg-stone-800 rounded-xl p-6 w-80">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-purple-400" />
                                    Lottery Winning Credit
                                </h3>
                                <p className="text-sm text-stone-400 mb-4">Enter the winning ticket amount to apply as payment:</p>
                                <div className="relative mb-4">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-500" />
                                    <input
                                        type="number"
                                        value={lotteryInputValue}
                                        onChange={(e) => setLotteryInputValue(e.target.value)}
                                        placeholder="0.00"
                                        autoFocus
                                        className="w-full pl-10 pr-4 py-3 bg-stone-900 border border-stone-700 rounded-lg text-white text-2xl font-bold text-center"
                                    />
                                </div>
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    {[5, 10, 20, 50].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setLotteryInputValue(amt.toString())}
                                            className="py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 rounded-lg font-medium"
                                        >
                                            ${amt}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowLotteryInput(false); setLotteryInputValue(''); }}
                                        className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={applyLotteryCredit}
                                        disabled={!lotteryInputValue || parseFloat(lotteryInputValue) <= 0}
                                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50"
                                    >
                                        Apply Credit
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Column: Summary (4 cols) */}
                    <div className="col-span-4 bg-stone-950 p-6 flex flex-col">
                        <div className="mb-6">
                            <h3 className="text-stone-400 font-medium mb-1 text-right">Amount Remaining</h3>
                            <div className={`text-5xl font-bold text-right tracking-tight ${(total - totalPaid) <= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                ${Math.max(0, total - totalPaid).toFixed(2)}
                            </div>
                        </div>

                        <div className="flex-1 bg-stone-900 rounded-xl border border-stone-800 p-4 mb-4 overflow-y-auto">
                            <div className="flex justify-between text-stone-500 text-sm border-b border-stone-800 pb-2 mb-2">
                                <span>Type</span>
                                <span>Amount</span>
                            </div>
                            {/* Applied Payments */}
                            {payments.length === 0 && lotteryCredit === 0 ? (
                                <div className="text-center text-stone-600 mt-8 italic">
                                    No payments yet
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {lotteryCredit > 0 && (
                                        <div className="flex justify-between items-center text-purple-400">
                                            <span className="flex items-center gap-2">
                                                <Trophy className="h-4 w-4" />
                                                Lottery Credit
                                            </span>
                                            <span className="font-medium">${lotteryCredit.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {payments.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center">
                                            <span className="flex items-center gap-2">
                                                {p.type === 'CASH' ? (
                                                    <Banknote className="h-4 w-4 text-emerald-400" />
                                                ) : (
                                                    <CreditCard className="h-4 w-4 text-blue-400" />
                                                )}
                                                <span className={p.type === 'CASH' ? 'text-emerald-400' : 'text-blue-400'}>
                                                    {p.type === 'CASH' ? 'Cash' : p.type === 'CREDIT_CARD' ? 'Credit' : 'Debit'}
                                                </span>
                                            </span>
                                            <span className="font-medium text-white">${p.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-stone-700 pt-2 mt-2 flex justify-between font-bold">
                                        <span className="text-stone-400">Total Paid</span>
                                        <span className="text-emerald-400">${totalPaid.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
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

