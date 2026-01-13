'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Calendar, Clock, User, MapPin, ChevronLeft, ChevronRight,
    Share2, Copy, Check, DollarSign, Users, Link2, Menu,
    CheckCircle, XCircle, Phone, Play, Loader2, Bell, AlertCircle, CalendarOff
} from 'lucide-react'
import TimeBlockModal from '@/components/modals/TimeBlockModal'

interface RebookingSuggestion {
    client: {
        id: string
        firstName: string
        lastName: string
        phone: string | null
    }
    daysSinceVisit: number
    isOverdue: boolean
    preferredService: { name: string } | null
}

interface Appointment {
    id: string
    startTime: string
    endTime: string
    status: string
    notes?: string
    client: {
        firstName: string
        lastName: string
        phone?: string
    }
    service: {
        name: string
        duration: number
        price: number
    }
}

export default function MySchedulePage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        }
    })

    const user = session?.user as any
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [stats, setStats] = useState({ today: 0, week: 0, earnings: 0 })
    const [rebookingSuggestions, setRebookingSuggestions] = useState<RebookingSuggestion[]>([])
    const [showTimeBlockModal, setShowTimeBlockModal] = useState(false)

    const fetchAppointments = useCallback(async () => {
        if (!user?.id) return
        setLoading(true)
        try {
            const startDate = new Date(selectedDate)
            startDate.setHours(0, 0, 0, 0)
            const endDate = new Date(selectedDate)
            endDate.setHours(23, 59, 59, 999)

            const res = await fetch(
                `/api/appointments?employeeId=${user.id}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            )
            if (res.ok) {
                const data = await res.json()
                setAppointments(data)
            }
        } catch (error) {
            console.error('Failed to fetch appointments:', error)
        } finally {
            setLoading(false)
        }
    }, [user?.id, selectedDate])

    const fetchStats = useCallback(async () => {
        if (!user?.id) return
        // Simple stats calculation
        const todayAppts = appointments.filter(a => a.status !== 'CANCELLED').length
        const earnings = appointments
            .filter(a => a.status === 'COMPLETED')
            .reduce((sum, a) => sum + Number(a.service.price), 0)
        setStats({ today: todayAppts, week: todayAppts * 5, earnings })
    }, [user?.id, appointments])

    useEffect(() => {
        if (user?.id) {
            fetchAppointments()
        }
    }, [user?.id, selectedDate, fetchAppointments])

    useEffect(() => {
        fetchStats()
    }, [appointments, fetchStats])

    // Fetch rebooking suggestions
    useEffect(() => {
        const fetchRebooking = async () => {
            if (!user?.id) return
            try {
                const res = await fetch(`/api/clients/rebooking?staffId=${user.id}&limit=5`)
                if (res.ok) {
                    const data = await res.json()
                    setRebookingSuggestions(data.suggestions || [])
                }
            } catch (error) {
                console.error('Failed to fetch rebooking suggestions:', error)
            }
        }
        fetchRebooking()
    }, [user?.id])

    const navigateDate = (direction: 'prev' | 'next') => {
        const date = new Date(selectedDate)
        date.setDate(date.getDate() + (direction === 'next' ? 1 : -1))
        setSelectedDate(date.toISOString().split('T')[0])
    }

    const shareLink = async () => {
        const staffSlug = user?.staffSlug || user?.id
        const url = `${window.location.origin}/book/${user?.franchise?.slug || 'shop'}/staff/${staffSlug}`
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for mobile
            if (navigator.share) {
                await navigator.share({ title: 'Book with me', url })
            }
        }
    }

    const handleAction = async (id: string, action: 'start' | 'complete' | 'noshow') => {
        try {
            if (action === 'noshow') {
                await fetch(`/api/appointments/${id}/no-show`, { method: 'POST' })
            } else {
                const newStatus = action === 'start' ? 'IN_PROGRESS' : 'COMPLETED'
                await fetch(`/api/appointments/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                })
            }
            fetchAppointments()
        } catch (error) {
            console.error('Failed to update appointment:', error)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'SCHEDULED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'CONFIRMED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'IN_PROGRESS': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'COMPLETED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
            case 'NO_SHOW': return 'bg-red-500/20 text-red-400 border-red-500/30'
            case 'CANCELLED': return 'bg-gray-600/20 text-gray-500 border-gray-600/30'
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }
    }

    const isToday = selectedDate === new Date().toISOString().split('T')[0]
    const dateLabel = isToday
        ? 'Today'
        : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-950 to-stone-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-stone-950/80 backdrop-blur-xl border-b border-stone-800">
                <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                                {user?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-white">{user?.name || 'My Schedule'}</h1>
                                <p className="text-xs text-stone-400">{user?.role || 'Barber'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowTimeBlockModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-full text-sm font-medium transition-all border border-stone-600"
                            >
                                <CalendarOff className="h-4 w-4" />
                                Block Time
                            </button>
                            <button
                                onClick={shareLink}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-sm font-medium transition-all"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                                {copied ? 'Copied!' : 'Share Link'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Row */}
            <div className="px-4 py-4 grid grid-cols-3 gap-3">
                <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-4 text-center">
                    <Calendar className="h-5 w-5 text-violet-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{stats.today}</p>
                    <p className="text-xs text-stone-400">Today</p>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-4 text-center">
                    <Users className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">{appointments.filter(a => a.status === 'COMPLETED').length}</p>
                    <p className="text-xs text-stone-400">Done</p>
                </div>
                <div className="bg-stone-900/50 border border-stone-800 rounded-2xl p-4 text-center">
                    <DollarSign className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-white">${stats.earnings}</p>
                    <p className="text-xs text-stone-400">Earned</p>
                </div>
            </div>

            {/* Rebooking Suggestions */}
            {rebookingSuggestions.length > 0 && (
                <div className="px-4 pb-2">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Bell className="h-5 w-5 text-amber-400" />
                            <h2 className="font-semibold text-white">Clients Due for Visit</h2>
                            <span className="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                                {rebookingSuggestions.length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {rebookingSuggestions.slice(0, 3).map((suggestion) => (
                                <div
                                    key={suggestion.client.id}
                                    className="flex items-center gap-3 p-2 bg-stone-900/50 rounded-xl"
                                >
                                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                        {suggestion.client.firstName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">
                                            {suggestion.client.firstName} {suggestion.client.lastName}
                                        </p>
                                        <p className="text-xs text-stone-400">
                                            {suggestion.isOverdue ? (
                                                <span className="text-red-400">
                                                    <AlertCircle className="h-3 w-3 inline mr-1" />
                                                    {suggestion.daysSinceVisit} days overdue
                                                </span>
                                            ) : (
                                                `Last visit ${suggestion.daysSinceVisit} days ago`
                                            )}
                                        </p>
                                    </div>
                                    {suggestion.client.phone && (
                                        <a
                                            href={`sms:${suggestion.client.phone}`}
                                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs rounded-lg font-medium"
                                        >
                                            Text
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Date Navigation */}
            <div className="px-4 py-2">
                <div className="flex items-center justify-between bg-stone-900/50 border border-stone-800 rounded-xl p-2">
                    <button
                        onClick={() => navigateDate('prev')}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5 text-stone-400" />
                    </button>
                    <div className="text-center">
                        <p className="font-semibold text-white">{dateLabel}</p>
                        <p className="text-xs text-stone-500">{appointments.length} appointments</p>
                    </div>
                    <button
                        onClick={() => navigateDate('next')}
                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                    >
                        <ChevronRight className="h-5 w-5 text-stone-400" />
                    </button>
                </div>
            </div>

            {/* Appointments List */}
            <div className="px-4 py-4 space-y-3">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto" />
                        <p className="text-stone-400 mt-2">Loading...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="h-12 w-12 text-stone-600 mx-auto mb-3" />
                        <p className="text-stone-400">No appointments</p>
                        <p className="text-stone-500 text-sm mt-1">Share your booking link to get started</p>
                    </div>
                ) : (
                    appointments.map((apt) => (
                        <div
                            key={apt.id}
                            className="bg-stone-900/50 border border-stone-800 rounded-2xl p-4 space-y-3"
                        >
                            {/* Time & Status */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-violet-400" />
                                    <span className="font-semibold text-white">
                                        {new Date(apt.startTime).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(apt.status)}`}>
                                    {apt.status.replace('_', ' ')}
                                </span>
                            </div>

                            {/* Client & Service */}
                            <div>
                                <p className="text-lg font-bold text-white">
                                    {apt.client.firstName} {apt.client.lastName}
                                </p>
                                <p className="text-violet-400">{apt.service.name}</p>
                                <p className="text-stone-500 text-sm">
                                    {apt.service.duration} min • ${apt.service.price}
                                </p>
                            </div>

                            {/* Actions */}
                            {apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAction(apt.id, 'start')}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-all"
                                    >
                                        <Play className="h-4 w-4" /> Start
                                    </button>
                                    <button
                                        onClick={() => handleAction(apt.id, 'noshow')}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-medium transition-all"
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                    {apt.client.phone && (
                                        <a
                                            href={`tel:${apt.client.phone}`}
                                            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-sm font-medium transition-all"
                                        >
                                            <Phone className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            ) : apt.status === 'IN_PROGRESS' ? (
                                <button
                                    onClick={() => handleAction(apt.id, 'complete')}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all"
                                >
                                    <CheckCircle className="h-5 w-5" /> Complete
                                </button>
                            ) : null}
                        </div>
                    ))
                )}
            </div>

            {/* Install Prompt (for PWA) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-950 to-transparent pointer-events-none">
                <div className="text-center text-stone-500 text-xs">
                    Powered by Oro 9
                </div>
            </div>

            {/* Time Block Modal */}
            <TimeBlockModal
                isOpen={showTimeBlockModal}
                onClose={() => setShowTimeBlockModal(false)}
                onBlockCreated={() => fetchAppointments()}
            />
        </div>
    )
}
