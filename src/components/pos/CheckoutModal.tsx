'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, CreditCard, DollarSign, Delete, Banknote, Trophy, Gift, AlertTriangle, RefreshCw, Lock, WifiOff } from 'lucide-react'
import GiftCardModal from './GiftCardModal'
import PaxPaymentModal from '@/components/modals/PaxPaymentModal'

interface CheckoutModalProps {
    isOpen: boolean
    onClose: () => void
    cart: any[]
    subtotal: number
    taxRate: number
    pricingSettings?: { processingPlan?: string; cardFeePercent?: number; tipEnabled?: boolean }
    customerId?: string
    customerName?: string
    onComplete: (transaction: any) => void
    onShowTipModal?: (show: boolean) => void
    onShowReviewModal?: (show: boolean) => void
    onTipSelected?: (tipAmount: number) => void
    onReviewSubmit?: (rating: number, feedbackTag: string | null) => void
}

export default function CheckoutModal({ isOpen, onClose, cart, subtotal, taxRate, pricingSettings, customerId, customerName, onComplete, onShowTipModal, onShowReviewModal, onTipSelected, onReviewSubmit }: CheckoutModalProps) {
    const [tenderAmount, setTenderAmount] = useState<string>('')
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | null>(null)
    const [tip, setTip] = useState(0)
    const [discount, setDiscount] = useState(0)
    const [lotteryCredit, setLotteryCredit] = useState(0)
    const [showLotteryInput, setShowLotteryInput] = useState(false)
    const [lotteryInputValue, setLotteryInputValue] = useState('')
    const [waitingForTip, setWaitingForTip] = useState(false)
    const [paymentCompleted, setPaymentCompleted] = useState(false)
    const [showGiftCardModal, setShowGiftCardModal] = useState(false)
    const [giftCardCredit, setGiftCardCredit] = useState(0)

    // Split Payment Tracking
    const [payments, setPayments] = useState<{ type: string; amount: number }[]>([])
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + lotteryCredit + giftCardCredit

    // PAX Terminal — inline for per-card-charge split payments
    const [showPaxModal, setShowPaxModal] = useState(false)
    const [pendingPaxAmount, setPendingPaxAmount] = useState(0)
    const [pendingPaxMethod, setPendingPaxMethod] = useState<'CREDIT_CARD' | 'DEBIT_CARD'>('CREDIT_CARD')

    // S5-1: Card timeout / retry
    const [cardTimedOut, setCardTimedOut] = useState(false)
    const [cardRetryCount, setCardRetryCount] = useState(0)
    const cardTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // S5-1b: Timeout recovery instructions from server
    const [timeoutRecovery, setTimeoutRecovery] = useState<{ steps: string[]; contactProcessor: boolean; manualReviewRequired: boolean } | null>(null)

    // S5-2: Terminal disconnect detection
    const [terminalDisconnected, setTerminalDisconnected] = useState(false)
    const reconnectAttemptRef = useRef(0)

    // S7-07: Partial authorization
    const [partialAuth, setPartialAuth] = useState<{ requested: number; approved: number; remaining: number } | null>(null)

    // S5-4: Auto-lock inactivity timer (5 min default)
    const [isLocked, setIsLocked] = useState(false)
    const [lockPin, setLockPin] = useState('')
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000 // 5 minutes

    // Reset inactivity timer on any user interaction
    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = setTimeout(() => {
            if (!paymentCompleted) setIsLocked(true)
        }, INACTIVITY_TIMEOUT)
    }, [paymentCompleted])

    useEffect(() => {
        if (isOpen && !paymentCompleted) {
            resetInactivityTimer()
            const handler = () => resetInactivityTimer()
            window.addEventListener('click', handler)
            window.addEventListener('keydown', handler)
            return () => {
                window.removeEventListener('click', handler)
                window.removeEventListener('keydown', handler)
                if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
            }
        }
    }, [isOpen, paymentCompleted, resetInactivityTimer])

    // S5-1: Start card timeout when PAX modal opens
    useEffect(() => {
        if (showPaxModal) {
            setCardTimedOut(false)
            cardTimeoutRef.current = setTimeout(async () => {
                setCardTimedOut(true)
                // Report timeout to server for audit + recovery
                try {
                    const res = await fetch('/api/pos/payment-timeout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: pendingPaxAmount,
                            stationId: null,
                        })
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data.recovery) setTimeoutRecovery(data.recovery)
                    }
                } catch { /* ignore - timeout still shown even if logging fails */ }
            }, 30000) // 30-second timeout
        } else {
            if (cardTimeoutRef.current) clearTimeout(cardTimeoutRef.current)
            setCardTimedOut(false)
        }
        return () => { if (cardTimeoutRef.current) clearTimeout(cardTimeoutRef.current) }
    }, [showPaxModal])

    // S5-1: Retry card payment
    const handleCardRetry = () => {
        setCardRetryCount(prev => prev + 1)
        setCardTimedOut(false)
        setTimeoutRecovery(null)
        setShowPaxModal(false)
        setTimeout(() => {
            setShowPaxModal(true)
        }, 500)
    }

    // S5-2: Terminal reconnect
    const handleTerminalReconnect = async () => {
        reconnectAttemptRef.current++
        try {
            const res = await fetch('/api/pos/terminal/ping', { method: 'POST' })
            if (res.ok) setTerminalDisconnected(false)
        } catch { /* stay disconnected */ }
    }

    // S5-4: Unlock with PIN
    const handleUnlock = async () => {
        try {
            const res = await fetch('/api/pos/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: lockPin })
            })
            if (res.ok) {
                setIsLocked(false)
                setLockPin('')
                resetInactivityTimer()
            }
        } catch { /* stay locked */ }
    }

    // BUG-3 FIX: Use pricing settings from parent (franchise config) instead of hardcoded values
    const merchantConfig = {
        processingPlan: pricingSettings?.processingPlan || 'STANDARD',
        cardFeePercent: pricingSettings?.cardFeePercent || 0
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

    // BUG-4 FIX: Tax calculation now uses quantity × per-item taxRate
    // Each cart item may have its own taxRate (e.g., NO_TAX=0, LOW_TAX=2.25, EBT=0)
    const tax = cart
        .filter(item => item.type === 'product')
        .reduce((sum, item) => {
            const itemTaxRate = item.taxRate !== undefined ? item.taxRate : taxRate
            return sum + (item.price * (item.quantity || 1)) * itemTaxRate
        }, 0)

    // Total calculation (lottery + gift card credits reduce amount due)
    const total = subtotal - discount + cardFee + tax + tip - lotteryCredit - giftCardCredit
    const remainingToPay = Math.max(0, total - payments.reduce((s, p) => s + p.amount, 0))

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

        // For card payments, show tip modal first (only if tips enabled AND no tip yet)
        const tipIsEnabled = pricingSettings?.tipEnabled !== false // Default to true if not set
        if (tipIsEnabled && (method === 'CREDIT_CARD' || method === 'DEBIT_CARD') && !waitingForTip && !paymentCompleted && tip === 0) {
            setWaitingForTip(true)
            onShowTipModal?.(true)
            return
        }

        // Determine the charge amount
        const chargeAmount = currentTender > 0 ? Math.min(currentTender, remainingToPay) : remainingToPay

        if (chargeAmount <= 0) return

        if (method === 'CASH') {
            // Cash: if no amount entered, fill the display first (user sees exact amount)
            if (currentTender === 0) {
                setTenderAmount(remainingToPay.toFixed(2))
                return
            }
            addPayment('CASH', chargeAmount)
        } else {
            // CARD: Open PAX terminal for this specific partial/full amount
            setPendingPaxAmount(chargeAmount)
            setPendingPaxMethod(method)
            setShowPaxModal(true)
        }
    }

    // PAX terminal approved a card charge (S7-07: may be partial)
    const handlePaxSuccess = (response: { status: string; responseCode: string; hostInformation?: any; transactionId?: string; authCode?: string; cardLast4?: string; [key: string]: any }) => {
        setShowPaxModal(false)

        // S7-07: Extract approved amount from PAX host information
        // PAX returns approved amount in hostInformation field — may differ from requested
        let actualApproved = pendingPaxAmount
        if (response.hostInformation) {
            const hostParts = typeof response.hostInformation === 'string'
                ? response.hostInformation.split('\x1f')
                : []
            const approvedAmountCents = parseInt(hostParts[4] || '0', 10) // Host field 5 = approved amount
            if (approvedAmountCents > 0) {
                actualApproved = approvedAmountCents / 100
            }
        }

        // S7-07: Detect partial authorization
        if (actualApproved < pendingPaxAmount - 0.01) {
            setPartialAuth({
                requested: pendingPaxAmount,
                approved: actualApproved,
                remaining: pendingPaxAmount - actualApproved
            })
        } else {
            setPartialAuth(null)
        }

        addPayment(pendingPaxMethod, actualApproved)
    }

    // PAX terminal was cancelled/closed — stay in checkout
    const handlePaxClose = () => {
        setShowPaxModal(false)
    }

    // Add a payment to the split payment list
    const addPayment = (method: string, amount: number) => {
        const paymentAmount = Math.min(amount, remainingToPay)

        if (paymentAmount <= 0) return

        const newPayments = [...payments, { type: method, amount: paymentAmount }]
        setPayments(newPayments)
        setTenderAmount('')

        const newTotalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0) + lotteryCredit + giftCardCredit

        // Check if fully paid
        if (newTotalPaid >= (subtotal - discount + cardFee + tax + tip) - 0.01) {
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
            giftCardCredit,
            cardFee,
            tax,
            tip,
            total: subtotal - discount + cardFee + tax + tip,
            paymentMethod: primaryMethod,
            payments: finalPayments, // Array of all payments
            cashAmount: cashTotal,
            cardAmount: cardTotal,
            paxProcessed: finalPayments.some(p => p.type !== 'CASH'), // Flag: PAX already handled card charges
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

    // Undo last payment
    const removeLastPayment = () => {
        if (payments.length > 0) {
            setPayments(payments.slice(0, -1))
        }
    }

    if (!isOpen) return null

    const changeDue = payments.length > 0 && payments[payments.length - 1]?.type === 'CASH'
        ? (payments.reduce((s, p) => s + p.amount, 0) + lotteryCredit + giftCardCredit) - (subtotal - discount + cardFee + tax + tip)
        : 0

    // S5-4: Locked screen overlay
    if (isLocked && isOpen) {
        return (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center">
                <div className="bg-stone-900 rounded-2xl p-8 w-96 border border-amber-500/30 shadow-2xl">
                    <div className="flex flex-col items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Lock className="h-8 w-8 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Session Locked</h2>
                        <p className="text-stone-400 text-sm text-center">Inactivity detected. Enter your PIN to resume.</p>
                    </div>
                    <input
                        type="password"
                        value={lockPin}
                        onChange={e => setLockPin(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                        placeholder="Enter PIN"
                        autoFocus
                        maxLength={6}
                        className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] mb-4"
                    />
                    <button
                        onClick={handleUnlock}
                        disabled={lockPin.length < 4}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        Unlock
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-stone-900 rounded-3xl w-full max-w-5xl h-[80vh] overflow-hidden shadow-2xl border border-stone-800 flex flex-col">
                    {/* S5-2: Terminal Disconnect Banner */}
                    {terminalDisconnected && (
                        <div className="bg-red-900/30 border-b border-red-700 px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-400">
                                <WifiOff className="h-5 w-5" />
                                <span className="font-medium text-sm">Terminal disconnected — card payments unavailable</span>
                            </div>
                            <button onClick={handleTerminalReconnect} className="px-3 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded-lg text-xs font-medium flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" /> Reconnect
                            </button>
                        </div>
                    )}

                    {/* S5-1: Card Timeout Banner */}
                    {cardTimedOut && (
                        <div className="bg-amber-900/30 border-b border-amber-700 px-6 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-amber-400">
                                <AlertTriangle className="h-5 w-5" />
                                <span className="font-medium text-sm">Card reader timed out (attempt {cardRetryCount + 1})</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleCardRetry} className="px-3 py-1 bg-amber-800 hover:bg-amber-700 text-amber-200 rounded-lg text-xs font-medium flex items-center gap-1">
                                    <RefreshCw className="h-3 w-3" /> Retry
                                </button>
                                <button onClick={() => { setShowPaxModal(false); setCardTimedOut(false) }} className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg text-xs font-medium">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* S5-1b: Timeout recovery instructions */}
                    {timeoutRecovery && cardTimedOut && (
                        <div className="bg-stone-800/50 border-b border-stone-700 px-6 py-2">
                            <p className="text-xs text-stone-400 mb-1 font-medium">Recovery Steps:</p>
                            <ul className="text-xs text-stone-500 space-y-0.5">
                                {timeoutRecovery.steps.map((step: string, i: number) => (
                                    <li key={i}>â€¢ {step}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Header */}
                    <div className="bg-stone-950 px-8 py-4 flex items-center justify-between border-b border-stone-800">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">Checkout</h2>
                            {payments.length > 0 && (
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                                    Split: {payments.length} payment{payments.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                            <X className="h-8 w-8" />
                        </button>
                    </div>

                    <div className="flex-1 grid grid-cols-12 gap-0 relative">
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
                            <button
                                onClick={() => setShowGiftCardModal(true)}
                                className="h-16 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 rounded-xl font-bold transition-all border border-purple-700/50 flex items-center justify-center gap-2"
                            >
                                <Gift className="h-5 w-5" />
                                Gift Card
                            </button>
                            <button
                                onClick={() => setShowLotteryInput(true)}
                                className="h-16 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 rounded-xl font-bold transition-all border border-purple-700/50 flex items-center justify-center gap-2"
                            >
                                <Trophy className="h-5 w-5" />
                                Lottery
                            </button>

                            {/* Split payment hint */}
                            <div className="bg-stone-800/50 rounded-lg p-2 border border-stone-700/50">
                                <p className="text-stone-500 text-[10px] text-center leading-snug">
                                    Enter partial $ amount then tap card to split across multiple cards
                                </p>
                            </div>
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
                                <div className={`text-5xl font-bold text-right tracking-tight ${remainingToPay <= 0.01 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                    ${remainingToPay.toFixed(2)}
                                </div>
                            </div>

                            <div className="flex-1 bg-stone-900 rounded-xl border border-stone-800 p-4 mb-4 overflow-y-auto">
                                <div className="flex justify-between text-stone-500 text-sm border-b border-stone-800 pb-2 mb-2">
                                    <span>Type</span>
                                    <span>Amount</span>
                                </div>
                                {/* Applied Payments */}
                                {payments.length === 0 && lotteryCredit === 0 && giftCardCredit === 0 ? (
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
                                        {giftCardCredit > 0 && (
                                            <div className="flex justify-between items-center text-pink-400">
                                                <span className="flex items-center gap-2">
                                                    <Gift className="h-4 w-4" />
                                                    Gift Card
                                                </span>
                                                <span className="font-medium">${giftCardCredit.toFixed(2)}</span>
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
                                                        {p.type !== 'CASH' && <span className="text-stone-600 text-xs ml-1">✓ PAX</span>}
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

                            {changeDue > 0.01 && (
                                <div className="bg-stone-900 rounded-xl border border-stone-800 p-4 mb-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-stone-400">Change Due</span>
                                        <span className="text-2xl font-bold text-orange-400">${changeDue.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Undo Last Payment */}
                            {payments.length > 0 && remainingToPay > 0.01 && (
                                <button
                                    onClick={removeLastPayment}
                                    className="w-full py-2 mb-2 bg-amber-900/20 hover:bg-amber-900/40 text-amber-400 border border-amber-900/50 rounded-xl font-medium text-sm transition-all"
                                >
                                    Undo Last Payment
                                </button>
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
                            onClick={() => handleQuickAmount(Math.ceil(subtotal - discount + cardFee + tax + tip))}
                            className="py-3 bg-amber-900/20 hover:bg-amber-900/40 text-amber-400 border border-amber-900/50 rounded-xl font-bold text-lg transition-all"
                        >
                            ${Math.ceil(subtotal - discount + cardFee + tax + tip).toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Gift Card Modal */}
            <GiftCardModal
                isOpen={showGiftCardModal}
                onClose={() => setShowGiftCardModal(false)}
                franchiseId="current"
                onRedeemGiftCard={(code, balance) => {
                    setGiftCardCredit(prev => prev + balance)
                    setShowGiftCardModal(false)
                }}
            />

            {/* PAX Terminal Modal — Opens per split card charge */}
            <PaxPaymentModal
                isOpen={showPaxModal}
                onClose={handlePaxClose}
                onSuccess={handlePaxSuccess}
                amount={pendingPaxAmount}
                invoiceNumber={String(Math.floor(Date.now() / 1000) % 9999 + 1)}
            />
        </>
    )
}
