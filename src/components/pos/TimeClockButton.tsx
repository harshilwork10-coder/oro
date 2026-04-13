'use client'

import React, { useState } from 'react'
import { LogOut, LogIn, Clock } from 'lucide-react'

interface TimeClockButtonProps {
    isClockedIn: boolean
    shiftRequirement: 'NONE' | 'CLOCK_IN_ONLY' | 'CASH_COUNT_ONLY' | 'BOTH'
    locationId: string
    onStatusChange: (isClockedIn: boolean, activeSessionId?: string | null) => void
}

export default function TimeClockButton({
    isClockedIn,
    shiftRequirement,
    locationId,
    onStatusChange
}: TimeClockButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    // Hide entirely if time clock isn't required for this location
    if (shiftRequirement === 'NONE' || shiftRequirement === 'CASH_COUNT_ONLY') {
        return null
    }

    const handleAction = async () => {
        setIsLoading(true)
        try {
            if (isClockedIn) {
                // Clock Out
                // Note: The UI doesn't know the exact time entry ID easily from the button state alone 
                // However, the backend clock-out API might just clock out the open session.
                // Or maybe we just call /api/pos/timeclock/clock-out with locationId.
                const res = await fetch('/api/pos/timeclock/clock-out', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ locationId })
                })
                if (res.ok) {
                    onStatusChange(false, null)
                }
            } else {
                // Clock In
                const res = await fetch('/api/pos/timeclock/clock-in', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ locationId })
                })
                if (res.ok) {
                    const data = await res.json()
                    onStatusChange(true, data.session?.id)
                }
            }
        } catch (error) {
            console.error('Timeclock action failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isClockedIn) {
        return (
            <button
                onClick={handleAction}
                disabled={isLoading}
                className="px-5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/50 rounded-xl font-bold transition-colors flex items-center gap-2"
                title="You are clocked in. Click to Clock Out."
            >
                <Clock className="h-5 w-5" />
                <span>{isLoading ? '...' : 'Clocked In'}</span>
            </button>
        )
    }

    return (
        <button
            onClick={handleAction}
            disabled={isLoading}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
            title="Clock In to process transactions"
        >
            <LogIn className="h-5 w-5" />
            <span>{isLoading ? '...' : 'Clock In'}</span>
        </button>
    )
}
