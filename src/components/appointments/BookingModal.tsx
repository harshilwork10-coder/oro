'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Scissors, Search } from 'lucide-react'

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
    const [serviceSearch, setServiceSearch] = useState('')
    const [serviceCategory, setServiceCategory] = useState('Popular')
    const [timePeriod, setTimePeriod] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning')

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
        serviceId: '',
        employeeId: '',
        date: selectedDate.toISOString().split('T')[0],
        time: getInitialTime(),
        notes: ''
    })

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

    // Mock data fetch
    useEffect(() => {
        setServices([
            // Popular / Favorites
            { id: '1', name: 'Haircut', duration: 30, price: 50, category: 'Hair', popular: true },
            { id: '2', name: 'Color', duration: 120, price: 150, category: 'Color', popular: true },
            { id: '3', name: 'Styling', duration: 45, price: 75, category: 'Hair', popular: true },
            // Hair
            { id: '4', name: 'Men\'s Cut', duration: 20, price: 35, category: 'Hair' },
            { id: '5', name: 'Kids Cut', duration: 20, price: 25, category: 'Hair' },
            { id: '6', name: 'Buzz Cut', duration: 15, price: 20, category: 'Hair' },
            { id: '7', name: 'Trim', duration: 15, price: 25, category: 'Hair' },
            { id: '8', name: 'Bang Trim', duration: 10, price: 15, category: 'Hair' },
            // Color
            { id: '9', name: 'Highlights', duration: 90, price: 120, category: 'Color' },
            { id: '10', name: 'Balayage', duration: 150, price: 200, category: 'Color' },
            { id: '11', name: 'Root Touch-up', duration: 45, price: 75, category: 'Color' },
            { id: '12', name: 'Gloss Treatment', duration: 30, price: 45, category: 'Color' },
            // Treatments
            { id: '13', name: 'Deep Conditioning', duration: 30, price: 40, category: 'Treatments' },
            { id: '14', name: 'Keratin', duration: 120, price: 250, category: 'Treatments' },
            { id: '15', name: 'Scalp Treatment', duration: 30, price: 35, category: 'Treatments' },
            // Nails
            { id: '16', name: 'Manicure', duration: 30, price: 30, category: 'Nails' },
            { id: '17', name: 'Pedicure', duration: 45, price: 45, category: 'Nails' },
            { id: '18', name: 'Gel Nails', duration: 45, price: 55, category: 'Nails' },
            // Waxing
            { id: '19', name: 'Eyebrow Wax', duration: 15, price: 15, category: 'Waxing' },
            { id: '20', name: 'Leg Wax', duration: 45, price: 60, category: 'Waxing' },
        ])

        setEmployees([
            { id: '1', name: 'Sarah Stylist' },
            { id: '2', name: 'Mike Master' }
        ])
    }, [])

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

            const service = services.find(s => s.id === formData.serviceId)
            const startTime = new Date(`${formData.date}T${formData.time}`)
            const endTime = new Date(startTime.getTime() + (service?.duration || 30) * 60000)

            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    clientId,
                    locationId: 'clp...', // Mock location
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString()
                })
            })

            if (res.ok) {
                onSuccess()
            } else {
                setToast({ message: 'Failed to book appointment', type: 'error' })
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
                                onChange={(e) => {
                                    const phone = e.target.value.replace(/\D/g, '')
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
                                className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white text-lg tracking-wider focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
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

                        {/* Category Tabs */}
                        <div className="flex gap-1 mb-3 flex-wrap">
                            {['Popular', 'Hair', 'Color', 'Treatments', 'Nails', 'Waxing'].map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setServiceCategory(cat)}
                                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 min-h-[44px] ${serviceCategory === cat
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                        }`}
                                >
                                    {cat === 'Popular' ? '⭐ ' : ''}{cat}
                                </button>
                            ))}
                        </div>

                        {/* Services Grid (No Scroll) */}
                        <div className="grid grid-cols-2 gap-3">
                            {services
                                .filter(s => serviceCategory === 'Popular' ? s.popular : s.category === serviceCategory)
                                .slice(0, 6)
                                .map(service => (
                                    <button
                                        key={service.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, serviceId: service.id })}
                                        className={`p-4 rounded-xl text-left transition-all border-2 min-h-[64px] active:scale-[0.98] ${formData.serviceId === service.id
                                            ? 'bg-purple-600/30 border-purple-500 text-white shadow-lg shadow-purple-500/20'
                                            : 'bg-stone-800 border-stone-700 hover:border-stone-500 text-stone-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-base truncate">{service.name}</span>
                                            <span className="text-emerald-400 font-bold text-base">${service.price}</span>
                                        </div>
                                        <span className="text-sm text-stone-400">{service.duration} mins</span>
                                    </button>
                                ))}
                        </div>

                        {/* Selected indicator */}
                        {formData.serviceId && (
                            <div className="mt-2 text-sm text-purple-300">
                                ✓ {services.find(s => s.id === formData.serviceId)?.name} selected
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
                                    return (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, time })}
                                            className={`py-3 rounded-xl text-sm font-semibold transition-all min-h-[52px] active:scale-95 ${formData.time === time
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                                                : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
                                                }`}
                                        >
                                            {displayTime}
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
                        disabled={loading || !formData.serviceId || (searchStatus !== 'found' && (searchStatus !== 'not_found' || !newCustomer.firstName))}
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
