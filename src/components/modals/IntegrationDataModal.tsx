'use client'

import { useState, useEffect } from 'react'
import { X, Globe, Facebook, Download, Loader2, Check, Copy } from 'lucide-react'

interface IntegrationDataModalProps {
    clientId: string
    clientName: string
    onClose: () => void
    onSave: () => void
}

interface IntegrationState {
    googleBooking: boolean
    facebookBooking: boolean
    canExportData: boolean
    canExportReports: boolean
}

export default function IntegrationDataModal({
    clientId,
    clientName,
    onClose,
    onSave
}: IntegrationDataModalProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [integrations, setIntegrations] = useState<IntegrationState>({
        googleBooking: false,
        facebookBooking: false,
        canExportData: false,
        canExportReports: false
    })
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        fetchIntegrations()
    }, [clientId])

    async function fetchIntegrations() {
        try {
            // Fetch integrations
            const intRes = await fetch(`/api/admin/franchisors/${clientId}/integrations`)
            if (intRes.ok) {
                const data = await intRes.json()
                setIntegrations(prev => ({
                    ...prev,
                    googleBooking: data.integrations?.googleBooking || false,
                    facebookBooking: data.integrations?.facebookBooking || false
                }))
            }

            // Fetch config for export permissions
            const configRes = await fetch(`/api/admin/franchisors/${clientId}/config`)
            if (configRes.ok) {
                const data = await configRes.json()
                setIntegrations(prev => ({
                    ...prev,
                    canExportData: data.config?.canExportData || false,
                    canExportReports: data.config?.canExportReports || false
                }))
            }
        } catch (error) {
            console.error('Error fetching integrations:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleToggle(key: keyof IntegrationState) {
        const newValue = !integrations[key]
        setIntegrations(prev => ({ ...prev, [key]: newValue }))

        setSaving(true)
        try {
            if (key === 'googleBooking' || key === 'facebookBooking') {
                await fetch(`/api/admin/franchisors/${clientId}/integrations`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [key]: newValue })
                })
            } else {
                await fetch(`/api/admin/franchisors/${clientId}/config`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ [key]: newValue })
                })
            }
        } catch (error) {
            console.error('Error updating:', error)
            // Revert on error
            setIntegrations(prev => ({ ...prev, [key]: !newValue }))
        } finally {
            setSaving(false)
        }
    }

    async function copyWebhookUrl(type: 'google' | 'facebook') {
        const url = `${window.location.origin}/api/integrations/${type}-booking`
        await navigator.clipboard.writeText(url)
        setCopied(type)
        setTimeout(() => setCopied(null), 2000)
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-stone-900 rounded-2xl p-8">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-stone-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Integrations & Data</h2>
                        <p className="text-sm text-stone-400">{clientName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-stone-400 hover:text-white p-2 rounded-lg hover:bg-stone-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Booking Integrations */}
                    <div>
                        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">
                            Booking Integrations
                        </h3>

                        {/* Google Booking */}
                        <div className={`p-4 rounded-xl border mb-3 ${integrations.googleBooking ? 'bg-blue-500/10 border-blue-500/50' : 'bg-stone-800 border-stone-700'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe className={`w-5 h-5 ${integrations.googleBooking ? 'text-blue-400' : 'text-stone-500'}`} />
                                    <div>
                                        <p className="font-medium text-white">Reserve with Google</p>
                                        <p className="text-xs text-stone-400">Accept bookings from Google Search/Maps</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('googleBooking')}
                                    disabled={saving}
                                    className={`w-12 h-6 rounded-full transition-colors ${integrations.googleBooking ? 'bg-blue-500' : 'bg-stone-600'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${integrations.googleBooking ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            {integrations.googleBooking && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-xs text-stone-400 mb-2">Webhook URL:</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/google-booking`}
                                            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-xs text-stone-300 font-mono"
                                        />
                                        <button
                                            onClick={() => copyWebhookUrl('google')}
                                            className="px-3 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                                        >
                                            {copied === 'google' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-stone-300" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Facebook Booking */}
                        <div className={`p-4 rounded-xl border ${integrations.facebookBooking ? 'bg-blue-500/10 border-blue-500/50' : 'bg-stone-800 border-stone-700'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Facebook className={`w-5 h-5 ${integrations.facebookBooking ? 'text-blue-400' : 'text-stone-500'}`} />
                                    <div>
                                        <p className="font-medium text-white">Facebook Booking</p>
                                        <p className="text-xs text-stone-400">Accept bookings from Facebook page</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('facebookBooking')}
                                    disabled={saving}
                                    className={`w-12 h-6 rounded-full transition-colors ${integrations.facebookBooking ? 'bg-blue-500' : 'bg-stone-600'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${integrations.facebookBooking ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                            {integrations.facebookBooking && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-xs text-stone-400 mb-2">Webhook URL:</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/integrations/facebook-booking`}
                                            className="flex-1 px-3 py-2 bg-stone-800 border border-stone-600 rounded-lg text-xs text-stone-300 font-mono"
                                        />
                                        <button
                                            onClick={() => copyWebhookUrl('facebook')}
                                            className="px-3 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg"
                                        >
                                            {copied === 'facebook' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-stone-300" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Data Export Permissions */}
                    <div>
                        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">
                            Data Export Permissions
                        </h3>

                        {/* Export Data */}
                        <div className={`p-4 rounded-xl border mb-3 ${integrations.canExportData ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-stone-800 border-stone-700'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Download className={`w-5 h-5 ${integrations.canExportData ? 'text-emerald-400' : 'text-stone-500'}`} />
                                    <div>
                                        <p className="font-medium text-white">Export Customer Data</p>
                                        <p className="text-xs text-stone-400">Allow exporting customer & transaction data</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('canExportData')}
                                    disabled={saving}
                                    className={`w-12 h-6 rounded-full transition-colors ${integrations.canExportData ? 'bg-emerald-500' : 'bg-stone-600'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${integrations.canExportData ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Export Reports */}
                        <div className={`p-4 rounded-xl border ${integrations.canExportReports ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-stone-800 border-stone-700'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Download className={`w-5 h-5 ${integrations.canExportReports ? 'text-emerald-400' : 'text-stone-500'}`} />
                                    <div>
                                        <p className="font-medium text-white">Export Reports</p>
                                        <p className="text-xs text-stone-400">Allow exporting reports to CSV/PDF</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle('canExportReports')}
                                    disabled={saving}
                                    className={`w-12 h-6 rounded-full transition-colors ${integrations.canExportReports ? 'bg-emerald-500' : 'bg-stone-600'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${integrations.canExportReports ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-stone-700 bg-stone-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-stone-300 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
