'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Loader2, Save, DollarSign, ToggleLeft, ToggleRight,
    CreditCard, FileText, Printer, Phone, CheckCircle, Percent
} from 'lucide-react'

interface CounterService {
    id: string
    name: string
    icon: string
    feeType: string
    defaultFee: number
    maxAmount: number | null
    requiresAmount: boolean
    taxable: boolean
    category: string
    description: string
    enabled: boolean
}

export default function CounterServicesConfigPage() {
    const [services, setServices] = useState<CounterService[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

    useEffect(() => {
        loadServices()
    }, [])

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000)
            return () => clearTimeout(timer)
        }
    }, [toast])

    async function loadServices() {
        try {
            // Load the default counter services definition
            const defaultServices: CounterService[] = [
                { id: 'MONEY_ORDER', name: 'Money Order', icon: '💵', feeType: 'FLAT', defaultFee: 1.25, maxAmount: 1000, requiresAmount: true, taxable: false, category: 'Financial Services', description: 'Western Union / MoneyGram', enabled: true },
                { id: 'BILL_PAY', name: 'Bill Payment', icon: '📄', feeType: 'FLAT', defaultFee: 1.50, maxAmount: 5000, requiresAmount: true, taxable: false, category: 'Financial Services', description: 'Utility bill payments', enabled: true },
                { id: 'CHECK_CASHING', name: 'Check Cashing', icon: '📝', feeType: 'PERCENTAGE', defaultFee: 3.0, maxAmount: 10000, requiresAmount: true, taxable: false, category: 'Financial Services', description: 'Check cashing (3% fee)', enabled: false },
                { id: 'FAX', name: 'Fax Service', icon: '📠', feeType: 'PER_PAGE', defaultFee: 2.00, maxAmount: null, requiresAmount: false, taxable: true, category: 'Office Services', description: '$2.00 per page', enabled: true },
                { id: 'COPY', name: 'Copy / Print', icon: '🖨️', feeType: 'PER_PAGE', defaultFee: 0.25, maxAmount: null, requiresAmount: false, taxable: true, category: 'Office Services', description: '$0.25 per page', enabled: true },
                { id: 'PREPAID_ACTIVATION', name: 'Prepaid Phone', icon: '📱', feeType: 'FLAT', defaultFee: 0.00, maxAmount: null, requiresAmount: false, taxable: false, category: 'Telecom', description: 'Prepaid card activation', enabled: false },
            ]

            // Try to load persisted config
            const stored = localStorage.getItem('counter-services-config')
            if (stored) {
                const savedConfig = JSON.parse(stored)
                defaultServices.forEach(svc => {
                    const saved = savedConfig.find((s: any) => s.id === svc.id)
                    if (saved) {
                        svc.enabled = saved.enabled
                        svc.defaultFee = saved.defaultFee
                    }
                })
            }

            setServices(defaultServices)
        } finally {
            setLoading(false)
        }
    }

    function toggleService(id: string) {
        setServices(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
    }

    function updateFee(id: string, fee: number) {
        setServices(prev => prev.map(s => s.id === id ? { ...s, defaultFee: fee } : s))
    }

    function handleSave() {
        setSaving(true)
        try {
            const config = services.map(s => ({ id: s.id, enabled: s.enabled, defaultFee: s.defaultFee }))
            localStorage.setItem('counter-services-config', JSON.stringify(config))
            setToast({ message: 'Counter services saved!', type: 'success' })
        } catch (e) {
            setToast({ message: 'Failed to save', type: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const feeLabel = (type: string) => {
        if (type === 'PERCENTAGE') return '%'
        if (type === 'PER_PAGE') return '/page'
        return 'flat'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    const categories = [...new Set(services.map(s => s.category))]

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/settings"
                        className="p-2 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Counter Services</h1>
                        <p className="text-stone-400 text-sm">Configure which counter services are available at POS and their fees</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 rounded-xl font-semibold transition-all disabled:opacity-50 text-white"
                >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                    Save Changes
                </button>
            </div>

            {/* Services by Category */}
            {categories.map(category => (
                <div key={category} className="space-y-3">
                    <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider">{category}</h3>
                    <div className="space-y-2">
                        {services.filter(s => s.category === category).map(svc => (
                            <div
                                key={svc.id}
                                className={`p-4 rounded-xl border transition-all ${svc.enabled
                                    ? 'bg-stone-900/60 border-stone-700 hover:border-stone-600'
                                    : 'bg-stone-950/40 border-stone-800/50 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon & Name */}
                                    <span className="text-2xl">{svc.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white">{svc.name}</p>
                                        <p className="text-stone-500 text-xs">{svc.description}</p>
                                    </div>

                                    {/* Fee Input */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            {svc.feeType !== 'PERCENTAGE' && (
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                                            )}
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={svc.defaultFee}
                                                onChange={(e) => updateFee(svc.id, parseFloat(e.target.value) || 0)}
                                                disabled={!svc.enabled}
                                                className={`w-24 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm text-right pr-3 ${svc.feeType !== 'PERCENTAGE' ? 'pl-7' : 'pl-3'} disabled:opacity-40`}
                                            />
                                        </div>
                                        <span className="text-xs text-stone-500 w-12">{feeLabel(svc.feeType)}</span>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex gap-1.5">
                                        {svc.taxable && (
                                            <span className="px-2 py-0.5 text-[10px] bg-blue-500/10 text-blue-400 rounded font-medium">TAX</span>
                                        )}
                                        {svc.maxAmount && (
                                            <span className="px-2 py-0.5 text-[10px] bg-stone-800 text-stone-400 rounded font-medium">Max ${svc.maxAmount}</span>
                                        )}
                                    </div>

                                    {/* Toggle */}
                                    <button
                                        onClick={() => toggleService(svc.id)}
                                        className="p-1"
                                    >
                                        {svc.enabled ? (
                                            <ToggleRight className="h-7 w-7 text-emerald-400" />
                                        ) : (
                                            <ToggleLeft className="h-7 w-7 text-stone-600" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <span className="text-white flex items-center gap-2">
                        {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : null}
                        {toast.message}
                    </span>
                </div>
            )}
        </div>
    )
}
