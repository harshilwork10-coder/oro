'use client'

import { useState, useEffect } from 'react'
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Link from 'next/link'
import {
    ArrowLeft,
    Shield,
    CheckCircle,
    AlertCircle,
    Save,
    RefreshCw,
    Eye,
    EyeOff,
    Building2,
    DollarSign,
    Key,
    Globe,
} from "lucide-react"

interface ManufacturerConfig {
    id?: string
    manufacturer: string
    storeId: string
    accountNumber: string
    apiKey: string
    apiSecret: string
    portalUrl: string
    rebatePerPack: number
    rebatePerCarton: number
    loyaltyBonus: number
    isActive: boolean
    lastSyncAt: string | null
}

const MANUFACTURER_INFO: Record<string, {
    name: string
    color: string
    bgColor: string
    brands: string
    portalHint: string
    accountLabel: string
    defaultRebatePack: number
    defaultRebateCarton: number
}> = {
    ALTRIA: {
        name: 'Altria / Philip Morris',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        brands: 'Marlboro, Copenhagen, Skoal, Black & Mild, IQOS, on!',
        portalHint: 'https://retail.altria.com (Insight C3M / ScanConnect)',
        accountLabel: 'Altria Management Account #',
        defaultRebatePack: 0.04,
        defaultRebateCarton: 0.40,
    },
    RJR: {
        name: 'Reynolds American (RJR)',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        brands: 'Camel, Newport, Pall Mall, Natural American Spirit, Grizzly, Vuse, Velo',
        portalHint: 'RMSC / Circana Portal',
        accountLabel: 'RJR Store ID / RMSC Account #',
        defaultRebatePack: 0.04,
        defaultRebateCarton: 0.40,
    },
    ITG: {
        name: 'ITG Brands',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        brands: 'Kool, Winston, Maverick, Salem, USA Gold, Dutch Masters',
        portalHint: 'ITG Brands Portal',
        accountLabel: 'ITG Account Number',
        defaultRebatePack: 0.03,
        defaultRebateCarton: 0.30,
    },
}

