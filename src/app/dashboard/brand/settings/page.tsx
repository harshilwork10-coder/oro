'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Lock, Shield, Settings, Info, Loader2 } from 'lucide-react'

export default function BrandSettingsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const [formData, setFormData] = useState({
        brandCode: '',
        lockPricing: false,
        lockServices: false,
        lockCommission: false,
        lockProducts: false,
        settings: {
            appointmentsEnabled: true,
            tipsEnabled: true,
            commissionEnabled: true
        }
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/brand/settings')
            if (!res.ok) {
                if (res.status === 403) {
                    setError('Access denied. Only Brand Franchisors can access this page.')
                } else {
                    setError('Failed to fetch settings')
                }
                setLoading(false)
                return
            }
            const data = await res.json()
            if (data.success) {
                const { brandCode, locks, brandSettings } = data.data
                setFormData({
                    brandCode: brandCode || '',
                    lockPricing: locks?.lockPricing || false,
                    lockServices: locks?.lockServices || false,
                    lockCommission: locks?.lockCommission || false,
                    lockProducts: locks?.lockProducts || false,
                    settings: {
                        appointmentsEnabled: brandSettings?.appointmentsEnabled ?? true,
                        tipsEnabled: brandSettings?.tipsEnabled ?? true,
                        commissionEnabled: brandSettings?.commissionEnabled ?? true
                    }
                })
            }
        } catch (err) {
            setError('An error occurred loading settings')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        setSuccess('')

        try {
            const payload = {
                brandCode: formData.brandCode,
                lockPricing: formData.lockPricing,
                lockServices: formData.lockServices,
                lockCommission: formData.lockCommission,
                lockProducts: formData.lockProducts,
                brandSettings: formData.settings
            }

            const res = await fetch('/api/brand/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()

            if (data.success) {
                setSuccess('Settings saved successfully')
                const { brandCode, locks, brandSettings } = data.data
                setFormData({
                    brandCode: brandCode || '',
                    lockPricing: locks?.lockPricing || false,
                    lockServices: locks?.lockServices || false,
                    lockCommission: locks?.lockCommission || false,
                    lockProducts: locks?.lockProducts || false,
                    settings: {
                        appointmentsEnabled: brandSettings?.appointmentsEnabled ?? true,
                        tipsEnabled: brandSettings?.tipsEnabled ?? true,
                        commissionEnabled: brandSettings?.commissionEnabled ?? true
                    }
                })
            } else {
                setError(data.message || 'Failed to save settings')
            }
        } catch (err) {
            setError('An error occurred saving settings')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 text-stone-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-stone-100 flex items-center gap-3">
                        <Shield className="h-8 w-8 text-violet-500" />
                        Brand Settings
                    </h1>
                    <p className="text-stone-400 mt-2">
                        Manage global settings and controls for all your franchise locations.
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Brand Identity */}
                <section className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-stone-200 mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-violet-400" />
                        Brand Identity
                    </h2>
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-stone-400 mb-2">
                            Brand Code (Unique Identifier)
                        </label>
                        <input
                            type="text"
                            value={formData.brandCode}
                            onChange={(e) => setFormData({ ...formData, brandCode: e.target.value.toUpperCase() })}
                            className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-3 text-stone-100 focus:ring-2 focus:ring-violet-500 outline-none font-mono"
                            placeholder="BRANDCODE"
                            minLength={3}
                        />
                        <p className="text-xs text-stone-500 mt-2">
                            Used for internal identification and potentially for sub-franchisee matching.
                        </p>
                    </div>
                </section>

                {/* Locks & Controls - The "spine" of the brand system */}
                <section className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Lock className="h-32 w-32 text-violet-500" />
                    </div>

                    <h2 className="text-xl font-semibold text-stone-200 mb-6 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-violet-400" />
                        Brand Controls (Enforcement)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { key: 'lockPricing', label: 'Lock Pricing', desc: 'Prevent locations from changing service/product prices' },
                            { key: 'lockServices', label: 'Lock Services', desc: 'Prevent locations from adding or editing services defined by Brand' },
                            { key: 'lockCommission', label: 'Lock Commission Structure', desc: 'Enforce brand-wide commission rules' },
                            { key: 'lockProducts', label: 'Lock Product Catalog', desc: 'Prevent adding non-approved products' }
                        ].map((item) => (
                            <div key={item.key} className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${formData[item.key as keyof typeof formData]
                                    ? 'bg-violet-500/10 border-violet-500/50'
                                    : 'bg-stone-950/50 border-stone-800 hover:border-stone-700'
                                }`}
                                onClick={() => setFormData({ ...formData, [item.key]: !formData[item.key as keyof typeof formData] })}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-1 h-5 w-5 rounded border flex items-center justify-center transition-colors ${formData[item.key as keyof typeof formData]
                                            ? 'bg-violet-500 border-violet-500'
                                            : 'border-stone-600'
                                        }`}>
                                        {formData[item.key as keyof typeof formData] && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-stone-200">{item.label}</h3>
                                        <p className="text-sm text-stone-500 mt-1">{item.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Default Feature Flags */}
                <section className="bg-stone-900/50 backdrop-blur-sm border border-stone-800 rounded-2xl p-6">
                    <h2 className="text-xl font-semibold text-stone-200 mb-6 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-violet-400" />
                        Default Location Features
                    </h2>
                    <p className="text-sm text-stone-500 mb-6">
                        These settings apply as defaults to all locations. Sub-franchisees generally cannot toggle these if the feature is locked.
                    </p>

                    <div className="space-y-4 max-w-2xl">
                        {[
                            { key: 'appointmentsEnabled', label: 'Enable Appointments', desc: 'Allow booking appointments' },
                            { key: 'tipsEnabled', label: 'Enable Tips', desc: 'Prompt for tips at checkout' },
                            { key: 'commissionEnabled', label: 'Enable Commission', desc: 'Track employee commissions' }
                        ].map((item) => (
                            <label key={item.key} className="flex items-center justify-between p-4 bg-stone-950/50 border border-stone-800 rounded-xl cursor-pointer hover:border-stone-700 transition-colors">
                                <div>
                                    <div className="font-medium text-stone-200">{item.label}</div>
                                    <div className="text-sm text-stone-500">{item.desc}</div>
                                </div>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.settings[item.key as keyof typeof formData.settings] ? 'bg-emerald-500' : 'bg-stone-700'
                                    }`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.settings[item.key as keyof typeof formData.settings] ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.settings[item.key as keyof typeof formData.settings]}
                                    onChange={() => setFormData({
                                        ...formData,
                                        settings: {
                                            ...formData.settings,
                                            [item.key]: !formData.settings[item.key as keyof typeof formData.settings]
                                        }
                                    })}
                                />
                            </label>
                        ))}
                    </div>
                </section>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {saving ? 'Saving...' : 'Save Brand Settings'}
                    </button>
                </div>
            </form>
        </div>
    )
}
