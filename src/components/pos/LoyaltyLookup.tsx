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
    Sparkles
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

    // Format phone as user types
    const formatPhone = (value: string) => {
        const digits = value.replace(/\D/g, '')
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value)
        setPhone(formatted)
        setData(null)
        setError('')
        setShowEnroll(false)
        setMessage('')
    }

    const handleLookup = async () => {
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length < 10) {
            setError('Please enter a valid 10-digit phone number')
            return
        }

        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/loyalty/members?phone=${cleanPhone}&franchiseId=${franchiseId}`)
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
        const cleanPhone = phone.replace(/\D/g, '')
        setEnrolling(true)
        setError('')
        try {
            const res = await fetch('/api/loyalty/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: cleanPhone,
                    name: enrollName,
                    email: enrollEmail,
                    franchiseId
                })
            })
            const result = await res.json()
            if (result.success) {
                setMessage('Welcome to Rewards! 🎉')
                setShowEnroll(false)
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
                    phone: phone.replace(/\D/g, ''),
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
                    phone: phone.replace(/\D/g, ''),
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
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-5 shadow-xl">
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

            {/* Phone Input */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={handlePhoneChange}
                        onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                        className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 text-lg"
                    />
                </div>
                <button
                    onClick={handleLookup}
                    disabled={loading || phone.replace(/\D/g, '').length < 10}
                    className="px-5 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium flex items-center gap-2 transition-all"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Lookup
                </button>
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
                            placeholder="Customer Name"
                            value={enrollName}
                            onChange={(e) => setEnrollName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            value={enrollEmail}
                            onChange={(e) => setEnrollEmail(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                        />
                        <button
                            onClick={handleEnroll}
                            disabled={enrolling || !enrollName.trim()}
                            className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-50 rounded-xl text-white font-bold flex items-center justify-center gap-2"
                        >
                            {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Enroll & Earn Rewards
                        </button>
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
                                    placeholder={`Max ${getMaxRedeemable()}`}
                                    value={redeemPoints}
                                    onChange={(e) => setRedeemPoints(e.target.value)}
                                    max={getMaxRedeemable()}
                                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                                />
                                <button
                                    onClick={() => setRedeemPoints(String(getMaxRedeemable()))}
                                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300"
                                >
                                    Max
                                </button>
                                <button
                                    onClick={handleRedeem}
                                    disabled={redeeming || !redeemPoints}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white font-medium flex items-center gap-2"
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
                </div>
            )}
        </div>
    )
}
