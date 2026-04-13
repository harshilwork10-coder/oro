'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock, UserCheck, X, AlertTriangle, Play, Scissors } from 'lucide-react'

interface QueueCustomer {
    id: string
    clientId: string
    firstName: string | null
    lastName: string | null
    phone: string | null
    email: string | null
    status: string
    source: string
    appointmentId: string | null
    checkedInAt: string
    updatedAt: string
}

interface BarberInfo {
    id: string
    name: string
}

interface QueuePanelProps {
    barberList: BarberInfo[]
    onStartService: (customer: QueueCustomer, barberId: string | null) => void
    onCancel: (checkInId: string) => void
    onNoShow: (checkInId: string) => void
}

function getWaitTime(checkedInAt: string): string {
    const diff = Date.now() - new Date(checkedInAt).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ${mins % 60}m`
}

function getSourceBadge(source: string) {
    switch (source) {
        case 'KIOSK': return { label: 'Kiosk', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
        case 'QR_SCAN': return { label: 'QR', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' }
        case 'RECEPTIONIST': return { label: 'Front Desk', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
        case 'WALK_IN': return { label: 'Walk-In', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
        case 'PHONE': return { label: 'Phone', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' }
        default: return { label: source, color: 'bg-stone-500/20 text-stone-400 border-stone-500/30' }
    }
}

export default function QueuePanel({ barberList, onStartService, onCancel, onNoShow }: QueuePanelProps) {
    const [queue, setQueue] = useState<QueueCustomer[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [assignBarberId, setAssignBarberId] = useState<string>('')

    const fetchQueue = useCallback(async () => {
        try {
            const res = await fetch('/api/pos/checked-in')
            if (res.ok) {
                const data = await res.json()
                setQueue(Array.isArray(data) ? data : [])
            }
        } catch (err) {
            console.error('[Queue] Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    // Poll every 15 seconds
    useEffect(() => {
        fetchQueue()
        const interval = setInterval(fetchQueue, 15000)
        return () => clearInterval(interval)
    }, [fetchQueue])

    const waitingCount = queue.filter(c => c.status === 'WAITING').length
    const inServiceCount = queue.filter(c => c.status === 'IN_SERVICE').length

    const handleStartService = (customer: QueueCustomer) => {
        onStartService(customer, assignBarberId || null)
        setExpandedId(null)
        setAssignBarberId('')
        // Optimistically remove from waiting
        setQueue(prev => prev.map(c => c.id === customer.id ? { ...c, status: 'IN_SERVICE' } : c))
    }

    const handleCancel = (checkInId: string) => {
        onCancel(checkInId)
        setExpandedId(null)
        // Optimistically remove
        setQueue(prev => prev.filter(c => c.id !== checkInId))
    }

    const handleNoShow = (checkInId: string) => {
        onNoShow(checkInId)
        setExpandedId(null)
        setQueue(prev => prev.filter(c => c.id !== checkInId))
    }

    if (loading) {
        return (
            <div className="p-4 text-center text-stone-500">
                <Clock className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Loading queue...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Queue Header */}
            <div className="px-4 py-3 border-b border-white/5 bg-black/20">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-400" />
                        Queue
                    </h3>
                    <div className="flex items-center gap-2">
                        {waitingCount > 0 && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold border border-amber-500/30">
                                {waitingCount} waiting
                            </span>
                        )}
                        {inServiceCount > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/30">
                                {inServiceCount} in chair
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {queue.length === 0 ? (
                    <div className="text-center py-8 text-stone-600">
                        <UserCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No customers in queue</p>
                        <p className="text-xs text-stone-700 mt-1">Check in a walk-in or appointment arrival</p>
                    </div>
                ) : (
                    queue.map((customer, idx) => {
                        const isExpanded = expandedId === customer.id
                        const isInService = customer.status === 'IN_SERVICE'
                        const badge = getSourceBadge(customer.source)
                        const hasAppointment = !!customer.appointmentId

                        return (
                            <div
                                key={customer.id}
                                className={`rounded-xl border transition-all duration-200 ${
                                    isInService
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                                }`}
                            >
                                {/* Customer Row */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                                    className="w-full p-3 text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Position / Status */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                                isInService
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {isInService ? <Scissors className="h-4 w-4" /> : idx + 1}
                                            </div>
                                            {/* Name + Phone */}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">
                                                    {customer.firstName} {customer.lastName}
                                                </p>
                                                <p className="text-xs text-stone-500 truncate">{customer.phone}</p>
                                            </div>
                                        </div>
                                        {/* Right side: wait time + badges */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {hasAppointment && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded border border-violet-500/30">
                                                    Appt
                                                </span>
                                            )}
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.color}`}>
                                                {badge.label}
                                            </span>
                                            <span className="text-xs text-stone-500 tabular-nums">
                                                {getWaitTime(customer.checkedInAt)}
                                            </span>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded Actions */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
                                        {!isInService && (
                                            <>
                                                {/* Barber assignment */}
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={assignBarberId}
                                                        onChange={(e) => setAssignBarberId(e.target.value)}
                                                        className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
                                                    >
                                                        <option value="">Assign stylist (optional)</option>
                                                        {barberList.map(b => (
                                                            <option key={b.id} value={b.id}>{b.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {/* Start Service */}
                                                <button
                                                    onClick={() => handleStartService(customer)}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-bold rounded-lg transition-all"
                                                >
                                                    <Play className="h-4 w-4" />
                                                    Start Service
                                                </button>
                                            </>
                                        )}
                                        {/* Cancel / No-Show */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleCancel(customer.id)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                                Cancel
                                            </button>
                                            {hasAppointment && !isInService && (
                                                <button
                                                    onClick={() => handleNoShow(customer.id)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg transition-colors border border-amber-500/20"
                                                >
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    No-Show
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
