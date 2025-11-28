'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, User, Search, Plus, Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns'
import { generateTimeSlots, calculateEndTime, formatAppointmentTime, getAvailableTimeSlots } from '@/lib/appointment-utils'

interface Service {
    id: string
    name: string
    price: number
    duration: number
    category: string
}

interface Client {
    id: string
    firstName: string
    lastName: string
    email?: string
    phone?: string
}

interface Appointment {
    id: string
    startTime: Date
    endTime: Date
    status: string
    client: Client
    service: Service
    employee: {
        id: string
        name: string
    }
}

export default function AppointmentsPage() {
    const { data: session } = useSession()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<Date | null>(null)
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [selectedClient, setSelectedClient] = useState<Client | null>(null)
    const [step, setStep] = useState(1) // 1: Date, 2: Time, 3: Service, 4: Client, 5: Confirm

    const [services, setServices] = useState<Service[]>([])
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [clientSearch, setClientSearch] = useState('')
    const [clientResults, setClientResults] = useState<Client[]>([])
    const [showNewClientForm, setShowNewClientForm] = useState(false)
    const [newClient, setNewClient] = useState({ firstName: '', lastName: '', email: '', phone: '' })
    const [loading, setLoading] = useState(false)

    // Fetch services
    useEffect(() => {
        if (session?.user?.locationId) {
            fetch(`/api/services?locationId=${session.user.locationId}`)
                .then((res) => res.json())
                .then((data) => setServices(data))
                .catch((err) => console.error('Error fetching services:', err))
        }
    }, [session])

    // Fetch appointments for selected date
    useEffect(() => {
        if (session?.user?.locationId && selectedDate) {
            const startDate = startOfDay(selectedDate).toISOString()
            const endDate = addDays(startOfDay(selectedDate), 1).toISOString()

            fetch(`/api/appointments?locationId=${session.user.locationId}&startDate=${startDate}&endDate=${endDate}&employeeId=${session.user.id}`)
                .then((res) => res.json())
                .then((data) => setAppointments(data))
                .catch((err) => console.error('Error fetching appointments:', err))
        }
    }, [session, selectedDate])

    // Search clients
    useEffect(() => {
        if (clientSearch.length >= 2 && session?.user?.franchiseId) {
            fetch(`/api/clients/search?query=${encodeURIComponent(clientSearch)}&franchiseId=${session.user.franchiseId}`)
                .then((res) => res.json())
                .then((data) => setClientResults(data))
                .catch((err) => console.error('Error searching clients:', err))
        } else {
            setClientResults([])
        }
    }, [clientSearch, session])

    const handleCreateClient = async () => {
        if (!newClient.firstName || !newClient.lastName || !session?.user?.franchiseId) return

        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newClient, franchiseId: session.user.franchiseId }),
            })

            if (res.ok) {
                const client = await res.json()
                setSelectedClient(client)
                setShowNewClientForm(false)
                setNewClient({ firstName: '', lastName: '', email: '', phone: '' })
                setStep(5)
            }
        } catch (error) {
            console.error('Error creating client:', error)
        }
    }

    const handleBookAppointment = async () => {
        if (!selectedDate || !selectedTime || !selectedService || !selectedClient || !session?.user) return

        setLoading(true)
        try {
            const endTime = calculateEndTime(selectedTime, selectedService.duration)

            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: selectedClient.id,
                    serviceId: selectedService.id,
                    employeeId: session.user.id,
                    locationId: session.user.locationId,
                    startTime: selectedTime.toISOString(),
                    endTime: endTime.toISOString(),
                }),
            })

            if (res.ok) {
                alert('Appointment booked successfully!')
                resetBooking()
                // Refresh appointments list
                const startDate = startOfDay(selectedDate).toISOString()
                const endDate = addDays(startOfDay(selectedDate), 1).toISOString()
                const appts = await fetch(`/api/appointments?locationId=${session.user.locationId}&startDate=${startDate}&endDate=${endDate}&employeeId=${session.user.id}`)
                setAppointments(await appts.json())
            } else {
                const error = await res.json()
                alert(error.error || 'Failed to book appointment')
            }
        } catch (error) {
            console.error('Error booking appointment:', error)
            alert('Failed to book appointment')
        } finally {
            setLoading(false)
        }
    }

    const resetBooking = () => {
        setSelectedDate(null)
        setSelectedTime(null)
        setSelectedService(null)
        setSelectedClient(null)
        setClientSearch('')
        setStep(1)
    }

    // Calendar helper functions
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const nextMonth = () => setCurrentDate(addDays(currentDate, 30))
    const prevMonth = () => setCurrentDate(addDays(currentDate, -30))

    // Get available time slots for selected date
    const timeSlots = selectedDate && selectedService
        ? getAvailableTimeSlots(selectedDate, selectedService.duration, appointments as any[])
        : []

    return (
        <div className="min-h-screen bg-stone-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Appointment Booking</h1>
                        <p className="text-stone-400 mt-1">Schedule appointments for walk-in customers</p>
                    </div>
                    {step > 1 && (
                        <button
                            onClick={resetBooking}
                            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg transition-colors flex items-center gap-2"
                        >
                            <X className="h-4 w-4" />
                            Cancel Booking
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Booking Flow */}
                    <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
                        {/* Step Indicator */}
                        <div className="flex items-center justify-between mb-6">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <div key={s} className="flex items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-stone-800 text-stone-500'
                                            }`}
                                    >
                                        {step > s ? <Check className="h-4 w-4" /> : s}
                                    </div>
                                    {s < 5 && (
                                        <div
                                            className={`h-1 w-12 ${step > s ? 'bg-orange-600' : 'bg-stone-800'
                                                }`}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step 1: Select Date */}
                        {step === 1 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-orange-500" />
                                    Select Date
                                </h2>

                                <div className="bg-stone-950 rounded-xl p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <button onClick={prevMonth} className="p-2 hover:bg-stone-800 rounded-lg">
                                            <ChevronLeft className="h-5 w-5 text-stone-400" />
                                        </button>
                                        <h3 className="text-lg font-semibold text-white">
                                            {format(currentDate, 'MMMM yyyy')}
                                        </h3>
                                        <button onClick={nextMonth} className="p-2 hover:bg-stone-800 rounded-lg">
                                            <ChevronRight className="h-5 w-5 text-stone-400" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                            <div key={day} className="text-center text-xs font-medium text-stone-500 py-2">
                                                {day}
                                            </div>
                                        ))}
                                        {calendarDays.map((day) => {
                                            const isPast = isBefore(day, startOfDay(new Date()))
                                            const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')

                                            return (
                                                <button
                                                    key={day.toString()}
                                                    onClick={() => !isPast && setSelectedDate(day)}
                                                    disabled={isPast}
                                                    className={`aspect-square rounded-lg text-sm font-medium transition-colors ${isPast
                                                        ? 'text-stone-700 cursor-not-allowed'
                                                        : isSelected
                                                            ? 'bg-orange-600 text-white'
                                                            : isToday(day)
                                                                ? 'bg-stone-800 text-white border border-orange-500'
                                                                : 'text-stone-300 hover:bg-stone-800'
                                                        } ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}`}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {selectedDate && (
                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full mt-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-colors"
                                    >
                                        Continue to Time Selection
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Step 2: Select Service (moved before time to get duration) */}
                        {step === 2 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-orange-500" />
                                    Select Service
                                </h2>

                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {services.map((service) => (
                                        <button
                                            key={service.id}
                                            onClick={() => {
                                                setSelectedService(service)
                                                setStep(3)
                                            }}
                                            className={`w-full p-4 rounded-xl border transition-all text-left ${selectedService?.id === service.id
                                                ? 'bg-orange-900/20 border-orange-500'
                                                : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-semibold text-white">{service.name}</div>
                                                    <div className="text-sm text-stone-400">
                                                        {service.duration} min • ${service.price}
                                                    </div>
                                                </div>
                                                {selectedService?.id === service.id && (
                                                    <Check className="h-5 w-5 text-orange-500" />
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Select Time */}
                        {step === 3 && selectedService && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-orange-500" />
                                    Select Time
                                </h2>

                                <p className="text-stone-400 mb-4">
                                    {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                </p>

                                <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                                    {timeSlots.map((slot) => (
                                        <button
                                            key={slot.time}
                                            onClick={() => {
                                                if (slot.available) {
                                                    setSelectedTime(slot.dateTime)
                                                    setStep(4)
                                                }
                                            }}
                                            disabled={!slot.available}
                                            className={`py-3 px-2 rounded-lg text-sm font-medium transition-colors ${!slot.available
                                                ? 'bg-stone-950 text-stone-700 cursor-not-allowed'
                                                : selectedTime && format(selectedTime, 'h:mm a') === slot.time
                                                    ? 'bg-orange-600 text-white'
                                                    : 'bg-stone-950 text-white hover:bg-stone-800 border border-stone-800'
                                                }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Step 4: Select/Create Client */}
                        {step === 4 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5 text-orange-500" />
                                    Select or Create Client
                                </h2>

                                {!showNewClientForm ? (
                                    <>
                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-stone-500" />
                                            <input
                                                type="text"
                                                value={clientSearch}
                                                onChange={(e) => setClientSearch(e.target.value)}
                                                placeholder="Search by name, phone, or email..."
                                                className="w-full pl-10 pr-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        {clientResults.length > 0 && (
                                            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                                                {clientResults.map((client) => (
                                                    <button
                                                        key={client.id}
                                                        onClick={() => {
                                                            setSelectedClient(client)
                                                            setStep(5)
                                                        }}
                                                        className="w-full p-4 bg-stone-950 border border-stone-800 hover:border-stone-700 rounded-xl text-left transition-colors"
                                                    >
                                                        <div className="font-semibold text-white">
                                                            {client.firstName} {client.lastName}
                                                        </div>
                                                        <div className="text-sm text-stone-400">
                                                            {client.phone || client.email}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setShowNewClientForm(true)}
                                            className="w-full py-3 bg-stone-950 border border-stone-800 hover:border-stone-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus className="h-5 w-5" />
                                            Create New Client
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-stone-400 mb-2">
                                                First Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={newClient.firstName}
                                                onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                                                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-stone-400 mb-2">
                                                Last Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={newClient.lastName}
                                                onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                                                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-stone-400 mb-2">
                                                Phone
                                            </label>
                                            <input
                                                type="tel"
                                                value={newClient.phone}
                                                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-stone-400 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={newClient.email}
                                                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowNewClientForm(false)}
                                                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCreateClient}
                                                disabled={!newClient.firstName || !newClient.lastName}
                                                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl font-medium transition-colors"
                                            >
                                                Create Client
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 5: Confirm Booking */}
                        {step === 5 && selectedDate && selectedTime && selectedService && selectedClient && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Check className="h-5 w-5 text-orange-500" />
                                    Confirm Booking
                                </h2>

                                <div className="bg-stone-950 rounded-xl p-6 space-y-4 mb-4">
                                    <div>
                                        <div className="text-sm text-stone-500">Date & Time</div>
                                        <div className="text-white font-semibold">
                                            {formatAppointmentTime(selectedTime)}
                                        </div>
                                    </div>

                                    <div className="border-t border-stone-800 pt-4">
                                        <div className="text-sm text-stone-500">Service</div>
                                        <div className="text-white font-semibold">{selectedService.name}</div>
                                        <div className="text-sm text-stone-400">
                                            {selectedService.duration} min • ${selectedService.price}
                                        </div>
                                    </div>

                                    <div className="border-t border-stone-800 pt-4">
                                        <div className="text-sm text-stone-500">Client</div>
                                        <div className="text-white font-semibold">
                                            {selectedClient.firstName} {selectedClient.lastName}
                                        </div>
                                        {selectedClient.phone && (
                                            <div className="text-sm text-stone-400">{selectedClient.phone}</div>
                                        )}
                                    </div>

                                    <div className="border-t border-stone-800 pt-4">
                                        <div className="text-sm text-stone-500">Assigned To</div>
                                        <div className="text-white font-semibold">{session?.user?.name}</div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBookAppointment}
                                    disabled={loading}
                                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-800 text-white rounded-xl font-bold transition-colors"
                                >
                                    {loading ? 'Booking...' : 'Confirm Booking'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Today's Appointments */}
                    <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Today's Appointments</h2>

                        {appointments.length === 0 ? (
                            <div className="text-center py-12 text-stone-500">
                                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No appointments for selected date</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {appointments.map((apt) => (
                                    <div
                                        key={apt.id}
                                        className="bg-stone-950 rounded-xl p-4 border border-stone-800"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-semibold text-white">
                                                    {apt.client.firstName} {apt.client.lastName}
                                                </div>
                                                <div className="text-sm text-stone-400 mt-1">
                                                    {apt.service.name}
                                                </div>
                                                <div className="text-sm text-stone-500 mt-1">
                                                    {format(new Date(apt.startTime), 'h:mm a')} - {format(new Date(apt.endTime), 'h:mm a')}
                                                </div>
                                            </div>
                                            <div
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === 'SCHEDULED'
                                                    ? 'bg-blue-900/20 text-blue-400'
                                                    : apt.status === 'COMPLETED'
                                                        ? 'bg-green-900/20 text-green-400'
                                                        : 'bg-red-900/20 text-red-400'
                                                    }`}
                                            >
                                                {apt.status}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
