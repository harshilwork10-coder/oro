'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Gift, CheckCircle, Loader2 } from 'lucide-react'

interface LoyaltyProgramPreview {
    programId: string
    programName: string
    customerLabel: string | null
    progress: number
    threshold: number
    earningToday: number
    newProgress: number
    rewardAvailableNow: boolean
    willUnlockToday: boolean
}

export interface AppliedReward {
    programId: string
    serviceId: string
}

interface SalonLoyaltyCartTrackerProps {
    cart: any[]
    clientId?: string
    locationId?: string
    appliedRewards: AppliedReward[]
    onApplyReward: (programId: string, qualifyingServiceId: string) => void
}

export default function SalonLoyaltyCartTracker({
    cart, clientId, locationId, appliedRewards, onApplyReward
}: SalonLoyaltyCartTrackerProps) {
    const [preview, setPreview] = useState<LoyaltyProgramPreview[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchPreview = async () => {
            if (!clientId || !locationId || cart.length === 0) {
                setPreview([])
                return
            }

            setLoading(true)
            try {
                // Ensure cart maps cleanly into Evaluation Items
                const evalItems = cart.map((item: any) => ({
                    id: item.id, // For tracking the exact target
                    serviceId: item.type === 'SERVICE' ? (item.originalId || item.id) : null,
                    price: item.price,
                    quantity: item.quantity
                }))

                const res = await fetch('/api/salon/loyalty/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId,
                        locationId,
                        items: evalItems
                    })
                })

                if (res.ok) {
                    const data = await res.json()
                    setPreview(data.activePrograms || [])
                } else {
                    setPreview([])
                }
            } catch (err) {
                console.error('Failed to preview loyalty state:', err)
                setPreview([])
            } finally {
                setLoading(false)
            }
        }

        // Debounce slightly to handle rapid cart clicking
        const timeout = setTimeout(fetchPreview, 400)
        return () => clearTimeout(timeout)
    }, [cart, clientId, locationId])

    if (!clientId) return null
    if (preview.length === 0 && !loading) return null

    return (
        <div className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 border border-violet-500/30 rounded-xl p-4 mt-3">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h3 className="font-bold text-violet-100">Beauty Loop</h3>
                </div>
                {loading && <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />}
            </div>

            <div className="space-y-4">
                {preview.map(prog => {
                    const isRewardApplied = appliedRewards.some(r => r.programId === prog.programId)

                    // Finding the best matching item in cart to comp (to pass back to UI state)
                    // The backend preview doesn't tell us exactly which line it wants to comp, 
                    // so we determine it safely by relying on the POS cart structure directly.
                    // This adheres to Option A logic: Find qualifying service locally to apply.
                    
                    return (
                        <div key={prog.programId} className="bg-black/20 rounded-lg p-3 border border-violet-500/20">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-violet-200">{prog.programName}</span>
                                <div className="text-xs font-bold text-violet-400 border border-violet-500/30 px-2 py-1 rounded bg-violet-900/40">
                                    {prog.progress} / {prog.threshold} {prog.customerLabel || 'visits'}
                                </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-stone-800 rounded-full h-2.5 mb-2 overflow-hidden flex">
                                {Array.from({ length: prog.threshold }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-full flex-1 border-r border-black/50 ${
                                            i < prog.progress ? 'bg-violet-500' : 
                                            (i < prog.progress + prog.earningToday ? 'bg-fuchsia-400 animate-pulse' : 'bg-transparent')
                                        }`}
                                    />
                                ))}
                            </div>

                            {/* Status Footer */}
                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-stone-400">
                                    {prog.earningToday > 0 ? (
                                        <span className="text-fuchsia-300 font-medium">✨ Earning +{prog.earningToday} today</span>
                                    ) : 'No qualifying items'}
                                </span>

                                {!isRewardApplied && prog.rewardAvailableNow && (
                                    <button 
                                        onClick={() => {
                                            // The POS page handles finding the exact cart line to zero out
                                            onApplyReward(prog.programId, "") 
                                        }}
                                        className="text-xs bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/50 border border-emerald-500/50 px-3 py-1.5 rounded-md font-bold transition-colors flex items-center gap-1"
                                    >
                                        <Gift className="w-3 h-3" />
                                        Apply Reward
                                    </button>
                                )}

                                {isRewardApplied && (
                                    <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold bg-emerald-900/30 px-2 py-1 rounded-md">
                                        <CheckCircle className="w-3 h-3" />
                                        Reward Applied
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
