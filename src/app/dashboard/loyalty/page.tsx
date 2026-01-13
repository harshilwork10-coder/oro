'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import {
    Trophy,
    DollarSign,
    Star,
    Save,
    Sparkles,
    TrendingUp,
    Edit2,
    Check,
    X,
    Plus,
    Loader2
} from 'lucide-react'

interface ServiceMultiplier {
    serviceId: string
    serviceName: string
    categoryName: string
    multiplier: number
    isEditing?: boolean
}

export default function LoyaltyProgramPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            redirect('/login')
        },
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [services, setServices] = useState<any[]>([])
    const [serviceMultipliers, setServiceMultipliers] = useState<ServiceMultiplier[]>([])
    const [config, setConfig] = useState({
        isEnabled: true,
        pointsPerDollar: '1.0',
        redemptionRatio: '0.01'
    })

    const franchiseId = 'your-franchise-id' // Replace with session.user.franchiseId

    useEffect(() => {
        if (status === 'authenticated') {
            fetchConfig()
            fetchServices()
        }
    }, [status])

    async function fetchConfig() {
        try {
            const res = await fetch(`/api/loyalty?franchiseId=${franchiseId}`)
            if (res.ok) {
                const data = await res.json()
                if (data) {
                    setConfig({
                        isEnabled: data.isEnabled,
                        pointsPerDollar: data.pointsPerDollar.toString(),
                        redemptionRatio: data.redemptionRatio.toString()
                    })
                    // Load service multipliers if they exist
                    if (data.serviceMultipliers) {
                        setServiceMultipliers(data.serviceMultipliers)
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching loyalty config:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchServices() {
        try {
            const res = await fetch('/api/services')
            if (res.ok) {
                const data = await res.json()
                setServices(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error('Error fetching services:', error)
        }
    }

    async function handleSave() {
        setSaving(true)
        try {
            const res = await fetch('/api/loyalty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    franchiseId,
                    ...config,
                    serviceMultipliers
                })
            })

            if (res.ok) {
                alert('Loyalty program settings saved!')
            }
        } catch (error) {
            console.error('Error saving config:', error)
            alert('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const addServiceMultiplier = (service: any) => {
        // Check if already exists
        if (serviceMultipliers.find(m => m.serviceId === service.id)) {
            return
        }
        setServiceMultipliers([
            ...serviceMultipliers,
            {
                serviceId: service.id,
                serviceName: service.name,
                categoryName: service.category?.name || 'Uncategorized',
                multiplier: 2.0 // Default 2x bonus
            }
        ])
    }

    const updateMultiplier = (serviceId: string, multiplier: number) => {
        setServiceMultipliers(serviceMultipliers.map(m =>
            m.serviceId === serviceId ? { ...m, multiplier } : m
        ))
    }

    const removeMultiplier = (serviceId: string) => {
        setServiceMultipliers(serviceMultipliers.filter(m => m.serviceId !== serviceId))
    }

    // Calculate example
    const exampleSpend = 100
    const earnedPoints = Math.floor(exampleSpend * parseFloat(config.pointsPerDollar || '1'))
    const pointsNeeded = 100
    const dollarValue = (pointsNeeded * parseFloat(config.redemptionRatio || '0.01')).toFixed(2)

    // Available services (not yet added as multipliers)
    const availableServices = services.filter(s =>
        !serviceMultipliers.find(m => m.serviceId === s.id)
    )

    if (status === 'loading' || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl mx-auto bg-stone-950 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Loyalty Program</h1>
                <p className="text-stone-400">Configure your customer loyalty and rewards program</p>
            </div>

            <div className="space-y-6">
                {/* Enable/Disable */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1">Program Status</h3>
                            <p className="text-sm text-stone-400">Enable or disable the loyalty program</p>
                        </div>
                        <button
                            onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
                            className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${config.isEnabled ? 'bg-emerald-500' : 'bg-stone-700'
                                }`}
                        >
                            <span
                                className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${config.isEnabled ? 'translate-x-12' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Points Configuration */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-400" />
                        Points Earning
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Points Earned Per Dollar Spent
                            </label>
                            <input
                                type="number"
                                value={config.pointsPerDollar}
                                onChange={(e) => setConfig({ ...config, pointsPerDollar: e.target.value })}
                                className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                step="0.1"
                                min="0"
                            />
                            <p className="text-xs text-stone-500 mt-1">
                                Example: Customer spends ${exampleSpend} → Earns {earnedPoints} points
                            </p>
                        </div>
                    </div>
                </div>

                {/* 🌟 NEW: Service Bonus Multipliers */}
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/20 border border-purple-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-400" />
                            Bonus Points by Service
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-medium rounded-full">
                                ADVANCED
                            </span>
                        </h3>
                    </div>
                    <p className="text-sm text-stone-400 mb-6">
                        Give extra points on specific services to encourage customers to book them.
                        Great for high-margin services like facials, body treatments, etc.
                    </p>

                    {/* Current Multipliers */}
                    {serviceMultipliers.length > 0 ? (
                        <div className="space-y-3 mb-6">
                            {serviceMultipliers.map(mult => (
                                <div
                                    key={mult.serviceId}
                                    className="flex items-center justify-between p-4 bg-stone-800/50 rounded-xl border border-stone-700"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-purple-500/20 rounded-lg">
                                            <TrendingUp className="h-5 w-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{mult.serviceName}</p>
                                            <p className="text-xs text-stone-500">{mult.categoryName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-stone-900 rounded-lg p-1">
                                            <button
                                                onClick={() => updateMultiplier(mult.serviceId, Math.max(1.5, mult.multiplier - 0.5))}
                                                className="p-2 hover:bg-stone-800 rounded text-stone-400 hover:text-white"
                                            >
                                                -
                                            </button>
                                            <span className="px-3 py-1 bg-purple-600 text-white font-bold rounded">
                                                {mult.multiplier}x
                                            </span>
                                            <button
                                                onClick={() => updateMultiplier(mult.serviceId, Math.min(5, mult.multiplier + 0.5))}
                                                className="p-2 hover:bg-stone-800 rounded text-stone-400 hover:text-white"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => removeMultiplier(mult.serviceId)}
                                            className="p-2 hover:bg-red-900/30 rounded text-stone-400 hover:text-red-400"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 bg-stone-800/30 rounded-xl border border-dashed border-stone-700 text-center mb-6">
                            <Sparkles className="h-8 w-8 text-stone-600 mx-auto mb-2" />
                            <p className="text-stone-500">No bonus services configured</p>
                            <p className="text-xs text-stone-600">Add services below to give bonus points</p>
                        </div>
                    )}

                    {/* Add Service Dropdown */}
                    {availableServices.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Add Service for Bonus Points
                            </label>
                            <div className="relative">
                                <select
                                    onChange={(e) => {
                                        const service = services.find(s => s.id === e.target.value)
                                        if (service) {
                                            addServiceMultiplier(service)
                                            e.target.value = ''
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-stone-800 border border-stone-700 rounded-lg text-white appearance-none cursor-pointer hover:border-purple-500/50 focus:ring-2 focus:ring-purple-500"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select a service to add bonus points...</option>
                                    {availableServices.map(service => (
                                        <option key={service.id} value={service.id}>
                                            {service.name} - ${service.price}
                                        </option>
                                    ))}
                                </select>
                                <Plus className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Example Calculation */}
                    {serviceMultipliers.length > 0 && (
                        <div className="mt-6 p-4 bg-stone-900/50 rounded-lg border border-stone-700">
                            <p className="text-sm text-stone-400">
                                <span className="text-purple-400 font-medium">Example:</span> Customer gets a{' '}
                                <span className="text-white font-medium">{serviceMultipliers[0]?.serviceName}</span>{' '}
                                for $100 → Earns{' '}
                                <span className="text-purple-400 font-bold">
                                    {Math.floor(100 * parseFloat(config.pointsPerDollar) * (serviceMultipliers[0]?.multiplier || 1))} points
                                </span>{' '}
                                (instead of {100 * parseFloat(config.pointsPerDollar)} regular points)
                            </p>
                        </div>
                    )}
                </div>

                {/* Redemption Configuration */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-400" />
                        Points Redemption
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-stone-300 mb-2">
                                Dollar Value Per Point
                            </label>
                            <input
                                type="number"
                                value={config.redemptionRatio}
                                onChange={(e) => setConfig({ ...config, redemptionRatio: e.target.value })}
                                className="w-full px-4 py-2.5 bg-stone-900 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                step="0.001"
                                min="0"
                            />
                            <p className="text-xs text-stone-500 mt-1">
                                Example: {pointsNeeded} points = ${dollarValue} discount
                            </p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-purple-900/40 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

