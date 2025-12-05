'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, User, MapPin } from 'lucide-react'
import BookingModal from '@/components/appointments/BookingModal'

type Appointment = {
    id: string
    startTime: string
    endTime: string
    client: {
        firstName: string
        lastName: string
        email: string
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

    // Mock location ID for now - in real app would come from context/selector
    const locationId = 'clp...'

    useEffect(() => {
        if (status === 'authenticated') {
            fetchAppointments()
        }
    }, [status, currentDate])

    async function fetchAppointments() {
        try {
            // Calculate start/end of current view
            const start = new Date(currentDate)
            start.setHours(0, 0, 0, 0)

            const end = new Date(currentDate)
            end.setHours(23, 59, 59, 999)

            const res = await fetch(`/api/appointments?locationId=${locationId}&startDate=${start.toISOString()}&endDate=${end.toISOString()}`)
            if (res.ok) {
                const data = await res.json()
                setAppointments(data)
            }
        } catch (error) {
            console.error('Error fetching appointments:', error)
        } finally {
            setLoading(false)
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

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Appointments</h1>
                    <p className="text-stone-400">Manage schedule and bookings</p>
                </div>
                <button
                    onClick={() => setShowBookingModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    New Appointment
                </button>
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
                        const hour = i + 8 // Start at 8 AM
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
                        const duration = (end.getTime() - start.getTime()) / (1000 * 60) // minutes

                        // Calculate position
                        const top = ((startHour - 8) * 80) + ((startMin / 60) * 80)
                        const height = (duration / 60) * 80

                        if (startHour < 8 || startHour > 20) return null

                        return (
                            <div
                                key={apt.id}
                                style={{ top: `${top}px`, height: `${height}px`, left: '100px', right: '20px' }}
                                className="absolute bg-purple-600/20 border-l-4 border-purple-500 rounded-r-lg p-3 hover:bg-purple-600/30 transition-colors cursor-pointer overflow-hidden"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-purple-200 text-sm">
                                            {apt.client.firstName} {apt.client.lastName}
                                        </p>
                                        <p className="text-xs text-purple-300">
                                            {apt.service.name}
                                        </p>
                                    </div>
                                    <div className="text-xs text-purple-300 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-xs text-purple-400">
                                    <User className="h-3 w-3" />
                                    {apt.employee.name}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

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
        </div>
    )
}
