'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Scissors, Users, Clock, Settings, Rocket,
    ChevronRight, ChevronLeft, Check, Loader2,
    AlertCircle, Copy, ExternalLink, QrCode
} from 'lucide-react'

type Step = 'services' | 'staff' | 'hours' | 'rules' | 'publish'

interface Service {
    id: string
    name: string
    duration: number
    price: number
    isAddOn: boolean
    category?: string
}

interface StaffMember {
    id: string
    name: string
    role: string
    acceptingClients: boolean
    staffSlug: string | null
}

interface BookingProfile {
    isPublished: boolean
    publishedAt: string | null
    maxAdvanceDays: number
    minNoticeMinutes: number
    slotIntervalMin: number
    bufferMinutes: number
    accentColor: string
    welcomeMessage: string | null
    setupStep: string
    setupCompleted: boolean
}

interface LocationData {
    id: string
    name: string
    slug: string
    address: string | null
    timezone: string
    operatingHours: Record<string, string> | null
    bookingProfile: BookingProfile | null
}

const STEPS: { key: Step; label: string; icon: any }[] = [
    { key: 'services', label: 'Services', icon: Scissors },
    { key: 'staff', label: 'Staff', icon: Users },
    { key: 'hours', label: 'Hours', icon: Clock },
    { key: 'rules', label: 'Rules', icon: Settings },
    { key: 'publish', label: 'Publish', icon: Rocket },
]

const DEFAULT_HOURS: Record<string, string> = {
    mon: '09:00-19:00',
    tue: '09:00-19:00',
    wed: '09:00-19:00',
    thu: '09:00-19:00',
    fri: '09:00-19:00',
    sat: '09:00-19:00',
    sun: 'closed',
}

const DAY_LABELS: Record<string, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
    thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
}

