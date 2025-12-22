'use client'

import { useState, useEffect, use } from 'react'
import { Calendar, Clock, User, MapPin, Check, ArrowLeft, ArrowRight, Loader2, Star, Phone, Mail, Sparkles, FileText, Shield, ChevronRight, Zap, Heart, CheckCircle2 } from 'lucide-react'

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

type Step = 'service' | 'datetime' | 'details' | 'waiver' | 'confirm' | 'success'

const STEPS = ['service', 'datetime', 'details', 'waiver', 'confirm'] as const

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [franchise, setFranchise] = useState<any>(null)
    const [services, setServices] = useState<Service[]>([])
    const [staff, setStaff] = useState<Staff[]>([])
    const [locations, setLocations] = useState<Location[]>([])
    const [slots, setSlots] = useState<TimeSlot[]>([])

    const [step, setStep] = useState<Step>('service')
    const [selectedService, setSelectedService] = useState<Service | null>(null)
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedTime, setSelectedTime] = useState<string>('')
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
    const [customerName, setCustomerName] = useState('')
    const [customerEmail, setCustomerEmail] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [confirmation, setConfirmation] = useState<any>(null)

    // Waiver state
    const [waiverText, setWaiverText] = useState('')
    const [waiverAccepted, setWaiverAccepted] = useState(false)
    const [signatureName, setSignatureName] = useState('')

    // Animation state
    const [isTransitioning, setIsTransitioning] = useState(false)

    useEffect(() => {
        fetchBookingData()
    }, [slug])

    useEffect(() => {
        if (selectedLocation?.id && selectedDate && selectedService?.id) {
            fetchAvailability()
        }
    }, [selectedLocation, selectedDate, selectedService, selectedStaff])

    const fetchBookingData = async () => {
        try {
            const res = await fetch(`/api/public/booking/services?slug=${slug}`)
            if (!res.ok) {
                setError('Business not found')
                return
            }
            const data = await res.json()
            setFranchise(data.franchise)
            setServices(data.services)
            setStaff(data.staff)
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
        if (!selectedLocation?.id || !selectedDate || !selectedService?.id) return
        try {
            const params = new URLSearchParams({
                locationId: selectedLocation.id,
                date: selectedDate,
                serviceId: selectedService.id,
                ...(selectedStaff ? { staffId: selectedStaff.id } : {})
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

    const fetchWaiver = async () => {
        if (!franchise?.id) return
        try {
            const res = await fetch(`/api/public/waiver?franchiseId=${franchise.id}`)
            if (res.ok) {
                const data = await res.json()
                setWaiverText(data.waiverText)
            }
        } catch (err) {
            console.error('Failed to fetch waiver')
        }
    }

    const animateToStep = (newStep: Step) => {
        setIsTransitioning(true)
        setTimeout(() => {
            setStep(newStep)
            setIsTransitioning(false)
        }, 150)
    }

    const handleSubmit = async () => {
        if (!selectedService || !selectedLocation || !selectedTime || !customerName || !customerEmail) return
        if (!waiverAccepted || !signatureName) {
            alert('Please accept the waiver and sign with your name')
            return
        }
        setSubmitting(true)
        try {
            // Save waiver first
            await fetch('/api/public/waiver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId: franchise.id,
                    customerName,
                    customerEmail,
                    customerPhone,
                    signatureName,
                    waiverText
                })
            })

            // Create booking
            const res = await fetch('/api/public/booking/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId: franchise.id,
                    locationId: selectedLocation.id,
                    serviceId: selectedService.id,
                    staffId: selectedStaff?.id,
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
                animateToStep('success')
            } else {
                alert(data.error || 'Failed to book appointment')
            }
        } catch (err) {
            alert('Something went wrong')
        } finally {
            setSubmitting(false)
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

    const currentStepIndex = STEPS.indexOf(step as typeof STEPS[number])
    const progress = step === 'success' ? 100 : ((currentStepIndex + 1) / STEPS.length) * 100

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-violet-500/30 rounded-full animate-spin border-t-violet-500" />
                        <Sparkles className="absolute inset-0 m-auto h-6 w-6 text-violet-400 animate-pulse" />
                    </div>
                    <p className="text-violet-300 mt-6 animate-pulse">Loading your experience...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">😕</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Oops!</h1>
                    <p className="text-red-200">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px]" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Header */}
                <header className="pt-8 pb-6 px-6">
                    <div className="max-w-2xl mx-auto text-center">
                        {/* Brand Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 backdrop-blur-xl border border-violet-500/30 rounded-full text-violet-200 text-sm mb-4">
                            <Zap className="h-3.5 w-3.5 text-yellow-400" />
                            <span>Book in 60 seconds</span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-violet-200 to-fuchsia-200 mb-2">
                            {franchise?.name}
                        </h1>

                        {/* Trust indicators */}
                        <div className="flex items-center justify-center gap-4 text-sm">
                            <div className="flex items-center gap-1 text-amber-400">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Star key={i} className="h-4 w-4 fill-current" />
                                ))}
                                <span className="ml-1 font-semibold text-white">5.0</span>
                            </div>
                            <span className="text-violet-300/50">•</span>
                            <span className="text-violet-300">500+ happy customers</span>
                        </div>
                    </div>
                </header>

                {/* Progress Bar */}
                <div className="px-6 pb-6">
                    <div className="max-w-2xl mx-auto">
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-violet-400/70">
                            <span>{step === 'success' ? 'Done!' : `Step ${currentStepIndex + 1} of ${STEPS.length}`}</span>
                            <span>{Math.round(progress)}% complete</span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <main className={`px-6 pb-20 transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                    <div className="max-w-2xl mx-auto">

                        {/* Step 1: Service Selection */}
                        {step === 'service' && (
                            <div className="space-y-4">
                                <div className="text-center mb-6">
                                    <h2 className="text-xl font-bold text-white mb-1">What would you like?</h2>
                                    <p className="text-violet-300/70">Choose a service to get started</p>
                                </div>

                                {services.length === 0 ? (
                                    <div className="text-center py-12 text-violet-300">No services available</div>
                                ) : (
                                    <div className="space-y-3">
                                        {services.map((service, index) => (
                                            <button
                                                key={service.id}
                                                onClick={() => {
                                                    setSelectedService(service)
                                                    if (selectedLocation || locations.length === 1) {
                                                        if (!selectedLocation && locations.length === 1) setSelectedLocation(locations[0])
                                                        setTimeout(() => animateToStep('datetime'), 200)
                                                    }
                                                }}
                                                className="w-full group relative bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-violet-500/50 rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10"
                                                style={{ animationDelay: `${index * 100}ms` }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Icon */}
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 p-[1px]">
                                                        <div className="w-full h-full rounded-2xl bg-[#0a0a0f] flex items-center justify-center">
                                                            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-violet-400 to-fuchsia-400">
                                                                {service.name.charAt(0)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-white text-lg group-hover:text-violet-200 transition-colors">
                                                            {service.name}
                                                        </h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="inline-flex items-center gap-1 text-sm text-violet-300/70">
                                                                <Clock className="h-3.5 w-3.5" />
                                                                {service.duration} min
                                                            </span>
                                                            {service.category && (
                                                                <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 rounded-full text-xs">
                                                                    {service.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Price */}
                                                    <div className="text-right">
                                                        <span className="text-2xl font-bold text-white">${service.price}</span>
                                                        <ChevronRight className="h-5 w-5 text-violet-400 mt-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                </div>

                                                {/* Hover glow */}
                                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-fuchsia-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 2: Date & Time */}
                        {step === 'datetime' && (
                            <div className="space-y-6">
                                {/* Selected Service Card */}
                                <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-4 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                                        {selectedService?.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{selectedService?.name}</p>
                                        <p className="text-sm text-violet-300">{selectedService?.duration} min • ${selectedService?.price}</p>
                                    </div>
                                    <button onClick={() => animateToStep('service')} className="text-violet-400 hover:text-white text-sm">Change</button>
                                </div>

                                {/* Date Selection */}
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-violet-400" />
                                        Pick a date
                                    </h3>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {getNextDates().map((d, i) => (
                                            <button
                                                key={d.value}
                                                onClick={() => {
                                                    setSelectedDate(d.value)
                                                    setSelectedTime('')
                                                }}
                                                className={`flex-shrink-0 w-[72px] py-3 rounded-xl text-center transition-all duration-200 ${selectedDate === d.value
                                                    ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 scale-105'
                                                    : 'bg-white/5 hover:bg-white/10 text-violet-200'
                                                    }`}
                                                style={{ animationDelay: `${i * 50}ms` }}
                                            >
                                                <p className="text-[10px] font-medium opacity-60">{d.isToday ? 'TODAY' : d.day}</p>
                                                <p className="text-xl font-bold my-0.5">{d.date}</p>
                                                <p className="text-[10px] opacity-60">{d.month}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Time Slots */}
                                {selectedDate && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-violet-400" />
                                            Available times
                                        </h3>
                                        {slots.filter(s => s.available).length === 0 ? (
                                            <div className="text-center py-8 text-violet-300/70">
                                                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                                <p>No times available</p>
                                                <p className="text-sm opacity-70">Try another date</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-4 gap-2">
                                                {slots.filter(s => s.available).map((slot, i) => (
                                                    <button
                                                        key={slot.time}
                                                        onClick={() => {
                                                            setSelectedTime(slot.time)
                                                            setTimeout(() => animateToStep('details'), 200)
                                                        }}
                                                        className={`py-3 rounded-xl font-medium text-sm transition-all duration-200 ${selectedTime === slot.time
                                                            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30'
                                                            : 'bg-white/5 hover:bg-white/10 text-violet-200 hover:scale-105'
                                                            }`}
                                                    >
                                                        {new Date(slot.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Back button */}
                                <button onClick={() => animateToStep('service')} className="flex items-center gap-2 text-violet-400 hover:text-white text-sm mt-4">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>
                            </div>
                        )}

                        {/* Step 3: Details */}
                        {step === 'details' && (
                            <div className="space-y-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <User className="h-8 w-8 text-emerald-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-1">Almost there! 🎉</h2>
                                    <p className="text-violet-300/70">Just a few details and you're done</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-violet-200 mb-2">Your name</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none transition-all focus:ring-2 focus:ring-violet-500/20"
                                            placeholder="John Smith"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-violet-200 mb-2">Email</label>
                                        <input
                                            type="email"
                                            value={customerEmail}
                                            onChange={(e) => setCustomerEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none transition-all focus:ring-2 focus:ring-violet-500/20"
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-violet-200 mb-2">Mobile number</label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none transition-all focus:ring-2 focus:ring-violet-500/20"
                                            placeholder="(555) 123-4567"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        fetchWaiver()
                                        animateToStep('waiver')
                                    }}
                                    disabled={!customerName || !customerEmail || !customerPhone}
                                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-violet-500/25 transition-all hover:scale-[1.02] hover:shadow-violet-500/40"
                                >
                                    Continue <ArrowRight className="h-5 w-5" />
                                </button>

                                <button onClick={() => animateToStep('datetime')} className="flex items-center gap-2 text-violet-400 hover:text-white text-sm mx-auto">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>
                            </div>
                        )}

                        {/* Step 4: Waiver */}
                        {step === 'waiver' && (
                            <div className="space-y-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Shield className="h-8 w-8 text-blue-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-1">Quick Waiver ✍️</h2>
                                    <p className="text-violet-300/70">Standard service agreement</p>
                                </div>

                                {/* Waiver Box */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 max-h-48 overflow-y-auto">
                                    <pre className="text-violet-200/80 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                                        {waiverText || 'Loading...'}
                                    </pre>
                                </div>

                                {/* Accept */}
                                <label className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={waiverAccepted}
                                        onChange={(e) => setWaiverAccepted(e.target.checked)}
                                        className="mt-0.5 w-5 h-5 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500 cursor-pointer"
                                    />
                                    <span className="text-violet-200 text-sm">I agree to the terms above</span>
                                </label>

                                {/* Signature */}
                                <div>
                                    <label className="block text-sm font-medium text-violet-200 mb-2">Sign here (type your name)</label>
                                    <input
                                        type="text"
                                        value={signatureName}
                                        onChange={(e) => setSignatureName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 focus:border-violet-500 rounded-xl px-4 py-3.5 text-white placeholder-violet-300/40 outline-none transition-all italic text-lg"
                                        placeholder="Your full name"
                                    />
                                </div>

                                <button
                                    onClick={() => animateToStep('confirm')}
                                    disabled={!waiverAccepted || !signatureName}
                                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-violet-500/25 transition-all hover:scale-[1.02]"
                                >
                                    Review Booking <ArrowRight className="h-5 w-5" />
                                </button>

                                <button onClick={() => animateToStep('details')} className="flex items-center gap-2 text-violet-400 hover:text-white text-sm mx-auto">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>
                            </div>
                        )}

                        {/* Step 5: Confirm */}
                        {step === 'confirm' && (
                            <div className="space-y-6">
                                <div className="text-center mb-6">
                                    <div className="text-5xl mb-3">🎯</div>
                                    <h2 className="text-xl font-bold text-white mb-1">Ready to book!</h2>
                                    <p className="text-violet-300/70">Review your appointment</p>
                                </div>

                                {/* Summary Cards */}
                                <div className="space-y-3">
                                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                                            <Sparkles className="h-6 w-6 text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-violet-400">Service</p>
                                            <p className="font-semibold text-white">{selectedService?.name}</p>
                                        </div>
                                        <span className="ml-auto text-lg font-bold text-white">${selectedService?.price}</span>
                                    </div>

                                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                            <Calendar className="h-6 w-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-violet-400">When</p>
                                            <p className="font-semibold text-white">
                                                {new Date(selectedTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                {' at '}
                                                {new Date(selectedTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                                            <User className="h-6 w-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-violet-400">Customer</p>
                                            <p className="font-semibold text-white">{customerName}</p>
                                            <p className="text-xs text-violet-300/60">{customerEmail}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02]"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Booking...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-5 w-5" />
                                            Confirm Booking
                                        </>
                                    )}
                                </button>

                                <button onClick={() => animateToStep('waiver')} className="flex items-center gap-2 text-violet-400 hover:text-white text-sm mx-auto">
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </button>
                            </div>
                        )}

                        {/* Success */}
                        {step === 'success' && confirmation && (
                            <div className="text-center py-8">
                                {/* Celebration Animation */}
                                <div className="relative w-24 h-24 mx-auto mb-6">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full animate-ping opacity-20" />
                                    <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                                        <Check className="h-12 w-12 text-white" />
                                    </div>
                                </div>

                                <h2 className="text-2xl font-bold text-white mb-2">You're all set! 🎉</h2>

                                {/* Pending Notice */}
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 max-w-sm mx-auto">
                                    <p className="text-amber-200 text-sm font-medium">
                                        ⏱️ Please allow 10 minutes for confirmation
                                    </p>
                                    <p className="text-amber-200/60 text-xs mt-1">
                                        We'll email you when your stylist confirms
                                    </p>
                                </div>

                                {/* Booking Summary */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-left max-w-sm mx-auto">
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-violet-400">Service</p>
                                            <p className="font-semibold text-white">{confirmation.service}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-violet-400">When</p>
                                            <p className="font-semibold text-white">{confirmation.date} at {confirmation.time}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-violet-400">Where</p>
                                            <p className="font-semibold text-white">{confirmation.location}</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-8 text-violet-400 hover:text-white text-sm font-medium"
                                >
                                    Book another appointment →
                                </button>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="fixed bottom-0 left-0 right-0 py-4 text-center text-violet-400/40 text-xs bg-gradient-to-t from-[#0a0a0f] to-transparent">
                    Powered by <span className="text-violet-400/60 font-medium">Oro</span>
                </footer>
            </div>

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
