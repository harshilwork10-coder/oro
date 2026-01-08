'use client'

import { useState, useEffect, use } from 'react'
import { Calendar, Clock, User, MapPin, Check, ArrowLeft, ArrowRight, Loader2, Star, Phone, Mail, Sparkles, Share2, Instagram, Copy, CheckCircle2 } from 'lucide-react'

interface Service {
    id: string
    name: string
    description: string | null
    duration: number
    price: number
    category: string | null
}

interface Staff {
    id: string
    name: string
    image: string | null
    staffSlug: string | null
    bio: string | null
    specialties: string[]
    profilePhotoUrl: string | null
}

interface Location {
    id: string
    name: string
    address: string | null
}

interface TimeSlot {
    time: string
    available: boolean
}

type Step = 'service' | 'datetime' | 'details' | 'confirm' | 'success'

export default function StaffBookingPage({ params }: { params: Promise<{ slug: string, staffSlug: string }> }) {
    const { slug, staffSlug } = use(params)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const [franchise, setFranchise] = useState<any>(null)
    const [staff, setStaff] = useState<Staff | null>(null)
    const [services, setServices] = useState<Service[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [slots, setSlots] = useState<TimeSlot[]>([])

    const [step, setStep] = useState<Step>('service')
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedTime, setSelectedTime] = useState<string>('')
    const [customerName, setCustomerName] = useState('')
    const [customerEmail, setCustomerEmail] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [confirmation, setConfirmation] = useState<any>(null)

    useEffect(() => {
        fetchStaffData()
    }, [slug, staffSlug])

    useEffect(() => {
        if (selectedLocation?.id && selectedDate && selectedService?.id && staff?.id) {
            fetchAvailability()
        }
    }, [selectedLocation, selectedDate, selectedService, staff])

    const fetchStaffData = async () => {
        try {
            const res = await fetch(`/api/public/booking/staff?slug=${slug}&staffSlug=${staffSlug}`)
            if (!res.ok) {
                setError('Stylist not found')
                return
            }
            const data = await res.json()
            setFranchise(data.franchise)
            setStaff(data.staff)
            setServices(data.services)
            setLocations(data.locations)
            if (data.locations.length === 1) {
                setSelectedLocation(data.locations[0])
            }
        } catch (err) {
            setError('Failed to load booking page')
        } finally {
            setLoading(false)
        }
    }

    const fetchAvailability = async () => {
        if (!selectedLocation?.id || !selectedDate || !selectedService?.id || !staff?.id) return
        try {
            const params = new URLSearchParams({
                locationId: selectedLocation.id,
                date: selectedDate,
                serviceId: selectedService.id,
                staffId: staff.id
            })
            const res = await fetch(`/api/public/booking/availability?${params}`)
            if (res.ok) {
                const data = await res.json()
                setSlots(data.slots)
            }
        } catch (err) {
            console.error('Failed to fetch availability')
        }
    }

    const handleSubmit = async () => {
        if (!selectedService || !selectedLocation || !selectedTime || !customerName || !customerEmail || !staff) return
        setSubmitting(true)
        try {
            const res = await fetch('/api/public/booking/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId: franchise.id,
                    locationId: selectedLocation.id,
                    serviceId: selectedService.id,
                    staffId: staff.id,
                    dateTime: selectedTime,
                    customerName,
                    customerEmail,
                    customerPhone,
                    notes
                })
            })
            const data = await res.json()
            if (res.ok) {
                setConfirmation(data.appointment)
                setStep('success')
            } else {
                alert(data.error || 'Failed to book appointment')
            }
        } catch (err) {
            alert('Something went wrong')
        } finally {
            setSubmitting(false)
        }
    }

    const shareLink = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            alert('Could not copy link')
        }
    }

    const getNextDates = () => {
        const dates = []
        const today = new Date()
        for (let i = 0; i < 14; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            dates.push({
                value: date.toISOString().split('T')[0],
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: date.getDate(),
                month: date.toLocaleDateString('en-US', { month: 'short' }),
                isToday: i === 0
            })
        }
        return dates
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-violet-500 mx-auto" />
                    <p className="text-violet-300 mt-4">Loading...</p>
                </div>
            </div>
        )
    }

    if (error || !staff) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">😕</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Stylist Not Found</h1>
                    <p className="text-red-200">{error || 'This stylist is not available for booking'}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/15 rounded-full blur-[100px] animate-pulse" />
            </div>

            <div className="relative z-10">
                {/* Stylist Header */}
                <header className="pt-8 pb-6 px-6">
                    <div className="max-w-2xl mx-auto">
                        {/* Profile Card */}
                        <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-3xl p-6 mb-6">
                            <div className="flex items-start gap-5">
                                {/* Avatar */}
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-[2px] flex-shrink-0">
                                    {staff.profilePhotoUrl || staff.image ? (
                                        <img
                                            src={staff.profilePhotoUrl || staff.image || ''}
                                            alt={staff.name || ''}
                                            className="w-full h-full rounded-2xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-2xl bg-[#0a0a0f] flex items-center justify-center">
                                            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-fuchsia-400">
                                                {staff.name?.charAt(0) || '?'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-2xl font-bold text-white mb-1">{staff.name}</h1>
                                    <p className="text-violet-300 text-sm mb-3">{franchise?.name}</p>

                                    {staff.bio && (
                                        <p className="text-violet-200/70 text-sm mb-3">{staff.bio}</p>
                                    )}

                                    {/* Specialties */}
                                    {staff.specialties && staff.specialties.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {staff.specialties.map((spec, i) => (
                                                <span key={i} className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-xs">
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Share Button */}
                                <button
                                    onClick={shareLink}
                                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                                >
                                    {copied ? (
                                        <Check className="h-5 w-5 text-emerald-400" />
                                    ) : (
                                        <Share2 className="h-5 w-5 text-violet-400" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="px-6 pb-20">
                    <div className="max-w-2xl mx-auto">

                        {/* Step 1: Service Selection */}
                        {step === 'service' && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-white mb-4">Select a Service</h2>

                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => {
                                            setSelectedService(service)
                                            if (selectedLocation || locations.length === 1) {
                                                if (!selectedLocation && locations.length === 1) setSelectedLocation(locations[0])
                                                setStep('datetime')
                                            }
                                        }}
                                        className="w-full group bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/50 rounded-2xl p-5 text-left transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-white text-lg">{service.name}</h3>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-violet-300/70">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {service.duration} min
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xl font-bold text-white">${service.price}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 2: Date & Time */}
                        {step === 'datetime' && (
                            <div className="space-y-6">
                                <button onClick={() => setStep('service')} className="flex items-center gap-2 text-violet-400 hover:text-white text-sm">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>

                                <h2 className="text-xl font-bold text-white">Pick a Date & Time</h2>

                                {/* Date Selection */}
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {getNextDates().map((d) => (
                                        <button
                                            key={d.value}
                                            onClick={() => {
                                                setSelectedDate(d.value)
                                                setSelectedTime('')
                                            }}
                                            className={`flex-shrink-0 w-[72px] py-3 rounded-xl text-center transition-all ${selectedDate === d.value
                                                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white'
                                                    : 'bg-white/5 hover:bg-white/10 text-violet-200'
                                                }`}
                                        >
                                            <p className="text-[10px] opacity-60">{d.isToday ? 'TODAY' : d.day}</p>
                                            <p className="text-xl font-bold">{d.date}</p>
                                            <p className="text-[10px] opacity-60">{d.month}</p>
                                        </button>
                                    ))}
                                </div>

                                {/* Time Slots */}
                                {selectedDate && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-3">Available Times</h3>
                                        {slots.filter(s => s.available).length === 0 ? (
                                            <div className="text-center py-8 text-violet-300/70">
                                                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                                <p>No times available - try another date</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-4 gap-2">
                                                {slots.filter(s => s.available).map((slot) => (
                                                    <button
                                                        key={slot.time}
                                                        onClick={() => {
                                                            setSelectedTime(slot.time)
                                                            setStep('details')
                                                        }}
                                                        className={`py-3 rounded-xl font-medium text-sm transition-all ${selectedTime === slot.time
                                                                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white'
                                                                : 'bg-white/5 hover:bg-white/10 text-violet-200'
                                                            }`}
                                                    >
                                                        {new Date(slot.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Details */}
                        {step === 'details' && (
                            <div className="space-y-6">
                                <button onClick={() => setStep('datetime')} className="flex items-center gap-2 text-violet-400 hover:text-white text-sm">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>

                                <h2 className="text-xl font-bold text-white">Your Details</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-violet-200 mb-2">Your name</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none"
                                            placeholder="John Smith"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-violet-200 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none"
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-violet-200 mb-2">Phone</label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-violet-200 mb-2">Notes (optional)</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none"
                                            placeholder="Any special requests?"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => setStep('confirm')}
                                    disabled={!customerName || !customerEmail || !customerPhone}
                                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
                                >
                                    Continue <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}

                        {/* Step 4: Confirm */}
                        {step === 'confirm' && (
                            <div className="space-y-6">
                                <button onClick={() => setStep('details')} className="flex items-center gap-2 text-violet-400 hover:text-white text-sm">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>

                                <h2 className="text-xl font-bold text-white text-center">Confirm Booking</h2>

                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <User className="h-5 w-5 text-violet-400" />
                                        <div>
                                            <p className="text-xs text-violet-400">With</p>
                                            <p className="font-semibold text-white">{staff.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Sparkles className="h-5 w-5 text-violet-400" />
                                        <div>
                                            <p className="text-xs text-violet-400">Service</p>
                                            <p className="font-semibold text-white">{selectedService?.name} - ${selectedService?.price}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Calendar className="h-5 w-5 text-violet-400" />
                                        <div>
                                            <p className="text-xs text-violet-400">When</p>
                                            <p className="font-semibold text-white">
                                                {new Date(selectedTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                {' at '}
                                                {new Date(selectedTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Booking...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-5 w-5" />
                                            Book Appointment
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Success */}
                        {step === 'success' && confirmation && (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check className="h-10 w-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Booked! 🎉</h2>
                                <p className="text-violet-300 mb-8">See you soon!</p>

                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-left max-w-sm mx-auto">
                                    <p className="text-sm text-violet-400">Your appointment</p>
                                    <p className="font-semibold text-white">{confirmation.service}</p>
                                    <p className="text-violet-300">{confirmation.date} at {confirmation.time}</p>
                                    <p className="text-violet-300">with {staff.name}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-violet-400/40 text-xs bg-gradient-to-t from-[#0a0a0f] to-transparent">
                    Powered by <span className="text-violet-400/60 font-medium">OroNext</span>
                </footer>
            </div>
        </div>
    )
}
