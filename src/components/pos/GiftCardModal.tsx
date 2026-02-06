'use client'

import { useState } from 'react'
import {
    CreditCard,
    Gift,
    X,
    Delete,
    Loader2,
    CheckCircle,
    DollarSign,
    Sparkles,
    Search,
    Printer,
    MessageSquare,
    Mail,
    Phone
} from 'lucide-react'

interface GiftCardModalProps {
    isOpen: boolean
    onClose: () => void
    onSellGiftCard?: (code: string, amount: number) => void
    onRedeemGiftCard?: (code: string, balance: number) => void
    franchiseId: string
}

export default function GiftCardModal({
    isOpen,
    onClose,
    onSellGiftCard,
    onRedeemGiftCard,
    franchiseId
}: GiftCardModalProps) {
    const [mode, setMode] = useState<'SELL' | 'REDEEM'>('SELL')
    const [amount, setAmount] = useState('')
    const [cardCode, setCardCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    // Lookup result for redeem mode
    const [cardData, setCardData] = useState<{
        code: string
        balance: number
        originalAmount: number
        issuedAt: string
    } | null>(null)

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY OPTIONS - How customer receives gift card
    // ═══════════════════════════════════════════════════════════════
    const [showDelivery, setShowDelivery] = useState<'SMS' | 'EMAIL' | null>(null)
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerEmail, setCustomerEmail] = useState('')
    const [sendingDelivery, setSendingDelivery] = useState(false)
    const [deliverySuccess, setDeliverySuccess] = useState('')

    // ═══════════════════════════════════════════════════════════════
    // ON-SCREEN NUMPAD - Touch-first amount entry
    // ═══════════════════════════════════════════════════════════════
    const handleNumpadClick = (key: string) => {
        setError('')
        setSuccess('')

        if (key === 'CLEAR') {
            setAmount('')
            return
        }
        if (key === 'BACKSPACE') {
            setAmount(prev => prev.slice(0, -1))
            return
        }
        if (key === '.' && amount.includes('.')) return

        // Limit decimal places to 2
        if (amount.includes('.')) {
            const [, decimals] = amount.split('.')
            if (decimals && decimals.length >= 2) return
        }

        // Limit to reasonable amount
        const newAmount = amount + key
        if (parseFloat(newAmount) > 500) return

        setAmount(newAmount)
    }

    // Quick amount buttons
    const quickAmounts = [25, 50, 75, 100, 150, 200]

    // ═══════════════════════════════════════════════════════════════
    // SELL GIFT CARD - Issue new card
    // ═══════════════════════════════════════════════════════════════
    const handleSellGiftCard = async () => {
        const value = parseFloat(amount)
        if (!value || value < 5) {
            setError('Minimum gift card amount is $5')
            return
        }
        if (value > 500) {
            setError('Maximum gift card amount is $500')
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/gift-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: value,
                    franchiseId
                })
            })
            const result = await res.json()

            if (result.success || result.code) {
                const code = result.code || result.giftCard?.code
                setSuccess(`Gift Card Created: ${code}`)
                setCardCode(code)
                if (onSellGiftCard) {
                    onSellGiftCard(code, value)
                }
            } else {
                setError(result.error || 'Failed to create gift card')
            }
        } catch (err) {
            setError('Failed to create gift card')
        } finally {
            setLoading(false)
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // REDEEM GIFT CARD - Lookup and apply balance
    // ═══════════════════════════════════════════════════════════════
    const handleCodeInput = (key: string) => {
        setError('')
        setCardData(null)

        if (key === 'CLEAR') {
            setCardCode('')
            return
        }
        if (key === 'BACKSPACE') {
            setCardCode(prev => prev.slice(0, -1))
            return
        }

        // Gift card codes are typically 8-16 alphanumeric
        if (cardCode.length >= 16) return

        setCardCode(prev => (prev + key).toUpperCase())
    }

    const handleLookupCard = async () => {
        if (cardCode.length < 4) {
            setError('Enter gift card code')
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/gift-cards/${cardCode}`)
            const result = await res.json()

            if (result.balance !== undefined) {
                setCardData({
                    code: result.code || cardCode,
                    balance: result.balance,
                    originalAmount: result.originalAmount || result.balance,
                    issuedAt: result.issuedAt || result.createdAt
                })
            } else if (result.error) {
                setError(result.error)
            } else {
                setError('Gift card not found')
            }
        } catch (err) {
            setError('Failed to lookup gift card')
        } finally {
            setLoading(false)
        }
    }

    const handleApplyGiftCard = () => {
        if (cardData && onRedeemGiftCard) {
            onRedeemGiftCard(cardData.code, cardData.balance)
            setSuccess(`Applied $${cardData.balance.toFixed(2)} gift card!`)
        }
    }

    const resetForm = () => {
        setAmount('')
        setCardCode('')
        setCardData(null)
        setError('')
        setSuccess('')
        setShowDelivery(null)
        setCustomerPhone('')
        setCustomerEmail('')
        setDeliverySuccess('')
    }

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY HANDLERS
    // ═══════════════════════════════════════════════════════════════
    const handlePrintReceipt = async () => {
        // Print gift card code on receipt
        setSendingDelivery(true)
        try {
            // In a real implementation, this would trigger the thermal printer
            await new Promise(resolve => setTimeout(resolve, 500)) // Simulate print
            setDeliverySuccess('Printing receipt...')
        } finally {
            setSendingDelivery(false)
        }
    }

    const handleSendSMS = async () => {
        if (customerPhone.length < 10) {
            setError('Enter a valid phone number')
            return
        }
        setSendingDelivery(true)
        setError('')
        try {
            const res = await fetch('/api/notifications/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: customerPhone,
                    message: `Your gift card code is: ${cardCode}\nValue: $${parseFloat(amount).toFixed(2)}\nThank you for your purchase!`
                })
            })
            const result = await res.json()
            if (result.success) {
                setDeliverySuccess(`Sent to ${formatPhoneDisplay(customerPhone)}`)
            } else {
                setError(result.error || 'Failed to send SMS')
            }
        } catch (err) {
            setError('Failed to send SMS')
        } finally {
            setSendingDelivery(false)
        }
    }

    const handleSendEmail = async () => {
        if (!customerEmail.includes('@')) {
            setError('Enter a valid email address')
            return
        }
        setSendingDelivery(true)
        setError('')
        try {
            const res = await fetch('/api/notifications/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: customerEmail,
                    subject: 'Your Gift Card',
                    body: `Your gift card code is: ${cardCode}\nValue: $${parseFloat(amount).toFixed(2)}`
                })
            })
            const result = await res.json()
            if (result.success) {
                setDeliverySuccess(`Sent to ${customerEmail}`)
            } else {
                setError(result.error || 'Failed to send email')
            }
        } catch (err) {
            setError('Failed to send email')
        } finally {
            setSendingDelivery(false)
        }
    }

    // Format phone for display
    const formatPhoneDisplay = (digits: string) => {
        const clean = digits.replace(/\D/g, '')
        if (clean.length <= 3) return clean
        if (clean.length <= 6) return `(${clean.slice(0, 3)}) ${clean.slice(3)}`
        return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6, 10)}`
    }

    // Phone numpad handler
    const handlePhoneNumpad = (key: string) => {
        setError('')
        if (key === 'CLEAR') {
            setCustomerPhone('')
            return
        }
        if (key === 'BACKSPACE') {
            setCustomerPhone(prev => prev.slice(0, -1))
            return
        }
        if (customerPhone.length >= 10) return
        setCustomerPhone(prev => prev + key)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Gift Cards</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => { setMode('SELL'); resetForm(); }}
                        className={`flex-1 py-4 text-center font-bold transition-all ${mode === 'SELL'
                            ? 'bg-purple-900/30 text-purple-400 border-b-2 border-purple-500'
                            : 'text-slate-500 hover:bg-slate-800/50'
                            }`}
                    >
                        <Sparkles className="w-5 h-5 inline-block mr-2" />
                        Sell Gift Card
                    </button>
                    <button
                        onClick={() => { setMode('REDEEM'); resetForm(); }}
                        className={`flex-1 py-4 text-center font-bold transition-all ${mode === 'REDEEM'
                            ? 'bg-emerald-900/30 text-emerald-400 border-b-2 border-emerald-500'
                            : 'text-slate-500 hover:bg-slate-800/50'
                            }`}
                    >
                        <CreditCard className="w-5 h-5 inline-block mr-2" />
                        Redeem Gift Card
                    </button>
                </div>

                <div className="p-6">
                    {/* Error/Success */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">{success}</span>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        SELL MODE - Enter amount with numpad
                    ═══════════════════════════════════════════════════════════════ */}
                    {mode === 'SELL' && !success && (
                        <>
                            {/* Amount Display */}
                            <div className="mb-4">
                                <label className="text-sm text-slate-400 mb-2 block">Gift Card Amount</label>
                                <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4">
                                    <DollarSign className="w-6 h-6 text-purple-400 mr-2" />
                                    <span className={`text-3xl font-bold flex-1 ${amount ? 'text-white' : 'text-slate-500'}`}>
                                        {amount || '0.00'}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Amounts */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {quickAmounts.map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => setAmount(amt.toString())}
                                        className={`py-3 rounded-xl font-bold transition-all ${amount === amt.toString()
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                                            }`}
                                    >
                                        ${amt}
                                    </button>
                                ))}
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handleNumpadClick(num.toString())}
                                        className="h-14 bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold rounded-xl transition-all active:scale-95"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={() => handleNumpadClick('.')}
                                    className="h-14 bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold rounded-xl"
                                >
                                    .
                                </button>
                                <button
                                    onClick={() => handleNumpadClick('0')}
                                    className="h-14 bg-slate-800 hover:bg-slate-700 text-white text-xl font-bold rounded-xl"
                                >
                                    0
                                </button>
                                <button
                                    onClick={() => handleNumpadClick('BACKSPACE')}
                                    className="h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center"
                                >
                                    <Delete className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Sell Button */}
                            <button
                                onClick={handleSellGiftCard}
                                disabled={loading || !amount || parseFloat(amount) < 5}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-all"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Gift className="w-5 h-5" />
                                        Create ${amount || '0'} Gift Card
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        SUCCESS STATE - Show card code + delivery options
                    ═══════════════════════════════════════════════════════════════ */}
                    {mode === 'SELL' && success && cardCode && (
                        <div className="py-2">
                            {/* Card Info Header */}
                            <div className="text-center mb-4 pb-4 border-b border-slate-700">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                        <Gift className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-slate-400 text-sm">Gift Card Created</p>
                                        <p className="text-2xl font-mono font-bold text-white tracking-wider">
                                            {cardCode}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xl font-bold text-purple-400">
                                    ${parseFloat(amount).toFixed(2)}
                                </p>
                            </div>

                            {/* Delivery Success Message */}
                            {deliverySuccess && (
                                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>{deliverySuccess}</span>
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Delivery Options */}
                            <p className="text-center text-slate-400 text-sm mb-3">How does the customer receive this?</p>

                            <div className="space-y-3">
                                {/* Option 1: Print Receipt */}
                                <button
                                    onClick={handlePrintReceipt}
                                    disabled={sendingDelivery}
                                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold flex items-center justify-center gap-3 transition-all"
                                >
                                    <Printer className="w-5 h-5 text-blue-400" />
                                    Print on Receipt
                                </button>

                                {/* Option 2: SMS */}
                                {!showDelivery || showDelivery !== 'SMS' ? (
                                    <button
                                        onClick={() => setShowDelivery('SMS' as any)}
                                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold flex items-center justify-center gap-3"
                                    >
                                        <MessageSquare className="w-5 h-5 text-green-400" />
                                        Text to Customer
                                    </button>
                                ) : (
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                        <div className="flex items-center gap-2 mb-3">
                                            <MessageSquare className="w-4 h-4 text-green-400" />
                                            <span className="text-white font-medium">Enter Phone Number</span>
                                        </div>
                                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg px-3 py-3 mb-3">
                                            <Phone className="w-4 h-4 text-slate-500 mr-2" />
                                            <span className={`text-xl font-bold tracking-wider ${customerPhone ? 'text-white' : 'text-slate-500'}`}>
                                                {customerPhone ? formatPhoneDisplay(customerPhone) : '(___) ___-____'}
                                            </span>
                                        </div>
                                        {/* Mini numpad */}
                                        <div className="grid grid-cols-4 gap-1 mb-3">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                                                <button
                                                    key={num}
                                                    onClick={() => handlePhoneNumpad(num.toString())}
                                                    className="h-10 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-lg"
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => handlePhoneNumpad('BACKSPACE')}
                                                className="h-10 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center"
                                            >
                                                <Delete className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={handleSendSMS}
                                                disabled={sendingDelivery || customerPhone.length < 10}
                                                className="col-span-2 h-10 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                                            >
                                                {sendingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Option 3: Email */}
                                {!showDelivery || showDelivery !== 'EMAIL' ? (
                                    <button
                                        onClick={() => setShowDelivery('EMAIL' as any)}
                                        className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold flex items-center justify-center gap-3"
                                    >
                                        <Mail className="w-5 h-5 text-purple-400" />
                                        Email to Customer
                                    </button>
                                ) : (
                                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Mail className="w-4 h-4 text-purple-400" />
                                            <span className="text-white font-medium">Enter Email Address</span>
                                        </div>
                                        <input
                                            type="email"
                                            inputMode="email"
                                            placeholder="customer@email.com"
                                            value={customerEmail}
                                            onChange={(e) => { setCustomerEmail(e.target.value); setError(''); }}
                                            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 mb-3"
                                        />
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={sendingDelivery || !customerEmail.includes('@')}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-white font-bold flex items-center justify-center gap-2"
                                        >
                                            {sendingDelivery ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Email'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Done Button */}
                            <button
                                onClick={() => { resetForm(); onClose(); }}
                                className="w-full mt-4 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════════════════════════
                        REDEEM MODE - Enter code with alphanumeric pad
                    ═══════════════════════════════════════════════════════════════ */}
                    {mode === 'REDEEM' && !cardData && !success && (
                        <>
                            {/* Code Display */}
                            <div className="mb-4">
                                <label className="text-sm text-slate-400 mb-2 block">Gift Card Code</label>
                                <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4">
                                    <CreditCard className="w-5 h-5 text-emerald-400 mr-3" />
                                    <span className={`text-2xl font-mono font-bold tracking-widest flex-1 ${cardCode ? 'text-white' : 'text-slate-500'}`}>
                                        {cardCode || '- - - - - - - -'}
                                    </span>
                                </div>
                            </div>

                            {/* Alphanumeric Pad */}
                            <div className="grid grid-cols-5 gap-2 mb-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
                                    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K',
                                    'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
                                    'W', 'X', 'Y', 'Z'].map(key => (
                                        <button
                                            key={key}
                                            onClick={() => handleCodeInput(key)}
                                            className="h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all active:scale-95"
                                        >
                                            {key}
                                        </button>
                                    ))}
                                <button
                                    onClick={() => handleCodeInput('BACKSPACE')}
                                    className="h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center"
                                >
                                    <Delete className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Lookup Button */}
                            <button
                                onClick={handleLookupCard}
                                disabled={loading || cardCode.length < 4}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Search className="w-5 h-5" />
                                        Look Up Gift Card
                                    </>
                                )}
                            </button>
                        </>
                    )}

                    {/* Card Found - Show Balance */}
                    {mode === 'REDEEM' && cardData && !success && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <CreditCard className="w-10 h-10 text-white" />
                            </div>
                            <p className="text-slate-400 mb-2">Gift Card Balance:</p>
                            <p className="text-4xl font-bold text-emerald-400 mb-6">
                                ${cardData.balance.toFixed(2)}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCardData(null)}
                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyGiftCard}
                                    className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold"
                                >
                                    Apply to Order
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {mode === 'REDEEM' && success && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle className="w-12 h-12 text-emerald-400" />
                            </div>
                            <p className="text-xl font-bold text-white mb-6">{success}</p>
                            <button
                                onClick={() => { resetForm(); onClose(); }}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
