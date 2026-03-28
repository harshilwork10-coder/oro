'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Link2, QrCode, Eye, EyeOff, Copy, ExternalLink,
    Check, Loader2, Globe, MapPin, Settings, ArrowRight,
    ToggleLeft, ToggleRight, Clock, Users, Scissors,
    AlertCircle, CheckCircle2, RefreshCw
} from 'lucide-react'

interface LocationBooking {
    id: string
    name: string
    slug: string
    address: string | null
    timezone: string
    bookingProfile: {
        isPublished: boolean
        publishedAt: string | null
        maxAdvanceDays: number
        minNoticeMinutes: number
        slotIntervalMin: number
        bufferMinutes: number
        accentColor: string
        welcomeMessage: string | null
        setupCompleted: boolean
        setupStep: string
    } | null
}

export default function BookingControlsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') }
    })

    const user = session?.user as any
    const [loading, setLoading] = useState(true)
    const [locations, setLocations] = useState<LocationBooking[]>([])
    const [franchiseSlug, setFranchiseSlug] = useState('')
    const [franchiseName, setFranchiseName] = useState('')
    const [copied, setCopied] = useState<string | null>(null)
    const [publishing, setPublishing] = useState<string | null>(null)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Readiness data for each location
    const [serviceCount, setServiceCount] = useState(0)
    const [bookableStaffCount, setBookableStaffCount] = useState(0)

    useEffect(() => {
        if (status === 'authenticated') fetchData()
    }, [status])

    async function fetchData() {
        setLoading(true)
        try {
            const res = await fetch('/api/booking/profile')
            if (res.ok) {
                const data = await res.json()
                setFranchiseSlug(data.franchise?.slug || '')
                setFranchiseName(data.franchise?.name || '')
                setLocations(data.locations || [])
            }

            // Get service count
            const svcRes = await fetch('/api/services')
            if (svcRes.ok) {
                const svcData = await svcRes.json()
                const svcs = Array.isArray(svcData) ? svcData : svcData.services || []
                setServiceCount(svcs.filter((s: any) => !s.isAddOn).length)
            }

            // Get bookable staff count
            const staffRes = await fetch('/api/employees')
            if (staffRes.ok) {
                const staffData = await staffRes.json()
                const staff = Array.isArray(staffData) ? staffData : staffData.employees || []
                setBookableStaffCount(staff.filter((s: any) => s.acceptingClients).length)
            }
        } catch (err) {
            console.error('Failed to fetch booking data:', err)
        } finally {
            setLoading(false)
        }
    }

    async function togglePublish(locationId: string, publish: boolean) {
        setPublishing(locationId)
        try {
            const res = await fetch('/api/booking/profile/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId, publish })
            })
            const data = await res.json()
            if (res.ok) {
                setLocations(prev => prev.map(l =>
                    l.id === locationId ? {
                        ...l,
                        bookingProfile: {
                            ...l.bookingProfile!,
                            isPublished: publish,
                            publishedAt: publish ? new Date().toISOString() : null,
                            setupCompleted: publish ? true : l.bookingProfile?.setupCompleted || false,
                            setupStep: publish ? 'publish' : l.bookingProfile?.setupStep || 'services'
                        }
                    } : l
                ))
                showToast(publish ? '✅ Booking page published!' : 'Booking page unpublished', 'success')
            } else {
                showToast(data.error || 'Cannot change publish state', 'error')
            }
        } catch {
            showToast('Failed to update', 'error')
        } finally {
            setPublishing(null)
        }
    }

    function copyLink(url: string, label: string) {
        navigator.clipboard.writeText(url)
        setCopied(label)
        setTimeout(() => setCopied(null), 2000)
    }

    function showToast(message: string, type: 'success' | 'error') {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const brandBookingUrl = `${baseUrl}/book/${franchiseSlug}`

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Online Booking</h1>
                    <p className="text-stone-400 mt-1">Manage your public booking pages and links</p>
                </div>
                <a
                    href="/dashboard/booking-setup"
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                >
                    <Settings className="h-4 w-4" /> Setup Wizard
                </a>
            </div>

            {/* Brand Booking Link */}
            <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white text-lg">Brand Booking Page</h2>
                        <p className="text-stone-400 text-sm">Share this link for customers to book at any location</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-stone-900/80 rounded-xl p-3 mb-4">
                    <Link2 className="h-4 w-4 text-violet-400 shrink-0" />
                    <code className="flex-1 text-violet-300 text-sm truncate">{brandBookingUrl}</code>
                    <button
                        onClick={() => copyLink(brandBookingUrl, 'brand')}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-all shrink-0"
                    >
                        {copied === 'brand' ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </button>
                    <a href={brandBookingUrl} target="_blank" rel="noreferrer"
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs flex items-center gap-1 shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" /> Preview
                    </a>
                </div>

                {/* QR Code placeholder */}
                <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
                    <QrCode className="h-8 w-8 text-violet-400" />
                    <div className="flex-1">
                        <p className="text-white text-sm font-medium">QR Code</p>
                        <p className="text-stone-500 text-xs">Print this QR code for in-store display — scans open the booking page</p>
                    </div>
                    <button
                        onClick={() => {
                            // Open QR code in new tab using Google Charts API
                            window.open(`https://chart.googleapis.com/chart?chs=400x400&cht=qr&chl=${encodeURIComponent(brandBookingUrl)}&choe=UTF-8`, '_blank')
                        }}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                        <QrCode className="h-3.5 w-3.5" /> Generate
                    </button>
                </div>
            </div>

            {/* Readiness Overview */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Services', count: serviceCount, icon: Scissors, ok: serviceCount > 0, link: '/dashboard/booking-setup' },
                    { label: 'Bookable Staff', count: bookableStaffCount, icon: Users, ok: bookableStaffCount > 0, link: '/dashboard/booking-setup' },
                    { label: 'Locations', count: locations.length, icon: MapPin, ok: locations.length > 0, link: null },
                ].map((item, i) => {
                    const Icon = item.icon
                    return (
                        <div key={i} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="h-4 w-4 text-stone-400" />
                                <span className="text-sm text-stone-400">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-white">{item.count}</span>
                                {item.ok ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-amber-400" />
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Location Cards */}
            <div>
                <h2 className="text-xl font-bold text-white mb-4">Locations</h2>
                <div className="space-y-4">
                    {locations.map(loc => {
                        const profile = loc.bookingProfile
                        const isPublished = profile?.isPublished || false
                        const directUrl = `${baseUrl}/book/l/${loc.slug}`
                        const hasHours = !!loc.bookingProfile // if profile exists, hours were set during setup

                        return (
                            <div key={loc.id} className={`border rounded-2xl p-5 transition-all ${isPublished ? 'bg-emerald-500/[0.03] border-emerald-500/20' : 'bg-white/[0.03] border-white/10'}`}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPublished ? 'bg-emerald-500/20' : 'bg-stone-800'}`}>
                                            <MapPin className={`h-5 w-5 ${isPublished ? 'text-emerald-400' : 'text-stone-400'}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white">{loc.name}</h3>
                                            {loc.address && <p className="text-sm text-stone-400">{loc.address}</p>}
                                        </div>
                                    </div>

                                    {/* Publish Toggle */}
                                    <button
                                        onClick={() => togglePublish(loc.id, !isPublished)}
                                        disabled={publishing === loc.id}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                                            isPublished
                                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-red-500/20 hover:text-red-300'
                                                : 'bg-violet-600 text-white hover:bg-violet-700'
                                        }`}
                                    >
                                        {publishing === loc.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : isPublished ? (
                                            <><Eye className="h-4 w-4" /> Published</>
                                        ) : (
                                            <><EyeOff className="h-4 w-4" /> Draft — Publish</>
                                        )}
                                    </button>
                                </div>

                                {/* Status badges */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isPublished ? 'bg-emerald-500/10 text-emerald-300' : 'bg-stone-800 text-stone-400'}`}>
                                        {isPublished ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                        {isPublished ? 'Live' : 'Draft'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-800 text-stone-400 rounded-full text-xs">
                                        <Clock className="h-3 w-3" /> {loc.timezone}
                                    </span>
                                    {profile && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-800 text-stone-400 rounded-full text-xs">
                                            Setup: {profile.setupCompleted ? 'Complete' : `Step ${profile.setupStep}`}
                                        </span>
                                    )}
                                </div>

                                {/* Direct Booking Link */}
                                <div className="flex items-center gap-2 bg-stone-900/60 rounded-lg p-2.5">
                                    <Link2 className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                                    <code className="flex-1 text-stone-300 text-xs truncate">{directUrl}</code>
                                    <button
                                        onClick={() => copyLink(directUrl, loc.id)}
                                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-stone-300 rounded text-xs flex items-center gap-1 shrink-0"
                                    >
                                        {copied === loc.id ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                                    </button>
                                    <a href={directUrl} target="_blank" rel="noreferrer" className="px-2 py-1 bg-white/5 hover:bg-white/10 text-stone-300 rounded text-xs flex items-center gap-1 shrink-0">
                                        <ExternalLink className="h-3 w-3" /> Open
                                    </a>
                                </div>

                                {/* Published timestamp */}
                                {isPublished && profile?.publishedAt && (
                                    <p className="text-xs text-stone-500 mt-2">
                                        Published {new Date(profile.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                    {[
                        { label: 'Booking Setup Wizard', href: '/dashboard/booking-setup', icon: Settings },
                        { label: 'Manage Services', href: '/dashboard/settings/services', icon: Scissors },
                        { label: 'Staff & Availability', href: '/dashboard/employees', icon: Users },
                        { label: 'Appointment Dashboard', href: '/dashboard/appointments', icon: Clock },
                    ].map((link, i) => {
                        const Icon = link.icon
                        return (
                            <a key={i} href={link.href}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all group">
                                <Icon className="h-4 w-4 text-stone-400 group-hover:text-violet-400 transition-colors" />
                                <span className="text-sm text-stone-300 group-hover:text-white transition-colors">{link.label}</span>
                                <ArrowRight className="h-3.5 w-3.5 text-stone-600 ml-auto group-hover:text-violet-400 transition-colors" />
                            </a>
                        )
                    })}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-[60] flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white font-medium">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="text-white/70 hover:text-white">✕</button>
                </div>
            )}
        </div>
    )
}
