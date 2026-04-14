'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface LoyaltyProgramPreview {
    programId: string
    programName: string
    customerLabel: string | null
    progress: number
    threshold: number
    rewardAvailableNow: boolean
}

interface CustomerProfileLoyaltyCardProps {
    clientId: string
    locationId: string
}

export default function CustomerProfileLoyaltyCard({ clientId, locationId }: CustomerProfileLoyaltyCardProps) {
    const [preview, setPreview] = useState<LoyaltyProgramPreview[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const fetchStatus = async () => {
            if (!clientId || !locationId) return

            setLoading(true)
            try {
                // Send EMPTY array for items. We strictly want to know static profile progress.
                const res = await fetch('/api/salon/loyalty/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId,
                        locationId,
                        items: []
                    })
                })

                if (res.ok) {
                    const data = await res.json()
                    setPreview(data.activePrograms || [])
                } else {
                    setPreview([])
                }
            } catch (err) {
                console.error('Failed to load profile loyalty state:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchStatus()
    }, [clientId, locationId])

    if (loading) {
        return <div className="mt-2 text-violet-400/50 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Loading loop...</div>
    }

    if (preview.length === 0) return null

    return (
        <div className="mt-3 space-y-2">
            {preview.map(prog => (
                <div key={prog.programId} className="bg-black/20 rounded border border-emerald-500/10 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-violet-400" />
                        <span className="text-xs font-semibold text-emerald-100">{prog.programName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-stone-400">{prog.progress} / {prog.threshold} {prog.customerLabel || 'visits'}</span>
                        {prog.rewardAvailableNow && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-black bg-emerald-500 text-black">Reward Ready</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