export default function BookingSetupPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') }
    })

    const user = session?.user as any
    const [currentStep, setCurrentStep] = useState<Step>('services')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    // Data
    const [location, setLocation] = useState<LocationData | null>(null)
    const [franchiseSlug, setFranchiseSlug] = useState('')
    const [services, setServices] = useState<Service[]>([])
    const [staff, setStaff] = useState<StaffMember[]>([])
    const [hours, setHours] = useState<Record<string, string>>(DEFAULT_HOURS)
    const [rules, setRules] = useState({
        maxAdvanceDays: 30,
        minNoticeMinutes: 120,
        slotIntervalMin: 30,
        bufferMinutes: 0,
    })

    // New service form
    const [newService, setNewService] = useState({ name: '', duration: 30, price: 0, isAddOn: false })
    const [showNewServiceForm, setShowNewServiceForm] = useState(false)

    // Publish
    const [copied, setCopied] = useState(false)
    const [publishing, setPublishing] = useState(false)

    useEffect(() => {
        if (status === 'authenticated') fetchAll()
    }, [status])

    async function fetchAll() {
        setLoading(true)
        try {
            // Fetch booking profile
            const profileRes = await fetch('/api/booking/profile')
            if (profileRes.ok) {
                const data = await profileRes.json()
                setFranchiseSlug(data.franchise?.slug || '')
                if (data.locations?.length > 0) {
                    const loc = data.locations[0] // First location for single-location
                    setLocation(loc)
                    if (loc.operatingHours) setHours(loc.operatingHours)
                    if (loc.bookingProfile) {
                        setRules({
                            maxAdvanceDays: loc.bookingProfile.maxAdvanceDays,
                            minNoticeMinutes: loc.bookingProfile.minNoticeMinutes,
                            slotIntervalMin: loc.bookingProfile.slotIntervalMin,
                            bufferMinutes: loc.bookingProfile.bufferMinutes,
                        })
                        // Resume from last step
                        if (loc.bookingProfile.setupStep && !loc.bookingProfile.setupCompleted) {
                            setCurrentStep(loc.bookingProfile.setupStep as Step)
                        }
                    }
                }
            }

            // Fetch services
            const svcRes = await fetch('/api/services')
            if (svcRes.ok) {
                const svcData = await svcRes.json()
                setServices(Array.isArray(svcData) ? svcData : svcData.services || [])
            }

            // Fetch staff
            const staffRes = await fetch('/api/employees')
            if (staffRes.ok) {
                const staffData = await staffRes.json()
                setStaff(Array.isArray(staffData) ? staffData : staffData.employees || [])
            }
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    async function saveStep(step: Step) {
        if (!location) return
        setSaving(true)
        try {
            const nextSteps: Record<Step, Step> = {
                services: 'staff', staff: 'hours', hours: 'rules', rules: 'publish', publish: 'publish'
            }

            await fetch('/api/booking/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId: location.id,
                    setupStep: nextSteps[step],
                    ...(step === 'hours' ? { operatingHours: hours } : {}),
                    ...(step === 'rules' ? rules : {}),
                })
            })

            setCurrentStep(nextSteps[step])
            showToast('Saved!', 'success')
        } catch {
            showToast('Failed to save', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function addService() {
        if (!newService.name || newService.price <= 0) return
        setSaving(true)
        try {
            const res = await fetch('/api/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newService)
            })
            if (res.ok) {
                const svc = await res.json()
                setServices(prev => [...prev, svc])
                setNewService({ name: '', duration: 30, price: 0, isAddOn: false })
                setShowNewServiceForm(false)
                showToast('Service added!', 'success')
            }
        } catch {
            showToast('Failed to add service', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function deleteService(id: string) {
        try {
            await fetch(`/api/services/${id}`, { method: 'DELETE' })
            setServices(prev => prev.filter(s => s.id !== id))
        } catch {
            showToast('Failed to delete', 'error')
        }
    }

    async function toggleStaff(id: string, accepting: boolean) {
        try {
            await fetch(`/api/employees/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ acceptingClients: accepting })
            })
            setStaff(prev => prev.map(s => s.id === id ? { ...s, acceptingClients: accepting } : s))
        } catch {
            showToast('Failed to update', 'error')
        }
    }

    async function handlePublish() {
        if (!location) return
        setPublishing(true)
        try {
            const res = await fetch('/api/booking/profile/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locationId: location.id, publish: true })
            })
            const data = await res.json()
            if (res.ok) {
                setLocation(prev => prev ? {
                    ...prev,
                    bookingProfile: { ...prev.bookingProfile!, isPublished: true, publishedAt: new Date().toISOString(), setupCompleted: true, setupStep: 'publish' }
                } : null)
                showToast('🎉 Booking page is LIVE!', 'success')
            } else {
                showToast(data.error || 'Cannot publish yet', 'error')
            }
        } catch {
            showToast('Failed to publish', 'error')
        } finally {
            setPublishing(false)
        }
    }

    function copyLink() {
        const url = `${window.location.origin}/book/${franchiseSlug}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function showToast(message: string, type: 'success' | 'error') {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const stepIndex = STEPS.findIndex(s => s.key === currentStep)
    const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/book/${franchiseSlug}`
    const isPublished = location?.bookingProfile?.isPublished || false
    const readiness = {
        services: services.filter(s => !s.isAddOn).length > 0,
        staff: staff.some(s => s.acceptingClients),
        hours: Object.values(hours).some(h => h !== 'closed'),
    }
    const isReady = readiness.services && readiness.staff && readiness.hours

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Booking Setup</h1>
                <p className="text-stone-400">Get your online booking page ready for customers</p>
            </div>

            {/* Step Navigation */}
            <div className="flex items-center gap-2 mb-8 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
                {STEPS.map((step, i) => {
                    const Icon = step.icon
                    const isActive = step.key === currentStep
                    const isCompleted = i < stepIndex
                    return (
                        <button
                            key={step.key}
                            onClick={() => setCurrentStep(step.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center ${
                                isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30' :
                                isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'text-stone-400 hover:bg-white/5'
                            }`}
                        >
                            {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                            <span className="hidden sm:inline">{step.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Step 1: Services */}
            {currentStep === 'services' && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Your Services</h2>
                            <p className="text-stone-400 text-sm mt-1">Add, edit, or remove services customers can book</p>
                        </div>
                        <button
                            onClick={() => setShowNewServiceForm(true)}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-all"
                        >
                            + Add Service
                        </button>
                    </div>

                    {/* New Service Form */}
                    {showNewServiceForm && (
                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-3 sm:col-span-1">
                                    <label className="block text-sm text-stone-400 mb-1">Service Name</label>
                                    <input
                                        type="text" value={newService.name}
                                        onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white focus:border-violet-500 outline-none"
                                        placeholder="Haircut"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-stone-400 mb-1">Duration (min)</label>
                                    <input
                                        type="number" value={newService.duration}
                                        onChange={e => setNewService(p => ({ ...p, duration: parseInt(e.target.value) || 0 }))}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white focus:border-violet-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-stone-400 mb-1">Price ($)</label>
                                    <input
                                        type="number" step="0.01" value={newService.price}
                                        onChange={e => setNewService(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white focus:border-violet-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-stone-300">
                                    <input type="checkbox" checked={newService.isAddOn}
                                        onChange={e => setNewService(p => ({ ...p, isAddOn: e.target.checked }))}
                                        className="rounded border-stone-600"
                                    />
                                    Add-on service
                                </label>
                                <div className="flex-1" />
                                <button onClick={() => setShowNewServiceForm(false)} className="px-4 py-2 text-stone-400 hover:text-white text-sm">Cancel</button>
                                <button onClick={addService} disabled={saving || !newService.name || newService.price <= 0}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-40">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Service List */}
                    <div className="space-y-2">
                        {services.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <Scissors className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>No services yet. Add your first service to continue.</p>
                            </div>
                        ) : (
                            services.map(svc => (
                                <div key={svc.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${svc.isAddOn ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                        <div>
                                            <p className="font-medium text-white">{svc.name}</p>
                                            <p className="text-sm text-stone-400">{svc.duration} min {svc.isAddOn ? '• Add-on' : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-white">${svc.price}</span>
                                        <button onClick={() => deleteService(svc.id)} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button onClick={() => saveStep('services')} disabled={services.filter(s => !s.isAddOn).length === 0}
                        className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40 transition-all">
                        Continue to Staff <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}

            {/* Step 2: Staff */}
            {currentStep === 'staff' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Bookable Staff</h2>
                        <p className="text-stone-400 text-sm mt-1">Choose which team members accept online bookings</p>
                    </div>

                    {staff.length === 0 ? (
                        <div className="text-center py-12 bg-white/[0.03] border border-white/10 rounded-2xl">
                            <Users className="h-12 w-12 mx-auto mb-3 text-stone-500" />
                            <p className="text-stone-400">No staff members found.</p>
                            <p className="text-stone-500 text-sm mt-1">Add employees in Settings → Employees first.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {staff.map(s => (
                                <div key={s.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                                            {s.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{s.name}</p>
                                            <p className="text-sm text-stone-400">{s.role}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleStaff(s.id, !s.acceptingClients)}
                                        className={`relative w-12 h-6 rounded-full transition-all ${s.acceptingClients ? 'bg-emerald-600' : 'bg-stone-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${s.acceptingClients ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={() => setCurrentStep('services')} className="px-6 py-3 bg-white/5 border border-white/10 text-stone-300 rounded-xl font-medium flex items-center gap-2 hover:bg-white/10">
                            <ChevronLeft className="h-5 w-5" /> Back
                        </button>
                        <button onClick={() => saveStep('staff')} disabled={!staff.some(s => s.acceptingClients)}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
                            Continue to Hours <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Hours */}
            {currentStep === 'hours' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Business Hours</h2>
                        <p className="text-stone-400 text-sm mt-1">Set your operating hours — customers can only book during these times</p>
                    </div>

                    <div className="space-y-2">
                        {Object.entries(DAY_LABELS).map(([key, label]) => {
                            const isClosed = hours[key] === 'closed'
                            const [open, close] = isClosed ? ['09:00', '19:00'] : (hours[key] || '09:00-19:00').split('-')
                            return (
                                <div key={key} className="flex items-center gap-4 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
                                    <span className="w-28 font-medium text-white">{label}</span>
                                    <button
                                        onClick={() => setHours(h => ({ ...h, [key]: isClosed ? '09:00-19:00' : 'closed' }))}
                                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${isClosed ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}
                                    >
                                        {isClosed ? 'Closed' : 'Open'}
                                    </button>
                                    {!isClosed && (
                                        <>
                                            <input type="time" value={open}
                                                onChange={e => setHours(h => ({ ...h, [key]: `${e.target.value}-${close}` }))}
                                                className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-violet-500 outline-none"
                                            />
                                            <span className="text-stone-500">to</span>
                                            <input type="time" value={close}
                                                onChange={e => setHours(h => ({ ...h, [key]: `${open}-${e.target.value}` }))}
                                                className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-white text-sm focus:border-violet-500 outline-none"
                                            />
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setCurrentStep('staff')} className="px-6 py-3 bg-white/5 border border-white/10 text-stone-300 rounded-xl font-medium flex items-center gap-2 hover:bg-white/10">
                            <ChevronLeft className="h-5 w-5" /> Back
                        </button>
                        <button onClick={() => saveStep('hours')}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                            Continue to Rules <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Rules */}
            {currentStep === 'rules' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Booking Rules</h2>
                        <p className="text-stone-400 text-sm mt-1">Configure how far ahead customers can book and other restrictions</p>
                    </div>

                    <div className="space-y-4">
                        <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl">
                            <label className="block text-sm font-medium text-white mb-2">Max Advance Booking</label>
                            <p className="text-sm text-stone-400 mb-3">How far ahead can customers book?</p>
                            <div className="flex items-center gap-4">
                                <input type="range" min="1" max="90" value={rules.maxAdvanceDays}
                                    onChange={e => setRules(r => ({ ...r, maxAdvanceDays: parseInt(e.target.value) }))}
                                    className="flex-1 accent-violet-500"
                                />
                                <span className="text-white font-semibold w-20 text-right">{rules.maxAdvanceDays} days</span>
                            </div>
                        </div>

                        <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl">
                            <label className="block text-sm font-medium text-white mb-2">Minimum Notice</label>
                            <p className="text-sm text-stone-400 mb-3">How much notice before an appointment?</p>
                            <select value={rules.minNoticeMinutes}
                                onChange={e => setRules(r => ({ ...r, minNoticeMinutes: parseInt(e.target.value) }))}
                                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white focus:border-violet-500 outline-none"
                            >
                                <option value="0">No minimum</option>
                                <option value="30">30 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="120">2 hours</option>
                                <option value="240">4 hours</option>
                                <option value="480">8 hours</option>
                                <option value="1440">24 hours</option>
                            </select>
                        </div>

                        <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl">
                            <label className="block text-sm font-medium text-white mb-2">Time Slot Interval</label>
                            <p className="text-sm text-stone-400 mb-3">How are available time slots spaced?</p>
                            <select value={rules.slotIntervalMin}
                                onChange={e => setRules(r => ({ ...r, slotIntervalMin: parseInt(e.target.value) }))}
                                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-white focus:border-violet-500 outline-none"
                            >
                                <option value="15">Every 15 minutes</option>
                                <option value="30">Every 30 minutes</option>
                                <option value="60">Every hour</option>
                            </select>
                        </div>

                        <div className="p-5 bg-white/[0.03] border border-white/10 rounded-xl">
                            <label className="block text-sm font-medium text-white mb-2">Buffer Between Appointments</label>
                            <p className="text-sm text-stone-400 mb-3">Add break time between appointments</p>
                            <div className="flex items-center gap-4">
                                <input type="range" min="0" max="60" step="5" value={rules.bufferMinutes}
                                    onChange={e => setRules(r => ({ ...r, bufferMinutes: parseInt(e.target.value) }))}
                                    className="flex-1 accent-violet-500"
                                />
                                <span className="text-white font-semibold w-20 text-right">{rules.bufferMinutes} min</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setCurrentStep('hours')} className="px-6 py-3 bg-white/5 border border-white/10 text-stone-300 rounded-xl font-medium flex items-center gap-2 hover:bg-white/10">
                            <ChevronLeft className="h-5 w-5" /> Back
                        </button>
                        <button onClick={() => saveStep('rules')}
                            className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                            Continue to Publish <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 5: Preview & Publish */}
            {currentStep === 'publish' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-white">Preview & Publish</h2>
                        <p className="text-stone-400 text-sm mt-1">Review your booking page and go live</p>
                    </div>

                    {/* Readiness Checklist */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-3">
                        <h3 className="font-semibold text-white mb-2">Publish Readiness</h3>
                        {[
                            { label: 'At least 1 service', ok: readiness.services },
                            { label: 'At least 1 bookable staff member', ok: readiness.staff },
                            { label: 'Operating hours set', ok: readiness.hours },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.ok ? 'bg-emerald-500' : 'bg-stone-700'}`}>
                                    {item.ok ? <Check className="h-4 w-4 text-white" /> : <AlertCircle className="h-4 w-4 text-stone-400" />}
                                </div>
                                <span className={item.ok ? 'text-emerald-300' : 'text-stone-400'}>{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Booking Link */}
                    <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-5">
                        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <QrCode className="h-5 w-5 text-violet-400" /> Your Booking Link
                        </h3>
                        <div className="flex items-center gap-2 bg-stone-900/80 rounded-xl p-3">
                            <code className="flex-1 text-violet-300 text-sm truncate">{bookingUrl}</code>
                            <button onClick={copyLink} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 transition-all">
                                {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                            </button>
                            <a href={bookingUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm flex items-center gap-1">
                                <ExternalLink className="h-3.5 w-3.5" /> Preview
                            </a>
                        </div>
                    </div>

                    {/* Publish Button */}
                    {isPublished ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Rocket className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Your Booking Page is Live! 🎉</h3>
                            <p className="text-emerald-300">Customers can now book appointments at your business.</p>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <button onClick={() => setCurrentStep('rules')} className="px-6 py-3 bg-white/5 border border-white/10 text-stone-300 rounded-xl font-medium flex items-center gap-2 hover:bg-white/10">
                                <ChevronLeft className="h-5 w-5" /> Back
                            </button>
                            <button onClick={handlePublish} disabled={!isReady || publishing}
                                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 transition-all shadow-lg shadow-emerald-600/20">
                                {publishing ? <><Loader2 className="h-5 w-5 animate-spin" /> Publishing...</> : <><Rocket className="h-5 w-5" /> Publish Booking Page</>}
                            </button>
                        </div>
                    )}
                </div>
            )}

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