export default function TobaccoSettingsPage() {
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() { redirect('/login') },
    })

    const [configs, setConfigs] = useState<ManufacturerConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
    const [editForms, setEditForms] = useState<Record<string, ManufacturerConfig>>({})
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

    useEffect(() => { fetchConfigs() }, [])

    const fetchConfigs = async () => {
        try {
            const res = await fetch('/api/tobacco-scan/manufacturer-config')
            if (res.ok) {
                const data = await res.json()
                const existing = data.configs || []
                setConfigs(existing)

                // Initialize edit forms for all manufacturers
                const forms: Record<string, ManufacturerConfig> = {}
                for (const mfg of ['ALTRIA', 'RJR', 'ITG']) {
                    const existing_config = existing.find((c: ManufacturerConfig) => c.manufacturer === mfg)
                    const info = MANUFACTURER_INFO[mfg]
                    forms[mfg] = existing_config || {
                        manufacturer: mfg,
                        storeId: '',
                        accountNumber: '',
                        apiKey: '',
                        apiSecret: '',
                        portalUrl: '',
                        rebatePerPack: info.defaultRebatePack,
                        rebatePerCarton: info.defaultRebateCarton,
                        loyaltyBonus: 0,
                        isActive: false,
                    }
                }
                setEditForms(forms)
            }
        } catch (error) {
            console.error('Failed to fetch configs:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveConfig = async (manufacturer: string) => {
        setSaving(manufacturer)
        setSaveSuccess(null)
        try {
            const form = editForms[manufacturer]
            const res = await fetch('/api/tobacco-scan/manufacturer-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    manufacturer,
                    storeId: form.storeId || null,
                    accountNumber: form.accountNumber || null,
                    apiKey: form.apiKey || null,
                    apiSecret: form.apiSecret || null,
                    portalUrl: form.portalUrl || null,
                    rebatePerPack: parseFloat(String(form.rebatePerPack)) || 0.04,
                    rebatePerCarton: parseFloat(String(form.rebatePerCarton)) || 0.40,
                    loyaltyBonus: parseFloat(String(form.loyaltyBonus)) || 0,
                }),
            })
            if (res.ok) {
                setSaveSuccess(manufacturer)
                fetchConfigs()
                setTimeout(() => setSaveSuccess(null), 3000)
            } else {
                alert('Failed to save — please try again')
            }
        } catch (error) {
            console.error('Failed to save:', error)
            alert('Failed to save')
        } finally {
            setSaving(null)
        }
    }

    const updateForm = (mfg: string, field: string, value: string | number) => {
        setEditForms(prev => ({
            ...prev,
            [mfg]: { ...prev[mfg], [field]: value }
        }))
    }

    const isEnrolled = (mfg: string) => configs.some(c => c.manufacturer === mfg && c.accountNumber)

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-stone-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard/reports/tobacco-scan" className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                    <ArrowLeft className="h-5 w-5 text-stone-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-amber-500" />
                        Manufacturer Enrollment
                    </h1>
                    <p className="text-stone-500 text-sm">Set up your scan data accounts for each tobacco manufacturer</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10">
                <p className="text-sm text-blue-300">
                    <strong>How it works:</strong> Enter your account details for each manufacturer you&apos;re enrolled with.
                    Your account number is provided by your distributor or the manufacturer&apos;s trade rep.
                    This information is used when generating scan data files for submission.
                </p>
            </div>

            {/* Manufacturer Cards */}
            {(['ALTRIA', 'RJR', 'ITG'] as const).map(mfg => {
                const info = MANUFACTURER_INFO[mfg]
                const form = editForms[mfg]
                const enrolled = isEnrolled(mfg)
                if (!form) return null

                return (
                    <div key={mfg} className="glass-panel rounded-xl overflow-hidden">
                        {/* Card Header */}
                        <div className={`px-6 py-4 flex items-center justify-between ${info.bgColor}`}>
                            <div className="flex items-center gap-3">
                                <Building2 className={`h-5 w-5 ${info.color}`} />
                                <div>
                                    <h2 className={`text-lg font-semibold ${info.color}`}>{info.name}</h2>
                                    <p className="text-xs text-stone-400">{info.brands}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {enrolled ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                                        <CheckCircle className="h-3.5 w-3.5" /> Enrolled
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-stone-500/20 text-stone-400">
                                        <AlertCircle className="h-3.5 w-3.5" /> Not Enrolled
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Form Body */}
                        <div className="px-6 py-5 space-y-4">
                            {/* Account Info Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase mb-1.5">{info.accountLabel}</label>
                                    <input
                                        type="text"
                                        value={form.accountNumber || ''}
                                        onChange={(e) => updateForm(mfg, 'accountNumber', e.target.value)}
                                        placeholder="Enter account number..."
                                        className="w-full px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase mb-1.5">Store ID</label>
                                    <input
                                        type="text"
                                        value={form.storeId || ''}
                                        onChange={(e) => updateForm(mfg, 'storeId', e.target.value)}
                                        placeholder="Manufacturer store ID..."
                                        className="w-full px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-600"
                                    />
                                </div>
                            </div>

                            {/* Portal URL */}
                            <div>
                                <label className="block text-xs text-stone-400 uppercase mb-1.5 flex items-center gap-1">
                                    <Globe className="h-3 w-3" /> Portal URL
                                </label>
                                <input
                                    type="url"
                                    value={form.portalUrl || ''}
                                    onChange={(e) => updateForm(mfg, 'portalUrl', e.target.value)}
                                    placeholder={info.portalHint}
                                    className="w-full px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-600"
                                />
                            </div>

                            {/* API Credentials */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase mb-1.5 flex items-center gap-1">
                                        <Key className="h-3 w-3" /> API Key <span className="text-stone-600">(optional)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showSecrets[`${mfg}_key`] ? 'text' : 'password'}
                                            value={form.apiKey || ''}
                                            onChange={(e) => updateForm(mfg, 'apiKey', e.target.value)}
                                            placeholder="For auto-submit..."
                                            className="w-full px-3 py-2.5 pr-10 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecrets(prev => ({ ...prev, [`${mfg}_key`]: !prev[`${mfg}_key`] }))}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                                        >
                                            {showSecrets[`${mfg}_key`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase mb-1.5 flex items-center gap-1">
                                        <Key className="h-3 w-3" /> API Secret <span className="text-stone-600">(optional)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showSecrets[`${mfg}_secret`] ? 'text' : 'password'}
                                            value={form.apiSecret || ''}
                                            onChange={(e) => updateForm(mfg, 'apiSecret', e.target.value)}
                                            placeholder="For auto-submit..."
                                            className="w-full px-3 py-2.5 pr-10 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-600"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecrets(prev => ({ ...prev, [`${mfg}_secret`]: !prev[`${mfg}_secret`] }))}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                                        >
                                            {showSecrets[`${mfg}_secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Rebate Rates */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase mb-1.5 flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> Rebate / Pack
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.rebatePerPack ?? ''}
                                        onChange={(e) => updateForm(mfg, 'rebatePerPack', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase mb-1.5 flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> Rebate / Carton
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.rebatePerCarton ?? ''}
                                        onChange={(e) => updateForm(mfg, 'rebatePerCarton', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase mb-1.5 flex items-center gap-1">
                                        <DollarSign className="h-3 w-3" /> Loyalty Bonus
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={form.loyaltyBonus ?? ''}
                                        onChange={(e) => updateForm(mfg, 'loyaltyBonus', e.target.value)}
                                        className="w-full px-3 py-2.5 bg-stone-800/50 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center justify-between pt-2">
                                <div>
                                    {saveSuccess === mfg && (
                                        <span className="inline-flex items-center gap-1 text-sm text-emerald-400 animate-pulse">
                                            <CheckCircle className="h-4 w-4" /> Saved!
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => saveConfig(mfg)}
                                    disabled={saving === mfg}
                                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                                        saving === mfg
                                            ? 'bg-stone-700 text-stone-400'
                                            : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                    }`}
                                >
                                    {saving === mfg ? (
                                        <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save className="h-4 w-4" /> Save {mfg}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* Help text */}
            <div className="text-center py-4">
                <p className="text-xs text-stone-600">
                    Contact your distributor or manufacturer trade rep if you don&apos;t have an account number.
                    API credentials are optional — they&apos;re only needed for automated file submission.
                </p>
            </div>
        </div>
    )
}
