'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Save,
    ArrowLeft,
    Loader2,
    DollarSign,
    Percent,
    Plus,
    Trash2,
    Briefcase,
    CheckCircle2,
    AlertCircle,
    Search
} from 'lucide-react'

interface CommissionTier {
    id?: string
    name: string
    minRevenue: number
    commissionRate: number
}

interface ServiceOverride {
    id?: string
    serviceId: string
    serviceName: string
    commissionType: 'PERCENTAGE' | 'FLAT'
    commissionValue: number
}

interface PaymentConfig {
    paymentType: 'COMMISSION_ONLY' | 'HOURLY_PLUS_COMMISSION' | 'SALARY_PLUS_COMMISSION' | 'BOOTH_RENTAL'
    hourlyRate: number
    baseSalary: number
    defaultCommissionRate: number
    deductProductCost: boolean
    tiers: CommissionTier[]
    overrides: ServiceOverride[]
}

export default function CommissionConfigPage() {
    const params = useParams()
    const router = useRouter()
    const employeeId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [employeeName, setEmployeeName] = useState('')
    const [services, setServices] = useState<any[]>([])

    const [config, setConfig] = useState<PaymentConfig>({
        paymentType: 'COMMISSION_ONLY',
        hourlyRate: 0,
        baseSalary: 0,
        defaultCommissionRate: 40,
        deductProductCost: true,
        tiers: [],
        overrides: []
    })

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch employee basic info
                const empRes = await fetch(`/api/franchise/employees/${employeeId}`)
                const empData = await empRes.json()
                setEmployeeName(empData.name)

                // Fetch existing config
                const configRes = await fetch(`/api/employees/${employeeId}/payment-config`)
                if (configRes.ok) {
                    const configData = await configRes.json()
                    setConfig({
                        paymentType: configData.paymentType || 'COMMISSION_ONLY',
                        hourlyRate: Number(configData.hourlyRate) || 0,
                        baseSalary: Number(configData.baseSalary) || 0,
                        defaultCommissionRate: Number(configData.defaultCommissionRate) || 40,
                        deductProductCost: configData.deductProductCost ?? true,
                        tiers: configData.tiers || [],
                        overrides: configData.overrides || []
                    })
                }

                // Fetch services for overrides
                const servicesRes = await fetch('/api/services')
                const servicesData = await servicesRes.json()
                setServices(servicesData)

            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [employeeId])

    const handleSave = async () => {
        setSaving(true)
        try {
            const response = await fetch(`/api/employees/${employeeId}/payment-config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })

            if (response.ok) {
                alert('Commission settings saved successfully!')
            } else {
                throw new Error('Failed to save')
            }
        } catch (error) {
            console.error('Error saving:', error)
            alert('Error saving settings')
        } finally {
            setSaving(false)
        }
    }

    const addTier = () => {
        setConfig(prev => ({
            ...prev,
            tiers: [...prev.tiers, { name: '', minRevenue: 0, commissionRate: 0 }]
        }))
    }

    const removeTier = (index: number) => {
        setConfig(prev => ({
            ...prev,
            tiers: prev.tiers.filter((_, i) => i !== index)
        }))
    }

    const updateTier = (index: number, field: keyof CommissionTier, value: any) => {
        const newTiers = [...config.tiers]
        newTiers[index] = { ...newTiers[index], [field]: value }
        setConfig(prev => ({ ...prev, tiers: newTiers }))
    }

    const addOverride = (serviceId: string) => {
        const service = services.find(s => s.id === serviceId)
        if (!service) return

        setConfig(prev => ({
            ...prev,
            overrides: [
                ...prev.overrides,
                {
                    serviceId,
                    serviceName: service.name,
                    commissionType: 'PERCENTAGE',
                    commissionValue: prev.defaultCommissionRate
                }
            ]
        }))
    }

    const removeOverride = (index: number) => {
        setConfig(prev => ({
            ...prev,
            overrides: prev.overrides.filter((_, i) => i !== index)
        }))
    }

    const updateOverride = (index: number, field: keyof ServiceOverride, value: any) => {
        const newOverrides = [...config.overrides]
        newOverrides[index] = { ...newOverrides[index], [field]: value }
        setConfig(prev => ({ ...prev, overrides: newOverrides }))
    }

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-stone-100">
                            Commission Configuration
                        </h1>
                        <p className="text-stone-400">
                            Settings for <span className="text-orange-400 font-medium">{employeeName}</span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl font-semibold transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Payment Model & Base Rates */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-panel p-6 rounded-xl space-y-6">
                        <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-400" />
                            Payment Model
                        </h3>

                        <div className="space-y-3">
                            {[
                                { id: 'COMMISSION_ONLY', label: 'Commission Only' },
                                { id: 'HOURLY_PLUS_COMMISSION', label: 'Hourly + Commission' },
                                { id: 'SALARY_PLUS_COMMISSION', label: 'Salary + Commission' },
                                { id: 'BOOTH_RENTAL', label: 'Booth Rental' }
                            ].map((type) => (
                                <label key={type.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-800 hover:bg-stone-800/50 cursor-pointer transition-colors">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value={type.id}
                                        checked={config.paymentType === type.id}
                                        onChange={(e) => setConfig({ ...config, paymentType: e.target.value as any })}
                                        className="text-orange-500 focus:ring-orange-500 bg-stone-900 border-stone-700"
                                    />
                                    <span className="text-stone-300">{type.label}</span>
                                </label>
                            ))}
                        </div>

                        {/* Conditional Inputs */}
                        {config.paymentType === 'HOURLY_PLUS_COMMISSION' && (
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Hourly Rate ($)</label>
                                <input
                                    type="number"
                                    value={config.hourlyRate}
                                    onChange={(e) => setConfig({ ...config, hourlyRate: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                        )}

                        {config.paymentType === 'SALARY_PLUS_COMMISSION' && (
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Annual Salary ($)</label>
                                <input
                                    type="number"
                                    value={config.baseSalary}
                                    onChange={(e) => setConfig({ ...config, baseSalary: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white"
                                />
                            </div>
                        )}

                        <div className="pt-4 border-t border-stone-800">
                            <label className="block text-sm text-stone-400 mb-1">Default Commission Rate (%)</label>
                            <input
                                type="number"
                                value={config.defaultCommissionRate}
                                onChange={(e) => setConfig({ ...config, defaultCommissionRate: parseFloat(e.target.value) })}
                                className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white text-lg font-bold"
                            />
                            <p className="text-xs text-stone-500 mt-1">Applied to all services unless overridden</p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <input
                                type="checkbox"
                                id="deductProduct"
                                checked={config.deductProductCost}
                                onChange={(e) => setConfig({ ...config, deductProductCost: e.target.checked })}
                                className="rounded border-stone-700 bg-stone-900 text-orange-500 focus:ring-orange-500"
                            />
                            <label htmlFor="deductProduct" className="text-sm text-stone-300">
                                Deduct product cost before commission
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Tiers & Overrides */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Tiered Commission */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                                <Percent className="h-5 w-5 text-blue-400" />
                                Tiered Commission
                            </h3>
                            <button
                                onClick={addTier}
                                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" /> Add Tier
                            </button>
                        </div>

                        {config.tiers.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-stone-800 rounded-xl text-stone-500">
                                No tiers configured. Using flat {config.defaultCommissionRate}% rate.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {config.tiers.map((tier, index) => (
                                    <div key={index} className="flex items-center gap-4 p-3 bg-stone-900/50 rounded-lg border border-stone-800">
                                        <div className="flex-1">
                                            <label className="text-xs text-stone-500">Tier Name</label>
                                            <input
                                                type="text"
                                                value={tier.name}
                                                onChange={(e) => updateTier(index, 'name', e.target.value)}
                                                placeholder="e.g. Gold"
                                                className="w-full bg-transparent border-none p-0 text-stone-200 focus:ring-0 placeholder-stone-600"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-xs text-stone-500">Min Revenue ($)</label>
                                            <input
                                                type="number"
                                                value={tier.minRevenue}
                                                onChange={(e) => updateTier(index, 'minRevenue', parseFloat(e.target.value))}
                                                className="w-full bg-stone-800 border-stone-700 rounded px-2 py-1 text-stone-200 text-sm"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs text-stone-500">Rate (%)</label>
                                            <input
                                                type="number"
                                                value={tier.commissionRate}
                                                onChange={(e) => updateTier(index, 'commissionRate', parseFloat(e.target.value))}
                                                className="w-full bg-stone-800 border-stone-700 rounded px-2 py-1 text-stone-200 text-sm font-bold"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeTier(index)}
                                            className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-4"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Service Overrides */}
                    <div className="glass-panel p-6 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-purple-400" />
                                Service Overrides
                            </h3>
                            <select
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addOverride(e.target.value)
                                        e.target.value = ''
                                    }
                                }}
                                className="bg-stone-900 border-stone-700 text-stone-300 text-sm rounded-lg px-3 py-1.5"
                            >
                                <option value="">+ Add Override</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {config.overrides.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed border-stone-800 rounded-xl text-stone-500">
                                No service overrides. All services use default rate.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {config.overrides.map((override, index) => (
                                    <div key={index} className="flex items-center gap-4 p-3 bg-stone-900/50 rounded-lg border border-stone-800">
                                        <div className="flex-1 font-medium text-stone-200">
                                            {override.serviceName}
                                        </div>
                                        <div className="w-32">
                                            <select
                                                value={override.commissionType}
                                                onChange={(e) => updateOverride(index, 'commissionType', e.target.value)}
                                                className="w-full bg-stone-800 border-stone-700 rounded px-2 py-1 text-stone-300 text-sm"
                                            >
                                                <option value="PERCENTAGE">Percentage (%)</option>
                                                <option value="FLAT">Flat Rate ($)</option>
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <input
                                                type="number"
                                                value={override.commissionValue}
                                                onChange={(e) => updateOverride(index, 'commissionValue', parseFloat(e.target.value))}
                                                className="w-full bg-stone-800 border-stone-700 rounded px-2 py-1 text-stone-200 text-sm font-bold"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeOverride(index)}
                                            className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
