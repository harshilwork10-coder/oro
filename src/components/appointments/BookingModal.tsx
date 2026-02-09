'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Scissors, Search, Check } from 'lucide-react'

type BookingModalProps = {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    selectedDate: Date
    selectedTime?: Date | null
}

export default function BookingModal({ isOpen, onClose, onSuccess, selectedDate, selectedTime }: BookingModalProps) {
    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [locations, setLocations] = useState<any[]>([])
    const [bookedSlots, setBookedSlots] = useState<Map<string, 'online' | 'store'>>(new Map())
    const [serviceSearch, setServiceSearch] = useState('')
    const [serviceCategory, setServiceCategory] = useState('All')
    const [timePeriod, setTimePeriod] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning')
    const [employeePrices, setEmployeePrices] = useState<Map<string, { price: number, duration: number }>>(new Map())

    // Phone-first lookup states
    const [phoneNumber, setPhoneNumber] = useState('')
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle')
    const [foundCustomer, setFoundCustomer] = useState<any>(null)
    const [newCustomer, setNewCustomer] = useState({
        firstName: '',
        lastName: '',
        email: ''
    })

    // Toast notification
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Format time from selectedTime or default to 09:00
    const getInitialTime = () => {
        if (selectedTime) {
            const hours = selectedTime.getHours().toString().padStart(2, '0')
            const mins = selectedTime.getMinutes().toString().padStart(2, '0')
            return `${hours}:${mins}`
        }
        return '09:00'
    }

    const [formData, setFormData] = useState({
        clientId: '',
        serviceIds: [] as string[],
        employeeId: '',
        date: selectedDate.toISOString().split('T')[0],
        time: getInitialTime(),
        notes: ''
    })

    // Toggle service selection (multi-select)
    const toggleService = (serviceId: string) => {
        setFormData(prev => {
            const isSelected = prev.serviceIds.includes(serviceId)
            return {
                ...prev,
                serviceIds: isSelected
                    ? prev.serviceIds.filter(id => id !== serviceId)
                    : [...prev.serviceIds, serviceId]
            }
        })
    }

    // Computed totals for selected services
    const selectedServices = services.filter(s => formData.serviceIds.includes(s.id))
    const totalDuration = selectedServices.reduce((sum, s) => {
        const empPrice = employeePrices.get(s.id)
        return sum + (empPrice?.duration ?? s.duration)
    }, 0)
    const totalPrice = selectedServices.reduce((sum, s) => {
        const empPrice = employeePrices.get(s.id)
        return sum + Number(empPrice?.price ?? s.price)
    }, 0)

    // Phone lookup function
    const lookupByPhone = async (phone: string) => {
        if (phone.length < 10) return

        setSearchStatus('searching')
        try {
            const res = await fetch(`/api/clients/lookup?phone=${encodeURIComponent(phone)}`)
            if (res.ok) {
                const customer = await res.json()
                if (customer && customer.id) {
                    setFoundCustomer(customer)
                    setFormData({ ...formData, clientId: customer.id })
                    setSearchStatus('found')
                } else {
                    setSearchStatus('not_found')
                    setFoundCustomer(null)
                }
            } else {
                setSearchStatus('not_found')
                setFoundCustomer(null)
            }
        } catch (error) {
            setSearchStatus('not_found')
            setFoundCustomer(null)
        }
    }

    // Fetch real services and employees from database
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch('/api/services')
                if (res.ok) {
                    const data = await res.json()
                    // Handle both array and { services: [...] } formats
                    const servicesArray = Array.isArray(data) ? data : (data.services || data.data || [])
                    // Map to expected format with category
                    const formattedServices = servicesArray.map((s: any) => ({
                        id: s.id,
                        name: s.name,
                        duration: s.duration || 30,
                        price: s.price || 0,
                        category: s.category || 'General',
                        popular: s.popular || false
                    }))
                    setServices(formattedServices)
                }
            } catch (error) {
                console.error('Error fetching services:', error)
            }
        }

        const fetchEmployees = async () => {
            try {
                const res = await fetch('/api/employees')
                if (res.ok) {
                    const data = await res.json()
                    // Handle both array and { employees: [...] } formats
                    const employeesArray = Array.isArray(data) ? data : (data.employees || data.data || [])
                    setEmployees(employeesArray)
                }
            } catch (error) {
                console.error('Error fetching employees:', error)
            }
        }

        const fetchLocations = async () => {
            try {
                const res = await fetch('/api/locations')
                if (res.ok) {
                    const data = await res.json()
                    const locationsArray = Array.isArray(data) ? data : (data.locations || data.data || [])
                    setLocations(locationsArray)
                }
            } catch (error) {
                console.error('Error fetching locations:', error)
            }
        }

        fetchServices()
        fetchEmployees()
        fetchLocations()
    }, [])

    // Fetch employee-specific prices when employee is selected
    useEffect(() => {
        const fetchEmployeePrices = async () => {
            if (!formData.employeeId) {
                setEmployeePrices(new Map())
                return
            }

            try {
                const res = await fetch(`/api/employees/services?employeeId=${formData.employeeId}`)
                if (res.ok) {
                    const data = await res.json()
                    const priceMap = new Map<string, { price: number, duration: number }>()
                    if (data.services) {
                        data.services.forEach((s: any) => {
                            priceMap.set(s.serviceId, {
                                price: Number(s.employeePrice),
                                duration: s.employeeDuration
                            })
                        })
                    }
                    setEmployeePrices(priceMap)
                }
            } catch (error) {
                console.error('Error fetching employee prices:', error)
            }
        }

        fetchEmployeePrices()
    }, [formData.employeeId])

    // Fetch booked appointments to show unavailable slots
    useEffect(() => {
        const fetchBookedSlots = async () => {
            if (!formData.date || !locations[0]?.id) {
                setBookedSlots(new Map())
                return
            }

            try {
                const startDate = `${formData.date}T00:00:00`
                const endDate = `${formData.date}T23:59:59`
                let url = `/api/appointments?startDate=${startDate}&endDate=${endDate}&locationId=${locations[0]?.id}`
                if (formData.employeeId) {
                    url += `&employeeId=${formData.employeeId}`
                }

                const res = await fetch(url)
                if (res.ok) {
                    const appointments = await res.json()
                    const slotsMap = new Map<string, 'online' | 'store'>()

                    appointments.forEach((apt: any) => {
                        const startTime = new Date(apt.startTime)
                        const endTime = new Date(apt.endTime)
                        // Mark all 30-min slots that overlap with this appointment
                        const current = new Date(startTime)
                        while (current < endTime) {
                            const slotKey = `${current.getHours().toString().padStart(2, '0')}:${current.getMinutes().toString().padStart(2, '0')}`
                            // Check if it's an online booking (has source = 'ONLINE' or similar)
                            slotsMap.set(slotKey, apt.source === 'ONLINE' ? 'online' : 'store')
                            current.setMinutes(current.getMinutes() + 30)
                        }
                    })

                    setBookedSlots(slotsMap)
                }
            } catch (error) {
                console.error('Error fetching booked slots:', error)
            }
        }

        fetchBookedSlots()
    }, [formData.date, formData.employeeId, locations])


    async function handleSubmit() {
        setLoading(true)
        try {
            let clientId = formData.clientId

            // Create new customer if not found
            if (searchStatus === 'not_found') {
                if (!newCustomer.firstName) {
                    setToast({ message: 'Please enter customer name', type: 'error' })
                    setLoading(false)
                    return
                }

                const customerRes = await fetch('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...newCustomer,
                        phone: phoneNumber
                    })
                })

                if (customerRes.ok) {
                    const customer = await customerRes.json()
                    clientId = customer.id
                } else {
                    setToast({ message: 'Failed to create customer', type: 'error' })
                    setLoading(false)
                    return
                }
            }

            const startTime = new Date(`${formData.date}T${formData.time}`)
            const endTime = new Date(startTime.getTime() + (totalDuration || 30) * 60000)

            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    serviceId: formData.serviceIds[0], // Primary service for backward compat
                    serviceIds: formData.serviceIds,
                    clientId,
                    locationId: locations[0]?.id, // Use first location from user's franchise
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                })
            })

            if (res.ok) {
                onSuccess()
            } else {
                const errorData = await res.json().catch(() => ({}))
                const errorMsg = errorData.error || 'Failed to book appointment'
                setToast({ message: errorMsg, type: 'error' })
            }
        } catch (error) {
            console.error('Error booking:', error)
            setToast({ message: 'Error booking appointment', type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-stone-700 flex items-center justify-between bg-stone-800/50">
                    <h2 className="text-2xl font-bold text-white">New Appointment</h2>
                    <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Phone-First Customer Lookup */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Customer Phone Number
                        </label>
                        <div className="relative">
                            <input
                                type="tel"
                                placeholder="Enter phone number..."
                                value={phoneNumber}
                                maxLength={10}
                                onChange={(e) => {
                                    const phone = e.target.value.replace(/\D/g, '').slice(0, 10)
                                    setPhoneNumber(phone)
                                    // Auto-lookup when 10 digits entered
                                    if (phone.length === 10) {
                                        lookupByPhone(phone)
                                    } else {
                                        setSearchStatus('idle')
                                        setFoundCustomer(null)
                                        setFormData({ ...formData, clientId: '' })
                                    }
                                }}
                                className={`w-full px-4 py-3 bg-stone-800 border rounded-xl text-white text-lg tracking-wider focus:ring-2 focus:ring-purple-500 focus:border-transparent ${phoneNumber.length > 0 && phoneNumber.length < 10
                                    ? 'border-amber-500'
                                    : phoneNumber.length >= 10
                                        ? 'border-emerald-500'
                                        : 'border-stone-700'
                                    }`}
                            />
                            {phoneNumber.length > 0 && phoneNumber.length < 10 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">
                                    {10 - phoneNumber.length} more digits
                                </span>
                            )}
                            {searchStatus === 'searching' && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                </div>
                            )}
                        </div>

                        {/* Customer Found */}
                        {searchStatus === 'found' && foundCustomer && (
                            <div className="mt-3 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                                    {foundCustomer.firstName?.[0] || '?'}
                                </div>
                                <div>
                                    <p className="font-semibold text-emerald-100">
                                        {foundCustomer.firstName} {foundCustomer.lastName}
                                    </p>
                                    <p className="text-sm text-emerald-300">Returning Customer ✓</p>
                                </div>
                            </div>
                        )}

                        {/* New Customer - Ask for Name */}
                        {searchStatus === 'not_found' && (
                            <div className="mt-3 p-4 bg-purple-500/20 border border-purple-500/50 rounded-xl space-y-3">
                                <p className="text-sm text-purple-200 font-medium">
                                    ✨ New customer! Enter their name:
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="First Name *"
                                        value={newCustomer.firstName}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                                        className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={newCustomer.lastName}
                                        onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                                        className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <input
                                    type="email"
                                    placeholder="Email (optional)"
                                    value={newCustomer.email}
                                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        )}
                    </div>

                    {/* Service Selection - Category Tabs (No Scroll!) */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">
                            Select Service
                        </label>
                        {/* Category Tabs - Dynamic from services */}
                        {services.length > 0 && (
                            <div className="flex gap-1 mb-3 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setServiceCategory('All')}
                                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 min-h-[44px] ${serviceCategory === 'All'
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                        }`}
                                >
                                    All Services
                                </button>
                                {/* Dynamic categories from actual services */}
                                {[...new Set(services.map(s => s.category))].map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setServiceCategory(cat)}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 min-h-[44px] ${serviceCategory === cat
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Empty State when no services */}
                        {services.length === 0 && (
                            <div className="p-6 bg-stone-800/50 border border-stone-700 rounded-xl text-center">
                                <Scissors className="h-10 w-10 text-stone-500 mx-auto mb-3" />
                                <p className="text-stone-400 font-medium">No services available</p>
                                <p className="text-stone-500 text-sm mt-1">Services need to be added first in the dashboard</p>
                            </div>
                        )}

                        {/* Services Grid (No Scroll) */}
                        {services.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {services
                                    .filter(s => serviceCategory === 'All' ? true : s.category === serviceCategory)
                                    .slice(0, 8)
                                    .map(service => {
                                        const isSelected = formData.serviceIds.includes(service.id)
                                        const empPrice = employeePrices.get(service.id)
                                        const displayPrice = empPrice?.price ?? service.price
                                        const displayDuration = empPrice?.duration ?? service.duration
                                        const hasCustomPrice = !!empPrice
                                        return (
                                            <button
                                                key={service.id}
                                                type="button"
                                                onClick={() => toggleService(service.id)}
                                                className={`p-4 rounded-xl text-left transition-all border-2 min-h-[64px] active:scale-[0.98] relative ${isSelected
                                                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                                                    : 'bg-stone-800 border-stone-700 hover:border-stone-500 text-stone-200'
                                                    }`}
                                            >
                                                {/* Checkmark badge */}
                                                {isSelected && (
                                                    <div className="absolute -top-2 -right-2 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-2 ring-stone-900">
                                                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-base truncate pr-2">{service.name}</span>
                                                    <span className={`font-bold text-base whitespace-nowrap ${hasCustomPrice ? 'text-orange-400' : 'text-emerald-400'}`}>
                                                        ${Number(displayPrice).toFixed(0)}
                                                        {hasCustomPrice && <span className="text-xs ml-1">★</span>}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-stone-400">{displayDuration} mins</span>
                                            </button>
                                        )
                                    })}
                            </div>
                        )}

                        {/* Selected indicator */}
                        {formData.serviceIds.length > 0 && (
                            <div className="mt-2 text-sm text-purple-300">
                                ✓ {formData.serviceIds.length} service{formData.serviceIds.length > 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>

                    {/* Employee & Time */}
                    {/* Stylist & Time - No Scroll */}
                    <div className="space-y-4">
                        {/* Stylist */}
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">Stylist</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, employeeId: '' })}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formData.employeeId === ''
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                                        }`}
                                >
                                    Any Available
                                </button>
                                {employees.map(emp => (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, employeeId: emp.id })}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px] active:scale-95 ${formData.employeeId === emp.id
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                            }`}
                                    >
                                        {emp.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                            />
                        </div>

                        {/* Time Slots - Filter by Period */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-stone-300">Time</label>
                                <div className="flex gap-2">
                                    {(['Morning', 'Afternoon', 'Evening'] as const).map(period => (
                                        <button
                                            key={period}
                                            type="button"
                                            onClick={() => setTimePeriod(period)}
                                            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all min-h-[40px] active:scale-95 ${timePeriod === period
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                                }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {(timePeriod === 'Morning'
                                    ? ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
                                    : timePeriod === 'Afternoon'
                                        ? ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30']
                                        : ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30']
                                ).map(time => {
                                    const [h, m] = time.split(':')
                                    const hour = parseInt(h)
                                    const displayTime = `${hour > 12 ? hour - 12 : hour}:${m}${hour >= 12 ? 'p' : 'a'}`
                                    const bookingType = bookedSlots.get(time)
                                    const isBooked = !!bookingType

                                    // Color coding: red for store, blue for online, green for available
                                    const getButtonClass = () => {
                                        if (formData.time === time) {
                                            return 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                        }
                                        if (bookingType === 'store') {
                                            return 'bg-red-600/30 text-red-300 border border-red-500/50 cursor-not-allowed'
                                        }
                                        if (bookingType === 'online') {
                                            return 'bg-blue-600/30 text-blue-300 border border-blue-500/50 cursor-not-allowed'
                                        }
                                        return 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                    }

                                    return (
                                        <button
                                            key={time}
                                            type="button"
                                            disabled={isBooked}
                                            onClick={() => !isBooked && setFormData({ ...formData, time })}
                                            className={`py-3 rounded-xl text-sm font-semibold transition-all min-h-[52px] active:scale-95 ${getButtonClass()}`}
                                            title={isBooked ? `Booked (${bookingType})` : 'Available'}
                                        >
                                            {displayTime}
                                            {bookingType === 'store' && <span className="block text-[10px] opacity-75">Store</span>}
                                            {bookingType === 'online' && <span className="block text-[10px] opacity-75">Online</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-stone-300 mb-2">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Any special requests..."
                            className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 h-16 resize-none text-sm"
                        />
                    </div>
                    {/* Confirmation Summary Strip */}
                    {formData.serviceIds.length > 0 && (
                        <div className="mt-2 p-4 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-purple-200">
                                        <Scissors className="h-4 w-4" />
                                        <span className="font-medium">{formData.serviceIds.length} service{formData.serviceIds.length > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-stone-300">
                                        <Clock className="h-4 w-4" />
                                        <span>{totalDuration} min</span>
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-emerald-400">
                                    ${totalPrice.toFixed(2)}
                                </div>
                            </div>
                            {formData.serviceIds.length > 1 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {selectedServices.map(s => (
                                        <span key={s.id} className="text-xs bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full">
                                            {s.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-stone-700 bg-stone-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-xl transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || formData.serviceIds.length === 0 || (searchStatus !== 'found' && (searchStatus !== 'not_found' || !newCustomer.firstName))}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Booking...' : 'Confirm Booking'}
                    </button>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div
                    className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                >
                    <span className="text-white">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}

