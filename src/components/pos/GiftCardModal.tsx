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
    Search
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

                    {/* Success State - Show Card Code */}
                    {mode === 'SELL' && success && cardCode && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                                <Gift className="w-10 h-10 text-white" />
                            </div>
                            <p className="text-slate-400 mb-2">Gift Card Code:</p>
                            <p className="text-3xl font-mono font-bold text-white tracking-widest mb-4">
                                {cardCode}
                            </p>
                            <p className="text-2xl font-bold text-purple-400 mb-6">
                                ${parseFloat(amount).toFixed(2)}
                            </p>
                            <button
                                onClick={() => { resetForm(); onClose(); }}
                                className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold"
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
