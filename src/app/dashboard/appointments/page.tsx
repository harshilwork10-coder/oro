'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, User, MapPin, X, Check, XCircle, Phone, Mail, Loader2, CreditCard } from 'lucide-react'
import BookingModal from '@/components/appointments/BookingModal'

type Appointment = {
    id: string
    startTime: string
    endTime: string
    client: {
        firstName: string
        lastName: string
        email: string
        phone?: string
    }
    service: {
        name: string
        duration: number
        price: number
    }
    employee: {
        name: string
    }
    status: string
    notes?: string
}

export default function AppointmentsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [showBookingModal, setShowBookingModal] = useState(false)
    const [selectedTime, setSelectedTime] = useState<Date | null>(null)
    const [view, setView] = useState<'day' | 'week'>('day')
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAppointments()
        }
    }, [status, currentDate])

    async function fetchAppointments() {
        try {
            const start = new Date(currentDate)
            start.setHours(0, 0, 0, 0)

            const end = new Date(currentDate)
            end.setHours(23, 59, 59, 999)

            const res = await fetch(`/api/appointments?startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
            if (res.ok) {
                const data = await res.json()
                setAppointments(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error('Error fetching appointments:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleAppointmentAction(id: string, action: 'approve' | 'cancel') {
        setActionLoading(id)
        try {
            const res = await fetch(`/api/appointments/${id}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action === 'cancel' ? 'reject' : action })
            })

            if (res.ok) {
                fetchAppointments()
                setSelectedAppointment(null)
            } else {
                setToast({ message: 'Failed to update appointment', type: 'error' })
            }
        } catch (error) {
            setToast({ message: 'Something went wrong', type: 'error' })
        } finally {
            setActionLoading(null)
        }
    }

    function navigateDate(direction: 'prev' | 'next') {
        const newDate = new Date(currentDate)
        if (view === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        } else {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        }
        setCurrentDate(newDate)
    }

    function getStatusBadge(status: string) {
        const styles: Record<string, string> = {
            'PENDING_APPROVAL': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
            'SCHEDULED': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
            'CANCELLED': 'bg-red-500/20 text-red-300 border-red-500/30',
            'COMPLETED': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        }
        const labels: Record<string, string> = {
            'PENDING_APPROVAL': '⏳ Pending',
            'SCHEDULED': '✓ Confirmed',
            'CANCELLED': '✕ Cancelled',
            'COMPLETED': '✓ Completed',
        }
        return (
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status] || 'bg-gray-500/20 text-gray-300'}`}>
                {labels[status] || status}
            </span>
        )
    }

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    const pendingCount = appointments.filter(a => a.status === 'PENDING_APPROVAL').length

    return (
        <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Appointments</h1>
                    <p className="text-stone-400">Manage schedule and bookings</p>
                </div>
                <div className="flex items-center gap-4">
                    {pendingCount > 0 && (
                        <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2">
                            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                            <span className="text-amber-300 font-medium">{pendingCount} pending approval</span>
                        </div>
                    )}
                    <button
                        onClick={() => setShowBookingModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        New Appointment
                    </button>
                </div>
            </div>

            {/* Calendar Controls */}
            <div className="bg-white/5 border border-white/10 rounded-t-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigateDate('prev')}
                        className="p-2 hover:bg-white/10 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">
                        {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h2>
                    <button
                        onClick={() => navigateDate('next')}
                        className="p-2 hover:bg-white/10 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 text-sm bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                        Today
                    </button>
                </div>

                <div className="flex bg-stone-900 rounded-lg p-1 border border-stone-700">
                    <button
                        onClick={() => setView('day')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'day' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'
                            }`}
                    >
                        Day
                    </button>
                    <button
                        onClick={() => setView('week')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'week' ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'
                            }`}
                    >
                        Week
                    </button>
                </div>
            </div>

            {/* Calendar Grid (Day View) */}
            <div className="flex-1 bg-stone-900/50 border border-white/10 border-t-0 rounded-b-xl overflow-y-auto relative">
                {/* Time Grid */}
                <div className="min-h-[800px] relative">
                    {Array.from({ length: 13 }).map((_, i) => {
                        const hour = i + 8
                        const isPast = new Date().getHours() > hour && currentDate.toDateString() === new Date().toDateString()

                        return (
                            <div key={hour} className="flex border-b border-white/5 h-20">
                                <div className="w-20 border-r border-white/5 p-2 text-xs text-stone-500 text-right">
                                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                </div>
                                <div
                                    className={`flex-1 relative ${!isPast ? 'cursor-pointer hover:bg-purple-500/10' : 'opacity-50'} transition-colors group`}
                                    onClick={() => {
                                        if (!isPast) {
                                            const selectedTime = new Date(currentDate)
                                            selectedTime.setHours(hour, 0, 0, 0)
                                            setSelectedTime(selectedTime)
                                            setShowBookingModal(true)
                                        }
                                    }}
                                >
                                    {!isPast && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full font-medium flex items-center gap-1">
                                                <Plus className="h-3 w-3" />
                                                Quick Book
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}

                    {/* Appointments */}
                    {appointments.map((apt) => {
                        const start = new Date(apt.startTime)
                        const end = new Date(apt.endTime)
                        const startHour = start.getHours()
                        const startMin = start.getMinutes()
                        const duration = (end.getTime() - start.getTime()) / (1000 * 60)

                        const top = ((startHour - 8) * 80) + ((startMin / 60) * 80)
                        const height = (duration / 60) * 80

                        if (startHour < 8 || startHour > 20) return null

                        const borderColors: Record<string, string> = {
                            'PENDING_APPROVAL': 'border-amber-500 bg-amber-600/20',
                            'SCHEDULED': 'border-emerald-500 bg-emerald-600/20',
                            'CANCELLED': 'border-red-500 bg-red-600/20 opacity-50',
                            'COMPLETED': 'border-blue-500 bg-blue-600/20',
                        }

                        return (
                            <div
                                key={apt.id}
                                style={{ top: `${top}px`, height: `${Math.max(height, 40)}px`, left: '100px', right: '20px' }}
                                onClick={() => setSelectedAppointment(apt)}
                                className={`absolute border-l-4 rounded-r-lg p-3 hover:opacity-90 transition-all cursor-pointer overflow-hidden ${borderColors[apt.status] || 'border-purple-500 bg-purple-600/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-white text-sm">
                                            {apt.client.firstName} {apt.client.lastName}
                                        </p>
                                        <p className="text-xs text-stone-300">
                                            {apt.service.name}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {getStatusBadge(apt.status)}
                                        <p className="text-xs text-stone-400 mt-1 flex items-center gap-1 justify-end">
                                            <Clock className="h-3 w-3" />
                                            {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-stone-400">
                                    <User className="h-3 w-3" />
                                    {apt.employee.name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Appointment Details Modal */}
            {selectedAppointment && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-stone-900 border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-white">Appointment Details</h3>
                                <p className="text-stone-400 text-sm mt-1">
                                    {new Date(selectedAppointment.startTime).toLocaleDateString('en-US', {
                                        weekday: 'long', month: 'long', day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedAppointment(null)}
                                className="p-2 hover:bg-white/10 rounded-lg text-stone-400 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Status */}
                            <div className="flex items-center justify-between">
                                <span className="text-stone-400">Status</span>
                                {getStatusBadge(selectedAppointment.status)}
                            </div>

                            {/* Customer */}
                            <div className="bg-white/5 rounded-xl p-4 space-y-3">
                                <p className="text-sm text-stone-400">Customer</p>
                                <p className="text-lg font-semibold text-white">
                                    {selectedAppointment.client.firstName} {selectedAppointment.client.lastName}
                                </p>
                                <div className="flex items-center gap-4 text-sm">
                                    {selectedAppointment.client.email && (
                                        <a href={`mailto:${selectedAppointment.client.email}`} className="flex items-center gap-2 text-purple-300 hover:text-purple-200">
                                            <Mail className="h-4 w-4" />
                                            {selectedAppointment.client.email}
                                        </a>
                                    )}
                                    {selectedAppointment.client.phone && (
                                        <a href={`tel:${selectedAppointment.client.phone}`} className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200">
                                            <Phone className="h-4 w-4" />
                                            {selectedAppointment.client.phone}
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Service & Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-4">
                                    <p className="text-sm text-stone-400 mb-1">Service</p>
                                    <p className="font-semibold text-white">{selectedAppointment.service.name}</p>
                                    <p className="text-sm text-stone-400">{selectedAppointment.service.duration} min • ${selectedAppointment.service.price}</p>
                                </div>
                                <div className="bg-white/5 rounded-xl p-4">
                                    <p className="text-sm text-stone-400 mb-1">Time</p>
                                    <p className="font-semibold text-white">
                                        {new Date(selectedAppointment.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </p>
                                    <p className="text-sm text-stone-400">with {selectedAppointment.employee.name}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-6 border-t border-white/10 flex gap-3">
                            {selectedAppointment.status === 'PENDING_APPROVAL' && (
                                <>
                                    <button
                                        onClick={() => handleAppointmentAction(selectedAppointment.id, 'approve')}
                                        disabled={actionLoading === selectedAppointment.id}
                                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {actionLoading === selectedAppointment.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Check className="h-5 w-5" />
                                                Approve
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleAppointmentAction(selectedAppointment.id, 'cancel')}
                                        disabled={actionLoading === selectedAppointment.id}
                                        className="flex-1 py-3 bg-red-600/20 text-red-300 border border-red-600/30 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-600/30 transition-all disabled:opacity-50"
                                    >
                                        <XCircle className="h-5 w-5" />
                                        Reject
                                    </button>
                                </>
                            )}

                            {selectedAppointment.status === 'SCHEDULED' && (
                                <div className="flex gap-3 w-full">
                                    {/* Start Checkout Button - Navigate to POS with service */}
                                    <button
                                        onClick={() => {
                                            // Encode appointment data for POS checkout
                                            const checkoutData = {
                                                appointmentId: selectedAppointment.id,
                                                serviceName: selectedAppointment.service.name,
                                                servicePrice: selectedAppointment.service.price,
                                                customerName: `${selectedAppointment.client.firstName} ${selectedAppointment.client.lastName}`,
                                                customerEmail: selectedAppointment.client.email
                                            }
                                            const params = new URLSearchParams({
                                                checkout: JSON.stringify(checkoutData)
                                            })
                                            window.location.href = `/dashboard/pos?${params.toString()}`
                                        }}
                                        className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                                    >
                                        <CreditCard className="h-5 w-5" />
                                        Start Checkout
                                    </button>
                                    <button
                                        onClick={() => handleAppointmentAction(selectedAppointment.id, 'cancel')}
                                        disabled={actionLoading === selectedAppointment.id}
                                        className="flex-1 py-3 bg-red-600/20 text-red-300 border border-red-600/30 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-600/30 transition-all disabled:opacity-50"
                                    >
                                        {actionLoading === selectedAppointment.id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5" />
                                                Cancel
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {(selectedAppointment.status === 'CANCELLED' || selectedAppointment.status === 'COMPLETED') && (
                                <p className="flex-1 text-center text-stone-400 py-3">
                                    No actions available for {selectedAppointment.status.toLowerCase()} appointments
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showBookingModal && (
                <BookingModal
                    isOpen={showBookingModal}
                    onClose={() => {
                        setShowBookingModal(false)
                        setSelectedTime(null)
                    }}
                    onSuccess={() => {
                        fetchAppointments()
                        setShowBookingModal(false)
                        setSelectedTime(null)
                    }}
                    selectedDate={currentDate}
                    selectedTime={selectedTime}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}

