'use client'

import { useState, useEffect } from 'react'
import {
    Star,
    Gift,
    Phone,
    Search,
    X,
    Link2,
    Loader2,
    CheckCircle,
    Plus,
    Sparkles,
    Delete
} from 'lucide-react'

interface LoyaltyMember {
    memberId: string
    programId: string
    programName: string
    franchiseId: string
    franchiseName: string
    pointsBalance?: number
    lifetimePoints?: number
    lifetimeSpend?: number
}

interface LoyaltyData {
    type: 'LINKED' | 'INDIVIDUAL' | 'NOT_FOUND'
    phone?: string
    name?: string
    email?: string
    masterAccount?: {
        id: string
        phone: string
        name: string
        pooledBalance: number
        lifetimePoints: number
    }
    linkedPrograms?: LoyaltyMember[]
    memberships?: LoyaltyMember[]
    canLink?: boolean
}

interface LoyaltyLookupProps {
    franchiseId: string
    onPointsApplied?: (pointsValue: number, pointsUsed: number) => void
    onClose?: () => void
    orderTotal?: number
}

export default function LoyaltyLookup({ franchiseId, onPointsApplied, onClose, orderTotal = 0 }: LoyaltyLookupProps) {
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [enrolling, setEnrolling] = useState(false)
    const [redeeming, setRedeeming] = useState(false)
    const [data, setData] = useState<LoyaltyData | null>(null)
    const [error, setError] = useState('')
    const [enrollName, setEnrollName] = useState('')
    const [enrollEmail, setEnrollEmail] = useState('')
    const [showEnroll, setShowEnroll] = useState(false)
    const [redeemPoints, setRedeemPoints] = useState('')
    const [message, setMessage] = useState('')
    const [showNameInput, setShowNameInput] = useState(false)

    // Format phone for display
    const formatPhoneDisplay = (digits: string) => {
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }

    // ═══════════════════════════════════════════════════════════════
    // ON-SCREEN NUMPAD - Touch-first phone entry
    // ═══════════════════════════════════════════════════════════════
    const handleNumpadClick = (key: string) => {
        setError('')
        setMessage('')

        if (key === 'CLEAR') {
            setPhone('')
            setData(null)
            setShowEnroll(false)
            return
        }
        if (key === 'BACKSPACE') {
            setPhone(prev => prev.slice(0, -1))
            setData(null)
            setShowEnroll(false)
            return
        }

        // Only allow 10 digits
        if (phone.length >= 10) return

        setPhone(prev => prev + key)
        setData(null)
        setShowEnroll(false)
    }

    // Auto-lookup when 10 digits entered
    useEffect(() => {
        if (phone.length === 10) {
            handleLookup()
        }
    }, [phone])

    const handleLookup = async () => {
        if (phone.length < 10) {
            setError('Please enter a valid 10-digit phone number')
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/loyalty/members?phone=${phone}&franchiseId=${franchiseId}`)
            const result = await res.json()

            if (result.type === 'NOT_FOUND') {
                setShowEnroll(true)
                setData(null)
            } else {
                setData(result)
                setShowEnroll(false)
            }
        } catch (err) {
            setError('Failed to lookup member')
        } finally {
            setLoading(false)
        }
    }

    const handleEnroll = async () => {
        setEnrolling(true)
        setError('')
        try {
            const res = await fetch('/api/loyalty/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    name: enrollName,
                    email: enrollEmail,
                    franchiseId
                })
            })
            const result = await res.json()
            if (result.success) {
                setMessage('Welcome to Rewards! 🎉')
                setShowEnroll(false)
                setShowNameInput(false)
                handleLookup() // Refresh data
            } else {
                setError(result.error || 'Failed to enroll')
            }
        } catch (err) {
            setError('Failed to enroll')
        } finally {
            setEnrolling(false)
        }
    }

    const handleRedeem = async () => {
        const points = parseInt(redeemPoints)
        if (!points || points <= 0) {
            setError('Enter points to redeem')
            return
        }

        const balance = data?.type === 'LINKED'
            ? data.masterAccount?.pooledBalance || 0
            : data?.memberships?.find(m => m.franchiseId === franchiseId)?.pointsBalance || 0

        if (points > balance) {
            setError('Not enough points')
            return
        }

        setRedeeming(true)
        setError('')
        try {
            const res = await fetch('/api/loyalty/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    type: 'REDEEM',
                    points,
                    description: 'Redeemed at checkout',
                    franchiseId
                })
            })
            const result = await res.json()
            if (result.success) {
                // 100 points = $1
                const dollarValue = points * 0.01
                setMessage(`Redeemed ${points} points ($${dollarValue.toFixed(2)} off)`)
                if (onPointsApplied) {
                    onPointsApplied(dollarValue, points)
                }
                handleLookup() // Refresh balance
            } else {
                setError(result.error || 'Failed to redeem')
            }
        } catch (err) {
            setError('Failed to redeem points')
        } finally {
            setRedeeming(false)
            setRedeemPoints('')
        }
    }

    const handleLinkAccounts = async () => {
        if (!data || data.type !== 'INDIVIDUAL' || !data.canLink) return

        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/loyalty/link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    name: data.name,
                    email: data.email
                })
            })
            const result = await res.json()
            if (result.success) {
                setMessage(`Linked ${result.linkedPrograms.length} programs! Pooled: ${result.masterAccount.pooledBalance} pts`)
                handleLookup() // Refresh data
            } else {
                setError(result.error || 'Failed to link')
            }
        } catch (err) {
            setError('Failed to link accounts')
        } finally {
            setLoading(false)
        }
    }

    const getBalance = () => {
        if (data?.type === 'LINKED') {
            return data.masterAccount?.pooledBalance || 0
        }
        if (data?.type === 'INDIVIDUAL') {
            const membership = data.memberships?.find(m => m.franchiseId === franchiseId)
            return membership?.pointsBalance || 0
        }
        return 0
    }

    const getMaxRedeemable = () => {
        const balance = getBalance()
        // Max redemption = order total in cents (1 point = 1 cent)
        const maxForOrder = Math.floor(orderTotal * 100)
        return Math.min(balance, maxForOrder)
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-5 shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <Star className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Loyalty Rewards</h3>
                        <p className="text-xs text-slate-400">Look up or enroll customer</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                )}
            </div>

            {/* Phone Display */}
            <div className="mb-4">
                <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-4">
                    <Phone className="w-5 h-5 text-slate-500 mr-3" />
                    <span className={`text-2xl font-bold tracking-wider flex-1 ${phone ? 'text-white' : 'text-slate-500'}`}>
                        {phone ? formatPhoneDisplay(phone) : '(___) ___-____'}
                    </span>
                    {loading && <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />}
                </div>
            </div>

            {/* Error/Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}
            {message && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {message}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                ON-SCREEN NUMPAD - Touch-first!
            ═══════════════════════════════════════════════════════════════ */}
            {!data && !showEnroll && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumpadClick(num.toString())}
                            className="h-16 bg-slate-800 hover:bg-slate-700 text-white text-2xl font-bold rounded-xl transition-all active:scale-95 border-b-4 border-slate-900 active:border-b-0"
                        >
                            {num}
                        </button>
                    ))}
                    <button
                        onClick={() => handleNumpadClick('CLEAR')}
                        className="h-16 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-bold rounded-xl transition-all"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => handleNumpadClick('0')}
                        className="h-16 bg-slate-800 hover:bg-slate-700 text-white text-2xl font-bold rounded-xl transition-all active:scale-95 border-b-4 border-slate-900 active:border-b-0"
                    >
                        0
                    </button>
                    <button
                        onClick={() => handleNumpadClick('BACKSPACE')}
                        className="h-16 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all flex items-center justify-center"
                    >
                        <Delete className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* Manual Lookup Button (if auto didn't trigger) */}
            {phone.length >= 10 && !data && !showEnroll && !loading && (
                <button
                    onClick={handleLookup}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-500 rounded-xl text-white font-bold flex items-center justify-center gap-2 mb-4"
                >
                    <Search className="w-5 h-5" />
                    Look Up Member
                </button>
            )}

            {/* Enroll Form */}
            {showEnroll && (
                <div className="border border-slate-700 rounded-xl p-4 mb-4 bg-slate-800/30">
                    <div className="flex items-center gap-2 mb-3">
                        <Plus className="w-4 h-4 text-amber-400" />
                        <span className="text-white font-medium">New Member - Enroll Now</span>
                    </div>
                    <div className="space-y-3">
                        <input
                            type="text"
                            inputMode="text"
                            placeholder="Customer Name"
                            value={enrollName}
                            onChange={(e) => setEnrollName(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-lg"
                            autoFocus
                        />
                        <input
                            type="email"
                            inputMode="email"
                            placeholder="Email (optional)"
                            value={enrollEmail}
                            onChange={(e) => setEnrollEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowEnroll(false); setPhone(''); }}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEnroll}
                                disabled={enrolling || !enrollName.trim()}
                                className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                            >
                                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Enroll
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Found */}
            {data && (data.type === 'LINKED' || data.type === 'INDIVIDUAL') && (
                <div className="space-y-4">
                    {/* Balance Card */}
                    <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-amber-200 text-sm">
                                {data.type === 'LINKED' ? '🔗 Linked Account' : 'Member'}
                            </span>
                            <span className="text-slate-400 text-xs">{data.name || data.masterAccount?.name}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-white">{getBalance().toLocaleString()}</span>
                            <span className="text-amber-300">points</span>
                        </div>
                        <p className="text-amber-200/60 text-xs mt-1">
                            = ${(getBalance() * 0.01).toFixed(2)} value
                        </p>
                    </div>

                    {/* Linked Programs */}
                    {data.type === 'LINKED' && data.linkedPrograms && data.linkedPrograms.length > 0 && (
                        <div className="text-xs text-slate-400">
                            <span className="text-slate-500">Active at:</span>{' '}
                            {data.linkedPrograms.map(p => p.franchiseName).join(', ')}
                        </div>
                    )}

                    {/* Link Suggestion */}
                    {data.type === 'INDIVIDUAL' && data.canLink && data.memberships && data.memberships.length > 1 && (
                        <button
                            onClick={handleLinkAccounts}
                            disabled={loading}
                            className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-xl text-blue-400 text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            <Link2 className="w-4 h-4" />
                            Link {data.memberships.length} programs to pool points
                        </button>
                    )}

                    {/* Redeem Section */}
                    {orderTotal > 0 && getBalance() > 0 && (
                        <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Gift className="w-4 h-4 text-emerald-400" />
                                <span className="text-white font-medium">Redeem Points</span>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={`Max ${getMaxRedeemable()}`}
                                    value={redeemPoints}
                                    onChange={(e) => setRedeemPoints(e.target.value)}
                                    max={getMaxRedeemable()}
                                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 text-lg"
                                />
                                <button
                                    onClick={() => setRedeemPoints(String(getMaxRedeemable()))}
                                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 font-medium"
                                >
                                    Max
                                </button>
                                <button
                                    onClick={handleRedeem}
                                    disabled={redeeming || !redeemPoints}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white font-bold flex items-center gap-2"
                                >
                                    {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                </button>
                            </div>
                            {redeemPoints && parseInt(redeemPoints) > 0 && (
                                <p className="text-emerald-400 text-sm mt-2">
                                    = ${(parseInt(redeemPoints) * 0.01).toFixed(2)} discount
                                </p>
                            )}
                        </div>
                    )}

                    {/* New Lookup Button */}
                    <button
                        onClick={() => { setPhone(''); setData(null); setMessage(''); }}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 font-medium"
                    >
                        Look Up Different Number
                    </button>
                </div>
            )}
        </div>
    )
}
