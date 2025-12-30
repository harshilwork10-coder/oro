'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
    ArrowLeft, Clock, Save, RefreshCw, Store,
    Wine, Cigarette, Ticket, CheckCircle, AlertTriangle
} from 'lucide-react'

interface LocationSetting {
    id: string
    name: string
    restrictions: {
        alcohol: {
            enabled: boolean
            minimumAge: number
            sundayStart: string
            sundayEnd: string
            weekdayStart: string
            weekdayEnd: string
            requireIDScan: boolean
            idOverrideRequiresManager: boolean
        }
        tobacco: {
            enabled: boolean
            minimumAge: number
            requireIDScan: boolean
        }
        lottery: {
            enabled: boolean
            minimumAge: number
        }
    }
}

export default function SalesRulesPage() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [locations, setLocations] = useState<LocationSetting[]>([])
    const [selectedLocation, setSelectedLocation] = useState<string>('')
    const [settings, setSettings] = useState<LocationSetting['restrictions'] | null>(null)
    const [message, setMessage] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/owner/sales-rules')
            const data = await res.json()

            setLocations(data.locations || [])
            if (data.locations?.length > 0) {
                setSelectedLocation(data.locations[0].id)
                setSettings(data.locations[0].restrictions)
            }
        } catch (error) {
            console.error('Failed to fetch:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        const loc = locations.find(l => l.id === selectedLocation)
        if (loc) {
            setSettings(loc.restrictions)
        }
    }, [selectedLocation, locations])

    const handleSave = async (applyToAll: boolean = false) => {
        if (!settings) return
        setSaving(true)
        setMessage('')
        try {
            const res = await fetch('/api/owner/sales-rules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    locationId: selectedLocation,
                    restrictions: settings,
                    applyToAll
                })
            })
            const data = await res.json()
            if (res.ok) {
                setMessage('✓ ' + data.message)
            }
        } catch (error) {
            setMessage('Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const updateAlcohol = (field: string, value: any) => {
        if (!settings) return
        setSettings({
            ...settings,
            alcohol: { ...settings.alcohol, [field]: value }
        })
    }

    const updateTobacco = (field: string, value: any) => {
        if (!settings) return
        setSettings({
            ...settings,
            tobacco: { ...settings.tobacco, [field]: value }
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/owner" className="p-2 hover:bg-stone-800 rounded-lg">
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Clock className="h-8 w-8 text-rose-500" />
                            Sales Restrictions
                        </h1>
                        <p className="text-stone-400">Configure alcohol, tobacco & age-restricted sales rules</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-xl"
                    >
                        Apply to All Stores
                    </button>
                </div>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-xl ${message.startsWith('✓') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message}
                </div>
            )}

            {/* Location Selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {locations.map(loc => (
                    <button
                        key={loc.id}
                        onClick={() => setSelectedLocation(loc.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap ${selectedLocation === loc.id
                                ? 'bg-rose-600 text-white'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                    >
                        <Store className="h-4 w-4" />
                        {loc.name}
                    </button>
                ))}
            </div>

            {settings && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Alcohol Rules */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Wine className="h-6 w-6 text-purple-400" />
                                Alcohol Sales
                            </h3>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings.alcohol.enabled}
                                    onChange={(e) => updateAlcohol('enabled', e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm">Enabled</span>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-stone-400">Minimum Age</label>
                                <select
                                    value={settings.alcohol.minimumAge}
                                    onChange={(e) => updateAlcohol('minimumAge', parseInt(e.target.value))}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                >
                                    <option value={21}>21 years</option>
                                    <option value={18}>18 years</option>
                                </select>
                            </div>

                            <div className="p-4 bg-stone-800 rounded-xl">
                                <p className="text-sm text-stone-400 mb-3">Sunday Hours</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-stone-500">Start Time</label>
                                        <input
                                            type="time"
                                            value={settings.alcohol.sundayStart}
                                            onChange={(e) => updateAlcohol('sundayStart', e.target.value)}
                                            className="w-full bg-stone-700 border border-stone-600 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500">End Time</label>
                                        <input
                                            type="time"
                                            value={settings.alcohol.sundayEnd}
                                            onChange={(e) => updateAlcohol('sundayEnd', e.target.value)}
                                            className="w-full bg-stone-700 border border-stone-600 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-stone-800 rounded-xl">
                                <p className="text-sm text-stone-400 mb-3">Weekday Hours</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-stone-500">Start Time</label>
                                        <input
                                            type="time"
                                            value={settings.alcohol.weekdayStart}
                                            onChange={(e) => updateAlcohol('weekdayStart', e.target.value)}
                                            className="w-full bg-stone-700 border border-stone-600 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-stone-500">End Time</label>
                                        <input
                                            type="time"
                                            value={settings.alcohol.weekdayEnd}
                                            onChange={(e) => updateAlcohol('weekdayEnd', e.target.value)}
                                            className="w-full bg-stone-700 border border-stone-600 rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.alcohol.requireIDScan}
                                        onChange={(e) => updateAlcohol('requireIDScan', e.target.checked)}
                                        className="rounded"
                                    />
                                    <span>Require ID scan for all alcohol sales</span>
                                </label>

                                <label className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={settings.alcohol.idOverrideRequiresManager}
                                        onChange={(e) => updateAlcohol('idOverrideRequiresManager', e.target.checked)}
                                        className="rounded"
                                    />
                                    <span>ID override requires manager approval</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Tobacco Rules */}
                    <div className="bg-stone-900/80 border border-stone-700 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Cigarette className="h-6 w-6 text-amber-400" />
                                Tobacco Sales
                            </h3>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={settings.tobacco.enabled}
                                    onChange={(e) => updateTobacco('enabled', e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm">Enabled</span>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-stone-400">Minimum Age</label>
                                <select
                                    value={settings.tobacco.minimumAge}
                                    onChange={(e) => updateTobacco('minimumAge', parseInt(e.target.value))}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                >
                                    <option value={21}>21 years (Federal law)</option>
                                    <option value={18}>18 years</option>
                                </select>
                            </div>

                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={settings.tobacco.requireIDScan}
                                    onChange={(e) => updateTobacco('requireIDScan', e.target.checked)}
                                    className="rounded"
                                />
                                <span>Require ID scan for all tobacco sales</span>
                            </label>
                        </div>

                        {/* Lottery Rules */}
                        <div className="mt-8 pt-6 border-t border-stone-700">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                                <Ticket className="h-5 w-5 text-green-400" />
                                Lottery Sales
                            </h3>

                            <div>
                                <label className="text-sm text-stone-400">Minimum Age</label>
                                <select
                                    value={settings.lottery.minimumAge}
                                    onChange={(e) => setSettings({
                                        ...settings,
                                        lottery: { ...settings.lottery, minimumAge: parseInt(e.target.value) }
                                    })}
                                    className="w-full mt-1 bg-stone-800 border border-stone-700 rounded-xl px-4 py-3"
                                >
                                    <option value={18}>18 years</option>
                                    <option value={21}>21 years</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="lg:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
                            <div>
                                <p className="font-bold text-amber-400">Compliance Notice</p>
                                <p className="text-sm text-stone-400 mt-1">
                                    These settings help enforce state and local regulations. Always verify with your local ABC
                                    (Alcohol Beverage Control) and health department for current requirements. Fines for selling
                                    to minors can be $1,000+ per violation, and repeat violations may result in license revocation.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

