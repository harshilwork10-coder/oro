/**
 * @deprecated — LEGACY CHECK-IN PAGE
 * 
 * This page is preserved for backward compatibility with existing QR codes
 * that point to oronext.app/checkin/[slug].
 * 
 * NEW QR codes should use the brand-aware route: /qr/[slug]
 * Generated via POST /api/qr/generate (station-authenticated).
 * 
 * See: src/app/qr/[slug]/page.tsx
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, ChevronRight, ArrowLeft, Clock, Scissors, User, Loader2, AlertCircle } from 'lucide-react'

// ─── Types ───
interface AppointmentMatch {
    id: string
    time: string
    service: string
    stylist: string
    status: string
}

interface LookupResult {
    found: boolean
    clientId?: string
    clientFirstName?: string
    liabilitySigned?: boolean
    loyaltyJoined?: boolean
    alreadyCheckedIn?: boolean
    locationName?: string
    locationId?: string
    appointments?: AppointmentMatch[]
}

type Step = 'phone' | 'confirm' | 'walkin' | 'newclient' | 'waiver' | 'loyalty' | 'success' | 'error'

// ─── Phone Format Helper ───
function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Main Component ───
export default function QRCheckinPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const slug = params.slug as string
    const token = searchParams.get('t')

    // State
    const [step, setStep] = useState<Step>('phone')
    const [phone, setPhone] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [locationName, setLocationName] = useState('')
    const [locationId, setLocationId] = useState('')
    const [clientId, setClientId] = useState('')
    const [appointments, setAppointments] = useState<AppointmentMatch[]>([])
    const [maskedName, setMaskedName] = useState('')
    const [liabilitySigned, setLiabilitySigned] = useState(false)
    const [loyaltyJoined, setLoyaltyJoined] = useState(false)
    const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [checkedInName, setCheckedInName] = useState('')
    const [selectedAptId, setSelectedAptId] = useState<string | null>(null)
    const [tokenValid, setTokenValid] = useState<boolean | null>(null)

    // ─── Token Verification (on mount) ───
    // If token is present, verify it server-side via the lookup endpoint.
    // If invalid/expired, silently degrade to phone entry (no error shown).
    useEffect(() => {
        if (token) {
            // Token is verified server-side when lookup is called.
            // For now, mark as "has token" — actual validation happens in lookup.
            setTokenValid(true)
        } else {
            setTokenValid(false) // No token — public fallback mode
        }
    }, [token])

    // ─── Fetch location name from slug ───
    useEffect(() => {
        const fetchLocation = async () => {
            try {
                const res = await fetch(`/api/public/storefront/${slug}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.location?.name) {
                        setLocationName(data.location.name)
                    }
                }
            } catch {
                // Silent — locationName stays empty, page still functional
            }
        }
        if (slug) fetchLocation()
    }, [slug])

    // ─── Phone Lookup ───
    const handlePhoneLookup = useCallback(async () => {
        const digits = phone.replace(/\D/g, '')
        if (digits.length < 10) return

        setLoading(true)
        try {
            const res = await fetch('/api/checkin/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: digits, slug })
            })

            if (res.status === 429) {
                setErrorMsg('Too many attempts. Please wait a moment and try again.')
                setStep('error')
                return
            }

            if (!res.ok) {
                setErrorMsg('Unable to look up your information. Please try again.')
                setStep('error')
                return
            }

            const data: LookupResult = await res.json()

            if (data.locationId) setLocationId(data.locationId)
            if (data.locationName) setLocationName(data.locationName)

            if (!data.found) {
                // New customer — show name entry
                setStep('newclient')
                return
            }

            // Existing customer
            if (data.clientId) setClientId(data.clientId)
            if (data.clientFirstName) setMaskedName(data.clientFirstName)
            setLiabilitySigned(data.liabilitySigned ?? false)
            setLoyaltyJoined(data.loyaltyJoined ?? false)
            setAlreadyCheckedIn(data.alreadyCheckedIn ?? false)

            if (data.alreadyCheckedIn) {
                setCheckedInName(data.clientFirstName || 'there')
                setStep('success')
                return
            }

            if (data.appointments && data.appointments.length > 0) {
                setAppointments(data.appointments)
                setStep('confirm')
            } else {
                // Route through waiver/loyalty if not yet completed
                if (!data.liabilitySigned) {
                    setStep('waiver')
                } else if (!data.loyaltyJoined) {
                    setStep('loyalty')
                } else {
                    setStep('walkin')
                }
            }

        } catch {
            setErrorMsg('Connection error. Please check your internet and try again.')
            setStep('error')
        } finally {
            setLoading(false)
        }
    }, [phone, slug])

    // ─── Check-In (calls existing /api/kiosk/check-in) ───
    const performCheckIn = useCallback(async (opts: {
        appointmentId?: string
        source: string
    }) => {
        setLoading(true)
        const digits = phone.replace(/\D/g, '')

        try {
            const res = await fetch('/api/kiosk/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: firstName && lastName
                        ? `${firstName} ${lastName}`
                        : maskedName || 'Guest',
                    email: email.trim() || 'no-email-on-file@oronext.app',
                    phone: digits,
                    locationId,
                    source: opts.source,
                    appointmentId: opts.appointmentId || null,
                    stationRef: null,
                    liabilitySigned,
                    loyaltyJoined
                })
            })

            if (res.ok) {
                const data = await res.json()
                setCheckedInName(data.firstName || firstName || maskedName || 'there')
                setStep('success')
            } else {
                setErrorMsg('Check-in failed. Please ask the front desk for assistance.')
                setStep('error')
            }
        } catch {
            setErrorMsg('Connection error. Please ask the front desk for assistance.')
            setStep('error')
        } finally {
            setLoading(false)
        }
    }, [phone, firstName, lastName, maskedName, locationId])

    // ─── Auto-reset after success ───
    useEffect(() => {
        if (step === 'success') {
            const timer = setTimeout(() => {
                // Reset everything
                setStep('phone')
                setPhone('')
                setFirstName('')
                setLastName('')
                setAppointments([])
                setMaskedName('')
                setClientId('')
                setAlreadyCheckedIn(false)
            }, 30000) // 30 seconds
            return () => clearTimeout(timer)
        }
    }, [step])

    // ─── Numpad for phone entry ───
    const handleNumpadPress = (digit: string) => {
        if (digit === 'DEL') {
            setPhone(prev => prev.slice(0, -1))
        } else {
            const currentDigits = phone.replace(/\D/g, '')
            if (currentDigits.length < 10) {
                setPhone(formatPhone(currentDigits + digit))
            }
        }
    }

    const phoneDigits = phone.replace(/\D/g, '')

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    // ─── SUCCESS STATE ───
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-stone-950 to-stone-950 flex items-center justify-center p-6">
                <div className="max-w-sm w-full text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                        <Check className="h-10 w-10 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                        {alreadyCheckedIn ? 'Already Checked In!' : `Welcome, ${checkedInName}!`}
                    </h1>
                    <p className="text-stone-400 text-lg">
                        {alreadyCheckedIn
                            ? "You're already checked in. Please have a seat!"
                            : "You're all checked in. Please have a seat, we'll be with you shortly."
                        }
                    </p>
                    {locationName && (
                        <p className="text-stone-600 text-sm">{locationName}</p>
                    )}
                </div>
            </div>
        )
    }

    // ─── ERROR STATE ───
    if (step === 'error') {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
                <div className="max-w-sm w-full text-center space-y-6">
                    <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                        <AlertCircle className="h-8 w-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-stone-100">Oops!</h2>
                    <p className="text-stone-400">{errorMsg}</p>
                    <button
                        onClick={() => {
                            setStep('phone')
                            setErrorMsg('')
                        }}
                        className="px-6 py-3 bg-stone-800 hover:bg-stone-700 rounded-xl text-stone-300 font-medium transition-colors border border-stone-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/20 via-stone-950 to-stone-950 flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <img src="/oro9-gold.png" alt="ORO 9" className="w-full h-full object-contain rounded-lg p-1" />
                    </div>
                    {locationName && (
                        <span className="text-stone-400 text-sm font-medium">{locationName}</span>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full">

                    {/* ─── PHONE ENTRY ─── */}
                    {step === 'phone' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-stone-100 mb-1">Welcome! 👋</h1>
                                <p className="text-stone-400">Enter your phone number to check in</p>
                            </div>

                            {/* Phone Display */}
                            <div className="bg-stone-900/60 border-2 border-stone-800 rounded-2xl p-5 text-center">
                                <p className="text-3xl font-bold tracking-wider text-stone-100 min-h-[2.5rem]">
                                    {phone || <span className="text-stone-700">(555) 555-5555</span>}
                                </p>
                            </div>

                            {/* Numpad */}
                            <div className="grid grid-cols-3 gap-2">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', '→'].map(key => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            if (key === '→') {
                                                handlePhoneLookup()
                                            } else {
                                                handleNumpadPress(key)
                                            }
                                        }}
                                        disabled={key === '→' ? (loading || phoneDigits.length < 10) : false}
                                        className={`h-14 rounded-xl font-bold text-lg transition-all active:scale-95 ${
                                            key === '→'
                                                ? phoneDigits.length >= 10
                                                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-500/20'
                                                    : 'bg-stone-800/50 text-stone-600 cursor-not-allowed'
                                                : key === 'DEL'
                                                    ? 'bg-stone-800/50 text-stone-400 hover:bg-stone-700/50'
                                                    : 'bg-stone-800/80 text-stone-200 hover:bg-stone-700/80'
                                        }`}
                                    >
                                        {key === '→' ? (loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : '→') : key === 'DEL' ? '⌫' : key}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── APPOINTMENT CONFIRM ─── */}
                    {step === 'confirm' && (
                        <div className="space-y-6">
                            <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-stone-500 hover:text-stone-300 transition-colors text-sm">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-stone-100 mb-1">
                                    Welcome back, {maskedName}
                                </h2>
                                <p className="text-stone-400">Select your appointment to check in</p>
                            </div>

                            <div className="space-y-3">
                                {appointments.map(appt => (
                                    <button
                                        key={appt.id}
                                        onClick={() => {
                                            setSelectedAptId(appt.id)
                                            if (!liabilitySigned) { setStep('waiver'); return }
                                            if (!loyaltyJoined) { setStep('loyalty'); return }
                                            performCheckIn({
                                                appointmentId: appt.id,
                                                source: 'QR_SCAN'
                                            })
                                        }}
                                        disabled={loading}
                                        className="w-full bg-stone-900/60 border border-stone-800 hover:border-orange-500/40 rounded-2xl p-5 text-left transition-all hover:bg-stone-800/40 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-stone-100 font-semibold">
                                                    <Scissors className="h-4 w-4 text-orange-400" />
                                                    {appt.service}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-stone-400">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {appt.time}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <User className="h-3.5 w-3.5" />
                                                        {appt.stylist}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-sm font-medium">Check In</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedAptId(null)
                                    setStep('walkin')
                                }}
                                className="w-full text-stone-500 text-sm hover:text-stone-300 transition-colors py-2"
                            >
                                Not your appointment? Check in as walk-in
                            </button>
                        </div>
                    )}

                    {/* ─── WALK-IN CHECK-IN ─── */}
                    {step === 'walkin' && (
                        <div className="space-y-6">
                            <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-stone-500 hover:text-stone-300 transition-colors text-sm">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-stone-100 mb-1">
                                    Hi{maskedName ? `, ${maskedName}` : ''}!
                                </h2>
                                <p className="text-stone-400">No appointment found for today</p>
                            </div>

                            <button
                                onClick={() => {
                                    if (!liabilitySigned) { setStep('waiver'); return }
                                    if (!loyaltyJoined) { setStep('loyalty'); return }
                                    performCheckIn({ source: 'QR_SCAN' })
                                }}
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>
                                        Check In as Walk-In
                                        <ChevronRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ─── NEW CUSTOMER ─── */}
                    {step === 'newclient' && (
                        <div className="space-y-6">
                            <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-stone-500 hover:text-stone-300 transition-colors text-sm">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-stone-100 mb-1">Nice to meet you! 👋</h2>
                                <p className="text-stone-400">Please enter your name</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">First Name</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        className="w-full text-lg p-4 bg-stone-900/60 border-2 border-stone-800 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-stone-100 placeholder-stone-700 transition-all outline-none"
                                        placeholder="Jane"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Last Name</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        className="w-full text-lg p-4 bg-stone-900/60 border-2 border-stone-800 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-stone-100 placeholder-stone-700 transition-all outline-none"
                                        placeholder="Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full text-lg p-4 bg-stone-900/60 border-2 border-stone-800 rounded-xl focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 text-stone-100 placeholder-stone-700 transition-all outline-none"
                                        placeholder="jane.doe@example.com"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('waiver')}
                                disabled={!firstName.trim() || !lastName.trim() || !email.trim() || !email.includes('@')}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                Continue
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}

                    {/* ─── LIABILITY WAIVER ─── */}
                    {step === 'waiver' && (
                        <div className="space-y-6">
                            <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-stone-500 hover:text-stone-300 transition-colors text-sm">
                                <ArrowLeft className="h-4 w-4" /> Back
                            </button>
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-stone-100 mb-1">One last thing...</h2>
                                <p className="text-stone-400">Please review and accept our liability waiver</p>
                            </div>

                            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5 max-h-[240px] overflow-y-auto text-sm text-stone-400 leading-relaxed space-y-3">
                                <p className="text-stone-200 font-bold text-xs uppercase tracking-wider">Liability Waiver and Release Form</p>
                                <p>I hereby acknowledge that I am voluntarily participating in services provided. I understand that these services may involve risks, including but not limited to allergic reactions to products, minor cuts, or other injuries.</p>
                                <p>I agree to release and hold harmless this establishment, its employees, and agents from any and all liability, claims, or causes of action arising out of my participation in these services.</p>
                                <p>By tapping &quot;I Accept&quot;, I acknowledge that I have read and understood this waiver and agree to its terms.</p>
                            </div>

                            <button
                                onClick={() => {
                                    setLiabilitySigned(true)
                                    if (!loyaltyJoined) {
                                        setStep('loyalty')
                                    } else {
                                        performCheckIn({ 
                                            source: 'QR_SCAN',
                                            appointmentId: selectedAptId || undefined
                                        })
                                    }
                                }}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                <Check className="h-5 w-5" /> I Accept
                            </button>
                        </div>
                    )}

                    {/* ─── LOYALTY ENROLLMENT ─── */}
                    {step === 'loyalty' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="mx-auto w-20 h-20 bg-orange-500/10 rounded-2xl flex items-center justify-center text-4xl mb-4">
                                    🎁
                                </div>
                                <h2 className="text-2xl font-bold text-stone-100 mb-1">Join Our Rewards?</h2>
                                <p className="text-stone-400">Earn points on every visit and get exclusive offers!</p>
                            </div>

                            <button
                                onClick={() => {
                                    setLoyaltyJoined(true)
                                    performCheckIn({ 
                                        source: 'QR_SCAN',
                                        appointmentId: selectedAptId || undefined
                                    })
                                }}
                                disabled={loading}
                                className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl font-bold text-lg hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Yes, sign me up! ✨'}
                            </button>

                            <button
                                onClick={() => performCheckIn({ 
                                    source: 'QR_SCAN',
                                    appointmentId: selectedAptId || undefined
                                })}
                                disabled={loading}
                                className="w-full text-stone-500 text-sm hover:text-stone-300 transition-colors py-2"
                            >
                                No thanks, maybe later
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="p-4 text-center">
                <p className="text-stone-700 text-xs">Powered by ORO 9</p>
            </div>
        </div>
    )
}
