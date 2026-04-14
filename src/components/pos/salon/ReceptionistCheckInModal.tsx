'use client'

import { useState, useEffect } from 'react'
import { X, Search, UserPlus, Calendar, Phone, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ReceptionistCheckInModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    locationId: string
    franchiseId: string
}

interface AppointmentEntry {
    id: string
    clientId: string
    clientName: string
    clientPhone: string
    serviceName: string
    employeeName: string
    employeeId: string
    startTime: string
    status: string
}

export default function ReceptionistCheckInModal({
    isOpen,
    onClose,
    onSuccess,
    locationId,
    franchiseId
}: ReceptionistCheckInModalProps) {
    const [tab, setTab] = useState<'walkin' | 'appointment'>('walkin')

    // Walk-in state
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [waiverSigned, setWaiverSigned] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string; alreadyCheckedIn?: boolean } | null>(null)

    // Appointment state
    const [appointments, setAppointments] = useState<AppointmentEntry[]>([])
    const [appointmentSearch, setAppointmentSearch] = useState('')
    const [loadingAppointments, setLoadingAppointments] = useState(false)
    const [checkingInAppointment, setCheckingInAppointment] = useState<string | null>(null)
    const [globalAptWaiverSigned, setGlobalAptWaiverSigned] = useState(false)

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setName('')
            setPhone('')
            setWaiverSigned(false)
            setResult(null)
            setTab('walkin')
            setAppointmentSearch('')
            setGlobalAptWaiverSigned(false)
            fetchTodayAppointments()
        }
    }, [isOpen])

    const fetchTodayAppointments = async () => {
        setLoadingAppointments(true)
        try {
            const res = await fetch('/api/pos/appointments?status=SCHEDULED&today=true')
            if (res.ok) {
                const data = await res.json()
                const items = data?.appointments || data || []
                setAppointments(Array.isArray(items) ? items.map((a: any) => ({
                    id: a.id,
                    clientId: a.clientId || a.client?.id,
                    clientName: a.client ? `${a.client.firstName} ${a.client.lastName}` : a.clientName || 'Unknown',
                    clientPhone: a.client?.phone || a.clientPhone || '',
                    serviceName: a.service?.name || a.serviceName || 'Service',
                    employeeName: a.employee?.name || a.employeeName || 'Any',
                    employeeId: a.employeeId || a.employee?.id || '',
                    startTime: a.startTime,
                    status: a.status
                })) : [])
            }
        } catch (err) {
            console.error('[CheckIn] Failed to fetch appointments:', err)
        } finally {
            setLoadingAppointments(false)
        }
    }

    const handleWalkInCheckIn = async () => {
        if (!name.trim() || !phone.trim() || !waiverSigned) return
        setLoading(true)
        setResult(null)

        try {
            const res = await fetch('/api/kiosk/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    phone: phone.trim(),
                    locationId,
                    liabilitySigned: true, // Persist waiver state checked by receptionist
                    source: 'RECEPTIONIST'
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setResult({ success: false, message: data.error || 'Check-in failed' })
                return
            }

            if (data.alreadyCheckedIn) {
                setResult({ success: true, message: `${data.name} is already checked in today.`, alreadyCheckedIn: true })
            } else {
                setResult({ success: true, message: `${data.name} checked in successfully!` })
            }

            // Auto-close after success
            setTimeout(() => {
                onSuccess()
            }, 1500)
        } catch (err) {
            setResult({ success: false, message: 'Network error — please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const handleAppointmentCheckIn = async (appointment: AppointmentEntry) => {
        setCheckingInAppointment(appointment.id)
        setResult(null)

        try {
            const res = await fetch('/api/kiosk/check-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: appointment.clientName,
                    phone: appointment.clientPhone,
                    locationId,
                    liabilitySigned: true, // Assuming receptionist validated it via globalAptWaiverSigned
                    source: 'RECEPTIONIST',
                    appointmentId: appointment.id
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setResult({ success: false, message: data.error || 'Check-in failed' })
                setCheckingInAppointment(null)
                return
            }

            if (data.alreadyCheckedIn) {
                setResult({ success: true, message: `${appointment.clientName} is already checked in today.`, alreadyCheckedIn: true })
            } else {
                setResult({ success: true, message: `${appointment.clientName} checked in for appointment!` })
            }

            setTimeout(() => {
                onSuccess()
            }, 1500)
        } catch (err) {
            setResult({ success: false, message: 'Network error — please try again.' })
        } finally {
            setCheckingInAppointment(null)
        }
    }

    const filteredAppointments = appointments.filter(a => {
        if (!appointmentSearch) return true
        const q = appointmentSearch.toLowerCase()
        return a.clientName.toLowerCase().includes(q) ||
               a.clientPhone.includes(q) ||
               a.serviceName.toLowerCase().includes(q)
    })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-stone-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-xl">
                            <UserPlus className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Check In Customer</h2>
                            <p className="text-xs text-stone-500">Add to queue for service</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-stone-800">
                    <button
                        onClick={() => setTab('walkin')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                            tab === 'walkin'
                                ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-500/5'
                                : 'text-stone-500 hover:text-stone-300'
                        }`}
                    >
                        <User className="h-4 w-4" />
                        Walk-In
                    </button>
                    <button
                        onClick={() => setTab('appointment')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                            tab === 'appointment'
                                ? 'text-violet-400 border-b-2 border-violet-400 bg-violet-500/5'
                                : 'text-stone-500 hover:text-stone-300'
                        }`}
                    >
                        <Calendar className="h-4 w-4" />
                        Appointment Arrival
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {/* Result Banner */}
                    {result && (
                        <div className={`mb-4 p-3 rounded-xl flex items-center gap-3 ${
                            result.success
                                ? 'bg-emerald-500/10 border border-emerald-500/30'
                                : 'bg-red-500/10 border border-red-500/30'
                        }`}>
                            {result.success
                                ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                                : <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                            }
                            <p className={`text-sm font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                {result.message}
                            </p>
                        </div>
                    )}

                    {tab === 'walkin' ? (
                        /* Walk-In Form */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1.5">Customer Name *</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="First and Last Name"
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1.5">Phone Number *</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="(555) 123-4567"
                                        className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Required Liability Waiver UI */}
                            <label className="flex items-start gap-3 p-3 bg-stone-800/50 rounded-xl border border-stone-700 cursor-pointer hover:border-orange-500/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={waiverSigned}
                                    onChange={(e) => setWaiverSigned(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-stone-600 text-orange-500 focus:ring-orange-500 bg-stone-900 cursor-pointer"
                                />
                                <span className="text-sm text-stone-300 font-medium tracking-wide">
                                    Customer has signed Liability Waiver (Required)
                                </span>
                            </label>

                            <button
                                onClick={handleWalkInCheckIn}
                                disabled={!name.trim() || !phone.trim() || !waiverSigned || loading}
                                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <UserPlus className="h-5 w-5" />
                                        Check In
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* Appointment Arrival */
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                                <input
                                    type="text"
                                    value={appointmentSearch}
                                    onChange={(e) => setAppointmentSearch(e.target.value)}
                                    placeholder="Search by name, phone, or service..."
                                    className="w-full pl-10 pr-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>

                            {/* Required Liability Waiver UI for Appointments */}
                            <label className="flex items-start gap-3 p-3 mb-2 bg-stone-800/50 rounded-xl border border-stone-700 cursor-pointer hover:border-violet-500/50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={globalAptWaiverSigned}
                                    onChange={(e) => setGlobalAptWaiverSigned(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded border-stone-600 text-violet-500 focus:ring-violet-500 bg-stone-900 cursor-pointer"
                                />
                                <span className="text-sm text-stone-300 font-medium tracking-wide">
                                    Customer has signed Liability Waiver (Required)
                                </span>
                            </label>

                            <div className="max-h-[280px] overflow-y-auto space-y-2">
                                {loadingAppointments ? (
                                    <div className="text-center py-8 text-stone-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        <p className="text-sm">Loading appointments...</p>
                                    </div>
                                ) : filteredAppointments.length === 0 ? (
                                    <div className="text-center py-8 text-stone-600">
                                        <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm font-medium">No appointments found</p>
                                        <p className="text-xs text-stone-700 mt-1">
                                            {appointmentSearch ? 'Try a different search' : 'No scheduled appointments today'}
                                        </p>
                                    </div>
                                ) : (
                                    filteredAppointments.map(apt => (
                                        <button
                                            key={apt.id}
                                            onClick={() => handleAppointmentCheckIn(apt)}
                                            disabled={checkingInAppointment === apt.id || !globalAptWaiverSigned}
                                            className="w-full p-3 bg-stone-800/60 hover:bg-stone-800 border border-stone-700 hover:border-violet-500/50 rounded-xl text-left transition-all flex items-center justify-between disabled:opacity-50"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{apt.clientName}</p>
                                                <p className="text-xs text-stone-500 truncate">{apt.clientPhone}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-violet-400">{apt.serviceName}</span>
                                                    <span className="text-xs text-stone-600">•</span>
                                                    <span className="text-xs text-stone-500">with {apt.employeeName}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 ml-3 text-right">
                                                <p className="text-sm font-bold text-violet-400">
                                                    {new Date(apt.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                </p>
                                                {checkingInAppointment === apt.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-violet-400 ml-auto mt-1" />
                                                ) : (
                                                    <span className="text-[10px] text-stone-400">
                                                        {!globalAptWaiverSigned ? "Wait for waiver" : "Tap to check in"}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
