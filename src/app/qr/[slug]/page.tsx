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

interface BrandTheme {
    brandName: string
    logoUrl: string | null
    primaryColor: string
    secondaryColor: string
    welcomeText: string | null
    bgGradient: string
}

type Step = 'phone' | 'confirm' | 'walkin' | 'newclient' | 'waiver' | 'loyalty' | 'success' | 'error'

// ─── Phone Format Helper ───
function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

// ─── Default theme ───
const DEFAULT_THEME: BrandTheme = {
    brandName: '',
    logoUrl: null,
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    welcomeText: null,
    bgGradient: 'from-orange-900/20 via-stone-950 to-stone-950',
}

// ─── Main Component ───
export default function BrandQrCheckinPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const slug = params.slug as string
    const tokenParam = searchParams.get('t')
    const deviceParam = searchParams.get('d')

    // State
    const [step, setStep] = useState<Step>('phone')
    const [phone, setPhone] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
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
    const [theme, setTheme] = useState<BrandTheme>(DEFAULT_THEME)
    const [brandId, setBrandId] = useState('')

    // ─── Resolve brand from API (server-side resolution via token or slug context) ───
    useEffect(() => {
        const fetchBrand = async () => {
            try {
                // Use the public storefront endpoint to get location + brand info
                const res = await fetch(`/api/public/storefront/${slug}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.location?.name) setLocationName(data.location.name)
                    if (data.location?.id) setLocationId(data.location.id)

                    // Try to extract brand theming from franchise/franchisor
                    if (data.brand) {
                        setBrandId(data.brand.id || '')
                        setTheme({
                            brandName: data.brand.name || '',
                            logoUrl: data.brand.logoUrl || null,
                            primaryColor: data.brand.primaryColor || '#f59e0b',
                            secondaryColor: data.brand.secondaryColor || '#d97706',
                            welcomeText: data.brand.welcomeText || null,
                            bgGradient: data.brand.bgGradient || DEFAULT_THEME.bgGradient,
                        })
                    }
                }
            } catch {
                // Silent — page still functional without brand theme
            }
        }
        if (slug) fetchBrand()
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
                setStep('newclient')
                return
            }

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
                // Go to waiver if not signed, otherwise loyalty, otherwise walkin
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

    // ─── Check-In (calls /api/kiosk/check-in with multi-tenant context) ───
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
                    phone: digits,
                    locationId,
                    source: opts.source,
                    appointmentId: opts.appointmentId || null,
                    stationRef: deviceParam || null,
                    // Multi-tenant QR enrichment
                    brandId: brandId || null,
                    deviceId: deviceParam || null,
                    qrTokenId: null, // Token audit is server-side
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
    }, [phone, firstName, lastName, maskedName, locationId, brandId, deviceParam])

    // ─── Auto-reset after success ───
    useEffect(() => {
        if (step === 'success') {
            const timer = setTimeout(() => {
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

    // ─── Numpad ───
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

    // ─── Dynamic CSS vars from brand theme ───
    const brandStyle = {
        '--brand-primary': theme.primaryColor,
        '--brand-secondary': theme.secondaryColor,
    } as React.CSSProperties

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    // ─── SUCCESS STATE ───
    if (step === 'success') {
        return (
            <div className="min-h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/30 via-stone-950 to-stone-950 flex items-center justify-center p-6" style={brandStyle}>
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
            <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6" style={brandStyle}>
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
        <div className={`min-h-screen bg-stone-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] ${theme.bgGradient} flex flex-col`} style={brandStyle}>
            {/* Brand Header — shows brand logo + location name, NO platform branding */}
            <div className="p-4 flex items-center justify-center">
                <div className="flex items-center gap-3">
                    {theme.logoUrl ? (
                        <img src={theme.logoUrl} alt={theme.brandName} className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                        <div
                            className="h-10 w-10 rounded-lg flex items-center justify-center shadow-lg text-white font-bold text-lg"
                            style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                        >
                            {theme.brandName?.charAt(0)?.toUpperCase() || '●'}
                        </div>
                    )}
                    <div className="text-left">
                        {theme.brandName && (
                            <span className="block text-stone-200 text-sm font-semibold">{theme.brandName}</span>
                        )}
                        {locationName && (
                            <span className="block text-stone-500 text-xs">{locationName}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full">

                    {/* ─── PHONE ENTRY ─── */}
                    {step === 'phone' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold text-stone-100 mb-1">
                                    {theme.welcomeText || 'Welcome! 👋'}
                                </h1>
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
                                                    ? 'text-white shadow-lg'
                                                    : 'bg-stone-800/50 text-stone-600 cursor-not-allowed'
                                                : key === 'DEL'
                                                    ? 'bg-stone-800/50 text-stone-400 hover:bg-stone-700/50'
                                                    : 'bg-stone-800/80 text-stone-200 hover:bg-stone-700/80'
                                        }`}
                                        style={
                                            key === '→' && phoneDigits.length >= 10
                                                ? { background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }
                                                : undefined
                                        }
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
                                        onClick={() => performCheckIn({
                                            appointmentId: appt.id,
                                            source: tokenParam ? 'QR_SCAN' : 'QR_SCAN_UNVERIFIED'
                                        })}
                                        disabled={loading}
                                        className="w-full bg-stone-900/60 border border-stone-800 hover:border-stone-600 rounded-2xl p-5 text-left transition-all hover:bg-stone-800/40 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-stone-100 font-semibold">
                                                    <Scissors className="h-4 w-4" style={{ color: theme.primaryColor }} />
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
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: theme.primaryColor }}>
                                                <span className="text-sm font-medium">Check In</span>
                                                <ChevronRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setStep('walkin')}
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
                                    performCheckIn({ source: tokenParam ? 'QR_SCAN' : 'QR_SCAN_UNVERIFIED' })
                                }}
                                disabled={loading}
                                className="w-full py-4 text-white rounded-2xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                                style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
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
                                        className="w-full text-lg p-4 bg-stone-900/60 border-2 border-stone-800 rounded-xl focus:ring-2 focus:border-stone-600 text-stone-100 placeholder-stone-700 transition-all outline-none"
                                        style={{ '--tw-ring-color': theme.primaryColor } as React.CSSProperties}
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
                                        className="w-full text-lg p-4 bg-stone-900/60 border-2 border-stone-800 rounded-xl focus:ring-2 focus:border-stone-600 text-stone-100 placeholder-stone-700 transition-all outline-none"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('waiver')}
                                disabled={!firstName.trim() || !lastName.trim()}
                                className="w-full py-4 text-white rounded-2xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                                style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
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
                                        performCheckIn({ source: tokenParam ? 'QR_SCAN' : 'QR_SCAN_UNVERIFIED' })
                                    }
                                }}
                                className="w-full py-4 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                            >
                                <Check className="h-5 w-5" /> I Accept
                            </button>
                        </div>
                    )}

                    {/* ─── LOYALTY ENROLLMENT ─── */}
                    {step === 'loyalty' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-4"
                                    style={{ background: `linear-gradient(135deg, ${theme.primaryColor}33, ${theme.secondaryColor}33)` }}
                                >
                                    🎁
                                </div>
                                <h2 className="text-2xl font-bold text-stone-100 mb-1">Join Our Rewards?</h2>
                                <p className="text-stone-400">Earn points on every visit and get exclusive offers!</p>
                            </div>

                            <button
                                onClick={() => {
                                    setLoyaltyJoined(true)
                                    performCheckIn({ source: tokenParam ? 'QR_SCAN' : 'QR_SCAN_UNVERIFIED' })
                                }}
                                disabled={loading}
                                className="w-full py-4 text-white rounded-2xl font-bold text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
                                style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})` }}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>
                                        Yes, sign me up! ✨
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => performCheckIn({ source: tokenParam ? 'QR_SCAN' : 'QR_SCAN_UNVERIFIED' })}
                                disabled={loading}
                                className="w-full text-stone-500 text-sm hover:text-stone-300 transition-colors py-2"
                            >
                                No thanks, maybe later
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Footer — NO platform domain exposed, brand-only */}
            <div className="p-4 text-center">
                <p className="text-stone-800 text-xs">
                    {theme.brandName || locationName || ''}
                </p>
            </div>
        </div>
    )
}
