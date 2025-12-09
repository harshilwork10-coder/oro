'use client'

import { useState, useEffect } from 'react'
import { Gift, Star, Tag, X, Check, Loader2, AlertCircle } from 'lucide-react'

interface CustomerPromo {
    id: string
    code: string
    discount: number
    discountType: 'PERCENT' | 'FIXED'
    description: string
    expiresAt: string
    ruleType: string
}

interface LoyaltyMember {
    id: string
    phone: string
    pointsBalance: number
    lifetimePoints: number
    lifetimeSpend: number
    tier?: string
}

interface CustomerDiscountsProps {
    franchiseId: string
    customerPhone?: string
    customerId?: string
    orderTotal: number
    onDiscountApplied: (discount: number, source: 'PROMO' | 'LOYALTY', details: { promoId?: string; pointsUsed?: number }) => void
    onClose: () => void
}

export default function CustomerDiscounts({
    franchiseId,
    customerPhone,
    customerId,
    orderTotal,
    onDiscountApplied,
    onClose
}: CustomerDiscountsProps) {
    const [loading, setLoading] = useState(true)
    const [promos, setPromos] = useState<CustomerPromo[]>([])
    const [loyalty, setLoyalty] = useState<LoyaltyMember | null>(null)
    const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState('')
    const [applying, setApplying] = useState<string | null>(null)
    const [error, setError] = useState('')

    // Fetch promos and loyalty on mount
    useEffect(() => {
        if (customerPhone || customerId) {
            fetchDiscounts()
        } else {
            setLoading(false)
        }
    }, [customerPhone, customerId])

    const fetchDiscounts = async () => {
        setLoading(true)
        setError('')

        try {
            // Fetch active promos for this customer
            const promoParams = new URLSearchParams()
            if (customerId) promoParams.append('clientId', customerId)
            if (customerPhone) promoParams.append('phone', customerPhone.replace(/\D/g, ''))

            const [promoRes, loyaltyRes] = await Promise.all([
                fetch(`/api/customer-promo?${promoParams}`),
                customerPhone
                    ? fetch(`/api/loyalty/members?phone=${encodeURIComponent(customerPhone.replace(/\D/g, ''))}&franchiseId=${franchiseId}`)
                    : Promise.resolve(null)
            ])

            if (promoRes.ok) {
                const promoData = await promoRes.json()
                // Filter to active, non-redeemed promos
                setPromos(promoData.filter((p: any) => p.status === 'ACTIVE' && new Date(p.expiresAt) > new Date()))
            }

            if (loyaltyRes && loyaltyRes.ok) {
                const loyaltyData = await loyaltyRes.json()
                if (loyaltyData.member) {
                    setLoyalty(loyaltyData.member)
                }
            }
        } catch (err) {
            console.error('Failed to fetch discounts:', err)
            setError('Failed to load discount options')
        } finally {
            setLoading(false)
        }
    }

    const applyPromo = async (promo: CustomerPromo) => {
        setApplying(promo.id)
        setError('')

        try {
            // Mark promo as redeemed
            const res = await fetch('/api/customer-promo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promoId: promo.id })
            })

            if (!res.ok) {
                throw new Error('Failed to redeem promo')
            }

            // Calculate discount value
            const discountValue = promo.discountType === 'PERCENT'
                ? (orderTotal * promo.discount / 100)
                : promo.discount

            onDiscountApplied(discountValue, 'PROMO', { promoId: promo.id })
        } catch (err) {
            setError('Failed to apply promo')
        } finally {
            setApplying(null)
        }
    }

    const applyLoyaltyPoints = async () => {
        if (!loyalty) return

        const pointsToUse = parseInt(loyaltyPointsToUse) || 0
        if (pointsToUse <= 0 || pointsToUse > loyalty.pointsBalance) {
            setError('Invalid points amount')
            return
        }

        setApplying('loyalty')
        setError('')

        try {
            const res = await fetch('/api/loyalty/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memberId: loyalty.id,
                    points: -pointsToUse,
                    description: 'POS Redemption',
                    transactionType: 'REDEMPTION'
                })
            })

            if (!res.ok) {
                throw new Error('Failed to redeem points')
            }

            // Assume 100 points = $1
            const discountValue = pointsToUse / 100

            onDiscountApplied(discountValue, 'LOYALTY', { pointsUsed: pointsToUse })
        } catch (err) {
            setError('Failed to redeem loyalty points')
        } finally {
            setApplying(null)
        }
    }

    const getPromoLabel = (type: string) => {
        switch (type) {
            case 'WIN_BACK': return 'Win-Back Offer'
            case 'BIRTHDAY': return 'Birthday Reward'
            case 'FIRST_VISIT': return 'First Visit'
            default: return 'Special Offer'
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <span className="ml-3 text-gray-600">Loading discounts...</span>
                </div>
            </div>
        )
    }

    const hasNoDiscounts = promos.length === 0 && !loyalty

    return (
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                    <Gift className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">Customer Discounts</h2>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {hasNoDiscounts && (
                    <div className="text-center py-8 text-gray-500">
                        <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No active discounts for this customer</p>
                        <p className="text-sm mt-1">Win-back and birthday promos will appear here</p>
                    </div>
                )}

                {/* Active Promos Section */}
                {promos.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Gift className="w-4 h-4 text-pink-500" />
                            Available Promotions
                        </h3>
                        {promos.map((promo) => (
                            <div key={promo.id} className="border border-pink-200 bg-pink-50 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <span className="inline-block px-2 py-0.5 bg-pink-200 text-pink-800 text-xs rounded-full mb-1">
                                            {getPromoLabel(promo.ruleType)}
                                        </span>
                                        <p className="font-medium text-gray-900">
                                            {promo.discountType === 'PERCENT'
                                                ? `${promo.discount}% Off`
                                                : `$${promo.discount.toFixed(2)} Off`}
                                        </p>
                                        <p className="text-sm text-gray-600">{promo.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Expires: {new Date(promo.expiresAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => applyPromo(promo)}
                                        disabled={applying !== null}
                                        className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {applying === promo.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        Apply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Loyalty Points Section */}
                {loyalty && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            Loyalty Points
                        </h3>
                        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-2xl font-bold text-amber-700">
                                        {loyalty.pointsBalance.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-600">Available Points</p>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                    <p>100 pts = $1.00</p>
                                    <p className="font-medium text-amber-700">
                                        Max: ${(loyalty.pointsBalance / 100).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {loyalty.pointsBalance >= 100 && (
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={loyaltyPointsToUse}
                                        onChange={(e) => setLoyaltyPointsToUse(e.target.value)}
                                        placeholder="Points to redeem"
                                        min="100"
                                        step="100"
                                        max={loyalty.pointsBalance}
                                        className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    />
                                    <button
                                        onClick={applyLoyaltyPoints}
                                        disabled={applying !== null || !loyaltyPointsToUse || parseInt(loyaltyPointsToUse) < 100}
                                        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {applying === 'loyalty' ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        Redeem
                                    </button>
                                </div>
                            )}

                            {loyalty.pointsBalance < 100 && (
                                <p className="text-sm text-amber-700">
                                    Need {100 - loyalty.pointsBalance} more points to redeem
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Important Note */}
                {promos.length > 0 && loyalty && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Only one discount can be applied per transaction.
                            Choose the best option for your customer.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
