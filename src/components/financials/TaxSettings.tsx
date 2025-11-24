'use client'

import { useState, useEffect } from 'react'
import { Save, MapPin, Calculator, AlertCircle } from 'lucide-react'

export default function TaxSettings() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        taxRate: 0,
        zipCode: '',
        isTaxAutomated: false
    })
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/franchise/location/settings')
            if (res.ok) {
                const data = await res.json()
                setSettings({
                    taxRate: Number(data.taxRate) || 0,
                    zipCode: data.zipCode || '',
                    isTaxAutomated: data.isTaxAutomated || false
                })
            }
        } catch (error) {
            console.error('Error fetching settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            const res = await fetch('/api/franchise/location/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                setMessage({ type: 'success', text: 'Tax settings updated successfully' })
            } else {
                setMessage({ type: 'error', text: 'Failed to update settings' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' })
        } finally {
            setSaving(false)
        }
    }

    const handleAutoDetect = () => {
        // Mock auto-detect based on zip code
        if (!settings.zipCode) {
            setMessage({ type: 'error', text: 'Please enter a Zip Code first' })
            return
        }

        // In a real app, call an external API here
        // For demo, we'll simulate a lookup
        const mockRate = 0.0825 // 8.25%
        setSettings(prev => ({ ...prev, taxRate: mockRate, isTaxAutomated: true }))
        setMessage({ type: 'success', text: `Found tax rate for ${settings.zipCode}: 8.25%` })
    }

    if (loading) return <div>Loading settings...</div>

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-50 rounded-xl">
                    <Calculator className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Tax Configuration</h2>
                    <p className="text-sm text-gray-500">Manage sales tax rates for your location</p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    <AlertCircle className="h-5 w-5" />
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={settings.zipCode}
                                onChange={e => setSettings({ ...settings, zipCode: e.target.value })}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="12345"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sales Tax Rate</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                            <input
                                type="number"
                                step="0.0001"
                                min="0"
                                max="1"
                                value={settings.taxRate}
                                onChange={e => setSettings({ ...settings, taxRate: parseFloat(e.target.value), isTaxAutomated: false })}
                                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.08"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Example: 0.0825 for 8.25%</p>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={handleAutoDetect}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                        <Calculator className="h-4 w-4" />
                        Auto-detect from Zip
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    )
}
